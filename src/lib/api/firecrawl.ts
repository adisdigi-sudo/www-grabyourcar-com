import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
  action?: string;
  url?: string;
  brand?: string;
  carModel?: string;
  links?: string[];
};

export const firecrawlApi = {
  // Scrape a specific car model from OEM website
  async scrapeCarModel(brand: string, model: string): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-oem-data', {
      body: { 
        brand, 
        carModel: model, 
        action: 'scrape_model' 
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  // Map all car URLs from a brand's website
  async mapBrandSite(brand: string): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-oem-data', {
      body: { 
        brand, 
        action: 'map_site' 
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  // Scrape a specific URL directly
  async scrapeUrl(url: string): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-oem-data', {
      body: { 
        url, 
        action: 'scrape_url' 
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  // Get available OEM brands
  getAvailableBrands(): string[] {
    return [
      'Maruti Suzuki',
      'Hyundai',
      'Tata',
      'Mahindra',
      'Kia',
      'Toyota',
      'Honda',
      'MG',
      'Skoda',
      'Volkswagen',
      'BMW',
      'Mercedes',
      'Audi'
    ];
  }
};
