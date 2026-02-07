import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// Multi-source image scraping - CardekHo + CarWale + OEM
async function scrapeCarImagesMultiSource(
  brand: string,
  model: string,
  firecrawlKey: string
): Promise<{ url: string; source: string }[]> {
  // Normalize brand and model for URL construction
  const brandSlug = brand.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('maruti suzuki', 'maruti')
    .replace('mercedes-benz', 'mercedes-benz')
    .replace('force motors', 'force');
  
  // Clean model name - remove brand prefix if present
  let modelSlug = model.toLowerCase()
    .replace(brand.toLowerCase(), '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Handle edge cases
  if (!modelSlug || modelSlug.length < 2) {
    modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  }

  const sources = [
    {
      name: 'cardekho',
      url: `https://www.cardekho.com/${brandSlug}/${modelSlug}/images`,
      fallbackUrl: `https://www.cardekho.com/${brandSlug}-${modelSlug}/images`,
      imagePatterns: ['imgd.aeplcdn.com', 'stimg.cardekho.com', 'cdnimg.cardekho.com']
    },
    {
      name: 'carwale',
      url: `https://www.carwale.com/${brandSlug}-cars/${modelSlug}/images`,
      fallbackUrl: `https://www.carwale.com/${brandSlug}-${modelSlug}/images`,
      imagePatterns: ['imgd.carwale.com', 'imgd1.carwale.com', 'media.carwale.com']
    }
  ];

  const allImages: { url: string; source: string }[] = [];

  for (const source of sources) {
    const urlsToTry = [source.url, source.fallbackUrl];
    
    for (const url of urlsToTry) {
      if (allImages.length >= 8) break;
      
      try {
        console.log(`Trying ${source.name}: ${url}`);
        
        const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats: ['links'],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });

        if (!response.ok) {
          console.log(`${source.name} failed: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const links = data.data?.links || [];
        
        // Filter for high-quality image URLs
        const imageUrls = links.filter((link: string) => {
          const isImage = link.match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
          const isFromSource = source.imagePatterns.some(p => link.includes(p));
          // Exclude thumbnails and small images
          const isHighRes = !link.includes('thumb') && 
                           !link.includes('_s.') && 
                           !link.includes('_m.') &&
                           !link.includes('/50x') &&
                           !link.includes('/100x') &&
                           !link.includes('/150x');
          return isImage && isFromSource && isHighRes;
        });

        console.log(`${source.name}: Found ${imageUrls.length} images`);
        
        for (const imgUrl of imageUrls.slice(0, 6)) {
          // Avoid duplicates
          if (!allImages.find(i => i.url === imgUrl)) {
            allImages.push({ url: imgUrl, source: source.name });
          }
        }

        // If we got images from this URL, don't try fallback
        if (imageUrls.length > 0) break;
        
      } catch (e) {
        console.error(`${source.name} error:`, e);
      }
    }
    
    // If we got enough images, stop
    if (allImages.length >= 8) break;
  }

  return allImages.slice(0, 10);
}

// Download image with proper headers to bypass hotlink protection
async function downloadImage(imageUrl: string, referer: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': referer,
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
  };

  try {
    const response = await fetch(imageUrl, { headers });
    
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image')) return null;
    
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Skip tiny images (likely placeholders)
    if (data.length < 10000) return null;
    
    return { data, contentType };
  } catch (e) {
    console.error('Download error:', e);
    return null;
  }
}

// Generate storage path
function getStoragePath(brand: string, model: string, index: number, ext: string): string {
  const brandSlug = brand.toLowerCase().replace(/\s+/g, '-');
  const modelSlug = model.toLowerCase()
    .replace(brand.toLowerCase(), '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || 'model';
  
  return `${brandSlug}/${modelSlug}/scraped-${index}-${Date.now()}.${ext}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured. Please connect Firecrawl in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { carId, limit = 10, mode = 'single' } = await req.json().catch(() => ({}));

    if (mode === 'batch') {
      // Batch mode: Process multiple cars missing images
      const { data: carsWithoutImages, error: fetchError } = await supabase
        .from('cars')
        .select(`
          id,
          name,
          brand,
          slug
        `)
        .eq('is_discontinued', false)
        .limit(limit * 2);

      if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);

      // Get car IDs that have Supabase-hosted images
      const { data: carsWithImages } = await supabase
        .from('car_images')
        .select('car_id')
        .ilike('url', '%supabase.co%');

      const carsWithImageIds = new Set((carsWithImages || []).map(c => c.car_id));
      
      // Filter to cars without any Supabase images
      const carsToProcess = (carsWithoutImages || [])
        .filter(car => !carsWithImageIds.has(car.id))
        .slice(0, limit);

      console.log(`Processing ${carsToProcess.length} cars for images`);

      const results = {
        total: carsToProcess.length,
        processed: 0,
        imagesAdded: 0,
        failed: [] as string[],
      };

      for (const car of carsToProcess) {
        console.log(`\n=== Processing: ${car.brand} ${car.name} ===`);
        
        const scrapedImages = await scrapeCarImagesMultiSource(car.brand, car.name, firecrawlKey);
        
        if (scrapedImages.length === 0) {
          console.log('No images found from any source');
          results.failed.push(car.name);
          continue;
        }

        for (let i = 0; i < scrapedImages.length; i++) {
          const { url: imgUrl, source } = scrapedImages[i];
          
          const referer = source === 'cardekho' ? 'https://www.cardekho.com/' :
                          source === 'carwale' ? 'https://www.carwale.com/' :
                          'https://www.zigwheels.com/';
          
          const downloaded = await downloadImage(imgUrl, referer);
          
          if (!downloaded) {
            console.log(`  ✗ Download failed: ${imgUrl.substring(0, 50)}...`);
            continue;
          }

          const ext = downloaded.contentType.includes('png') ? 'png' : 
                      downloaded.contentType.includes('webp') ? 'webp' : 'jpg';
          
          const storagePath = getStoragePath(car.brand, car.name, i, ext);

          const { error: uploadError } = await supabase.storage
            .from('car-images')
            .upload(storagePath, downloaded.data, {
              contentType: downloaded.contentType,
              upsert: true,
            });

          if (uploadError) {
            console.log(`  ✗ Upload failed: ${uploadError.message}`);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('car-images')
            .getPublicUrl(storagePath);

          // Insert new car_image record
          const { error: insertError } = await supabase
            .from('car_images')
            .insert({
              car_id: car.id,
              url: urlData.publicUrl,
              alt_text: `${car.brand} ${car.name} - Gallery Image ${i + 1}`,
              is_primary: i === 0,
              sort_order: i,
            });

          if (!insertError) {
            console.log(`  ✓ Added: ${storagePath}`);
            results.imagesAdded++;
          }
        }
        
        results.processed++;
        
        // Small delay between cars
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update cars table to mark images as synced
      if (results.imagesAdded > 0) {
        await supabase
          .from('cars')
          .update({ 
            images_synced: true, 
            images_synced_at: new Date().toISOString() 
          })
          .in('id', carsToProcess.filter(c => !results.failed.includes(c.name)).map(c => c.id));
      }

      return new Response(
        JSON.stringify({ success: true, mode: 'batch', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Single car mode
      if (!carId) {
        return new Response(
          JSON.stringify({ success: false, error: 'carId is required for single mode' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: car, error: carError } = await supabase
        .from('cars')
        .select('id, name, brand, slug')
        .eq('id', carId)
        .single();

      if (carError || !car) {
        return new Response(
          JSON.stringify({ success: false, error: 'Car not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Processing single car: ${car.brand} ${car.name}`);

      const scrapedImages = await scrapeCarImagesMultiSource(car.brand, car.name, firecrawlKey);
      
      if (scrapedImages.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No images found from any source' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const addedImages: string[] = [];

      for (let i = 0; i < scrapedImages.length; i++) {
        const { url: imgUrl, source } = scrapedImages[i];
        
        const referer = source === 'cardekho' ? 'https://www.cardekho.com/' :
                        source === 'carwale' ? 'https://www.carwale.com/' :
                        'https://www.zigwheels.com/';
        
        const downloaded = await downloadImage(imgUrl, referer);
        
        if (!downloaded) continue;

        const ext = downloaded.contentType.includes('png') ? 'png' : 
                    downloaded.contentType.includes('webp') ? 'webp' : 'jpg';
        
        const storagePath = getStoragePath(car.brand, car.name, i, ext);

        const { error: uploadError } = await supabase.storage
          .from('car-images')
          .upload(storagePath, downloaded.data, {
            contentType: downloaded.contentType,
            upsert: true,
          });

        if (uploadError) continue;

        const { data: urlData } = supabase.storage
          .from('car-images')
          .getPublicUrl(storagePath);

        const { error: insertError } = await supabase
          .from('car_images')
          .insert({
            car_id: car.id,
            url: urlData.publicUrl,
            alt_text: `${car.brand} ${car.name} - Gallery Image ${i + 1}`,
            is_primary: i === 0,
            sort_order: i,
          });

        if (!insertError) {
          addedImages.push(urlData.publicUrl);
        }
      }

      // Mark car as synced
      if (addedImages.length > 0) {
        await supabase
          .from('cars')
          .update({ 
            images_synced: true, 
            images_synced_at: new Date().toISOString() 
          })
          .eq('id', carId);
      }

      return new Response(
        JSON.stringify({ 
          success: addedImages.length > 0, 
          mode: 'single', 
          car: car.name,
          imagesAdded: addedImages.length,
          urls: addedImages
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
