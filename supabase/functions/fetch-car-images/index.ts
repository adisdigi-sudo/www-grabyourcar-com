import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
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

// Use Perplexity to find real OEM images
async function searchCarImagesPerplexity(
  brand: string,
  model: string,
  colorName: string
): Promise<ImageSearchResult[]> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY_1') || Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!PERPLEXITY_API_KEY) return [];

  const cleanBrand = brand.replace(/\s+/g, ' ').trim();
  const cleanModel = model.replace(/\s+/g, ' ').trim();
  const cleanColor = colorName.replace(/\s+/g, ' ').trim();

  const searchQuery = `Find the direct image file URL (ending in .jpg, .jpeg, .png, or .webp) for the ${cleanBrand} ${cleanModel} car in ${cleanColor} color from India.

Look on CardekHo.com or CarWale.com image galleries.
I need the CDN image URL from imgd.aeplcdn.com or media.zigcdn.com domains.
Return JSON format: {"images":[{"url":"https://imgd.aeplcdn.com/...","source":"cardekho"}]}`;

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `Find direct image URLs from Indian car websites.
RULES:
1. Only return URLs ending with .jpg, .jpeg, .png, .webp
2. Prefer imgd.aeplcdn.com and media.zigcdn.com domains
3. Return valid JSON only`
          },
          { role: 'user', content: searchQuery }
        ],
        temperature: 0.1,
        max_tokens: 800,
        return_images: true,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    console.log(`Perplexity: ${cleanModel} ${cleanColor} - ${citations.length} citations`);

    const allImages: ImageSearchResult[] = [];

    // From citations
    for (const c of citations) {
      if (typeof c === 'string' && c.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
        allImages.push({ url: c, source: 'citation' });
      }
    }

    // Parse JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*"images"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const img of (parsed.images || [])) {
          if (img.url?.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
            allImages.push({ url: img.url.trim(), source: 'json' });
          }
        }
      }
    } catch {}

    // Regex extraction
    const urlRegex = /(https?:\/\/[^\s"'<>\)]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>\)]*)?)/gi;
    const urls = content.match(urlRegex) || [];
    for (const url of urls) {
      const cleanUrl = url.replace(/["\s]/g, '').replace(/\)$/, '');
      if (!allImages.some(img => img.url === cleanUrl)) {
        allImages.push({ url: cleanUrl, source: 'regex' });
      }
    }

    // Prioritize aeplcdn/zigcdn
    const prioritized = allImages.sort((a, b) => {
      const aScore = a.url.includes('aeplcdn') ? 2 : a.url.includes('zigcdn') ? 1 : 0;
      const bScore = b.url.includes('aeplcdn') ? 2 : b.url.includes('zigcdn') ? 1 : 0;
      return bScore - aScore;
    });

    // Dedupe
    const seen = new Set<string>();
    return prioritized.filter(img => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    }).slice(0, 5);
  } catch (error) {
    console.error('Perplexity error:', error);
    return [];
  }
}

// Scrape car images using Firecrawl
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

  const cleanBrand = brand.toLowerCase().replace(/\s+/g, '-');
  const cleanModel = model.toLowerCase().replace(/\s+/g, '-');
  
  // Build search URLs for Indian car websites
  const searchUrls = [
    `https://www.cardekho.com/${cleanBrand}/${cleanModel}/images`,
    `https://www.carwale.com/${cleanBrand}-cars/${cleanModel}/images`,
    `https://www.zigwheels.com/${cleanBrand}-cars/${cleanModel}/gallery`,
  ];

  const allImages: ImageSearchResult[] = [];

  for (const url of searchUrls) {
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
          waitFor: 2000,
        }),
      });

      if (!response.ok) {
        console.log(`Firecrawl failed for ${url}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const links = data.data?.links || data.links || [];
      const html = data.data?.html || data.html || '';

      // Extract image URLs from links
      for (const link of links) {
        if (typeof link === 'string' && link.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
          if (link.includes('aeplcdn') || link.includes('zigcdn') || link.includes('carwale')) {
            // Filter by color if specified
            if (colorName) {
              const colorLower = colorName.toLowerCase();
              if (link.toLowerCase().includes(colorLower) || !colorName) {
                allImages.push({ url: link, source: 'firecrawl-link' });
              }
            } else {
              allImages.push({ url: link, source: 'firecrawl-link' });
            }
          }
        }
      }

      // Also extract from HTML using regex
      const imgRegex = /(https?:\/\/[^\s"'<>]+(?:imgd\.aeplcdn\.com|media\.zigcdn\.com|img\.carwale\.com)[^\s"'<>]+\.(jpg|jpeg|png|webp))/gi;
      const htmlMatches = html.match(imgRegex) || [];
      for (const imgUrl of htmlMatches) {
        const cleanUrl = imgUrl.replace(/["\s]/g, '');
        if (!allImages.some(img => img.url === cleanUrl)) {
          allImages.push({ url: cleanUrl, source: 'firecrawl-html' });
        }
      }

      // If we found images, break early
      if (allImages.length >= 5) break;
      
    } catch (error) {
      console.error(`Firecrawl error for ${url}:`, error);
    }
  }

  // Prioritize high-resolution images
  const prioritized = allImages.sort((a, b) => {
    // Prefer larger image dimensions in URL
    const aHasSize = a.url.includes('1200') || a.url.includes('900') || a.url.includes('800');
    const bHasSize = b.url.includes('1200') || b.url.includes('900') || b.url.includes('800');
    if (aHasSize && !bHasSize) return -1;
    if (!aHasSize && bHasSize) return 1;
    return 0;
  });

  console.log(`Firecrawl found ${prioritized.length} images for ${brand} ${model}`);
  return prioritized.slice(0, 10);
}

// Download and upload image
async function downloadAndUploadImage(
  imageUrl: string,
  storagePath: string,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    // Handle base64 data URLs (from AI generation)
    if (imageUrl.startsWith('data:image/')) {
      const match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) return null;
      
      const [, format, base64Data] = match;
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      if (binaryData.length < 5000) {
        console.log('AI image too small');
        return null;
      }

      const finalPath = `${storagePath}.${format === 'jpeg' ? 'jpg' : format}`;
      
      const { error } = await supabase.storage
        .from('car-images')
        .upload(finalPath, binaryData, { 
          contentType: `image/${format}`, 
          upsert: true 
        });

      if (error) {
        console.error('Upload error:', error.message);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('car-images')
        .getPublicUrl(finalPath);

      console.log('✓ AI image uploaded');
      return urlData.publicUrl;
    }

    // Skip unreliable domains
    if (imageUrl.includes('imgk.timesauto.com') || imageUrl.includes('gaadiwaadi.com')) {
      return null;
    }

    console.log(`Downloading: ${imageUrl.substring(0, 60)}...`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.cardekho.com/',
      }
    });

    if (!response.ok) {
      console.log(`HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image')) return null;

    const buffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    if (uint8.length < 5000) {
      console.log('Too small:', uint8.length);
      return null;
    }

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const finalPath = `${storagePath}.${ext}`;

    const { error } = await supabase.storage
      .from('car-images')
      .upload(finalPath, uint8, { contentType, upsert: true });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('car-images')
      .getPublicUrl(finalPath);

    console.log('✓ Real image uploaded');
    return urlData.publicUrl;
  } catch (error) {
    console.log('Download error:', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

// Process single color - uses Perplexity + Firecrawl (real images only)
async function processCarColor(
  supabase: ReturnType<typeof createClient>,
  carId: string,
  colorId: string,
  brand: string,
  model: string,
  colorName: string
): Promise<{ success: boolean; imageUrl?: string; source?: string; error?: string }> {
  try {
    console.log(`\n>>> ${brand} ${model} - ${colorName}`);

    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'processing' })
      .eq('id', colorId);

    // Step 1: Try Perplexity first for real images
    let images = await searchCarImagesPerplexity(brand, model, colorName);

    // Step 2: If no color-specific results, try generic with Perplexity
    if (images.length === 0) {
      console.log('Trying Perplexity generic search...');
      images = await searchCarImagesPerplexity(brand, model, 'exterior');
    }

    // Step 3: If still no results, use Firecrawl to scrape car websites
    if (images.length === 0) {
      console.log('Trying Firecrawl scraping...');
      images = await scrapeCarImagesFirecrawl(brand, model, colorName);
    }

    // Step 4: Last resort - Firecrawl without color filter
    if (images.length === 0) {
      console.log('Trying Firecrawl without color filter...');
      images = await scrapeCarImagesFirecrawl(brand, model);
    }

    // Try each real image URL
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
            image_source: image.source.includes('firecrawl') ? 'firecrawl_scraped' : 'perplexity_search'
          })
          .eq('id', colorId);

        await supabase.from('car_images').insert({
          car_id: carId,
          url: uploadedUrl,
          alt_text: `${brand} ${model} in ${colorName}`,
          is_primary: false,
          sort_order: 10
        });

        console.log(`✓ SUCCESS (${image.source}): ${brand} ${model} ${colorName}`);
        return { success: true, imageUrl: uploadedUrl, source: image.source };
      }
    }

    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'failed' })
      .eq('id', colorId);

    return { success: false, error: 'No valid images found from any source' };
  } catch (error) {
    console.error('Error:', error);
    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'error' })
      .eq('id', colorId);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

// Background processing
async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  limit: number
): Promise<void> {
  console.log(`\n=== BATCH SYNC: ${limit} images (Perplexity + Firecrawl) ===\n`);
  
  try {
    const { data: colors } = await supabase
      .from('car_colors')
      .select(`id, name, hex_code, car_id, cars!inner(id, name, brand)`)
      .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed,image_sync_status.eq.not_found')
      .limit(limit);

    console.log(`Processing ${colors?.length || 0} colors...\n`);

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

      // Rate limiting - increased for Firecrawl
      await new Promise(r => setTimeout(r, 4000));
    }

    console.log(`\n=== DONE: ${success} success, ${fail} failed ===\n`);
  } catch (error) {
    console.error('Background error:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY_1') || Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured' }),
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
          message: `Background sync started for ${limit} images (Perplexity + Firecrawl)`, 
          async: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single car
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
        await new Promise(r => setTimeout(r, 4000));
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync batch
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
        await new Promise(r => setTimeout(r, 4000));
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
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
