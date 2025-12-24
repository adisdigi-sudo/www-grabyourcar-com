import { Car, generateOffers } from "./types";

const kiaCars: Car[] = [
  {
    id: 401,
    slug: "kia-seltos",
    name: "Kia Seltos",
    brand: "Kia",
    bodyType: "Compact SUV",
    tagline: "The Badass SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174323/seltos-interior-dashboard.jpeg"
    ],
    price: "₹10.90 - 20.35 Lakh",
    priceNumeric: 1090000,
    originalPrice: "₹11.50 Lakh",
    discount: "₹60,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic", "iMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The 2024 Kia Seltos is a feature-loaded compact SUV with bold design, ADAS safety, and multiple powertrain options.",
    keyHighlights: [
      "ADAS Level 2 Safety",
      "10.25-inch Dual Screens",
      "Panoramic Sunroof",
      "Ventilated Front Seats",
      "Bose 8-Speaker Sound",
      "360-Degree Camera"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Petrol / 1.5L Turbo / 1.5L Diesel" },
        { label: "Max Power", value: "113 bhp / 158 bhp / 114 bhp" },
        { label: "Max Torque", value: "144 Nm / 253 Nm / 250 Nm" },
        { label: "Displacement", value: "1497 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4365 mm" },
        { label: "Width", value: "1800 mm" },
        { label: "Height", value: "1645 mm" },
        { label: "Wheelbase", value: "2610 mm" },
        { label: "Boot Space", value: "433 L" },
        { label: "Ground Clearance", value: "190 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "17 kmpl" },
        { label: "Mileage (Diesel)", value: "21 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Connectivity", value: "Kia Connect" },
        { label: "Sound System", value: "Bose 8-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2 - 16 Features" },
        { label: "NCAP Rating", value: "5 Star (ANCAP)" },
        { label: "ESC", value: "Standard" }
      ]
    },
    colors: [
      { name: "Intense Red", hex: "#B22222" },
      { name: "Aurora Black Pearl", hex: "#1A1A1A" },
      { name: "Glacier White Pearl", hex: "#F5F5F5" },
      { name: "Gravity Grey", hex: "#4A4A4A" },
      { name: "Imperial Blue", hex: "#2E5090" },
      { name: "Pewter Olive", hex: "#5C5346" }
    ],
    variants: [
      { name: "HTE", price: "₹10.90 Lakh", features: ["6 Airbags", "ABS", "Manual AC"] },
      { name: "HTK", price: "₹12.50 Lakh", features: ["8-inch Screen", "Rear AC", "LED DRLs"] },
      { name: "HTK+", price: "₹14.50 Lakh", features: ["Sunroof", "Wireless Charger", "Auto Climate"] },
      { name: "HTX", price: "₹16.50 Lakh", features: ["10.25 Screens", "Ventilated Seats", "ADAS Level 1"] },
      { name: "GTX+", price: "₹18.50 Lakh", features: ["ADAS Level 2", "Bose Sound", "360 Camera"] },
      { name: "X-Line", price: "₹20.35 Lakh", features: ["X-Line Styling", "Premium Interior", "All Features"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["ADAS Safety", "Feature Rich", "Multiple Engines", "Premium Feel"],
    cons: ["Expensive Top Variant", "Turbo Only with DCT", "Average Mileage"],
    competitors: ["Hyundai Creta", "Maruti Grand Vitara", "Tata Harrier", "MG Astor"]
  },
  {
    id: 402,
    slug: "kia-sonet",
    name: "Kia Sonet",
    brand: "Kia",
    bodyType: "Compact SUV",
    tagline: "The Wild. The Classy.",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-right-front-three-quarter-7.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-right-front-three-quarter-7.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141115/sonet-interior-dashboard.jpeg"
    ],
    price: "₹7.99 - 15.69 Lakh",
    priceNumeric: 799000,
    originalPrice: "₹8.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic", "iMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Kia Sonet is a stylish compact SUV with segment-first features, powerful engines, and bold design.",
    keyHighlights: [
      "10.25-inch Touchscreen",
      "Bose Premium Sound",
      "Electric Sunroof",
      "Ventilated Front Seats",
      "UVO Connected Car",
      "1.0L Turbo with DCT"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Petrol / 1.0L Turbo / 1.5L Diesel" },
        { label: "Max Power", value: "82 bhp / 118 bhp / 113 bhp" },
        { label: "Max Torque", value: "115 Nm / 172 Nm / 250 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1790 mm" },
        { label: "Height", value: "1642 mm" },
        { label: "Wheelbase", value: "2500 mm" },
        { label: "Boot Space", value: "392 L" },
        { label: "Ground Clearance", value: "211 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "18.4 kmpl" },
        { label: "Mileage (Diesel)", value: "24.1 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "UVO Connect" },
        { label: "Sound System", value: "Bose 7-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESC", value: "Standard" },
        { label: "Hill Assist", value: "Available" }
      ]
    },
    colors: [
      { name: "Intense Red", hex: "#B22222" },
      { name: "Aurora Black Pearl", hex: "#1A1A1A" },
      { name: "Glacier White Pearl", hex: "#F5F5F5" },
      { name: "Gravity Grey", hex: "#4A4A4A" },
      { name: "Imperial Blue", hex: "#2E5090" }
    ],
    variants: [
      { name: "HTE", price: "₹7.99 Lakh", features: ["6 Airbags", "ABS", "Power Windows"] },
      { name: "HTK", price: "₹9.50 Lakh", features: ["Touchscreen", "Rear AC", "Central Locking"] },
      { name: "HTK+", price: "₹11.50 Lakh", features: ["Sunroof", "Wireless Charger", "Auto Climate"] },
      { name: "HTX", price: "₹13.00 Lakh", features: ["10.25 Screen", "Ventilated Seats", "LED Lamps"] },
      { name: "GTX+", price: "₹15.69 Lakh", features: ["Bose Sound", "Air Purifier", "Premium Interior"] }
    ],
    offers: generateOffers("₹30,000", "₹35,000"),
    pros: ["Feature Rich", "Multiple Engines", "Stylish Design", "Good Mileage"],
    cons: ["Cramped Rear", "Firm Ride", "Base Variant Basic"],
    competitors: ["Hyundai Venue", "Tata Nexon", "Maruti Brezza", "Mahindra XUV 3XO"]
  },
  {
    id: 403,
    slug: "kia-carens",
    name: "Kia Carens",
    brand: "Kia",
    bodyType: "MPV",
    tagline: "The Recreational Vehicle",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/143865/carens-interior-dashboard.jpeg"
    ],
    price: "₹10.52 - 19.67 Lakh",
    priceNumeric: 1052000,
    originalPrice: "₹11.00 Lakh",
    discount: "₹48,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Kia Carens is a 6/7-seater recreational vehicle with premium features, powerful engines, and spacious interiors.",
    keyHighlights: [
      "6/7 Seater Options",
      "10.25-inch Touchscreen",
      "Bose 8-Speaker Sound",
      "One-Touch Tumble Seats",
      "64-Color Ambient Lighting",
      "Ventilated Seats"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Petrol / 1.5L Turbo / 1.5L Diesel" },
        { label: "Max Power", value: "113 bhp / 158 bhp / 113 bhp" },
        { label: "Max Torque", value: "144 Nm / 253 Nm / 250 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4540 mm" },
        { label: "Width", value: "1800 mm" },
        { label: "Height", value: "1700 mm" },
        { label: "Wheelbase", value: "2780 mm" },
        { label: "Boot Space", value: "216 L (7-seat)" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "14 kmpl" },
        { label: "Mileage (Diesel)", value: "21.3 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "UVO Connect" },
        { label: "Sound System", value: "Bose 8-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "3 Star (GNCAP)" },
        { label: "ESC", value: "Standard" }
      ]
    },
    colors: [
      { name: "Imperial Blue", hex: "#2E5090" },
      { name: "Sparkling Silver", hex: "#A8A9AD" },
      { name: "Glacier White Pearl", hex: "#F5F5F5" },
      { name: "Aurora Black Pearl", hex: "#1A1A1A" },
      { name: "Intense Red", hex: "#B22222" }
    ],
    variants: [
      { name: "Premium", price: "₹10.52 Lakh", features: ["6 Airbags", "8-inch Screen", "Manual AC"] },
      { name: "Prestige", price: "₹13.00 Lakh", features: ["Sunroof", "10.25 Screen", "Auto Climate"] },
      { name: "Prestige Plus", price: "₹15.50 Lakh", features: ["Ventilated Seats", "One-Touch Tumble"] },
      { name: "Luxury", price: "₹17.50 Lakh", features: ["Bose Sound", "64-Color Ambient", "Premium Interior"] },
      { name: "Luxury Plus", price: "₹19.67 Lakh", features: ["ADAS", "360 Camera", "All Features"] }
    ],
    offers: generateOffers("₹35,000", "₹45,000"),
    pros: ["Spacious", "Feature Rich", "Flexible Seating", "Good Engines"],
    cons: ["3-Star Safety Rating", "Average Third Row", "Boot Space Limited"],
    competitors: ["Maruti Ertiga", "Toyota Innova Hycross", "Hyundai Alcazar", "Mahindra Marazzo"]
  },
  {
    id: 404,
    slug: "kia-ev6",
    name: "Kia EV6",
    brand: "Kia",
    bodyType: "Electric",
    tagline: "Movement that Inspires",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/107607/ev6-interior-dashboard.jpeg"
    ],
    price: "₹60.97 - 65.97 Lakh",
    priceNumeric: 6097000,
    originalPrice: "₹62.00 Lakh",
    discount: "₹1,03,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Kia EV6 is a premium electric crossover with futuristic design, ultra-fast charging, and high-performance drivetrain.",
    keyHighlights: [
      "800V Ultra-Fast Charging",
      "77.4 kWh Battery Pack",
      "528 km Range (ARAI)",
      "Vehicle-to-Load (V2L)",
      "Dual 12.3-inch Screens",
      "AWD with 325 bhp"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous (Dual)" },
        { label: "Max Power", value: "325 bhp (AWD)" },
        { label: "Max Torque", value: "605 Nm" },
        { label: "Battery", value: "77.4 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "4695 mm" },
        { label: "Width", value: "1890 mm" },
        { label: "Height", value: "1550 mm" },
        { label: "Wheelbase", value: "2900 mm" },
        { label: "Boot Space", value: "520 L" }
      ],
      performance: [
        { label: "Range (ARAI)", value: "528 km" },
        { label: "Top Speed", value: "188 kmph" },
        { label: "0-100 kmph", value: "5.2 sec (AWD)" },
        { label: "Fast Charging", value: "10-80% in 18 min" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Instrument Cluster", value: "12.3-inch Digital" },
        { label: "Connectivity", value: "Kia Connect" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2 - 21 Features" },
        { label: "NCAP Rating", value: "5 Star (Euro NCAP)" }
      ]
    },
    colors: [
      { name: "Moonscape", hex: "#4A4A4A" },
      { name: "Snow White Pearl", hex: "#F5F5F5" },
      { name: "Yacht Blue", hex: "#2E5090" },
      { name: "Runway Red", hex: "#B22222" }
    ],
    variants: [
      { name: "GT-Line RWD", price: "₹60.97 Lakh", features: ["77.4 kWh", "RWD", "ADAS", "V2L"] },
      { name: "GT-Line AWD", price: "₹65.97 Lakh", features: ["AWD", "325 bhp", "Premium Interior", "All Features"] }
    ],
    offers: generateOffers("₹1,00,000", "₹50,000"),
    pros: ["Fast Charging", "Long Range", "AWD Performance", "Premium Quality"],
    cons: ["Expensive", "Limited Service Network", "Ground Clearance Low"],
    competitors: ["Hyundai Ioniq 5", "BMW iX1", "Mercedes EQA"]
  },
  {
    id: 405,
    slug: "kia-ev9",
    name: "Kia EV9",
    brand: "Kia",
    bodyType: "Electric",
    tagline: "The Flagship Electric SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174971/ev9-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174971/ev9-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174971/ev9-exterior-rear-view.jpeg"
    ],
    price: "₹1.30 Cr (est.)",
    priceNumeric: 13000000,
    originalPrice: "₹1.35 Cr",
    discount: "₹5,00,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "Coming Soon",
    isHot: true,
    isLimited: true,
    isNew: true,
    isUpcoming: true,
    launchDate: "Q1 2025",
    overview: "The Kia EV9 is a flagship 6-seater electric SUV with 541 km range, ultra-fast charging, and futuristic design.",
    keyHighlights: [
      "99.8 kWh Battery Pack",
      "541 km Range (WLTP)",
      "800V Ultra-Fast Charging",
      "6-Seater with Captain Chairs",
      "Level 3 ADAS",
      "Digital Side Mirrors"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous (Dual)" },
        { label: "Max Power", value: "379 bhp (AWD)" },
        { label: "Max Torque", value: "700 Nm" },
        { label: "Battery", value: "99.8 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "5015 mm" },
        { label: "Width", value: "1980 mm" },
        { label: "Height", value: "1780 mm" },
        { label: "Wheelbase", value: "3100 mm" },
        { label: "Boot Space", value: "333 L (6-seat)" }
      ],
      performance: [
        { label: "Range (WLTP)", value: "541 km" },
        { label: "Top Speed", value: "200 kmph" },
        { label: "0-100 kmph", value: "5.3 sec" },
        { label: "Fast Charging", value: "10-80% in 24 min" }
      ],
      features: [
        { label: "Infotainment", value: "Dual 12.3-inch Screens" },
        { label: "Connectivity", value: "Kia Connect+" }
      ],
      safety: [
        { label: "Airbags", value: "8 Airbags" },
        { label: "ADAS", value: "Level 3" },
        { label: "NCAP Rating", value: "5 Star (Euro NCAP)" }
      ]
    },
    colors: [
      { name: "Ivory Silver", hex: "#C0C0C0" },
      { name: "Aurora Black Pearl", hex: "#1A1A1A" },
      { name: "Snow White Pearl", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "GT-Line AWD", price: "₹1.30 Cr (est.)", features: ["99.8 kWh", "AWD", "All Features"] }
    ],
    offers: generateOffers("₹0", "₹0"),
    pros: ["Flagship EV", "Long Range", "Ultra-Fast Charging", "6-Seater Luxury"],
    cons: ["Very Expensive", "Limited Charging Network", "Large Size"],
    competitors: ["BMW iX", "Mercedes EQE SUV", "Audi Q8 e-tron"]
  },
  {
    id: 406,
    slug: "kia-carnival",
    name: "Kia Carnival",
    brand: "Kia",
    bodyType: "MPV",
    tagline: "The Grand Carnival",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/165573/carnival-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/165573/carnival-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/165573/carnival-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/165573/carnival-interior-dashboard.jpeg"
    ],
    price: "₹63.90 - 63.90 Lakh",
    priceNumeric: 6390000,
    originalPrice: "₹65.00 Lakh",
    discount: "₹1,10,000",
    fuelTypes: ["Diesel"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: true,
    isUpcoming: false,
    overview: "The 2024 Kia Carnival is a premium 7-seater luxury MPV with first-class seats, powerful diesel engine, and loaded features.",
    keyHighlights: [
      "VIP Lounge Seats",
      "Dual 12.3-inch Screens",
      "Smart Power Sliding Doors",
      "Bose 12-Speaker Sound",
      "Dual Sunroof",
      "ADAS Level 2"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.2L Smartstream Diesel" },
        { label: "Max Power", value: "193 bhp" },
        { label: "Max Torque", value: "441 Nm" },
        { label: "Displacement", value: "2199 cc" }
      ],
      dimensions: [
        { label: "Length", value: "5155 mm" },
        { label: "Width", value: "1995 mm" },
        { label: "Height", value: "1775 mm" },
        { label: "Wheelbase", value: "3090 mm" }
      ],
      performance: [
        { label: "Mileage", value: "13.9 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Instrument Cluster", value: "12.3-inch Digital" },
        { label: "Sound System", value: "Bose 12-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "8 Airbags" },
        { label: "ADAS", value: "Level 2" },
        { label: "ESC", value: "Standard" }
      ]
    },
    colors: [
      { name: "Aurora Black Pearl", hex: "#1A1A1A" },
      { name: "Glacier White Pearl", hex: "#F5F5F5" },
      { name: "Panthera Metal", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Limousine Plus", price: "₹63.90 Lakh", features: ["VIP Seats", "ADAS", "All Features"] }
    ],
    offers: generateOffers("₹1,00,000", "₹50,000"),
    pros: ["Luxury MPV", "VIP Seats", "Powerful Diesel", "Feature Loaded"],
    cons: ["Very Expensive", "Only Single Variant", "Large Size"],
    competitors: ["Toyota Vellfire", "Mercedes V-Class"]
  },
  {
    id: 407,
    slug: "kia-syros",
    name: "Kia Syros",
    brand: "Kia",
    bodyType: "Compact SUV",
    tagline: "The Compact Powerhouse",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/176213/syros-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/176213/syros-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/176213/syros-exterior-rear-view.jpeg"
    ],
    price: "₹9.00 - 15.00 Lakh (est.)",
    priceNumeric: 900000,
    originalPrice: "₹9.50 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "Coming Soon",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: true,
    launchDate: "Q1 2025",
    overview: "The Kia Syros is a new compact SUV positioned between Sonet and Seltos with boxy design and premium features.",
    keyHighlights: [
      "Boxy SUV Design",
      "ADAS Safety Features",
      "Panoramic Sunroof",
      "Dual 10.25-inch Screens",
      "Ventilated Front Seats",
      "Level 2 ADAS"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L Turbo Petrol / 1.5L Diesel" },
        { label: "Max Power", value: "118 bhp / 113 bhp" },
        { label: "Max Torque", value: "172 Nm / 250 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4100 mm (est.)" },
        { label: "Width", value: "1800 mm (est.)" },
        { label: "Height", value: "1665 mm (est.)" },
        { label: "Wheelbase", value: "2550 mm (est.)" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "17 kmpl (est.)" },
        { label: "Mileage (Diesel)", value: "21 kmpl (est.)" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "Kia Connect" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" }
      ]
    },
    colors: [
      { name: "White", hex: "#F5F5F5" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Blue", hex: "#2E5090" },
      { name: "Grey", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "HTE", price: "₹9.00 Lakh (est.)", features: ["6 Airbags", "ABS", "Power Windows"] },
      { name: "HTK+", price: "₹11.00 Lakh (est.)", features: ["Sunroof", "Touchscreen", "Auto Climate"] },
      { name: "HTX+", price: "₹13.00 Lakh (est.)", features: ["ADAS Level 1", "Dual Screens", "Ventilated Seats"] },
      { name: "GTX+", price: "₹15.00 Lakh (est.)", features: ["ADAS Level 2", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹0", "₹0"),
    pros: ["Unique Design", "ADAS Safety", "Premium Features", "Kia Quality"],
    cons: ["Unproven Product", "Pricing Unknown", "Competition Strong"],
    competitors: ["Hyundai Venue", "Tata Nexon", "Maruti Brezza", "Mahindra XUV 3XO"]
  }
];

export default kiaCars;
