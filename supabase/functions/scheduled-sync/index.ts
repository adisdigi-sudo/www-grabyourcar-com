import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SyncResult {
  carsProcessed: number;
  carsEnhanced: number;
  errors: string[];
}

interface CarRecord {
  id: string;
  name: string;
  brand: string;
  body_type: string | null;
  overview: string | null;
  tagline: string | null;
  key_highlights: string[] | null;
  updated_at: string;
}

// Lovable AI Gateway endpoint
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

async function enhanceCarWithAI(
  car: CarRecord,
  enhanceType: 'overview' | 'highlights' | 'tagline'
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return { success: false, error: 'Missing LOVABLE_API_KEY' };
    }

    let prompt = '';
    switch (enhanceType) {
      case 'overview':
        prompt = `Write a compelling 100-150 word overview for the ${car.brand} ${car.name}. It's a ${car.body_type || 'car'}. Focus on key features, target audience, and value proposition. Write in third person, present tense. Do not use markdown.`;
        break;
      case 'highlights':
        prompt = `Generate 5 key selling points for the ${car.brand} ${car.name} (${car.body_type || 'car'}). Return as a JSON array of strings. Example: ["Feature 1", "Feature 2"]. Only return the JSON array, nothing else.`;
        break;
      case 'tagline':
        prompt = `Create a catchy 3-6 word marketing tagline for the ${car.brand} ${car.name}. Just return the tagline text, no quotes or explanation.`;
        break;
    }

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'google/gemini-2.5-flash',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error for ${car.name}:`, errorText);
      return { success: false, error: `AI API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.text || '';

    return { success: true, content: content.trim() };
  } catch (error) {
    console.error(`AI enhancement error for ${car.name}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// deno-lint-ignore no-explicit-any
async function runSync(
  supabase: any,
  syncType: 'scheduled' | 'manual',
  options: { enhanceStale?: boolean; staleDays?: number } = {}
): Promise<SyncResult> {
  const { enhanceStale = true, staleDays = 30 } = options;
  const result: SyncResult = { carsProcessed: 0, carsEnhanced: 0, errors: [] };

  try {
    // Get all cars
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('id, name, brand, body_type, overview, tagline, key_highlights, updated_at')
      .order('updated_at', { ascending: true });

    if (carsError) {
      result.errors.push(`Failed to fetch cars: ${carsError.message}`);
      return result;
    }

    if (!cars || cars.length === 0) {
      console.log('No cars found in database');
      return result;
    }

    const typedCars = cars as CarRecord[];
    result.carsProcessed = typedCars.length;
    console.log(`Processing ${typedCars.length} cars...`);

    // Find cars that need enhancement (missing data or stale)
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    for (const car of typedCars) {
      const needsOverview = !car.overview || car.overview.length < 50;
      const needsTagline = !car.tagline || car.tagline.length < 5;
      const needsHighlights = !car.key_highlights || car.key_highlights.length < 3;
      const isStale = enhanceStale && new Date(car.updated_at) < staleDate;

      // Skip if car is complete and not stale
      if (!needsOverview && !needsTagline && !needsHighlights && !isStale) {
        continue;
      }

      console.log(`Enhancing ${car.brand} ${car.name}...`);
      let enhanced = false;

      // Enhance overview if needed
      if (needsOverview || isStale) {
        const overviewResult = await enhanceCarWithAI(car, 'overview');
        if (overviewResult.success && overviewResult.content) {
          const { error: updateError } = await supabase
            .from('cars')
            .update({ 
              overview: overviewResult.content,
              updated_at: new Date().toISOString()
            })
            .eq('id', car.id);

          if (updateError) {
            result.errors.push(`${car.name}: Failed to update overview`);
          } else {
            enhanced = true;
            console.log(`  ✓ Updated overview for ${car.name}`);
          }
        }
      }

      // Enhance tagline if needed
      if (needsTagline) {
        const taglineResult = await enhanceCarWithAI(car, 'tagline');
        if (taglineResult.success && taglineResult.content) {
          const { error: updateError } = await supabase
            .from('cars')
            .update({ 
              tagline: taglineResult.content,
              updated_at: new Date().toISOString()
            })
            .eq('id', car.id);

          if (updateError) {
            result.errors.push(`${car.name}: Failed to update tagline`);
          } else {
            enhanced = true;
            console.log(`  ✓ Updated tagline for ${car.name}`);
          }
        }
      }

      // Enhance highlights if needed
      if (needsHighlights) {
        const highlightsResult = await enhanceCarWithAI(car, 'highlights');
        if (highlightsResult.success && highlightsResult.content) {
          try {
            const highlights = JSON.parse(highlightsResult.content);
            if (Array.isArray(highlights)) {
              const { error: updateError } = await supabase
                .from('cars')
                .update({ 
                  key_highlights: highlights,
                  updated_at: new Date().toISOString()
                })
                .eq('id', car.id);

              if (updateError) {
                result.errors.push(`${car.name}: Failed to update highlights`);
              } else {
                enhanced = true;
                console.log(`  ✓ Updated highlights for ${car.name}`);
              }
            }
          } catch {
            result.errors.push(`${car.name}: Failed to parse highlights JSON`);
          }
        }
      }

      if (enhanced) {
        result.carsEnhanced++;
      }

      // Rate limit to avoid overwhelming the AI API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    result.errors.push(errorMessage);
    console.error('Sync error:', error);
    return result;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for options
    let syncType: 'scheduled' | 'manual' = 'scheduled';
    let options = { enhanceStale: true, staleDays: 30 };

    try {
      const body = await req.json();
      syncType = body.syncType || 'scheduled';
      options = { ...options, ...body.options };
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log(`Starting ${syncType} sync...`);

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: syncType,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to create sync log:', logError);
    }

    // Run the sync
    const result = await runSync(supabase, syncType, options);

    // Update sync log with results
    if (syncLog?.id) {
      await supabase
        .from('sync_logs')
        .update({
          status: result.errors.length > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString(),
          cars_processed: result.carsProcessed,
          cars_enhanced: result.carsEnhanced,
          errors: result.errors,
          metadata: { options }
        })
        .eq('id', syncLog.id);
    }

    console.log(`Sync complete: ${result.carsEnhanced}/${result.carsProcessed} cars enhanced`);

    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLog?.id,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduled sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
