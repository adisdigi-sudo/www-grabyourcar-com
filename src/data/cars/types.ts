// Placeholder images - in production these would be actual car images
const carPlaceholder = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600";

export interface CarSpec {
  label: string;
  value: string;
}

export interface DealerOffer {
  id: number;
  title: string;
  description: string;
  discount: string;
  validTill: string;
  type: "cashback" | "accessory" | "exchange" | "finance";
}

export interface PriceBreakup {
  exShowroom: number;
  rto: number;
  insurance: number;
  tcs: number;
  fastag: number;
  registration: number;
  handling: number;
  onRoadPrice: number;
}

export interface CarVariant {
  name: string;
  price: string;
  priceNumeric?: number;
  features: string[];
  fuelType?: string;
  transmission?: string;
  priceBreakup?: PriceBreakup;
}

// Helper to calculate price breakup from ex-showroom price
export const calculatePriceBreakup = (exShowroomPrice: number, state: string = "Delhi"): PriceBreakup => {
  // RTO charges vary by state (typically 8-15% of ex-showroom)
  const rtoPercent = state === "Delhi" ? 0.08 : state === "Maharashtra" ? 0.11 : state === "Karnataka" ? 0.13 : 0.10;
  const rto = Math.round(exShowroomPrice * rtoPercent);
  
  // Insurance (typically 3-4% of ex-showroom for comprehensive)
  const insurance = Math.round(exShowroomPrice * 0.035);
  
  // TCS (1% if price > 10 lakhs)
  const tcs = exShowroomPrice > 1000000 ? Math.round(exShowroomPrice * 0.01) : 0;
  
  // Fixed charges
  const fastag = 500;
  const registration = 1000;
  const handling = 15000;
  
  const onRoadPrice = exShowroomPrice + rto + insurance + tcs + fastag + registration + handling;
  
  return {
    exShowroom: exShowroomPrice,
    rto,
    insurance,
    tcs,
    fastag,
    registration,
    handling,
    onRoadPrice
  };
};

// Helper to generate variant with price breakup
export const createVariant = (
  name: string, 
  priceLabel: string, 
  priceNumeric: number, 
  features: string[],
  fuelType?: string,
  transmission?: string
): CarVariant => ({
  name,
  price: priceLabel,
  priceNumeric,
  features,
  fuelType,
  transmission,
  priceBreakup: calculatePriceBreakup(priceNumeric)
});

export interface CarColor {
  name: string;
  hex: string;
}

export interface Car {
  id: number;
  slug: string;
  name: string;
  brand: string;
  bodyType: string;
  tagline: string;
  image: string;
  gallery: string[];
  price: string;
  priceNumeric: number; // For sorting
  originalPrice: string;
  discount: string;
  fuelTypes: string[];
  transmission: string[];
  availability: string;
  isHot: boolean;
  isLimited: boolean;
  isNew: boolean;
  isUpcoming: boolean;
  launchDate?: string;
  overview: string;
  keyHighlights: string[];
  specifications: {
    engine: CarSpec[];
    dimensions: CarSpec[];
    performance: CarSpec[];
    features: CarSpec[];
    safety: CarSpec[];
  };
  colors: CarColor[];
  variants: CarVariant[];
  offers: DealerOffer[];
  pros: string[];
  cons: string[];
  competitors: string[];
}

export const bodyTypes = [
  "All",
  "Hatchback",
  "Sedan",
  "Compact SUV",
  "Mid-Size SUV",
  "Full-Size SUV",
  "MPV",
  "MUV",
  "Coupe",
  "Convertible",
  "Pickup",
  "Electric",
  "Luxury"
];

export const brands = [
  "All",
  "Maruti Suzuki",
  "Hyundai",
  "Tata",
  "Mahindra",
  "Kia",
  "Toyota",
  "Honda",
  "MG",
  "Skoda",
  "Volkswagen",
  "Renault",
  "Nissan",
  "Citroen",
  "Jeep",
  "Ford",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Volvo",
  "Lexus",
  "Porsche",
  "Land Rover",
  "Jaguar",
  "Mini",
  "BYD",
  "Isuzu"
];

export const fuelTypes = [
  "All",
  "Petrol",
  "Diesel",
  "Electric",
  "Hybrid",
  "CNG",
  "LPG"
];

export const transmissionTypes = [
  "All",
  "Manual",
  "Automatic",
  "AMT",
  "CVT",
  "DCT",
  "iMT"
];

export const priceRanges = [
  { label: "All", min: 0, max: Infinity },
  { label: "Under ₹5 Lakh", min: 0, max: 500000 },
  { label: "₹5-10 Lakh", min: 500000, max: 1000000 },
  { label: "₹10-15 Lakh", min: 1000000, max: 1500000 },
  { label: "₹15-20 Lakh", min: 1500000, max: 2000000 },
  { label: "₹20-30 Lakh", min: 2000000, max: 3000000 },
  { label: "₹30-50 Lakh", min: 3000000, max: 5000000 },
  { label: "₹50 Lakh - 1 Cr", min: 5000000, max: 10000000 },
  { label: "Above ₹1 Cr", min: 10000000, max: Infinity }
];

// Helper to generate standard offers
export const generateOffers = (cashDiscount: string, exchangeBonus: string): DealerOffer[] => [
  { id: 1, title: "Cash Discount", description: "Flat cash discount on ex-showroom price", discount: cashDiscount, validTill: "31st Mar 2025", type: "cashback" },
  { id: 2, title: "Exchange Bonus", description: "Additional bonus on exchanging your old car", discount: exchangeBonus, validTill: "31st Mar 2025", type: "exchange" },
  { id: 3, title: "Free Accessories", description: "Premium accessory package included", discount: "₹15,000", validTill: "31st Mar 2025", type: "accessory" },
  { id: 4, title: "Low EMI", description: "Attractive EMI options available", discount: "Low Interest", validTill: "31st Mar 2025", type: "finance" },
];

export { carPlaceholder };
