import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface FetchImageRequest {
  carId?: string;
  carSlug?: string;
  colorId?: string;
  colorName?: string;
  brand?: string;
  model?: string;
  batchMode?: boolean;
  limit?: number;
  syncPrimaryImages?: boolean;
}

interface ImageSearchResult {
  url: string;
  source: string;
  description?: string;
}

// Known CDN patterns for Indian car images
const CDN_PATTERNS = [
  'imgd.aeplcdn.com',
  'stimg.cardekho.com',
  'cdni.autocarindia.com',
  'imgk.timesauto.com',
  'imgcdnk.gaadi.com',
  'c.ndtvimg.com',
  'gaadiwaadi.com',
  'akm-img-a-in.tosshub.com',
  'images.carandbike.com'
];

// Generate direct CDN URLs based on known patterns
function generateCDNUrls(brand: string, model: string, colorName: string): string[] {
  const cleanBrand = brand.toLowerCase().replace(/\s+/g, '-');
  const cleanModel = model.toLowerCase().replace(/\s+/g, '-');
  const cleanColor = colorName.toLowerCase().replace(/\s+/g, '-');
  
  // Generate potential URLs based on known CDN patterns
  const urls: string[] = [];
  
  // CarDekho pattern - most reliable
  const aeplSizes = ['1600x900', '664x374', '600x400', '300x200'];
  aeplSizes.forEach(size => {
    urls.push(`https://imgd.aeplcdn.com/${size}/n/cw/ec/${cleanBrand}/${cleanModel}-${cleanColor}.jpeg`);
    urls.push(`https://imgd.aeplcdn.com/${size}/n/cw/ec/${cleanModel}/${cleanColor}.jpeg`);
  });
  
  // CardekhoStatic pattern
  urls.push(`https://stimg.cardekho.com/images/carexteriorimages/930x620/${cleanBrand}/${cleanModel}/${cleanColor}.jpg`);
  urls.push(`https://stimg.cardekho.com/images/carexteriorimages/630x420/${cleanBrand}/${cleanModel}/${cleanColor}.jpg`);
  
  return urls;
}

