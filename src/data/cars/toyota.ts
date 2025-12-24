import { Car, generateOffers } from "./types";

const toyotaCars: Car[] = [
  {
    id: 501,
    slug: "toyota-innova-hycross",
    name: "Toyota Innova Hycross",
    brand: "Toyota",
    bodyType: "MPV",
    tagline: "Self-Charging Hybrid",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112183/innova-hycross-exterior-right-front-three-quarter-7.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112183/innova-hycross-exterior-right-front-three-quarter-7.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112183/innova-hycross-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112183/innova-hycross-interior-dashboard.jpeg"
    ],
    price: "₹19.77 - 30.98 Lakh",
    priceNumeric: 1977000,
    originalPrice: "₹20.50 Lakh",
    discount: "₹73,000",
    fuelTypes: ["Petrol", "Hybrid"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Toyota Innova Hycross is a revolutionary MPV with strong hybrid technology, premium features, and legendary Toyota reliability.",
    keyHighlights: [
      "Strong Hybrid Technology",
      "Self-Charging Battery",
      "10.1-inch Touchscreen",
      "Ottoman Seats (2nd Row)",
      "Panoramic Sunroof",
      "ADAS Safety Suite"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Petrol / 2.0L Hybrid" },
        { label: "Max Power", value: "174 bhp / 186 bhp (Combined)" },
        { label: "Max Torque", value: "205 Nm" },
        { label: "Displacement", value: "1987 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4755 mm" },
        { label: "Width", value: "1850 mm" },
        { label: "Height", value: "1795 mm" },
        { label: "Wheelbase", value: "2850 mm" },
        { label: "Boot Space", value: "239 L (7-seat)" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "16.13 kmpl" },
        { label: "Mileage (Hybrid)", value: "21.1 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.1-inch Touchscreen" },
        { label: "Instrument Cluster", value: "7-inch MID" },
        { label: "Sound System", value: "JBL 9-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Toyota Safety Sense" },
        { label: "NCAP Rating", value: "5 Star" }
      ]
    },
    colors: [
      { name: "Super White", hex: "#FFFFFF" },
      { name: "Attitude Black", hex: "#1A1A1A" },
      { name: "Silver Metallic", hex: "#A8A9AD" },
      { name: "Sparkling Black", hex: "#2A2A2A" },
      { name: "Avant-Garde Bronze", hex: "#8B7355" }
    ],
    variants: [
      { name: "G", price: "₹19.77 Lakh", features: ["6 Airbags", "8-inch Screen", "Manual AC"] },
      { name: "GX", price: "₹21.50 Lakh", features: ["Auto Climate", "LED Headlamps", "8-Seater"] },
      { name: "VX", price: "₹25.00 Lakh", features: ["Sunroof", "Ottoman Seats", "ADAS"] },
      { name: "ZX", price: "₹28.50 Lakh", features: ["JBL Sound", "Panoramic Sunroof", "360 Camera"] },
      { name: "ZX(O) Hybrid", price: "₹30.98 Lakh", features: ["Strong Hybrid", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹50,000", "₹60,000"),
    pros: ["Hybrid Efficiency", "Premium Quality", "Ottoman Seats", "Toyota Reliability"],
    cons: ["Expensive", "No Diesel", "Long Waiting Period"],
    competitors: ["Kia Carnival", "Mahindra XUV700", "Hyundai Alcazar"]
  },
  {
    id: 502,
    slug: "toyota-fortuner",
    name: "Toyota Fortuner",
    brand: "Toyota",
    bodyType: "Full-Size SUV",
    tagline: "The True SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/44709/fortuner-exterior-right-front-three-quarter-19.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/44709/fortuner-exterior-right-front-three-quarter-19.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/44709/fortuner-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/44709/fortuner-interior-dashboard.jpeg"
    ],
    price: "₹33.43 - 51.44 Lakh",
    priceNumeric: 3343000,
    originalPrice: "₹34.00 Lakh",
    discount: "₹57,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Toyota Fortuner is India's most iconic full-size SUV with powerful engines, 4x4 capability, and bulletproof reliability.",
    keyHighlights: [
      "4x4 with Low Range",
      "2.8L Diesel Engine",
      "8-inch Touchscreen",
      "Connected Car Tech",
      "Toyota Safety Sense",
      "Commanding Road Presence"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.7L Petrol / 2.8L Diesel" },
        { label: "Max Power", value: "163 bhp / 201 bhp" },
        { label: "Max Torque", value: "245 Nm / 500 Nm" },
        { label: "Displacement", value: "2694 / 2755 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4795 mm" },
        { label: "Width", value: "1855 mm" },
        { label: "Height", value: "1835 mm" },
        { label: "Wheelbase", value: "2745 mm" },
        { label: "Ground Clearance", value: "221 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "10 kmpl" },
        { label: "Mileage (Diesel)", value: "14.4 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Toyota Connect" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" },
        { label: "ADAS", value: "Toyota Safety Sense" },
        { label: "Hill Assist", value: "Descent Control" }
      ]
    },
    colors: [
      { name: "Super White", hex: "#FFFFFF" },
      { name: "Attitude Black", hex: "#1A1A1A" },
      { name: "Phantom Brown", hex: "#4A3728" },
      { name: "Sparkling Black", hex: "#2A2A2A" },
      { name: "Pearl White", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "4x2 MT", price: "₹33.43 Lakh", features: ["Diesel", "2WD", "7 Airbags"] },
      { name: "4x2 AT", price: "₹36.50 Lakh", features: ["Automatic", "LED Lamps", "Connected Car"] },
      { name: "4x4 MT", price: "₹41.00 Lakh", features: ["4WD", "Diff Lock", "Hill Descent"] },
      { name: "4x4 AT", price: "₹44.00 Lakh", features: ["4WD Automatic", "ADAS", "Premium Interior"] },
      { name: "Legender", price: "₹51.44 Lakh", features: ["Legender Design", "4WD", "All Features"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["Bulletproof Reliability", "Strong Diesel", "4x4 Capability", "High Resale"],
    cons: ["Expensive", "Dated Interiors", "Heavy to Maneuver"],
    competitors: ["MG Gloster", "Ford Endeavour", "Isuzu MU-X"]
  },
  {
    id: 503,
    slug: "toyota-urban-cruiser-hyryder",
    name: "Toyota Urban Cruiser Hyryder",
    brand: "Toyota",
    bodyType: "Compact SUV",
    tagline: "The Self-Charging Hybrid SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106257/urban-cruiser-hyryder-exterior-right-front-three-quarter-4.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106257/urban-cruiser-hyryder-exterior-right-front-three-quarter-4.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106257/urban-cruiser-hyryder-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106257/urban-cruiser-hyryder-interior-dashboard.jpeg"
    ],
    price: "₹11.14 - 19.99 Lakh",
    priceNumeric: 1114000,
    originalPrice: "₹11.70 Lakh",
    discount: "₹56,000",
    fuelTypes: ["Petrol", "Hybrid", "CNG"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Toyota Urban Cruiser Hyryder is a compact SUV with strong hybrid technology, AWD option, and Toyota reliability.",
    keyHighlights: [
      "Strong Hybrid Technology",
      "AWD with Neo Drive",
      "9-inch Touchscreen",
      "Panoramic Sunroof",
      "Head-Up Display",
      "360-Degree Camera"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Petrol / 1.5L Hybrid / 1.5L CNG" },
        { label: "Max Power", value: "103 bhp / 115 bhp" },
        { label: "Max Torque", value: "137 Nm / 122 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4365 mm" },
        { label: "Width", value: "1795 mm" },
        { label: "Height", value: "1635 mm" },
        { label: "Wheelbase", value: "2600 mm" },
        { label: "Boot Space", value: "373 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "20.01 kmpl" },
        { label: "Mileage (Hybrid)", value: "27.97 kmpl" },
        { label: "Mileage (CNG)", value: "26.1 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "9-inch Touchscreen" },
        { label: "Connectivity", value: "Toyota i-Connect" },
        { label: "HUD", value: "Head-Up Display" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "TPMS", value: "Standard" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Enticing Silver", hex: "#A8A9AD" },
      { name: "Midnight Black", hex: "#1A1A1A" },
      { name: "Sporty Red", hex: "#B22222" },
      { name: "Gaming Grey", hex: "#4A4A4A" },
      { name: "Cafe White", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "E MT", price: "₹11.14 Lakh", features: ["6 Airbags", "Manual AC", "Halogen Lamps"] },
      { name: "S MT", price: "₹13.00 Lakh", features: ["9-inch Screen", "Auto Climate", "LED DRLs"] },
      { name: "G AT", price: "₹15.50 Lakh", features: ["Sunroof", "360 Camera", "Connected Car"] },
      { name: "V Hybrid", price: "₹17.50 Lakh", features: ["Strong Hybrid", "Panoramic Sunroof", "HUD"] },
      { name: "V AWD Hybrid", price: "₹19.99 Lakh", features: ["AWD", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹30,000", "₹40,000"),
    pros: ["Hybrid Efficiency", "AWD Option", "Toyota Reliability", "Good Features"],
    cons: ["Low Power", "Average Dynamics", "Boot Space"],
    competitors: ["Maruti Grand Vitara", "Hyundai Creta", "Kia Seltos", "Honda Elevate"]
  },
  {
    id: 504,
    slug: "toyota-glanza",
    name: "Toyota Glanza",
    brand: "Toyota",
    bodyType: "Hatchback",
    tagline: "The Sporty Hatchback",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112839/glanza-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112839/glanza-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112839/glanza-exterior-rear-view.jpeg"
    ],
    price: "₹6.86 - 10.01 Lakh",
    priceNumeric: 686000,
    originalPrice: "₹7.20 Lakh",
    discount: "₹34,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Toyota Glanza is a premium hatchback based on Maruti Baleno with Toyota reliability and service network.",
    keyHighlights: [
      "9-inch SmartPlay Pro+",
      "Head-Up Display",
      "360-Degree Camera",
      "6 Airbags",
      "Arkamys Tuned Sound",
      "CNG Option Available"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L DualJet Petrol / 1.2L CNG" },
        { label: "Max Power", value: "88 bhp / 77 bhp" },
        { label: "Max Torque", value: "113 Nm / 98.5 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3990 mm" },
        { label: "Width", value: "1745 mm" },
        { label: "Height", value: "1500 mm" },
        { label: "Wheelbase", value: "2520 mm" },
        { label: "Boot Space", value: "318 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "22.35 kmpl" },
        { label: "Mileage (CNG)", value: "30.61 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "9-inch Touchscreen" },
        { label: "Connectivity", value: "Apple CarPlay, Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Cafe White", hex: "#F5F5F5" },
      { name: "Enticing Silver", hex: "#A8A9AD" },
      { name: "Gaming Grey", hex: "#4A4A4A" },
      { name: "Sporty Red", hex: "#B22222" }
    ],
    variants: [
      { name: "E", price: "₹6.86 Lakh", features: ["Dual Airbags", "ABS", "Manual AC"] },
      { name: "S", price: "₹8.00 Lakh", features: ["6 Airbags", "9-inch Screen", "Auto Climate"] },
      { name: "G", price: "₹9.00 Lakh", features: ["LED Lamps", "Push Start", "Cruise Control"] },
      { name: "V", price: "₹10.01 Lakh", features: ["HUD", "360 Camera", "Premium Interior"] }
    ],
    offers: generateOffers("₹20,000", "₹25,000"),
    pros: ["Toyota Reliability", "Good Mileage", "Feature Rich", "CNG Option"],
    cons: ["Maruti Rebadge", "Average Dynamics", "Basic Interiors"],
    competitors: ["Maruti Baleno", "Hyundai i20", "Tata Altroz", "Honda Jazz"]
  },
  {
    id: 505,
    slug: "toyota-rumion",
    name: "Toyota Rumion",
    brand: "Toyota",
    bodyType: "MPV",
    tagline: "The Family MPV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/132427/rumion-exterior-right-front-three-quarter-2.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/132427/rumion-exterior-right-front-three-quarter-2.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/132427/rumion-exterior-rear-view.jpeg"
    ],
    price: "₹10.44 - 13.73 Lakh",
    priceNumeric: 1044000,
    originalPrice: "₹11.00 Lakh",
    discount: "₹56,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Toyota Rumion is a 7-seater MPV based on Maruti Ertiga with Toyota's reliability and after-sales service.",
    keyHighlights: [
      "7-Seater Configuration",
      "7-inch SmartPlay Studio",
      "Auto Climate Control",
      "6 Airbags",
      "Cruise Control",
      "CNG Option"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L K-Series Petrol / 1.5L CNG" },
        { label: "Max Power", value: "103 bhp / 87 bhp" },
        { label: "Max Torque", value: "137 Nm / 121.5 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4395 mm" },
        { label: "Width", value: "1735 mm" },
        { label: "Height", value: "1690 mm" },
        { label: "Wheelbase", value: "2740 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "20.51 kmpl" },
        { label: "Mileage (CNG)", value: "26.68 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "7-inch Touchscreen" },
        { label: "Connectivity", value: "Android Auto, Apple CarPlay" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Cafe White", hex: "#F5F5F5" },
      { name: "Enticing Silver", hex: "#A8A9AD" },
      { name: "Midnight Black", hex: "#1A1A1A" }
    ],
    variants: [
      { name: "E", price: "₹10.44 Lakh", features: ["6 Airbags", "Manual AC", "Power Windows"] },
      { name: "G", price: "₹11.50 Lakh", features: ["Touchscreen", "Auto Climate", "Alloys"] },
      { name: "S", price: "₹12.50 Lakh", features: ["LED DRLs", "Push Start", "Cruise Control"] },
      { name: "S AT", price: "₹13.73 Lakh", features: ["Automatic", "All Features"] }
    ],
    offers: generateOffers("₹25,000", "₹30,000"),
    pros: ["7-Seater", "Toyota Reliability", "Good Mileage", "Practical"],
    cons: ["Ertiga Rebadge", "Basic Features", "Average Dynamics"],
    competitors: ["Maruti Ertiga", "Kia Carens", "Renault Triber"]
  },
  {
    id: 506,
    slug: "toyota-hilux",
    name: "Toyota Hilux",
    brand: "Toyota",
    bodyType: "Pickup",
    tagline: "Unbreakable",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/44707/hilux-exterior-right-front-three-quarter-2.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/44707/hilux-exterior-right-front-three-quarter-2.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/44707/hilux-exterior-rear-view.jpeg"
    ],
    price: "₹30.40 - 37.90 Lakh",
    priceNumeric: 3040000,
    originalPrice: "₹31.00 Lakh",
    discount: "₹60,000",
    fuelTypes: ["Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Toyota Hilux is an indestructible pickup truck with powerful diesel engine, 4x4 capability, and legendary durability.",
    keyHighlights: [
      "4x4 with Low Range",
      "2.8L Diesel Engine",
      "8-inch Touchscreen",
      "Electronic Diff Lock",
      "500 Nm Torque",
      "1.5 Ton Payload"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.8L Diesel" },
        { label: "Max Power", value: "201 bhp" },
        { label: "Max Torque", value: "500 Nm" },
        { label: "Displacement", value: "2755 cc" }
      ],
      dimensions: [
        { label: "Length", value: "5325 mm" },
        { label: "Width", value: "1855 mm" },
        { label: "Height", value: "1815 mm" },
        { label: "Wheelbase", value: "3085 mm" },
        { label: "Ground Clearance", value: "286 mm" }
      ],
      performance: [
        { label: "Mileage", value: "11.2 kmpl" },
        { label: "Payload", value: "485 kg" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Apple CarPlay, Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "Hill Assist", value: "Descent Control" }
      ]
    },
    colors: [
      { name: "Super White", hex: "#FFFFFF" },
      { name: "Attitude Black", hex: "#1A1A1A" },
      { name: "Silver Metallic", hex: "#A8A9AD" },
      { name: "Emotional Red", hex: "#B22222" }
    ],
    variants: [
      { name: "STD MT", price: "₹30.40 Lakh", features: ["4x4", "Manual", "7 Airbags"] },
      { name: "STD AT", price: "₹32.50 Lakh", features: ["Automatic", "Diff Lock"] },
      { name: "High MT", price: "₹35.00 Lakh", features: ["8-inch Screen", "LED Lamps", "Premium Interior"] },
      { name: "High AT", price: "₹37.90 Lakh", features: ["All Features", "Automatic", "Cruise Control"] }
    ],
    offers: generateOffers("₹50,000", "₹40,000"),
    pros: ["Legendary Durability", "Powerful Diesel", "4x4 Capability", "High Ground Clearance"],
    cons: ["Expensive", "Average Ride", "Poor City Maneuverability"],
    competitors: ["Isuzu V-Cross", "Ford Ranger"]
  },
  {
    id: 507,
    slug: "toyota-taisor",
    name: "Toyota Taisor",
    brand: "Toyota",
    bodyType: "Compact SUV",
    tagline: "The Bold SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/149663/taisor-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/149663/taisor-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/149663/taisor-exterior-rear-view.jpeg"
    ],
    price: "₹7.74 - 13.04 Lakh",
    priceNumeric: 774000,
    originalPrice: "₹8.20 Lakh",
    discount: "₹46,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Toyota Taisor is a compact crossover based on Maruti Fronx with bold design and Toyota's reliability.",
    keyHighlights: [
      "9-inch SmartPlay Pro+",
      "Head-Up Display",
      "360-Degree Camera",
      "Electric Sunroof",
      "1.0L Turbo Engine",
      "6 Airbags Standard"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Petrol / 1.0L Turbo / 1.2L CNG" },
        { label: "Max Power", value: "88 bhp / 99 bhp / 77 bhp" },
        { label: "Max Torque", value: "113 Nm / 148 Nm / 98.5 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1765 mm" },
        { label: "Height", value: "1550 mm" },
        { label: "Wheelbase", value: "2520 mm" },
        { label: "Boot Space", value: "308 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "22 kmpl" },
        { label: "Mileage (Turbo)", value: "20 kmpl" },
        { label: "Mileage (CNG)", value: "28.51 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "9-inch Touchscreen" },
        { label: "Connectivity", value: "Toyota i-Connect" },
        { label: "HUD", value: "Head-Up Display" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" },
        { label: "Hill Hold", value: "Available" }
      ]
    },
    colors: [
      { name: "Cafe White", hex: "#F5F5F5" },
      { name: "Enticing Silver", hex: "#A8A9AD" },
      { name: "Sizzling Red", hex: "#B22222" },
      { name: "Opulent Brown", hex: "#6B4423" },
      { name: "Lucent Orange", hex: "#FF6B35" }
    ],
    variants: [
      { name: "E MT", price: "₹7.74 Lakh", features: ["6 Airbags", "Manual AC", "Power Windows"] },
      { name: "S MT", price: "₹9.00 Lakh", features: ["9-inch Screen", "Auto Climate", "Alloys"] },
      { name: "S+ AT", price: "₹10.50 Lakh", features: ["Sunroof", "Automatic", "Push Start"] },
      { name: "V Turbo", price: "₹12.00 Lakh", features: ["Turbo Engine", "HUD", "360 Camera"] },
      { name: "V+ Turbo AT", price: "₹13.04 Lakh", features: ["All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹25,000", "₹30,000"),
    pros: ["Turbo Option", "Feature Rich", "Toyota Reliability", "Good Mileage"],
    cons: ["Fronx Rebadge", "Average Rear Space", "Basic Base Variant"],
    competitors: ["Maruti Fronx", "Hyundai Exter", "Tata Punch", "Nissan Magnite"]
  },
  {
    id: 508,
    slug: "toyota-camry",
    name: "Toyota Camry",
    brand: "Toyota",
    bodyType: "Sedan",
    tagline: "The Hybrid Sedan",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/110233/camry-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/110233/camry-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/110233/camry-exterior-rear-view.jpeg"
    ],
    price: "₹48.00 Lakh",
    priceNumeric: 4800000,
    originalPrice: "₹49.00 Lakh",
    discount: "₹1,00,000",
    fuelTypes: ["Hybrid"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Toyota Camry is a premium hybrid sedan with exceptional fuel efficiency, comfort, and Toyota's legendary reliability.",
    keyHighlights: [
      "Strong Hybrid Technology",
      "9-inch Touchscreen",
      "JBL Premium Sound",
      "Ventilated Seats",
      "Wireless Charging",
      "ADAS Safety Suite"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.5L Petrol Hybrid" },
        { label: "Max Power", value: "215 bhp (Combined)" },
        { label: "Max Torque", value: "221 Nm" },
        { label: "Displacement", value: "2487 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4885 mm" },
        { label: "Width", value: "1840 mm" },
        { label: "Height", value: "1455 mm" },
        { label: "Wheelbase", value: "2825 mm" },
        { label: "Boot Space", value: "524 L" }
      ],
      performance: [
        { label: "Mileage", value: "19 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "9-inch Touchscreen" },
        { label: "Sound System", value: "JBL Premium 9-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "9 Airbags" },
        { label: "ADAS", value: "Toyota Safety Sense" }
      ]
    },
    colors: [
      { name: "Platinum White Pearl", hex: "#F5F5F5" },
      { name: "Attitude Black", hex: "#1A1A1A" },
      { name: "Red Mica", hex: "#8B0000" }
    ],
    variants: [
      { name: "Hybrid", price: "₹48.00 Lakh", features: ["All Features", "ADAS", "JBL Sound", "Premium Interior"] }
    ],
    offers: generateOffers("₹80,000", "₹50,000"),
    pros: ["Hybrid Efficiency", "Premium Quality", "Comfortable", "Reliable"],
    cons: ["Expensive", "Single Variant", "Not Sporty"],
    competitors: ["Honda Accord", "Skoda Superb", "VW Passat"]
  }
];

export default toyotaCars;
