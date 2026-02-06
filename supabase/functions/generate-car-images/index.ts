import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface GenerateImageRequest {
  carId?: string;
  colorId?: string;
  batchMode?: boolean;
  limit?: number;
  async?: boolean;
}

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

// Generate car image using Lovable AI
async function generateCarImage(
  brand: string,
  model: string,
  colorName: string,
  colorHex: string
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY is not configured');
    return null;
  }

  const prompt = `Professional automotive photograph of a ${brand} ${model} car in ${colorName} color (${colorHex}). 
Front 3/4 view, showroom lighting, high resolution, photorealistic, Indian car market styling, white studio background.
Clean, sharp, dealership quality product photo.`;

  try {
    console.log(`Generating image for ${brand} ${model} in ${colorName}...`);
    
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Lovable AI error [${response.status}]:`, errorText);
      return null;
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error('No image generated');
      return null;
    }

    console.log(`Image generated successfully for ${brand} ${model}`);
    return imageData; // Returns base64 data URL
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

// Upload base64 image to Supabase Storage
async function uploadBase64Image(
  base64Data: string,
  storagePath: string,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  try {
    // Extract the actual base64 data (remove data URL prefix)
    const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error('Invalid base64 data format');
      return null;
    }

    const imageType = base64Match[1];
    const base64Content = base64Match[2];
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const contentType = `image/${imageType}`;
    const finalPath = `${storagePath}.${imageType}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('car-images')
      .upload(finalPath, bytes, {
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
    console.error('Error uploading image:', error);
    return null;
  }
}

// Process a single car color
async function processCarColor(
  supabase: ReturnType<typeof createClient>,
  carId: string,
  colorId: string,
  brand: string,
  model: string,
  colorName: string,
  colorHex: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    // Generate image
    const base64Image = await generateCarImage(brand, model, colorName, colorHex);
    
    if (!base64Image) {
      await supabase
        .from('car_colors')
        .update({ image_sync_status: 'failed' })
        .eq('id', colorId);
      return { success: false, error: 'Failed to generate image' };
    }

    // Upload to storage
    const storagePath = `${brand.toLowerCase().replace(/\s+/g, '-')}/${model.toLowerCase().replace(/\s+/g, '-')}/${colorName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const uploadedUrl = await uploadBase64Image(base64Image, storagePath, supabase);

    if (!uploadedUrl) {
      await supabase
        .from('car_colors')
        .update({ image_sync_status: 'failed' })
        .eq('id', colorId);
      return { success: false, error: 'Failed to upload image' };
    }

    // Update database
    const { error: updateError } = await supabase
      .from('car_colors')
      .update({
        image_url: uploadedUrl,
        image_sync_status: 'synced',
        image_synced_at: new Date().toISOString(),
        image_source: 'ai_generated'
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
  } catch (error) {
    console.error('Error processing car color:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Background processing function
async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  limit: number
): Promise<void> {
  console.log(`Starting background AI image generation - limit: ${limit}`);
  
  try {
    // Get colors that need image sync
    const { data: colorsToSync, error: queryError } = await supabase
      .from('car_colors')
      .select(`
        id,
        name,
        hex_code,
        car_id,
        cars!inner(id, name, brand)
      `)
      .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed')
      .limit(limit);

    if (queryError) {
      console.error('Query error:', queryError.message);
      return;
    }

    console.log(`Found ${colorsToSync?.length || 0} colors to generate`);

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
        color.name,
        color.hex_code || '#FFFFFF'
      );

      if (result.success) {
        successCount++;
        console.log(`✓ Generated: ${car.brand} ${car.name} - ${color.name}`);
      } else {
        failCount++;
        console.log(`✗ Failed: ${car.brand} ${car.name} - ${color.name}: ${result.error}`);
      }

      // Delay between generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: GenerateImageRequest = await req.json();

    if (body.batchMode && body.async) {
      const limit = body.limit || 5;
      
      // Start background processing
      EdgeRuntime.waitUntil(processBatchInBackground(supabase, limit));
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Background AI image generation started for up to ${limit} images. Check logs for progress.`,
          async: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.carId && body.colorId) {
      // Single color mode
      const { data: colorData, error: colorError } = await supabase
        .from('car_colors')
        .select(`
          id, name, hex_code, car_id,
          cars!inner(id, name, brand)
        `)
        .eq('id', body.colorId)
        .single();

      if (colorError || !colorData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Color not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const car = colorData.cars as any;
      const result = await processCarColor(
        supabase,
        colorData.car_id,
        colorData.id,
        car.brand,
        car.name,
        colorData.name,
        colorData.hex_code || '#FFFFFF'
      );

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.batchMode) {
      // Synchronous batch mode
      const limit = body.limit || 3;
      
      const { data: colorsToSync, error: queryError } = await supabase
        .from('car_colors')
        .select(`
          id, name, hex_code, car_id,
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

      const results = [];
      for (const color of colorsToSync || []) {
        const car = color.cars as any;
        const result = await processCarColor(
          supabase,
          color.car_id,
          color.id,
          car.brand,
          car.name,
          color.name,
          color.hex_code || '#FFFFFF'
        );
        results.push({
          carName: `${car.brand} ${car.name}`,
          colorName: color.name,
          ...result
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          },
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Please provide carId+colorId or enable batchMode'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-car-images:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
