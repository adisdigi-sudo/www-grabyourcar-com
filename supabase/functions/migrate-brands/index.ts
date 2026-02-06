import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complete Kia car data
const kiaCars = [
  {
    name: "Kia Seltos",
    brand: "Kia",
    slug: "kia-seltos",
    body_type: "Compact SUV",
    tagline: "The Badass SUV",
    price_range: "₹10.90 - 20.35 Lakh",
    price_numeric: 1090000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "iMT"],
    is_hot: true,
    is_new: true,
    is_bestseller: true,
    overview: "The 2024 Kia Seltos is a feature-loaded compact SUV with bold design, ADAS safety, and multiple powertrain options.",
    key_highlights: ["ADAS Level 2 Safety", "10.25-inch Dual Screens", "Panoramic Sunroof", "Ventilated Front Seats", "Bose 8-Speaker Sound", "360-Degree Camera"],
    variants: [
      { name: "HTE", price: "₹10.90 Lakh", price_numeric: 1090000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "ABS", "Manual AC"] },
      { name: "HTK", price: "₹12.50 Lakh", price_numeric: 1250000, fuel_type: "Petrol", transmission: "Manual", features: ["8-inch Screen", "Rear AC", "LED DRLs"] },
      { name: "HTK+", price: "₹14.50 Lakh", price_numeric: 1450000, fuel_type: "Petrol", transmission: "iMT", features: ["Sunroof", "Wireless Charger", "Auto Climate"] },
      { name: "HTX", price: "₹16.50 Lakh", price_numeric: 1650000, fuel_type: "Petrol", transmission: "Automatic", features: ["10.25 Screens", "Ventilated Seats", "ADAS Level 1"] },
      { name: "GTX+", price: "₹18.50 Lakh", price_numeric: 1850000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 2", "Bose Sound", "360 Camera"] },
      { name: "X-Line", price: "₹20.35 Lakh", price_numeric: 2035000, fuel_type: "Diesel", transmission: "Automatic", features: ["X-Line Styling", "Premium Interior", "All Features"] }
    ],
    colors: [
      { name: "Intense Red", hex_code: "#B22222", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter.jpeg" },
      { name: "Aurora Black Pearl", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Glacier White Pearl", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Gravity Grey", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Imperial Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter-6.jpeg" },
      { name: "Pewter Olive", hex_code: "#5C5346", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter-7.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.5L Petrol / 1.5L Turbo / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "113 bhp / 158 bhp / 114 bhp" },
      { category: "Engine", label: "Max Torque", value: "144 Nm / 253 Nm / 250 Nm" },
      { category: "Engine", label: "Displacement", value: "1497 cc" },
      { category: "Dimensions", label: "Length", value: "4365 mm" },
      { category: "Dimensions", label: "Width", value: "1800 mm" },
      { category: "Dimensions", label: "Height", value: "1645 mm" },
      { category: "Dimensions", label: "Wheelbase", value: "2610 mm" },
      { category: "Dimensions", label: "Boot Space", value: "433 L" },
      { category: "Performance", label: "Mileage (Petrol)", value: "17 kmpl" },
      { category: "Performance", label: "Mileage (Diesel)", value: "21 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2 - 16 Features" },
      { category: "Safety", feature_name: "5 Star ANCAP Rating" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Infotainment", feature_name: "Bose 8-Speaker Sound" },
      { category: "Comfort", feature_name: "Ventilated Front Seats" },
      { category: "Comfort", feature_name: "Panoramic Sunroof" },
      { category: "Technology", feature_name: "360-Degree Camera" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter.jpeg"
  },
  {
    name: "Kia Sonet",
    brand: "Kia",
    slug: "kia-sonet",
    body_type: "Compact SUV",
    tagline: "The Wild. The Classy.",
    price_range: "₹7.99 - 15.69 Lakh",
    price_numeric: 799000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "iMT"],
    is_hot: true,
    is_new: false,
    is_bestseller: true,
    overview: "The Kia Sonet is a stylish compact SUV with segment-first features, powerful engines, and bold design.",
    key_highlights: ["10.25-inch Touchscreen", "Bose Premium Sound", "Electric Sunroof", "Ventilated Front Seats", "UVO Connected Car", "1.0L Turbo with DCT"],
    variants: [
      { name: "HTE", price: "₹7.99 Lakh", price_numeric: 799000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "ABS", "Power Windows"] },
      { name: "HTK", price: "₹9.50 Lakh", price_numeric: 950000, fuel_type: "Petrol", transmission: "Manual", features: ["Touchscreen", "Rear AC", "Central Locking"] },
      { name: "HTK+", price: "₹11.50 Lakh", price_numeric: 1150000, fuel_type: "Petrol", transmission: "iMT", features: ["Sunroof", "Wireless Charger", "Auto Climate"] },
      { name: "HTX", price: "₹13.00 Lakh", price_numeric: 1300000, fuel_type: "Diesel", transmission: "Automatic", features: ["10.25 Screen", "Ventilated Seats", "LED Lamps"] },
      { name: "GTX+", price: "₹15.69 Lakh", price_numeric: 1569000, fuel_type: "Diesel", transmission: "Automatic", features: ["Bose Sound", "Air Purifier", "Premium Interior"] }
    ],
    colors: [
      { name: "Intense Red", hex_code: "#B22222", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-right-front-three-quarter-7.jpeg" },
      { name: "Aurora Black Pearl", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Glacier White Pearl", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Gravity Grey", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Imperial Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-right-front-three-quarter-6.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.2L Petrol / 1.0L Turbo / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "82 bhp / 118 bhp / 113 bhp" },
      { category: "Engine", label: "Max Torque", value: "115 Nm / 172 Nm / 250 Nm" },
      { category: "Dimensions", label: "Length", value: "3995 mm" },
      { category: "Dimensions", label: "Width", value: "1790 mm" },
      { category: "Dimensions", label: "Height", value: "1642 mm" },
      { category: "Dimensions", label: "Boot Space", value: "392 L" },
      { category: "Performance", label: "Mileage (Petrol)", value: "18.4 kmpl" },
      { category: "Performance", label: "Mileage (Diesel)", value: "24.1 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ESC Standard" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Infotainment", feature_name: "Bose 7-Speaker Sound" },
      { category: "Comfort", feature_name: "Ventilated Front Seats" },
      { category: "Technology", feature_name: "UVO Connected Car" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-right-front-three-quarter-7.jpeg"
  },
  {
    name: "Kia Carens",
    brand: "Kia",
    slug: "kia-carens",
    body_type: "MPV",
    tagline: "The Recreational Vehicle",
    price_range: "₹10.52 - 19.67 Lakh",
    price_numeric: 1052000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: false,
    is_bestseller: false,
    overview: "The Kia Carens is a 6/7-seater recreational vehicle with premium features, powerful engines, and spacious interiors.",
    key_highlights: ["6/7 Seater Options", "10.25-inch Touchscreen", "Bose 8-Speaker Sound", "One-Touch Tumble Seats", "64-Color Ambient Lighting", "Ventilated Seats"],
    variants: [
      { name: "Premium", price: "₹10.52 Lakh", price_numeric: 1052000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "8-inch Screen", "Manual AC"] },
      { name: "Prestige", price: "₹13.00 Lakh", price_numeric: 1300000, fuel_type: "Petrol", transmission: "Manual", features: ["Sunroof", "10.25 Screen", "Auto Climate"] },
      { name: "Prestige Plus", price: "₹15.50 Lakh", price_numeric: 1550000, fuel_type: "Diesel", transmission: "Manual", features: ["Ventilated Seats", "One-Touch Tumble"] },
      { name: "Luxury", price: "₹17.50 Lakh", price_numeric: 1750000, fuel_type: "Diesel", transmission: "Automatic", features: ["Bose Sound", "64-Color Ambient", "Premium Interior"] },
      { name: "Luxury Plus", price: "₹19.67 Lakh", price_numeric: 1967000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS", "360 Camera", "All Features"] }
    ],
    colors: [
      { name: "Imperial Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Sparkling Silver", hex_code: "#A8A9AD", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Glacier White Pearl", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Aurora Black Pearl", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-right-front-three-quarter-6.jpeg" },
      { name: "Intense Red", hex_code: "#B22222", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-right-front-three-quarter-7.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.5L Petrol / 1.5L Turbo / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "113 bhp / 158 bhp / 113 bhp" },
      { category: "Engine", label: "Max Torque", value: "144 Nm / 253 Nm / 250 Nm" },
      { category: "Dimensions", label: "Length", value: "4540 mm" },
      { category: "Dimensions", label: "Width", value: "1800 mm" },
      { category: "Dimensions", label: "Height", value: "1700 mm" },
      { category: "Dimensions", label: "Wheelbase", value: "2780 mm" },
      { category: "Performance", label: "Mileage (Diesel)", value: "21.3 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "3 Star GNCAP" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Infotainment", feature_name: "Bose 8-Speaker Sound" },
      { category: "Comfort", feature_name: "One-Touch Tumble Seats" },
      { category: "Comfort", feature_name: "64-Color Ambient Lighting" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-right-front-three-quarter-3.jpeg"
  },
  {
    name: "Kia EV6",
    brand: "Kia",
    slug: "kia-ev6",
    body_type: "Electric SUV",
    tagline: "Movement that Inspires",
    price_range: "₹60.97 - 65.97 Lakh",
    price_numeric: 6097000,
    fuel_types: ["Electric"],
    transmission_types: ["Automatic"],
    is_hot: false,
    is_new: false,
    is_limited: true,
    overview: "The Kia EV6 is a premium electric crossover with futuristic design, ultra-fast charging, and high-performance drivetrain.",
    key_highlights: ["800V Ultra-Fast Charging", "77.4 kWh Battery Pack", "528 km Range (ARAI)", "Vehicle-to-Load (V2L)", "Dual 12.3-inch Screens", "AWD with 325 bhp"],
    variants: [
      { name: "GT-Line RWD", price: "₹60.97 Lakh", price_numeric: 6097000, fuel_type: "Electric", transmission: "Automatic", features: ["77.4 kWh", "RWD", "ADAS", "V2L"] },
      { name: "GT-Line AWD", price: "₹65.97 Lakh", price_numeric: 6597000, fuel_type: "Electric", transmission: "Automatic", features: ["AWD", "325 bhp", "Premium Interior", "All Features"] }
    ],
    colors: [
      { name: "Moonscape", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Snow White Pearl", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Yacht Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Runway Red", hex_code: "#B22222", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-exterior-right-front-three-quarter-6.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Motor Type", value: "Permanent Magnet Synchronous (Dual)" },
      { category: "Engine", label: "Max Power", value: "325 bhp (AWD)" },
      { category: "Engine", label: "Max Torque", value: "605 Nm" },
      { category: "Engine", label: "Battery", value: "77.4 kWh Lithium-ion" },
      { category: "Dimensions", label: "Length", value: "4695 mm" },
      { category: "Dimensions", label: "Width", value: "1890 mm" },
      { category: "Dimensions", label: "Height", value: "1550 mm" },
      { category: "Performance", label: "Range (ARAI)", value: "528 km" },
      { category: "Performance", label: "0-100 kmph", value: "5.2 sec (AWD)" },
      { category: "Performance", label: "Fast Charging", value: "10-80% in 18 min" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2 - 21 Features" },
      { category: "Safety", feature_name: "5 Star Euro NCAP" },
      { category: "Technology", feature_name: "800V Ultra-Fast Charging" },
      { category: "Technology", feature_name: "Vehicle-to-Load (V2L)" },
      { category: "Infotainment", feature_name: "Dual 12.3-inch Screens" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-exterior-right-front-three-quarter-3.jpeg"
  },
  {
    name: "Kia Carnival",
    brand: "Kia",
    slug: "kia-carnival",
    body_type: "Premium MPV",
    tagline: "The Grand Carnival",
    price_range: "₹63.90 Lakh",
    price_numeric: 6390000,
    fuel_types: ["Diesel"],
    transmission_types: ["Automatic"],
    is_hot: false,
    is_new: true,
    is_limited: true,
    overview: "The 2024 Kia Carnival is a premium 7-seater luxury MPV with first-class seats, powerful diesel engine, and loaded features.",
    key_highlights: ["VIP Lounge Seats", "Dual 12.3-inch Screens", "Smart Power Sliding Doors", "Bose 12-Speaker Sound", "Dual Sunroof", "ADAS Level 2"],
    variants: [
      { name: "Limousine Plus", price: "₹63.90 Lakh", price_numeric: 6390000, fuel_type: "Diesel", transmission: "Automatic", features: ["VIP Seats", "ADAS", "All Features"] }
    ],
    colors: [
      { name: "Aurora Black Pearl", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/165573/carnival-exterior-right-front-three-quarter.jpeg" },
      { name: "Glacier White Pearl", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/165573/carnival-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Panthera Metal", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/165573/carnival-exterior-right-front-three-quarter-4.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "2.2L Smartstream Diesel" },
      { category: "Engine", label: "Max Power", value: "193 bhp" },
      { category: "Engine", label: "Max Torque", value: "441 Nm" },
      { category: "Dimensions", label: "Length", value: "5155 mm" },
      { category: "Dimensions", label: "Width", value: "1995 mm" },
      { category: "Dimensions", label: "Height", value: "1775 mm" },
      { category: "Performance", label: "Mileage", value: "13.9 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "8 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2" },
      { category: "Comfort", feature_name: "VIP Lounge Seats" },
      { category: "Comfort", feature_name: "Smart Power Sliding Doors" },
      { category: "Infotainment", feature_name: "Bose 12-Speaker Sound" },
      { category: "Infotainment", feature_name: "Dual 12.3-inch Screens" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/165573/carnival-exterior-right-front-three-quarter.jpeg"
  },
  {
    name: "Kia Syros",
    brand: "Kia",
    slug: "kia-syros",
    body_type: "Compact SUV",
    tagline: "The Compact Powerhouse",
    price_range: "₹9.00 - 15.00 Lakh (est.)",
    price_numeric: 900000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: true,
    is_upcoming: true,
    overview: "The Kia Syros is a new compact SUV positioned between Sonet and Seltos with boxy design and premium features.",
    key_highlights: ["Boxy SUV Design", "ADAS Safety Features", "Panoramic Sunroof", "Dual 10.25-inch Screens", "Ventilated Front Seats", "Level 2 ADAS"],
    variants: [
      { name: "HTE", price: "₹9.00 Lakh (est.)", price_numeric: 900000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "ABS", "Power Windows"] },
      { name: "HTK+", price: "₹11.00 Lakh (est.)", price_numeric: 1100000, fuel_type: "Petrol", transmission: "Manual", features: ["Sunroof", "Touchscreen", "Auto Climate"] },
      { name: "HTX+", price: "₹13.00 Lakh (est.)", price_numeric: 1300000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 1", "Dual Screens", "Ventilated Seats"] },
      { name: "GTX+", price: "₹15.00 Lakh (est.)", price_numeric: 1500000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 2", "All Features", "Premium Interior"] }
    ],
    colors: [
      { name: "White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/176213/syros-exterior-right-front-three-quarter.jpeg" },
      { name: "Black", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/176213/syros-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/176213/syros-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Grey", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/176213/syros-exterior-right-front-three-quarter-5.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.0L Turbo Petrol / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "118 bhp / 113 bhp" },
      { category: "Engine", label: "Max Torque", value: "172 Nm / 250 Nm" },
      { category: "Dimensions", label: "Length", value: "4100 mm (est.)" },
      { category: "Dimensions", label: "Width", value: "1800 mm (est.)" },
      { category: "Dimensions", label: "Height", value: "1665 mm (est.)" },
      { category: "Performance", label: "Mileage (Petrol)", value: "17 kmpl (est.)" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2" },
      { category: "Infotainment", feature_name: "Dual 10.25-inch Screens" },
      { category: "Comfort", feature_name: "Panoramic Sunroof" },
      { category: "Comfort", feature_name: "Ventilated Front Seats" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/176213/syros-exterior-right-front-three-quarter.jpeg"
  }
];

// Complete Tata car data
const tataCars = [
  {
    name: "Tata Nexon",
    brand: "Tata",
    slug: "tata-nexon",
    body_type: "Compact SUV",
    tagline: "Made of Dark",
    price_range: "₹8.10 - 15.50 Lakh",
    price_numeric: 810000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "AMT"],
    is_hot: true,
    is_new: true,
    is_bestseller: true,
    overview: "The Tata Nexon is India's safest and best-selling compact SUV with 5-star GNCAP rating, multiple powertrains, and feature-packed variants.",
    key_highlights: ["5-Star Global NCAP Rating", "10.25-inch Touchscreen", "360-Degree Camera", "Ventilated Front Seats", "Electric Sunroof", "Connected Car Tech"],
    variants: [
      { name: "Smart", price: "₹8.10 Lakh", price_numeric: 810000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "ABS", "Manual AC"] },
      { name: "Smart+", price: "₹9.50 Lakh", price_numeric: 950000, fuel_type: "Petrol", transmission: "Manual", features: ["10.25 Screen", "Auto Climate", "LED DRLs"] },
      { name: "Pure+", price: "₹10.80 Lakh", price_numeric: 1080000, fuel_type: "Petrol", transmission: "AMT", features: ["Sunroof", "Cruise Control", "Rear AC"] },
      { name: "Creative", price: "₹12.50 Lakh", price_numeric: 1250000, fuel_type: "Diesel", transmission: "AMT", features: ["360 Camera", "Ventilated Seats", "iRA"] },
      { name: "Fearless+", price: "₹15.50 Lakh", price_numeric: 1550000, fuel_type: "Diesel", transmission: "Automatic", features: ["JBL Sound", "Air Purifier", "Premium Interior"] }
    ],
    colors: [
      { name: "Flame Red", hex_code: "#C41E3A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-71.jpeg" },
      { name: "Creative Ocean", hex_code: "#1E4D6B", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-72.jpeg" },
      { name: "Fearless Purple", hex_code: "#6B3FA0", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-73.jpeg" },
      { name: "Pristine White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-74.jpeg" },
      { name: "Pure Grey", hex_code: "#808080", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-75.jpeg" },
      { name: "Daytona Grey", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-76.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.2L Turbo Petrol / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "118 bhp / 113 bhp" },
      { category: "Engine", label: "Max Torque", value: "170 Nm / 260 Nm" },
      { category: "Dimensions", label: "Length", value: "3995 mm" },
      { category: "Dimensions", label: "Width", value: "1804 mm" },
      { category: "Dimensions", label: "Height", value: "1620 mm" },
      { category: "Dimensions", label: "Boot Space", value: "382 L" },
      { category: "Performance", label: "Mileage (Petrol)", value: "17.4 kmpl" },
      { category: "Performance", label: "Mileage (Diesel)", value: "24.1 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Safety", feature_name: "ESP Standard" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Infotainment", feature_name: "JBL 9-Speaker Sound" },
      { category: "Comfort", feature_name: "Ventilated Front Seats" },
      { category: "Technology", feature_name: "iRA Connected Car" },
      { category: "Technology", feature_name: "360-Degree Camera" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-71.jpeg"
  },
  {
    name: "Tata Punch",
    brand: "Tata",
    slug: "tata-punch",
    body_type: "Micro SUV",
    tagline: "Pack a Punch",
    price_range: "₹6.13 - 10.20 Lakh",
    price_numeric: 613000,
    fuel_types: ["Petrol", "CNG"],
    transmission_types: ["Manual", "AMT"],
    is_hot: true,
    is_new: false,
    is_bestseller: true,
    overview: "The Tata Punch is a micro SUV with 5-star safety rating, high ground clearance, and SUV-like stance in a compact package.",
    key_highlights: ["5-Star Global NCAP Rating", "190mm Ground Clearance", "7-inch Touchscreen", "90-Degree Door Opening", "iRA Connected Car", "Terrain Modes"],
    variants: [
      { name: "Pure", price: "₹6.13 Lakh", price_numeric: 613000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "ABS", "Manual AC"] },
      { name: "Adventure", price: "₹7.30 Lakh", price_numeric: 730000, fuel_type: "Petrol", transmission: "Manual", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "Accomplished", price: "₹8.50 Lakh", price_numeric: 850000, fuel_type: "Petrol", transmission: "AMT", features: ["Auto Climate", "Push Button Start"] },
      { name: "Creative", price: "₹10.20 Lakh", price_numeric: 1020000, fuel_type: "Petrol", transmission: "AMT", features: ["Sunroof", "6 Airbags", "iRA Connect"] }
    ],
    colors: [
      { name: "Meteor Bronze", hex_code: "#8B7355", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-right-front-three-quarter-101.jpeg" },
      { name: "Tornado Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-right-front-three-quarter-102.jpeg" },
      { name: "Atomic Orange", hex_code: "#FF6B35", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-right-front-three-quarter-103.jpeg" },
      { name: "Orcus White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-right-front-three-quarter-104.jpeg" },
      { name: "Calypso Red", hex_code: "#9B2335", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-right-front-three-quarter-105.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.2L Revotron Petrol / 1.2L CNG" },
      { category: "Engine", label: "Max Power", value: "86 bhp / 72 bhp" },
      { category: "Engine", label: "Max Torque", value: "113 Nm / 95 Nm" },
      { category: "Dimensions", label: "Length", value: "3827 mm" },
      { category: "Dimensions", label: "Width", value: "1742 mm" },
      { category: "Dimensions", label: "Height", value: "1615 mm" },
      { category: "Dimensions", label: "Boot Space", value: "366 L" },
      { category: "Performance", label: "Mileage", value: "18.8 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Infotainment", feature_name: "7-inch Touchscreen" },
      { category: "Comfort", feature_name: "90-Degree Door Opening" },
      { category: "Technology", feature_name: "Terrain Modes" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-right-front-three-quarter-101.jpeg"
  },
  {
    name: "Tata Harrier",
    brand: "Tata",
    slug: "tata-harrier",
    body_type: "Mid-Size SUV",
    tagline: "Above All",
    price_range: "₹15.49 - 26.44 Lakh",
    price_numeric: 1549000,
    fuel_types: ["Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: true,
    is_bestseller: false,
    overview: "The 2024 Tata Harrier facelift is a premium SUV with bold design, ADAS safety, and powerful Kryotec diesel engine.",
    key_highlights: ["ADAS Level 2 - 21 Features", "12.3-inch Touchscreen", "Panoramic Sunroof", "JBL 10-Speaker Sound", "360-Degree Camera", "Flush Door Handles"],
    variants: [
      { name: "Smart", price: "₹15.49 Lakh", price_numeric: 1549000, fuel_type: "Diesel", transmission: "Manual", features: ["6 Airbags", "10.25 Screen", "Auto Climate"] },
      { name: "Pure+", price: "₹17.80 Lakh", price_numeric: 1780000, fuel_type: "Diesel", transmission: "Manual", features: ["Panoramic Sunroof", "Wireless Charger"] },
      { name: "Adventure+", price: "₹20.50 Lakh", price_numeric: 2050000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 1", "360 Camera", "iRA 2.0"] },
      { name: "Fearless+", price: "₹26.44 Lakh", price_numeric: 2644000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 2", "JBL Sound", "Air Purifier"] }
    ],
    colors: [
      { name: "Ash Grey", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-right-front-three-quarter.jpeg" },
      { name: "Coral Red", hex_code: "#C41E3A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Summit Gold", hex_code: "#C5A572", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Stellar Frost", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Sunlit Bronze", hex_code: "#8B7355", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-right-front-three-quarter-6.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "2.0L Kryotec Diesel" },
      { category: "Engine", label: "Max Power", value: "168 bhp" },
      { category: "Engine", label: "Max Torque", value: "350 Nm" },
      { category: "Dimensions", label: "Length", value: "4605 mm" },
      { category: "Dimensions", label: "Width", value: "1965 mm" },
      { category: "Dimensions", label: "Height", value: "1786 mm" },
      { category: "Dimensions", label: "Boot Space", value: "425 L" },
      { category: "Performance", label: "Mileage", value: "14.6 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2 - 21 Features" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Infotainment", feature_name: "12.3-inch Touchscreen" },
      { category: "Infotainment", feature_name: "JBL 10-Speaker Sound" },
      { category: "Comfort", feature_name: "Panoramic Sunroof" },
      { category: "Technology", feature_name: "iRA 2.0 Connected" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-right-front-three-quarter.jpeg"
  },
  {
    name: "Tata Safari",
    brand: "Tata",
    slug: "tata-safari",
    body_type: "Full-Size SUV",
    tagline: "Reclaim Your Life",
    price_range: "₹16.19 - 27.34 Lakh",
    price_numeric: 1619000,
    fuel_types: ["Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: true,
    overview: "The 2024 Tata Safari facelift is a 6/7-seater flagship SUV with ADAS, premium interiors, and commanding road presence.",
    key_highlights: ["6/7 Seater Options", "ADAS Level 2", "12.3-inch Touchscreen", "Panoramic Sunroof", "Ventilated Front Seats", "Boss Mode 2.0"],
    variants: [
      { name: "Smart", price: "₹16.19 Lakh", price_numeric: 1619000, fuel_type: "Diesel", transmission: "Manual", features: ["6 Airbags", "Touchscreen", "Manual AC"] },
      { name: "Pure+", price: "₹18.80 Lakh", price_numeric: 1880000, fuel_type: "Diesel", transmission: "Manual", features: ["Sunroof", "Boss Mode", "Auto Climate"] },
      { name: "Adventure+", price: "₹22.50 Lakh", price_numeric: 2250000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 1", "360 Camera", "iRA 2.0"] },
      { name: "Accomplished+", price: "₹27.34 Lakh", price_numeric: 2734000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 2", "JBL Sound", "Ventilated Seats"] }
    ],
    colors: [
      { name: "Stardust Ash", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-exterior-right-front-three-quarter.jpeg" },
      { name: "Orcus White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Cosmic Gold", hex_code: "#C5A572", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Oberon Black", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-exterior-right-front-three-quarter-5.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "2.0L Kryotec Diesel" },
      { category: "Engine", label: "Max Power", value: "168 bhp" },
      { category: "Engine", label: "Max Torque", value: "350 Nm" },
      { category: "Dimensions", label: "Length", value: "4661 mm" },
      { category: "Dimensions", label: "Width", value: "1894 mm" },
      { category: "Dimensions", label: "Height", value: "1786 mm" },
      { category: "Dimensions", label: "Boot Space", value: "447 L (7-seat)" },
      { category: "Performance", label: "Mileage", value: "14.5 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "7 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2 - 21 Features" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Infotainment", feature_name: "12.3-inch Touchscreen" },
      { category: "Infotainment", feature_name: "JBL 10-Speaker Sound" },
      { category: "Comfort", feature_name: "Boss Mode 2.0" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-exterior-right-front-three-quarter.jpeg"
  },
  {
    name: "Tata Altroz",
    brand: "Tata",
    slug: "tata-altroz",
    body_type: "Premium Hatchback",
    tagline: "The Gold Standard",
    price_range: "₹6.60 - 10.74 Lakh",
    price_numeric: 660000,
    fuel_types: ["Petrol", "Diesel", "CNG"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: false,
    is_new: false,
    overview: "The Tata Altroz is a premium hatchback with 5-star safety rating, multiple engine options, and segment-leading features.",
    key_highlights: ["5-Star Global NCAP Rating", "10.25-inch Touchscreen", "1.2L Turbo Petrol Engine", "iRA Connected Car", "Premium Harman Sound", "Diesel & CNG Options"],
    variants: [
      { name: "XE", price: "₹6.60 Lakh", price_numeric: 660000, fuel_type: "Petrol", transmission: "Manual", features: ["Dual Airbags", "Manual AC", "ABS"] },
      { name: "XM", price: "₹7.50 Lakh", price_numeric: 750000, fuel_type: "Petrol", transmission: "Manual", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "XZ", price: "₹8.80 Lakh", price_numeric: 880000, fuel_type: "Petrol", transmission: "Manual", features: ["Auto Climate", "LED DRLs", "Alloys"] },
      { name: "XZ+", price: "₹10.74 Lakh", price_numeric: 1074000, fuel_type: "Petrol", transmission: "Automatic", features: ["Sunroof", "iRA Connect", "Ventilated Seats"] }
    ],
    colors: [
      { name: "Harbour Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-exterior-right-front-three-quarter-11.jpeg" },
      { name: "High Street Gold", hex_code: "#C5A572", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-exterior-right-front-three-quarter-12.jpeg" },
      { name: "Downtown Red", hex_code: "#9B2335", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-exterior-right-front-three-quarter-13.jpeg" },
      { name: "Avenue White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-exterior-right-front-three-quarter-14.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.2L Petrol / 1.2L Turbo / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "86 bhp / 118 bhp / 89 bhp" },
      { category: "Engine", label: "Max Torque", value: "113 Nm / 170 Nm / 200 Nm" },
      { category: "Dimensions", label: "Length", value: "3990 mm" },
      { category: "Dimensions", label: "Width", value: "1755 mm" },
      { category: "Dimensions", label: "Height", value: "1523 mm" },
      { category: "Dimensions", label: "Boot Space", value: "345 L" },
      { category: "Performance", label: "Mileage", value: "19.3 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Infotainment", feature_name: "Harman Premium Sound" },
      { category: "Technology", feature_name: "iRA Connected Car" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-exterior-right-front-three-quarter-11.jpeg"
  },
  {
    name: "Tata Curvv",
    brand: "Tata",
    slug: "tata-curvv",
    body_type: "Coupe SUV",
    tagline: "Create Your Curve",
    price_range: "₹10.00 - 19.00 Lakh",
    price_numeric: 1000000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: true,
    overview: "The Tata Curvv is India's first mass-market coupe SUV with stunning design, ADAS safety, and powerful engine options.",
    key_highlights: ["Coupe SUV Design", "ADAS Level 2", "12.3-inch Touchscreen", "Panoramic Sunroof", "Flush Door Handles", "Ventilated Seats"],
    variants: [
      { name: "Smart", price: "₹10.00 Lakh", price_numeric: 1000000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "Touchscreen", "LED DRLs"] },
      { name: "Pure+", price: "₹12.50 Lakh", price_numeric: 1250000, fuel_type: "Petrol", transmission: "Manual", features: ["Sunroof", "Digital Cluster", "Auto Climate"] },
      { name: "Creative+", price: "₹15.00 Lakh", price_numeric: 1500000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 1", "360 Camera", "Ventilated Seats"] },
      { name: "Accomplished S", price: "₹19.00 Lakh", price_numeric: 1900000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 2", "JBL Sound", "All Features"] }
    ],
    colors: [
      { name: "Virtual Sunrise", hex_code: "#FF6B35", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/169169/curvv-exterior-right-front-three-quarter.jpeg" },
      { name: "Pristine White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/169169/curvv-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Flame Red", hex_code: "#C41E3A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/169169/curvv-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Cosmic Gold", hex_code: "#C5A572", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/169169/curvv-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Ash Grey", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/169169/curvv-exterior-right-front-three-quarter-6.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.2L Turbo Petrol / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "125 bhp / 118 bhp" },
      { category: "Engine", label: "Max Torque", value: "225 Nm / 260 Nm" },
      { category: "Dimensions", label: "Length", value: "4310 mm" },
      { category: "Dimensions", label: "Width", value: "1810 mm" },
      { category: "Dimensions", label: "Height", value: "1630 mm" },
      { category: "Dimensions", label: "Boot Space", value: "500 L" },
      { category: "Performance", label: "Mileage", value: "18 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2" },
      { category: "Infotainment", feature_name: "12.3-inch Touchscreen" },
      { category: "Infotainment", feature_name: "JBL 10-Speaker Sound" },
      { category: "Exterior", feature_name: "Flush Door Handles" },
      { category: "Comfort", feature_name: "Panoramic Sunroof" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/169169/curvv-exterior-right-front-three-quarter.jpeg"
  }
];

// Complete Mahindra car data
const mahindraCars = [
  {
    name: "Mahindra XUV700",
    brand: "Mahindra",
    slug: "mahindra-xuv700",
    body_type: "Mid-Size SUV",
    tagline: "The World of SUVs",
    price_range: "₹14.00 - 26.99 Lakh",
    price_numeric: 1400000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: false,
    is_bestseller: true,
    overview: "The Mahindra XUV700 is a feature-packed SUV with ADAS safety, powerful engines, and available in 5 and 7-seater configurations.",
    key_highlights: ["ADAS Level 1 Safety", "Dual 10.25-inch Screens", "AdrenoX Connected Car", "200 bhp Turbo Petrol", "185 bhp Diesel Engine", "AWD with 4 Modes"],
    variants: [
      { name: "MX", price: "₹14.00 Lakh", price_numeric: 1400000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "8-inch Screen", "Manual AC"] },
      { name: "AX3", price: "₹16.50 Lakh", price_numeric: 1650000, fuel_type: "Diesel", transmission: "Manual", features: ["10.25 Dual Screens", "Auto Climate", "AdrenoX"] },
      { name: "AX5", price: "₹18.80 Lakh", price_numeric: 1880000, fuel_type: "Diesel", transmission: "Automatic", features: ["Sunroof", "Wireless Charger", "360 Camera"] },
      { name: "AX7", price: "₹22.50 Lakh", price_numeric: 2250000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS", "Sony Sound", "Ventilated Seats"] },
      { name: "AX7 AWD", price: "₹26.99 Lakh", price_numeric: 2699000, fuel_type: "Diesel", transmission: "Automatic", features: ["AWD System", "Terrain Modes", "Premium Interior"] }
    ],
    colors: [
      { name: "Everest White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Midnight Black", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Electric Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Dazzling Silver", hex_code: "#A8A9AD", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-right-front-three-quarter-6.jpeg" },
      { name: "Red Rage", hex_code: "#C41E3A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-right-front-three-quarter-7.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "2.0L Turbo Petrol / 2.2L Diesel" },
      { category: "Engine", label: "Max Power", value: "200 bhp / 185 bhp" },
      { category: "Engine", label: "Max Torque", value: "380 Nm / 450 Nm (AT)" },
      { category: "Dimensions", label: "Length", value: "4695 mm" },
      { category: "Dimensions", label: "Width", value: "1890 mm" },
      { category: "Dimensions", label: "Height", value: "1755 mm" },
      { category: "Dimensions", label: "Boot Space", value: "225 L (7-seat)" },
      { category: "Performance", label: "Mileage (Diesel)", value: "16 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "7 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 1 - 10+ Features" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Infotainment", feature_name: "Dual 10.25-inch Screens" },
      { category: "Infotainment", feature_name: "Sony 3D Premium Sound" },
      { category: "Technology", feature_name: "AdrenoX Connected Car" },
      { category: "Technology", feature_name: "AWD with 4 Modes" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-right-front-three-quarter-3.jpeg"
  },
  {
    name: "Mahindra Thar",
    brand: "Mahindra",
    slug: "mahindra-thar",
    body_type: "Off-Road SUV",
    tagline: "Explore the Impossible",
    price_range: "₹11.35 - 17.60 Lakh",
    price_numeric: 1135000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: false,
    is_bestseller: true,
    overview: "The Mahindra Thar is an iconic off-roader with 4x4 capability, convertible top, and modern features wrapped in classic design.",
    key_highlights: ["4x4 with Low Range", "Convertible Soft Top", "Waterproof Interiors", "9-inch Touchscreen", "Adventure Statistics", "226mm Ground Clearance"],
    variants: [
      { name: "AX Std", price: "₹11.35 Lakh", price_numeric: 1135000, fuel_type: "Diesel", transmission: "Manual", features: ["4x4", "Soft Top", "Manual AC"] },
      { name: "AX Opt", price: "₹13.50 Lakh", price_numeric: 1350000, fuel_type: "Diesel", transmission: "Manual", features: ["Hard Top", "Alloys", "Touchscreen"] },
      { name: "LX MT", price: "₹15.30 Lakh", price_numeric: 1530000, fuel_type: "Diesel", transmission: "Manual", features: ["Auto Climate", "Cruise Control", "LED DRLs"] },
      { name: "LX AT", price: "₹17.60 Lakh", price_numeric: 1760000, fuel_type: "Diesel", transmission: "Automatic", features: ["Automatic", "Hardtop", "AdrenoX"] }
    ],
    colors: [
      { name: "Napoli Black", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-right-front-three-quarter-75.jpeg" },
      { name: "Galaxy Grey", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-right-front-three-quarter-76.jpeg" },
      { name: "Rocky Beige", hex_code: "#C4A77D", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-right-front-three-quarter-77.jpeg" },
      { name: "Red Rage", hex_code: "#C41E3A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-right-front-three-quarter-78.jpeg" },
      { name: "Aquamarine", hex_code: "#367588", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-right-front-three-quarter-79.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "2.0L Turbo Petrol / 2.2L Diesel" },
      { category: "Engine", label: "Max Power", value: "150 bhp / 130 bhp" },
      { category: "Engine", label: "Max Torque", value: "300 Nm / 300 Nm" },
      { category: "Dimensions", label: "Length", value: "3985 mm" },
      { category: "Dimensions", label: "Width", value: "1820 mm" },
      { category: "Dimensions", label: "Height", value: "1844 mm" },
      { category: "Dimensions", label: "Ground Clearance", value: "226 mm" },
      { category: "Performance", label: "Wading Depth", value: "650 mm" }
    ],
    features: [
      { category: "Safety", feature_name: "2 Airbags" },
      { category: "Safety", feature_name: "ABS with EBD" },
      { category: "Off-Road", feature_name: "4x4 with Low Range" },
      { category: "Off-Road", feature_name: "650mm Wading Depth" },
      { category: "Comfort", feature_name: "Convertible Soft Top" },
      { category: "Infotainment", feature_name: "9-inch Touchscreen" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-right-front-three-quarter-75.jpeg"
  },
  {
    name: "Mahindra Thar ROXX",
    brand: "Mahindra",
    slug: "mahindra-thar-roxx",
    body_type: "Compact SUV",
    tagline: "Born to Roxx",
    price_range: "₹12.99 - 22.49 Lakh",
    price_numeric: 1299000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: true,
    overview: "The Mahindra Thar ROXX is the 5-door version of the iconic Thar with more space, better features, and family-friendly practicality.",
    key_highlights: ["5-Door 5-Seater", "ADAS Level 2 Safety", "10.25-inch Touchscreen", "Panoramic Sunroof", "4x4 with Terrain Modes", "Ventilated Seats"],
    variants: [
      { name: "MX1", price: "₹12.99 Lakh", price_numeric: 1299000, fuel_type: "Diesel", transmission: "Manual", features: ["6 Airbags", "Touchscreen", "Manual AC"] },
      { name: "MX3", price: "₹15.50 Lakh", price_numeric: 1550000, fuel_type: "Diesel", transmission: "Manual", features: ["Auto Climate", "Alloys", "Cruise Control"] },
      { name: "AX3L", price: "₹18.00 Lakh", price_numeric: 1800000, fuel_type: "Diesel", transmission: "Automatic", features: ["Sunroof", "ADAS Level 1", "AdrenoX"] },
      { name: "AX5L", price: "₹20.50 Lakh", price_numeric: 2050000, fuel_type: "Diesel", transmission: "Automatic", features: ["Panoramic Sunroof", "Ventilated Seats", "360 Camera"] },
      { name: "AX7L 4x4", price: "₹22.49 Lakh", price_numeric: 2249000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 2", "4x4", "Terrain Modes"] }
    ],
    colors: [
      { name: "Stealth Black", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-exterior-right-front-three-quarter.jpeg" },
      { name: "Battleship Grey", hex_code: "#4A4A4A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Tango Red", hex_code: "#C41E3A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Everest White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-exterior-right-front-three-quarter-5.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "2.0L Turbo Petrol / 2.2L Diesel" },
      { category: "Engine", label: "Max Power", value: "162 bhp / 175 bhp" },
      { category: "Engine", label: "Max Torque", value: "330 Nm / 370 Nm" },
      { category: "Dimensions", label: "Length", value: "4428 mm" },
      { category: "Dimensions", label: "Width", value: "1870 mm" },
      { category: "Dimensions", label: "Height", value: "1923 mm" },
      { category: "Dimensions", label: "Boot Space", value: "644 L" },
      { category: "Performance", label: "Mileage", value: "15.5 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Technology", feature_name: "AdrenoX Connected Car" },
      { category: "Comfort", feature_name: "Panoramic Sunroof" },
      { category: "Off-Road", feature_name: "4x4 with Terrain Modes" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-exterior-right-front-three-quarter.jpeg"
  },
  {
    name: "Mahindra XUV 3XO",
    brand: "Mahindra",
    slug: "mahindra-xuv-3xo",
    body_type: "Compact SUV",
    tagline: "Smart SUV",
    price_range: "₹7.79 - 15.49 Lakh",
    price_numeric: 779000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "AMT"],
    is_hot: true,
    is_new: true,
    is_bestseller: true,
    overview: "The Mahindra XUV 3XO is a compact SUV with segment-leading features, powerful engines, and 5-star safety.",
    key_highlights: ["10.25-inch Touchscreen", "AdrenoX Connected Car", "Panoramic Sunroof", "6 Airbags as Standard", "Wireless Charging", "5-Star NCAP Safety"],
    variants: [
      { name: "MX1", price: "₹7.79 Lakh", price_numeric: 779000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "ABS", "Manual AC"] },
      { name: "MX2", price: "₹9.50 Lakh", price_numeric: 950000, fuel_type: "Petrol", transmission: "Manual", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "MX2 Pro", price: "₹11.00 Lakh", price_numeric: 1100000, fuel_type: "Petrol", transmission: "AMT", features: ["Sunroof", "Wireless Charger"] },
      { name: "AX5", price: "₹12.50 Lakh", price_numeric: 1250000, fuel_type: "Diesel", transmission: "AMT", features: ["Panoramic Sunroof", "Digital Cluster"] },
      { name: "AX7", price: "₹15.49 Lakh", price_numeric: 1549000, fuel_type: "Diesel", transmission: "Automatic", features: ["AdrenoX", "Premium Sound", "360 Camera"] }
    ],
    colors: [
      { name: "Nebula Blue", hex_code: "#2E5090", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-right-front-three-quarter.jpeg" },
      { name: "Everest White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Red Rage", hex_code: "#C41E3A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Tango Red", hex_code: "#8B2500", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Dazzling Silver", hex_code: "#A8A9AD", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-right-front-three-quarter-6.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.2L Turbo Petrol / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "130 bhp / 115 bhp" },
      { category: "Engine", label: "Max Torque", value: "230 Nm / 300 Nm" },
      { category: "Dimensions", label: "Length", value: "3995 mm" },
      { category: "Dimensions", label: "Width", value: "1821 mm" },
      { category: "Dimensions", label: "Height", value: "1647 mm" },
      { category: "Dimensions", label: "Boot Space", value: "364 L" },
      { category: "Performance", label: "Mileage", value: "18.4 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Technology", feature_name: "AdrenoX Connected Car" },
      { category: "Comfort", feature_name: "Panoramic Sunroof" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-right-front-three-quarter.jpeg"
  },
  {
    name: "Mahindra Scorpio N",
    brand: "Mahindra",
    slug: "mahindra-scorpio-n",
    body_type: "Full-Size SUV",
    tagline: "Big Daddy of SUVs",
    price_range: "₹13.85 - 24.54 Lakh",
    price_numeric: 1385000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: false,
    is_bestseller: true,
    overview: "The Mahindra Scorpio N is a rugged full-size SUV with powerful engines, 4x4 capability, and modern features.",
    key_highlights: ["4x4 with Low Range", "8-inch Touchscreen", "AdrenoX Connected Car", "Sony 3D Sound", "Dual-Zone Climate Control", "175 bhp Diesel Engine"],
    variants: [
      { name: "Z2", price: "₹13.85 Lakh", price_numeric: 1385000, fuel_type: "Diesel", transmission: "Manual", features: ["6 Airbags", "Touchscreen", "Manual AC"] },
      { name: "Z4", price: "₹15.50 Lakh", price_numeric: 1550000, fuel_type: "Diesel", transmission: "Manual", features: ["Auto Climate", "Alloys", "LED DRLs"] },
      { name: "Z6", price: "₹17.80 Lakh", price_numeric: 1780000, fuel_type: "Diesel", transmission: "Automatic", features: ["Sunroof", "Wireless Charger", "AdrenoX"] },
      { name: "Z8", price: "₹20.50 Lakh", price_numeric: 2050000, fuel_type: "Diesel", transmission: "Automatic", features: ["Sony Sound", "360 Camera", "Leather Seats"] },
      { name: "Z8 L 4x4", price: "₹24.54 Lakh", price_numeric: 2454000, fuel_type: "Diesel", transmission: "Automatic", features: ["4x4", "Terrain Modes", "Premium Interior"] }
    ],
    colors: [
      { name: "Napoli Black", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-right-front-three-quarter-56.jpeg" },
      { name: "Everest White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-right-front-three-quarter-57.jpeg" },
      { name: "Red Rage", hex_code: "#C41E3A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-right-front-three-quarter-58.jpeg" },
      { name: "Deep Forest", hex_code: "#2E4E3F", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-right-front-three-quarter-59.jpeg" },
      { name: "Dazzling Silver", hex_code: "#A8A9AD", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-right-front-three-quarter-60.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "2.0L Turbo Petrol / 2.2L Diesel" },
      { category: "Engine", label: "Max Power", value: "200 bhp / 175 bhp" },
      { category: "Engine", label: "Max Torque", value: "380 Nm / 400 Nm (AT)" },
      { category: "Dimensions", label: "Length", value: "4662 mm" },
      { category: "Dimensions", label: "Width", value: "1917 mm" },
      { category: "Dimensions", label: "Height", value: "1870 mm" },
      { category: "Dimensions", label: "Ground Clearance", value: "200 mm" },
      { category: "Performance", label: "Mileage", value: "14.5 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Infotainment", feature_name: "8-inch Touchscreen" },
      { category: "Infotainment", feature_name: "Sony 3D Premium Sound" },
      { category: "Off-Road", feature_name: "4x4 with Low Range" },
      { category: "Technology", feature_name: "AdrenoX Connected Car" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-right-front-three-quarter-56.jpeg"
  }
];

// Complete Hyundai car data
const hyundaiCars = [
  {
    name: "Hyundai Creta",
    brand: "Hyundai",
    slug: "hyundai-creta",
    body_type: "Compact SUV",
    tagline: "The Ultimate SUV",
    price_range: "₹11.00 - 20.15 Lakh",
    price_numeric: 1100000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "iMT"],
    is_hot: true,
    is_new: true,
    is_bestseller: true,
    overview: "The 2024 Hyundai Creta is a complete package with stunning design, feature-loaded cabin, and powerful engine options.",
    key_highlights: ["Panoramic Sunroof with Voice Control", "Level 2 ADAS with 19 Safety Features", "10.25-inch Touchscreen with Bluelink", "Ventilated Front Seats", "Bose Premium Sound System", "360-Degree Camera with Blind View Monitor"],
    variants: [
      { name: "E", price: "₹11.00 Lakh", price_numeric: 1100000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "ABS with EBD", "Manual AC", "Projector Headlamps"] },
      { name: "EX", price: "₹12.50 Lakh", price_numeric: 1250000, fuel_type: "Petrol", transmission: "Manual", features: ["8-inch Touchscreen", "Wireless Charger", "Rear AC Vents", "Cruise Control"] },
      { name: "S", price: "₹14.00 Lakh", price_numeric: 1400000, fuel_type: "Petrol", transmission: "iMT", features: ["Sunroof", "LED Headlamps", "Auto Climate Control", "Push Button Start"] },
      { name: "SX", price: "₹16.50 Lakh", price_numeric: 1650000, fuel_type: "Diesel", transmission: "Automatic", features: ["10.25-inch Screen", "Panoramic Sunroof", "Ventilated Seats", "ADAS Level 1"] },
      { name: "SX(O)", price: "₹20.15 Lakh", price_numeric: 2015000, fuel_type: "Diesel", transmission: "Automatic", features: ["ADAS Level 2", "Bose Sound", "360 Camera", "Blind View Monitor"] }
    ],
    colors: [
      { name: "Ranger Khaki", hex_code: "#5C5346", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Abyss Black", hex_code: "#0F0F0F", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Atlas White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-6.jpeg" },
      { name: "Fiery Red", hex_code: "#B22222", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-7.jpeg" },
      { name: "Titan Grey", hex_code: "#808080", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-8.jpeg" },
      { name: "Robust Emerald", hex_code: "#2E5D4E", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-9.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.5L Petrol / 1.5L Diesel / 1.5L Turbo Petrol" },
      { category: "Engine", label: "Max Power", value: "113 bhp / 114 bhp / 158 bhp" },
      { category: "Engine", label: "Max Torque", value: "144 Nm / 250 Nm / 253 Nm" },
      { category: "Dimensions", label: "Length", value: "4315 mm" },
      { category: "Dimensions", label: "Width", value: "1790 mm" },
      { category: "Dimensions", label: "Height", value: "1660 mm" },
      { category: "Dimensions", label: "Boot Space", value: "433 L" },
      { category: "Performance", label: "Mileage (Petrol)", value: "17.4 kmpl" },
      { category: "Performance", label: "Mileage (Diesel)", value: "21.8 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2 - 19 Features" },
      { category: "Safety", feature_name: "5 Star GNCAP Rating" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Infotainment", feature_name: "8-Speaker Bose Sound" },
      { category: "Comfort", feature_name: "Ventilated Front Seats" },
      { category: "Technology", feature_name: "Bluelink Connected Car" },
      { category: "Technology", feature_name: "360-Degree Camera" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-4.jpeg"
  },
  {
    name: "Hyundai Venue",
    brand: "Hyundai",
    slug: "hyundai-venue",
    body_type: "Compact SUV",
    tagline: "The Connected SUV",
    price_range: "₹7.94 - 13.48 Lakh",
    price_numeric: 794000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic", "iMT"],
    is_hot: true,
    is_new: false,
    is_bestseller: true,
    overview: "Hyundai Venue is a compact SUV that offers premium features, connected car technology, and multiple powertrain options.",
    key_highlights: ["Bluelink Connected Car Tech", "Turbo Petrol with 7-Speed DCT", "Electric Sunroof", "8-inch HD Touchscreen", "Wireless Charging", "Air Purifier with AQI Display"],
    variants: [
      { name: "E", price: "₹7.94 Lakh", price_numeric: 794000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "Manual AC", "Halogen Headlamps"] },
      { name: "S", price: "₹9.50 Lakh", price_numeric: 950000, fuel_type: "Petrol", transmission: "Manual", features: ["8-inch Screen", "LED DRLs", "Rear AC Vents"] },
      { name: "SX", price: "₹11.50 Lakh", price_numeric: 1150000, fuel_type: "Petrol", transmission: "iMT", features: ["Sunroof", "Wireless Charger", "Bluelink"] },
      { name: "SX(O)", price: "₹13.48 Lakh", price_numeric: 1348000, fuel_type: "Diesel", transmission: "Automatic", features: ["LED Headlamps", "Air Purifier", "Premium Sound"] }
    ],
    colors: [
      { name: "Denim Blue", hex_code: "#4B6A8E", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Fiery Red", hex_code: "#B22222", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-right-front-three-quarter-6.jpeg" },
      { name: "Polar White", hex_code: "#FAFAFA", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-right-front-three-quarter-7.jpeg" },
      { name: "Typhoon Silver", hex_code: "#A8A9AD", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-right-front-three-quarter-8.jpeg" },
      { name: "Phantom Black", hex_code: "#1A1A1A", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-right-front-three-quarter-9.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.2L Petrol / 1.0L Turbo / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "82 bhp / 118 bhp / 99 bhp" },
      { category: "Engine", label: "Max Torque", value: "114 Nm / 172 Nm / 240 Nm" },
      { category: "Dimensions", label: "Length", value: "3995 mm" },
      { category: "Dimensions", label: "Width", value: "1770 mm" },
      { category: "Dimensions", label: "Height", value: "1617 mm" },
      { category: "Dimensions", label: "Boot Space", value: "350 L" },
      { category: "Performance", label: "Mileage", value: "17.5 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Infotainment", feature_name: "8-inch Touchscreen" },
      { category: "Technology", feature_name: "Bluelink Connected Car" },
      { category: "Comfort", feature_name: "Electric Sunroof" },
      { category: "Comfort", feature_name: "Air Purifier" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-right-front-three-quarter-5.jpeg"
  },
  {
    name: "Hyundai i20",
    brand: "Hyundai",
    slug: "hyundai-i20",
    body_type: "Premium Hatchback",
    tagline: "Born to be a SUV",
    price_range: "₹7.04 - 11.21 Lakh",
    price_numeric: 704000,
    fuel_types: ["Petrol"],
    transmission_types: ["Manual", "Automatic", "iMT"],
    is_hot: false,
    is_new: false,
    overview: "The Hyundai i20 is a premium hatchback with SUV-inspired design, segment-leading features, and peppy turbo engine option.",
    key_highlights: ["10.25-inch Touchscreen", "Digital Instrument Cluster", "Sunroof with Voice Control", "Bose Premium Sound", "Turbo Petrol with DCT", "6 Airbags as Standard"],
    variants: [
      { name: "Magna", price: "₹7.04 Lakh", price_numeric: 704000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "Manual AC", "Steering Controls"] },
      { name: "Sportz", price: "₹8.80 Lakh", price_numeric: 880000, fuel_type: "Petrol", transmission: "Manual", features: ["8-inch Screen", "Auto Climate", "LED DRLs"] },
      { name: "Asta", price: "₹10.20 Lakh", price_numeric: 1020000, fuel_type: "Petrol", transmission: "iMT", features: ["Sunroof", "Digital Cluster", "Wireless Charger"] },
      { name: "Asta(O)", price: "₹11.21 Lakh", price_numeric: 1121000, fuel_type: "Petrol", transmission: "Automatic", features: ["Bose Sound", "10.25-inch Screen", "Bluelink"] }
    ],
    colors: [
      { name: "Starry Night", hex_code: "#1E2832", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Fiery Red", hex_code: "#B22222", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Polar White", hex_code: "#FAFAFA", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Titan Grey", hex_code: "#707070", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-exterior-right-front-three-quarter-6.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.2L Petrol / 1.0L Turbo Petrol" },
      { category: "Engine", label: "Max Power", value: "87 bhp / 118 bhp" },
      { category: "Engine", label: "Max Torque", value: "115 Nm / 172 Nm" },
      { category: "Dimensions", label: "Length", value: "3995 mm" },
      { category: "Dimensions", label: "Width", value: "1775 mm" },
      { category: "Dimensions", label: "Height", value: "1505 mm" },
      { category: "Dimensions", label: "Boot Space", value: "311 L" },
      { category: "Performance", label: "Mileage", value: "20.25 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Infotainment", feature_name: "7-Speaker Bose Sound" },
      { category: "Technology", feature_name: "Bluelink Connected Car" },
      { category: "Comfort", feature_name: "Electric Sunroof" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-exterior-right-front-three-quarter-3.jpeg"
  },
  {
    name: "Hyundai Verna",
    brand: "Hyundai",
    slug: "hyundai-verna",
    body_type: "Premium Sedan",
    tagline: "Sedans Aren't Dead",
    price_range: "₹10.96 - 17.62 Lakh",
    price_numeric: 1096000,
    fuel_types: ["Petrol"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: true,
    is_new: true,
    overview: "The all-new 2024 Hyundai Verna is a completely redesigned sedan with bold styling, segment-first features, and powerful turbo engine.",
    key_highlights: ["ADAS Level 2 Safety Suite", "Dual 10.25-inch Screens", "Ventilated Front Seats", "64-Color Ambient Lighting", "Bose 8-Speaker System", "Shift-by-Wire Transmission"],
    variants: [
      { name: "EX", price: "₹10.96 Lakh", price_numeric: 1096000, fuel_type: "Petrol", transmission: "Manual", features: ["6 Airbags", "Halogen Headlamps", "Manual AC"] },
      { name: "S", price: "₹12.80 Lakh", price_numeric: 1280000, fuel_type: "Petrol", transmission: "Manual", features: ["LED Headlamps", "8-inch Screen", "Auto Climate"] },
      { name: "SX", price: "₹15.20 Lakh", price_numeric: 1520000, fuel_type: "Petrol", transmission: "Automatic", features: ["Sunroof", "Dual Screens", "Ventilated Seats"] },
      { name: "SX(O)", price: "₹17.62 Lakh", price_numeric: 1762000, fuel_type: "Petrol", transmission: "Automatic", features: ["ADAS Level 2", "Bose Sound", "Shift-by-Wire"] }
    ],
    colors: [
      { name: "Fiery Red", hex_code: "#B22222", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-right-front-three-quarter-40.jpeg" },
      { name: "Abyss Black", hex_code: "#0F0F0F", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-right-front-three-quarter-41.jpeg" },
      { name: "Atlas White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-right-front-three-quarter-42.jpeg" },
      { name: "Tellurian Brown", hex_code: "#4A3728", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-right-front-three-quarter-43.jpeg" },
      { name: "Titan Grey", hex_code: "#808080", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-right-front-three-quarter-44.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.5L NA Petrol / 1.5L Turbo Petrol" },
      { category: "Engine", label: "Max Power", value: "113 bhp / 158 bhp" },
      { category: "Engine", label: "Max Torque", value: "144 Nm / 253 Nm" },
      { category: "Dimensions", label: "Length", value: "4535 mm" },
      { category: "Dimensions", label: "Width", value: "1765 mm" },
      { category: "Dimensions", label: "Height", value: "1475 mm" },
      { category: "Dimensions", label: "Boot Space", value: "528 L" },
      { category: "Performance", label: "Mileage", value: "18.6 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2 - 18 Features" },
      { category: "Infotainment", feature_name: "Dual 10.25-inch Screens" },
      { category: "Infotainment", feature_name: "Bose 8-Speaker Sound" },
      { category: "Comfort", feature_name: "Ventilated Front Seats" },
      { category: "Comfort", feature_name: "64-Color Ambient Lighting" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-right-front-three-quarter-40.jpeg"
  },
  {
    name: "Hyundai Alcazar",
    brand: "Hyundai",
    slug: "hyundai-alcazar",
    body_type: "Mid-Size SUV",
    tagline: "Live the Grand Life",
    price_range: "₹14.99 - 21.55 Lakh",
    price_numeric: 1499000,
    fuel_types: ["Petrol", "Diesel"],
    transmission_types: ["Manual", "Automatic"],
    is_hot: false,
    is_new: true,
    overview: "The 2024 Hyundai Alcazar is a 6/7-seater SUV built on Creta's platform with extended wheelbase, premium features, and powerful engine options.",
    key_highlights: ["6 & 7 Seater Options", "ADAS Level 2", "Dual Panoramic Sunroof", "Boss Mode for 2nd Row", "360-Degree Camera", "Rear Seat Entertainment"],
    variants: [
      { name: "Executive", price: "₹14.99 Lakh", price_numeric: 1499000, fuel_type: "Diesel", transmission: "Manual", features: ["6 Airbags", "8-inch Screen", "Halogen Lamps"] },
      { name: "Prestige", price: "₹17.50 Lakh", price_numeric: 1750000, fuel_type: "Diesel", transmission: "Automatic", features: ["LED Lamps", "Sunroof", "Digital Cluster"] },
      { name: "Platinum", price: "₹19.80 Lakh", price_numeric: 1980000, fuel_type: "Diesel", transmission: "Automatic", features: ["Dual Sunroof", "ADAS", "Ventilated Seats"] },
      { name: "Signature", price: "₹21.55 Lakh", price_numeric: 2155000, fuel_type: "Diesel", transmission: "Automatic", features: ["Bose Sound", "360 Camera", "Boss Mode"] }
    ],
    colors: [
      { name: "Starry Night", hex_code: "#1E2832", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-exterior-right-front-three-quarter-3.jpeg" },
      { name: "Titan Grey", hex_code: "#808080", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-exterior-right-front-three-quarter-4.jpeg" },
      { name: "Atlas White", hex_code: "#F5F5F5", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-exterior-right-front-three-quarter-5.jpeg" },
      { name: "Abyss Black", hex_code: "#0F0F0F", image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-exterior-right-front-three-quarter-6.jpeg" }
    ],
    specifications: [
      { category: "Engine", label: "Engine Type", value: "1.5L Turbo Petrol / 1.5L Diesel" },
      { category: "Engine", label: "Max Power", value: "158 bhp / 114 bhp" },
      { category: "Engine", label: "Max Torque", value: "253 Nm / 250 Nm" },
      { category: "Dimensions", label: "Length", value: "4560 mm" },
      { category: "Dimensions", label: "Width", value: "1800 mm" },
      { category: "Dimensions", label: "Height", value: "1710 mm" },
      { category: "Dimensions", label: "Boot Space", value: "180 L (7-seat)" },
      { category: "Performance", label: "Mileage", value: "18.1 kmpl" }
    ],
    features: [
      { category: "Safety", feature_name: "6 Airbags" },
      { category: "Safety", feature_name: "ADAS Level 2" },
      { category: "Infotainment", feature_name: "10.25-inch Touchscreen" },
      { category: "Infotainment", feature_name: "Bose 8-Speaker Sound" },
      { category: "Comfort", feature_name: "Boss Mode 2nd Row" },
      { category: "Technology", feature_name: "360-Degree Camera" }
    ],
    image_url: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-exterior-right-front-three-quarter-3.jpeg"
  }
];

async function migrateBrandToDatabase(supabase: any, cars: any[], brand: string) {
  const results = { saved: 0, errors: [] as string[] };
  
  for (const car of cars) {
    try {
      // Upsert car
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .upsert({
          slug: car.slug,
          name: car.name,
          brand: car.brand,
          body_type: car.body_type,
          tagline: car.tagline,
          price_range: car.price_range,
          price_numeric: car.price_numeric,
          fuel_types: car.fuel_types,
          transmission_types: car.transmission_types,
          is_hot: car.is_hot || false,
          is_new: car.is_new || false,
          is_bestseller: car.is_bestseller || false,
          is_upcoming: car.is_upcoming || false,
          is_limited: car.is_limited || false,
          overview: car.overview,
          key_highlights: car.key_highlights,
          updated_at: new Date().toISOString()
        }, { onConflict: 'slug' })
        .select()
        .single();

      if (carError) {
        results.errors.push(`Car ${car.name}: ${carError.message}`);
        continue;
      }

      const carId = carData.id;

      // Add primary image
      await supabase.from('car_images').upsert({
        car_id: carId,
        url: car.image_url,
        alt_text: `${car.name} exterior`,
        is_primary: true,
        sort_order: 0
      }, { onConflict: 'car_id,url' });

      // Delete and insert fresh variants
      await supabase.from('car_variants').delete().eq('car_id', carId);
      for (let i = 0; i < car.variants.length; i++) {
        const v = car.variants[i];
        await supabase.from('car_variants').insert({
          car_id: carId,
          name: v.name,
          price: v.price,
          price_numeric: v.price_numeric,
          fuel_type: v.fuel_type,
          transmission: v.transmission,
          features: v.features,
          sort_order: i
        });
      }

      // Delete and insert fresh colors
      await supabase.from('car_colors').delete().eq('car_id', carId);
      for (let i = 0; i < car.colors.length; i++) {
        const c = car.colors[i];
        await supabase.from('car_colors').insert({
          car_id: carId,
          name: c.name,
          hex_code: c.hex_code,
          image_url: c.image_url,
          sort_order: i
        });
      }

      // Delete and insert fresh specifications
      await supabase.from('car_specifications').delete().eq('car_id', carId);
      for (let i = 0; i < car.specifications.length; i++) {
        const s = car.specifications[i];
        await supabase.from('car_specifications').insert({
          car_id: carId,
          category: s.category,
          label: s.label,
          value: s.value,
          sort_order: i
        });
      }

      // Delete and insert fresh features
      await supabase.from('car_features').delete().eq('car_id', carId);
      for (let i = 0; i < car.features.length; i++) {
        const f = car.features[i];
        await supabase.from('car_features').insert({
          car_id: carId,
          category: f.category,
          feature_name: f.feature_name,
          is_standard: true,
          sort_order: i
        });
      }

      results.saved++;
    } catch (err: any) {
      results.errors.push(`Car ${car.name}: ${err.message}`);
    }
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let results: any = {};

    if (!brand || brand === "all") {
      // Migrate all brands
      results.kia = await migrateBrandToDatabase(supabase, kiaCars, "Kia");
      results.tata = await migrateBrandToDatabase(supabase, tataCars, "Tata");
      results.mahindra = await migrateBrandToDatabase(supabase, mahindraCars, "Mahindra");
      results.hyundai = await migrateBrandToDatabase(supabase, hyundaiCars, "Hyundai");
    } else if (brand === "kia") {
      results.kia = await migrateBrandToDatabase(supabase, kiaCars, "Kia");
    } else if (brand === "tata") {
      results.tata = await migrateBrandToDatabase(supabase, tataCars, "Tata");
    } else if (brand === "mahindra") {
      results.mahindra = await migrateBrandToDatabase(supabase, mahindraCars, "Mahindra");
    } else if (brand === "hyundai") {
      results.hyundai = await migrateBrandToDatabase(supabase, hyundaiCars, "Hyundai");
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
