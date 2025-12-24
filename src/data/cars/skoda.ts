import { Car, generateOffers } from "./types";

const skodaCars: Car[] = [
  {
    id: 801,
    slug: "skoda-kushaq",
    name: "Skoda Kushaq",
    brand: "Skoda",
    bodyType: "Compact SUV",
    tagline: "Built for India",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/146043/kushaq-exterior-right-front-three-quarter-75.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/146043/kushaq-exterior-right-front-three-quarter-75.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/146043/kushaq-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/146043/kushaq-interior-dashboard.jpeg"
    ],
    price: "₹10.99 - 18.79 Lakh",
    priceNumeric: 1099000,
    originalPrice: "₹11.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Skoda Kushaq is a compact SUV with European build quality, engaging driving dynamics, and powerful TSI engines.",
    keyHighlights: [
      "1.5L TSI with ACT",
      "10-inch Touchscreen",
      "Electric Sunroof",
      "Ventilated Front Seats",
      "6 Airbags Standard",
      "European Build Quality"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L TSI / 1.5L TSI" },
        { label: "Max Power", value: "114 bhp / 148 bhp" },
        { label: "Max Torque", value: "178 Nm / 250 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4225 mm" },
        { label: "Width", value: "1760 mm" },
        { label: "Height", value: "1612 mm" },
        { label: "Wheelbase", value: "2651 mm" },
        { label: "Boot Space", value: "385 L" },
        { label: "Ground Clearance", value: "188 mm" }
      ],
      performance: [
        { label: "Mileage (1.0 TSI)", value: "18.37 kmpl" },
        { label: "Mileage (1.5 TSI)", value: "17.65 kmpl" },
        { label: "Top Speed", value: "188 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10-inch Touchscreen" },
        { label: "Connectivity", value: "Skoda Connect" },
        { label: "Sound System", value: "Blaupunkt" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Carbon Steel", hex: "#4A4A4A" },
      { name: "Tornado Red", hex: "#B22222" },
      { name: "Honey Orange", hex: "#FF6B35" },
      { name: "Reflex Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "Active 1.0 TSI", price: "₹10.99 Lakh", features: ["6 Airbags", "LED DRLs", "8-inch Screen"] },
      { name: "Ambition 1.0 TSI", price: "₹13.00 Lakh", features: ["10-inch Screen", "Auto Climate", "Wireless Charger"] },
      { name: "Style 1.0 TSI AT", price: "₹15.00 Lakh", features: ["Sunroof", "Automatic", "Connected Car"] },
      { name: "Style 1.5 TSI AT", price: "₹17.00 Lakh", features: ["1.5L TSI", "Ventilated Seats", "Premium Interior"] },
      { name: "Monte Carlo", price: "₹18.79 Lakh", features: ["Monte Carlo Edition", "All Features", "Sport Styling"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["5-Star Safety", "TSI Engines", "Build Quality", "Driving Dynamics"],
    cons: ["Average Mileage", "No Diesel", "Maintenance Costs"],
    competitors: ["Hyundai Creta", "Kia Seltos", "VW Taigun", "Honda Elevate"]
  },
  {
    id: 802,
    slug: "skoda-slavia",
    name: "Skoda Slavia",
    brand: "Skoda",
    bodyType: "Sedan",
    tagline: "The Premium Sedan",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112331/slavia-exterior-right-front-three-quarter-52.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112331/slavia-exterior-right-front-three-quarter-52.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112331/slavia-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112331/slavia-interior-dashboard.jpeg"
    ],
    price: "₹10.99 - 18.69 Lakh",
    priceNumeric: 1099000,
    originalPrice: "₹11.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Skoda Slavia is a premium sedan with European DNA, powerful TSI engines, and engaging driving experience.",
    keyHighlights: [
      "1.5L TSI with ACT",
      "10-inch Touchscreen",
      "Electric Sunroof",
      "Ventilated Seats",
      "521L Boot Space",
      "5-Star Safety"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L TSI / 1.5L TSI" },
        { label: "Max Power", value: "114 bhp / 148 bhp" },
        { label: "Max Torque", value: "178 Nm / 250 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4541 mm" },
        { label: "Width", value: "1752 mm" },
        { label: "Height", value: "1487 mm" },
        { label: "Wheelbase", value: "2651 mm" },
        { label: "Boot Space", value: "521 L" }
      ],
      performance: [
        { label: "Mileage (1.0 TSI)", value: "19.47 kmpl" },
        { label: "Mileage (1.5 TSI)", value: "18.72 kmpl" },
        { label: "Top Speed", value: "195 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10-inch Touchscreen" },
        { label: "Connectivity", value: "Skoda Connect" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Carbon Steel", hex: "#4A4A4A" },
      { name: "Tornado Red", hex: "#B22222" },
      { name: "Brilliant Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "Active 1.0 TSI", price: "₹10.99 Lakh", features: ["6 Airbags", "LED Headlamps", "Digital Cockpit"] },
      { name: "Ambition 1.0 TSI", price: "₹13.00 Lakh", features: ["10-inch Screen", "Auto Climate", "Wireless Charger"] },
      { name: "Style 1.0 TSI AT", price: "₹15.00 Lakh", features: ["Sunroof", "Connected Car", "Cruise Control"] },
      { name: "Style 1.5 TSI DSG", price: "₹17.50 Lakh", features: ["1.5L TSI", "DSG", "Ventilated Seats"] },
      { name: "Monte Carlo", price: "₹18.69 Lakh", features: ["Sport Styling", "All Features", "Black Accents"] }
    ],
    offers: generateOffers("₹45,000", "₹55,000"),
    pros: ["5-Star Safety", "Huge Boot", "TSI Performance", "Build Quality"],
    cons: ["No Diesel", "Maintenance Costs", "Average Features"],
    competitors: ["Hyundai Verna", "Honda City", "VW Virtus", "Maruti Ciaz"]
  },
  {
    id: 803,
    slug: "skoda-superb",
    name: "Skoda Superb",
    brand: "Skoda",
    bodyType: "Sedan",
    tagline: "Simply Superb",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/23900/superb-exterior-right-front-three-quarter-2.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/23900/superb-exterior-right-front-three-quarter-2.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/23900/superb-exterior-rear-view.jpeg"
    ],
    price: "₹54.00 Lakh",
    priceNumeric: 5400000,
    originalPrice: "₹55.00 Lakh",
    discount: "₹1,00,000",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Skoda Superb is a luxury sedan with premium features, powerful TSI engine, and European refinement.",
    keyHighlights: [
      "2.0L TSI Engine",
      "Virtual Cockpit",
      "Canton Sound System",
      "Matrix LED Headlamps",
      "3-Zone Climate Control",
      "Luxury Interiors"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L TSI" },
        { label: "Max Power", value: "188 bhp" },
        { label: "Max Torque", value: "320 Nm" },
        { label: "Displacement", value: "1984 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4869 mm" },
        { label: "Width", value: "1864 mm" },
        { label: "Height", value: "1469 mm" },
        { label: "Wheelbase", value: "2841 mm" },
        { label: "Boot Space", value: "625 L" }
      ],
      performance: [
        { label: "Mileage", value: "14 kmpl" },
        { label: "Top Speed", value: "235 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "9.2-inch Touchscreen" },
        { label: "Sound System", value: "Canton 12-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "9 Airbags" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Lava Blue", hex: "#2E5090" },
      { name: "Moon White", hex: "#F5F5F5" },
      { name: "Magic Black", hex: "#1A1A1A" },
      { name: "Business Grey", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "L&K", price: "₹54.00 Lakh", features: ["All Features", "Premium Interior", "Canton Sound"] }
    ],
    offers: generateOffers("₹80,000", "₹60,000"),
    pros: ["Luxury Features", "Powerful Engine", "Huge Space", "Build Quality"],
    cons: ["Very Expensive", "Single Variant", "Maintenance Costs"],
    competitors: ["Toyota Camry", "Honda Accord", "VW Passat"]
  },
  {
    id: 804,
    slug: "skoda-kodiaq",
    name: "Skoda Kodiaq",
    brand: "Skoda",
    bodyType: "Mid-Size SUV",
    tagline: "The Bear",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/175967/kodiaq-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/175967/kodiaq-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/175967/kodiaq-exterior-rear-view.jpeg"
    ],
    price: "₹39.99 - 45.99 Lakh",
    priceNumeric: 3999000,
    originalPrice: "₹41.00 Lakh",
    discount: "₹1,01,000",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The 2024 Skoda Kodiaq is a premium 7-seater SUV with 4x4 capability, powerful TSI engine, and European luxury.",
    keyHighlights: [
      "2.0L TSI 4x4",
      "10.25-inch Virtual Cockpit",
      "Canton Sound System",
      "Panoramic Sunroof",
      "7-Seater with Captain Chairs",
      "Matrix LED Headlamps"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L TSI" },
        { label: "Max Power", value: "188 bhp" },
        { label: "Max Torque", value: "320 Nm" },
        { label: "Displacement", value: "1984 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4699 mm" },
        { label: "Width", value: "1882 mm" },
        { label: "Height", value: "1676 mm" },
        { label: "Wheelbase", value: "2791 mm" },
        { label: "Boot Space", value: "270 L (7-seat)" }
      ],
      performance: [
        { label: "Mileage", value: "12.96 kmpl" },
        { label: "Top Speed", value: "210 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "9.2-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Virtual Cockpit" },
        { label: "Sound System", value: "Canton 12-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "9 Airbags" },
        { label: "ADAS", value: "Available" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Lava Blue", hex: "#2E5090" },
      { name: "Moon White", hex: "#F5F5F5" },
      { name: "Magic Black", hex: "#1A1A1A" },
      { name: "Steel Grey", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Style", price: "₹39.99 Lakh", features: ["7-Seater", "Panoramic Sunroof", "Canton Sound"] },
      { name: "L&K", price: "₹45.99 Lakh", features: ["4x4", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹90,000", "₹70,000"),
    pros: ["Premium SUV", "4x4 Capable", "European Quality", "Powerful Engine"],
    cons: ["Expensive", "No Diesel", "High Running Costs"],
    competitors: ["Toyota Fortuner", "Jeep Compass", "VW Tiguan"]
  },
  {
    id: 805,
    slug: "skoda-kylaq",
    name: "Skoda Kylaq",
    brand: "Skoda",
    bodyType: "Compact SUV",
    tagline: "The Compact SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/176215/kylaq-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/176215/kylaq-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/176215/kylaq-exterior-rear-view.jpeg"
    ],
    price: "₹7.89 - 14.40 Lakh",
    priceNumeric: 789000,
    originalPrice: "₹8.40 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "Booking Open",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Skoda Kylaq is an entry-level compact SUV with 1.0 TSI engine, premium features, and Skoda's European build quality.",
    keyHighlights: [
      "1.0L TSI Engine",
      "10.1-inch Touchscreen",
      "6 Airbags Standard",
      "Electric Sunroof",
      "Ventilated Front Seats",
      "5-Star Safety Expected"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L TSI" },
        { label: "Max Power", value: "114 bhp" },
        { label: "Max Torque", value: "178 Nm" },
        { label: "Displacement", value: "999 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1783 mm" },
        { label: "Height", value: "1619 mm" },
        { label: "Wheelbase", value: "2566 mm" },
        { label: "Boot Space", value: "446 L" }
      ],
      performance: [
        { label: "Mileage", value: "19.67 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.1-inch Touchscreen" },
        { label: "Connectivity", value: "Skoda Connect" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" },
        { label: "Hill Hold", value: "Available" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Brilliant Silver", hex: "#A8A9AD" },
      { name: "Tornado Red", hex: "#B22222" },
      { name: "Carbon Steel", hex: "#4A4A4A" },
      { name: "Lava Blue", hex: "#2E5090" }
    ],
    variants: [
      { name: "Classic", price: "₹7.89 Lakh", features: ["6 Airbags", "LED DRLs", "8-inch Screen"] },
      { name: "Signature", price: "₹10.00 Lakh", features: ["10.1-inch Screen", "Auto Climate", "Rear Camera"] },
      { name: "Signature+", price: "₹11.50 Lakh", features: ["Sunroof", "Wireless Charger", "Alloys"] },
      { name: "Prestige", price: "₹13.00 Lakh", features: ["Ventilated Seats", "Connected Car"] },
      { name: "Prestige+ AT", price: "₹14.40 Lakh", features: ["Automatic", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹15,000", "₹25,000"),
    pros: ["TSI Engine", "European Quality", "Good Value", "Feature Rich"],
    cons: ["No Diesel", "Unproven Product", "Service Network"],
    competitors: ["Tata Nexon", "Hyundai Venue", "Kia Sonet", "Maruti Brezza"]
  }
];

export default skodaCars;
