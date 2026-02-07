import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// OEM website URLs for Indian car manufacturers
const OEM_SITES: Record<string, { baseUrl: string; modelsPath: string }> = {
  'Maruti Suzuki': { 
    baseUrl: 'https://www.marutisuzuki.com',
    modelsPath: '/cars'
  },
  'Hyundai': { 
    baseUrl: 'https://www.hyundai.com/in/en',
    modelsPath: '/find-a-car'
  },
  'Tata': { 
    baseUrl: 'https://cars.tatamotors.com',
    modelsPath: ''
  },
  'Mahindra': { 
    baseUrl: 'https://auto.mahindra.com',
    modelsPath: '/suv'
  },
  'Kia': { 
    baseUrl: 'https://www.kia.com/in',
    modelsPath: '/our-vehicles'
  },
  'Toyota': { 
    baseUrl: 'https://www.toyotabharat.com',
    modelsPath: '/explore'
  },
  'Honda': { 
    baseUrl: 'https://www.hondacarindia.com',
    modelsPath: '/cars'
  },
  'MG': { 
    baseUrl: 'https://www.mgmotor.co.in',
    modelsPath: '/vehicles'
  },
  'Skoda': { 
    baseUrl: 'https://www.skoda-auto.co.in',
    modelsPath: '/models'
  },
  'Volkswagen': { 
    baseUrl: 'https://www.volkswagen.co.in',
    modelsPath: '/en/models'
  },
  'BMW': {
    baseUrl: 'https://www.bmw.in/en',
    modelsPath: '/all-models'
  },
  'Mercedes': {
    baseUrl: 'https://www.mercedes-benz.co.in',
    modelsPath: '/passengercars/models'
  },
  'Audi': {
    baseUrl: 'https://www.audi.in/in/web/en',
    modelsPath: '/models'
  }
};

interface ScrapeRequest {
  brand?: string;
  carModel?: string;
  url?: string;
  action: 'scrape_model' | 'scrape_brand' | 'map_site' | 'scrape_url';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, carModel, url, action }: ScrapeRequest = await req.json();

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please connect Firecrawl in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let targetUrl = url;
    
    // Build URL based on brand/model if not provided directly
    if (!targetUrl && brand) {
      const oemConfig = OEM_SITES[brand];
      if (oemConfig) {
        if (carModel) {
          // Try to construct model-specific URL
          const modelSlug = carModel.toLowerCase().replace(/\s+/g, '-');
          targetUrl = `${oemConfig.baseUrl}${oemConfig.modelsPath}/${modelSlug}`;
        } else {
          targetUrl = `${oemConfig.baseUrl}${oemConfig.modelsPath}`;
        }
      } else {
        return new Response(
          JSON.stringify({ success: false, error: `Brand "${brand}" not found in OEM configuration` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL or brand must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Firecrawl action: ${action}, URL: ${targetUrl}`);

    let result;

    if (action === 'map_site') {
      // Map the website to discover all URLs
      const response = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl,
          limit: 100,
          includeSubdomains: false,
        }),
      });

      result = await response.json();

      if (!response.ok) {
        console.error('Firecrawl map error:', result);
        return new Response(
          JSON.stringify({ success: false, error: result.error || `Map failed with status ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Scrape the page for content
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl,
          formats: ['markdown', 'links'],
          onlyMainContent: true,
          waitFor: 3000, // Wait for JS to load
        }),
      });

      result = await response.json();

      if (!response.ok) {
        console.error('Firecrawl scrape error:', result);
        return new Response(
          JSON.stringify({ success: false, error: result.error || `Scrape failed with status ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Firecrawl ${action} successful for ${targetUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        url: targetUrl,
        brand,
        carModel,
        data: result.data || result,
        links: result.links || result.data?.links,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in firecrawl-oem-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape OEM data';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
