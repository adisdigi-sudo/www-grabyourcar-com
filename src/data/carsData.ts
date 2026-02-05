import carCreta from "@/assets/car-creta.jpg";
import carNexon from "@/assets/car-nexon.jpg";
import carSwift from "@/assets/car-swift.jpg";
import carXuv700 from "@/assets/car-xuv700.jpg";
import carSeltos from "@/assets/car-seltos.jpg";
import carInnova from "@/assets/car-innova.jpg";
import { CarVariant, PriceBreakup } from "./cars/types";

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

export interface Car {
  id: number;
  slug: string;
  name: string;
  brand: string;
  tagline: string;
  image: string;
  gallery: string[];
  price: string;
  originalPrice: string;
  discount: string;
  fuelTypes: string[];
  transmission: string[];
  availability: string;
  isHot: boolean;
  isLimited: boolean;
  overview: string;
  specifications: {
    engine: CarSpec[];
    dimensions: CarSpec[];
    performance: CarSpec[];
    features: CarSpec[];
  };
  colors: { name: string; hex: string }[];
  variants: CarVariant[];
  offers: DealerOffer[];
  brochureUrl?: string;
}

export const cars: Car[] = [
  {
    id: 1,
    slug: "hyundai-creta",
    name: "Hyundai Creta",
    brand: "Hyundai",
    tagline: "Luxury Redefined",
    image: carCreta,
    gallery: [carCreta, carCreta, carCreta, carCreta],
    price: "₹11.00 - 20.15 Lakh",
    originalPrice: "₹11.50 Lakh",
    discount: "₹50,000 OFF",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "Ready Stock",
    isHot: true,
    isLimited: false,
    overview: "The Hyundai Creta is a compact SUV that offers premium features, powerful engine options, and a spacious interior. With its bold design and advanced technology, the Creta is perfect for urban commutes and long road trips.",
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Kappa Petrol / 1.5L U2 CRDi Diesel" },
        { label: "Displacement", value: "1497 cc" },
        { label: "Max Power", value: "115 PS @ 6300 rpm (Petrol)" },
        { label: "Max Torque", value: "144 Nm @ 4500 rpm (Petrol)" },
        { label: "Fuel Tank Capacity", value: "50 Litres" },
      ],
      dimensions: [
        { label: "Length", value: "4300 mm" },
        { label: "Width", value: "1790 mm" },
        { label: "Height", value: "1635 mm" },
        { label: "Wheelbase", value: "2610 mm" },
        { label: "Ground Clearance", value: "190 mm" },
        { label: "Boot Space", value: "433 Litres" },
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "16.8 kmpl" },
        { label: "Mileage (Diesel)", value: "21.4 kmpl" },
        { label: "Top Speed", value: "180 kmph" },
        { label: "0-100 kmph", value: "11.5 seconds" },
      ],
      features: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Sunroof", value: "Panoramic Sunroof" },
        { label: "Connectivity", value: "Bluelink Connected Car" },
        { label: "ADAS", value: "Level 2 ADAS" },
        { label: "Ventilated Seats", value: "Front Row" },
      ],
    },
    colors: [
      { name: "Abyss Black", hex: "#1a1a1a" },
      { name: "Polar White", hex: "#f5f5f5" },
      { name: "Titan Grey", hex: "#6b7280" },
      { name: "Fiery Red", hex: "#dc2626" },
      { name: "Atlas White", hex: "#ffffff" },
    ],
    variants: [
      { name: "E", price: "₹11.00 Lakh", features: ["Manual AC", "Dual Airbags", "Steering Audio Controls"] },
      { name: "EX", price: "₹12.50 Lakh", features: ["Touchscreen Infotainment", "Rear AC Vents", "4 Airbags"] },
      { name: "S", price: "₹14.00 Lakh", features: ["Sunroof", "6 Airbags", "LED DRLs", "Push Button Start"] },
      { name: "SX", price: "₹17.50 Lakh", features: ["Panoramic Sunroof", "Ventilated Seats", "ADAS", "Bose Audio"] },
      { name: "SX(O)", price: "₹20.15 Lakh", features: ["All SX Features", "360° Camera", "Wireless Charger", "Air Purifier"] },
    ],
    offers: [
      { id: 1, title: "Cash Discount", description: "Flat cash discount on ex-showroom price", discount: "₹30,000", validTill: "31st Dec 2024", type: "cashback" },
      { id: 2, title: "Exchange Bonus", description: "Additional bonus on exchanging your old car", discount: "₹25,000", validTill: "31st Dec 2024", type: "exchange" },
      { id: 3, title: "Free Accessories", description: "Premium accessory package worth", discount: "₹15,000", validTill: "31st Dec 2024", type: "accessory" },
      { id: 4, title: "Low EMI", description: "Starting from ₹15,999/month with 0% processing fee", discount: "0% Interest", validTill: "31st Dec 2024", type: "finance" },
    ],
  },
  {
    id: 2,
    slug: "tata-nexon",
    name: "Tata Nexon",
    brand: "Tata",
    tagline: "Go Anywhere, Do Anything",
    image: carNexon,
    gallery: [carNexon, carNexon, carNexon, carNexon],
    price: "₹8.10 - 15.50 Lakh",
    originalPrice: "₹8.50 Lakh",
    discount: "₹40,000 OFF",
    fuelTypes: ["Petrol", "Diesel", "EV"],
    transmission: ["Manual", "AMT"],
    availability: "Ready Stock",
    isHot: true,
    isLimited: false,
    overview: "The Tata Nexon is India's safest SUV with a 5-star Global NCAP safety rating. It offers a perfect blend of style, safety, and performance with multiple powertrain options including an electric variant.",
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Revotron Petrol / 1.5L Revotorq Diesel" },
        { label: "Displacement", value: "1199 cc (Petrol) / 1497 cc (Diesel)" },
        { label: "Max Power", value: "120 PS @ 5500 rpm (Petrol)" },
        { label: "Max Torque", value: "170 Nm @ 1750-4000 rpm (Petrol)" },
        { label: "Fuel Tank Capacity", value: "44 Litres" },
      ],
      dimensions: [
        { label: "Length", value: "3993 mm" },
        { label: "Width", value: "1811 mm" },
        { label: "Height", value: "1606 mm" },
        { label: "Wheelbase", value: "2498 mm" },
        { label: "Ground Clearance", value: "209 mm" },
        { label: "Boot Space", value: "350 Litres" },
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "17.4 kmpl" },
        { label: "Mileage (Diesel)", value: "24.1 kmpl" },
        { label: "Top Speed", value: "170 kmph" },
        { label: "0-100 kmph", value: "12.2 seconds" },
      ],
      features: [
        { label: "Safety Rating", value: "5-Star Global NCAP" },
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Sunroof", value: "Electric Sunroof" },
        { label: "Connectivity", value: "iRA Connected Car" },
        { label: "Sound System", value: "8-Speaker JBL Audio" },
        { label: "Cruise Control", value: "Yes" },
      ],
    },
    colors: [
      { name: "Flame Red", hex: "#ef4444" },
      { name: "Calgary White", hex: "#f8fafc" },
      { name: "Daytona Grey", hex: "#4b5563" },
      { name: "Foliage Green", hex: "#22c55e" },
      { name: "Creative Ocean", hex: "#0ea5e9" },
    ],
    variants: [
      { name: "Smart", price: "₹8.10 Lakh", features: ["Dual Airbags", "ABS with EBD", "Manual AC"] },
      { name: "Smart+", price: "₹9.50 Lakh", features: ["Touchscreen", "Rear Parking Sensors", "Steering Controls"] },
      { name: "Creative", price: "₹11.50 Lakh", features: ["Sunroof", "6 Airbags", "Auto Climate Control"] },
      { name: "Creative+", price: "₹13.50 Lakh", features: ["JBL Audio", "Ventilated Seats", "Wireless Charging"] },
      { name: "Fearless+", price: "₹15.50 Lakh", features: ["All Features", "360° Camera", "Air Purifier", "iRA Connected"] },
    ],
    offers: [
      { id: 1, title: "Cash Discount", description: "Flat cash discount on ex-showroom price", discount: "₹25,000", validTill: "31st Dec 2024", type: "cashback" },
      { id: 2, title: "Exchange Bonus", description: "Additional bonus on exchanging your old car", discount: "₹20,000", validTill: "31st Dec 2024", type: "exchange" },
      { id: 3, title: "Free Insurance", description: "First year comprehensive insurance free", discount: "₹35,000", validTill: "31st Dec 2024", type: "accessory" },
      { id: 4, title: "Special Finance", description: "EMI starting from ₹12,999/month", discount: "Low EMI", validTill: "31st Dec 2024", type: "finance" },
    ],
  },
  {
    id: 3,
    slug: "maruti-swift",
    name: "Maruti Swift",
    brand: "Maruti Suzuki",
    tagline: "Play Hard. Play Swift.",
    image: carSwift,
    gallery: [carSwift, carSwift, carSwift, carSwift],
    price: "₹6.49 - 9.64 Lakh",
    originalPrice: "₹6.99 Lakh",
    discount: "₹50,000 OFF",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "AMT"],
    availability: "2 Units Left",
    isHot: false,
    isLimited: true,
    overview: "The all-new Maruti Swift features a bold new design with enhanced performance and better fuel efficiency. India's most loved hatchback now comes with advanced safety features and premium interiors.",
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Z-Series Dual Jet Petrol" },
        { label: "Displacement", value: "1197 cc" },
        { label: "Max Power", value: "82 PS @ 5700 rpm" },
        { label: "Max Torque", value: "112 Nm @ 4400 rpm" },
        { label: "Fuel Tank Capacity", value: "37 Litres" },
      ],
      dimensions: [
        { label: "Length", value: "3860 mm" },
        { label: "Width", value: "1735 mm" },
        { label: "Height", value: "1530 mm" },
        { label: "Wheelbase", value: "2450 mm" },
        { label: "Ground Clearance", value: "163 mm" },
        { label: "Boot Space", value: "268 Litres" },
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "24.8 kmpl" },
        { label: "Mileage (CNG)", value: "32.85 km/kg" },
        { label: "Top Speed", value: "165 kmph" },
        { label: "0-100 kmph", value: "12.8 seconds" },
      ],
      features: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "Infotainment", value: "9-inch SmartPlay Pro+" },
        { label: "Connectivity", value: "Suzuki Connect" },
        { label: "Cruise Control", value: "Yes" },
        { label: "LED Headlamps", value: "Yes with DRLs" },
        { label: "Rear Camera", value: "With Parking Sensors" },
      ],
    },
    colors: [
      { name: "Luster Blue", hex: "#3b82f6" },
      { name: "Pearl Arctic White", hex: "#ffffff" },
      { name: "Solid Fire Red", hex: "#dc2626" },
      { name: "Sizzling Red with Black Roof", hex: "#b91c1c" },
      { name: "Magma Grey", hex: "#374151" },
    ],
    variants: [
      { name: "LXi", price: "₹6.49 Lakh", features: ["Dual Airbags", "ABS", "Manual AC"] },
      { name: "VXi", price: "₹7.29 Lakh", features: ["Touchscreen", "Rear Parking Sensors", "Keyless Entry"] },
      { name: "ZXi", price: "₹8.29 Lakh", features: ["6 Airbags", "LED Headlamps", "Auto Climate Control"] },
      { name: "ZXi+", price: "₹9.64 Lakh", features: ["All Features", "Cruise Control", "Suzuki Connect", "Push Button Start"] },
    ],
    offers: [
      { id: 1, title: "Limited Time Offer", description: "Special year-end discount", discount: "₹50,000", validTill: "31st Dec 2024", type: "cashback" },
      { id: 2, title: "Exchange Bonus", description: "Trade in your old Maruti car", discount: "₹30,000", validTill: "31st Dec 2024", type: "exchange" },
      { id: 3, title: "Free Accessories", description: "Essential accessory kit worth", discount: "₹10,000", validTill: "31st Dec 2024", type: "accessory" },
    ],
  },
  {
    id: 4,
    slug: "mahindra-xuv700",
    name: "Mahindra XUV700",
    brand: "Mahindra",
    tagline: "The World of SUVs Has a New Standard",
    image: carXuv700,
    gallery: [carXuv700, carXuv700, carXuv700, carXuv700],
    price: "₹14.49 - 26.99 Lakh",
    originalPrice: "₹15.00 Lakh",
    discount: "₹75,000 OFF",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "Ready Stock",
    isHot: true,
    isLimited: false,
    overview: "The Mahindra XUV700 is a flagship SUV featuring class-leading ADAS technology, powerful mStallion petrol and mHawk diesel engines, and a feature-rich cabin with twin 10.25-inch screens.",
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L mStallion Turbo Petrol / 2.2L mHawk Diesel" },
        { label: "Displacement", value: "1997 cc (P) / 2198 cc (D)" },
        { label: "Max Power", value: "200 PS (P) / 185 PS (D)" },
        { label: "Max Torque", value: "380 Nm (P) / 450 Nm (D)" },
        { label: "Fuel Tank Capacity", value: "60 Litres" },
      ],
      dimensions: [
        { label: "Length", value: "4695 mm" },
        { label: "Width", value: "1890 mm" },
        { label: "Height", value: "1755 mm" },
        { label: "Wheelbase", value: "2750 mm" },
        { label: "Ground Clearance", value: "200 mm" },
        { label: "Boot Space", value: "500 Litres" },
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "12.5 kmpl" },
        { label: "Mileage (Diesel)", value: "16.3 kmpl" },
        { label: "Top Speed", value: "200 kmph" },
        { label: "0-100 kmph", value: "8.5 seconds (Petrol AT)" },
      ],
      features: [
        { label: "ADAS", value: "Level 2 with 7 Features" },
        { label: "Display", value: "Twin 10.25-inch Screens" },
        { label: "Sunroof", value: "Skyroof (Largest in Segment)" },
        { label: "Sound System", value: "12-Speaker Sony 3D Sound" },
        { label: "Seating", value: "5/7 Seater Options" },
        { label: "AdrenoX", value: "Connected Car with Alexa" },
      ],
    },
    colors: [
      { name: "Midnight Black", hex: "#0f172a" },
      { name: "Electric Blue", hex: "#2563eb" },
      { name: "Everest White", hex: "#f1f5f9" },
      { name: "Red Rage", hex: "#b91c1c" },
      { name: "Dazzling Silver", hex: "#94a3b8" },
    ],
    variants: [
      { name: "MX", price: "₹14.49 Lakh", features: ["6 Airbags", "8-inch Touchscreen", "Halogen Headlamps"] },
      { name: "AX3", price: "₹16.49 Lakh", features: ["Dual 10.25-inch Screens", "LED Headlamps", "Sunroof"] },
      { name: "AX5", price: "₹19.49 Lakh", features: ["ADAS Level 1", "Sony Audio", "7 Seater"] },
      { name: "AX7", price: "₹23.49 Lakh", features: ["Full ADAS", "Skyroof", "Driver Drowsiness Detection"] },
      { name: "AX7 L", price: "₹26.99 Lakh", features: ["All Features", "Smart Door Handles", "Wireless Charging"] },
    ],
    offers: [
      { id: 1, title: "Festive Bonus", description: "Special festive season discount", discount: "₹50,000", validTill: "31st Dec 2024", type: "cashback" },
      { id: 2, title: "Exchange Offer", description: "Best exchange value for your car", discount: "₹35,000", validTill: "31st Dec 2024", type: "exchange" },
      { id: 3, title: "Corporate Discount", description: "Special discount for corporate employees", discount: "₹25,000", validTill: "31st Dec 2024", type: "cashback" },
      { id: 4, title: "Low Interest", description: "Finance at just 7.99% interest rate", discount: "7.99% APR", validTill: "31st Dec 2024", type: "finance" },
    ],
  },
  {
    id: 5,
    slug: "kia-seltos",
    name: "Kia Seltos",
    brand: "Kia",
    tagline: "The Badass",
    image: carSeltos,
    gallery: [carSeltos, carSeltos, carSeltos, carSeltos],
    price: "₹10.90 - 20.35 Lakh",
    originalPrice: "₹11.40 Lakh",
    discount: "₹50,000 OFF",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic", "iMT"],
    availability: "Ready Stock",
    isHot: false,
    isLimited: false,
    overview: "The Kia Seltos is a premium compact SUV that offers bold design, powerful engine options, and feature-loaded variants. With its connected car features and advanced safety systems, the Seltos redefines its segment.",
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Smartstream Petrol / 1.5L CRDi Diesel / 1.5L Turbo Petrol" },
        { label: "Displacement", value: "1497 cc" },
        { label: "Max Power", value: "115 PS (NA) / 160 PS (Turbo) / 116 PS (D)" },
        { label: "Max Torque", value: "144 Nm / 253 Nm / 250 Nm" },
        { label: "Fuel Tank Capacity", value: "50 Litres" },
      ],
      dimensions: [
        { label: "Length", value: "4365 mm" },
        { label: "Width", value: "1800 mm" },
        { label: "Height", value: "1645 mm" },
        { label: "Wheelbase", value: "2610 mm" },
        { label: "Ground Clearance", value: "190 mm" },
        { label: "Boot Space", value: "433 Litres" },
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "16.5 kmpl" },
        { label: "Mileage (Diesel)", value: "20.8 kmpl" },
        { label: "Top Speed", value: "170 kmph" },
        { label: "0-100 kmph", value: "9.7 seconds (Turbo)" },
      ],
      features: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "Display", value: "10.25-inch Touchscreen" },
        { label: "Sunroof", value: "Electric Sunroof" },
        { label: "Sound System", value: "8-Speaker Bose Audio" },
        { label: "UVO Connect", value: "66 Connected Features" },
        { label: "Ventilated Seats", value: "Front Row" },
      ],
    },
    colors: [
      { name: "Intense Red", hex: "#dc2626" },
      { name: "Gravity Grey", hex: "#4b5563" },
      { name: "Glacier White Pearl", hex: "#f8fafc" },
      { name: "Imperial Blue", hex: "#1e40af" },
      { name: "Aurora Black Pearl", hex: "#1f2937" },
    ],
    variants: [
      { name: "HTE", price: "₹10.90 Lakh", features: ["6 Airbags", "8-inch Display", "Rear Parking Camera"] },
      { name: "HTK", price: "₹12.50 Lakh", features: ["10.25-inch Touchscreen", "Wireless Apple CarPlay", "Auto AC"] },
      { name: "HTK+", price: "₹14.50 Lakh", features: ["Sunroof", "Drive Modes", "Cruise Control"] },
      { name: "HTX", price: "₹16.50 Lakh", features: ["Bose Audio", "UVO Connect", "Ventilated Seats"] },
      { name: "GTX+", price: "₹20.35 Lakh", features: ["Turbo Engine", "All Features", "ADAS", "Premium Interior"] },
    ],
    offers: [
      { id: 1, title: "Year End Bonus", description: "Special year-end pricing", discount: "₹40,000", validTill: "31st Dec 2024", type: "cashback" },
      { id: 2, title: "Exchange Benefits", description: "High valuation on exchange", discount: "₹30,000", validTill: "31st Dec 2024", type: "exchange" },
      { id: 3, title: "Accessories Pack", description: "Premium accessories kit free", discount: "₹15,000", validTill: "31st Dec 2024", type: "accessory" },
    ],
  },
  {
    id: 6,
    slug: "toyota-innova-crysta",
    name: "Toyota Innova Crysta",
    brand: "Toyota",
    tagline: "The Legend Continues",
    image: carInnova,
    gallery: [carInnova, carInnova, carInnova, carInnova],
    price: "₹19.99 - 26.30 Lakh",
    originalPrice: "₹20.50 Lakh",
    discount: "₹60,000 OFF",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "1 Unit Left",
    isHot: false,
    isLimited: true,
    overview: "The Toyota Innova Crysta is India's most loved premium MPV. Known for its legendary reliability, spacious interiors, and comfortable ride quality, the Innova Crysta is perfect for families and chauffeur-driven usage.",
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.7L VVT-i Petrol / 2.4L GD Diesel" },
        { label: "Displacement", value: "2694 cc (P) / 2393 cc (D)" },
        { label: "Max Power", value: "166 PS (P) / 150 PS (D)" },
        { label: "Max Torque", value: "245 Nm (P) / 360 Nm (D)" },
        { label: "Fuel Tank Capacity", value: "55 Litres" },
      ],
      dimensions: [
        { label: "Length", value: "4735 mm" },
        { label: "Width", value: "1830 mm" },
        { label: "Height", value: "1795 mm" },
        { label: "Wheelbase", value: "2750 mm" },
        { label: "Ground Clearance", value: "178 mm" },
        { label: "Boot Space", value: "300 Litres (All Rows Up)" },
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "10.7 kmpl" },
        { label: "Mileage (Diesel)", value: "15.1 kmpl" },
        { label: "Top Speed", value: "180 kmph" },
        { label: "0-100 kmph", value: "12.8 seconds (Diesel)" },
      ],
      features: [
        { label: "Seating", value: "7/8 Seater Options" },
        { label: "Captain Seats", value: "Available in VX/ZX" },
        { label: "Infotainment", value: "9-inch Touchscreen" },
        { label: "Rear AC", value: "Roof-Mounted AC with Controls" },
        { label: "Safety", value: "7 Airbags, VSC, HAC" },
        { label: "Cruise Control", value: "Yes" },
      ],
    },
    colors: [
      { name: "Super White", hex: "#ffffff" },
      { name: "Silver Metallic", hex: "#a8a29e" },
      { name: "Grey Metallic", hex: "#57534e" },
      { name: "Attitude Black", hex: "#1c1917" },
      { name: "Avant-Garde Bronze", hex: "#78716c" },
    ],
    variants: [
      { name: "GX", price: "₹19.99 Lakh", features: ["8 Seater", "Dual Airbags", "Manual AC", "Fabric Seats"] },
      { name: "G", price: "₹21.50 Lakh", features: ["7 Airbags", "Touchscreen", "Roof AC", "Push Button Start"] },
      { name: "VX", price: "₹23.99 Lakh", features: ["Captain Seats", "Leather Upholstery", "Auto AC", "Cruise Control"] },
      { name: "ZX", price: "₹26.30 Lakh", features: ["All Features", "Premium Audio", "Ambient Lighting", "Connected Features"] },
    ],
    offers: [
      { id: 1, title: "Last Unit Special", description: "Special pricing for last available unit", discount: "₹40,000", validTill: "31st Dec 2024", type: "cashback" },
      { id: 2, title: "Exchange Bonus", description: "Best exchange value guaranteed", discount: "₹30,000", validTill: "31st Dec 2024", type: "exchange" },
      { id: 3, title: "Free Service", description: "3 years free service package", discount: "Worth ₹50,000", validTill: "31st Dec 2024", type: "accessory" },
      { id: 4, title: "Easy Finance", description: "Low EMI options available", discount: "₹27,999/month", validTill: "31st Dec 2024", type: "finance" },
    ],
  },
];

