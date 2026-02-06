import { Car, generateOffers } from "./types";

const nissanCars: Car[] = [
  {
    id: 1201,
    slug: "nissan-magnite",
    name: "Nissan Magnite",
    brand: "Nissan",
    bodyType: "Compact SUV",
    tagline: "Big, Bold, Beautiful",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/163921/magnite-exterior-right-front-three-quarter-48.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/163921/magnite-exterior-right-front-three-quarter-48.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/163921/magnite-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/163921/magnite-interior-dashboard.jpeg"
    ],
    price: "₹6.00 - 11.50 Lakh",
    priceNumeric: 600000,
    originalPrice: "₹6.50 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "CVT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Nissan Magnite is an affordable compact SUV with bold styling, turbo petrol engine, and excellent value for money.",
    keyHighlights: [
      "1.0L Turbo Engine",
      "8-inch Touchscreen",
      "Wireless CarPlay & Android Auto",
      "360-Degree Camera",
      "LED Headlamps",
      "Best-in-Class Boot Space"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L NA / 1.0L Turbo" },
        { label: "Max Power", value: "71 bhp / 99 bhp" },
        { label: "Max Torque", value: "96 Nm / 160 Nm" },
        { label: "Displacement", value: "999 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3994 mm" },
        { label: "Width", value: "1758 mm" },
        { label: "Height", value: "1572 mm" },
        { label: "Wheelbase", value: "2500 mm" },
        { label: "Boot Space", value: "336 L" },
        { label: "Ground Clearance", value: "205 mm" }
      ],
      performance: [
        { label: "Mileage (NA)", value: "18.75 kmpl" },
        { label: "Mileage (Turbo)", value: "17.4 kmpl" },
        { label: "Top Speed", value: "165 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Wireless CarPlay & Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "Dual Airbags / 4 Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "ESP", value: "Available (Turbo)" }
      ]
    },
    colors: [
      { name: "Storm White", hex: "#F5F5F5" },
      { name: "Flare Garnet Red", hex: "#B22222" },
      { name: "Vivid Blue", hex: "#2E5090" },
      { name: "Sandstone Brown", hex: "#8B7355" },
      { name: "Blade Silver", hex: "#A8A9AD" },
      { name: "Onyx Black", hex: "#1A1A1A" }
    ],
    variants: [
      { name: "XE", price: "₹6.00 Lakh", priceNumeric: 600000, features: ["1.0L NA", "Manual AC", "Power Windows"], fuelType: "Petrol", transmission: "Manual" },
      { name: "XL", price: "₹7.00 Lakh", priceNumeric: 700000, features: ["8-inch Screen", "Rear Camera", "Alloys"], fuelType: "Petrol", transmission: "Manual" },
      { name: "XV", price: "₹8.20 Lakh", priceNumeric: 820000, features: ["LED Headlamps", "Push Start", "Auto Climate"], fuelType: "Petrol", transmission: "Manual" },
      { name: "XV Turbo", price: "₹9.00 Lakh", priceNumeric: 900000, features: ["Turbo Engine", "All Features"], fuelType: "Petrol", transmission: "Manual" },
      { name: "XV Turbo CVT", price: "₹10.00 Lakh", priceNumeric: 1000000, features: ["CVT Automatic", "Cruise Control"], fuelType: "Petrol", transmission: "CVT" },
      { name: "XV Premium Turbo CVT", price: "₹11.50 Lakh", priceNumeric: 1150000, features: ["360 Camera", "Wireless Charger", "Premium Interior"], fuelType: "Petrol", transmission: "CVT" }
    ],
    offers: generateOffers("₹35,000", "₹40,000"),
    pros: ["Value for Money", "Turbo Engine", "Good Ground Clearance", "Features"],
    cons: ["Average Safety", "Basic Interior", "Weak NA Engine"],
    competitors: ["Hyundai Venue", "Tata Nexon", "Maruti Brezza", "Kia Sonet"]
  },
  {
    id: 1202,
    slug: "nissan-kicks",
    name: "Nissan Kicks",
    brand: "Nissan",
    bodyType: "Compact SUV",
    tagline: "Intelligent Mobility",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/117673/kicks-exterior-right-front-three-quarter-2.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/117673/kicks-exterior-right-front-three-quarter-2.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/117673/kicks-exterior-rear-view.jpeg"
    ],
    price: "₹9.50 - 14.64 Lakh",
    priceNumeric: 950000,
    originalPrice: "₹10.00 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "CVT"],
    availability: "Limited Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Nissan Kicks is a premium compact SUV with spacious interiors, 360-degree camera, and refined turbo petrol engine.",
    keyHighlights: [
      "1.3L Turbo Engine",
      "8-inch Touchscreen",
      "360-Degree Camera",
      "Around View Monitor",
      "LED Headlamps",
      "Premium Interiors"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.3L Turbo Petrol" },
        { label: "Max Power", value: "154 bhp" },
        { label: "Max Torque", value: "254 Nm" },
        { label: "Displacement", value: "1332 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4384 mm" },
        { label: "Width", value: "1813 mm" },
        { label: "Height", value: "1590 mm" },
        { label: "Wheelbase", value: "2673 mm" },
        { label: "Boot Space", value: "432 L" }
      ],
      performance: [
        { label: "Mileage (MT)", value: "15 kmpl" },
        { label: "Mileage (CVT)", value: "14 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Nissan Connect" }
      ],
      safety: [
        { label: "Airbags", value: "4 Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "Around View", value: "360-Degree Camera" }
      ]
    },
    colors: [
      { name: "Pearl White", hex: "#F5F5F5" },
      { name: "Fire Red", hex: "#B22222" },
      { name: "Bronze Grey", hex: "#8B7355" },
      { name: "Blade Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "XL Turbo", price: "₹9.50 Lakh", priceNumeric: 950000, features: ["1.3L Turbo", "8-inch Screen", "LED Lamps"], fuelType: "Petrol", transmission: "Manual" },
      { name: "XV Turbo", price: "₹11.00 Lakh", priceNumeric: 1100000, features: ["360 Camera", "Push Start", "Auto Climate"], fuelType: "Petrol", transmission: "Manual" },
      { name: "XV Premium Turbo", price: "₹12.50 Lakh", priceNumeric: 1250000, features: ["Premium Sound", "Wireless Charger"], fuelType: "Petrol", transmission: "Manual" },
      { name: "XV Premium CVT", price: "₹14.64 Lakh", priceNumeric: 1464000, features: ["CVT", "All Features", "Premium Interior"], fuelType: "Petrol", transmission: "CVT" }
    ],
    offers: generateOffers("₹60,000", "₹50,000"),
    pros: ["Powerful Engine", "360 Camera", "Spacious", "Premium Feel"],
    cons: ["Limited Variants", "No Diesel", "Average Mileage"],
    competitors: ["Hyundai Creta", "Kia Seltos", "MG Astor"]
  },
  {
    id: 1203,
    slug: "nissan-x-trail",
    name: "Nissan X-Trail",
    brand: "Nissan",
    bodyType: "Full-Size SUV",
    tagline: "The e-Power SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/178063/x-trail-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/178063/x-trail-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/178063/x-trail-exterior-rear-view.jpeg"
    ],
    price: "₹49.92 Lakh",
    priceNumeric: 4992000,
    originalPrice: "₹51.00 Lakh",
    discount: "₹1,08,000",
    fuelTypes: ["Hybrid"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Nissan X-Trail is a premium SUV with e-Power hybrid technology, advanced ProPILOT ADAS, and premium features.",
    keyHighlights: [
      "e-Power Hybrid Tech",
      "ProPILOT ADAS",
      "12.3-inch Digital Cluster",
      "Panoramic Sunroof",
      "7-Seater Option",
      "AWD Available"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Turbo + Electric Motor (e-Power)" },
        { label: "Max Power", value: "201 bhp (Combined)" },
        { label: "Max Torque", value: "330 Nm" },
        { label: "System", value: "Series Hybrid" }
      ],
      dimensions: [
        { label: "Length", value: "4680 mm" },
        { label: "Width", value: "1840 mm" },
        { label: "Height", value: "1725 mm" },
        { label: "Wheelbase", value: "2705 mm" }
      ],
      performance: [
        { label: "Mileage", value: "18.3 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Instrument Cluster", value: "12.3-inch Digital" },
        { label: "Sound System", value: "Bose Premium" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" },
        { label: "ADAS", value: "ProPILOT Full Suite" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Pearl White", hex: "#F5F5F5" },
      { name: "Super Black", hex: "#1A1A1A" },
      { name: "Champagne Silver", hex: "#A8A9AD" },
      { name: "Diamond Black", hex: "#2A2A2A" }
    ],
    variants: [
      { name: "X-Trail e-Power", price: "₹49.92 Lakh", priceNumeric: 4992000, features: ["e-Power Hybrid", "ProPILOT", "All Features"], fuelType: "Hybrid", transmission: "Automatic" }
    ],
    offers: generateOffers("₹1,00,000", "₹80,000"),
    pros: ["e-Power Tech", "ProPILOT ADAS", "Premium Quality", "Good Mileage"],
    cons: ["Expensive", "Single Variant", "Brand Perception"],
    competitors: ["Toyota Fortuner", "Hyundai Tucson", "Skoda Kodiaq"]
  }
];

export default nissanCars;
