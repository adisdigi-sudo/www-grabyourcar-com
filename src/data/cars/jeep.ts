import { Car, generateOffers } from "./types";

const jeepCars: Car[] = [
  {
    id: 1101,
    slug: "jeep-compass",
    name: "Jeep Compass",
    brand: "Jeep",
    bodyType: "Mid-Size SUV",
    tagline: "Make Your Own Path",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141363/compass-exterior-right-front-three-quarter-67.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141363/compass-exterior-right-front-three-quarter-67.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141363/compass-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141363/compass-interior-dashboard.jpeg"
    ],
    price: "₹18.99 - 32.99 Lakh",
    priceNumeric: 1899000,
    originalPrice: "₹19.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Jeep Compass is a premium SUV with legendary Jeep capability, powerful engines, and premium European interiors.",
    keyHighlights: [
      "4x4 with Selec-Terrain",
      "10.1-inch Touchscreen",
      "Panoramic Sunroof",
      "Multijet Diesel Engine",
      "9-Speed Automatic",
      "Premium Interiors"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.4L Turbo Petrol / 2.0L Multijet Diesel" },
        { label: "Max Power", value: "160 bhp / 168 bhp" },
        { label: "Max Torque", value: "250 Nm / 350 Nm" }
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
        { label: "Mileage (Petrol)", value: "13 kmpl" },
        { label: "Mileage (Diesel)", value: "17.1 kmpl" },
        { label: "Top Speed", value: "190 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.1-inch Uconnect 5" },
        { label: "Sound System", value: "Alpine Premium" },
        { label: "Connectivity", value: "Alexa Enabled" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Available" },
        { label: "ESP", value: "Standard" }
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
      { name: "Sport 4x2", price: "₹18.99 Lakh", priceNumeric: 1899000, features: ["Diesel", "2WD", "6 Airbags", "LED Lamps"], fuelType: "Diesel", transmission: "Manual" },
      { name: "Longitude 4x2", price: "₹22.00 Lakh", priceNumeric: 2200000, features: ["10.1 Screen", "Sunroof", "Auto Climate"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Limited 4x2", price: "₹26.00 Lakh", priceNumeric: 2600000, features: ["Premium Interior", "Alpine Sound", "ADAS"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Model S 4x4", price: "₹29.99 Lakh", priceNumeric: 2999000, features: ["4WD", "Selec-Terrain", "9-Speed Auto"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Trailhawk 4x4", price: "₹32.99 Lakh", priceNumeric: 3299000, features: ["Trail Rated", "All Features", "Rock Mode"], fuelType: "Diesel", transmission: "Automatic" }
    ],
    offers: generateOffers("₹80,000", "₹70,000"),
    pros: ["4x4 Capability", "Premium Build", "Strong Diesel", "Off-Road Ready"],
    cons: ["Expensive", "Small Boot", "Average Mileage"],
    competitors: ["Hyundai Tucson", "Skoda Kodiaq", "VW Tiguan"]
  },
  {
    id: 1102,
    slug: "jeep-meridian",
    name: "Jeep Meridian",
    brand: "Jeep",
    bodyType: "Full-Size SUV",
    tagline: "The 7-Seater Jeep",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106807/meridian-exterior-right-front-three-quarter-4.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106807/meridian-exterior-right-front-three-quarter-4.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106807/meridian-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106807/meridian-interior-dashboard.jpeg"
    ],
    price: "₹29.90 - 36.95 Lakh",
    priceNumeric: 2990000,
    originalPrice: "₹30.50 Lakh",
    discount: "₹60,000",
    fuelTypes: ["Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Jeep Meridian is a 7-seater premium SUV with legendary Jeep capability, powerful diesel, and luxurious interiors.",
    keyHighlights: [
      "7-Seater Configuration",
      "4x4 with Selec-Terrain",
      "10.1-inch Uconnect 5",
      "Panoramic Sunroof",
      "9-Speed Automatic",
      "Trail Rated Badge"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Multijet Diesel" },
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
        { label: "Sound System", value: "Alpine 9-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Full Suite" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Bright White", hex: "#F5F5F5" },
      { name: "Brilliant Black", hex: "#1A1A1A" },
      { name: "Galaxy Blue", hex: "#2E5090" },
      { name: "Rocky Mountain", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Limited 4x2", price: "₹29.90 Lakh", priceNumeric: 2990000, features: ["7-Seater", "6 Airbags", "Panoramic Sunroof"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Limited (O) 4x2", price: "₹32.50 Lakh", priceNumeric: 3250000, features: ["ADAS", "Premium Sound", "Ventilated Seats"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Limited (O) 4x4", price: "₹34.50 Lakh", priceNumeric: 3450000, features: ["4WD", "Selec-Terrain", "All Features"], fuelType: "Diesel", transmission: "Automatic" },
      { name: "Overland 4x4", price: "₹36.95 Lakh", priceNumeric: 3695000, features: ["Trail Rated", "Premium Interior", "Captain Seats"], fuelType: "Diesel", transmission: "Automatic" }
    ],
    offers: generateOffers("₹1,00,000", "₹80,000"),
    pros: ["7-Seater", "4x4 Capability", "Premium Quality", "Trail Rated"],
    cons: ["Very Expensive", "Small Boot", "Heavy to Drive"],
    competitors: ["Toyota Fortuner", "MG Gloster", "Ford Endeavour"]
  },
  {
    id: 1103,
    slug: "jeep-wrangler",
    name: "Jeep Wrangler",
    brand: "Jeep",
    bodyType: "Off-Road SUV",
    tagline: "Iconic. Legendary.",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/49839/wrangler-exterior-right-front-three-quarter-18.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/49839/wrangler-exterior-right-front-three-quarter-18.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/49839/wrangler-exterior-rear-view.jpeg"
    ],
    price: "₹53.90 - 67.65 Lakh",
    priceNumeric: 5390000,
    originalPrice: "₹55.00 Lakh",
    discount: "₹1,10,000",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Jeep Wrangler is the iconic off-road SUV with legendary capability, removable roof, and distinctive design.",
    keyHighlights: [
      "Command-Trac 4x4",
      "Removable Roof & Doors",
      "2.0L Turbo Engine",
      "8.4-inch Uconnect",
      "Dana Axles",
      "Trail Rated"
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
        { label: "Infotainment", value: "8.4-inch Uconnect" },
        { label: "Roof", value: "Removable Hardtop" }
      ],
      safety: [
        { label: "Airbags", value: "4 Airbags" },
        { label: "Trail Rated", value: "Yes" },
        { label: "Skid Plates", value: "Standard" }
      ]
    },
    colors: [
      { name: "Black", hex: "#1A1A1A" },
      { name: "Bright White", hex: "#F5F5F5" },
      { name: "Firecracker Red", hex: "#B22222" },
      { name: "Sarge Green", hex: "#4A5D45" }
    ],
    variants: [
      { name: "Unlimited", price: "₹53.90 Lakh", priceNumeric: 5390000, features: ["4x4", "Removable Roof", "Uconnect"], fuelType: "Petrol", transmission: "Automatic" },
      { name: "Rubicon", price: "₹67.65 Lakh", priceNumeric: 6765000, features: ["Rock-Trac 4x4", "Lockers", "Dana 44 Axles"], fuelType: "Petrol", transmission: "Automatic" }
    ],
    offers: generateOffers("₹1,50,000", "₹1,00,000"),
    pros: ["Iconic Design", "Off-Road Legend", "Removable Roof", "Resale Value"],
    cons: ["Very Expensive", "Poor Mileage", "Not Practical"],
    competitors: ["Force Gurkha", "Mahindra Thar"]
  },
  {
    id: 1104,
    slug: "jeep-grand-cherokee",
    name: "Jeep Grand Cherokee",
    brand: "Jeep",
    bodyType: "Luxury SUV",
    tagline: "The Pinnacle of Jeep",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/109417/grand-cherokee-exterior-right-front-three-quarter-5.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/109417/grand-cherokee-exterior-right-front-three-quarter-5.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/109417/grand-cherokee-exterior-rear-view.jpeg"
    ],
    price: "₹77.50 Lakh",
    priceNumeric: 7750000,
    originalPrice: "₹79.00 Lakh",
    discount: "₹1,50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Jeep Grand Cherokee is the flagship luxury SUV with advanced technology, premium materials, and legendary capability.",
    keyHighlights: [
      "Quadra-Trac II 4x4",
      "10.1-inch Dual Screens",
      "Air Suspension",
      "McIntosh Sound",
      "5-Link Suspension",
      "Premium Luxury"
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
        { label: "Infotainment", value: "10.1-inch Uconnect 5" },
        { label: "Sound System", value: "McIntosh 19-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "8 Airbags" },
        { label: "ADAS", value: "Full Suite" },
        { label: "Night Vision", value: "Available" }
      ]
    },
    colors: [
      { name: "Diamond Black Crystal", hex: "#1A1A1A" },
      { name: "Bright White", hex: "#F5F5F5" },
      { name: "Rocky Mountain Pearl", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Limited 4x4", price: "₹77.50 Lakh", priceNumeric: 7750000, features: ["4x4", "Air Suspension", "McIntosh Sound", "All Features"], fuelType: "Petrol", transmission: "Automatic" }
    ],
    offers: generateOffers("₹2,00,000", "₹1,50,000"),
    pros: ["Ultra Luxury", "4x4 Capability", "Premium Features", "Build Quality"],
    cons: ["Very Expensive", "Poor Mileage", "Single Variant"],
    competitors: ["BMW X5", "Mercedes GLE", "Audi Q7"]
  }
];

export default jeepCars;
