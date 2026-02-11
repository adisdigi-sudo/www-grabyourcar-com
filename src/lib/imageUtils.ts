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
  's7ap1.scene7.com',
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
  'static.toyotabharat.com',
  'static3.toyotabharat.com',
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
  'cdn.group.renault.com',
  // Jeep
  'jeep-india.com',
  // Citroen
  'citroen.in',
  'www.citroen.in',
  'ds-prod.citroen.in',
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
  'bydautoindia.com',
  'byd-assets.s3.us-east-2.amazonaws.com',
  // Force Motors
  'forcemotors.com',
  'www.forcemotors.com',
  'forcegurkha.co.in',
  'forceurbania.co.in',
  // Isuzu
  'isuzu.in',
  // Luxury brands
  'bmw.in',
  'www.bmw.in',
  'prod.cosy.bmw.cloud',
  'mercedes-benz.co.in',
  'www.mercedes-benz.co.in',
  'media.oneweb.mercedes-benz.com',
  'audi.in',
  'www.audi.in',
  'emea-dam.audi.com',
  'mediaservice.audi.com',
  'delivery-p123727-e1214567.adobeaemcloud.com',
  'audi-india-ar.s3.ap-south-1.amazonaws.com',
  'audi-india-ar.s3.amazonaws.com',
  'volvo.in',
  'volvocars.com',
  'porsche.com',
  'www.porsche.com',
  'a.storyblok.com',
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
  'www.lamborghini.com',
  'ferrari.com',
  'cdn.ferrari.com',
  'ferrari-cdn.thron.com',
  'ferrari.scene7.com',
  'rolls-roycemotorcars.com',
  'bentleymotors.com',
  'maserati.com',
  // Bugatti
  'bugatti.com',
  'www.bugatti.com',
  'bugatti.imgix.net',
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
