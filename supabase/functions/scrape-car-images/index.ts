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

// OEM website configurations - ONLY official manufacturer sources
const OEM_SOURCES: Record<string, { baseUrl: string; patterns: string[]; referer: string }> = {
  'Tata': {
    baseUrl: 'https://cars.tatamotors.com',
    patterns: ['tatamotors.com', 'tatamotorscdn.com', 'scene7.com'],
    referer: 'https://cars.tatamotors.com/'
  },
  'Mahindra': {
    baseUrl: 'https://auto.mahindra.com',
    patterns: ['mahindra.com', 'mahindracdn.com'],
    referer: 'https://auto.mahindra.com/'
  },
  'Kia': {
    baseUrl: 'https://www.kia.com/in',
    patterns: ['kia.com', 'kiacdn.com'],
    referer: 'https://www.kia.com/in/'
  },
  'Hyundai': {
    baseUrl: 'https://www.hyundai.com/in/en',
    patterns: ['hyundai.com', 'hyundaicdn.com'],
    referer: 'https://www.hyundai.com/in/en/'
  },
  'Toyota': {
    baseUrl: 'https://www.toyotabharat.com',
    patterns: ['toyotabharat.com', 'toyotacdn.com'],
    referer: 'https://www.toyotabharat.com/'
  },
  'Honda': {
    baseUrl: 'https://www.hondacarindia.com',
    patterns: ['hondacarindia.com', 'hondacdn.com'],
    referer: 'https://www.hondacarindia.com/'
  },
  'MG': {
    baseUrl: 'https://www.mgmotor.co.in',
    patterns: ['mgmotor.co.in', 'mgcdn.com'],
    referer: 'https://www.mgmotor.co.in/'
  },
  'Skoda': {
    baseUrl: 'https://www.skoda-auto.co.in',
    patterns: ['skoda-auto.co.in', 'skodacdn.com'],
    referer: 'https://www.skoda-auto.co.in/'
  },
  'Volkswagen': {
    baseUrl: 'https://www.volkswagen.co.in',
    patterns: ['volkswagen.co.in', 'vwcdn.com', 'scene7.com'],
    referer: 'https://www.volkswagen.co.in/'
  },
  'BMW': {
    baseUrl: 'https://www.bmw.in',
    patterns: ['bmw.in', 'bmwcdn.com', 'scene7.com'],
    referer: 'https://www.bmw.in/'
  },
  'Mercedes-Benz': {
    baseUrl: 'https://www.mercedes-benz.co.in',
    patterns: ['mercedes-benz.co.in', 'mercedescdn.com', 'scene7.com'],
    referer: 'https://www.mercedes-benz.co.in/'
  },
  'Audi': {
    baseUrl: 'https://www.audi.in',
    patterns: ['audi.in', 'audicdn.com', 'scene7.com'],
    referer: 'https://www.audi.in/'
  },
  'Volvo': {
    baseUrl: 'https://www.volvocars.com/en-in',
    patterns: ['volvocars.com', 'volvocdn.com'],
    referer: 'https://www.volvocars.com/en-in/'
  },
  'BYD': {
    baseUrl: 'https://www.byd.com/in',
    patterns: ['byd.com', 'bydcdn.com'],
    referer: 'https://www.byd.com/in/'
  },
  'Tesla': {
    baseUrl: 'https://www.tesla.com',
    patterns: ['tesla.com', 'teslacdn.com'],
    referer: 'https://www.tesla.com/'
  },
  'Nissan': {
    baseUrl: 'https://www.nissan.co.in',
    patterns: ['nissan.co.in', 'nissancdn.com'],
    referer: 'https://www.nissan.co.in/'
  },
  'Jeep': {
    baseUrl: 'https://www.jeep-india.com',
    patterns: ['jeep-india.com', 'jeepcdn.com'],
    referer: 'https://www.jeep-india.com/'
  },
  'Renault': {
    baseUrl: 'https://www.renault.co.in',
    patterns: ['renault.co.in', 'renaultcdn.com'],
    referer: 'https://www.renault.co.in/'
  },
};

// Build OEM-only search URL
function buildOemUrl(brand: string, model: string): { url: string; source: OEM } | null {
  const oemConfig = OEM_SOURCES[brand];
  if (!oemConfig) {
    console.log(`⚠ No OEM configuration for ${brand}`);
    return null;
  }

  const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  const url = `${oemConfig.baseUrl}/${modelSlug}`;
  
  return { 
    url,
    source: { name: brand, ...oemConfig }
  };
}

interface OEM {
  name: string;
  baseUrl: string;
  patterns: string[];
  referer: string;
}

