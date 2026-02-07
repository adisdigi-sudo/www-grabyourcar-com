/**
 * Shared image validation utilities
 * Allows Supabase-hosted images AND official OEM domain images
 */

// Official OEM domains that are allowed (including CDN/asset subpaths)
const OFFICIAL_OEM_DOMAINS = [
  'supabase.co',
  // Maruti Suzuki
  'marutisuzuki.com',
  'nexaexperience.com',
  // Hyundai
  'hyundai.com',
  'hyundai.co.in',
  'www.hyundai.com',
  // Tata Motors
  'tatamotors.com',
  'cars.tatamotors.com',
  'ev.tatamotors.com',
  // Mahindra
  'mahindra.com',
  'auto.mahindra.com',
  'mahindrarise.com',
  // Kia
  'kia.com',
  'kia.in',
  'www.kia.com',
  // Toyota
  'toyota.com',
  'toyotabharat.com',
  'www.toyotabharat.com',
  // Honda
  'honda.com',
  'hondacarindia.com',
  'www.hondacarindia.com',
  // MG Motor
  'mg.co.in',
  'mgmotor.co.in',
  'www.mgmotor.co.in',
  // Skoda
  'skoda-auto.co.in',
  'skoda-auto.com',
  'www.skoda-auto.co.in',
  // Volkswagen
  'volkswagen.co.in',
  'volkswagen.com',
  'www.volkswagen.co.in',
  // Renault
  'renault.co.in',
  'renault.com',
  // Jeep
  'jeep-india.com',
  // Citroen
  'citroen.in',
  // VinFast
  'vinfastauto.in',
  'vinfast.com',
  // Tesla
  'tesla.com',
  'www.tesla.com',
  // Luxury brands
  'bmw.in',
  'mercedes-benz.co.in',
  'audi.in',
  'volvo.in',
  'porsche.com',
  'landrover.in',
  'jaguar.in'
];

/**
 * Check if an image URL is from an authentic/allowed source
 * Allows: Supabase storage, Official OEM websites, Local assets
 * Blocks: Placeholder SVG, AI-generated, External CDNs
 */
export const isAuthenticImage = (url: string | undefined | null): boolean => {
  if (!url) return false;
  if (url === '/placeholder.svg') return false;
  
  // Allow local asset imports (for banners, logos, etc.)
  if (url.startsWith('/src/assets') || url.startsWith('data:') || url.startsWith('/assets')) {
    return true;
  }
  
  // Check against allowed OEM domains
  return OFFICIAL_OEM_DOMAINS.some(domain => url.includes(domain));
};

/**
 * Alias for backward compatibility
 */
export const isValidImage = isAuthenticImage;

/**
 * Get the list of allowed OEM domains (for reference/debugging)
 */
export const getAllowedDomains = (): string[] => [...OFFICIAL_OEM_DOMAINS];
