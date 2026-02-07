import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

interface CarData {
  name: string;
  brand: string;
  slug: string;
  bodyType: string;
  fuelTypes: string[];
  transmissionTypes: string[];
  priceRange: string;
  tagline: string;
  overview: string;
  keyHighlights: string[];
  variants: Array<{
    name: string;
    price: string;
    priceNumeric: number;
    fuelType: string;
    transmission: string;
  }>;
  specifications: Array<{
    category: string;
    label: string;
    value: string;
  }>;
  images: string[];
}

// Parse price string to numeric
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[₹,\s]/g, '').replace('Lakh', '').replace('lakh', '').trim();
  const num = parseFloat(cleaned);
  if (priceStr.toLowerCase().includes('lakh')) {
    return Math.round(num * 100000);
  }
  return Math.round(num);
}

// Extract car data from Maruti page HTML/Markdown
function extractMarutiCarData(content: string, carName: string, url: string): Partial<CarData> {
  const data: Partial<CarData> = {
    name: carName,
    brand: 'Maruti Suzuki',
    slug: `maruti-${carName.toLowerCase().replace(/\s+/g, '-')}`,
    variants: [],
    specifications: [],
    keyHighlights: [],
    images: [],
    fuelTypes: [],
    transmissionTypes: [],
  };

  // Extract price range (look for patterns like "₹ X.XX Lakh*")
  const priceMatch = content.match(/₹\s*([\d.]+)\s*-?\s*([\d.]+)?\s*Lakh/i) || 
                     content.match(/Starting at\s*₹\s*([\d.]+)\s*Lakh/i) ||
                     content.match(/Price:\s*₹\s*([\d.]+)\s*Lakh/i);
  if (priceMatch) {
    if (priceMatch[2]) {
      data.priceRange = `₹ ${priceMatch[1]} - ${priceMatch[2]} Lakh`;
    } else {
      data.priceRange = `₹ ${priceMatch[1]} Lakh onwards`;
    }
  }

  // Extract body type from content
  if (content.toLowerCase().includes('suv') || content.toLowerCase().includes('crossover')) {
    data.bodyType = 'SUV';
  } else if (content.toLowerCase().includes('sedan')) {
    data.bodyType = 'Sedan';
  } else if (content.toLowerCase().includes('hatchback')) {
    data.bodyType = 'Hatchback';
  } else if (content.toLowerCase().includes('mpv') || content.toLowerCase().includes('muv')) {
    data.bodyType = 'MPV';
  } else {
    data.bodyType = 'Hatchback'; // Default for most Maruti cars
  }

  // Extract fuel types
  if (content.toLowerCase().includes('petrol')) data.fuelTypes!.push('Petrol');
  if (content.toLowerCase().includes('cng') || content.toLowerCase().includes('s-cng')) data.fuelTypes!.push('CNG');
  if (content.toLowerCase().includes('diesel')) data.fuelTypes!.push('Diesel');
  if (content.toLowerCase().includes('hybrid')) data.fuelTypes!.push('Hybrid');
  if (content.toLowerCase().includes('electric') || content.toLowerCase().includes('ev')) data.fuelTypes!.push('Electric');
  
  // Extract transmission types
  if (content.toLowerCase().includes('manual') || content.toLowerCase().includes('mt')) data.transmissionTypes!.push('Manual');
  if (content.toLowerCase().includes('automatic') || content.toLowerCase().includes('amt') || content.toLowerCase().includes('ags')) data.transmissionTypes!.push('Automatic');
  if (content.toLowerCase().includes('cvt')) data.transmissionTypes!.push('CVT');

  // Extract mileage
  const mileageMatch = content.match(/(\d+\.?\d*)\s*km\/l/i) || content.match(/mileage[:\s]*(\d+\.?\d*)/i);
  if (mileageMatch) {
    data.specifications!.push({ category: 'Performance', label: 'Mileage', value: `${mileageMatch[1]} km/l` });
  }

  // Extract engine
  const engineMatch = content.match(/(\d{3,4})\s*cc/i) || content.match(/engine[:\s]*(\d+)\s*cc/i);
  if (engineMatch) {
    data.specifications!.push({ category: 'Engine', label: 'Displacement', value: `${engineMatch[1]} cc` });
  }

  // Extract key features/highlights
  const featurePatterns = [
    /SmartPlay/i, /Android Auto/i, /Apple CarPlay/i, /Cruise Control/i,
    /Sunroof/i, /LED/i, /Airbag/i, /ABS/i, /ESP/i, /Hill Hold/i,
    /Rear Camera/i, /Touchscreen/i, /Alloy Wheels/i, /Climate Control/i
  ];
  
  featurePatterns.forEach(pattern => {
    const match = content.match(pattern);
    if (match && !data.keyHighlights!.includes(match[0])) {
      data.keyHighlights!.push(match[0]);
    }
  });

  // Extract images
  const imgMatches = content.matchAll(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/gi);
  for (const match of imgMatches) {
    const imgUrl = match[0];
    if (imgUrl.includes('marutisuzuki') || imgUrl.includes('msil') || imgUrl.includes('arena')) {
      if (!data.images!.includes(imgUrl)) {
        data.images!.push(imgUrl);
      }
    }
  }

  return data;
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

    const { url, carName } = await req.json();

    if (!url || !carName) {
      return new Response(
        JSON.stringify({ success: false, error: 'url and carName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping Maruti car: ${carName} from ${url}`);

    // Scrape with Firecrawl - get HTML for better data extraction
    const scrapeResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html', 'links'],
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
    const links = scrapeData.data?.links || [];
    
    console.log(`Scraped ${markdown.length} chars of markdown, ${html.length} chars of HTML`);

    // Extract car data
    const carData = extractMarutiCarData(markdown + '\n' + html, carName, url);
    
    // Extract image URLs from links
    const imageLinks = links.filter((link: string) => 
      link.match(/\.(jpg|jpeg|png|webp)$/i) && 
      (link.includes('marutisuzuki') || link.includes('msil'))
    );
    
    carData.images = [...(carData.images || []), ...imageLinks].slice(0, 10);

    // Now scrape the variants/pricing page if available
    const variantsUrl = url.includes('arena') 
      ? url.replace('/arena/', '/configurator/') 
      : `https://www.marutisuzuki.com/configurator/${carName.toLowerCase().replace(/\s+/g, '')}`;
    
    console.log(`Attempting to scrape variants from: ${variantsUrl}`);

    // Return the scraped data for verification before inserting
    return new Response(
      JSON.stringify({ 
        success: true, 
        carData,
        rawMarkdownLength: markdown.length,
        rawHtmlLength: html.length,
        linksFound: links.length,
        imagesFound: carData.images?.length || 0,
        message: `Scraped ${carName} - found ${carData.fuelTypes?.length || 0} fuel types, ${carData.specifications?.length || 0} specs`
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
