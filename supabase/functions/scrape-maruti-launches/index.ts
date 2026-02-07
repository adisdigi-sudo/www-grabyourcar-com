import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpcomingCarData {
  name: string;
  brand: string;
  slug: string;
  bodyType?: string;
  launchDate?: string;
  expectedPrice?: string;
  highlights?: string[];
  imageUrl?: string;
  isUpcoming: boolean;
}

// Parse launch date to standardized format
function parseLaunchDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  
  // Handle formats like "Q1 2025", "Q2 2025", etc.
  const quarterMatch = dateStr.match(/Q[1-4]\s*2025/i) || dateStr.match(/Q[1-4]\s*2026/i);
  if (quarterMatch) return quarterMatch[0];
  
  // Handle formats like "2025", "2026"
  const yearMatch = dateStr.match(/202[5-9]/);
  if (yearMatch) return yearMatch[0];
  
  // Handle formats like "January 2025", "Feb 2025"
  const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* 202[5-9]/i);
  if (monthMatch) return monthMatch[0];
  
  return dateStr;
}

// Extract upcoming car data from HTML/Markdown
function extractUpcomingCars(content: string): UpcomingCarData[] {
  const cars: UpcomingCarData[] = [];
  
  // Look for upcoming launches sections
  const upcomingPatterns = [
    /upcoming\s+(?:launches?|cars?|models?)[:\s]*([\s\S]*?)(?=\n\n|$)/gi,
    /launch.*?(?:date|expected|soon)[:\s]*([\s\S]*?)(?=\n\n|$)/gi,
    /new\s+launches?[:\s]*([\s\S]*?)(?=\n\n|$)/gi,
  ];

  // Common upcoming Maruti models
  const upcomingModels = [
    { name: 'Maruti Grand Vitara', bodyType: 'SUV', expectedPrice: '₹ 10-18 Lakh' },
    { name: 'Maruti Fronx', bodyType: 'SUV', expectedPrice: '₹ 7-11 Lakh' },
    { name: 'Maruti Jimny', bodyType: 'SUV', expectedPrice: '₹ 12-15 Lakh' },
    { name: 'Maruti XL6', bodyType: 'MPV', expectedPrice: '₹ 9-13 Lakh' },
    { name: 'Maruti Invicto', bodyType: 'MPV', expectedPrice: '₹ 13-18 Lakh' },
  ];

  // Look for mentioned models in content
  upcomingModels.forEach(model => {
    if (content.toLowerCase().includes(model.name.toLowerCase())) {
      // Try to find launch date
      const modelPattern = new RegExp(
        `${model.name}.*?(?:launch|available|coming|expected)[:\\s]+(.*?)(?:\\.|,|\\n)`,
        'i'
      );
      const match = content.match(modelPattern);
      
      const launchDate = match ? parseLaunchDate(match[1]) : undefined;
      
      cars.push({
        name: model.name,
        brand: 'Maruti Suzuki',
        slug: `maruti-${model.name.toLowerCase().replace(/\s+/g, '-')}`,
        bodyType: model.bodyType,
        expectedPrice: model.expectedPrice,
        launchDate,
        highlights: ['Upcoming Launch', 'New Model'],
        isUpcoming: true,
      });
    }
  });

  return cars;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping Maruti Suzuki upcoming launches...');

    // Scrape the Maruti homepage for upcoming launches
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.marutisuzuki.com/',
        formats: ['markdown', 'html'],
        onlyMainContent: false,
        waitFor: 5000,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Firecrawl error: ${scrapeResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const markdown = scrapeData.data?.markdown || '';
    const html = scrapeData.data?.html || '';
    
    console.log(`Scraped ${markdown.length} chars of markdown`);

    // Extract upcoming cars
    const upcomingCars = extractUpcomingCars(markdown + '\n' + html);
    
    // Insert upcoming cars into database
    let insertedCount = 0;
    for (const car of upcomingCars) {
      try {
        const { data, error } = await supabase
          .from('cars')
          .insert({
            name: car.name,
            brand: car.brand,
            slug: car.slug,
            body_type: car.bodyType,
            is_upcoming: true,
            launch_date: car.launchDate,
            expected_price_min: car.expectedPrice ? parseInt(car.expectedPrice.split('-')[0].replace(/[₹,\s]/g, '')) * 100000 : null,
            key_highlights: car.highlights,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (!error) {
          insertedCount++;
          console.log(`✓ Inserted: ${car.name}`);
        } else {
          console.error(`Error inserting ${car.name}:`, error);
        }
      } catch (err) {
        console.error(`Exception inserting ${car.name}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        upcomingCarsFound: upcomingCars.length,
        upcomingCarsInserted: insertedCount,
        cars: upcomingCars,
        message: `Found and inserted ${insertedCount} upcoming Maruti Suzuki launches`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
