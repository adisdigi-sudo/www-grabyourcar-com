import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// Use Firecrawl to scrape car images from CardekHo
async function scrapeCarImages(
  brand: string,
  model: string,
  firecrawlKey: string
): Promise<string[]> {
  const brandSlug = brand.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('maruti suzuki', 'maruti')
    .replace('mercedes-benz', 'mercedes-benz');
  
  const modelSlug = model.toLowerCase()
    .replace(brand.toLowerCase(), '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Try CardekHo images page
  const url = `https://www.cardekho.com/${brandSlug}/${modelSlug}/images`;
  
  console.log(`Scraping: ${url}`);
  
  try {
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
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      console.log(`Firecrawl error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const links = data.data?.links || [];
    
    // Filter for image URLs
    const imageUrls = links.filter((link: string) => {
      return link.match(/\.(jpg|jpeg|png|webp)(\?|$)/i) &&
             (link.includes('imgd.aeplcdn.com') || link.includes('cdnmedia'));
    });

    console.log(`Found ${imageUrls.length} images via Firecrawl`);
    return imageUrls.slice(0, 10);
  } catch (e) {
    console.error('Firecrawl error:', e);
    return [];
  }
}

// Download image using Firecrawl's infrastructure (bypasses hotlink protection)
async function downloadImageViaFirecrawl(
  imageUrl: string,
  firecrawlKey: string
): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    // Use Firecrawl to get a screenshot of the image page
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: imageUrl,
        formats: ['screenshot'],
        waitFor: 1000,
      }),
    });

    if (!response.ok) {
      console.log(`Firecrawl screenshot error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const screenshot = data.data?.screenshot;
    
    if (!screenshot) {
      console.log('No screenshot returned');
      return null;
    }

    // Screenshot is base64 encoded
    const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    if (binaryData.length < 5000) {
      console.log('Screenshot too small');
      return null;
    }

    return { data: binaryData, contentType: 'image/png' };
  } catch (e) {
    console.error('Download via Firecrawl error:', e);
    return null;
  }
}

// Alternative: Try direct download with enhanced headers
async function downloadImageDirect(imageUrl: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  // Skip already hosted images
  if (imageUrl.includes('supabase.co')) {
    return null;
  }

  const strategies = [
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Referer': imageUrl.includes('aeplcdn') ? 'https://www.cardekho.com/' : 
                   imageUrl.includes('zigcdn') ? 'https://www.zigwheels.com/' :
                   imageUrl.includes('carwale') ? 'https://www.carwale.com/' : 'https://www.google.com/',
      }
    },
    // Try as Googlebot
    {
      headers: {
        'User-Agent': 'Googlebot-Image/1.0',
        'Accept': 'image/*',
      }
    }
  ];

  for (const strategy of strategies) {
    try {
      const response = await fetch(imageUrl, { headers: strategy.headers });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        
        if (!contentType.includes('image')) continue;
        if (contentType.includes('avif')) continue; // Skip AVIF
        
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        
        if (data.length < 5000) continue;
        
        return { data, contentType };
      }
    } catch (e) {
      // Continue to next strategy
    }
  }
  
  return null;
}