// Use Perplexity API to search for car images with improved search
async function searchCarImages(
  brand: string,
  model: string,
  colorName: string
): Promise<ImageSearchResult[]> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY_1') || Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY is not configured');
    return [];
  }

  // Clean up brand and model names for better search
  const cleanBrand = brand.replace(/\s+/g, ' ').trim();
  const cleanModel = model.replace(/\s+/g, ' ').trim();
  const cleanColor = colorName.replace(/\s+/g, ' ').trim();

  // More specific search query asking for image links from galleries
  const searchQuery = `${cleanBrand} ${cleanModel} ${cleanColor} color car image India 2024 2025
  
Search CarDekho, CarWale, and AutocarIndia for official gallery images of this car.
I need the actual CDN image URL that ends in .jpg, .jpeg, .png or .webp.
Look for URLs from domains: imgd.aeplcdn.com, stimg.cardekho.com, imgk.timesauto.com
Return the exact image file URL, not the page URL.`;

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
            content: `You are an image URL finder. Your task is to find and return direct image URLs from car websites.
IMPORTANT: Return ONLY valid image URLs in JSON format.
Format: {"images":[{"url":"https://...","source":"website_name"}]}

Rules:
1. URLs must end with .jpg, .jpeg, .png, or .webp
2. Prefer URLs from: imgd.aeplcdn.com, stimg.cardekho.com, imgk.timesauto.com
3. Include the color name in the URL if possible
4. Return 3-5 image URLs maximum
5. Do NOT include page URLs - only direct image file URLs`
          },
          { role: 'user', content: searchQuery }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error [${response.status}]:`, errorText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    console.log('Perplexity response preview:', content.substring(0, 300));
    console.log('Citations count:', citations.length);

    const allImages: ImageSearchResult[] = [];

    // Extract from citations (if they contain direct image URLs)
    for (const citation of citations) {
      if (typeof citation === 'string') {
        const urlLower = citation.toLowerCase();
        if (urlLower.match(/\.(jpg|jpeg|png|webp)(\?|$)/)) {
          allImages.push({ url: citation, source: 'citation' });
        }
      }
    }

    // Try to parse JSON from response
    try {
      let jsonContent = content;
      // Remove markdown code blocks if present
      if (jsonContent.includes('```')) {
        const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonContent = match[1];
      }
      
      // Find JSON object
      const jsonMatch = jsonContent.match(/\{[\s\S]*"images"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const parsedImages = (parsed.images || []).filter((img: ImageSearchResult) => {
          const url = (img.url || '').toLowerCase();
          return url.match(/\.(jpg|jpeg|png|webp)(\?|$)/);
        });
        allImages.push(...parsedImages);
      }
    } catch (e) {
      console.log('JSON parsing failed, using regex extraction');
    }

    // Extract URLs via regex as fallback
    const urlRegex = /(https?:\/\/[^\s"'<>\)]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>\)]*)?)/gi;
    const extractedUrls = content.match(urlRegex) || [];
    const regexImages = extractedUrls.map((url: string) => ({
      url: url.replace(/["\s]/g, ''),
      source: 'extracted'
    }));
    allImages.push(...regexImages);

    // Filter for known CDN patterns
    const cdnImages = allImages.filter(img => 
      CDN_PATTERNS.some(pattern => img.url.includes(pattern))
    );

    // If we have CDN images, prefer those
    const resultImages = cdnImages.length > 0 ? cdnImages : allImages;

    // Remove duplicates
    const uniqueUrls = new Set<string>();
    const uniqueImages = resultImages.filter(img => {
      if (uniqueUrls.has(img.url)) return false;
      uniqueUrls.add(img.url);
      return true;
    });

    console.log(`Found ${uniqueImages.length} unique image URLs (${cdnImages.length} from CDN)`);
    return uniqueImages.slice(0, 5);
  } catch (error) {
    console.error('Error searching for images:', error);
    return [];
  }
}

// Search for primary car image (exterior shot)
async function searchPrimaryCarImage(
  brand: string,
  model: string
): Promise<ImageSearchResult[]> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY_1') || Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!PERPLEXITY_API_KEY) {
    return [];
  }

  const cleanBrand = brand.replace(/\s+/g, ' ').trim();
  const cleanModel = model.replace(/\s+/g, ' ').trim();

  const searchQuery = `${cleanBrand} ${cleanModel} official car image India 2024 2025 exterior front view
  
Find the main promotional image or front three-quarter view image.
I need the actual CDN image URL that ends in .jpg, .jpeg, .png or .webp.
Look for URLs from: imgd.aeplcdn.com, stimg.cardekho.com, imgk.timesauto.com, akm-img-a-in.tosshub.com`;

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
            content: `You are an image URL finder. Find and return direct image URLs for cars.
Return ONLY valid image URLs in JSON format.
Format: {"images":[{"url":"https://...","source":"website_name"}]}
Only include URLs ending with .jpg, .jpeg, .png, or .webp`
          },
          { role: 'user', content: searchQuery }
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    const allImages: ImageSearchResult[] = [];

    // Extract from citations
    for (const citation of citations) {
      if (typeof citation === 'string') {
        const urlLower = citation.toLowerCase();
        if (urlLower.match(/\.(jpg|jpeg|png|webp)(\?|$)/)) {
          allImages.push({ url: citation, source: 'citation' });
        }
      }
    }

    // Extract URLs via regex
    const urlRegex = /(https?:\/\/[^\s"'<>\)]+\.(jpg|jpeg|png|webp)(\?[^\s"'<>\)]*)?)/gi;
    const extractedUrls = content.match(urlRegex) || [];
    allImages.push(...extractedUrls.map((url: string) => ({
      url: url.replace(/["\s]/g, ''),
      source: 'extracted'
    })));

    // Prefer CDN images
    const cdnImages = allImages.filter(img => 
      CDN_PATTERNS.some(pattern => img.url.includes(pattern))
    );

    const resultImages = cdnImages.length > 0 ? cdnImages : allImages;

    // Remove duplicates
    const uniqueUrls = new Set<string>();
    return resultImages.filter(img => {
      if (uniqueUrls.has(img.url)) return false;
      uniqueUrls.add(img.url);
      return true;
    }).slice(0, 3);
  } catch (error) {
    console.error('Error searching for primary image:', error);
    return [];
  }
}

// Download image from URL and upload to Supabase Storage
async function downloadAndUploadImage(
  imageUrl: string,
  storagePath: string,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.cardekho.com/'
      }
    });

    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Validate minimum size and content type
    if (uint8Array.length < 1000) {
      console.error('Image too small, likely invalid');
      return null;
    }

    if (!contentType.includes('image')) {
      console.error('Not an image content type:', contentType);
      return null;
    }

    // Determine file extension from content type
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('gif')) extension = 'gif';

    const finalPath = `${storagePath}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('car-images')
      .upload(finalPath, uint8Array, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('car-images')
      .getPublicUrl(finalPath);

    console.log(`Uploaded to: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error downloading/uploading image:', error);
    return null;
  }
}

