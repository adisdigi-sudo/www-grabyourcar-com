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

// Car model specifications for accurate image generation
const carModelSpecs: Record<string, string> = {
  'MG Hector': 'MG Hector SUV, muscular body, bold chrome grille, LED projector headlamps, 5-seater mid-size SUV, panoramic sunroof',
  'MG Hector Plus': 'MG Hector Plus 6/7-seater SUV, three-row seating, bold front grille, LED headlamps',
  'MG Astor': 'MG Astor compact SUV, split LED headlamps, sleek design, AI-powered features',
  'MG Comet EV': 'MG Comet EV micro electric car, compact city car, cute rounded design, small hatchback',
  'Maserati Ghibli': 'Maserati Ghibli luxury sedan, Italian sports sedan, trident grille, aggressive styling',
  'Maserati Levante': 'Maserati Levante luxury SUV, Italian design, sporty stance, premium SUV',
  'Maserati Quattroporte': 'Maserati Quattroporte flagship sedan, elegant Italian design, long wheelbase',
  'Maserati GranTurismo': 'Maserati GranTurismo grand tourer, Italian coupe, sporty GT design',
  'Ferrari F8 Tributo': 'Ferrari F8 Tributo supercar, mid-engine V8, aggressive aero design, Italian supercar',
  'Ferrari Roma': 'Ferrari Roma grand tourer, elegant coupe, front-engine V8, classic Ferrari design',
  'Ferrari Purosangue': 'Ferrari Purosangue SUV, first Ferrari 4-door, prancing horse luxury SUV',
  'Ferrari SF90 Stradale': 'Ferrari SF90 Stradale hybrid supercar, extreme aero, plug-in hybrid hypercar',
  'Lamborghini Urus': 'Lamborghini Urus super SUV, aggressive Y-shaped design, Italian styling',
  'Lamborghini Huracan': 'Lamborghini Huracan supercar, mid-engine V10, sharp angular design',
  'Lamborghini Revuelto': 'Lamborghini Revuelto hybrid supercar, V12 plug-in hybrid, extreme design',
  'Rolls-Royce Ghost': 'Rolls-Royce Ghost luxury sedan, iconic Spirit of Ecstasy, British ultra-luxury',
  'Rolls-Royce Phantom': 'Rolls-Royce Phantom flagship, pinnacle of luxury, majestic presence',
  'Rolls-Royce Cullinan': 'Rolls-Royce Cullinan luxury SUV, first Rolls-Royce SUV, commanding presence',
  'Bentley Continental GT': 'Bentley Continental GT grand tourer, powerful British coupe, elegant design',
  'Bentley Bentayga': 'Bentley Bentayga luxury SUV, British craftsmanship, premium SUV design',
  'Bentley Flying Spur': 'Bentley Flying Spur luxury sedan, four-door grand tourer, British elegance',
  'Porsche 911': 'Porsche 911 sports car, iconic rear-engine design, German engineering',
  'Porsche Cayenne': 'Porsche Cayenne luxury SUV, sporty SUV design, German performance',
  'Porsche Taycan': 'Porsche Taycan electric sports car, futuristic design, electric Porsche',
  'Porsche Macan': 'Porsche Macan compact SUV, sporty crossover, Porsche design language',
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

  // Get specific car description or use generic
  const carKey = `${brand} ${model}`.replace('MG MG', 'MG');
  const carSpecs = carModelSpecs[model] || carModelSpecs[carKey] || `${brand} ${model} car`;

  const prompt = `Ultra-realistic professional automotive photography of a ${brand} ${model} car.
Car specifications: ${carSpecs}
Exact color: ${colorName} (${colorHex})
Requirements:
- Front 3/4 angle view showing the car's front and side profile
- Studio showroom environment with gradient white/light gray background
- Professional automotive lighting highlighting the car's design lines
- The car body MUST be painted in the exact ${colorName} color matching hex code ${colorHex}
- Sharp, high-resolution, 8K quality photograph
- Clean, dealership-quality product shot
- Indian market variant with right-hand drive if interior visible
- No text, watermarks, or logos overlaid on image`;

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

// Priority brands for image generation
const PRIORITY_BRANDS = ['Maserati', 'Ferrari', 'Lamborghini', 'Rolls-Royce', 'Bentley', 'Porsche', 'MG', 'Maruti Suzuki', 'Hyundai', 'Tata'];

// Background processing function
async function processBatchInBackground(
  supabase: ReturnType<typeof createClient>,
  limit: number
): Promise<void> {
  console.log(`Starting background AI image generation - limit: ${limit}`);
  
  try {
    // First, prioritize luxury brands and important cars
    const { data: priorityColors, error: priorityError } = await supabase
      .from('car_colors')
      .select(`
        id,
        name,
        hex_code,
        car_id,
        cars!inner(id, name, brand)
      `)
      .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed,image_sync_status.eq.not_found')
      .in('cars.brand', PRIORITY_BRANDS)
      .limit(Math.ceil(limit * 0.7)); // 70% for priority brands

    // Then get other pending colors
    const { data: otherColors, error: otherError } = await supabase
      .from('car_colors')
      .select(`
        id,
        name,
        hex_code,
        car_id,
        cars!inner(id, name, brand)
      `)
      .or('image_url.is.null,image_sync_status.eq.pending,image_sync_status.eq.failed')
      .not('cars.brand', 'in', `(${PRIORITY_BRANDS.map(b => `"${b}"`).join(',')})`)
      .limit(Math.ceil(limit * 0.3)); // 30% for others

    const colorsToSync = [...(priorityColors || []), ...(otherColors || [])].slice(0, limit);
    
    if (priorityError || otherError) {
      console.error('Query error:', priorityError?.message || otherError?.message);
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
