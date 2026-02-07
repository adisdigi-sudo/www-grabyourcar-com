import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

interface ImageResult {
  url: string;
  source: string;
}

// Build search URLs for CardekHo and CarWale
function buildSearchUrls(brand: string, model: string): Array<{name: string; url: string; patterns: string[]; referer: string}> {
  // Normalize for URL construction
  const brandSlug = brand.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('maruti suzuki', 'maruti')
    .replace('mercedes-benz', 'mercedes-benz')
    .replace('force motors', 'force')
    .replace('land rover', 'land-rover')
    .replace('rolls royce', 'rolls-royce');
  
  // Clean model name - remove brand prefix if present
  let modelClean = model.toLowerCase()
    .replace(brand.toLowerCase(), '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Handle edge cases
  if (!modelClean || modelClean.length < 2) {
    modelClean = model.toLowerCase().replace(/\s+/g, '-');
  }

  return [
    {
      name: 'cardekho',
      url: `https://www.cardekho.com/${brandSlug}/${modelClean}/images`,
      patterns: ['imgd.aeplcdn.com', 'stimg.cardekho.com', 'cdnimg.cardekho.com', 'img.gaadicdn.com'],
      referer: 'https://www.cardekho.com/'
    },
    {
      name: 'cardekho-alt',
      url: `https://www.cardekho.com/${brandSlug}-${modelClean}/images`,
      patterns: ['imgd.aeplcdn.com', 'stimg.cardekho.com', 'cdnimg.cardekho.com', 'img.gaadicdn.com'],
      referer: 'https://www.cardekho.com/'
    },
    {
      name: 'carwale',
      url: `https://www.carwale.com/${brandSlug}-cars/${modelClean}/images`,
      patterns: ['imgd.carwale.com', 'imgd1.carwale.com', 'media.carwale.com', 'img.gaadicdn.com'],
      referer: 'https://www.carwale.com/'
    },
    {
      name: 'carwale-alt',
      url: `https://www.carwale.com/${brandSlug}-${modelClean}/images`,
      patterns: ['imgd.carwale.com', 'imgd1.carwale.com', 'media.carwale.com', 'img.gaadicdn.com'],
      referer: 'https://www.carwale.com/'
    },
    {
      name: 'zigwheels',
      url: `https://www.zigwheels.com/${brandSlug}-cars/${modelClean}/images`,
      patterns: ['imgd.zigwheels.com', 'zigcdn.in', 'gaadicdn.com'],
      referer: 'https://www.zigwheels.com/'
    }
  ];
}

// Extract high-quality image URLs from HTML content
function extractImagesFromHtml(html: string, patterns: string[]): string[] {
  const images: string[] = [];
  
  // Match image URLs from various attributes
  const imgRegex = /(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi;
  const bgRegex = /background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
  const jsonImgRegex = /"(?:image|url|src|original|large|medium)":\s*"([^"]+)"/gi;
  
  let match;
  
  // Extract from img tags
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (isValidCarImage(url, patterns)) {
      images.push(upgradeToHighRes(normalizeImageUrl(url)));
    }
  }
  
  // Extract from background URLs
  while ((match = bgRegex.exec(html)) !== null) {
    const url = match[1];
    if (isValidCarImage(url, patterns)) {
      images.push(upgradeToHighRes(normalizeImageUrl(url)));
    }
  }
  
  // Extract from JSON data
  while ((match = jsonImgRegex.exec(html)) !== null) {
    const url = match[1];
    if (isValidCarImage(url, patterns)) {
      images.push(upgradeToHighRes(normalizeImageUrl(url)));
    }
  }
  
  // Deduplicate and filter
  const uniqueImages = [...new Set(images)];
  return uniqueImages.filter(url => {
    // Ensure it's a high-res image
    return !url.includes('thumb') && 
           !url.includes('_s.') && 
           !url.includes('_m.') &&
           !url.includes('/50x') &&
           !url.includes('/100x') &&
           !url.includes('/150x') &&
           !url.includes('/200x') &&
           !url.includes('logo') &&
           !url.includes('icon') &&
           !url.includes('badge');
  });
}

