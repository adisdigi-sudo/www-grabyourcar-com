import { Car, generateOffers } from "./types";

const volkswagenCars: Car[] = [
  {
    id: 901,
    slug: "volkswagen-taigun",
    name: "Volkswagen Taigun",
    brand: "Volkswagen",
    bodyType: "Compact SUV",
    tagline: "SUVW",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/144681/taigun-exterior-right-front-three-quarter-73.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/144681/taigun-exterior-right-front-three-quarter-73.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/144681/taigun-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/144681/taigun-interior-dashboard.jpeg"
    ],
    price: "₹11.70 - 19.50 Lakh",
    priceNumeric: 1170000,
    originalPrice: "₹12.20 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Volkswagen Taigun is a German-engineered compact SUV with powerful TSI engines, solid build, and engaging dynamics.",
    keyHighlights: [
      "1.5L TSI with ACT",
      "10-inch Touchscreen",
      "Digital Cockpit Pro",
      "Ventilated Front Seats",
      "6 Airbags Standard",
      "5-Star GNCAP Safety"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L TSI / 1.5L TSI" },
        { label: "Max Power", value: "114 bhp / 148 bhp" },
        { label: "Max Torque", value: "178 Nm / 250 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4221 mm" },
        { label: "Width", value: "1760 mm" },
        { label: "Height", value: "1612 mm" },
        { label: "Wheelbase", value: "2651 mm" },
        { label: "Boot Space", value: "385 L" },
        { label: "Ground Clearance", value: "188 mm" }
      ],
      performance: [
        { label: "Mileage (1.0 TSI)", value: "18.64 kmpl" },
        { label: "Mileage (1.5 TSI)", value: "17.88 kmpl" },
        { label: "Top Speed", value: "188 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10-inch Touchscreen" },
        { label: "Instrument Cluster", value: "Digital Cockpit Pro" },
        { label: "Connectivity", value: "VW Connect" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Curcuma Yellow", hex: "#FFD700" },
      { name: "Wild Cherry Red", hex: "#B22222" },
      { name: "Carbon Steel Grey", hex: "#4A4A4A" },
      { name: "Reflex Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "Comfortline 1.0 TSI", price: "₹11.70 Lakh", features: ["6 Airbags", "LED Lamps", "8-inch Screen"] },
      { name: "Highline 1.0 TSI", price: "₹14.00 Lakh", features: ["10-inch Screen", "Digital Cockpit", "Sunroof"] },
      { name: "Topline 1.0 TSI AT", price: "₹16.00 Lakh", features: ["Automatic", "Ventilated Seats", "Connected Car"] },
      { name: "Topline 1.5 TSI DSG", price: "₹18.00 Lakh", features: ["1.5L TSI", "DSG", "Premium Interior"] },
      { name: "GT Plus", price: "₹19.50 Lakh", features: ["GT Styling", "All Features", "Black Accents"] }
    ],
    offers: generateOffers("₹45,000", "₹55,000"),
    pros: ["5-Star Safety", "German Engineering", "TSI Performance", "Build Quality"],
    cons: ["No Diesel", "Maintenance Costs", "Average Rear Space"],
    competitors: ["Hyundai Creta", "Kia Seltos", "Skoda Kushaq", "Honda Elevate"]
  },
  {
    id: 902,
    slug: "volkswagen-virtus",
    name: "Volkswagen Virtus",
    brand: "Volkswagen",
    bodyType: "Sedan",
    tagline: "The Big Sedan",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112113/virtus-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112113/virtus-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112113/virtus-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112113/virtus-interior-dashboard.jpeg"
    ],
    price: "₹11.56 - 19.41 Lakh",
    priceNumeric: 1156000,
    originalPrice: "₹12.00 Lakh",
    discount: "₹44,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Volkswagen Virtus is a premium sedan with German DNA, powerful TSI engines, and class-leading safety.",
    keyHighlights: [
      "1.5L TSI with ACT",
      "10-inch Touchscreen",
      "Digital Cockpit Pro",
      "Ventilated Seats",
      "521L Boot Space",
      "5-Star GNCAP Safety"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L TSI / 1.5L TSI" },
        { label: "Max Power", value: "114 bhp / 148 bhp" },
        { label: "Max Torque", value: "178 Nm / 250 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4561 mm" },
        { label: "Width", value: "1752 mm" },
        { label: "Height", value: "1507 mm" },
        { label: "Wheelbase", value: "2651 mm" },
        { label: "Boot Space", value: "521 L" }
      ],
      performance: [
        { label: "Mileage (1.0 TSI)", value: "19.44 kmpl" },
        { label: "Mileage (1.5 TSI)", value: "18.67 kmpl" },
        { label: "Top Speed", value: "195 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10-inch Touchscreen" },
        { label: "Instrument Cluster", value: "Digital Cockpit Pro" },
        { label: "Connectivity", value: "VW Connect" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Rising Blue", hex: "#2E5090" },
      { name: "Wild Cherry Red", hex: "#B22222" },
      { name: "Carbon Steel Grey", hex: "#4A4A4A" },
      { name: "Reflex Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "Comfortline 1.0 TSI", price: "₹11.56 Lakh", features: ["6 Airbags", "LED Lamps", "Digital Cockpit"] },
      { name: "Highline 1.0 TSI", price: "₹14.00 Lakh", features: ["10-inch Screen", "Sunroof", "Leather Seats"] },
      { name: "Topline 1.0 TSI AT", price: "₹16.00 Lakh", features: ["Automatic", "Ventilated Seats", "Connected Car"] },
      { name: "Topline 1.5 TSI DSG", price: "₹18.00 Lakh", features: ["1.5L TSI", "DSG", "Premium Interior"] },
      { name: "GT Plus", price: "₹19.41 Lakh", features: ["GT Styling", "All Features", "Sport Mode"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["5-Star Safety", "Huge Boot", "TSI Performance", "German Build"],
    cons: ["No Diesel", "Average Features", "Maintenance Costs"],
    competitors: ["Hyundai Verna", "Honda City", "Skoda Slavia", "Maruti Ciaz"]
  },
  {
    id: 903,
    slug: "volkswagen-tiguan",
    name: "Volkswagen Tiguan",
    brand: "Volkswagen",
    bodyType: "Mid-Size SUV",
    tagline: "The German SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/137079/tiguan-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/137079/tiguan-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/137079/tiguan-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/137079/tiguan-interior-dashboard.jpeg"
    ],
    price: "₹35.17 Lakh",
    priceNumeric: 3517000,
    originalPrice: "₹36.00 Lakh",
    discount: "₹83,000",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Volkswagen Tiguan is a premium German SUV with 4MOTION AWD, powerful TSI engine, and luxury features.",
    keyHighlights: [
      "2.0L TSI 4MOTION",
      "Digital Cockpit Pro",
      "Panoramic Sunroof",
      "Vienna Leather Seats",
      "4MOTION AWD",
      "ADAS Safety Features"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L TSI" },
        { label: "Max Power", value: "188 bhp" },
        { label: "Max Torque", value: "320 Nm" },
        { label: "Displacement", value: "1984 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4509 mm" },
        { label: "Width", value: "1839 mm" },
        { label: "Height", value: "1675 mm" },
        { label: "Wheelbase", value: "2681 mm" },
        { label: "Boot Space", value: "615 L" }
      ],
      performance: [
        { label: "Mileage", value: "12.65 kmpl" },
        { label: "Top Speed", value: "210 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "9.2-inch Touchscreen" },
        { label: "Instrument Cluster", value: "Digital Cockpit Pro" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" },
        { label: "ADAS", value: "Available" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Pure White", hex: "#F5F5F5" },
      { name: "Deep Black", hex: "#1A1A1A" },
      { name: "Platinum Grey", hex: "#4A4A4A" },
      { name: "Oryx White", hex: "#FFFAF0" }
    ],
    variants: [
      { name: "Elegance", price: "₹35.17 Lakh", features: ["4MOTION", "Panoramic Sunroof", "All Features"] }
    ],
    offers: generateOffers("₹70,000", "₹50,000"),
    pros: ["4MOTION AWD", "German Quality", "Premium Interiors", "Powerful Engine"],
    cons: ["Expensive", "Single Variant", "Average Mileage"],
    competitors: ["Jeep Compass", "Skoda Kodiaq", "Hyundai Tucson"]
  },
  {
    id: 904,
    slug: "volkswagen-polo",
    name: "Volkswagen Polo",
    brand: "Volkswagen",
    bodyType: "Hatchback",
    tagline: "The Legend",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/32853/polo-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/32853/polo-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/32853/polo-exterior-rear-view.jpeg"
    ],
    price: "Discontinued",
    priceNumeric: 1000000,
    originalPrice: "₹7.00 Lakh",
    discount: "₹0",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "Discontinued",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Volkswagen Polo was a legendary premium hatchback known for its solid build, refined engine, and German engineering. Now discontinued.",
    keyHighlights: [
      "1.0L TSI Engine",
      "Solid Build Quality",
      "Engaging Dynamics",
      "German Engineering",
      "Iconic Design"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L TSI" },
        { label: "Max Power", value: "109 bhp" },
        { label: "Max Torque", value: "175 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3971 mm" },
        { label: "Width", value: "1682 mm" },
        { label: "Height", value: "1469 mm" },
        { label: "Wheelbase", value: "2470 mm" },
        { label: "Boot Space", value: "280 L" }
      ],
      performance: [
        { label: "Mileage", value: "18.24 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "6.5-inch Touchscreen" }
      ],
      safety: [
        { label: "Airbags", value: "4 Airbags" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Flash Red", hex: "#B22222" },
      { name: "Carbon Steel", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Legend", price: "Discontinued", features: ["TSI Engine", "Premium Interior"] }
    ],
    offers: generateOffers("₹0", "₹0"),
    pros: ["Solid Build", "Great Engine", "Fun to Drive", "High Resale"],
    cons: ["Discontinued", "Limited Used Stock", "Parts Availability"],
    competitors: ["Maruti Baleno", "Hyundai i20", "Tata Altroz"]
  }
];

export default volkswagenCars;
