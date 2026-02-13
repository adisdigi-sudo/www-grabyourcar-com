import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// OEM domain configuration for scraping gallery images
const OEM_GALLERY_URLS: Record<string, (model: string) => string> = {
  'maruti suzuki': (m) => `https://www.marutisuzuki.com/${m}/gallery`,
  'hyundai': (m) => `https://www.hyundai.com/in/en/find-a-car/${m}/gallery`,
  'tata': (m) => `https://cars.tatamotors.com/${m}/gallery`,
  'mahindra': (m) => `https://www.mahindra.com/${m}/gallery`,
  'honda': (m) => `https://www.hondacarindia.com/${m}/gallery`,
  'toyota': (m) => `https://www.toyotabharat.com/${m}/gallery`,
  'kia': (m) => `https://www.kia.com/in/${m}/gallery`,
  'mg': (m) => `https://www.mgmotor.co.in/${m}/gallery`,
  'skoda': (m) => `https://www.skoda-auto.co.in/${m}/gallery`,
  'volkswagen': (m) => `https://www.volkswagen.co.in/${m}/gallery`,
};

// Scrape car images from official OEM website
async function scrapeOemGalleryImages(
  brand: string,
  model: string,
  firecrawlKey: string
): Promise<string[]> {
  const brandKey = brand.toLowerCase();
  const modelSlug = model.toLowerCase().replace(/\s+/g, '-').replace(brand.toLowerCase(), '').replace(/^-+|-+$/g, '');
  
  const urlGenerator = OEM_GALLERY_URLS[brandKey] || OEM_GALLERY_URLS[brand.toLowerCase().split(' ')[0]];
  const url = urlGenerator ? urlGenerator(modelSlug) : `https://www.${brand.toLowerCase().replace(/\s+/g, '')}.com/${modelSlug}/gallery`;
  
  console.log(`Scraping OEM gallery: ${url}`);
  
  try {
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['links', 'html'], onlyMainContent: false, waitFor: 2000 }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const links = data.data?.links || [];
    const html = data.data?.html || '';
    
    const imageUrls: string[] = [];
    
    // Extract image URLs from links
    for (const link of links) {
      if (typeof link === 'string' && link.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
        // Exclude third-party aggregator CDNs
        const blocked = ['aeplcdn', 'zigcdn', 'stimg.', 'imgcdn.', 'gaadiwaadi'];
        if (!blocked.some(b => link.includes(b))) {
          if (link.includes('200x') || link.includes('100x') || link.includes('thumb')) continue;
          imageUrls.push(link);
        }
      }
    }

    // Also extract from HTML
    const imgPattern = /(https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>]*)?)/gi;
    const htmlMatches = html.match(imgPattern) || [];
    for (const imgUrl of htmlMatches) {
      const blocked = ['aeplcdn', 'zigcdn', 'stimg.', 'imgcdn.', 'gaadiwaadi'];
      if (!blocked.some(b => imgUrl.includes(b))) {
        if (!imgUrl.includes('200x') && !imgUrl.includes('100x') && !imgUrl.includes('thumb')) {
          if (!imageUrls.includes(imgUrl)) imageUrls.push(imgUrl);
        }
      }
    }

    console.log(`Found ${imageUrls.length} OEM images`);
    return imageUrls.slice(0, 10);
  } catch (e) {
    console.error('OEM gallery scrape error:', e);
    return [];
  }
}

// Download image with OEM-appropriate headers
async function downloadImageDirect(imageUrl: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  if (imageUrl.includes('supabase.co')) return null;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
      }
    });
    
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image') || contentType.includes('avif')) return null;
    
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    if (data.length < 5000) return null;
    
    return { data, contentType };
  } catch {
    return null;
  }
}