// Validate if URL is a real car image from trusted sources
function isValidCarImage(url: string, patterns: string[]): boolean {
  if (!url) return false;
  
  // Must be an image
  if (!url.match(/\.(jpg|jpeg|png|webp)(\?|$|#)/i)) return false;
  
  // Must match at least one trusted pattern
  return patterns.some(p => url.includes(p));
}

// Normalize URL (fix protocol, clean up)
function normalizeImageUrl(url: string): string {
  let normalized = url.trim();
  
  // Add protocol if missing
  if (normalized.startsWith('//')) {
    normalized = 'https:' + normalized;
  }
  
  // Replace HTTP with HTTPS
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }
  
  return normalized;
}

// Upgrade CardekHo/CarWale images to highest resolution
function upgradeToHighRes(url: string): string {
  let upgraded = url;
  
  // CardekHo: Replace size in path (630x420 -> 930x620 or larger)
  upgraded = upgraded.replace(/\/\d+x\d+\//g, '/930x620/');
  
  // CarWale: Replace size parameters
  upgraded = upgraded.replace(/w=\d+/g, 'w=1200');
  upgraded = upgraded.replace(/h=\d+/g, 'h=900');
  
  // Remove quality degradation params
  upgraded = upgraded.replace(/q=\d+/g, 'q=90');
  
  return upgraded;
}

// Scrape images from multiple sources
async function scrapeCarImagesMultiSource(
  brand: string,
  model: string,
  firecrawlKey: string
): Promise<ImageResult[]> {
  const sources = buildSearchUrls(brand, model);
  const allImages: ImageResult[] = [];
  
  for (const source of sources) {
    if (allImages.length >= 10) break;
    
    try {
      console.log(`Trying ${source.name}: ${source.url}`);
      
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: source.url,
          formats: ['html', 'links'],
          onlyMainContent: false,
          waitFor: 3000,
        }),
      });

      if (!response.ok) {
        console.log(`${source.name} failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      // Method 1: Extract from HTML
      const html = data.data?.html || '';
      const htmlImages = extractImagesFromHtml(html, source.patterns);
      console.log(`${source.name} HTML: Found ${htmlImages.length} images`);
      
      for (const url of htmlImages.slice(0, 8)) {
        if (!allImages.find(i => i.url === url)) {
          allImages.push({ url, source: source.name });
        }
      }
      
      // Method 2: Extract from links array
      const links = data.data?.links || [];
      const linkImages = links.filter((link: string) => isValidCarImage(link, source.patterns));
      console.log(`${source.name} links: Found ${linkImages.length} images`);
      
      for (const url of linkImages.slice(0, 6)) {
        if (!allImages.find(i => i.url === url)) {
          allImages.push({ url: normalizeImageUrl(url), source: source.name });
        }
      }
      
      // If we got images, skip to next brand alternative sources
      if (allImages.length >= 6) {
        console.log(`Got ${allImages.length} images, moving on`);
        break;
      }
      
    } catch (e) {
      console.error(`${source.name} error:`, e);
    }
  }

  return allImages.slice(0, 10);
}

// Download image with proper headers to bypass hotlink protection
async function downloadImage(imageUrl: string, referer: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Request JPEG/WebP/PNG, NOT AVIF (Supabase doesn't support AVIF)
    'Accept': 'image/webp,image/png,image/jpeg,image/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Referer': referer,
    'Origin': new URL(referer).origin,
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
  };

  try {
    console.log(`  Downloading: ${imageUrl.substring(0, 70)}...`);
    const response = await fetch(imageUrl, { headers });
    
    if (!response.ok) {
      console.log(`  ✗ HTTP ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    // Skip AVIF - Supabase storage doesn't support it
    if (contentType.includes('avif')) {
      console.log(`  ✗ AVIF not supported, skipping`);
      return null;
    }
    
    if (!contentType.includes('image')) {
      console.log(`  ✗ Not an image: ${contentType}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Skip tiny images (likely placeholders or icons) - 5KB minimum
    if (data.length < 5000) {
      console.log(`  ✗ Too small: ${data.length} bytes`);
      return null;
    }
    
    console.log(`  ✓ Downloaded: ${Math.round(data.length/1024)}KB (${contentType})`);
    return { data, contentType };
  } catch (e) {
    console.error(`  ✗ Download error:`, e);
    return null;
  }
}

// Generate storage path
function getStoragePath(brand: string, model: string, index: number, ext: string): string {
  const brandSlug = brand.toLowerCase().replace(/\s+/g, '-');
  let modelSlug = model.toLowerCase()
    .replace(brand.toLowerCase(), '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  if (!modelSlug || modelSlug.length < 2) {
    modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  }
  
  return `${brandSlug}/${modelSlug}/img-${index + 1}-${Date.now()}.${ext}`;
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
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured. Please connect Firecrawl in Settings → Connectors.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { carId, limit = 10, mode = 'single' } = await req.json().catch(() => ({}));

    if (mode === 'batch') {
      // Batch mode: Process multiple cars missing images
      console.log('=== BATCH MODE: Finding cars without images ===');
      
      // Get all active cars
      const { data: allCars, error: fetchError } = await supabase
        .from('cars')
        .select('id, name, brand, slug')
        .eq('is_discontinued', false)
        .order('brand')
        .order('name');

      if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);

      // Get car IDs that have Supabase-hosted images (real scraped images)
      const { data: carsWithImages } = await supabase
        .from('car_images')
        .select('car_id')
        .ilike('url', '%supabase.co%');

      const carsWithImageIds = new Set((carsWithImages || []).map(c => c.car_id));
      
      // Filter to cars without any Supabase images
      const carsToProcess = (allCars || [])
        .filter(car => !carsWithImageIds.has(car.id))
        .slice(0, limit);

      console.log(`Found ${(allCars || []).length} total cars, ${carsWithImageIds.size} have images`);
      console.log(`Processing ${carsToProcess.length} cars for image scraping`);

      const results = {
        total: carsToProcess.length,
        processed: 0,
        imagesAdded: 0,
        failed: [] as string[],
        details: [] as Array<{car: string; images: number}>
      };

      for (const car of carsToProcess) {
        console.log(`\n=== Processing: ${car.brand} ${car.name} ===`);
        
        const scrapedImages = await scrapeCarImagesMultiSource(car.brand, car.name, firecrawlKey);
        
        if (scrapedImages.length === 0) {
          console.log('No images found from any source');
          results.failed.push(`${car.brand} ${car.name}`);
          continue;
        }

        let carImagesAdded = 0;

        for (let i = 0; i < scrapedImages.length; i++) {
          const { url: imgUrl, source } = scrapedImages[i];
          
          // Get appropriate referer based on source
          const referer = source.includes('cardekho') ? 'https://www.cardekho.com/' :
                          source.includes('carwale') ? 'https://www.carwale.com/' :
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
              is_primary: i === 0,
              sort_order: i,
            });

          if (!insertError) {
            console.log(`  ✓ Saved: ${storagePath}`);
            results.imagesAdded++;
            carImagesAdded++;
          }
        }
        
        results.processed++;
        results.details.push({ car: `${car.brand} ${car.name}`, images: carImagesAdded });
        
        // Update car sync status
        if (carImagesAdded > 0) {
          await supabase
            .from('cars')
            .update({ 
              images_synced: true, 
              images_synced_at: new Date().toISOString() 
            })
            .eq('id', car.id);
        }
        
        // Small delay between cars to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      console.log('\n=== BATCH COMPLETE ===');
      console.log(`Processed: ${results.processed}, Images: ${results.imagesAdded}, Failed: ${results.failed.length}`);

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

      console.log(`=== SINGLE MODE: ${car.brand} ${car.name} ===`);

      // First, delete any existing AI-generated images for this car
      const { data: existingImages } = await supabase
        .from('car_images')
        .select('id, url')
        .eq('car_id', carId);
      
      const fakeImages = (existingImages || []).filter(img => 
        img.url && img.url.match(/-\d{10,13}\.(webp|png|jpg)$/)
      );
      
      if (fakeImages.length > 0) {
        console.log(`Removing ${fakeImages.length} fake images first`);
        await supabase
          .from('car_images')
          .delete()
          .in('id', fakeImages.map(i => i.id));
      }

      const scrapedImages = await scrapeCarImagesMultiSource(car.brand, car.name, firecrawlKey);
      
      if (scrapedImages.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No images found from CardekHo, CarWale, or ZigWheels. The car model may not be listed yet.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const addedImages: string[] = [];

      for (let i = 0; i < scrapedImages.length; i++) {
        const { url: imgUrl, source } = scrapedImages[i];
        
        const referer = source.includes('cardekho') ? 'https://www.cardekho.com/' :
                        source.includes('carwale') ? 'https://www.carwale.com/' :
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

        if (uploadError) {
          console.log(`Upload failed: ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('car-images')
          .getPublicUrl(storagePath);

        const { error: insertError } = await supabase
          .from('car_images')
          .insert({
            car_id: car.id,
            url: urlData.publicUrl,
            alt_text: `${car.brand} ${car.name} - Image ${i + 1}`,
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
          car: `${car.brand} ${car.name}`,
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
