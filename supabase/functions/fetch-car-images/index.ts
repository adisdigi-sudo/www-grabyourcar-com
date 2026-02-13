import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// OEM domain configuration - official manufacturer websites only
const OEM_SOURCES: Record<string, { domain: string; imagePattern: string; referer: string }> = {
  'maruti suzuki': { domain: 'www.marutisuzuki.com', imagePattern: 'marutisuzuki.com', referer: 'https://www.marutisuzuki.com/' },
  'hyundai': { domain: 'www.hyundai.com/in', imagePattern: 'hyundai.com', referer: 'https://www.hyundai.com/in/' },
  'tata': { domain: 'cars.tatamotors.com', imagePattern: 'tatamotors.com', referer: 'https://cars.tatamotors.com/' },
  'mahindra': { domain: 'www.mahindra.com', imagePattern: 'mahindra.com', referer: 'https://www.mahindra.com/' },
  'honda': { domain: 'www.hondacarindia.com', imagePattern: 'hondacarindia.com', referer: 'https://www.hondacarindia.com/' },
  'toyota': { domain: 'www.toyotabharat.com', imagePattern: 'toyotabharat.com', referer: 'https://www.toyotabharat.com/' },
  'kia': { domain: 'www.kia.com/in', imagePattern: 'kia.com', referer: 'https://www.kia.com/in/' },
  'mg': { domain: 'www.mgmotor.co.in', imagePattern: 'mgmotor.co.in', referer: 'https://www.mgmotor.co.in/' },
  'skoda': { domain: 'www.skoda-auto.co.in', imagePattern: 'skoda-auto.co.in', referer: 'https://www.skoda-auto.co.in/' },
  'volkswagen': { domain: 'www.volkswagen.co.in', imagePattern: 'volkswagen.co.in', referer: 'https://www.volkswagen.co.in/' },
  'renault': { domain: 'www.renault.co.in', imagePattern: 'renault.co.in', referer: 'https://www.renault.co.in/' },
  'nissan': { domain: 'www.nissan.in', imagePattern: 'nissan.in', referer: 'https://www.nissan.in/' },
  'citroen': { domain: 'www.citroen.in', imagePattern: 'citroen.in', referer: 'https://www.citroen.in/' },
  'jeep': { domain: 'www.jeep-india.com', imagePattern: 'jeep-india.com', referer: 'https://www.jeep-india.com/' },
  'bmw': { domain: 'www.bmw.in', imagePattern: 'bmw.in', referer: 'https://www.bmw.in/' },
  'mercedes-benz': { domain: 'www.mercedes-benz.co.in', imagePattern: 'mercedes-benz.co.in', referer: 'https://www.mercedes-benz.co.in/' },
  'audi': { domain: 'www.audi.in', imagePattern: 'audi.in', referer: 'https://www.audi.in/' },
  'volvo': { domain: 'www.volvocars.com/in', imagePattern: 'volvocars.com', referer: 'https://www.volvocars.com/in/' },
  'lexus': { domain: 'www.lexusindia.co.in', imagePattern: 'lexusindia.co.in', referer: 'https://www.lexusindia.co.in/' },
  'porsche': { domain: 'www.porsche.com/india', imagePattern: 'porsche.com', referer: 'https://www.porsche.com/india/' },
  'byd': { domain: 'www.byd.com/in', imagePattern: 'byd.com', referer: 'https://www.byd.com/in/' },
};

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

