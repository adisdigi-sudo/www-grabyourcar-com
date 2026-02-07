import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

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
  useAIFallback?: boolean;
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

// Generate AI image using Gemini as fallback
async function generateAIImage(
  brand: string,
  model: string,
  colorName: string,
  hexCode?: string
): Promise<string | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    console.log('Gemini API key not configured');
    return null;
  }

  // Build detailed prompt for car image generation
  const colorDesc = hexCode ? `${colorName} (hex: ${hexCode})` : colorName;
  const prompt = `Generate a photorealistic studio image of a ${brand} ${model} car in ${colorDesc} color.
The car should be shown in a 3/4 front view angle on a clean white/grey gradient background.
High quality, professional automotive photography style, sharp details, proper lighting.
The image should look like an official manufacturer press photo.`;

  try {
    console.log(`Generating AI image for ${brand} ${model} ${colorName}...`);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['image', 'text'],
          responseMimeType: 'image/png',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini error [${response.status}]:`, errText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        console.log('✓ AI image generated');
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error('Gemini error:', error);
    return null;
  }
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

// Get hex code for color
async function getColorHexCode(
  supabase: ReturnType<typeof createClient>,
  colorId: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from('car_colors')
    .select('hex_code')
    .eq('id', colorId)
    .single();
  return data?.hex_code;
}

// Process single color
async function processCarColor(
  supabase: ReturnType<typeof createClient>,
  carId: string,
  colorId: string,
  brand: string,
  model: string,
  colorName: string,
  useAIFallback: boolean = true
): Promise<{ success: boolean; imageUrl?: string; source?: string; error?: string }> {
  try {
    console.log(`\n>>> ${brand} ${model} - ${colorName}`);

    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'processing' })
      .eq('id', colorId);

    // Try Perplexity first for real images
    let images = await searchCarImagesPerplexity(brand, model, colorName);

    // If no color-specific results, try generic
    if (images.length === 0) {
      console.log('Trying generic search...');
      images = await searchCarImagesPerplexity(brand, model, 'exterior');
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
            image_source: 'real_oem'
          })
          .eq('id', colorId);

        await supabase.from('car_images').insert({
          car_id: carId,
          url: uploadedUrl,
          alt_text: `${brand} ${model} in ${colorName}`,
          is_primary: false,
          sort_order: 10
        });

        console.log(`✓ SUCCESS (real): ${brand} ${model} ${colorName}`);
        return { success: true, imageUrl: uploadedUrl, source: 'real_oem' };
      }
    }

    // Fallback to AI-generated image
    if (useAIFallback) {
      console.log('Using AI fallback...');
      const hexCode = await getColorHexCode(supabase, colorId);
      const aiImageData = await generateAIImage(brand, model, colorName, hexCode);

      if (aiImageData) {
        const path = `${brand.toLowerCase().replace(/\s+/g, '-')}/${model.toLowerCase().replace(/\s+/g, '-')}/${colorName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        const uploadedUrl = await downloadAndUploadImage(aiImageData, path, supabase);

        if (uploadedUrl) {
          await supabase
            .from('car_colors')
            .update({
              image_url: uploadedUrl,
              image_sync_status: 'synced',
              image_synced_at: new Date().toISOString(),
              image_source: 'ai_generated'
            })
            .eq('id', colorId);

          await supabase.from('car_images').insert({
            car_id: carId,
            url: uploadedUrl,
            alt_text: `${brand} ${model} in ${colorName}`,
            is_primary: false,
            sort_order: 10
          });

          console.log(`✓ SUCCESS (AI): ${brand} ${model} ${colorName}`);
          return { success: true, imageUrl: uploadedUrl, source: 'ai_generated' };
        }
      }
    }

    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'failed' })
      .eq('id', colorId);

    return { success: false, error: 'All methods failed' };
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
  limit: number,
  useAIFallback: boolean
): Promise<void> {
  console.log(`\n=== BATCH SYNC: ${limit} images, AI fallback: ${useAIFallback} ===\n`);
  
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
        color.name,
        useAIFallback
      );

      if (result.success) success++;
      else fail++;

      // Rate limiting
      await new Promise(r => setTimeout(r, 3000));
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
    const useAIFallback = body.useAIFallback !== false; // Default true

    // Async batch mode
    if (body.batchMode && body.async) {
      const limit = body.limit || 20;
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, limit, useAIFallback));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Background sync started for ${limit} images (AI fallback: ${useAIFallback})`, 
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
        const result = await processCarColor(supabase, car.id, color.id, car.brand, car.name, color.name, useAIFallback);
        results.push({ colorId: color.id, colorName: color.name, ...result });
        await new Promise(r => setTimeout(r, 3000));
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
        const result = await processCarColor(supabase, color.car_id, color.id, car.brand, car.name, color.name, useAIFallback);
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
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
