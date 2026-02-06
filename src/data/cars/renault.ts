import { Car, generateOffers } from "./types";

const renaultCars: Car[] = [
  {
    id: 1301,
    slug: "renault-kwid",
    name: "Renault Kwid",
    brand: "Renault",
    bodyType: "Hatchback",
    tagline: "Live For More",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/kwid-exterior-right-front-three-quarter-16.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/kwid-exterior-right-front-three-quarter-16.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/kwid-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/kwid-interior-dashboard.jpeg"
    ],
    price: "₹4.70 - 6.45 Lakh",
    priceNumeric: 470000,
    originalPrice: "₹5.00 Lakh",
    discount: "₹30,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "AMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Renault Kwid is India's most stylish entry-level car with SUV-inspired design, excellent mileage, and modern features.",
    keyHighlights: [
      "SUV-Like Design",
      "8-inch Touchscreen",
      "Best-in-Class Ground Clearance",
      "Digital Instrument Cluster",
      "AMT Available",
      "Apple CarPlay & Android Auto"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L SCe Petrol" },
        { label: "Max Power", value: "67 bhp" },
        { label: "Max Torque", value: "91 Nm" },
        { label: "Displacement", value: "999 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3731 mm" },
        { label: "Width", value: "1579 mm" },
        { label: "Height", value: "1478 mm" },
        { label: "Wheelbase", value: "2422 mm" },
        { label: "Boot Space", value: "279 L" },
        { label: "Ground Clearance", value: "184 mm" }
      ],
      performance: [
        { label: "Mileage (MT)", value: "22.3 kmpl" },
        { label: "Mileage (AMT)", value: "22 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Apple CarPlay & Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "Dual Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "Reverse Sensor", value: "Available" }
      ]
    },
    colors: [
      { name: "Ice Cool White", hex: "#F5F5F5" },
      { name: "Moonlight Silver", hex: "#A8A9AD" },
      { name: "Fiery Red", hex: "#B22222" },
      { name: "Outback Bronze", hex: "#8B7355" },
      { name: "Electric Blue", hex: "#2E5090" },
      { name: "Metal Mustard", hex: "#FFD700" }
    ],
    variants: [
      { name: "RXE", price: "₹4.70 Lakh", priceNumeric: 470000, features: ["1.0L Engine", "Manual AC", "Power Steering"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXL", price: "₹5.30 Lakh", priceNumeric: 530000, features: ["Touchscreen", "Rear Camera", "Power Windows"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXT", price: "₹5.80 Lakh", priceNumeric: 580000, features: ["Digital Cluster", "LED DRLs", "Alloys"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXT AMT", price: "₹6.20 Lakh", priceNumeric: 620000, features: ["AMT", "All Features"], fuelType: "Petrol", transmission: "AMT" },
      { name: "Climber AMT", price: "₹6.45 Lakh", priceNumeric: 645000, features: ["Climber Edition", "Roof Rails", "Premium Interior"], fuelType: "Petrol", transmission: "AMT" }
    ],
    offers: generateOffers("₹20,000", "₹25,000"),
    pros: ["Value for Money", "Good Mileage", "Stylish Design", "Features"],
    cons: ["Basic Safety", "Small Size", "Underpowered"],
    competitors: ["Maruti Alto K10", "Maruti S-Presso", "Datsun redi-GO"]
  },
  {
    id: 1302,
    slug: "renault-triber",
    name: "Renault Triber",
    brand: "Renault",
    bodyType: "MPV",
    tagline: "Ultra Modular",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/triber-exterior-right-front-three-quarter-5.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/triber-exterior-right-front-three-quarter-5.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/triber-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/triber-interior-dashboard.jpeg"
    ],
    price: "₹6.00 - 8.97 Lakh",
    priceNumeric: 600000,
    originalPrice: "₹6.50 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "AMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Renault Triber is India's most affordable 7-seater with ultra-modular seating, spacious interiors, and good value.",
    keyHighlights: [
      "7-Seater in Sub-4m",
      "Ultra-Modular Seating",
      "8-inch Touchscreen",
      "84 Seating Configurations",
      "Digital Cluster",
      "EasyFix Seats"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L Energy Petrol" },
        { label: "Max Power", value: "71 bhp" },
        { label: "Max Torque", value: "96 Nm" },
        { label: "Displacement", value: "999 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3990 mm" },
        { label: "Width", value: "1739 mm" },
        { label: "Height", value: "1643 mm" },
        { label: "Wheelbase", value: "2636 mm" },
        { label: "Boot Space", value: "84 L (7-seat) / 625 L (5-seat)" },
        { label: "Ground Clearance", value: "182 mm" }
      ],
      performance: [
        { label: "Mileage (MT)", value: "18.3 kmpl" },
        { label: "Mileage (AMT)", value: "17.5 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Apple CarPlay & Android Auto" }
      ],
      safety: [
        { label: "Airbags", value: "4 Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "Speed Alert", value: "Standard" }
      ]
    },
    colors: [
      { name: "Ice Cool White", hex: "#F5F5F5" },
      { name: "Moonlight Silver", hex: "#A8A9AD" },
      { name: "Cedar Brown", hex: "#8B7355" },
      { name: "Electric Blue", hex: "#2E5090" },
      { name: "Metal Mustard", hex: "#FFD700" }
    ],
    variants: [
      { name: "RXE", price: "₹6.00 Lakh", priceNumeric: 600000, features: ["7-Seater", "Manual AC", "Power Steering"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXL", price: "₹6.80 Lakh", priceNumeric: 680000, features: ["Touchscreen", "Rear Camera", "Alloys"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXT", price: "₹7.50 Lakh", priceNumeric: 750000, features: ["Digital Cluster", "LED DRLs", "Push Start"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXT AMT", price: "₹8.00 Lakh", priceNumeric: 800000, features: ["AMT", "All Features"], fuelType: "Petrol", transmission: "AMT" },
      { name: "RXZ", price: "₹8.50 Lakh", priceNumeric: 850000, features: ["4 Airbags", "Projector Headlamps", "Premium Interior"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXZ AMT", price: "₹8.97 Lakh", priceNumeric: 897000, features: ["AMT", "All Features", "Top Variant"], fuelType: "Petrol", transmission: "AMT" }
    ],
    offers: generateOffers("₹30,000", "₹35,000"),
    pros: ["7-Seater", "Value for Money", "Modular Seats", "Practical"],
    cons: ["Underpowered", "Average Safety", "Build Quality"],
    competitors: ["Maruti Ertiga", "Toyota Rumion", "Kia Carens"]
  },
  {
    id: 1303,
    slug: "renault-kiger",
    name: "Renault Kiger",
    brand: "Renault",
    bodyType: "Compact SUV",
    tagline: "Stunning. Inside Out.",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/145455/kiger-exterior-right-front-three-quarter-33.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/145455/kiger-exterior-right-front-three-quarter-33.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/145455/kiger-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/145455/kiger-interior-dashboard.jpeg"
    ],
    price: "₹6.00 - 11.23 Lakh",
    priceNumeric: 600000,
    originalPrice: "₹6.50 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "CVT", "AMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Renault Kiger is a stylish compact SUV with turbo engine, multiple transmission options, and excellent features.",
    keyHighlights: [
      "1.0L Turbo Engine",
      "8-inch Touchscreen",
      "Wireless CarPlay & Android Auto",
      "PM 2.5 Air Filter",
      "LED Pure Vision Headlamps",
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
        { label: "Length", value: "3991 mm" },
        { label: "Width", value: "1750 mm" },
        { label: "Height", value: "1600 mm" },
        { label: "Wheelbase", value: "2500 mm" },
        { label: "Boot Space", value: "405 L" },
        { label: "Ground Clearance", value: "205 mm" }
      ],
      performance: [
        { label: "Mileage (NA)", value: "18.75 kmpl" },
        { label: "Mileage (Turbo)", value: "17.5 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Wireless CarPlay & Android Auto" },
        { label: "Air Filter", value: "PM 2.5 Filter" }
      ],
      safety: [
        { label: "Airbags", value: "Dual Airbags / 4 Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "ESP", value: "Available (Turbo)" }
      ]
    },
    colors: [
      { name: "Ice Cool White", hex: "#F5F5F5" },
      { name: "Moonlight Silver", hex: "#A8A9AD" },
      { name: "Radiant Red", hex: "#B22222" },
      { name: "Caspian Blue", hex: "#2E5090" },
      { name: "Metal Mustard", hex: "#FFD700" },
      { name: "Planet Grey", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "RXE", price: "₹6.00 Lakh", priceNumeric: 600000, features: ["1.0L NA", "Manual AC", "Power Windows"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXL", price: "₹7.20 Lakh", priceNumeric: 720000, features: ["Touchscreen", "Rear Camera", "Alloys"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXT", price: "₹8.20 Lakh", priceNumeric: 820000, features: ["LED Headlamps", "Push Start", "Auto Climate"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXT Turbo", price: "₹9.00 Lakh", priceNumeric: 900000, features: ["Turbo Engine", "All Features"], fuelType: "Petrol", transmission: "Manual" },
      { name: "RXZ Turbo CVT", price: "₹10.50 Lakh", priceNumeric: 1050000, features: ["CVT", "Wireless Charger", "PM 2.5 Filter"], fuelType: "Petrol", transmission: "CVT" },
      { name: "RXZ Turbo CVT (O)", price: "₹11.23 Lakh", priceNumeric: 1123000, features: ["All Features", "Premium Interior", "Ambient Lighting"], fuelType: "Petrol", transmission: "CVT" }
    ],
    offers: generateOffers("₹35,000", "₹40,000"),
    pros: ["Value for Money", "Turbo Engine", "Good Boot Space", "Features"],
    cons: ["Average Safety", "Basic Interior", "Weak NA Engine"],
    competitors: ["Nissan Magnite", "Hyundai Venue", "Tata Nexon", "Maruti Brezza"]
  }
];

export default renaultCars;