function getStoragePath(carBrand: string, carName: string, suffix: string): string {
  const brandSlug = carBrand.toLowerCase().replace(/\s+/g, '-');
  const modelSlug = carName.toLowerCase().replace(brandSlug, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
  return `${brandSlug}/${modelSlug || 'unknown'}/${suffix}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { limit = 20, mode = 'gallery' } = await req.json().catch(() => ({}));

    console.log(`Image migration - limit: ${limit}, mode: ${mode}`);

    if (mode === 'gallery') {
      const { data: carsNeedingImages, error: fetchError } = await supabase
        .from('cars')
        .select('id, name, brand, slug, car_images(id)')
        .eq('is_discontinued', false)
        .limit(limit);

      if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);

      const carsToProcess = carsNeedingImages?.filter(car => !car.car_images || car.car_images.length < 3) || [];
      console.log(`Processing ${carsToProcess.length} cars for OEM gallery images`);

      const results = { total: carsToProcess.length, processed: 0, imagesAdded: 0, failed: 0 };

      for (const car of carsToProcess.slice(0, 10)) {
        console.log(`\nProcessing: ${car.brand} ${car.name}`);
        if (!firecrawlKey) { results.failed++; continue; }

        const imageUrls = await scrapeOemGalleryImages(car.brand, car.name, firecrawlKey);
        
        for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
          const downloaded = await downloadImageDirect(imageUrls[i]);
          if (!downloaded) continue;

          const ext = downloaded.contentType.includes('png') ? 'png' : downloaded.contentType.includes('webp') ? 'webp' : 'jpg';
          const storagePath = getStoragePath(car.brand, car.name, `gallery-${i + 1}-${Date.now()}.${ext}`);

          const { error: uploadError } = await supabase.storage.from('car-images').upload(storagePath, downloaded.data, { contentType: downloaded.contentType, upsert: true });
          if (uploadError) continue;

          const { data: urlData } = supabase.storage.from('car-images').getPublicUrl(storagePath);
          const { error: insertError } = await supabase.from('car_images').insert({
            car_id: car.id, url: urlData.publicUrl,
            alt_text: `${car.brand} ${car.name} - Image ${i + 1}`,
            is_primary: i === 0 && (!car.car_images || car.car_images.length === 0),
            sort_order: i,
          });

          if (!insertError) { console.log(`  ✓ Added: ${storagePath}`); results.imagesAdded++; }
        }
        results.processed++;
      }

      return new Response(JSON.stringify({ success: true, mode: 'gallery', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else {
      // Mode 2: Replace external URLs with internal Supabase URLs
      const { data: externalImages, error: fetchError } = await supabase
        .from('car_images')
        .select('id, url, car_id, is_primary, cars!inner(name, brand)')
        .not('url', 'ilike', '%supabase.co%')
        .limit(limit);

      if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
      if (!externalImages?.length) {
        return new Response(JSON.stringify({ success: true, message: 'No external images to migrate', migrated: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.log(`Found ${externalImages.length} external images to migrate`);
      const results = { total: externalImages.length, migrated: 0, failed: 0 };

      for (const img of externalImages) {
        const car = img.cars as { name: string; brand: string };
        const downloaded = await downloadImageDirect(img.url);
        if (!downloaded) { results.failed++; continue; }

        const ext = downloaded.contentType.includes('png') ? 'png' : downloaded.contentType.includes('webp') ? 'webp' : 'jpg';
        const storagePath = getStoragePath(car.brand, car.name, `migrated-${Date.now()}.${ext}`);

        const { error: uploadError } = await supabase.storage.from('car-images').upload(storagePath, downloaded.data, { contentType: downloaded.contentType, upsert: true });
        if (uploadError) { results.failed++; continue; }

        const { data: urlData } = supabase.storage.from('car-images').getPublicUrl(storagePath);
        const { error: updateError } = await supabase.from('car_images').update({ url: urlData.publicUrl }).eq('id', img.id);
        if (!updateError) { results.migrated++; } else { results.failed++; }
      }

      return new Response(JSON.stringify({ success: true, mode: 'replace', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
