import { Car, generateOffers } from "./types";

const hondaCars: Car[] = [
  {
    id: 601,
    slug: "honda-city",
    name: "Honda City",
    brand: "Honda",
    bodyType: "Sedan",
    tagline: "The Sedan of Sedans",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/134287/city-exterior-right-front-three-quarter-77.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/134287/city-exterior-right-front-three-quarter-77.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/134287/city-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/134287/city-interior-dashboard.jpeg"
    ],
    price: "₹11.82 - 16.35 Lakh",
    priceNumeric: 1182000,
    originalPrice: "₹12.30 Lakh",
    discount: "₹48,000",
    fuelTypes: ["Petrol", "Hybrid"],
    transmission: ["Manual", "CVT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Honda City is India's most popular premium sedan with refined engine, spacious interiors, and strong hybrid option.",
    keyHighlights: [
      "Strong Hybrid e:HEV",
      "8-inch Touchscreen",
      "LaneWatch Camera",
      "Sunroof",
      "G-Design Shift CVT",
      "Honda Sensing ADAS"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L i-VTEC / 1.5L e:HEV Hybrid" },
        { label: "Max Power", value: "119 bhp / 126 bhp (Combined)" },
        { label: "Max Torque", value: "145 Nm / 253 Nm" },
        { label: "Displacement", value: "1498 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4553 mm" },
        { label: "Width", value: "1748 mm" },
        { label: "Height", value: "1489 mm" },
        { label: "Wheelbase", value: "2600 mm" },
        { label: "Boot Space", value: "506 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "18.4 kmpl" },
        { label: "Mileage (Hybrid)", value: "26.5 kmpl" },
        { label: "Top Speed", value: "185 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Honda Connect" },
        { label: "Sound System", value: "8-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Honda Sensing" },
        { label: "LaneWatch", value: "Available" }
      ]
    },
    colors: [
      { name: "Platinum White Pearl", hex: "#F5F5F5" },
      { name: "Modern Steel Metallic", hex: "#4A4A4A" },
      { name: "Radiant Red Metallic", hex: "#B22222" },
      { name: "Golden Brown Metallic", hex: "#8B7355" },
      { name: "Lunar Silver Metallic", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "V MT", price: "₹11.82 Lakh", features: ["6 Airbags", "LED Headlamps", "8-inch Screen"] },
      { name: "V CVT", price: "₹13.00 Lakh", features: ["CVT", "Cruise Control", "Push Start"] },
      { name: "VX CVT", price: "₹14.00 Lakh", features: ["Sunroof", "LaneWatch", "Connected Car"] },
      { name: "ZX CVT", price: "₹15.00 Lakh", features: ["Premium Interior", "All Features"] },
      { name: "ZX e:HEV", price: "₹16.35 Lakh", features: ["Strong Hybrid", "ADAS", "Sport Mode"] }
    ],
    offers: generateOffers("₹35,000", "₹40,000"),
    pros: ["Refined Engine", "Hybrid Option", "Spacious", "Good Ride Quality"],
    cons: ["Average Features", "Dated Interiors", "No Diesel"],
    competitors: ["Hyundai Verna", "Maruti Ciaz", "Skoda Slavia", "VW Virtus"]
  },
  {
    id: 602,
    slug: "honda-amaze",
    name: "Honda Amaze",
    brand: "Honda",
    bodyType: "Sedan",
    tagline: "For Amazing Journeys",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174279/amaze-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174279/amaze-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174279/amaze-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174279/amaze-interior-dashboard.jpeg"
    ],
    price: "₹8.00 - 11.00 Lakh (est.)",
    priceNumeric: 800000,
    originalPrice: "₹8.50 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "CVT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The all-new 2024 Honda Amaze is a completely redesigned compact sedan with bold styling, more space, and advanced features.",
    keyHighlights: [
      "All-New Design",
      "8-inch Touchscreen",
      "ADAS Safety Features",
      "Wireless Charging",
      "6 Airbags Standard",
      "LaneWatch Camera"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L i-VTEC Petrol" },
        { label: "Max Power", value: "88 bhp" },
        { label: "Max Torque", value: "110 Nm" },
        { label: "Displacement", value: "1199 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1733 mm" },
        { label: "Height", value: "1500 mm" },
        { label: "Wheelbase", value: "2470 mm" },
        { label: "Boot Space", value: "420 L" }
      ],
      performance: [
        { label: "Mileage", value: "18.5 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Honda Connect" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Available" },
        { label: "LaneWatch", value: "Available" }
      ]
    },
    colors: [
      { name: "Platinum White Pearl", hex: "#F5F5F5" },
      { name: "Radiant Red Metallic", hex: "#A3202A" },
      { name: "Meteoroid Grey Metallic", hex: "#55585C" },
      { name: "Lunar Silver Metallic", hex: "#C0C0C0" },
      { name: "Golden Brown Metallic", hex: "#6B4F3A" },
      { name: "Obsidian Blue Pearl", hex: "#1F3A5F" },
      { name: "Crystal Black Pearl", hex: "#1A1A1A" }
    ],
    variants: [
      { name: "V MT", price: "₹8.00 Lakh (est.)", features: ["6 Airbags", "LED DRLs", "Power Windows"] },
      { name: "V CVT", price: "₹9.00 Lakh (est.)", features: ["CVT", "Touchscreen", "Rear Camera"] },
      { name: "VX CVT", price: "₹10.00 Lakh (est.)", features: ["Sunroof", "LaneWatch", "Connected Car"] },
      { name: "ZX CVT", price: "₹11.00 Lakh (est.)", features: ["ADAS", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹20,000", "₹30,000"),
    pros: ["New Design", "ADAS Safety", "Honda Reliability", "Spacious Boot"],
    cons: ["No Diesel", "Underpowered Engine", "CVT Only in Top"],
    competitors: ["Maruti Dzire", "Hyundai Aura", "Tata Tigor"]
  },
  {
    id: 603,
    slug: "honda-elevate",
    name: "Honda Elevate",
    brand: "Honda",
    bodyType: "Compact SUV",
    tagline: "Elevate Your Drive",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141585/elevate-exterior-right-front-three-quarter-5.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141585/elevate-exterior-right-front-three-quarter-5.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141585/elevate-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141585/elevate-interior-dashboard.jpeg"
    ],
    price: "₹11.69 - 16.45 Lakh",
    priceNumeric: 1169000,
    originalPrice: "₹12.20 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "CVT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Honda Elevate is Honda's first compact SUV for India with spacious interiors, advanced safety, and refined driving experience.",
    keyHighlights: [
      "Honda SENSING ADAS",
      "10.25-inch Touchscreen",
      "LaneWatch Camera",
      "Electric Sunroof",
      "Wireless Charging",
      "6 Airbags Standard"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L i-VTEC Petrol" },
        { label: "Max Power", value: "119 bhp" },
        { label: "Max Torque", value: "145 Nm" },
        { label: "Displacement", value: "1498 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4312 mm" },
        { label: "Width", value: "1790 mm" },
        { label: "Height", value: "1650 mm" },
        { label: "Wheelbase", value: "2650 mm" },
        { label: "Boot Space", value: "458 L" },
        { label: "Ground Clearance", value: "220 mm" }
      ],
      performance: [
        { label: "Mileage (Manual)", value: "15.31 kmpl" },
        { label: "Mileage (CVT)", value: "16.92 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "Honda Connect" },
        { label: "Instrument Cluster", value: "7-inch TFT" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Honda SENSING" },
        { label: "LaneWatch", value: "Standard" }
      ]
    },
    colors: [
      { name: "Platinum White Pearl", hex: "#F5F5F5" },
      { name: "Golden Brown Metallic", hex: "#8B7355" },
      { name: "Lunar Silver Metallic", hex: "#A8A9AD" },
      { name: "Crystal Black Pearl", hex: "#1A1A1A" },
      { name: "Obsidian Blue Pearl", hex: "#2E5090" }
    ],
    variants: [
      { name: "SV MT", price: "₹11.69 Lakh", features: ["6 Airbags", "LED Lamps", "Auto Climate"] },
      { name: "V MT", price: "₹13.00 Lakh", features: ["10.25 Screen", "LaneWatch", "Wireless Charger"] },
      { name: "V CVT", price: "₹14.00 Lakh", features: ["CVT", "Sunroof", "Connected Car"] },
      { name: "VX CVT", price: "₹15.20 Lakh", features: ["Honda SENSING", "Premium Sound"] },
      { name: "ZX CVT", price: "₹16.45 Lakh", features: ["All Features", "Premium Interior", "Leather Seats"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["Honda SENSING ADAS", "Spacious Interiors", "Good Ride Quality", "High Ground Clearance"],
    cons: ["No Diesel/Turbo", "Average Mileage", "No AWD"],
    competitors: ["Hyundai Creta", "Kia Seltos", "Toyota Hyryder", "Maruti Grand Vitara"]
  },
  {
    id: 604,
    slug: "honda-city-hybrid",
    name: "Honda City e:HEV",
    brand: "Honda",
    bodyType: "Sedan",
    tagline: "The Strong Hybrid",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/134287/city-hybrid-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/134287/city-hybrid-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/134287/city-hybrid-exterior-rear-view.jpeg"
    ],
    price: "₹19.20 - 20.55 Lakh",
    priceNumeric: 1920000,
    originalPrice: "₹20.00 Lakh",
    discount: "₹80,000",
    fuelTypes: ["Hybrid"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Honda City e:HEV is a strong hybrid sedan with exceptional fuel efficiency, advanced ADAS, and premium features.",
    keyHighlights: [
      "Strong Hybrid e:HEV",
      "26.5 kmpl Mileage",
      "Honda SENSING ADAS",
      "Sport Mode",
      "Regenerative Braking",
      "Electric Power Mode"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L i-VTEC + Electric Motor" },
        { label: "Max Power", value: "126 bhp (Combined)" },
        { label: "Max Torque", value: "253 Nm (Motor)" },
        { label: "Battery", value: "Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "4553 mm" },
        { label: "Width", value: "1748 mm" },
        { label: "Height", value: "1489 mm" },
        { label: "Wheelbase", value: "2600 mm" },
        { label: "Boot Space", value: "306 L" }
      ],
      performance: [
        { label: "Mileage", value: "26.5 kmpl" },
        { label: "Top Speed", value: "175 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Honda Connect" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Honda SENSING" },
        { label: "LaneWatch", value: "Standard" }
      ]
    },
    colors: [
      { name: "Platinum White Pearl", hex: "#F5F5F5" },
      { name: "Lunar Silver Metallic", hex: "#A8A9AD" },
      { name: "Radiant Red Metallic", hex: "#B22222" }
    ],
    variants: [
      { name: "V", price: "₹19.20 Lakh", features: ["Hybrid", "6 Airbags", "Connected Car"] },
      { name: "ZX", price: "₹20.55 Lakh", features: ["Honda SENSING", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹60,000", "₹50,000"),
    pros: ["Exceptional Mileage", "ADAS Safety", "Smooth Hybrid", "Premium Feel"],
    cons: ["Expensive", "Reduced Boot Space", "No Sport Character"],
    competitors: ["Toyota Camry", "Hyundai Verna Turbo"]
  }
];

export default hondaCars;