// Extract high-quality image URLs from HTML content
function extractImagesFromHtml(html: string, patterns: string[]): string[] {
  const images: string[] = [];
  
  // Match image URLs from various attributes
  const imgRegex = /(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi;
  const bgRegex = /background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
  const jsonImgRegex = /"(?:image|url|src|original|large|medium|picture)":\s*"([^"]+)"/gi;
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  
  let match;
  
  // Extract from img tags
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (isValidOemImage(url, patterns)) {
      images.push(normalizeImageUrl(url));
    }
  }
  
  // Extract from srcset
  while ((match = srcsetRegex.exec(html)) !== null) {
    const urls = match[1].split(',').map(u => u.trim().split(' ')[0]);
    for (const url of urls) {
      if (isValidOemImage(url, patterns)) {
        images.push(normalizeImageUrl(url));
      }
    }
  }
  
  // Extract from background URLs
  while ((match = bgRegex.exec(html)) !== null) {
    const url = match[1];
    if (isValidOemImage(url, patterns)) {
      images.push(normalizeImageUrl(url));
    }
  }
  
  // Extract from JSON data
  while ((match = jsonImgRegex.exec(html)) !== null) {
    const url = match[1];
    if (isValidOemImage(url, patterns)) {
      images.push(normalizeImageUrl(url));
    }
  }
  
  // Deduplicate and filter
  const uniqueImages = [...new Set(images)];
  return uniqueImages.filter(url => {
    // Ensure it's a car image, not thumbnail/icon
    return !url.includes('thumb') && 
           !url.includes('_s.') && 
           !url.includes('_m.') &&
           !url.includes('/50x') &&
           !url.includes('/100x') &&
           !url.includes('/150x') &&
           !url.includes('/200x') &&
           !url.includes('logo') &&
           !url.includes('icon') &&
           !url.includes('badge') &&
           !url.includes('social');
  });
}

// Validate if URL is from official OEM source
function isValidOemImage(url: string, patterns: string[]): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Must be an image
  if (!url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$|#)/i)) return false;
  
  // Must match at least one OEM domain pattern
  return patterns.some(p => url.toLowerCase().includes(p.toLowerCase()));
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

// Scrape images from OEM website only
async function scrapeOemImages(
  brand: string,
  model: string,
  firecrawlKey: string
): Promise<ImageResult[]> {
  const oemUrl = buildOemUrl(brand, model);
  if (!oemUrl) {
    console.log(`⚠ OEM source not available for ${brand}`);
    return [];
  }

  const allImages: ImageResult[] = [];
  
  try {
    console.log(`🔍 Scraping OEM: ${brand} from ${oemUrl.url}`);
    
    const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: oemUrl.url,
        formats: ['html', 'links'],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.log(`⚠ OEM scrape failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Extract from HTML
    const html = data.data?.html || '';
    const htmlImages = extractImagesFromHtml(html, oemUrl.source.patterns);
    console.log(`✓ Found ${htmlImages.length} images from HTML`);
    
    for (const url of htmlImages.slice(0, 10)) {
      if (!allImages.find(i => i.url === url)) {
        allImages.push({ url, source: brand });
      }
    }
    
    // Extract from links array
    const links = data.data?.links || [];
    const linkImages = links.filter((link: string) => isValidOemImage(link, oemUrl.source.patterns));
    console.log(`✓ Found ${linkImages.length} images from links`);
    
    for (const url of linkImages.slice(0, 5)) {
      if (!allImages.find(i => i.url === url)) {
        allImages.push({ url: normalizeImageUrl(url), source: brand });
      }
    }
    
  } catch (e) {
    console.error(`✗ OEM scrape error for ${brand}:`, e);
  }

  return allImages.slice(0, 10);
}

// Download image with proper headers
async function downloadImage(imageUrl: string, referer: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/png,image/jpeg,image/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': referer,
    'Origin': new URL(referer).origin,
  };

  try {
    console.log(`  ⬇️ Downloading: ${imageUrl.substring(0, 70)}...`);
    const response = await fetch(imageUrl, { headers });
    
    if (!response.ok) {
      console.log(`  ✗ HTTP ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('avif') || contentType.includes('heic')) {
      console.log(`  ✗ Unsupported format: ${contentType}`);
      return null;
    }
    
    if (!contentType.includes('image')) {
      console.log(`  ✗ Not an image: ${contentType}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Skip tiny images (likely placeholders)
    if (data.length < 5000) {
      console.log(`  ✗ Too small: ${data.length} bytes`);
      return null;
    }
    
    console.log(`  ✓ Downloaded: ${Math.round(data.length/1024)}KB`);
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
        
        const scrapedImages = await scrapeOemImages(car.brand, car.name, firecrawlKey);
        
        if (scrapedImages.length === 0) {
          console.log('❌ No images found from official OEM website');
          results.failed.push(`${car.brand} ${car.name}`);
          continue;
        }

        let carImagesAdded = 0;

        for (let i = 0; i < scrapedImages.length; i++) {
          const { url: imgUrl, source } = scrapedImages[i];
          
          // Use OEM referer from config
          const oemConfig = OEM_SOURCES[source];
          const referer = oemConfig?.referer || 'https://example.com/';
          
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

       const scrapedImages = await scrapeOemImages(car.brand, car.name, firecrawlKey);
      
      if (scrapedImages.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No images found from official manufacturer (OEM) website. Please ensure the model is listed on the manufacturer\'s official site.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const addedImages: string[] = [];

      for (let i = 0; i < scrapedImages.length; i++) {
        const { url: imgUrl, source } = scrapedImages[i];
        
        // Use OEM referer from config
        const oemConfig = OEM_SOURCES[source];
        const referer = oemConfig?.referer || 'https://example.com/';
        
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
