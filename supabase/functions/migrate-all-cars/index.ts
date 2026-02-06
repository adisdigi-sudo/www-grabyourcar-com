import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complete car database - All brands
const allCarsData = [
  // ============ MARUTI SUZUKI ============
  {
    slug: "maruti-alto-k10",
    name: "Maruti Alto K10",
    brand: "Maruti Suzuki",
    body_type: "Hatchback",
    tagline: "Let's Go",
    price_range: "₹3.99 - 5.96 Lakh",
    price_numeric: 399000,
    fuel_types: ["Petrol", "CNG"],
    transmission_types: ["Manual", "AMT"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Entry-level hatchback with excellent fuel efficiency and low maintenance.",
    key_highlights: ["Best-in-class mileage", "Compact city car", "AGS automatic option", "Low running costs"],
    pros: ["Excellent fuel efficiency", "Low maintenance cost", "Easy to drive", "Good resale value"],
    cons: ["Basic interiors", "Limited features", "No rear AC vents", "Small boot space"],
    competitors: ["Renault Kwid", "Tata Tiago", "Hyundai Santro"],
    colors: [
      { name: "Silky Silver", hex: "#C0C0C0" },
      { name: "Solid White", hex: "#FFFFFF" },
      { name: "Granite Grey", hex: "#5A5A5A" },
      { name: "Speedy Blue", hex: "#1E90FF" },
      { name: "Sizzling Red", hex: "#DC143C" }
    ],
    variants: [
      { name: "STD", price: "₹3.99 Lakh", price_numeric: 399000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "Power Windows Front"] },
      { name: "LXi", price: "₹4.59 Lakh", price_numeric: 459000, fuel_type: "Petrol", transmission: "Manual", features: ["Power Steering", "Front Power Windows", "Remote Keyless Entry"] },
      { name: "VXi", price: "₹4.99 Lakh", price_numeric: 499000, fuel_type: "Petrol", transmission: "Manual", features: ["Touchscreen Infotainment", "Bluetooth", "Rear Parking Sensors"] },
      { name: "VXi+ AGS", price: "₹5.96 Lakh", price_numeric: 596000, fuel_type: "Petrol", transmission: "AMT", features: ["Auto Gear Shift", "All VXi Features"] }
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L K10C Petrol" },
        { label: "Displacement", value: "998 cc" },
        { label: "Max Power", value: "66 PS @ 5500 rpm" },
        { label: "Max Torque", value: "89 Nm @ 3500 rpm" }
      ],
      dimensions: [
        { label: "Length", value: "3530 mm" },
        { label: "Width", value: "1490 mm" },
        { label: "Height", value: "1520 mm" },
        { label: "Boot Space", value: "214 Litres" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "24.39 kmpl" },
        { label: "Mileage (CNG)", value: "33.85 km/kg" }
      ],
      safety: [
        { label: "Airbags", value: "Dual Front Airbags" },
        { label: "ABS", value: "Yes with EBD" }
      ]
    }
  },
  {
    slug: "maruti-swift",
    name: "Maruti Swift",
    brand: "Maruti Suzuki",
    body_type: "Hatchback",
    tagline: "Play Hard. Play Swift.",
    price_range: "₹6.49 - 9.64 Lakh",
    price_numeric: 649000,
    fuel_types: ["Petrol", "CNG"],
    transmission_types: ["Manual", "AMT"],
    availability: "Ready Stock",
    is_hot: true, is_new: true, is_upcoming: false, is_bestseller: true,
    overview: "All-new 4th generation Swift with bold styling and improved performance.",
    key_highlights: ["All-new 4th generation", "New Z-series engine", "6 airbags standard", "Best-in-segment mileage"],
    pros: ["Sporty styling", "Fun to drive", "Feature-rich", "Great mileage"],
    cons: ["Cramped rear seat", "No diesel option", "Firm ride quality"],
    competitors: ["Hyundai i20", "Tata Altroz", "Toyota Glanza"],
    colors: [
      { name: "Pearl Arctic White", hex: "#F5F5F5" },
      { name: "Luster Blue", hex: "#4169E1" },
      { name: "Sizzling Red", hex: "#DC143C" },
      { name: "Magma Grey", hex: "#696969" },
      { name: "Midnight Black", hex: "#1C1C1C" }
    ],
    variants: [
      { name: "LXi", price: "₹6.49 Lakh", price_numeric: 649000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "ABS", "Dual Horn"] },
      { name: "VXi", price: "₹7.29 Lakh", price_numeric: 729000, fuel_type: "Petrol", transmission: "Manual", features: ["9-inch Touchscreen", "Rear AC Vents", "Push Start"] },
      { name: "ZXi", price: "₹8.29 Lakh", price_numeric: 829000, fuel_type: "Petrol", transmission: "Manual", features: ["LED Headlamps", "Alloy Wheels", "Auto Climate"] },
      { name: "ZXi+ AGS", price: "₹9.64 Lakh", price_numeric: 964000, fuel_type: "Petrol", transmission: "AMT", features: ["Electric Sunroof", "Wireless CarPlay", "All ZXi Features"] }
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Z-Series Dual Jet Petrol" },
        { label: "Displacement", value: "1197 cc" },
        { label: "Max Power", value: "82 PS @ 5700 rpm" },
        { label: "Max Torque", value: "112 Nm @ 4300 rpm" }
      ],
      dimensions: [
        { label: "Length", value: "3860 mm" },
        { label: "Width", value: "1735 mm" },
        { label: "Height", value: "1520 mm" },
        { label: "Boot Space", value: "265 Litres" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "24.80 kmpl" },
        { label: "Top Speed", value: "165 kmph" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags (Standard)" },
        { label: "ESP", value: "Electronic Stability Program" }
      ]
    }
  },
  {
    slug: "maruti-baleno",
    name: "Maruti Baleno",
    brand: "Maruti Suzuki",
    body_type: "Hatchback",
    tagline: "Crafted with Precision",
    price_range: "₹6.61 - 9.88 Lakh",
    price_numeric: 661000,
    fuel_types: ["Petrol", "CNG"],
    transmission_types: ["Manual", "AMT"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Premium hatchback with spacious interiors and advanced features.",
    key_highlights: ["Heads-up display", "360 camera", "NEXA premium experience"],
    pros: ["Spacious cabin", "Premium feel", "Feature loaded"],
    cons: ["No diesel", "Suspension stiff", "AMT jerky"],
    competitors: ["Hyundai i20", "Tata Altroz", "Honda Jazz"],
    colors: [
      { name: "Nexa Blue", hex: "#0047AB" },
      { name: "Arctic White", hex: "#F5F5F5" },
      { name: "Grandeur Grey", hex: "#5A5A5A" }
    ],
    variants: [
      { name: "Sigma", price: "₹6.61 Lakh", price_numeric: 661000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "Keyless Entry"] },
      { name: "Delta", price: "₹7.49 Lakh", price_numeric: 749000, fuel_type: "Petrol", transmission: "Manual", features: ["9-inch SmartPlay", "LED DRLs"] },
      { name: "Zeta", price: "₹8.49 Lakh", price_numeric: 849000, fuel_type: "Petrol", transmission: "Manual", features: ["Heads-up Display", "LED Projector Lamps"] },
      { name: "Alpha AGS", price: "₹9.88 Lakh", price_numeric: 988000, fuel_type: "Petrol", transmission: "AMT", features: ["360 Camera", "Sunroof", "Cruise Control"] }
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L K12N Dual Jet" },
        { label: "Max Power", value: "90 PS" },
        { label: "Max Torque", value: "113 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3990 mm" },
        { label: "Boot Space", value: "318 Litres" }
      ],
      performance: [
        { label: "Mileage", value: "22.35 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Yes" }
      ]
    }
  },
  {
    slug: "maruti-dzire",
    name: "Maruti Dzire",
    brand: "Maruti Suzuki",
    body_type: "Sedan",
    tagline: "New Dzire. New Desire.",
    price_range: "₹6.79 - 9.99 Lakh",
    price_numeric: 679000,
    fuel_types: ["Petrol", "CNG"],
    transmission_types: ["Manual", "AMT"],
    availability: "Ready Stock",
    is_hot: false, is_new: true, is_upcoming: false, is_bestseller: true,
    overview: "India's best-selling compact sedan with refined styling.",
    key_highlights: ["Spacious cabin", "Premium interiors", "Excellent fuel economy"],
    pros: ["Comfortable ride", "Spacious boot", "Good mileage"],
    cons: ["No diesel", "Basic infotainment", "Small engine"],
    competitors: ["Honda Amaze", "Hyundai Aura", "Tata Tigor"],
    colors: [
      { name: "Pearl Arctic White", hex: "#F5F5F5" },
      { name: "Sherwood Brown", hex: "#8B4513" },
      { name: "Magma Grey", hex: "#696969" }
    ],
    variants: [
      { name: "LXi", price: "₹6.79 Lakh", price_numeric: 679000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "Manual AC"] },
      { name: "VXi", price: "₹7.79 Lakh", price_numeric: 779000, fuel_type: "Petrol", transmission: "Manual", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "ZXi+", price: "₹9.99 Lakh", price_numeric: 999000, fuel_type: "Petrol", transmission: "AMT", features: ["LED Headlamps", "Cruise Control", "Auto Climate"] }
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Z-Series" },
        { label: "Max Power", value: "82 PS" },
        { label: "Max Torque", value: "112 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Boot Space", value: "382 Litres" }
      ],
      performance: [
        { label: "Mileage", value: "24.79 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },
  {
    slug: "maruti-brezza",
    name: "Maruti Brezza",
    brand: "Maruti Suzuki",
    body_type: "Compact SUV",
    tagline: "Break Free",
    price_range: "₹8.34 - 14.14 Lakh",
    price_numeric: 834000,
    fuel_types: ["Petrol", "CNG"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Ready Stock",
    is_hot: true, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "India's most popular compact SUV with bold design and features.",
    key_highlights: ["Electric Sunroof", "HUD", "360 Camera", "6 Airbags"],
    pros: ["Spacious cabin", "Strong resale", "Feature loaded"],
    cons: ["No diesel", "Basic rear design", "Average performance"],
    competitors: ["Tata Nexon", "Hyundai Venue", "Kia Sonet"],
    colors: [
      { name: "Sizzling Red", hex: "#DC143C" },
      { name: "Pearl Arctic White", hex: "#F5F5F5" },
      { name: "Brave Khaki", hex: "#7B8B6F" }
    ],
    variants: [
      { name: "LXi", price: "₹8.34 Lakh", price_numeric: 834000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "15-inch Wheels"] },
      { name: "VXi", price: "₹9.79 Lakh", price_numeric: 979000, fuel_type: "Petrol", transmission: "Manual", features: ["9-inch Touchscreen", "LED DRLs"] },
      { name: "ZXi+", price: "₹12.49 Lakh", price_numeric: 1249000, fuel_type: "Petrol", transmission: "Manual", features: ["Electric Sunroof", "HUD", "360 Camera"] },
      { name: "ZXi+ AT", price: "₹14.14 Lakh", price_numeric: 1414000, fuel_type: "Petrol", transmission: "Automatic", features: ["6-Speed Torque Converter", "All ZXi+ Features"] }
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L K15C Smart Hybrid" },
        { label: "Max Power", value: "103 PS" },
        { label: "Max Torque", value: "137 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Boot Space", value: "328 Litres" }
      ],
      performance: [
        { label: "Mileage", value: "20.15 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Yes" }
      ]
    }
  },
  {
    slug: "maruti-grand-vitara",
    name: "Maruti Grand Vitara",
    brand: "Maruti Suzuki",
    body_type: "Mid-Size SUV",
    tagline: "Create Your World",
    price_range: "₹10.99 - 19.65 Lakh",
    price_numeric: 1099000,
    fuel_types: ["Petrol", "Hybrid"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Ready Stock",
    is_hot: true, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Premium mid-size SUV with strong hybrid technology.",
    key_highlights: ["Strong Hybrid", "AWD option", "Panoramic Sunroof", "NEXA quality"],
    pros: ["Excellent fuel economy", "Premium feel", "AWD capability"],
    cons: ["Underpowered hybrid", "Stiff ride", "Limited boot space"],
    competitors: ["Toyota Urban Cruiser Hyryder", "Honda Elevate", "Hyundai Creta"],
    colors: [
      { name: "Arctic White", hex: "#F5F5F5" },
      { name: "Grandeur Grey", hex: "#5A5A5A" },
      { name: "Opulent Red", hex: "#8B0000" }
    ],
    variants: [
      { name: "Sigma", price: "₹10.99 Lakh", price_numeric: 1099000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "LED DRLs"] },
      { name: "Delta Smart Hybrid", price: "₹12.99 Lakh", price_numeric: 1299000, fuel_type: "Petrol", transmission: "Manual", features: ["Smart Hybrid", "9-inch Touchscreen"] },
      { name: "Alpha+ Strong Hybrid", price: "₹19.65 Lakh", price_numeric: 1965000, fuel_type: "Hybrid", transmission: "Automatic", features: ["Strong Hybrid e-CVT", "Panoramic Sunroof", "AWD"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol Engine", value: "1.5L K15C (103 PS)" },
        { label: "Strong Hybrid", value: "1.5L + Electric Motor (116 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4345 mm" },
        { label: "Boot Space", value: "373 Litres" }
      ],
      performance: [
        { label: "Strong Hybrid Mileage", value: "27.97 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Not Available" }
      ]
    }
  },
  {
    slug: "maruti-ertiga",
    name: "Maruti Ertiga",
    brand: "Maruti Suzuki",
    body_type: "MPV",
    tagline: "Together We Celebrate",
    price_range: "₹8.69 - 13.08 Lakh",
    price_numeric: 869000,
    fuel_types: ["Petrol", "CNG"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "India's most loved 7-seater MPV for family travel.",
    key_highlights: ["7-Seater", "Best-in-class mileage", "NEXA premium"],
    pros: ["Spacious", "Comfortable", "Good mileage", "Strong resale"],
    cons: ["Underpowered", "No diesel", "Average build quality"],
    competitors: ["Kia Carens", "Mahindra Marazzo", "Toyota Rumion"],
    colors: [
      { name: "Pearl Arctic White", hex: "#F5F5F5" },
      { name: "Splendid Silver", hex: "#C0C0C0" },
      { name: "Auburn Red", hex: "#A52A2A" }
    ],
    variants: [
      { name: "LXi", price: "₹8.69 Lakh", price_numeric: 869000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "AC", "Power Steering"] },
      { name: "VXi", price: "₹10.09 Lakh", price_numeric: 1009000, fuel_type: "Petrol", transmission: "Manual", features: ["Touchscreen", "Rear AC Vents"] },
      { name: "ZXi+ AT", price: "₹13.08 Lakh", price_numeric: 1308000, fuel_type: "Petrol", transmission: "Automatic", features: ["Cruise Control", "Auto Climate", "6-Speed AT"] }
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L K15C Smart Hybrid" },
        { label: "Max Power", value: "103 PS" }
      ],
      dimensions: [
        { label: "Seating", value: "7 Seater" },
        { label: "Boot Space", value: "209 Litres" }
      ],
      performance: [
        { label: "Mileage", value: "20.30 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },

  // ============ HYUNDAI ============
  {
    slug: "hyundai-creta",
    name: "Hyundai Creta",
    brand: "Hyundai",
    body_type: "Compact SUV",
    tagline: "The Ultimate SUV",
    price_range: "₹11.00 - 20.15 Lakh",
    price_numeric: 1100000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "iMT", "DCT"],
    availability: "Ready Stock",
    is_hot: true, is_new: true, is_upcoming: false, is_bestseller: true,
    overview: "India's most popular SUV with premium features and ADAS.",
    key_highlights: ["Level 2 ADAS", "Panoramic Sunroof", "Connected Car Tech", "6 Airbags"],
    pros: ["Premium interiors", "Feature loaded", "Multiple powertrain options"],
    cons: ["Expensive top variants", "Stiff suspension", "Average diesel NVH"],
    competitors: ["Kia Seltos", "Maruti Grand Vitara", "Honda Elevate"],
    colors: [
      { name: "Titan Grey Matte", hex: "#5A5A5A" },
      { name: "Abyss Black", hex: "#1C1C1C" },
      { name: "Atlas White", hex: "#F5F5F5" },
      { name: "Fiery Red", hex: "#FF2400" }
    ],
    variants: [
      { name: "E", price: "₹11.00 Lakh", price_numeric: 1100000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "LED DRLs", "USB Charging"] },
      { name: "EX", price: "₹12.50 Lakh", price_numeric: 1250000, fuel_type: "Petrol", transmission: "Manual", features: ["8-inch Touchscreen", "Rear Camera"] },
      { name: "S", price: "₹13.50 Lakh", price_numeric: 1350000, fuel_type: "Petrol", transmission: "iMT", features: ["Clutchless Manual", "Wireless Charger"] },
      { name: "SX", price: "₹16.00 Lakh", price_numeric: 1600000, fuel_type: "Petrol", transmission: "DCT", features: ["Panoramic Sunroof", "Bose Audio", "Connected Car"] },
      { name: "SX(O) Diesel DCT", price: "₹20.15 Lakh", price_numeric: 2015000, fuel_type: "Diesel", transmission: "DCT", features: ["Level 2 ADAS", "Ventilated Seats", "360 Camera"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.5L MPi (115 PS)" },
        { label: "Turbo Petrol", value: "1.5L T-GDi (160 PS)" },
        { label: "Diesel", value: "1.5L CRDi (116 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4330 mm" },
        { label: "Boot Space", value: "433 Litres" }
      ],
      performance: [
        { label: "Petrol Mileage", value: "16.8 kmpl" },
        { label: "Diesel Mileage", value: "21.8 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2 (Top Variant)" }
      ]
    }
  },
  {
    slug: "hyundai-venue",
    name: "Hyundai Venue",
    brand: "Hyundai",
    body_type: "Compact SUV",
    tagline: "Live the Lit Life",
    price_range: "₹7.94 - 13.48 Lakh",
    price_numeric: 794000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "iMT", "DCT"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Compact SUV with connected car technology.",
    key_highlights: ["BlueLink Connected Car", "Turbo Petrol", "Sunroof"],
    pros: ["Compact size", "Feature loaded", "Turbo petrol option"],
    cons: ["Cramped rear", "No diesel AT", "Limited boot"],
    competitors: ["Tata Nexon", "Maruti Brezza", "Kia Sonet"],
    colors: [
      { name: "Fiery Red", hex: "#FF2400" },
      { name: "Denim Blue", hex: "#4169E1" },
      { name: "Phantom Black", hex: "#1C1C1C" }
    ],
    variants: [
      { name: "E", price: "₹7.94 Lakh", price_numeric: 794000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "Power Windows"] },
      { name: "S", price: "₹9.49 Lakh", price_numeric: 949000, fuel_type: "Petrol", transmission: "Manual", features: ["8-inch Touchscreen", "Rear Camera"] },
      { name: "SX+ Turbo DCT", price: "₹13.48 Lakh", price_numeric: 1348000, fuel_type: "Petrol", transmission: "DCT", features: ["Turbo Engine", "Sunroof", "BlueLink"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.2L Kappa (83 PS)" },
        { label: "Turbo Petrol", value: "1.0L T-GDi (120 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Boot Space", value: "350 Litres" }
      ],
      performance: [
        { label: "Mileage", value: "17.5 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },
  {
    slug: "hyundai-i20",
    name: "Hyundai i20",
    brand: "Hyundai",
    body_type: "Hatchback",
    tagline: "i am the Future",
    price_range: "₹7.04 - 11.45 Lakh",
    price_numeric: 704000,
    fuel_types: ["Petrol"],
    transmission_types: ["Manual", "Automatic", "iMT", "DCT"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Premium hatchback with segment-first features.",
    key_highlights: ["Sunroof", "Bose Sound", "Turbo option", "Connected Car"],
    pros: ["Premium feel", "Spacious", "Feature loaded"],
    cons: ["Expensive", "No diesel", "Firm ride"],
    competitors: ["Maruti Baleno", "Tata Altroz", "Volkswagen Polo"],
    colors: [
      { name: "Polar White", hex: "#F5F5F5" },
      { name: "Starry Night", hex: "#1C1C1C" },
      { name: "Fiery Red", hex: "#FF2400" }
    ],
    variants: [
      { name: "Magna", price: "₹7.04 Lakh", price_numeric: 704000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "Rear Wiper"] },
      { name: "Sportz", price: "₹8.49 Lakh", price_numeric: 849000, fuel_type: "Petrol", transmission: "iMT", features: ["10.25-inch Touchscreen", "Wireless CarPlay"] },
      { name: "Asta (O) Turbo DCT", price: "₹11.45 Lakh", price_numeric: 1145000, fuel_type: "Petrol", transmission: "DCT", features: ["Turbo Engine", "Sunroof", "Bose Audio"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.2L Kappa (88 PS)" },
        { label: "Turbo", value: "1.0L T-GDi (120 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Boot Space", value: "311 Litres" }
      ],
      performance: [
        { label: "Mileage", value: "20.25 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },

  // ============ TATA ============
  {
    slug: "tata-nexon",
    name: "Tata Nexon",
    brand: "Tata",
    body_type: "Compact SUV",
    tagline: "Play Fearless",
    price_range: "₹8.00 - 15.50 Lakh",
    price_numeric: 800000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "AMT"],
    availability: "Ready Stock",
    is_hot: true, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "5-Star GNCAP rated compact SUV with bold design.",
    key_highlights: ["5-Star Safety Rating", "Ventilated Seats", "Air Purifier", "Connected Car"],
    pros: ["Safest in segment", "Feature loaded", "Good looking"],
    cons: ["AMT jerky", "Cramped rear", "Average mileage"],
    competitors: ["Hyundai Venue", "Maruti Brezza", "Kia Sonet"],
    colors: [
      { name: "Flame Red", hex: "#FF4500" },
      { name: "Creative Ocean", hex: "#4169E1" },
      { name: "Daytona Grey", hex: "#5A5A5A" }
    ],
    variants: [
      { name: "Smart", price: "₹8.00 Lakh", price_numeric: 800000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "Power Windows"] },
      { name: "Pure+", price: "₹9.50 Lakh", price_numeric: 950000, fuel_type: "Petrol", transmission: "Manual", features: ["10.25-inch Touchscreen", "Rear Camera"] },
      { name: "Creative+", price: "₹12.00 Lakh", price_numeric: 1200000, fuel_type: "Diesel", transmission: "Manual", features: ["Sunroof", "Ventilated Seats", "Air Purifier"] },
      { name: "Fearless+ Diesel AMT", price: "₹15.50 Lakh", price_numeric: 1550000, fuel_type: "Diesel", transmission: "AMT", features: ["360 Camera", "Connected Car", "All Features"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.2L Revotron (120 PS)" },
        { label: "Diesel", value: "1.5L Revotorq (115 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Boot Space", value: "350 Litres" }
      ],
      performance: [
        { label: "Petrol Mileage", value: "17.4 kmpl" },
        { label: "Diesel Mileage", value: "23.2 kmpl" }
      ],
      safety: [
        { label: "Rating", value: "5-Star GNCAP" },
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },
  {
    slug: "tata-punch",
    name: "Tata Punch",
    brand: "Tata",
    body_type: "Compact SUV",
    tagline: "Pack a Punch",
    price_range: "₹6.13 - 10.20 Lakh",
    price_numeric: 613000,
    fuel_types: ["Petrol", "CNG"],
    transmission_types: ["Manual", "AMT"],
    availability: "Ready Stock",
    is_hot: true, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Micro SUV with 5-Star safety rating and SUV styling.",
    key_highlights: ["5-Star Safety", "High Ground Clearance", "Peppy Engine", "Affordable"],
    pros: ["Safe", "Great value", "Fun to drive"],
    cons: ["Cramped rear", "Basic interiors", "No diesel"],
    competitors: ["Maruti Ignis", "Nissan Magnite", "Renault Kiger"],
    colors: [
      { name: "Tornado Blue", hex: "#4169E1" },
      { name: "Atomic Orange", hex: "#FF4500" },
      { name: "Orcus White", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "Pure", price: "₹6.13 Lakh", price_numeric: 613000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "Follow-me Headlamps"] },
      { name: "Adventure", price: "₹7.50 Lakh", price_numeric: 750000, fuel_type: "Petrol", transmission: "Manual", features: ["7-inch Touchscreen", "Roof Rails"] },
      { name: "Accomplished+", price: "₹8.99 Lakh", price_numeric: 899000, fuel_type: "Petrol", transmission: "Manual", features: ["Projector Headlamps", "Auto Climate"] },
      { name: "Creative+ AMT", price: "₹10.20 Lakh", price_numeric: 1020000, fuel_type: "Petrol", transmission: "AMT", features: ["Sunroof", "Connected Car", "All Features"] }
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Revotron (86 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "3827 mm" },
        { label: "Ground Clearance", value: "190 mm" }
      ],
      performance: [
        { label: "Mileage", value: "18.97 kmpl" }
      ],
      safety: [
        { label: "Rating", value: "5-Star GNCAP" },
        { label: "Airbags", value: "Dual Airbags" }
      ]
    }
  },
  {
    slug: "tata-harrier",
    name: "Tata Harrier",
    brand: "Tata",
    body_type: "Mid-Size SUV",
    tagline: "Above All",
    price_range: "₹15.49 - 26.44 Lakh",
    price_numeric: 1549000,
    fuel_types: ["Diesel"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Ready Stock",
    is_hot: true, is_new: true, is_upcoming: false, is_bestseller: false,
    overview: "Flagship SUV with OMAS platform and premium features.",
    key_highlights: ["OMAS Platform", "Panoramic Sunroof", "JBL Audio", "Connected Car"],
    pros: ["Imposing presence", "Comfortable", "Feature loaded"],
    cons: ["No petrol option", "Heavy steering", "Average mileage"],
    competitors: ["Mahindra XUV700", "Hyundai Alcazar", "MG Hector"],
    colors: [
      { name: "Ash Grey", hex: "#5A5A5A" },
      { name: "Coral Red", hex: "#DC143C" },
      { name: "Oberon Black", hex: "#1C1C1C" }
    ],
    variants: [
      { name: "Smart", price: "₹15.49 Lakh", price_numeric: 1549000, fuel_type: "Diesel", transmission: "Manual", features: ["6 Airbags", "LED DRLs", "18-inch Alloys"] },
      { name: "Pure+", price: "₹17.49 Lakh", price_numeric: 1749000, fuel_type: "Diesel", transmission: "Manual", features: ["10.25-inch Touchscreen", "Wireless CarPlay"] },
      { name: "Fearless+ AT", price: "₹26.44 Lakh", price_numeric: 2644000, fuel_type: "Diesel", transmission: "Automatic", features: ["Panoramic Sunroof", "ADAS", "JBL Audio"] }
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Kryotec Diesel (170 PS)" },
        { label: "Max Torque", value: "350 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4598 mm" },
        { label: "Boot Space", value: "425 Litres" }
      ],
      performance: [
        { label: "Mileage", value: "14.6 kmpl" }
      ],
      safety: [
        { label: "Rating", value: "5-Star GNCAP" },
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },

  // ============ MAHINDRA ============
  {
    slug: "mahindra-xuv700",
    name: "Mahindra XUV700",
    brand: "Mahindra",
    body_type: "Mid-Size SUV",
    tagline: "The World of SUVs Has Changed",
    price_range: "₹13.99 - 26.99 Lakh",
    price_numeric: 1399000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Waitlist 4-6 Months",
    is_hot: true, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Feature-loaded SUV with ADAS and powerful engines.",
    key_highlights: ["Level 2 ADAS", "Largest Panoramic Sunroof", "200 PS Diesel", "7 Seater Option"],
    pros: ["Powerful engines", "Feature loaded", "ADAS at affordable price"],
    cons: ["Long waiting period", "Build quality issues", "Heavy steering"],
    competitors: ["Tata Safari", "Hyundai Alcazar", "MG Hector"],
    colors: [
      { name: "Everest White", hex: "#F5F5F5" },
      { name: "Midnight Black", hex: "#1C1C1C" },
      { name: "Red Rage", hex: "#DC143C" }
    ],
    variants: [
      { name: "MX", price: "₹13.99 Lakh", price_numeric: 1399000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "17-inch Steel Wheels"] },
      { name: "AX5", price: "₹16.49 Lakh", price_numeric: 1649000, fuel_type: "Diesel", transmission: "Manual", features: ["10.25-inch Touchscreen", "Alexa Built-in"] },
      { name: "AX7 L Diesel AT AWD", price: "₹26.99 Lakh", price_numeric: 2699000, fuel_type: "Diesel", transmission: "Automatic", features: ["Level 2 ADAS", "Panoramic Sunroof", "AWD", "7 Airbags"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "2.0L mStallion (200 PS)" },
        { label: "Diesel", value: "2.2L mHawk (185 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4695 mm" },
        { label: "Seating", value: "5/7 Seater" }
      ],
      performance: [
        { label: "Diesel Mileage", value: "16 kmpl" }
      ],
      safety: [
        { label: "Rating", value: "5-Star GNCAP" },
        { label: "ADAS", value: "Level 2" }
      ]
    }
  },
  {
    slug: "mahindra-thar",
    name: "Mahindra Thar",
    brand: "Mahindra",
    body_type: "Off-Road SUV",
    tagline: "Explore the Impossible",
    price_range: "₹11.35 - 17.60 Lakh",
    price_numeric: 1135000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Waitlist 3-4 Months",
    is_hot: true, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Iconic off-roader with modern features and 4x4.",
    key_highlights: ["4x4", "Removable Roof", "Adventure Ready", "Iconic Design"],
    pros: ["True off-roader", "Iconic design", "Fun to drive"],
    cons: ["Poor ride quality", "Limited practicality", "Loud cabin"],
    competitors: ["Force Gurkha", "Maruti Jimny"],
    colors: [
      { name: "Red Rage", hex: "#DC143C" },
      { name: "Aquamarine", hex: "#7FFFD4" },
      { name: "Galaxy Grey", hex: "#5A5A5A" }
    ],
    variants: [
      { name: "AX OPT", price: "₹11.35 Lakh", price_numeric: 1135000, fuel_type: "Petrol", transmission: "Manual", features: ["Soft Top", "4x4", "Halogen Headlamps"] },
      { name: "LX Hard Top", price: "₹14.49 Lakh", price_numeric: 1449000, fuel_type: "Diesel", transmission: "Manual", features: ["Hard Top", "Touchscreen", "Rear Seat"] },
      { name: "LX AT Hard Top", price: "₹17.60 Lakh", price_numeric: 1760000, fuel_type: "Diesel", transmission: "Automatic", features: ["Automatic", "All Terrain Tyres", "Adventure Package"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "2.0L mStallion (150 PS)" },
        { label: "Diesel", value: "2.2L mHawk (130 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "3985 mm" },
        { label: "Ground Clearance", value: "226 mm" }
      ],
      performance: [
        { label: "Wading Depth", value: "650 mm" }
      ],
      safety: [
        { label: "4x4", value: "Yes with Low Range" }
      ]
    }
  },
  {
    slug: "mahindra-scorpio-n",
    name: "Mahindra Scorpio N",
    brand: "Mahindra",
    body_type: "Full-Size SUV",
    tagline: "Big Daddy of SUVs",
    price_range: "₹13.99 - 24.54 Lakh",
    price_numeric: 1399000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Waitlist 6-8 Months",
    is_hot: true, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "All-new Scorpio with powerful engines and modern features.",
    key_highlights: ["4x4", "Largest Sunroof", "200 PS Diesel", "7 Seater"],
    pros: ["Powerful", "Spacious", "4x4 option"],
    cons: ["Very long wait", "Third row cramped", "Heavy steering"],
    competitors: ["Tata Safari", "Hyundai Alcazar"],
    colors: [
      { name: "Deep Forest", hex: "#228B22" },
      { name: "Napoli Black", hex: "#1C1C1C" },
      { name: "Dazzling Silver", hex: "#C0C0C0" }
    ],
    variants: [
      { name: "Z4", price: "₹13.99 Lakh", price_numeric: 1399000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "18-inch Alloys", "Halogen Projector"] },
      { name: "Z6", price: "₹16.49 Lakh", price_numeric: 1649000, fuel_type: "Diesel", transmission: "Manual", features: ["8-inch Touchscreen", "Sunroof"] },
      { name: "Z8 L Diesel AT 4WD", price: "₹24.54 Lakh", price_numeric: 2454000, fuel_type: "Diesel", transmission: "Automatic", features: ["4WD", "Largest Sunroof", "Sony Audio"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "2.0L mStallion (200 PS)" },
        { label: "Diesel", value: "2.2L mHawk (175 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4662 mm" },
        { label: "Seating", value: "7 Seater" }
      ],
      performance: [
        { label: "Diesel Mileage", value: "14 kmpl" }
      ],
      safety: [
        { label: "Rating", value: "5-Star GNCAP" },
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },

  // ============ KIA ============
  {
    slug: "kia-seltos",
    name: "Kia Seltos",
    brand: "Kia",
    body_type: "Compact SUV",
    tagline: "The Badass",
    price_range: "₹10.90 - 20.35 Lakh",
    price_numeric: 1090000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "iMT", "DCT"],
    availability: "Ready Stock",
    is_hot: true, is_new: true, is_upcoming: false, is_bestseller: true,
    overview: "Premium compact SUV with ADAS and 360 camera.",
    key_highlights: ["Level 2 ADAS", "Panoramic Sunroof", "Ventilated Seats", "Bose Audio"],
    pros: ["Premium feel", "Feature loaded", "Multiple engine options"],
    cons: ["Expensive top variants", "No 7 seater option"],
    competitors: ["Hyundai Creta", "Maruti Grand Vitara", "Honda Elevate"],
    colors: [
      { name: "Imperial Blue", hex: "#0047AB" },
      { name: "Aurora Black Pearl", hex: "#1C1C1C" },
      { name: "Glacier White Pearl", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "HTE", price: "₹10.90 Lakh", price_numeric: 1090000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "LED DRLs", "17-inch Wheels"] },
      { name: "HTK+", price: "₹13.50 Lakh", price_numeric: 1350000, fuel_type: "Petrol", transmission: "iMT", features: ["10.25-inch Touchscreen", "Wireless CarPlay"] },
      { name: "GTX+ Diesel DCT", price: "₹20.35 Lakh", price_numeric: 2035000, fuel_type: "Diesel", transmission: "DCT", features: ["ADAS", "Panoramic Sunroof", "Bose Audio", "Ventilated Seats"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.5L MPi (115 PS)" },
        { label: "Turbo Petrol", value: "1.5L T-GDi (160 PS)" },
        { label: "Diesel", value: "1.5L CRDi (116 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4365 mm" },
        { label: "Boot Space", value: "433 Litres" }
      ],
      performance: [
        { label: "Turbo Mileage", value: "16.3 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" }
      ]
    }
  },
  {
    slug: "kia-sonet",
    name: "Kia Sonet",
    brand: "Kia",
    body_type: "Compact SUV",
    tagline: "The Wild Child",
    price_range: "₹7.99 - 15.69 Lakh",
    price_numeric: 799000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "iMT", "DCT"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Feature-packed compact SUV with bold design.",
    key_highlights: ["Ventilated Seats", "Bose Audio", "Multiple Powertrains"],
    pros: ["Feature loaded", "Premium feel", "Turbo petrol option"],
    cons: ["Cramped rear", "Average mileage", "No diesel AT"],
    competitors: ["Hyundai Venue", "Maruti Brezza", "Tata Nexon"],
    colors: [
      { name: "Intense Red", hex: "#DC143C" },
      { name: "Glacier White Pearl", hex: "#F5F5F5" },
      { name: "Gravity Grey", hex: "#5A5A5A" }
    ],
    variants: [
      { name: "HTE", price: "₹7.99 Lakh", price_numeric: 799000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "15-inch Wheels"] },
      { name: "HTK+", price: "₹10.49 Lakh", price_numeric: 1049000, fuel_type: "Petrol", transmission: "Manual", features: ["8-inch Touchscreen", "Wireless CarPlay"] },
      { name: "GTX+ Turbo DCT", price: "₹15.69 Lakh", price_numeric: 1569000, fuel_type: "Petrol", transmission: "DCT", features: ["Turbo Engine", "Sunroof", "Bose Audio", "Ventilated Seats"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.2L Smartstream (83 PS)" },
        { label: "Turbo Petrol", value: "1.0L T-GDi (120 PS)" },
        { label: "Diesel", value: "1.5L CRDi (116 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Boot Space", value: "392 Litres" }
      ],
      performance: [
        { label: "Diesel Mileage", value: "24.1 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },

  // ============ BMW ============
  {
    slug: "bmw-3-series",
    name: "BMW 3 Series",
    brand: "BMW",
    body_type: "Sedan",
    tagline: "Sheer Driving Pleasure",
    price_range: "₹46.90 - 57.90 Lakh",
    price_numeric: 4690000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: false,
    overview: "The ultimate driving machine in sedan form.",
    key_highlights: ["Rear-Wheel Drive", "BMW iDrive 8", "Sporty Handling"],
    pros: ["Engaging to drive", "Premium interiors", "Brand value"],
    cons: ["Expensive maintenance", "Cramped rear", "Harsh ride"],
    competitors: ["Mercedes C-Class", "Audi A4", "Volvo S60"],
    colors: [
      { name: "Alpine White", hex: "#F5F5F5" },
      { name: "Black Sapphire", hex: "#1C1C1C" },
      { name: "Melbourne Red", hex: "#DC143C" }
    ],
    variants: [
      { name: "320d Sport", price: "₹46.90 Lakh", price_numeric: 4690000, fuel_type: "Diesel", transmission: "Automatic", features: ["LED Headlamps", "12.3-inch Digital Display", "Sport Seats"] },
      { name: "330i M Sport", price: "₹57.90 Lakh", price_numeric: 5790000, fuel_type: "Petrol", transmission: "Automatic", features: ["M Sport Package", "19-inch Alloys", "Harman Kardon"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "2.0L TwinPower Turbo (258 PS)" },
        { label: "Diesel", value: "2.0L TwinPower Turbo (190 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4713 mm" },
        { label: "Boot Space", value: "480 Litres" }
      ],
      performance: [
        { label: "0-100 kmph", value: "5.8 seconds (330i)" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },
  {
    slug: "bmw-x1",
    name: "BMW X1",
    brand: "BMW",
    body_type: "Compact SUV",
    tagline: "The X is Coming",
    price_range: "₹45.90 - 52.50 Lakh",
    price_numeric: 4590000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: true, is_upcoming: false, is_bestseller: false,
    overview: "Entry-level BMW SUV with premium features.",
    key_highlights: ["All-new Generation", "BMW iDrive 8", "Panoramic Sunroof"],
    pros: ["Premium brand", "Feature loaded", "Practical size"],
    cons: ["Expensive", "FWD platform", "Average rear space"],
    competitors: ["Mercedes GLA", "Audi Q3", "Volvo XC40"],
    colors: [
      { name: "Alpine White", hex: "#F5F5F5" },
      { name: "Black Sapphire", hex: "#1C1C1C" },
      { name: "Storm Bay", hex: "#4169E1" }
    ],
    variants: [
      { name: "sDrive 18i M Sport", price: "₹45.90 Lakh", price_numeric: 4590000, fuel_type: "Petrol", transmission: "Automatic", features: ["10.25-inch Touchscreen", "M Sport Package"] },
      { name: "sDrive 20d M Sport", price: "₹52.50 Lakh", price_numeric: 5250000, fuel_type: "Diesel", transmission: "Automatic", features: ["Diesel Engine", "All M Sport Features"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.5L TwinPower Turbo (136 PS)" },
        { label: "Diesel", value: "2.0L TwinPower Turbo (150 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4500 mm" },
        { label: "Boot Space", value: "540 Litres" }
      ],
      performance: [
        { label: "0-100 kmph", value: "9.2 seconds (sDrive 18i)" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },

  // ============ MERCEDES-BENZ ============
  {
    slug: "mercedes-benz-c-class",
    name: "Mercedes-Benz C-Class",
    brand: "Mercedes-Benz",
    body_type: "Sedan",
    tagline: "The Best or Nothing",
    price_range: "₹57.00 - 66.00 Lakh",
    price_numeric: 5700000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: false,
    overview: "Luxury sedan with S-Class DNA.",
    key_highlights: ["MBUX Infotainment", "Digital Cockpit", "AMG Line"],
    pros: ["Premium luxury", "Smooth ride", "Brand prestige"],
    cons: ["Very expensive", "Firm suspension", "High maintenance"],
    competitors: ["BMW 3 Series", "Audi A4", "Lexus ES"],
    colors: [
      { name: "Polar White", hex: "#F5F5F5" },
      { name: "Obsidian Black", hex: "#1C1C1C" },
      { name: "Spectral Blue", hex: "#4169E1" }
    ],
    variants: [
      { name: "C 200", price: "₹57.00 Lakh", price_numeric: 5700000, fuel_type: "Petrol", transmission: "Automatic", features: ["MBUX", "LED Headlamps", "Ambient Lighting"] },
      { name: "C 300d AMG Line", price: "₹66.00 Lakh", price_numeric: 6600000, fuel_type: "Diesel", transmission: "Automatic", features: ["AMG Line", "Burmester Audio", "360 Camera"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.5L Turbo + Mild Hybrid (204 PS)" },
        { label: "Diesel", value: "2.0L Turbo (265 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4751 mm" },
        { label: "Boot Space", value: "455 Litres" }
      ],
      performance: [
        { label: "0-100 kmph", value: "5.9 seconds (C 300d)" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" }
      ]
    }
  },
  {
    slug: "mercedes-benz-gla",
    name: "Mercedes-Benz GLA",
    brand: "Mercedes-Benz",
    body_type: "Compact SUV",
    tagline: "The Original SUV",
    price_range: "₹50.50 - 56.90 Lakh",
    price_numeric: 5050000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: false,
    overview: "Entry-level Mercedes SUV with premium features.",
    key_highlights: ["MBUX", "Panoramic Sunroof", "Connected Car"],
    pros: ["Premium brand", "Compact size", "Feature loaded"],
    cons: ["Limited space", "Expensive", "Firm ride"],
    competitors: ["BMW X1", "Audi Q3", "Volvo XC40"],
    colors: [
      { name: "Polar White", hex: "#F5F5F5" },
      { name: "Cosmos Black", hex: "#1C1C1C" },
      { name: "Patagonia Red", hex: "#DC143C" }
    ],
    variants: [
      { name: "GLA 200", price: "₹50.50 Lakh", price_numeric: 5050000, fuel_type: "Petrol", transmission: "Automatic", features: ["MBUX", "Panoramic Sunroof", "LED Headlamps"] },
      { name: "GLA 220d 4MATIC", price: "₹56.90 Lakh", price_numeric: 5690000, fuel_type: "Diesel", transmission: "Automatic", features: ["4MATIC AWD", "Burmester Audio"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.3L Turbo (163 PS)" },
        { label: "Diesel", value: "2.0L Turbo (190 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4410 mm" },
        { label: "Boot Space", value: "421 Litres" }
      ],
      performance: [
        { label: "0-100 kmph", value: "8.7 seconds (GLA 200)" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" }
      ]
    }
  },

  // ============ AUDI ============
  {
    slug: "audi-a4",
    name: "Audi A4",
    brand: "Audi",
    body_type: "Sedan",
    tagline: "Vorsprung durch Technik",
    price_range: "₹45.34 - 50.34 Lakh",
    price_numeric: 4534000,
    fuel_types: ["Petrol"],
    transmission_types: ["Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: false,
    overview: "Premium sedan with quattro DNA.",
    key_highlights: ["Virtual Cockpit", "Matrix LED", "Quattro AWD"],
    pros: ["Build quality", "Technology", "All-wheel drive"],
    cons: ["Expensive", "No diesel", "Average rear space"],
    competitors: ["BMW 3 Series", "Mercedes C-Class", "Volvo S60"],
    colors: [
      { name: "Ibis White", hex: "#F5F5F5" },
      { name: "Mythos Black", hex: "#1C1C1C" },
      { name: "Manhattan Grey", hex: "#5A5A5A" }
    ],
    variants: [
      { name: "Premium Plus", price: "₹45.34 Lakh", price_numeric: 4534000, fuel_type: "Petrol", transmission: "Automatic", features: ["Virtual Cockpit", "LED Headlamps", "Audi Connect"] },
      { name: "Technology", price: "₹50.34 Lakh", price_numeric: 5034000, fuel_type: "Petrol", transmission: "Automatic", features: ["Matrix LED", "B&O Audio", "360 Camera"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "2.0L TFSI (190 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4762 mm" },
        { label: "Boot Space", value: "460 Litres" }
      ],
      performance: [
        { label: "0-100 kmph", value: "7.3 seconds" }
      ],
      safety: [
        { label: "Airbags", value: "8 Airbags" }
      ]
    }
  },
  {
    slug: "audi-q3",
    name: "Audi Q3",
    brand: "Audi",
    body_type: "Compact SUV",
    tagline: "The Q SUV",
    price_range: "₹44.89 - 50.89 Lakh",
    price_numeric: 4489000,
    fuel_types: ["Petrol"],
    transmission_types: ["Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: false,
    overview: "Premium compact SUV with quattro AWD.",
    key_highlights: ["Quattro AWD", "Virtual Cockpit", "Matrix LED"],
    pros: ["All-wheel drive", "Build quality", "Technology"],
    cons: ["Expensive", "Limited space", "No diesel"],
    competitors: ["BMW X1", "Mercedes GLA", "Volvo XC40"],
    colors: [
      { name: "Glacier White", hex: "#F5F5F5" },
      { name: "Mythos Black", hex: "#1C1C1C" },
      { name: "Turbo Blue", hex: "#4169E1" }
    ],
    variants: [
      { name: "Premium Plus", price: "₹44.89 Lakh", price_numeric: 4489000, fuel_type: "Petrol", transmission: "Automatic", features: ["Virtual Cockpit", "LED Headlamps"] },
      { name: "Technology", price: "₹50.89 Lakh", price_numeric: 5089000, fuel_type: "Petrol", transmission: "Automatic", features: ["Matrix LED", "B&O Audio", "Panoramic Sunroof"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "2.0L TFSI (190 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4484 mm" },
        { label: "Boot Space", value: "530 Litres" }
      ],
      performance: [
        { label: "0-100 kmph", value: "8.4 seconds" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },

  // ============ TOYOTA ============
  {
    slug: "toyota-innova-crysta",
    name: "Toyota Innova Crysta",
    brand: "Toyota",
    body_type: "MPV",
    tagline: "The Evergreen Leader",
    price_range: "₹19.99 - 26.30 Lakh",
    price_numeric: 1999000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "India's most trusted MPV for family travel.",
    key_highlights: ["7/8 Seater", "Toyota Reliability", "Diesel Power"],
    pros: ["Reliable", "Spacious", "Strong resale"],
    cons: ["Expensive", "Old design", "Basic features"],
    competitors: ["Kia Carens", "Maruti XL6"],
    colors: [
      { name: "Super White", hex: "#F5F5F5" },
      { name: "Attitude Black", hex: "#1C1C1C" },
      { name: "Silver Metallic", hex: "#C0C0C0" }
    ],
    variants: [
      { name: "GX Petrol", price: "₹19.99 Lakh", price_numeric: 1999000, fuel_type: "Petrol", transmission: "Manual", features: ["7 Airbags", "Touchscreen", "Rear AC"] },
      { name: "ZX Diesel AT", price: "₹26.30 Lakh", price_numeric: 2630000, fuel_type: "Diesel", transmission: "Automatic", features: ["Captain Seats", "Premium Audio", "All Features"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "2.7L VVT-i (166 PS)" },
        { label: "Diesel", value: "2.4L GD (150 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4735 mm" },
        { label: "Seating", value: "7/8 Seater" }
      ],
      performance: [
        { label: "Diesel Mileage", value: "11.36 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" }
      ]
    }
  },
  {
    slug: "toyota-fortuner",
    name: "Toyota Fortuner",
    brand: "Toyota",
    body_type: "Full-Size SUV",
    tagline: "Feel the Power",
    price_range: "₹33.43 - 51.44 Lakh",
    price_numeric: 3343000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "India's most aspirational SUV with legendary reliability.",
    key_highlights: ["4x4", "Ladder Frame", "204 PS Diesel", "Toyota Reliability"],
    pros: ["Bulletproof reliability", "Commanding presence", "Off-road capable"],
    cons: ["Expensive", "Poor mileage", "Dated interiors"],
    competitors: ["MG Gloster", "Ford Endeavour (Used)"],
    colors: [
      { name: "Pearl White", hex: "#F5F5F5" },
      { name: "Attitude Black", hex: "#1C1C1C" },
      { name: "Phantom Brown", hex: "#8B4513" }
    ],
    variants: [
      { name: "4x2 AT", price: "₹33.43 Lakh", price_numeric: 3343000, fuel_type: "Petrol", transmission: "Automatic", features: ["9 Airbags", "Ventilated Seats", "JBL Audio"] },
      { name: "Legender 4x4 AT", price: "₹51.44 Lakh", price_numeric: 5144000, fuel_type: "Diesel", transmission: "Automatic", features: ["4x4", "Legender Styling", "All Features"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "2.7L VVT-i (166 PS)" },
        { label: "Diesel", value: "2.8L GD (204 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4795 mm" },
        { label: "Seating", value: "7 Seater" }
      ],
      performance: [
        { label: "0-100 kmph", value: "10 seconds (Diesel)" }
      ],
      safety: [
        { label: "Airbags", value: "9 Airbags" }
      ]
    }
  },

  // ============ HONDA ============
  {
    slug: "honda-city",
    name: "Honda City",
    brand: "Honda",
    body_type: "Sedan",
    tagline: "City of Dreams",
    price_range: "₹11.82 - 16.35 Lakh",
    price_numeric: 1182000,
    fuel_types: ["Petrol", "Hybrid"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "Best-selling premium sedan with e:HEV technology.",
    key_highlights: ["e:HEV Hybrid", "Spacious Cabin", "Honda Reliability"],
    pros: ["Spacious", "Refined engine", "Strong resale"],
    cons: ["Premium pricing", "CVT only", "Average features"],
    competitors: ["Hyundai Verna", "Skoda Slavia", "Volkswagen Virtus"],
    colors: [
      { name: "Platinum White Pearl", hex: "#F5F5F5" },
      { name: "Crystal Black Pearl", hex: "#1C1C1C" },
      { name: "Radiant Red", hex: "#DC143C" }
    ],
    variants: [
      { name: "V", price: "₹11.82 Lakh", price_numeric: 1182000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "LED Headlamps", "LaneWatch Camera"] },
      { name: "ZX", price: "₹14.65 Lakh", price_numeric: 1465000, fuel_type: "Petrol", transmission: "Automatic", features: ["Sunroof", "8-inch Touchscreen", "Leather Seats"] },
      { name: "e:HEV ZX", price: "₹16.35 Lakh", price_numeric: 1635000, fuel_type: "Hybrid", transmission: "Automatic", features: ["Strong Hybrid", "Best-in-class Mileage"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.5L i-VTEC (121 PS)" },
        { label: "e:HEV", value: "1.5L Hybrid (126 PS combined)" }
      ],
      dimensions: [
        { label: "Length", value: "4549 mm" },
        { label: "Boot Space", value: "506 Litres" }
      ],
      performance: [
        { label: "e:HEV Mileage", value: "26.5 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  },

  // ============ MG ============
  {
    slug: "mg-hector",
    name: "MG Hector",
    brand: "MG",
    body_type: "Mid-Size SUV",
    tagline: "It's a Big Deal",
    price_range: "₹14.00 - 22.00 Lakh",
    price_numeric: 1400000,
    fuel_types: ["Petrol", "Diesel", "Hybrid"],
    transmission_types: ["Manual", "Automatic"],
    availability: "Ready Stock",
    is_hot: false, is_new: false, is_upcoming: false, is_bestseller: true,
    overview: "India's first connected car with massive touchscreen.",
    key_highlights: ["14-inch Touchscreen", "Connected Car", "Panoramic Sunroof"],
    pros: ["Feature loaded", "Spacious", "Good value"],
    cons: ["Average dynamics", "Build quality concerns", "Heavy steering"],
    competitors: ["Tata Harrier", "Mahindra XUV700", "Hyundai Alcazar"],
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Starry Black", hex: "#1C1C1C" },
      { name: "Glaze Red", hex: "#DC143C" }
    ],
    variants: [
      { name: "Style", price: "₹14.00 Lakh", price_numeric: 1400000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "10.4-inch Touchscreen", "LED Headlamps"] },
      { name: "Sharp Diesel DCT", price: "₹22.00 Lakh", price_numeric: 2200000, fuel_type: "Diesel", transmission: "Automatic", features: ["14-inch Touchscreen", "Panoramic Sunroof", "360 Camera"] }
    ],
    specifications: {
      engine: [
        { label: "Petrol", value: "1.5L Turbo (143 PS)" },
        { label: "Diesel", value: "2.0L Turbo (170 PS)" }
      ],
      dimensions: [
        { label: "Length", value: "4655 mm" },
        { label: "Boot Space", value: "587 Litres" }
      ],
      performance: [
        { label: "Diesel Mileage", value: "13.96 kmpl" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" }
      ]
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      cars_inserted: 0,
      colors_inserted: 0,
      variants_inserted: 0,
      specifications_inserted: 0,
      errors: [] as string[],
    };

    for (const carData of allCarsData) {
      try {
        // Check if car already exists
        const { data: existingCar } = await supabase
          .from("cars")
          .select("id")
          .eq("slug", carData.slug)
          .maybeSingle();

        let carId: string;

        if (existingCar) {
          carId = existingCar.id;
          // Update existing car
          await supabase
            .from("cars")
            .update({
              name: carData.name,
              brand: carData.brand,
              body_type: carData.body_type,
              tagline: carData.tagline,
              price_range: carData.price_range,
              price_numeric: carData.price_numeric,
              fuel_types: carData.fuel_types,
              transmission_types: carData.transmission_types,
              availability: carData.availability,
              is_hot: carData.is_hot,
              is_new: carData.is_new,
              is_upcoming: carData.is_upcoming,
              is_bestseller: carData.is_bestseller,
              overview: carData.overview,
              key_highlights: carData.key_highlights,
              pros: carData.pros,
              cons: carData.cons,
              competitors: carData.competitors,
              updated_at: new Date().toISOString(),
            })
            .eq("id", carId);
        } else {
          // Insert new car
          const { data: newCar, error: carError } = await supabase
            .from("cars")
            .insert({
              slug: carData.slug,
              name: carData.name,
              brand: carData.brand,
              body_type: carData.body_type,
              tagline: carData.tagline,
              price_range: carData.price_range,
              price_numeric: carData.price_numeric,
              fuel_types: carData.fuel_types,
              transmission_types: carData.transmission_types,
              availability: carData.availability,
              is_hot: carData.is_hot,
              is_new: carData.is_new,
              is_upcoming: carData.is_upcoming,
              is_bestseller: carData.is_bestseller,
              overview: carData.overview,
              key_highlights: carData.key_highlights,
              pros: carData.pros,
              cons: carData.cons,
              competitors: carData.competitors,
            })
            .select("id")
            .single();

          if (carError) {
            results.errors.push(`Car ${carData.slug}: ${carError.message}`);
            continue;
          }
          carId = newCar.id;
          results.cars_inserted++;
        }

        // Insert colors
        if (carData.colors && carData.colors.length > 0) {
          // Delete existing colors first
          await supabase.from("car_colors").delete().eq("car_id", carId);
          
          for (let i = 0; i < carData.colors.length; i++) {
            const color = carData.colors[i];
            const { error: colorError } = await supabase.from("car_colors").insert({
              car_id: carId,
              name: color.name,
              hex_code: color.hex,
              sort_order: i,
            });
            if (!colorError) results.colors_inserted++;
          }
        }

        // Insert variants
        if (carData.variants && carData.variants.length > 0) {
          // Delete existing variants first
          await supabase.from("car_variants").delete().eq("car_id", carId);
          
          for (let i = 0; i < carData.variants.length; i++) {
            const variant = carData.variants[i];
            const { error: variantError } = await supabase.from("car_variants").insert({
              car_id: carId,
              name: variant.name,
              price: variant.price,
              price_numeric: variant.price_numeric,
              fuel_type: variant.fuel_type,
              transmission: variant.transmission,
              features: variant.features,
              sort_order: i,
            });
            if (!variantError) results.variants_inserted++;
          }
        }

        // Insert specifications
        if (carData.specifications) {
          // Delete existing specs first
          await supabase.from("car_specifications").delete().eq("car_id", carId);
          
          const specCategories = Object.entries(carData.specifications);
          for (const [category, specs] of specCategories) {
            if (Array.isArray(specs)) {
              for (let i = 0; i < specs.length; i++) {
                const spec = specs[i] as { label: string; value: string };
                const { error: specError } = await supabase.from("car_specifications").insert({
                  car_id: carId,
                  category: category.charAt(0).toUpperCase() + category.slice(1),
                  label: spec.label,
                  value: spec.value,
                  sort_order: i,
                });
                if (!specError) results.specifications_inserted++;
              }
            }
          }
        }
      } catch (err) {
        results.errors.push(`Car ${carData.slug}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Car data migration completed",
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});