// Scrape car images from official OEM website only
async function scrapeOemImages(
  brand: string,
  model: string,
  colorName?: string
): Promise<ImageSearchResult[]> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) return [];

  const brandKey = brand.toLowerCase().replace('maruti suzuki', 'maruti suzuki');
  const oemConfig = OEM_SOURCES[brandKey] || OEM_SOURCES[brand.toLowerCase().split(' ')[0]];
  
  if (!oemConfig) {
    console.log(`No OEM config for brand: ${brand}`);
    return [];
  }

  const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
  const searchUrls = [
    `https://${oemConfig.domain}/${modelSlug}`,
    `https://${oemConfig.domain}/${modelSlug}/gallery`,
    `https://${oemConfig.domain}/${modelSlug}/images`,
  ];

  const allImages: ImageSearchResult[] = [];

  for (const url of searchUrls) {
    if (allImages.length >= 8) break;
    
    try {
      console.log(`Scraping OEM: ${url}`);
      
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

      if (!response.ok) continue;

      const data = await response.json();
      const links = data.data?.links || data.links || [];
      const html = data.data?.html || data.html || '';

      // Extract image URLs only from OEM domain
      for (const link of links) {
        if (typeof link === 'string' && link.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
          if (link.includes(oemConfig.imagePattern)) {
            if (link.includes('200x') || link.includes('100x') || link.includes('thumb') || link.includes('50x')) continue;
            allImages.push({ url: link, source: 'oem-link' });
          }
        }
      }

      // Extract from HTML - OEM CDN patterns only
      const oemPattern = new RegExp(`(https?://[^\\s"'<>]*${oemConfig.imagePattern.replace(/\./g, '\\.')}[^\\s"'<>]*\\.(jpg|jpeg|png|webp)[^\\s"'<>]*)`, 'gi');
      const htmlMatches = html.match(oemPattern) || [];
      for (const imgUrl of htmlMatches) {
        const cleanUrl = imgUrl.replace(/["\s]/g, '');
        if (cleanUrl.includes('200x') || cleanUrl.includes('100x') || cleanUrl.includes('thumb')) continue;
        if (!allImages.some(img => img.url === cleanUrl)) {
          allImages.push({ url: cleanUrl, source: 'oem-html' });
        }
      }

      // Also check for Scene7/CDN patterns used by many OEMs
      const cdnPatterns = [
        /(https?:\/\/[^\s"'<>]*scene7[^\s"'<>]*\.(jpg|jpeg|png|webp)[^\s"'<>]*)/gi,
        /(https?:\/\/[^\s"'<>]*cloudfront\.net[^\s"'<>]*\.(jpg|jpeg|png|webp)[^\s"'<>]*)/gi,
      ];
      for (const pattern of cdnPatterns) {
        const cdnMatches = html.match(pattern) || [];
        for (const imgUrl of cdnMatches) {
          if (!allImages.some(img => img.url === imgUrl)) {
            allImages.push({ url: imgUrl, source: 'oem-cdn' });
          }
        }
      }

    } catch (error) {
      console.error(`OEM scrape error for ${url}:`, error);
    }
    
    await new Promise(r => setTimeout(r, 1500));
  }

  // Dedupe and prioritize high-res
  const seen = new Set<string>();
  return allImages
    .filter(img => {
      const normalized = img.url.split('?')[0];
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .sort((a, b) => {
      const getScore = (url: string) => {
        if (url.includes('1920') || url.includes('1600')) return 5;
        if (url.includes('1280') || url.includes('1200')) return 4;
        if (url.includes('900') || url.includes('800')) return 3;
        return 1;
      };
      return getScore(b.url) - getScore(a.url);
    })
    .slice(0, 10);
}

// Download and upload image to Supabase storage
async function downloadAndUploadImage(
  imageUrl: string,
  storagePath: string,
  supabase: ReturnType<typeof createClient>,
  referer?: string
): Promise<string | null> {
  try {
    if (imageUrl.includes('.avif')) return null;

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/jpeg,image/png,image/webp,image/*;q=0.8',
        'Referer': referer || 'https://www.google.com/',
      }
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('avif') || !contentType.includes('image')) return null;

    const buffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    if (uint8.length < 10000) return null;

    let ext = 'jpg';
    let uploadContentType = 'image/jpeg';
    if (contentType.includes('png')) { ext = 'png'; uploadContentType = 'image/png'; }
    else if (contentType.includes('webp')) { ext = 'webp'; uploadContentType = 'image/webp'; }

    const finalPath = `${storagePath}.${ext}`;
    const { error } = await supabase.storage
      .from('car-images')
      .upload(finalPath, uint8, { contentType: uploadContentType, upsert: true });

    if (error) return null;

    const { data: urlData } = supabase.storage.from('car-images').getPublicUrl(finalPath);
    console.log('✓ OEM image uploaded successfully');
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

// Process single color
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

    await supabase.from('car_colors').update({ image_sync_status: 'processing' }).eq('id', colorId);

    const brandKey = brand.toLowerCase();
    const oemConfig = OEM_SOURCES[brandKey] || OEM_SOURCES[brand.toLowerCase().split(' ')[0]];
    const referer = oemConfig?.referer;

    let images = await scrapeOemImages(brand, model, colorName);
    if (images.length === 0) {
      images = await scrapeOemImages(brand, model);
    }

    for (const image of images) {
      const path = `${brand.toLowerCase().replace(/\s+/g, '-')}/${model.toLowerCase().replace(/\s+/g, '-')}/${colorName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      const uploadedUrl = await downloadAndUploadImage(image.url, path, supabase, referer);

      if (uploadedUrl) {
        await supabase.from('car_colors').update({
          image_url: uploadedUrl,
          image_sync_status: 'synced',
          image_synced_at: new Date().toISOString(),
          image_source: 'oem_official'
        }).eq('id', colorId);

        await supabase.from('car_images').insert({
          car_id: carId, url: uploadedUrl,
          alt_text: `${brand} ${model} in ${colorName}`,
          is_primary: false, sort_order: 10
        });

        return { success: true, imageUrl: uploadedUrl, source: 'oem_official' };
      }
    }

    await supabase.from('car_colors').update({ image_sync_status: 'not_found' }).eq('id', colorId);
    return { success: false, error: 'No images found from official manufacturer (OEM) website' };
  } catch (error) {
    await supabase.from('car_colors').update({ image_sync_status: 'error' }).eq('id', colorId);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  limit: number
): Promise<void> {
  console.log(`\n=== OEM-ONLY BATCH SYNC: ${limit} images ===\n`);
  try {
    const { data: colors } = await supabase
      .from('car_colors')
      .select(`id, name, hex_code, car_id, cars!inner(id, name, brand)`)
      .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed,image_sync_status.eq.not_found')
      .limit(limit);

    let success = 0, fail = 0;
    for (const color of colors || []) {
      const car = color.cars as { id: string; name: string; brand: string };
      const result = await processCarColor(supabase, color.car_id, color.id, car.brand, car.name, color.name);
      if (result.success) success++; else fail++;
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log(`\n=== DONE: ${success} success, ${fail} failed ===\n`);
  } catch (error) {
    console.error('Background processing error:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: FetchImageRequest = await req.json();

    if (body.batchMode && body.async) {
      const limit = body.limit || 20;
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, limit));
      return new Response(JSON.stringify({ success: true, message: `Background OEM sync started for ${limit} images`, async: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.carId || body.carSlug) {
      const query = body.carId 
        ? supabase.from('cars').select('id, name, brand').eq('id', body.carId).single()
        : supabase.from('cars').select('id, name, brand').eq('slug', body.carSlug).single();
      const { data: car, error } = await query;
      if (error || !car) return new Response(JSON.stringify({ success: false, error: 'Car not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: colors } = await supabase.from('car_colors').select('id, name').eq('car_id', car.id)
        .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed');

      const results = [];
      for (const color of colors || []) {
        const result = await processCarColor(supabase, car.id, color.id, car.brand, car.name, color.name);
        results.push({ colorId: color.id, colorName: color.name, ...result });
        await new Promise(r => setTimeout(r, 3000));
      }
      return new Response(JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.batchMode) {
      const limit = body.limit || 10;
      const { data: colors } = await supabase.from('car_colors')
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
      return new Response(JSON.stringify({ success: true, processed: results.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'Provide carId, carSlug, or batchMode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