// Process a single color for a car
async function processCarColor(
  supabase: ReturnType<typeof createClient>,
  carId: string,
  colorId: string,
  brand: string,
  model: string,
  colorName: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    console.log(`Processing ${brand} ${model} in ${colorName}...`);

    // Mark as processing
    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'processing' })
      .eq('id', colorId);

    // Search for images using Perplexity
    const images = await searchCarImages(brand, model, colorName);

    if (images.length === 0) {
      // Update status to failed
      await supabase
        .from('car_colors')
        .update({ image_sync_status: 'not_found' })
        .eq('id', colorId);
      console.log(`No images found for ${brand} ${model} ${colorName}`);
      return { success: false, error: 'No images found' };
    }

    // Try to download and upload the first valid image
    for (const image of images) {
      const storagePath = `${brand.toLowerCase().replace(/\s+/g, '-')}/${model.toLowerCase().replace(/\s+/g, '-')}/${colorName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      
      const uploadedUrl = await downloadAndUploadImage(image.url, storagePath, supabase);

      if (uploadedUrl) {
        // Update the car_colors table with the image URL
        const { error: updateError } = await supabase
          .from('car_colors')
          .update({
            image_url: uploadedUrl,
            image_sync_status: 'synced',
            image_synced_at: new Date().toISOString(),
            image_source: image.source
          })
          .eq('id', colorId);

        if (updateError) {
          console.error('Failed to update car_colors:', updateError);
          return { success: false, error: updateError.message };
        }

        // Also add to car_images table
        await supabase.from('car_images').insert({
          car_id: carId,
          url: uploadedUrl,
          alt_text: `${brand} ${model} in ${colorName}`,
          is_primary: false,
          sort_order: 10
        });

        console.log(`✓ Synced ${brand} ${model} ${colorName}`);
        return { success: true, imageUrl: uploadedUrl };
      }
    }

    // Update status to failed if no images could be downloaded
    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'failed' })
      .eq('id', colorId);

    return { success: false, error: 'Failed to download any images' };
  } catch (error) {
    console.error('Error processing car color:', error);
    await supabase
      .from('car_colors')
      .update({ image_sync_status: 'error' })
      .eq('id', colorId);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

// Background processing function
async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  limit: number,
  syncPrimaryImages: boolean
): Promise<void> {
  console.log(`Starting background batch processing - limit: ${limit}, syncPrimary: ${syncPrimaryImages}`);
  
  try {
    // First, sync primary images for cars without any images
    if (syncPrimaryImages) {
      console.log('Looking for cars without primary images...');
      
      // Get cars with no images
      const { data: carsWithoutImages } = await supabase
        .from('cars')
        .select('id, name, brand, slug')
        .eq('images_synced', false)
        .limit(Math.min(10, Math.ceil(limit / 3)));

      if (carsWithoutImages?.length) {
        console.log(`Found ${carsWithoutImages.length} cars needing primary images`);
        
        for (const car of carsWithoutImages) {
          const images = await searchPrimaryCarImage(car.brand, car.name);
          
          if (images.length > 0) {
            for (const image of images) {
              const storagePath = `${car.brand.toLowerCase().replace(/\s+/g, '-')}/${car.slug}/primary-${Date.now()}`;
              const uploadedUrl = await downloadAndUploadImage(image.url, storagePath, supabase);
              
              if (uploadedUrl) {
                await supabase.from('car_images').insert({
                  car_id: car.id,
                  url: uploadedUrl,
                  alt_text: `${car.brand} ${car.name}`,
                  is_primary: true,
                  sort_order: 0
                });
                
                await supabase.from('cars').update({
                  images_synced: true,
                  images_synced_at: new Date().toISOString()
                }).eq('id', car.id);
                
                console.log(`✓ Added primary image for ${car.name}`);
                break;
              }
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Get colors that need image sync
    const { data: colorsToSync, error: queryError } = await supabase
      .from('car_colors')
      .select(`
        id,
        name,
        car_id,
        cars!inner(id, name, brand)
      `)
      .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed,image_sync_status.eq.not_found')
      .limit(limit);

    if (queryError) {
      console.error('Query error:', queryError.message);
      return;
    }

    console.log(`Found ${colorsToSync?.length || 0} colors to sync`);

    let successCount = 0;
    let failCount = 0;

    for (const color of colorsToSync || []) {
      const car = color.cars as any;
      const result = await processCarColor(
        supabase,
        color.car_id,
        color.id,
        car.brand,
        car.name,
        color.name
      );

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // Rate limiting to avoid API limits
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    console.log(`Background processing complete - Success: ${successCount}, Failed: ${failCount}`);
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Check required API keys
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY_1') || Deno.env.get('PERPLEXITY_API_KEY');

    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: FetchImageRequest = await req.json();

    // Check for async/background mode
    if (body.batchMode && (body as any).async) {
      const limit = body.limit || 20;
      const syncPrimaryImages = body.syncPrimaryImages !== false;
      
      // Start background processing
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, limit, syncPrimaryImages));
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Background sync started for up to ${limit} images. Check logs for progress.`,
          async: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single car/color processing
    if (body.carId || body.carSlug) {
      // Get car details
      const carQuery = body.carId 
        ? supabase.from('cars').select('id, name, brand').eq('id', body.carId).single()
        : supabase.from('cars').select('id, name, brand').eq('slug', body.carSlug).single();
      
      const { data: car, error: carError } = await carQuery;
      
      if (carError || !car) {
        return new Response(
          JSON.stringify({ success: false, error: 'Car not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get colors for this car
      const { data: colors } = await supabase
        .from('car_colors')
        .select('id, name')
        .eq('car_id', car.id)
        .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed');

      const results = [];
      for (const color of colors || []) {
        const result = await processCarColor(
          supabase,
          car.id,
          color.id,
          car.brand,
          car.name,
          color.name
        );
        results.push({
          colorId: color.id,
          colorName: color.name,
          ...result
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch mode (synchronous)
    if (body.batchMode) {
      const limit = body.limit || 10;
      
      // Get colors that need sync
      const { data: colorsToSync } = await supabase
        .from('car_colors')
        .select(`
          id,
          name,
          car_id,
          cars!inner(id, name, brand)
        `)
        .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed')
        .limit(limit);

      const results = [];
      for (const color of colorsToSync || []) {
        const car = color.cars as any;
        const result = await processCarColor(
          supabase,
          color.car_id,
          color.id,
          car.brand,
          car.name,
          color.name
        );
        results.push({
          carId: color.car_id,
          colorId: color.id,
          colorName: color.name,
          ...result
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request - provide carId, carSlug, or batchMode' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
