/**
 * Shared image validation utilities
 * Allows Supabase-hosted images AND official OEM domain images
 */

// Official OEM domains that are allowed (including CDN/asset subpaths)
const OFFICIAL_OEM_DOMAINS = [
  'supabase.co',
  'marutisuzuki.com',
  'nexaexperience.com',
  'hyundai.com',
  'hyundai.co.in',
  'tatamotors.com',
  'mahindra.com',
  'mahindrarise.com',
  'kia.com',
  'kia.in',
  'toyota.com',
  'toyotabharat.com',
  'honda.com',
  'hondacarindia.com',
  'mg.co.in',
  'mgmotor.co.in',
  'skoda-auto.co.in',
  'skoda-auto.com',
  'volkswagen.co.in',
  'volkswagen.com',
  'renault.co.in',
  'renault.com',
  'jeep-india.com',
  'citroen.in',
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
