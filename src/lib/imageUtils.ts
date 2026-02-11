/**
 * Shared image validation utilities
 * Allows Supabase-hosted images AND official OEM domain images
 */

// Official OEM domains that are allowed (including CDN/asset subpaths)
const OFFICIAL_OEM_DOMAINS = [
  'supabase.co',
  // Maruti Suzuki
  'marutisuzuki.com',
  'www.marutisuzuki.com',
  'marutisuzuki.scene7.com',
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
  'mgmotor.scene7.com',
  's7ap1.scene7.com',
  // Skoda
  'skoda-auto.co.in',
  'skoda-auto.com',
  'www.skoda-auto.co.in',
  // Volkswagen
  'volkswagen.co.in',
  'volkswagen.com',
  'www.volkswagen.co.in',
  'assets.volkswagen.com',
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
  'static-cms-prod.vinfastauto.in',
  'storage.googleapis.com', // VinFast CDN
  // Tesla
  'tesla.com',
  'www.tesla.com',
  'digitalassets.tesla.com',
  // Nissan
  'nissan.in',
  'www-asia.nissan-cdn.net',
  // BYD
  'byd.com',
  // Force Motors
  'forcemotors.com',
  'forcegurkha.co.in',
  // Isuzu
  'isuzu.in',
  // Luxury brands
  'bmw.in',
  'www.bmw.in',
  'mercedes-benz.co.in',
  'www.mercedes-benz.co.in',
  'audi.in',
  'www.audi.in',
  'volvo.in',
  'volvocars.com',
  'porsche.com',
  'www.porsche.com',
  'landrover.in',
  'www.landrover.in',
  'jaguar.in',
  'www.jaguar.in',
  'lexusindia.co.in',
  'www.lexusindia.co.in',
  'mini.in',
  'www.mini.in',
  // Supercar brands
  'lamborghini.com',
  'ferrari.com',
  'rolls-roycemotorcars.com',
  'bentleymotors.com',
  'maserati.com',
  // EV brands
  'lucidmotors.com',
  'polestar.com',
  'rivian.com',
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