// Import all cars from the comprehensive car database
import { allCars } from "./cars";

export const getCarBySlug = (slug: string): Car | undefined => {
  // First check the comprehensive car database
  const carFromAllCars = allCars.find((car) => car.slug === slug);
  if (carFromAllCars) {
    // Convert to the legacy format for compatibility
    return {
      id: carFromAllCars.id,
      slug: carFromAllCars.slug,
      name: carFromAllCars.name,
      brand: carFromAllCars.brand,
      tagline: carFromAllCars.tagline,
      image: carFromAllCars.image,
      gallery: carFromAllCars.gallery,
      price: carFromAllCars.price,
      originalPrice: carFromAllCars.originalPrice,
      discount: carFromAllCars.discount,
      fuelTypes: carFromAllCars.fuelTypes,
      transmission: carFromAllCars.transmission,
      availability: carFromAllCars.availability,
      isHot: carFromAllCars.isHot,
      isLimited: carFromAllCars.isLimited,
      overview: carFromAllCars.overview,
      specifications: carFromAllCars.specifications,
      colors: carFromAllCars.colors,
      variants: carFromAllCars.variants,
      offers: carFromAllCars.offers,
    };
  }
  // Fall back to local cars array
  return cars.find((car) => car.slug === slug);
};

export const getCarById = (id: number): Car | undefined => {
  // First check the comprehensive car database
  const carFromAllCars = allCars.find((car) => car.id === id);
  if (carFromAllCars) {
    return {
      id: carFromAllCars.id,
      slug: carFromAllCars.slug,
      name: carFromAllCars.name,
      brand: carFromAllCars.brand,
      tagline: carFromAllCars.tagline,
      image: carFromAllCars.image,
      gallery: carFromAllCars.gallery,
      price: carFromAllCars.price,
      originalPrice: carFromAllCars.originalPrice,
      discount: carFromAllCars.discount,
      fuelTypes: carFromAllCars.fuelTypes,
      transmission: carFromAllCars.transmission,
      availability: carFromAllCars.availability,
      isHot: carFromAllCars.isHot,
      isLimited: carFromAllCars.isLimited,
      overview: carFromAllCars.overview,
      specifications: carFromAllCars.specifications,
      colors: carFromAllCars.colors,
      variants: carFromAllCars.variants,
      offers: carFromAllCars.offers,
    };
  }
  return cars.find((car) => car.id === id);
};
