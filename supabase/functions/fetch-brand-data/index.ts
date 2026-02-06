import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brand, dataType, saveToDatabase = true } = await req.json();
    
    if (!brand) {
      throw new Error('Brand is required');
    }

    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY_1') || Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityKey) {
      throw new Error('Perplexity API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[FetchBrandData] Fetching ${dataType || 'full'} data for brand: ${brand}`);

    // Build comprehensive prompt for full car data
    const prompt = `List the top 5 best-selling ${brand} car models in India February 2025.

Return a JSON object with this structure:
{"cars":[
{"name":"Swift","brand":"${brand}","body_type":"Hatchback","tagline":"Play Bold","price_range":"₹6.49 - ₹9.64 Lakh","price_numeric":649000,"fuel_types":["Petrol","CNG"],"transmission_types":["Manual","AMT"],"is_new":false,"is_bestseller":true,"overview":"India's most loved premium hatchback.","key_highlights":["Bold design","SmartPlay Pro+"],
"variants":[{"name":"LXi","price":"₹6.49 Lakh","price_numeric":649000,"fuel_type":"Petrol","transmission":"Manual"},{"name":"ZXi+","price":"₹9.64 Lakh","price_numeric":964000,"fuel_type":"Petrol","transmission":"AMT"}],
"colors":[{"name":"Solid Fire Red","hex_code":"#C41E3A"},{"name":"Pearl Arctic White","hex_code":"#FAFAFA"}],
"specifications":[{"category":"Engine","label":"Displacement","value":"1197 cc"},{"category":"Engine","label":"Power","value":"82 bhp"},{"category":"Dimensions","label":"Length","value":"3860 mm"}],
"features":[{"category":"Safety","feature_name":"6 Airbags"},{"category":"Infotainment","feature_name":"9-inch Touchscreen"}]}
]}

Include at least 3 variants, 3 colors, 5 specifications, and 5 features for EACH car.
Prices must be accurate February 2025 ex-showroom Delhi prices.
Return ONLY valid JSON, no markdown.`;

    console.log(`[FetchBrandData] Sending prompt to Perplexity...`);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are an automotive data specialist. Provide accurate, complete data for Indian car market. 
            Always use official manufacturer websites as primary source.
            Prices must be current 2025 ex-showroom Delhi prices.
            Return data as valid JSON only, no markdown formatting.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FetchBrandData] Perplexity error:', errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log(`[FetchBrandData] Received response with ${citations.length} citations`);

    // Parse JSON from response
    let parsedData = null;
    try {
      let jsonStr = content;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      parsedData = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('[FetchBrandData] JSON parse error:', e);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse AI response as JSON',
        rawContent: content
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save to database if requested
    const savedCars: any[] = [];
    const errors: string[] = [];

    if (saveToDatabase && parsedData?.cars) {
      console.log(`[FetchBrandData] Saving ${parsedData.cars.length} cars to database...`);

      for (const car of parsedData.cars) {
        try {
          const slug = `${brand.toLowerCase().replace(/\s+/g, '-')}-${car.name.toLowerCase().replace(/\s+/g, '-')}`;
          
          // Check if car exists
          const { data: existingCar } = await supabase
            .from('cars')
            .select('id')
            .eq('slug', slug)
            .single();

          let carId: string;

          if (existingCar) {
            // Update existing car
            const { error: updateError } = await supabase
              .from('cars')
              .update({
                name: car.name,
                brand: brand,
                body_type: car.body_type,
                tagline: car.tagline,
                price_range: car.price_range,
                price_numeric: car.price_numeric,
                fuel_types: car.fuel_types,
                transmission_types: car.transmission_types,
                is_new: car.is_new || false,
                is_bestseller: car.is_bestseller || false,
                overview: car.overview,
                key_highlights: car.key_highlights,
                updated_at: new Date().toISOString(),
                last_verified_at: new Date().toISOString(),
              })
              .eq('id', existingCar.id);

            if (updateError) throw updateError;
            carId = existingCar.id;
            console.log(`[FetchBrandData] Updated car: ${car.name}`);
          } else {
            // Insert new car
            const { data: newCar, error: insertError } = await supabase
              .from('cars')
              .insert({
                name: car.name,
                brand: brand,
                slug: slug,
                body_type: car.body_type,
                tagline: car.tagline,
                price_range: car.price_range,
                price_numeric: car.price_numeric,
                fuel_types: car.fuel_types,
                transmission_types: car.transmission_types,
                is_new: car.is_new || false,
                is_bestseller: car.is_bestseller || false,
                overview: car.overview,
                key_highlights: car.key_highlights,
                last_verified_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (insertError) throw insertError;
            carId = newCar.id;
            console.log(`[FetchBrandData] Inserted new car: ${car.name}`);
          }

          // Delete existing related data for fresh insert
          await supabase.from('car_variants').delete().eq('car_id', carId);
          await supabase.from('car_colors').delete().eq('car_id', carId);
          await supabase.from('car_specifications').delete().eq('car_id', carId);
          await supabase.from('car_features').delete().eq('car_id', carId);

          // Insert variants
          if (car.variants?.length) {
            const variants = car.variants.map((v: any, idx: number) => ({
              car_id: carId,
              name: v.name,
              price: v.price,
              price_numeric: v.price_numeric,
              fuel_type: v.fuel_type,
              transmission: v.transmission,
              features: v.features || [],
              sort_order: idx,
            }));
            
            const { error: variantError } = await supabase
              .from('car_variants')
              .insert(variants);
            
            if (variantError) console.error(`Variant insert error for ${car.name}:`, variantError);
          }

          // Insert colors
          if (car.colors?.length) {
            const colors = car.colors.map((c: any, idx: number) => ({
              car_id: carId,
              name: c.name,
              hex_code: c.hex_code || '#CCCCCC',
              sort_order: idx,
            }));
            
            const { error: colorError } = await supabase
              .from('car_colors')
              .insert(colors);
            
            if (colorError) console.error(`Color insert error for ${car.name}:`, colorError);
          }

          // Insert specifications
          if (car.specifications?.length) {
            const specs = car.specifications.map((s: any, idx: number) => ({
              car_id: carId,
              category: s.category,
              label: s.label,
              value: s.value,
              sort_order: idx,
            }));
            
            const { error: specError } = await supabase
              .from('car_specifications')
              .insert(specs);
            
            if (specError) console.error(`Spec insert error for ${car.name}:`, specError);
          }

          // Insert features
          if (car.features?.length) {
            const features = car.features.map((f: any, idx: number) => ({
              car_id: carId,
              category: f.category,
              feature_name: f.feature_name,
              is_standard: true,
              sort_order: idx,
            }));
            
            const { error: featureError } = await supabase
              .from('car_features')
              .insert(features);
            
            if (featureError) console.error(`Feature insert error for ${car.name}:`, featureError);
          }

          savedCars.push({
            id: carId,
            name: car.name,
            slug: slug,
            variants_count: car.variants?.length || 0,
            colors_count: car.colors?.length || 0,
          });

        } catch (carError: any) {
          console.error(`[FetchBrandData] Error saving ${car.name}:`, carError);
          errors.push(`${car.name}: ${carError.message}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      brand,
      dataType: dataType || 'full',
      data: parsedData,
      savedToDatabase: saveToDatabase,
      savedCars,
      errors: errors.length ? errors : undefined,
      citations,
      fetchedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[FetchBrandData] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
