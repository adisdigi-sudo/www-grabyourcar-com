import { Car, generateOffers } from "./types";

const mgCars: Car[] = [
  {
    id: 701,
    slug: "mg-hector",
    name: "MG Hector",
    brand: "MG",
    bodyType: "Mid-Size SUV",
    tagline: "India's First Internet Car",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130583/hector-exterior-right-front-three-quarter-74.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/130583/hector-exterior-right-front-three-quarter-74.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/130583/hector-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/130583/hector-interior-dashboard.jpeg"
    ],
    price: "₹14.00 - 22.00 Lakh",
    priceNumeric: 1400000,
    originalPrice: "₹14.60 Lakh",
    discount: "₹60,000",
    fuelTypes: ["Petrol", "Diesel", "Hybrid"],
    transmission: ["Manual", "CVT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The MG Hector is a feature-loaded SUV with massive 14-inch touchscreen, connected car technology, and multiple powertrain options.",
    keyHighlights: [
      "14-inch HD Portrait Screen",
      "i-SMART 2.0 Connected Car",
      "Panoramic Sunroof",
      "ADAS Level 2",
      "48V Mild Hybrid",
      "360-Degree Camera"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Turbo / 1.5L Turbo Hybrid / 2.0L Diesel" },
        { label: "Max Power", value: "141 bhp / 141 bhp / 168 bhp" },
        { label: "Max Torque", value: "250 Nm / 250 Nm / 350 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4699 mm" },
        { label: "Width", value: "1835 mm" },
        { label: "Height", value: "1760 mm" },
        { label: "Wheelbase", value: "2750 mm" },
        { label: "Boot Space", value: "587 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "14.1 kmpl" },
        { label: "Mileage (Diesel)", value: "17.1 kmpl" },
        { label: "Mileage (Hybrid)", value: "15.8 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "14-inch Touchscreen" },
        { label: "Connectivity", value: "i-SMART 2.0" },
        { label: "Sound System", value: "Infinity Premium" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" },
        { label: "NCAP Rating", value: "5 Star (ANCAP)" }
      ]
    },
    colors: [
      { name: "Glaze Red", hex: "#B22222" },
      { name: "Starry Black", hex: "#1A1A1A" },
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Aurora Silver", hex: "#A8A9AD" },
      { name: "Forest Green", hex: "#2E4E3F" }
    ],
    variants: [
      { name: "Style", price: "₹14.00 Lakh", features: ["6 Airbags", "10.4 Screen", "LED Lamps"] },
      { name: "Smart", price: "₹16.00 Lakh", features: ["Sunroof", "Leather Seats", "i-SMART"] },
      { name: "Sharp", price: "₹18.50 Lakh", features: ["14-inch Screen", "Panoramic Sunroof", "360 Camera"] },
      { name: "Savvy", price: "₹20.00 Lakh", features: ["ADAS Level 2", "Infinity Sound"] },
      { name: "Blackstorm", price: "₹22.00 Lakh", features: ["Blackstorm Edition", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹50,000", "₹60,000"),
    pros: ["Feature Loaded", "14-inch Screen", "Connected Car", "Strong Diesel"],
    cons: ["Reliability Concerns", "Average Ride", "CVT Only for Petrol"],
    competitors: ["Tata Harrier", "Hyundai Creta", "Mahindra XUV700"]
  },
  {
    id: 702,
    slug: "mg-hector-plus",
    name: "MG Hector Plus",
    brand: "MG",
    bodyType: "Full-Size SUV",
    tagline: "The 6-Seater SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130583/hector-plus-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/130583/hector-plus-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/130583/hector-plus-exterior-rear-view.jpeg"
    ],
    price: "₹17.30 - 22.76 Lakh",
    priceNumeric: 1730000,
    originalPrice: "₹18.00 Lakh",
    discount: "₹70,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "CVT"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The MG Hector Plus is a 6/7-seater version of the Hector with captain seats, more space, and premium features.",
    keyHighlights: [
      "6/7 Seater Options",
      "Captain Seats",
      "14-inch Touchscreen",
      "Panoramic Sunroof",
      "i-SMART Connected Car",
      "ADAS Safety"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Turbo Petrol / 2.0L Diesel" },
        { label: "Max Power", value: "141 bhp / 168 bhp" },
        { label: "Max Torque", value: "250 Nm / 350 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4720 mm" },
        { label: "Width", value: "1835 mm" },
        { label: "Height", value: "1760 mm" },
        { label: "Wheelbase", value: "2750 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "13.8 kmpl" },
        { label: "Mileage (Diesel)", value: "16.5 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "14-inch Touchscreen" },
        { label: "Connectivity", value: "i-SMART 2.0" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" }
      ]
    },
    colors: [
      { name: "Glaze Red", hex: "#B22222" },
      { name: "Starry Black", hex: "#1A1A1A" },
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Aurora Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "Smart", price: "₹17.30 Lakh", features: ["6 Airbags", "Captain Seats", "Sunroof"] },
      { name: "Sharp", price: "₹19.50 Lakh", features: ["14-inch Screen", "Panoramic Sunroof", "i-SMART"] },
      { name: "Savvy", price: "₹21.00 Lakh", features: ["ADAS", "Premium Sound", "360 Camera"] },
      { name: "Blackstorm", price: "₹22.76 Lakh", features: ["Blackstorm Edition", "All Features"] }
    ],
    offers: generateOffers("₹55,000", "₹65,000"),
    pros: ["Captain Seats", "Feature Rich", "3-Row Seating", "ADAS Safety"],
    cons: ["Third Row Cramped", "Reliability", "Average Mileage"],
    competitors: ["Tata Safari", "Hyundai Alcazar", "Mahindra XUV700"]
  },
  {
    id: 703,
    slug: "mg-astor",
    name: "MG Astor",
    brand: "MG",
    bodyType: "Compact SUV",
    tagline: "The AI Inside SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/89939/astor-exterior-right-front-three-quarter-5.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/89939/astor-exterior-right-front-three-quarter-5.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/89939/astor-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/89939/astor-interior-dashboard.jpeg"
    ],
    price: "₹10.28 - 18.38 Lakh",
    priceNumeric: 1028000,
    originalPrice: "₹10.80 Lakh",
    discount: "₹52,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic", "CVT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The MG Astor is India's first SUV with AI-powered personal assistant and autonomous ADAS Level 2 features.",
    keyHighlights: [
      "AI Personal Assistant",
      "ADAS Level 2 (MID)",
      "10.1-inch Touchscreen",
      "Panoramic Sunroof",
      "i-SMART Connected Car",
      "6 Airbags"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L NA / 1.3L Turbo" },
        { label: "Max Power", value: "108 bhp / 138 bhp" },
        { label: "Max Torque", value: "144 Nm / 220 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4323 mm" },
        { label: "Width", value: "1809 mm" },
        { label: "Height", value: "1653 mm" },
        { label: "Wheelbase", value: "2585 mm" },
        { label: "Boot Space", value: "448 L" }
      ],
      performance: [
        { label: "Mileage (NA)", value: "14.5 kmpl" },
        { label: "Mileage (Turbo)", value: "15.4 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.1-inch Touchscreen" },
        { label: "Connectivity", value: "i-SMART" },
        { label: "AI Assistant", value: "Voice Activated" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2 (MID)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Glaze Red", hex: "#B22222" },
      { name: "Aurora Silver", hex: "#A8A9AD" },
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Spiced Orange", hex: "#FF6B35" },
      { name: "Starry Black", hex: "#1A1A1A" }
    ],
    variants: [
      { name: "Style", price: "₹10.28 Lakh", features: ["6 Airbags", "LED DRLs", "Touchscreen"] },
      { name: "Super", price: "₹12.50 Lakh", features: ["Sunroof", "i-SMART", "Auto Climate"] },
      { name: "Smart", price: "₹14.50 Lakh", features: ["Panoramic Sunroof", "AI Assistant", "360 Camera"] },
      { name: "Sharp", price: "₹16.00 Lakh", features: ["ADAS Level 2", "Turbo Engine"] },
      { name: "Savvy", price: "₹18.38 Lakh", features: ["All Features", "Premium Interior", "Leather Seats"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["AI Assistant", "ADAS Safety", "Feature Rich", "Premium Interiors"],
    cons: ["No Diesel", "Average Mileage", "Reliability Concerns"],
    competitors: ["Hyundai Creta", "Kia Seltos", "Tata Harrier", "Maruti Grand Vitara"]
  },
  {
    id: 704,
    slug: "mg-zs-ev",
    name: "MG ZS EV",
    brand: "MG",
    bodyType: "Electric",
    tagline: "The Electric SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/48738/zs-ev-exterior-right-front-three-quarter-2.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/48738/zs-ev-exterior-right-front-three-quarter-2.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/48738/zs-ev-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/48738/zs-ev-interior-dashboard.jpeg"
    ],
    price: "₹18.98 - 25.20 Lakh",
    priceNumeric: 1898000,
    originalPrice: "₹19.50 Lakh",
    discount: "₹52,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The MG ZS EV is a practical electric SUV with good range, fast charging, and comprehensive warranty.",
    keyHighlights: [
      "461 km Range (ARAI)",
      "50.3 kWh Battery",
      "DC Fast Charging",
      "i-SMART EV Connected",
      "PM 2.5 Filter",
      "8-Year Battery Warranty"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "174 bhp" },
        { label: "Max Torque", value: "280 Nm" },
        { label: "Battery", value: "50.3 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "4323 mm" },
        { label: "Width", value: "1809 mm" },
        { label: "Height", value: "1649 mm" },
        { label: "Wheelbase", value: "2585 mm" },
        { label: "Boot Space", value: "448 L" }
      ],
      performance: [
        { label: "Range (ARAI)", value: "461 km" },
        { label: "Top Speed", value: "175 kmph" },
        { label: "0-100 kmph", value: "8.5 sec" },
        { label: "Fast Charging", value: "0-80% in 60 min" }
      ],
      features: [
        { label: "Infotainment", value: "10.1-inch Touchscreen" },
        { label: "Connectivity", value: "i-SMART EV" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" },
        { label: "Hill Descent", value: "Available" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Aurora Silver", hex: "#A8A9AD" },
      { name: "Black Pearl", hex: "#1A1A1A" },
      { name: "Pistachio Green", hex: "#93C572" }
    ],
    variants: [
      { name: "Excite", price: "₹18.98 Lakh", features: ["50.3 kWh", "6 Airbags", "Touchscreen"] },
      { name: "Exclusive", price: "₹21.50 Lakh", features: ["Panoramic Sunroof", "Connected Car", "PM 2.5 Filter"] },
      { name: "Exclusive Pro", price: "₹25.20 Lakh", features: ["ADAS", "All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹50,000", "₹40,000"),
    pros: ["Good Range", "8-Year Warranty", "Connected Features", "Practical SUV"],
    cons: ["Average Interiors", "Slow Fast Charging", "Competition"],
    competitors: ["Tata Nexon EV", "Hyundai Kona Electric", "Mahindra XUV400"]
  },
  {
    id: 705,
    slug: "mg-comet-ev",
    name: "MG Comet EV",
    brand: "MG",
    bodyType: "Electric",
    tagline: "The City EV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/128165/comet-ev-exterior-right-front-three-quarter-2.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/128165/comet-ev-exterior-right-front-three-quarter-2.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/128165/comet-ev-exterior-rear-view.jpeg"
    ],
    price: "₹7.98 - 10.08 Lakh",
    priceNumeric: 798000,
    originalPrice: "₹8.50 Lakh",
    discount: "₹52,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The MG Comet EV is India's most affordable electric car with compact city-friendly dimensions and unique design.",
    keyHighlights: [
      "230 km Range (ARAI)",
      "17.3 kWh Battery",
      "10.25-inch Touchscreen",
      "V2L (Vehicle to Load)",
      "Compact City Design",
      "Affordable EV"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "41 bhp" },
        { label: "Max Torque", value: "110 Nm" },
        { label: "Battery", value: "17.3 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "2974 mm" },
        { label: "Width", value: "1505 mm" },
        { label: "Height", value: "1640 mm" },
        { label: "Wheelbase", value: "2010 mm" }
      ],
      performance: [
        { label: "Range (ARAI)", value: "230 km" },
        { label: "Top Speed", value: "100 kmph" },
        { label: "Charging (0-100%)", value: "7 hrs (AC)" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "i-SMART" }
      ],
      safety: [
        { label: "Airbags", value: "2 Airbags" },
        { label: "ABS", value: "Standard" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Apple Green", hex: "#93C572" },
      { name: "Aurora Silver", hex: "#A8A9AD" },
      { name: "Starry Black", hex: "#1A1A1A" },
      { name: "Candy White + Black", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "Play", price: "₹7.98 Lakh", features: ["17.3 kWh", "10.25 Screen", "i-SMART"] },
      { name: "Excite", price: "₹9.00 Lakh", features: ["LED DRLs", "Alloys", "V2L"] },
      { name: "Exclusive", price: "₹10.08 Lakh", features: ["All Features", "Premium Interior"] }
    ],
    offers: generateOffers("₹30,000", "₹20,000"),
    pros: ["Affordable EV", "City Friendly", "Unique Design", "Low Running Cost"],
    cons: ["Limited Range", "Basic Safety", "Slow Speed"],
    competitors: ["Tata Tiago EV", "Citroen eC3"]
  },
  {
    id: 706,
    slug: "mg-gloster",
    name: "MG Gloster",
    brand: "MG",
    bodyType: "Full-Size SUV",
    tagline: "The Flagship SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/41169/gloster-exterior-right-front-three-quarter-7.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/41169/gloster-exterior-right-front-three-quarter-7.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/41169/gloster-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/41169/gloster-interior-dashboard.jpeg"
    ],
    price: "₹38.80 - 43.87 Lakh",
    priceNumeric: 3880000,
    originalPrice: "₹40.00 Lakh",
    discount: "₹1,20,000",
    fuelTypes: ["Diesel"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The MG Gloster is a full-size luxury SUV with powerful diesel engine, 4x4 capability, and premium features.",
    keyHighlights: [
      "4x4 with Terrain Modes",
      "12.3-inch Touchscreen",
      "ADAS Level 1",
      "Massage Seats",
      "Air Suspension",
      "7-Seater Configuration"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Twin-Turbo Diesel" },
        { label: "Max Power", value: "215 bhp" },
        { label: "Max Torque", value: "480 Nm" },
        { label: "Displacement", value: "1996 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4985 mm" },
        { label: "Width", value: "1926 mm" },
        { label: "Height", value: "1867 mm" },
        { label: "Wheelbase", value: "2950 mm" },
        { label: "Ground Clearance", value: "210 mm" }
      ],
      performance: [
        { label: "Mileage", value: "12.4 kmpl" },
        { label: "Top Speed", value: "185 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Connectivity", value: "i-SMART" },
        { label: "Sound System", value: "12-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "8 Airbags" },
        { label: "ADAS", value: "Level 1" },
        { label: "Hill Descent", value: "Standard" }
      ]
    },
    colors: [
      { name: "Metal Black", hex: "#1A1A1A" },
      { name: "Burgundy Red", hex: "#800020" },
      { name: "Dawn Silver", hex: "#A8A9AD" },
      { name: "Warm White", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "Super", price: "₹38.80 Lakh", features: ["2WD", "8 Airbags", "ADAS"] },
      { name: "Sharp", price: "₹41.00 Lakh", features: ["4x4", "Air Suspension", "Massage Seats"] },
      { name: "Savvy", price: "₹43.87 Lakh", features: ["All Features", "Premium Interior", "Terrain Modes"] }
    ],
    offers: generateOffers("₹1,00,000", "₹80,000"),
    pros: ["Powerful Diesel", "Luxury Features", "4x4 Capable", "ADAS Safety"],
    cons: ["Expensive", "Poor Resale", "Reliability Concerns"],
    competitors: ["Toyota Fortuner", "Ford Endeavour"]
  },
  {
    id: 707,
    slug: "mg-windsor-ev",
    name: "MG Windsor EV",
    brand: "MG",
    bodyType: "Electric",
    tagline: "The Crossover EV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/175969/windsor-ev-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/175969/windsor-ev-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/175969/windsor-ev-exterior-rear-view.jpeg"
    ],
    price: "₹13.50 - 15.50 Lakh",
    priceNumeric: 1350000,
    originalPrice: "₹14.00 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The MG Windsor EV is a premium electric crossover with BaaS (Battery as a Service) model for affordable pricing.",
    keyHighlights: [
      "BaaS Model Available",
      "38 kWh Battery",
      "332 km Range",
      "15.6-inch Touchscreen",
      "Aero Lounge Seats",
      "i-SMART Connected"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "134 bhp" },
        { label: "Max Torque", value: "200 Nm" },
        { label: "Battery", value: "38 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "4295 mm" },
        { label: "Width", value: "1850 mm" },
        { label: "Height", value: "1677 mm" },
        { label: "Wheelbase", value: "2700 mm" },
        { label: "Boot Space", value: "579 L" }
      ],
      performance: [
        { label: "Range", value: "332 km" },
        { label: "Top Speed", value: "150 kmph" },
        { label: "Charging (DC)", value: "0-80% in 40 min" }
      ],
      features: [
        { label: "Infotainment", value: "15.6-inch Touchscreen" },
        { label: "Connectivity", value: "i-SMART" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Starburst Yellow", hex: "#FFD700" },
      { name: "Pearl White", hex: "#F5F5F5" },
      { name: "Clay Beige", hex: "#C4A77D" },
      { name: "Turquoise Green", hex: "#40E0D0" }
    ],
    variants: [
      { name: "Excite", price: "₹13.50 Lakh", features: ["38 kWh", "6 Airbags", "Aero Lounge"] },
      { name: "Exclusive", price: "₹14.50 Lakh", features: ["15.6 Screen", "Panoramic Glass Roof", "i-SMART"] },
      { name: "Essence", price: "₹15.50 Lakh", features: ["All Features", "Premium Sound"] }
    ],
    offers: generateOffers("₹30,000", "₹40,000"),
    pros: ["BaaS Model", "Large Screen", "Premium Interior", "Good Range"],
    cons: ["Average Power", "No Fast Charging DC Standard", "Unproven"],
    competitors: ["Tata Nexon EV", "Mahindra XUV400", "Tata Curvv EV"]
  }
];

export default mgCars;
