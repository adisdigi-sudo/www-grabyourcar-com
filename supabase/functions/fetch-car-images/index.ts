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
}

interface ImageSearchResult {
  url: string;
  source: string;
  description?: string;
}

// Use Perplexity API to search for car images
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

  const searchQuery = `Find direct CDN image URLs for ${cleanBrand} ${cleanModel} car in ${cleanColor} color India.
  
  I need the actual image file URLs from these sources:
  - imgd.aeplcdn.com (CarDekho CDN)
  - imgcdn.carwale.com (CarWale CDN) 
  - stimg.cardekho.com (CarDekho Static)
  - imgd.zigcdn.com (ZigWheels CDN)
  - img.gaadicdn.com (Gaadi CDN)
  
  Search for "${cleanBrand} ${cleanModel} ${cleanColor}" and find direct .jpg or .png image links.`;

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
            content: `You are a web scraping assistant that finds direct image CDN URLs.

IMPORTANT: Return ONLY the JSON response, no explanations.
IMPORTANT: Only include URLs that end with .jpg, .jpeg, .png, or .webp
IMPORTANT: Do NOT include webpage URLs - only direct image file URLs

Look for image URLs from these CDN patterns:
- https://imgd.aeplcdn.com/...
- https://stimg.cardekho.com/...
- https://imgcdn.carwale.com/...
- https://imgd.zigcdn.com/...
- https://img.gaadicdn.com/...

Response format (JSON only, no markdown):
{"images":[{"url":"https://imgd.aeplcdn.com/example.jpg","source":"CarDekho"}]}`
          },
          { role: 'user', content: searchQuery }
        ],
        search_domain_filter: ['cardekho.com', 'carwale.com', 'zigwheels.com', 'gaadi.com'],
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
    console.log('Citations:', JSON.stringify(citations));

    // First try to extract from citations which often contain direct URLs
    const citationImages: ImageSearchResult[] = [];
    for (const citation of citations) {
      if (typeof citation === 'string') {
        const urlLower = citation.toLowerCase();
        if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || 
            urlLower.endsWith('.png') || urlLower.endsWith('.webp')) {
          citationImages.push({ url: citation, source: 'citation' });
        }
      }
    }

    // Try to parse JSON from response
    let parsedImages: ImageSearchResult[] = [];
    try {
      // Remove markdown code blocks if present
      let jsonContent = content;
      if (jsonContent.includes('```')) {
        const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonContent = match[1];
      }
      
      // Find JSON object
      const jsonMatch = jsonContent.match(/\{[\s\S]*"images"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsedImages = (parsed.images || []).filter((img: ImageSearchResult) => {
          const url = (img.url || '').toLowerCase();
          return url.endsWith('.jpg') || url.endsWith('.jpeg') || 
                 url.endsWith('.png') || url.endsWith('.webp');
        });
      }
    } catch (e) {
      console.log('JSON parsing failed, using regex extraction');
    }

    // Extract URLs via regex as fallback
    const urlRegex = /(https?:\/\/[^\s"'<>\)]+\.(?:jpg|jpeg|png|webp))/gi;
    const extractedUrls = content.match(urlRegex) || [];
    const regexImages = extractedUrls.map((url: string) => ({
      url: url.replace(/["\s]/g, ''),
      source: 'extracted'
    }));

    // Combine all images, remove duplicates
    const allImages = [...citationImages, ...parsedImages, ...regexImages];
    const uniqueUrls = new Set<string>();
    const uniqueImages = allImages.filter(img => {
      if (uniqueUrls.has(img.url)) return false;
      uniqueUrls.add(img.url);
      return true;
    });

    console.log(`Found ${uniqueImages.length} unique image URLs`);
    return uniqueImages.slice(0, 5);
  } catch (error) {
    console.error('Error searching for images:', error);
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Validate it's actually an image
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

    // Search for images using Perplexity
    const images = await searchCarImages(brand, model, colorName);

    if (images.length === 0) {
      // Update status to failed
      await supabase
        .from('car_colors')
        .update({ image_sync_status: 'failed' })
        .eq('id', colorId);
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
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

    const results: Array<{
      carId: string;
      colorId: string;
      colorName: string;
      success: boolean;
      imageUrl?: string;
      error?: string;
    }> = [];

    if (body.batchMode) {
      // Batch mode: fetch images for all cars without synced images
      const limit = body.limit || 10;

      // Get cars with colors that need image sync
      const { data: colorsToSync, error: queryError } = await supabase
        .from('car_colors')
        .select(`
          id,
          name,
          car_id,
          cars!inner(id, name, brand)
        `)
        .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed')
        .limit(limit);

      if (queryError) {
        return new Response(
          JSON.stringify({ success: false, error: queryError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${colorsToSync?.length || 0} colors to sync`);

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

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else if (body.carId || body.carSlug) {
      // Single car mode
      let carQuery = supabase
        .from('cars')
        .select('id, name, brand');

      if (body.carId) {
        carQuery = carQuery.eq('id', body.carId);
      } else if (body.carSlug) {
        carQuery = carQuery.eq('slug', body.carSlug);
      }

      const { data: car, error: carError } = await carQuery.single();

      if (carError || !car) {
        return new Response(
          JSON.stringify({ success: false, error: 'Car not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get colors for this car
      let colorsQuery = supabase
        .from('car_colors')
        .select('id, name')
        .eq('car_id', car.id);

      if (body.colorId) {
        colorsQuery = colorsQuery.eq('id', body.colorId);
      } else if (body.colorName) {
        colorsQuery = colorsQuery.ilike('name', `%${body.colorName}%`);
      }

      const { data: colors, error: colorsError } = await colorsQuery;

      if (colorsError) {
        return new Response(
          JSON.stringify({ success: false, error: colorsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
          carId: car.id,
          colorId: color.id,
          colorName: color.name,
          ...result
        });

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Update car's images_synced flag
      await supabase
        .from('cars')
        .update({
          images_synced: true,
          images_synced_at: new Date().toISOString()
        })
        .eq('id', car.id);
    } else if (body.brand && body.model && body.colorName) {
      // Direct search mode without database lookup
      const images = await searchCarImages(body.brand, body.model, body.colorName);
      
      return new Response(
        JSON.stringify({
          success: true,
          images: images,
          query: { brand: body.brand, model: body.model, color: body.colorName }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide carId, carSlug, or enable batchMode'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: results.length,
          successful,
          failed
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-car-images:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
