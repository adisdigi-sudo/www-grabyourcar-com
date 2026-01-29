import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { carId, enhanceType } = await req.json();

    if (!carId) {
      return new Response(
        JSON.stringify({ success: false, error: 'carId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch car data
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return new Response(
        JSON.stringify({ success: false, error: 'Car not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch specifications
    const { data: specs } = await supabase
      .from('car_specifications')
      .select('*')
      .eq('car_id', carId)
      .order('category')
      .order('sort_order');

    // Fetch variants
    const { data: variants } = await supabase
      .from('car_variants')
      .select('*')
      .eq('car_id', carId)
      .order('sort_order');

    // Build context for AI
    const carContext = `
Car: ${car.name}
Brand: ${car.brand}
Body Type: ${car.body_type}
Price Range: ${car.price_range}
Current Overview: ${car.overview || 'None'}
Key Highlights: ${car.key_highlights?.join(', ') || 'None'}
Fuel Types: ${car.fuel_types?.join(', ') || 'Unknown'}
Transmission: ${car.transmission_types?.join(', ') || 'Unknown'}
Specifications: ${specs?.map(s => `${s.category} - ${s.label}: ${s.value}`).join('; ') || 'None'}
Variants: ${variants?.map(v => `${v.name} at ${v.price}`).join(', ') || 'None'}
Pros: ${car.pros?.join(', ') || 'None'}
Cons: ${car.cons?.join(', ') || 'None'}
    `.trim();

    let prompt = '';
    let updateField = '';

    switch (enhanceType) {
      case 'overview':
        prompt = `You are an automotive expert writing for an Indian car marketplace. Write a compelling, SEO-friendly overview (150-200 words) for this car that highlights its key features, target audience, and value proposition. Be factual and engaging. Do not include any markdown formatting or special characters.

${carContext}

Write only the overview text, nothing else.`;
        updateField = 'overview';
        break;

      case 'highlights':
        prompt = `You are an automotive expert. Based on the car specifications and features, generate 5-6 key highlights that would appeal to Indian car buyers. Focus on unique selling points, safety features, efficiency, and value. Return ONLY a JSON array of strings.

${carContext}

Return format: ["highlight 1", "highlight 2", ...]`;
        updateField = 'key_highlights';
        break;

      case 'pros_cons':
        prompt = `You are an automotive expert. Based on the car specifications, generate balanced pros and cons for Indian buyers. Consider value for money, features, build quality, after-sales service, and competition. Return ONLY a JSON object with "pros" and "cons" arrays.

${carContext}

Return format: {"pros": ["pro 1", "pro 2", ...], "cons": ["con 1", "con 2", ...]}`;
        updateField = 'pros_cons';
        break;

      case 'tagline':
        prompt = `You are an advertising copywriter. Create a short, catchy tagline (3-6 words) for this car that captures its essence and appeals to Indian buyers. Return ONLY the tagline text.

${carContext}`;
        updateField = 'tagline';
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid enhanceType. Use: overview, highlights, pros_cons, tagline' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Enhancing ${car.name} - ${enhanceType}`);

    // Call Lovable AI
    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI enhancement failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content?.trim();

    if (!generatedContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generated content:', generatedContent);

    // Parse and update based on type
    let updateData: Record<string, unknown> = {};

    if (updateField === 'key_highlights') {
      try {
        const highlights = JSON.parse(generatedContent);
        updateData = { key_highlights: highlights };
      } catch {
        // Try to extract array from text
        const matches = generatedContent.match(/\[[\s\S]*\]/);
        if (matches) {
          updateData = { key_highlights: JSON.parse(matches[0]) };
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to parse highlights' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (updateField === 'pros_cons') {
      try {
        const parsed = JSON.parse(generatedContent);
        updateData = { pros: parsed.pros, cons: parsed.cons };
      } catch {
        const matches = generatedContent.match(/\{[\s\S]*\}/);
        if (matches) {
          const parsed = JSON.parse(matches[0]);
          updateData = { pros: parsed.pros, cons: parsed.cons };
        } else {
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to parse pros/cons' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      updateData = { [updateField]: generatedContent };
    }

    // Update the car record
    const { error: updateError } = await supabase
      .from('cars')
      .update(updateData)
      .eq('id', carId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update car' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully enhanced ${car.name} - ${enhanceType}`);

    return new Response(
      JSON.stringify({
        success: true,
        carId,
        enhanceType,
        generatedContent: updateData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Enhancement error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Enhancement failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
