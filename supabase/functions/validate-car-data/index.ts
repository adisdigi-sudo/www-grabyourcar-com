import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CarRecord {
  id: string;
  name: string;
  brand: string;
  price_range: string;
  price_numeric: number;
  updated_at: string;
  data_freshness_score: number;
  last_verified_at: string | null;
  is_upcoming: boolean;
  launch_date: string | null;
}

interface ValidationResult {
  carId: string;
  carName: string;
  issues: string[];
  freshnessScore: number;
  needsUpdate: boolean;
}

// Calculate data freshness score based on multiple factors
function calculateFreshnessScore(car: CarRecord): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;
  
  const now = new Date();
  const updatedAt = new Date(car.updated_at);
  const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Deduct points for stale data
  if (daysSinceUpdate > 90) {
    score -= 40;
    issues.push(`Data is ${daysSinceUpdate} days old (over 90 days)`);
  } else if (daysSinceUpdate > 60) {
    score -= 25;
    issues.push(`Data is ${daysSinceUpdate} days old (over 60 days)`);
  } else if (daysSinceUpdate > 30) {
    score -= 10;
    issues.push(`Data is ${daysSinceUpdate} days old (over 30 days)`);
  }
  
  // Check for missing price
  if (!car.price_numeric || car.price_numeric === 0) {
    score -= 20;
    issues.push('Missing numeric price');
  }
  
  // Check for upcoming cars with past launch dates
  if (car.is_upcoming && car.launch_date) {
    const launchDate = new Date(car.launch_date);
    if (launchDate < now) {
      score -= 30;
      issues.push(`Upcoming car has past launch date: ${car.launch_date}`);
    }
  }
  
  // Never verified
  if (!car.last_verified_at) {
    score -= 15;
    issues.push('Never manually verified');
  }
  
  return { score: Math.max(0, score), issues };
}

// Check for potential price changes (simplified - in production, would compare with external data)
function detectPotentialPriceIssues(car: CarRecord): string[] {
  const issues: string[] = [];
  
  // Flag cars with unusually round prices that might need verification
  if (car.price_numeric && car.price_numeric % 100000 === 0) {
    issues.push('Price is a round number - may need verification');
  }
  
  // Flag very low or very high prices
  if (car.price_numeric && car.price_numeric < 300000) {
    issues.push('Price seems too low for a new car');
  }
  
  if (car.price_numeric && car.price_numeric > 50000000) {
    issues.push('Price is very high - verify for accuracy');
  }
  
  return issues;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, carId } = await req.json().catch(() => ({ action: 'validate-all' }));
    
    console.log(`Validation action: ${action}, carId: ${carId}`);
    
    if (action === 'validate-single' && carId) {
      // Validate a single car
      const { data: car, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', carId)
        .single();
      
      if (error || !car) {
        throw new Error(`Car not found: ${carId}`);
      }
      
      const { score, issues } = calculateFreshnessScore(car as CarRecord);
      const priceIssues = detectPotentialPriceIssues(car as CarRecord);
      const allIssues = [...issues, ...priceIssues];
      
      // Update the car's freshness score
      await supabase
        .from('cars')
        .update({ data_freshness_score: score })
        .eq('id', carId);
      
      const result: ValidationResult = {
        carId: car.id,
        carName: car.name,
        issues: allIssues,
        freshnessScore: score,
        needsUpdate: score < 70 || allIssues.length > 0,
      };
      
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate all cars
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select('*')
      .order('updated_at', { ascending: true });
    
    if (carsError) {
      throw new Error(`Failed to fetch cars: ${carsError.message}`);
    }
    
    console.log(`Validating ${cars?.length || 0} cars`);
    
    const results: ValidationResult[] = [];
    const updates: { id: string; data_freshness_score: number }[] = [];
    
    for (const car of (cars || []) as CarRecord[]) {
      const { score, issues } = calculateFreshnessScore(car);
      const priceIssues = detectPotentialPriceIssues(car);
      const allIssues = [...issues, ...priceIssues];
      
      updates.push({ id: car.id, data_freshness_score: score });
      
      if (score < 70 || allIssues.length > 0) {
        results.push({
          carId: car.id,
          carName: car.name,
          issues: allIssues,
          freshnessScore: score,
          needsUpdate: true,
        });
      }
    }
    
    // Batch update freshness scores
    for (const update of updates) {
      await supabase
        .from('cars')
        .update({ data_freshness_score: update.data_freshness_score })
        .eq('id', update.id);
    }
    
    // Sort by freshness score (lowest first)
    results.sort((a, b) => a.freshnessScore - b.freshnessScore);
    
    const summary = {
      totalCars: cars?.length || 0,
      carsNeedingUpdate: results.length,
      averageFreshnessScore: updates.length > 0 
        ? Math.round(updates.reduce((sum, u) => sum + u.data_freshness_score, 0) / updates.length)
        : 0,
      criticalIssues: results.filter(r => r.freshnessScore < 50).length,
    };
    
    console.log(`Validation complete: ${summary.carsNeedingUpdate}/${summary.totalCars} cars need updates`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      results: results.slice(0, 20), // Return top 20 issues
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
