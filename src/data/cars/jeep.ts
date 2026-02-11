import { Car, generateOffers } from "./types";

const jeepCars: Car[] = [
  {
    id: 1101,
    slug: "jeep-compass",
    name: "Jeep Compass",
    brand: "Jeep",
    bodyType: "Mid-Size SUV",
    tagline: "Live Legendary",
    image: "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/vehicle-lineup/Thumbnail-Compass-Model-S-1.jpg.img.300.jpg",
    gallery: [
      "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/homepage-banner/Jeep_Compass_feb_MR_Banner_Rev_1550x661.jpg.img.1440.jpg",
      "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/homepage-banner/R3-Confidence-7-Web-Banners-Compass-desktop.jpg.img.1440.jpg"
    ],
    price: "₹17.93 - 28.49 Lakh",
    priceNumeric: 1793000,
    originalPrice: "₹18.50 Lakh",
    discount: "₹57,000",
    fuelTypes: ["Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Jeep Compass Track Edition features bold Track-Inspired Livery, Ultra-Luxe Interior with Tupelo Upholstery, Dual-Pane Panoramic Sunroof, 2.0 Multijet II Turbo Diesel with 9-Speed Automatic, FSD Suspension, and 6 Airbags with Electronic Roll Mitigation.",
    keyHighlights: [
      "Track Edition Livery",
      "2.0 Multijet II Diesel",
      "9-Speed Automatic",
      "Dual-Pane Panoramic Sunroof",
      "FSD Suspension",
      "6 Airbags + ERM"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Multijet II Turbo Diesel" },
        { label: "Max Power", value: "168 bhp" },
        { label: "Max Torque", value: "350 Nm" },
        { label: "Displacement", value: "1956 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4405 mm" },
        { label: "Width", value: "1818 mm" },
        { label: "Height", value: "1640 mm" },
        { label: "Wheelbase", value: "2636 mm" },
        { label: "Boot Space", value: "438 L" },
        { label: "Ground Clearance", value: "178 mm" }
      ],
      performance: [
        { label: "Mileage (Diesel MT)", value: "16.9 kmpl" },
        { label: "Mileage (Diesel AT)", value: "14.2 kmpl" },
        { label: "Top Speed", value: "190 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.1-inch Uconnect 5" },
        { label: "Sound System", value: "Alpine Premium" },
        { label: "Sunroof", value: "Dual-Pane Panoramic" },
        { label: "Suspension", value: "FSD (Frequency Selective Damping)" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ERM", value: "Electronic Roll Mitigation" },
        { label: "ESP", value: "Standard" },
        { label: "Dynamic Steering Torque", value: "Standard" }
      ]
    },
    colors: [
      { name: "Exotica Red", hex: "#B22222" },
      { name: "Bright White", hex: "#F5F5F5" },
      { name: "Galaxy Blue", hex: "#2E5090" },
      { name: "Magnesio Grey", hex: "#4A4A4A" },
      { name: "Brilliant Black", hex: "#1A1A1A" }
    ],
    variants: [
      { name: "Sport", price: "₹17.93 Lakh", priceNumeric: 1793000, features: ["Diesel MT", "6 Airbags", "LED Lamps", "ESP"], fuelType: "Diesel", transmission: "Manual" },
      { name: "Longitude", price: "₹20.49 Lakh", priceNumeric: 2049000, features: ["10.1\" Screen", "Auto Climate", "Cruise Control"], fuelType: "Diesel", transmission: "Manual" },
      { name: "Limited", price: "₹23.99 Lakh", priceNumeric: 2399000, features: ["Panoramic Sunroof", "Alpine Sound", "Leather Seats"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Model S", price: "₹26.49 Lakh", priceNumeric: 2649000, features: ["Premium Interior", "All Features", "FSD Suspension"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Track Edition", price: "₹28.49 Lakh", priceNumeric: 2849000, features: ["Track Livery", "Tupelo Upholstery", "All-Season Tyres"], fuelType: "Diesel", transmission: "Automatic" }
    ],
    offers: generateOffers("₹80,000", "₹70,000"),
    pros: ["Track Edition Design", "FSD Suspension", "Strong Diesel", "6 Airbags Standard"],
    cons: ["No Petrol Option", "Average Mileage", "Premium Pricing"],
    competitors: ["Hyundai Tucson", "Skoda Kushaq", "VW Taigun"]
  },
  {
    id: 1102,
    slug: "jeep-meridian",
    name: "Jeep Meridian",
    brand: "Jeep",
    bodyType: "Full-Size SUV",
    tagline: "Built For Big",
    image: "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/meridian/Thumbnail_Overland_White.jpg.img.300.jpg",
    gallery: [
      "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/homepage-banner/Jeep_Meridian_January_MR_Banner_R2_2880x1228.jpg.img.1440.jpg",
      "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/meridian/R-Meridian-3001X1250-Trail-Ed-Green.jpg.img.1440.jpg",
      "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/homepage-banner/R3-Confidence-7-Web-Banners-Meridian-desktop.jpg.img.1440.jpg"
    ],
    price: "₹23.33 - 36.95 Lakh",
    priceNumeric: 2333000,
    originalPrice: "₹24.00 Lakh",
    discount: "₹67,000",
    fuelTypes: ["Diesel"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The 2025 Jeep Meridian Trail Edition is a 7-seater premium SUV with exclusive Camo Livery, Accentuated Dashboard, 12-Way Powered Seats, 2.0L Multijet II Diesel, 9-Speed AT, ADAS suite with Adaptive Cruise Control, Blind Spot Detection, and 360-Degree Camera.",
    keyHighlights: [
      "Trail Edition Camo Livery",
      "2.0L Multijet II Diesel",
      "9-Speed Automatic",
      "ADAS Suite",
      "360-Degree Camera",
      "9-Speaker Alpine System"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Multijet II Diesel" },
        { label: "Max Power", value: "168 bhp" },
        { label: "Max Torque", value: "350 Nm" },
        { label: "Displacement", value: "1956 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4769 mm" },
        { label: "Width", value: "1859 mm" },
        { label: "Height", value: "1682 mm" },
        { label: "Wheelbase", value: "2794 mm" },
        { label: "Boot Space", value: "233 L (7-seat)" }
      ],
      performance: [
        { label: "Mileage", value: "14.1 kmpl" },
        { label: "Top Speed", value: "190 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.1-inch Uconnect 5" },
        { label: "Sound System", value: "Alpine 9-Speaker" },
        { label: "Connectivity", value: "e-SIM, Alexa, Remote Engine Start" },
        { label: "Tailgate", value: "Power Tailgate with Memory" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Adaptive Cruise, Collision Mitigation, Blind Spot, Lane Keep" },
        { label: "Camera", value: "360-Degree View" },
        { label: "Hill Start Assist", value: "Standard" }
      ]
    },
    colors: [
      { name: "Techno Metallic Green", hex: "#2D5A3D" },
      { name: "Brilliant Black", hex: "#1A1A1A" },
      { name: "Pearl White", hex: "#F5F5F5" },
      { name: "Grigio Magnesio", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Trail Edition", price: "₹23.33 Lakh", priceNumeric: 2333000, features: ["Camo Livery", "Trail Badge", "Red Stitching"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Longitude", price: "₹29.12 Lakh", priceNumeric: 2912000, features: ["7-Seater", "6 Airbags", "Panoramic Sunroof"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Longitude Plus", price: "₹31.50 Lakh", priceNumeric: 3150000, features: ["ADAS", "Alpine Sound", "Power Tailgate"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Limited (O)", price: "₹33.99 Lakh", priceNumeric: 3399000, features: ["Ventilated Seats", "12-Way Powered", "All Features"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Overland", price: "₹36.95 Lakh", priceNumeric: 3695000, features: ["Captain Seats", "Premium Interior", "Full ADAS"], fuelType: "Diesel", transmission: "Automatic" }
    ],
    offers: generateOffers("₹1,00,000", "₹80,000"),
    pros: ["Trail Edition Value", "ADAS Suite", "7-Seater", "Premium Quality"],
    cons: ["Heavy Vehicle", "Small Boot (7-seat)", "Diesel Only"],
    competitors: ["Toyota Fortuner", "MG Gloster", "Hyundai Tucson"]
  },
  {
    id: 1103,
    slug: "jeep-wrangler",
    name: "Jeep Wrangler",
    brand: "Jeep",
    bodyType: "Off-Road SUV",
    tagline: "The One And Only",
    image: "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/vehicle-lineup/Thumb-Wrangler-Rubicon-Red.png.img.300.png",
    gallery: [
      "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/homepage-banner/WRANGLER%202880X1228.jpg.img.1440.jpg",
      "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/wrangler-price-reveal/Unlimited-1000x416-Red.png.img.1440.png"
    ],
    price: "₹64.58 Lakh",
    priceNumeric: 6458000,
    originalPrice: "₹66.00 Lakh",
    discount: "₹1,42,000",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Jeep Wrangler 1941 Willys Edition features India's first Corning Gorilla Windshield, ADAS with Adaptive Cruise Control, 12.3-inch Uconnect 5 Touchscreen, Heavy-Duty Dana 44HD Full-Float Rear Axle, 12-Way Power Seats, and 6 Airbags.",
    keyHighlights: [
      "1941 Willys Edition",
      "Corning Gorilla Windshield",
      "ADAS Suite",
      "12.3\" Uconnect 5",
      "Dana 44HD Axle",
      "6 Airbags"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Turbo Petrol" },
        { label: "Max Power", value: "268 bhp" },
        { label: "Max Torque", value: "400 Nm" },
        { label: "Displacement", value: "1995 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4334 mm" },
        { label: "Width", value: "1875 mm" },
        { label: "Height", value: "1848 mm" },
        { label: "Wheelbase", value: "2459 mm" },
        { label: "Ground Clearance", value: "218 mm" }
      ],
      performance: [
        { label: "Mileage", value: "10 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Uconnect 5" },
        { label: "Windshield", value: "Corning Gorilla Glass" },
        { label: "Seats", value: "12-Way Power (Driver & Passenger)" },
        { label: "Connectivity", value: "Remote Start/Stop, Keyless Enter 'n Go" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags (incl. Side Curtain)" },
        { label: "ADAS", value: "Adaptive Cruise, Forward Collision Warning" },
        { label: "Axle", value: "Dana 44HD Full-Float Rear" },
        { label: "Skid Plates", value: "Steel, Standard" }
      ]
    },
    colors: [
      { name: "Firecracker Red", hex: "#B22222" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Bright White", hex: "#F5F5F5" },
      { name: "Anvil Clear Coat", hex: "#6B6B6B" }
    ],
    variants: [
      { name: "Unlimited", price: "₹64.58 Lakh", priceNumeric: 6458000, features: ["4x4", "Removable Roof", "Uconnect 5", "ADAS"], fuelType: "Petrol", transmission: "Automatic" },
      { name: "Rubicon", price: "₹64.58 Lakh", priceNumeric: 6458000, features: ["Rock-Trac 4x4", "Dana 44HD", "Lockers", "32\" Tyres"], fuelType: "Petrol", transmission: "Automatic" }
    ],
    offers: generateOffers("₹1,50,000", "₹1,00,000"),
    pros: ["Iconic Design", "Corning Gorilla Windshield", "ADAS Standard", "Off-Road Legend"],
    cons: ["Very Expensive", "Poor Mileage", "Not Practical"],
    competitors: ["Force Gurkha", "Mahindra Thar"]
  },
  {
    id: 1104,
    slug: "jeep-grand-cherokee",
    name: "Jeep Grand Cherokee",
    brand: "Jeep",
    bodyType: "Luxury SUV",
    tagline: "The Legacy Lives On",
    image: "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/vehicle-lineup/thumbnail-gc-12may23.jpg.img.300.jpg",
    gallery: [
      "https://www.jeep-india.com/content/dam/cross-regional/apac/jeep/en_in/homepage-banner/GC-5jan-offer-ban-desktop-2880X1228.jpg.img.1440.jpg"
    ],
    price: "₹63.00 Lakh",
    priceNumeric: 6300000,
    originalPrice: "₹65.00 Lakh",
    discount: "₹2,00,000",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Jeep Grand Cherokee Signature Edition delivers 136.65 cm of screen space, integrated Dash Cam, Motorised Side-Step, McIntosh Premium Sound, Quadra-Trac II 4x4, Air Suspension, and full ADAS suite.",
    keyHighlights: [
      "Signature Edition",
      "136.65 cm Screen Space",
      "Integrated Dash Cam",
      "Motorised Side-Step",
      "McIntosh Sound",
      "Quadra-Trac II 4x4"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Turbo Petrol" },
        { label: "Max Power", value: "272 bhp" },
        { label: "Max Torque", value: "400 Nm" },
        { label: "Displacement", value: "1995 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4914 mm" },
        { label: "Width", value: "1979 mm" },
        { label: "Height", value: "1795 mm" },
        { label: "Wheelbase", value: "2964 mm" }
      ],
      performance: [
        { label: "Mileage", value: "9 kmpl" },
        { label: "Top Speed", value: "210 kmph" }
      ],
      features: [
        { label: "Screen Space", value: "136.65 cm Total" },
        { label: "Dash Cam", value: "Integrated, Always-On" },
        { label: "Sound System", value: "McIntosh 19-Speaker" },
        { label: "Side-Step", value: "Motorised, Auto-Deploy" }
      ],
      safety: [
        { label: "Airbags", value: "8 Airbags" },
        { label: "ADAS", value: "Full Suite" },
        { label: "Night Vision", value: "Available" },
        { label: "Air Suspension", value: "Standard" }
      ]
    },
    colors: [
      { name: "Diamond Black Crystal", hex: "#1A1A1A" },
      { name: "Bright White", hex: "#F5F5F5" },
      { name: "Rocky Mountain Pearl", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Signature Edition 4x4", price: "₹63.00 Lakh", priceNumeric: 6300000, features: ["4x4", "Air Suspension", "McIntosh Sound", "Dash Cam", "Motorised Side-Step"], fuelType: "Petrol", transmission: "Automatic" }
    ],
    offers: generateOffers("₹2,00,000", "₹1,50,000"),
    pros: ["Signature Edition Features", "Dash Cam Integrated", "Motorised Side-Step", "Premium Luxury"],
    cons: ["Very Expensive", "Poor Mileage", "Single Variant"],
    competitors: ["BMW X5", "Mercedes GLE", "Audi Q7"]
  }
];

export default jeepCars;