// Generate storage path from car info
function getStoragePath(carBrand: string, carName: string, suffix: string): string {
  const brandSlug = carBrand.toLowerCase().replace(/\s+/g, '-');
  const modelSlug = carName.toLowerCase()
    .replace(brandSlug, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${brandSlug}/${modelSlug || 'unknown'}/${suffix}`;
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

    const { limit = 20, useFirecrawl = true, mode = 'gallery' } = await req.json().catch(() => ({}));

    console.log(`Image migration - limit: ${limit}, mode: ${mode}, firecrawl: ${!!firecrawlKey}`);

    if (mode === 'gallery') {
      // Mode 1: Scrape new gallery images for cars missing images
      const { data: carsNeedingImages, error: fetchError } = await supabase
        .from('cars')
        .select(`
          id,
          name,
          brand,
          slug,
          car_images(id)
        `)
        .eq('is_discontinued', false)
        .limit(limit);

      if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);

      // Filter to cars with no Supabase-hosted images
      const carsToProcess = carsNeedingImages?.filter(car => {
        return !car.car_images || car.car_images.length < 3;
      }) || [];

      console.log(`Processing ${carsToProcess.length} cars for gallery images`);

      const results = {
        total: carsToProcess.length,
        processed: 0,
        imagesAdded: 0,
        failed: 0,
      };

      for (const car of carsToProcess.slice(0, 10)) {
        console.log(`\nProcessing: ${car.brand} ${car.name}`);
        
        if (!firecrawlKey) {
          console.log('No Firecrawl key');
          results.failed++;
          continue;
        }

        const imageUrls = await scrapeCarImages(car.brand, car.name, firecrawlKey);
        
        for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
          const imgUrl = imageUrls[i];
          console.log(`  Downloading: ${imgUrl.substring(0, 50)}...`);
          
          // Try direct download first, fall back to Firecrawl
          let downloaded = await downloadImageDirect(imgUrl);
          
          if (!downloaded && useFirecrawl && firecrawlKey) {
            downloaded = await downloadImageViaFirecrawl(imgUrl, firecrawlKey);
          }
          
          if (!downloaded) {
            console.log('  ✗ Download failed');
            continue;
          }

          const ext = downloaded.contentType.includes('png') ? 'png' : 
                      downloaded.contentType.includes('webp') ? 'webp' : 'jpg';
          
          const storagePath = getStoragePath(car.brand, car.name, `gallery-${i + 1}-${Date.now()}.${ext}`);

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
              alt_text: `${car.brand} ${car.name} - Image ${i + 1}`,
              is_primary: i === 0 && (!car.car_images || car.car_images.length === 0),
              sort_order: i,
            });

          if (!insertError) {
            console.log(`  ✓ Added: ${storagePath}`);
            results.imagesAdded++;
          }
        }
        
        results.processed++;
      }

      return new Response(
        JSON.stringify({ success: true, mode: 'gallery', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Mode 2: Replace external URLs with Supabase URLs
      const { data: externalImages, error: fetchError } = await supabase
        .from('car_images')
        .select(`
          id,
          url,
          car_id,
          is_primary,
          cars!inner(name, brand)
        `)
        .or('url.ilike.%aeplcdn%,url.ilike.%zigcdn%,url.ilike.%carwale%')
        .not('url', 'ilike', '%supabase.co%')
        .limit(limit);

      if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);

      if (!externalImages?.length) {
        return new Response(
          JSON.stringify({ success: true, message: 'No external images to migrate', migrated: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${externalImages.length} external images to replace`);

      const results = {
        total: externalImages.length,
        migrated: 0,
        failed: 0,
      };

      for (const img of externalImages) {
        const car = img.cars as { name: string; brand: string };
        console.log(`\n${car.brand} ${car.name}: ${img.url.substring(0, 50)}...`);

        // Try direct download
        let downloaded = await downloadImageDirect(img.url);
        
        // Fall back to Firecrawl screenshot
        if (!downloaded && firecrawlKey) {
          downloaded = await downloadImageViaFirecrawl(img.url, firecrawlKey);
        }
        
        if (!downloaded) {
          console.log('  ✗ All download methods failed');
          results.failed++;
          continue;
        }

        const ext = downloaded.contentType.includes('png') ? 'png' : 
                    downloaded.contentType.includes('webp') ? 'webp' : 'jpg';
        
        const storagePath = getStoragePath(car.brand, car.name, `migrated-${Date.now()}.${ext}`);

        const { error: uploadError } = await supabase.storage
          .from('car-images')
          .upload(storagePath, downloaded.data, {
            contentType: downloaded.contentType,
            upsert: true,
          });

        if (uploadError) {
          console.log(`  ✗ Upload failed: ${uploadError.message}`);
          results.failed++;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('car-images')
          .getPublicUrl(storagePath);

        const { error: updateError } = await supabase
          .from('car_images')
          .update({ url: urlData.publicUrl })
          .eq('id', img.id);

        if (!updateError) {
          console.log(`  ✓ Migrated`);
          results.migrated++;
        } else {
          results.failed++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, mode: 'replace', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
