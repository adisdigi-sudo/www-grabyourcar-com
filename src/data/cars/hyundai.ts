import { Car, generateOffers } from "./types";

const hyundaiCars: Car[] = [
  {
    id: 101,
    slug: "hyundai-creta",
    name: "Hyundai Creta",
    brand: "Hyundai",
    bodyType: "Compact SUV",
    tagline: "The Ultimate SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-4.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-right-front-three-quarter-4.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-interior-dashboard.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/106815/creta-interior-rear-view.jpeg"
    ],
    price: "₹11.00 - 20.15 Lakh",
    priceNumeric: 1100000,
    originalPrice: "₹11.50 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic", "iMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The 2024 Hyundai Creta is a complete package with stunning design, feature-loaded cabin, and powerful engine options. It's one of the best-selling SUVs in India.",
    keyHighlights: [
      "Panoramic Sunroof with Voice Control",
      "Level 2 ADAS with 19 Safety Features",
      "10.25-inch Touchscreen with Bluelink",
      "Ventilated Front Seats",
      "Bose Premium Sound System",
      "360-Degree Camera with Blind View Monitor"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Petrol / 1.5L Diesel / 1.5L Turbo Petrol" },
        { label: "Max Power", value: "113 bhp / 114 bhp / 158 bhp" },
        { label: "Max Torque", value: "144 Nm / 250 Nm / 253 Nm" },
        { label: "Displacement", value: "1497 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4315 mm" },
        { label: "Width", value: "1790 mm" },
        { label: "Height", value: "1660 mm" },
        { label: "Wheelbase", value: "2610 mm" },
        { label: "Boot Space", value: "433 L" },
        { label: "Ground Clearance", value: "190 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "17.4 kmpl" },
        { label: "Mileage (Diesel)", value: "21.8 kmpl" },
        { label: "Top Speed", value: "180 kmph" },
        { label: "0-100 kmph", value: "11.5 sec (Turbo)" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Connectivity", value: "Bluelink Connected Car" },
        { label: "Sound System", value: "8-Speaker Bose" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2 - 19 Features" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESC", value: "Standard" }
      ]
    },
    colors: [
      { name: "Ranger Khaki", hex: "#5C5346" },
      { name: "Abyss Black", hex: "#0F0F0F" },
      { name: "Atlas White", hex: "#F5F5F5" },
      { name: "Fiery Red", hex: "#B22222" },
      { name: "Titan Grey", hex: "#808080" },
      { name: "Robust Emerald", hex: "#2E5D4E" }
    ],
    variants: [
      { name: "E", price: "₹11.00 Lakh", features: ["6 Airbags", "ABS with EBD", "Manual AC", "Projector Headlamps"] },
      { name: "EX", price: "₹12.50 Lakh", features: ["8-inch Touchscreen", "Wireless Charger", "Rear AC Vents", "Cruise Control"] },
      { name: "S", price: "₹14.00 Lakh", features: ["Sunroof", "LED Headlamps", "Auto Climate Control", "Push Button Start"] },
      { name: "SX", price: "₹16.50 Lakh", features: ["10.25-inch Screen", "Panoramic Sunroof", "Ventilated Seats", "ADAS Level 1"] },
      { name: "SX(O)", price: "₹20.15 Lakh", features: ["ADAS Level 2", "Bose Sound", "360 Camera", "Blind View Monitor"] }
    ],
    offers: generateOffers("₹30,000", "₹40,000"),
    pros: ["Stunning Design", "Feature Rich", "Strong Diesel Engine", "ADAS Safety", "Premium Interior"],
    cons: ["Expensive Top Variant", "Turbo Only with DCT", "Base Variant Basic"],
    competitors: ["Kia Seltos", "Maruti Grand Vitara", "Tata Harrier", "MG Astor"]
  },
  {
    id: 102,
    slug: "hyundai-venue",
    name: "Hyundai Venue",
    brand: "Hyundai",
    bodyType: "Compact SUV",
    tagline: "The Connected SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-right-front-three-quarter-5.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-right-front-three-quarter-5.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/venue-interior-dashboard.jpeg"
    ],
    price: "₹7.94 - 13.48 Lakh",
    priceNumeric: 794000,
    originalPrice: "₹8.50 Lakh",
    discount: "₹56,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic", "iMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "Hyundai Venue is a compact SUV that offers premium features, connected car technology, and multiple powertrain options in a city-friendly package.",
    keyHighlights: [
      "Bluelink Connected Car Tech",
      "Turbo Petrol with 7-Speed DCT",
      "Electric Sunroof",
      "8-inch HD Touchscreen",
      "Wireless Charging",
      "Air Purifier with AQI Display"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Petrol / 1.0L Turbo / 1.5L Diesel" },
        { label: "Max Power", value: "82 bhp / 118 bhp / 99 bhp" },
        { label: "Max Torque", value: "114 Nm / 172 Nm / 240 Nm" },
        { label: "Displacement", value: "1197 / 998 / 1493 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1770 mm" },
        { label: "Height", value: "1617 mm" },
        { label: "Wheelbase", value: "2500 mm" },
        { label: "Boot Space", value: "350 L" },
        { label: "Ground Clearance", value: "195 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "17.5 kmpl" },
        { label: "Mileage (Diesel)", value: "23.4 kmpl" },
        { label: "Top Speed", value: "170 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Instrument Cluster", value: "Digital Speedometer" },
        { label: "Connectivity", value: "Bluelink" },
        { label: "Sound System", value: "Arkamys Tuned" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "Parking Sensors", value: "Rear" },
        { label: "ESC", value: "Standard" }
      ]
    },
    colors: [
      { name: "Denim Blue", hex: "#4B6A8E" },
      { name: "Fiery Red", hex: "#B22222" },
      { name: "Polar White", hex: "#FAFAFA" },
      { name: "Typhoon Silver", hex: "#A8A9AD" },
      { name: "Phantom Black", hex: "#1A1A1A" }
    ],
    variants: [
      { name: "E", price: "₹7.94 Lakh", features: ["6 Airbags", "Manual AC", "Halogen Headlamps"] },
      { name: "S", price: "₹9.50 Lakh", features: ["8-inch Screen", "LED DRLs", "Rear AC Vents"] },
      { name: "SX", price: "₹11.50 Lakh", features: ["Sunroof", "Wireless Charger", "Bluelink"] },
      { name: "SX(O)", price: "₹13.48 Lakh", features: ["LED Headlamps", "Air Purifier", "Premium Sound"] }
    ],
    offers: generateOffers("₹40,000", "₹30,000"),
    pros: ["Compact Size", "Feature Rich", "Turbo Engine Fun", "Good Mileage"],
    cons: ["Cramped Rear Seat", "Average Ride Quality", "Basic Base Variant"],
    competitors: ["Tata Nexon", "Kia Sonet", "Maruti Brezza", "Mahindra XUV 3XO"]
  },
  {
    id: 103,
    slug: "hyundai-i20",
    name: "Hyundai i20",
    brand: "Hyundai",
    bodyType: "Hatchback",
    tagline: "Born to be a SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/150575/i20-interior-dashboard.jpeg"
    ],
    price: "₹7.04 - 11.21 Lakh",
    priceNumeric: 704000,
    originalPrice: "₹7.50 Lakh",
    discount: "₹46,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic", "iMT"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Hyundai i20 is a premium hatchback with SUV-inspired design, segment-leading features, and peppy turbo engine option.",
    keyHighlights: [
      "10.25-inch Touchscreen",
      "Digital Instrument Cluster",
      "Sunroof with Voice Control",
      "Bose Premium Sound",
      "Turbo Petrol with DCT",
      "6 Airbags as Standard"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Petrol / 1.0L Turbo Petrol" },
        { label: "Max Power", value: "87 bhp / 118 bhp" },
        { label: "Max Torque", value: "115 Nm / 172 Nm" },
        { label: "Displacement", value: "1197 / 998 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1775 mm" },
        { label: "Height", value: "1505 mm" },
        { label: "Wheelbase", value: "2580 mm" },
        { label: "Boot Space", value: "311 L" }
      ],
      performance: [
        { label: "Mileage", value: "20.25 kmpl" },
        { label: "Top Speed", value: "185 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Sound System", value: "7-Speaker Bose" },
        { label: "Connectivity", value: "Bluelink" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESC", value: "Standard" },
        { label: "Hill Assist", value: "Standard" }
      ]
    },
    colors: [
      { name: "Starry Night", hex: "#1E2832" },
      { name: "Fiery Red", hex: "#B22222" },
      { name: "Polar White", hex: "#FAFAFA" },
      { name: "Titan Grey", hex: "#707070" }
    ],
    variants: [
      { name: "Magna", price: "₹7.04 Lakh", features: ["6 Airbags", "Manual AC", "Steering Controls"] },
      { name: "Sportz", price: "₹8.80 Lakh", features: ["8-inch Screen", "Auto Climate", "LED DRLs"] },
      { name: "Asta", price: "₹10.20 Lakh", features: ["Sunroof", "Digital Cluster", "Wireless Charger"] },
      { name: "Asta(O)", price: "₹11.21 Lakh", features: ["Bose Sound", "10.25-inch Screen", "Bluelink"] }
    ],
    offers: generateOffers("₹25,000", "₹25,000"),
    pros: ["Premium Interior", "Feature Loaded", "Turbo Performance", "Refined Engines"],
    cons: ["No Diesel Option", "Expensive", "Average Boot Space"],
    competitors: ["Maruti Baleno", "Tata Altroz", "Honda Jazz", "Toyota Glanza"]
  },
  {
    id: 104,
    slug: "hyundai-verna",
    name: "Hyundai Verna",
    brand: "Hyundai",
    bodyType: "Sedan",
    tagline: "Sedans Aren't Dead",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-right-front-three-quarter-40.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-right-front-three-quarter-40.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/121943/verna-interior-dashboard.jpeg"
    ],
    price: "₹10.96 - 17.62 Lakh",
    priceNumeric: 1096000,
    originalPrice: "₹11.50 Lakh",
    discount: "₹54,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The all-new 2024 Hyundai Verna is a completely redesigned sedan with bold styling, segment-first features, and powerful turbo engine.",
    keyHighlights: [
      "ADAS Level 2 Safety Suite",
      "Dual 10.25-inch Screens",
      "Ventilated Front Seats",
      "64-Color Ambient Lighting",
      "Bose 8-Speaker System",
      "Shift-by-Wire Transmission"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L NA Petrol / 1.5L Turbo Petrol" },
        { label: "Max Power", value: "113 bhp / 158 bhp" },
        { label: "Max Torque", value: "144 Nm / 253 Nm" },
        { label: "Displacement", value: "1497 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4535 mm" },
        { label: "Width", value: "1765 mm" },
        { label: "Height", value: "1475 mm" },
        { label: "Wheelbase", value: "2670 mm" },
        { label: "Boot Space", value: "528 L" }
      ],
      performance: [
        { label: "Mileage", value: "18.6 kmpl" },
        { label: "Top Speed", value: "195 kmph" },
        { label: "0-100 kmph", value: "8.9 sec (Turbo)" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Connectivity", value: "Bluelink 2.0" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2 - 18 Features" },
        { label: "NCAP Rating", value: "5 Star" }
      ]
    },
    colors: [
      { name: "Fiery Red", hex: "#B22222" },
      { name: "Abyss Black", hex: "#0F0F0F" },
      { name: "Atlas White", hex: "#F5F5F5" },
      { name: "Tellurian Brown", hex: "#4A3728" },
      { name: "Titan Grey", hex: "#808080" }
    ],
    variants: [
      { name: "EX", price: "₹10.96 Lakh", features: ["6 Airbags", "Halogen Headlamps", "Manual AC"] },
      { name: "S", price: "₹12.80 Lakh", features: ["LED Headlamps", "8-inch Screen", "Auto Climate"] },
      { name: "SX", price: "₹15.20 Lakh", features: ["Sunroof", "Dual Screens", "Ventilated Seats"] },
      { name: "SX(O)", price: "₹17.62 Lakh", features: ["ADAS Level 2", "Bose Sound", "Shift-by-Wire"] }
    ],
    offers: generateOffers("₹35,000", "₹45,000"),
    pros: ["Bold Design", "Feature Loaded", "Strong Turbo", "ADAS Safety", "Premium Feel"],
    cons: ["No Diesel", "Expensive Top Variant", "Firm Ride"],
    competitors: ["Honda City", "Maruti Ciaz", "Skoda Slavia", "VW Virtus"]
  },
  {
    id: 105,
    slug: "hyundai-alcazar",
    name: "Hyundai Alcazar",
    brand: "Hyundai",
    bodyType: "Mid-Size SUV",
    tagline: "Live the Grand Life",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/112727/alcazar-interior-dashboard.jpeg"
    ],
    price: "₹14.99 - 21.55 Lakh",
    priceNumeric: 1499000,
    originalPrice: "₹15.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The 2024 Hyundai Alcazar is a 6/7-seater SUV built on Creta's platform with extended wheelbase, premium features, and powerful engine options.",
    keyHighlights: [
      "6 & 7 Seater Options",
      "ADAS Level 2",
      "Dual Panoramic Sunroof",
      "Boss Mode for 2nd Row",
      "360-Degree Camera",
      "Rear Seat Entertainment"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L Turbo Petrol / 1.5L Diesel" },
        { label: "Max Power", value: "158 bhp / 114 bhp" },
        { label: "Max Torque", value: "253 Nm / 250 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4560 mm" },
        { label: "Width", value: "1800 mm" },
        { label: "Height", value: "1710 mm" },
        { label: "Wheelbase", value: "2760 mm" },
        { label: "Boot Space", value: "180 L (7-seat)" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "14.5 kmpl" },
        { label: "Mileage (Diesel)", value: "18.1 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "Bluelink 2.0" },
        { label: "Sound System", value: "Bose 8-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" },
        { label: "ESC", value: "Standard" }
      ]
    },
    colors: [
      { name: "Starry Night", hex: "#1E2832" },
      { name: "Titan Grey", hex: "#808080" },
      { name: "Atlas White", hex: "#F5F5F5" },
      { name: "Abyss Black", hex: "#0F0F0F" }
    ],
    variants: [
      { name: "Executive", price: "₹14.99 Lakh", features: ["6 Airbags", "8-inch Screen", "Halogen Lamps"] },
      { name: "Prestige", price: "₹17.50 Lakh", features: ["LED Lamps", "Sunroof", "Digital Cluster"] },
      { name: "Platinum", price: "₹19.80 Lakh", features: ["Dual Sunroof", "ADAS", "Ventilated Seats"] },
      { name: "Signature", price: "₹21.55 Lakh", features: ["Bose Sound", "360 Camera", "Boss Mode"] }
    ],
    offers: generateOffers("₹45,000", "₹50,000"),
    pros: ["3-Row Seating", "Premium Features", "Comfortable", "Good Engines"],
    cons: ["Third Row Cramped", "Heavy", "Less Boot with 7 Seats"],
    competitors: ["Tata Safari", "MG Hector Plus", "Mahindra XUV700"]
  },
  {
    id: 106,
    slug: "hyundai-tucson",
    name: "Hyundai Tucson",
    brand: "Hyundai",
    bodyType: "Mid-Size SUV",
    tagline: "Beyond Imagination",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/97991/tucson-exterior-right-front-three-quarter-9.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/97991/tucson-exterior-right-front-three-quarter-9.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/97991/tucson-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/97991/tucson-interior-dashboard.jpeg"
    ],
    price: "₹29.02 - 35.94 Lakh",
    priceNumeric: 2902000,
    originalPrice: "₹30.00 Lakh",
    discount: "₹98,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Hyundai Tucson is a premium mid-size SUV with futuristic design, advanced technology, and powerful AWD options.",
    keyHighlights: [
      "Parametric Grille Design",
      "AWD with Terrain Modes",
      "ADAS Level 2 Safety",
      "Panoramic Sunroof",
      "10.25-inch Dual Screens",
      "64-Color Ambient Lighting"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Petrol / 2.0L Diesel" },
        { label: "Max Power", value: "154 bhp / 183 bhp" },
        { label: "Max Torque", value: "192 Nm / 416 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4630 mm" },
        { label: "Width", value: "1865 mm" },
        { label: "Height", value: "1665 mm" },
        { label: "Wheelbase", value: "2755 mm" },
        { label: "Boot Space", value: "539 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "13.5 kmpl" },
        { label: "Mileage (Diesel)", value: "18.4 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "Bluelink 2.0" },
        { label: "Sound System", value: "Bose 8-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" },
        { label: "Drive Modes", value: "AWD with Terrain" }
      ]
    },
    colors: [
      { name: "Glacier White", hex: "#F5F5F5" },
      { name: "Phantom Black", hex: "#1A1A1A" },
      { name: "Amazon Gray", hex: "#4A4A4A" },
      { name: "Fiery Red", hex: "#B22222" }
    ],
    variants: [
      { name: "Platinum", price: "₹29.02 Lakh", features: ["ADAS", "Sunroof", "10.25 Screens"] },
      { name: "Signature", price: "₹32.50 Lakh", features: ["Bose Sound", "360 Camera", "Ventilated Seats"] },
      { name: "Signature AWD", price: "₹35.94 Lakh", features: ["AWD", "Terrain Modes", "Premium Interior"] }
    ],
    offers: generateOffers("₹80,000", "₹70,000"),
    pros: ["Stunning Design", "Premium Interior", "AWD Option", "Strong Diesel"],
    cons: ["Expensive", "No Mild Hybrid", "Average Petrol Mileage"],
    competitors: ["Jeep Compass", "Citroen C5 Aircross", "VW Tiguan"]
  },
  {
    id: 107,
    slug: "hyundai-exter",
    name: "Hyundai Exter",
    brand: "Hyundai",
    bodyType: "Compact SUV",
    tagline: "Live the Extraordinary",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141031/exter-exterior-right-front-three-quarter-5.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141031/exter-exterior-right-front-three-quarter-5.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141031/exter-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141031/exter-interior-dashboard.jpeg"
    ],
    price: "₹6.13 - 10.28 Lakh",
    priceNumeric: 613000,
    originalPrice: "₹6.50 Lakh",
    discount: "₹37,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "AMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Hyundai Exter is an entry-level micro SUV with bold design, connected features, and practical packaging for city driving.",
    keyHighlights: [
      "8-inch Touchscreen",
      "Electric Sunroof",
      "Dashcam with Dual Camera",
      "Wireless Charging",
      "Factory-fitted CNG",
      "6 Airbags"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Petrol / 1.2L CNG" },
        { label: "Max Power", value: "82 bhp / 68 bhp" },
        { label: "Max Torque", value: "114 Nm / 95.2 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3815 mm" },
        { label: "Width", value: "1710 mm" },
        { label: "Height", value: "1631 mm" },
        { label: "Wheelbase", value: "2450 mm" },
        { label: "Boot Space", value: "391 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "19.2 kmpl" },
        { label: "Mileage (CNG)", value: "27.1 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Bluelink" },
        { label: "Dashboard Camera", value: "Dual Camera" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "ESC", value: "Available" }
      ]
    },
    colors: [
      { name: "Ranger Khaki", hex: "#5C5346" },
      { name: "Starry Night", hex: "#1E2832" },
      { name: "Atlas White", hex: "#F5F5F5" },
      { name: "Fiery Red", hex: "#B22222" }
    ],
    variants: [
      { name: "EX", price: "₹6.13 Lakh", features: ["6 Airbags", "Power Windows", "Manual AC"] },
      { name: "S", price: "₹7.50 Lakh", features: ["8-inch Screen", "Steering Controls", "Rear AC"] },
      { name: "SX", price: "₹8.80 Lakh", features: ["Sunroof", "Wireless Charger", "Bluelink"] },
      { name: "SX(O)", price: "₹10.28 Lakh", features: ["Dashcam", "LED Lamps", "Auto Climate"] }
    ],
    offers: generateOffers("₹20,000", "₹25,000"),
    pros: ["Affordable", "Feature Rich", "CNG Option", "City Friendly"],
    cons: ["Underpowered", "Basic Interiors", "Average Ride"],
    competitors: ["Tata Punch", "Maruti Fronx", "Nissan Magnite", "Renault Kiger"]
  },
  {
    id: 108,
    slug: "hyundai-ioniq-5",
    name: "Hyundai Ioniq 5",
    brand: "Hyundai",
    bodyType: "Electric",
    tagline: "I'm in Charge",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/174977/ioniq-5-exterior-right-front-three-quarter-2.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174977/ioniq-5-exterior-right-front-three-quarter-2.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174977/ioniq-5-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/174977/ioniq-5-interior-dashboard.jpeg"
    ],
    price: "₹46.05 - 46.05 Lakh",
    priceNumeric: 4605000,
    originalPrice: "₹48.00 Lakh",
    discount: "₹1,95,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "Limited Stock",
    isHot: false,
    isLimited: true,
    isNew: false,
    isUpcoming: false,
    overview: "The Hyundai Ioniq 5 is a futuristic electric crossover with retro-inspired design, ultra-fast charging, and cutting-edge technology.",
    keyHighlights: [
      "800V Ultra-Fast Charging",
      "72.6 kWh Battery Pack",
      "481 km Range (ARAI)",
      "Vehicle-to-Load (V2L)",
      "Dual 12.3-inch Screens",
      "Relaxation Seats"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "215 bhp" },
        { label: "Max Torque", value: "350 Nm" },
        { label: "Battery", value: "72.6 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "4635 mm" },
        { label: "Width", value: "1890 mm" },
        { label: "Height", value: "1647 mm" },
        { label: "Wheelbase", value: "3000 mm" },
        { label: "Boot Space", value: "527 L" }
      ],
      performance: [
        { label: "Range (ARAI)", value: "481 km" },
        { label: "Top Speed", value: "185 kmph" },
        { label: "0-100 kmph", value: "7.6 sec" },
        { label: "Fast Charging", value: "10-80% in 18 min" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Instrument Cluster", value: "12.3-inch Digital" },
        { label: "Connectivity", value: "Bluelink Connected" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" },
        { label: "NCAP Rating", value: "5 Star (Euro NCAP)" }
      ]
    },
    colors: [
      { name: "Gravity Gold Matte", hex: "#A08B5B" },
      { name: "Lucid Blue", hex: "#4A6FA5" },
      { name: "Atlas White", hex: "#F5F5F5" },
      { name: "Midnight Black", hex: "#1A1A1A" }
    ],
    variants: [
      { name: "Standard Range", price: "₹46.05 Lakh", features: ["72.6 kWh", "RWD", "ADAS", "V2L"] }
    ],
    offers: generateOffers("₹1,00,000", "₹50,000"),
    pros: ["Stunning Design", "Fast Charging", "Long Range", "Premium Interior"],
    cons: ["Expensive", "Limited Network", "Only Single Variant"],
    competitors: ["Kia EV6", "BYD Atto 3", "MG ZS EV"]
  },
  {
    id: 109,
    slug: "hyundai-aura",
    name: "Hyundai Aura",
    brand: "Hyundai",
    bodyType: "Sedan",
    tagline: "Premium Compact Sedan",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/46894/aura-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/46894/aura-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/46894/aura-exterior-rear-view.jpeg"
    ],
    price: "₹6.48 - 9.04 Lakh",
    priceNumeric: 648000,
    originalPrice: "₹7.00 Lakh",
    discount: "₹52,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "AMT"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Hyundai Aura is a compact sedan offering good space, efficient engines, and premium features at an affordable price.",
    keyHighlights: [
      "8-inch Touchscreen",
      "Wireless Charging",
      "Factory CNG Option",
      "Projector Headlamps",
      "Digital Instrument Cluster"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Petrol / 1.2L CNG" },
        { label: "Max Power", value: "82 bhp / 68 bhp" },
        { label: "Max Torque", value: "114 Nm / 95.2 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1680 mm" },
        { label: "Height", value: "1520 mm" },
        { label: "Wheelbase", value: "2450 mm" },
        { label: "Boot Space", value: "402 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "20.5 kmpl" },
        { label: "Mileage (CNG)", value: "27.4 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Android Auto, Apple CarPlay" }
      ],
      safety: [
        { label: "Airbags", value: "2 Airbags" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Polar White", hex: "#FAFAFA" },
      { name: "Titan Grey", hex: "#707070" },
      { name: "Fiery Red", hex: "#B22222" },
      { name: "Typhoon Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "E", price: "₹6.48 Lakh", features: ["2 Airbags", "Power Steering", "Manual AC"] },
      { name: "S", price: "₹7.50 Lakh", features: ["Touchscreen", "Rear AC", "Central Locking"] },
      { name: "SX", price: "₹8.50 Lakh", features: ["Wireless Charger", "LED DRLs", "Auto Climate"] },
      { name: "SX+", price: "₹9.04 Lakh", features: ["Sunroof", "Digital Cluster", "Projector Lamps"] }
    ],
    offers: generateOffers("₹30,000", "₹25,000"),
    pros: ["Spacious", "Good Mileage", "CNG Option", "Affordable"],
    cons: ["Basic Safety", "Average Ride", "Dated Design"],
    competitors: ["Maruti Dzire", "Honda Amaze", "Tata Tigor"]
  },
  {
    id: 110,
    slug: "hyundai-grand-i10-nios",
    name: "Hyundai Grand i10 Nios",
    brand: "Hyundai",
    bodyType: "Hatchback",
    tagline: "Forever Young",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/grand-i10-nios-exterior-right-front-three-quarter-4.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/grand-i10-nios-exterior-right-front-three-quarter-4.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141113/grand-i10-nios-exterior-rear-view.jpeg"
    ],
    price: "₹5.92 - 8.56 Lakh",
    priceNumeric: 592000,
    originalPrice: "₹6.30 Lakh",
    discount: "₹38,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "AMT"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Hyundai Grand i10 Nios is a practical hatchback offering space, comfort, and multiple powertrain options for city and highway driving.",
    keyHighlights: [
      "8-inch Touchscreen",
      "Wireless Charging",
      "Factory CNG",
      "Turbo GDi Engine",
      "Digital Cluster"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Petrol / 1.0L Turbo / 1.2L CNG" },
        { label: "Max Power", value: "82 bhp / 98 bhp / 68 bhp" },
        { label: "Max Torque", value: "114 Nm / 172 Nm / 95.2 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3805 mm" },
        { label: "Width", value: "1680 mm" },
        { label: "Height", value: "1520 mm" },
        { label: "Wheelbase", value: "2450 mm" },
        { label: "Boot Space", value: "260 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "20.7 kmpl" },
        { label: "Mileage (CNG)", value: "28.1 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "Android Auto, Apple CarPlay" }
      ],
      safety: [
        { label: "Airbags", value: "2 Airbags" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Polar White", hex: "#FAFAFA" },
      { name: "Titan Grey", hex: "#707070" },
      { name: "Fiery Red", hex: "#B22222" },
      { name: "Aqua Teal", hex: "#367588" }
    ],
    variants: [
      { name: "Era", price: "₹5.92 Lakh", features: ["2 Airbags", "Manual AC", "Power Steering"] },
      { name: "Magna", price: "₹6.80 Lakh", features: ["Touchscreen", "Central Locking", "Rear AC"] },
      { name: "Sportz", price: "₹7.50 Lakh", features: ["LED DRLs", "Wireless Charger", "Auto Climate"] },
      { name: "Asta", price: "₹8.56 Lakh", features: ["Sunroof", "Digital Cluster", "Projector Lamps"] }
    ],
    offers: generateOffers("₹25,000", "₹20,000"),
    pros: ["Spacious", "Good Mileage", "CNG Option", "Peppy Turbo"],
    cons: ["Basic Safety", "Average Ride", "Small Boot"],
    competitors: ["Maruti Swift", "Tata Tiago", "Renault Kwid"]
  }
];

export default hyundaiCars;
