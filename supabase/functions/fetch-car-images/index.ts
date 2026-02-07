import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

interface FetchImageRequest {
  carId?: string;
  carSlug?: string;
  colorId?: string;
  brand?: string;
  model?: string;
  batchMode?: boolean;
  limit?: number;
  syncPrimaryImages?: boolean;
  async?: boolean;
}

interface ImageSearchResult {
  url: string;
  source: string;
}

// Scrape car images using Firecrawl ONLY - real images from automotive portals
async function scrapeCarImagesFirecrawl(
  brand: string,
  model: string,
  colorName?: string
): Promise<ImageSearchResult[]> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) {
    console.log('Firecrawl API key not configured');
    return [];
  }

  // Clean brand and model for URL generation
  const brandSlug = brand.toLowerCase()
    .replace(/\s+/g, '-')
    .replace('maruti suzuki', 'maruti')
    .replace('mercedes-benz', 'mercedes');
  
  const modelSlug = model.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(brand.toLowerCase(), '')
    .replace('--', '-')
    .replace(/^-|-$/g, '')
    .trim();
  
  // Build search URLs for Indian car websites with correct URL formats
  const searchUrls = [
    `https://www.cardekho.com/${brandSlug}/${modelSlug}/images`,
    `https://www.cardekho.com/${brandSlug}/${modelSlug}-images`,
    `https://www.carwale.com/${brandSlug}-cars/${modelSlug}/images`,
    `https://www.zigwheels.com/${brandSlug}-cars/${modelSlug}/pictures`,
  ];

  const allImages: ImageSearchResult[] = [];

  for (const url of searchUrls) {
    if (allImages.length >= 8) break;
    
    try {
      console.log(`Firecrawl scraping: ${url}`);
      
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['links', 'html'],
          onlyMainContent: false,
          waitFor: 3000,
        }),
      });

      if (!response.ok) {
        console.log(`Firecrawl failed for ${url}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const links = data.data?.links || data.links || [];
      const html = data.data?.html || data.html || '';

      // Extract image URLs from links - look for car gallery image patterns
      for (const link of links) {
        if (typeof link === 'string') {
          // Check for direct image URLs
          if (link.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
            if (link.includes('aeplcdn') || link.includes('zigcdn') || link.includes('carwale') || link.includes('cardekho') || link.includes('imgcdn')) {
              // Skip thumbnails and small images
              if (link.includes('200x') || link.includes('100x') || link.includes('thumb') || link.includes('50x') || link.includes('80x')) continue;
              allImages.push({ url: link, source: 'firecrawl-link' });
            }
          }
        }
      }

      // Extract from HTML using multiple patterns for CDN images
      const cdnPatterns = [
        /(https?:\/\/imgd\.aeplcdn\.com\/[^\s"'<>]+\.(jpg|jpeg|png|webp))/gi,
        /(https?:\/\/media\.zigcdn\.com\/[^\s"'<>]+\.(jpg|jpeg|png|webp))/gi,
        /(https?:\/\/stimg\.cardekho\.com\/[^\s"'<>]+\.(jpg|jpeg|png|webp))/gi,
        /(https?:\/\/imgcdn\.carwale\.com\/[^\s"'<>]+\.(jpg|jpeg|png|webp))/gi,
        /(https?:\/\/cdni\.autocarindia\.com\/[^\s"'<>]+\.(jpg|jpeg|png|webp))/gi,
      ];
      
      for (const pattern of cdnPatterns) {
        const htmlMatches = html.match(pattern) || [];
        for (const imgUrl of htmlMatches) {
          const cleanUrl = imgUrl.replace(/["\s]/g, '').replace(/\\u002F/g, '/');
          // Skip small thumbnails
          if (cleanUrl.includes('200x') || cleanUrl.includes('100x') || cleanUrl.includes('thumb') || cleanUrl.includes('50x') || cleanUrl.includes('80x')) continue;
          if (!allImages.some(img => img.url === cleanUrl)) {
            allImages.push({ url: cleanUrl, source: 'firecrawl-html' });
          }
        }
      }

      console.log(`Found ${allImages.length} images from ${url}`);
      
    } catch (error) {
      console.error(`Firecrawl error for ${url}:`, error);
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1500));
  }

  // Prioritize high-resolution images
  const prioritized = allImages.sort((a, b) => {
    // Prefer larger image dimensions in URL
    const getScore = (url: string) => {
      if (url.includes('1920') || url.includes('1600')) return 5;
      if (url.includes('1280') || url.includes('1200')) return 4;
      if (url.includes('900') || url.includes('800')) return 3;
      if (url.includes('664') || url.includes('600')) return 2;
      if (url.includes('400') || url.includes('500')) return 1;
      return 0;
    };
    return getScore(b.url) - getScore(a.url);
  });

  // Dedupe
  const seen = new Set<string>();
  const deduped = prioritized.filter(img => {
    // Normalize URL for deduplication
    const normalized = img.url.split('?')[0];
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  console.log(`Firecrawl found ${deduped.length} unique real images for ${brand} ${model}`);
  return deduped.slice(0, 10);
}

// Download and upload image to Supabase storage
async function downloadAndUploadImage(
  imageUrl: string,
  storagePath: string,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    // Skip unreliable domains and unsupported formats
    if (imageUrl.includes('imgk.timesauto.com') || imageUrl.includes('gaadiwaadi.com')) {
      return null;
    }

    // Skip AVIF URLs
    if (imageUrl.includes('.avif')) {
      console.log('Skipping AVIF (unsupported format)');
      return null;
    }

    console.log(`Downloading: ${imageUrl.substring(0, 80)}...`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/jpeg,image/png,image/webp,image/*;q=0.8',
        'Referer': 'https://www.cardekho.com/',
      }
    });

    if (!response.ok) {
      console.log(`HTTP ${response.status} for ${imageUrl}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Skip AVIF as Supabase storage doesn't support it well
    if (contentType.includes('avif')) {
      console.log('Skipping AVIF content-type');
      return null;
    }
    
    if (!contentType.includes('image')) {
      console.log('Not an image:', contentType);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    // Skip very small images (likely placeholders)
    if (uint8.length < 10000) {
      console.log('Image too small:', uint8.length, 'bytes');
      return null;
    }

    let ext = 'jpg';
    let uploadContentType = 'image/jpeg';
    if (contentType.includes('png')) {
      ext = 'png';
      uploadContentType = 'image/png';
    } else if (contentType.includes('webp')) {
      ext = 'webp';
      uploadContentType = 'image/webp';
    }

    const finalPath = `${storagePath}.${ext}`;

    const { error } = await supabase.storage
      .from('car-images')
      .upload(finalPath, uint8, { contentType: uploadContentType, upsert: true });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('car-images')
      .getPublicUrl(finalPath);

    console.log('✓ Real image uploaded successfully');
    return urlData.publicUrl;
  } catch (error) {
    console.log('Download error:', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

// Process single color - uses Firecrawl ONLY (100% real images)
async function processCarColor(
  supabase: ReturnType<typeof createClient>,
  carId: string,
  colorId: string,
  brand: string,
  model: string,
  colorName: string
): Promise<{ success: boolean; imageUrl?: string; source?: string; error?: string }> {
  try {
    console.log(`\n>>> Processing: ${brand} ${model} - ${colorName}`);

    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'processing' })
      .eq('id', colorId);

    // Use Firecrawl ONLY to scrape real images
    let images = await scrapeCarImagesFirecrawl(brand, model, colorName);

    // If no color-specific results, try without color filter
    if (images.length === 0) {
      console.log('Retrying Firecrawl without color filter...');
      images = await scrapeCarImagesFirecrawl(brand, model);
    }

    // Try each real image URL until one works
    for (const image of images) {
      const path = `${brand.toLowerCase().replace(/\s+/g, '-')}/${model.toLowerCase().replace(/\s+/g, '-')}/${colorName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      const uploadedUrl = await downloadAndUploadImage(image.url, path, supabase);

      if (uploadedUrl) {
        await supabase
          .from('car_colors')
          .update({
            image_url: uploadedUrl,
            image_sync_status: 'synced',
            image_synced_at: new Date().toISOString(),
            image_source: 'firecrawl_real'
          })
          .eq('id', colorId);

        await supabase.from('car_images').insert({
          car_id: carId,
          url: uploadedUrl,
          alt_text: `${brand} ${model} in ${colorName}`,
          is_primary: false,
          sort_order: 10
        });

        console.log(`✓ SUCCESS: ${brand} ${model} ${colorName} - Real image from ${image.source}`);
        return { success: true, imageUrl: uploadedUrl, source: 'firecrawl_real' };
      }
    }

    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'not_found' })
      .eq('id', colorId);

    console.log(`✗ No valid real images found for ${brand} ${model} ${colorName}`);
    return { success: false, error: 'No valid real images found from Firecrawl scraping' };
  } catch (error) {
    console.error('Processing error:', error);
    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'error' })
      .eq('id', colorId);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// Background batch processing
async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  limit: number
): Promise<void> {
  console.log(`\n=== FIRECRAWL ONLY BATCH SYNC: ${limit} images ===\n`);
  
  try {
    const { data: colors } = await supabase
      .from('car_colors')
      .select(`id, name, hex_code, car_id, cars!inner(id, name, brand)`)
      .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed,image_sync_status.eq.not_found')
      .limit(limit);

    console.log(`Processing ${colors?.length || 0} colors with Firecrawl only...\n`);

    let success = 0, fail = 0;

    for (const color of colors || []) {
      const car = color.cars as { id: string; name: string; brand: string };
      const result = await processCarColor(
        supabase, 
        color.car_id, 
        color.id, 
        car.brand, 
        car.name, 
        color.name
      );

      if (result.success) success++;
      else fail++;

      // Rate limiting for Firecrawl
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`\n=== DONE: ${success} success, ${fail} failed ===\n`);
  } catch (error) {
    console.error('Background processing error:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: FetchImageRequest = await req.json();

    // Async batch mode
    if (body.batchMode && body.async) {
      const limit = body.limit || 20;
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, limit));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Background sync started for ${limit} images (Firecrawl only - 100% real images)`, 
          async: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single car processing
    if (body.carId || body.carSlug) {
      const query = body.carId 
        ? supabase.from('cars').select('id, name, brand').eq('id', body.carId).single()
        : supabase.from('cars').select('id, name, brand').eq('slug', body.carSlug).single();
      
      const { data: car, error } = await query;
      if (error || !car) {
        return new Response(
          JSON.stringify({ success: false, error: 'Car not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: colors } = await supabase
        .from('car_colors')
        .select('id, name')
        .eq('car_id', car.id)
        .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed');

      const results = [];
      for (const color of colors || []) {
        const result = await processCarColor(supabase, car.id, color.id, car.brand, car.name, color.name);
        results.push({ colorId: color.id, colorName: color.name, ...result });
        await new Promise(r => setTimeout(r, 3000));
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync batch mode
    if (body.batchMode) {
      const limit = body.limit || 10;
      
      const { data: colors } = await supabase
        .from('car_colors')
        .select(`id, name, car_id, cars!inner(id, name, brand)`)
        .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed')
        .limit(limit);

      const results = [];
      for (const color of colors || []) {
        const car = color.cars as { id: string; name: string; brand: string };
        const result = await processCarColor(supabase, color.car_id, color.id, car.brand, car.name, color.name);
        results.push({ carId: color.car_id, colorId: color.id, colorName: color.name, ...result });
        await new Promise(r => setTimeout(r, 3000));
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Provide carId, carSlug, or batchMode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
