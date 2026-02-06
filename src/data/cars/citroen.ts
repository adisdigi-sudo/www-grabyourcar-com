import { Car, generateOffers } from "./types";

const citroenCars: Car[] = [
  {
    id: 1001,
    slug: "citroen-c3",
    name: "Citroen C3",
    brand: "Citroen",
    bodyType: "Hatchback",
    tagline: "Born Adventurous",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/c3-exterior-right-front-three-quarter-8.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/c3-exterior-right-front-three-quarter-8.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/c3-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/c3-interior-dashboard.jpeg"
    ],
    price: "₹6.16 - 9.99 Lakh",
    priceNumeric: 616000,
    originalPrice: "₹6.50 Lakh",
    discount: "₹34,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Citroen C3 is a quirky hatchback with SUV-like ground clearance, unique French styling, and practical interiors.",
    keyHighlights: [
      "180mm Ground Clearance",
      "10.25-inch Touchscreen",
      "Unique French Design",
      "Dual Airbags",
      "Spacious Interiors",
      "Low Running Cost"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Puretech Petrol" },
        { label: "Max Power", value: "81 bhp / 109 bhp" },
        { label: "Max Torque", value: "115 Nm / 190 Nm" },
        { label: "Displacement", value: "1199 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3981 mm" },
        { label: "Width", value: "1733 mm" },
        { label: "Height", value: "1586 mm" },
        { label: "Wheelbase", value: "2540 mm" },
        { label: "Boot Space", value: "315 L" },
        { label: "Ground Clearance", value: "180 mm" }
      ],
      performance: [
        { label: "Mileage (NA)", value: "19.8 kmpl" },
        { label: "Mileage (Turbo)", value: "19.4 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "Wireless CarPlay & Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "Dual Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "Speed Alert", value: "Standard" }
      ]
    },
    colors: [
      { name: "Polar White", hex: "#F5F5F5" },
      { name: "Steel Grey", hex: "#4A4A4A" },
      { name: "Zesty Orange", hex: "#FF6B35" },
      { name: "Platinum Grey", hex: "#A8A9AD" },
      { name: "Cosmo Blue", hex: "#2E5090" }
    ],
    variants: [
      { name: "Live", price: "₹6.16 Lakh", priceNumeric: 616000, features: ["1.2L NA", "Manual AC", "Power Windows"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Feel", price: "₹7.15 Lakh", priceNumeric: 715000, features: ["10.25 Screen", "Rear Camera", "Alloys"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Feel Turbo", price: "₹8.49 Lakh", priceNumeric: 849000, features: ["Turbo Engine", "LED DRLs", "Auto Climate"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Shine Turbo", price: "₹9.99 Lakh", priceNumeric: 999000, features: ["All Features", "Premium Interiors"], fuelType: "Petrol", transmission: "Manual" }
    ],
    offers: generateOffers("₹20,000", "₹25,000"),
    pros: ["Ground Clearance", "Unique Styling", "Spacious", "Comfortable Ride"],
    cons: ["Basic Safety", "Manual Only", "No Diesel"],
    competitors: ["Tata Punch", "Maruti Fronx", "Hyundai Exter"]
  },
  {
    id: 1002,
    slug: "citroen-c3-aircross",
    name: "Citroen C3 Aircross",
    brand: "Citroen",
    bodyType: "Compact SUV",
    tagline: "Ready for More",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/c3-aircross-exterior-right-front-three-quarter-6.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/c3-aircross-exterior-right-front-three-quarter-6.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/c3-aircross-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/c3-aircross-interior-dashboard.jpeg"
    ],
    price: "₹9.99 - 12.34 Lakh",
    priceNumeric: 999000,
    originalPrice: "₹10.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Citroen C3 Aircross is a compact SUV with 5/7-seater options, turbocharged engine, and comfortable ride.",
    keyHighlights: [
      "5/7-Seater Options",
      "Turbo Petrol Engine",
      "10.25-inch Touchscreen",
      "190mm Ground Clearance",
      "6-Speed Automatic",
      "Comfortable Suspension"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Puretech Turbo" },
        { label: "Max Power", value: "109 bhp" },
        { label: "Max Torque", value: "190 Nm" },
        { label: "Displacement", value: "1199 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4323 mm" },
        { label: "Width", value: "1765 mm" },
        { label: "Height", value: "1647 mm" },
        { label: "Wheelbase", value: "2671 mm" },
        { label: "Boot Space", value: "452 L (5-seat)" },
        { label: "Ground Clearance", value: "190 mm" }
      ],
      performance: [
        { label: "Mileage (MT)", value: "18.7 kmpl" },
        { label: "Mileage (AT)", value: "17.5 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "Wireless CarPlay & Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" },
        { label: "Hill Hold", value: "Available" }
      ]
    },
    colors: [
      { name: "Polar White", hex: "#F5F5F5" },
      { name: "Platinum Grey", hex: "#A8A9AD" },
      { name: "Cosmo Blue", hex: "#2E5090" },
      { name: "Steel Grey", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Plus 5-Seater", price: "₹9.99 Lakh", priceNumeric: 999000, features: ["6 Airbags", "10.25 Screen", "Alloys"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Plus 7-Seater", price: "₹10.50 Lakh", priceNumeric: 1050000, features: ["7-Seater", "Same Features"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Max 5-Seater", price: "₹11.50 Lakh", priceNumeric: 1150000, features: ["Sunroof", "Wireless Charger", "Premium Interior"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Max AT", price: "₹12.34 Lakh", priceNumeric: 1234000, features: ["6-Speed Auto", "All Features"], fuelType: "Petrol", transmission: "Automatic" }
    ],
    offers: generateOffers("₹35,000", "₹40,000"),
    pros: ["7-Seater Option", "Comfortable Ride", "Unique Design", "Good Features"],
    cons: ["Average Performance", "Brand Perception", "Service Network"],
    competitors: ["Hyundai Venue", "Tata Nexon", "Maruti Brezza", "Kia Sonet"]
  },
  {
    id: 1003,
    slug: "citroen-ec3",
    name: "Citroen eC3",
    brand: "Citroen",
    bodyType: "Electric",
    tagline: "Electric Freedom",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/128503/ec3-exterior-right-front-three-quarter-5.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/128503/ec3-exterior-right-front-three-quarter-5.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/128503/ec3-exterior-rear-view.jpeg"
    ],
    price: "₹11.61 - 13.14 Lakh",
    priceNumeric: 1161000,
    originalPrice: "₹12.00 Lakh",
    discount: "₹39,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Citroen eC3 is an affordable electric hatchback with practical range, comfortable ride, and quirky French design.",
    keyHighlights: [
      "320 km Range (ARAI)",
      "29.2 kWh Battery",
      "10.25-inch Touchscreen",
      "Fast Charging Support",
      "Low Running Cost",
      "City-Friendly Size"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "56 bhp" },
        { label: "Max Torque", value: "143 Nm" },
        { label: "Battery", value: "29.2 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "3981 mm" },
        { label: "Width", value: "1733 mm" },
        { label: "Height", value: "1604 mm" },
        { label: "Wheelbase", value: "2540 mm" },
        { label: "Boot Space", value: "315 L" }
      ],
      performance: [
        { label: "Range (ARAI)", value: "320 km" },
        { label: "Top Speed", value: "107 kmph" },
        { label: "Charging (0-100%)", value: "10.5 hrs (AC)" },
        { label: "Fast Charging", value: "0-80% in 57 min" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "Wireless CarPlay & Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "Dual Airbags" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Polar White", hex: "#F5F5F5" },
      { name: "Platinum Grey", hex: "#A8A9AD" },
      { name: "Zesty Orange", hex: "#FF6B35" },
      { name: "Cosmo Blue", hex: "#2E5090" }
    ],
    variants: [
      { name: "Live", price: "₹11.61 Lakh", priceNumeric: 1161000, features: ["29.2 kWh", "10.25 Screen", "Auto Climate"], fuelType: "Electric", transmission: "Automatic" },
      { name: "Feel", price: "₹12.49 Lakh", priceNumeric: 1249000, features: ["Alloys", "Rear Camera", "Fog Lamps"], fuelType: "Electric", transmission: "Automatic" },
      { name: "Shine", price: "₹13.14 Lakh", priceNumeric: 1314000, features: ["All Features", "Premium Interior"], fuelType: "Electric", transmission: "Automatic" }
    ],
    offers: generateOffers("₹25,000", "₹20,000"),
    pros: ["Affordable EV", "Good Range", "Comfortable Ride", "Low Running Cost"],
    cons: ["Basic Safety", "Slow Performance", "Limited Network"],
    competitors: ["Tata Tiago EV", "MG Comet EV", "Tata Punch EV"]
  },
  {
    id: 1004,
    slug: "citroen-basalt",
    name: "Citroen Basalt",
    brand: "Citroen",
    bodyType: "Compact SUV",
    tagline: "The Coupe SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/170549/basalt-exterior-right-front-three-quarter-5.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/170549/basalt-exterior-right-front-three-quarter-5.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/170549/basalt-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/170549/basalt-interior-dashboard.jpeg"
    ],
    price: "₹7.99 - 13.83 Lakh",
    priceNumeric: 799000,
    originalPrice: "₹8.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Citroen Basalt is India's first coupe SUV with unique sloping roofline, turbo engine, and premium features.",
    keyHighlights: [
      "Coupe SUV Design",
      "Turbo Petrol Engine",
      "10.25-inch Touchscreen",
      "6 Airbags",
      "6-Speed Automatic",
      "Sloping Roofline"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Puretech NA / Turbo" },
        { label: "Max Power", value: "81 bhp / 109 bhp" },
        { label: "Max Torque", value: "115 Nm / 190 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4352 mm" },
        { label: "Width", value: "1765 mm" },
        { label: "Height", value: "1593 mm" },
        { label: "Wheelbase", value: "2651 mm" },
        { label: "Boot Space", value: "470 L" },
        { label: "Ground Clearance", value: "180 mm" }
      ],
      performance: [
        { label: "Mileage (NA)", value: "18.7 kmpl" },
        { label: "Mileage (Turbo)", value: "17.6 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "Wireless CarPlay & Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" },
        { label: "ISOFIX", value: "Available" }
      ]
    },
    colors: [
      { name: "Polar White", hex: "#F5F5F5" },
      { name: "Cosmo Blue", hex: "#2E5090" },
      { name: "Platinum Grey", hex: "#A8A9AD" },
      { name: "Steel Grey", hex: "#4A4A4A" },
      { name: "Garnet Red", hex: "#B22222" }
    ],
    variants: [
      { name: "You", price: "₹7.99 Lakh", priceNumeric: 799000, features: ["1.2L NA", "Dual Airbags", "Manual AC"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Plus", price: "₹9.49 Lakh", priceNumeric: 949000, features: ["10.25 Screen", "Alloys", "Rear Camera"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Plus Turbo", price: "₹10.99 Lakh", priceNumeric: 1099000, features: ["Turbo Engine", "6 Airbags", "Auto Climate"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Max Turbo", price: "₹12.49 Lakh", priceNumeric: 1249000, features: ["Sunroof", "Wireless Charger", "All Features"], fuelType: "Petrol", transmission: "Manual" },
      { name: "Max Turbo AT", price: "₹13.83 Lakh", priceNumeric: 1383000, features: ["6-Speed Auto", "Premium Interior"], fuelType: "Petrol", transmission: "Automatic" }
    ],
    offers: generateOffers("₹30,000", "₹35,000"),
    pros: ["Unique Design", "Spacious Boot", "Good Features", "Turbo Option"],
    cons: ["Brand Perception", "Service Network", "No Diesel"],
    competitors: ["Tata Curvv", "Hyundai Creta", "Kia Seltos"]
  }
];

export default citroenCars;
