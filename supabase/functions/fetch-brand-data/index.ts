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
    const { brand, dataType } = await req.json();
    
    if (!brand) {
      throw new Error('Brand is required');
    }

    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityKey) {
      throw new Error('Perplexity API key not configured');
    }

    console.log(`[FetchBrandData] Fetching ${dataType || 'all'} data for brand: ${brand}`);

    // Build the prompt based on data type
    let prompt = '';
    
    if (dataType === 'cars_list') {
      prompt = `List ALL current Maruti Suzuki car models available for sale in India in 2025. 
      For each car provide:
      - Model name
      - Body type (Hatchback/Sedan/SUV/MPV/MUV)
      - Starting ex-showroom price in Delhi (in Lakhs)
      - Fuel types available (Petrol/Diesel/CNG/Hybrid)
      - Transmission options (Manual/AMT/CVT/Automatic)
      - Is it new launch in last 6 months?
      
      Format as JSON array. Be accurate with 2025 prices from marutisuzuki.com`;
    } else if (dataType === 'variants') {
      prompt = `List ALL variants with prices for ${brand} cars currently sold in India.
      For each model, list every variant with:
      - Car model name
      - Variant name (like LXi, VXi, ZXi, etc.)
      - Ex-showroom price Delhi in INR (exact number)
      - Fuel type
      - Transmission type
      
      Get data from official ${brand.toLowerCase().replace(' ', '')}.com website.
      Format as JSON. Include ALL variants, not just base variants.`;
    } else if (dataType === 'colors') {
      prompt = `List all color options available for each ${brand} car model in India 2025.
      For each model provide:
      - Model name
      - Array of colors with: color name, approximate hex code
      
      Get accurate colors from official website. Format as JSON.`;
    } else if (dataType === 'specifications') {
      prompt = `Provide detailed specifications for all ${brand} car models in India.
      For each model include:
      - Engine specs: displacement, power (bhp), torque (Nm), cylinders
      - Dimensions: length, width, height, wheelbase, ground clearance (all in mm)
      - Performance: mileage (kmpl), top speed, 0-100 time
      - Safety: airbags count, ABS, ESC, ISOFIX, NCAP rating
      
      Get accurate 2025 data from official sources. Format as JSON.`;
    } else {
      // Full data fetch
      prompt = `Provide COMPLETE and ACCURATE data for ALL ${brand} car models currently sold in India in 2025.

For each car model, provide:

1. BASIC INFO:
- name: Full model name
- bodyType: Hatchback/Sedan/Compact SUV/Mid-Size SUV/MPV/MUV
- tagline: Marketing tagline
- priceRange: "₹X.XX - ₹X.XX Lakh"
- startingPrice: Numeric starting price in INR
- fuelTypes: Array of available fuels
- transmissions: Array of transmission types
- isNew: true if launched in last 6 months
- isUpcoming: false (only current models)

2. VARIANTS (ALL variants, not just examples):
Each variant must have:
- name: Variant name (LXi, VXi, ZXi, etc.)
- price: "₹X.XX Lakh" format
- priceNumeric: Exact ex-showroom Delhi price in INR
- fuelType: Petrol/Diesel/CNG
- transmission: Manual/AMT/CVT/AT

3. COLORS:
- name: Official color name
- hex: Approximate hex code

4. SPECIFICATIONS:
Engine: displacement, power, torque, cylinders
Dimensions: length, width, height, wheelbase, ground_clearance (mm)
Performance: mileage_city, mileage_highway, top_speed
Safety: airbags, abs, esc, isofix, ncap_rating

Get ALL data from official ${brand.toLowerCase().replace(/\s/g, '')}.com website.
Format response as valid JSON array of car objects.
Include EVERY model and EVERY variant - this is for a complete database.`;
    }

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
        max_tokens: 8000,
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

    // Try to extract JSON from the response
    let parsedData = null;
    try {
      // Remove markdown code blocks if present
      let jsonStr = content;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      parsedData = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.log('[FetchBrandData] Could not parse as JSON, returning raw content');
    }

    return new Response(JSON.stringify({
      success: true,
      brand,
      dataType: dataType || 'full',
      data: parsedData,
      rawContent: parsedData ? null : content,
      citations,
      fetchedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
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
