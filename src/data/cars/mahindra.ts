import { Car, generateOffers } from "./types";

const mahindraCars: Car[] = [
  {
    id: 301,
    slug: "mahindra-xuv700",
    name: "Mahindra XUV700",
    brand: "Mahindra",
    bodyType: "Mid-Size SUV",
    tagline: "The World of SUVs",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/42355/xuv700-interior-dashboard.jpeg"
    ],
    price: "₹14.00 - 26.99 Lakh",
    priceNumeric: 1400000,
    originalPrice: "₹14.50 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Mahindra XUV700 is a feature-packed SUV with ADAS safety, powerful engines, and available in 5 and 7-seater configurations.",
    keyHighlights: [
      "ADAS Level 1 Safety",
      "Dual 10.25-inch Screens",
      "AdrenoX Connected Car",
      "200 bhp Turbo Petrol",
      "185 bhp Diesel Engine",
      "AWD with 4 Modes"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Turbo Petrol / 2.2L Diesel" },
        { label: "Max Power", value: "200 bhp / 185 bhp" },
        { label: "Max Torque", value: "380 Nm / 450 Nm (AT)" },
        { label: "Displacement", value: "1997 / 2184 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4695 mm" },
        { label: "Width", value: "1890 mm" },
        { label: "Height", value: "1755 mm" },
        { label: "Wheelbase", value: "2750 mm" },
        { label: "Boot Space", value: "225 L (7-seat)" },
        { label: "Ground Clearance", value: "200 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "13 kmpl" },
        { label: "Mileage (Diesel)", value: "16 kmpl" },
        { label: "Top Speed", value: "200 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Connectivity", value: "AdrenoX" },
        { label: "Sound System", value: "Sony 3D Premium" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" },
        { label: "ADAS", value: "Level 1 - 10+ Features" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Everest White", hex: "#F5F5F5" },
      { name: "Midnight Black", hex: "#1A1A1A" },
      { name: "Electric Blue", hex: "#2E5090" },
      { name: "Dazzling Silver", hex: "#A8A9AD" },
      { name: "Red Rage", hex: "#C41E3A" }
    ],
    variants: [
      { name: "MX", price: "₹14.00 Lakh", features: ["6 Airbags", "8-inch Screen", "Manual AC"] },
      { name: "AX3", price: "₹16.50 Lakh", features: ["10.25 Dual Screens", "Auto Climate", "AdrenoX"] },
      { name: "AX5", price: "₹18.80 Lakh", features: ["Sunroof", "Wireless Charger", "360 Camera"] },
      { name: "AX7", price: "₹22.50 Lakh", features: ["ADAS", "Sony Sound", "Ventilated Seats"] },
      { name: "AX7 AWD", price: "₹26.99 Lakh", features: ["AWD System", "Terrain Modes", "Premium Interior"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["Powerful Engines", "ADAS Safety", "Feature Rich", "5-Star Safety", "AWD Option"],
    cons: ["Long Waiting Period", "Third Row Cramped", "Heavy Steering"],
    competitors: ["Tata Harrier", "Hyundai Alcazar", "MG Hector Plus", "Kia Carens"]
  },
  {
    id: 302,
    slug: "mahindra-thar",
    name: "Mahindra Thar",
    brand: "Mahindra",
    bodyType: "Compact SUV",
    tagline: "Explore the Impossible",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-right-front-three-quarter-75.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-right-front-three-quarter-75.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/40087/thar-interior-dashboard.jpeg"
    ],
    price: "₹11.35 - 17.60 Lakh",
    priceNumeric: 1135000,
    originalPrice: "₹12.00 Lakh",
    discount: "₹65,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Mahindra Thar is an iconic off-roader with 4x4 capability, convertible top, and modern features wrapped in classic design.",
    keyHighlights: [
      "4x4 with Low Range",
      "Convertible Soft Top",
      "Waterproof Interiors",
      "9-inch Touchscreen",
      "Adventure Statistics",
      "226mm Ground Clearance"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Turbo Petrol / 2.2L Diesel" },
        { label: "Max Power", value: "150 bhp / 130 bhp" },
        { label: "Max Torque", value: "300 Nm / 300 Nm" },
        { label: "Displacement", value: "1997 / 2184 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3985 mm" },
        { label: "Width", value: "1820 mm" },
        { label: "Height", value: "1844 mm" },
        { label: "Wheelbase", value: "2450 mm" },
        { label: "Ground Clearance", value: "226 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "15.2 kmpl" },
        { label: "Mileage (Diesel)", value: "15.2 kmpl" },
        { label: "Wading Depth", value: "650 mm" }
      ],
      features: [
        { label: "Infotainment", value: "9-inch Touchscreen" },
        { label: "Connectivity", value: "AdrenoX" },
        { label: "Roof Options", value: "Hard Top / Soft Top / Convertible" }
      ],
      safety: [
        { label: "Airbags", value: "2 Airbags" },
        { label: "ABS", value: "With EBD" },
        { label: "Roll Cage", value: "Available" }
      ]
    },
    colors: [
      { name: "Napoli Black", hex: "#1A1A1A" },
      { name: "Galaxy Grey", hex: "#4A4A4A" },
      { name: "Rocky Beige", hex: "#C4A77D" },
      { name: "Red Rage", hex: "#C41E3A" },
      { name: "Aquamarine", hex: "#367588" }
    ],
    variants: [
      { name: "AX Std", price: "₹11.35 Lakh", features: ["4x4", "Soft Top", "Manual AC"] },
      { name: "AX Opt", price: "₹13.50 Lakh", features: ["Hard Top", "Alloys", "Touchscreen"] },
      { name: "LX MT", price: "₹15.30 Lakh", features: ["Auto Climate", "Cruise Control", "LED DRLs"] },
      { name: "LX AT", price: "₹17.60 Lakh", features: ["Automatic", "Hardtop", "AdrenoX"] }
    ],
    offers: generateOffers("₹25,000", "₹35,000"),
    pros: ["True Off-roader", "Iconic Design", "4x4 Capability", "Convertible Option"],
    cons: ["Only 4-Seater", "Basic Safety", "Average Ride Quality"],
    competitors: ["Maruti Jimny", "Force Gurkha"]
  },
  {
    id: 303,
    slug: "mahindra-thar-roxx",
    name: "Mahindra Thar ROXX",
    brand: "Mahindra",
    bodyType: "Compact SUV",
    tagline: "Born to Roxx",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/172207/thar-roxx-interior-dashboard.jpeg"
    ],
    price: "₹12.99 - 22.49 Lakh",
    priceNumeric: 1299000,
    originalPrice: "₹13.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "Booking Open",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Mahindra Thar ROXX is the 5-door version of the iconic Thar with more space, better features, and family-friendly practicality.",
    keyHighlights: [
      "5-Door 5-Seater",
      "ADAS Level 2 Safety",
      "10.25-inch Touchscreen",
      "Panoramic Sunroof",
      "4x4 with Terrain Modes",
      "Ventilated Seats"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Turbo Petrol / 2.2L Diesel" },
        { label: "Max Power", value: "162 bhp / 175 bhp" },
        { label: "Max Torque", value: "330 Nm / 370 Nm" },
        { label: "Displacement", value: "1997 / 2184 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4428 mm" },
        { label: "Width", value: "1870 mm" },
        { label: "Height", value: "1923 mm" },
        { label: "Wheelbase", value: "2850 mm" },
        { label: "Boot Space", value: "644 L" },
        { label: "Ground Clearance", value: "226 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "15.5 kmpl" },
        { label: "Mileage (Diesel)", value: "15.5 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Connectivity", value: "AdrenoX" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Stealth Black", hex: "#1A1A1A" },
      { name: "Battleship Grey", hex: "#4A4A4A" },
      { name: "Tango Red", hex: "#C41E3A" },
      { name: "Everest White", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "MX1", price: "₹12.99 Lakh", features: ["6 Airbags", "Touchscreen", "Manual AC"] },
      { name: "MX3", price: "₹15.50 Lakh", features: ["Auto Climate", "Alloys", "Cruise Control"] },
      { name: "AX3L", price: "₹18.00 Lakh", features: ["Sunroof", "ADAS Level 1", "AdrenoX"] },
      { name: "AX5L", price: "₹20.50 Lakh", features: ["Panoramic Sunroof", "Ventilated Seats", "360 Camera"] },
      { name: "AX7L 4x4", price: "₹22.49 Lakh", features: ["ADAS Level 2", "4x4", "Terrain Modes"] }
    ],
    offers: generateOffers("₹30,000", "₹40,000"),
    pros: ["5-Door Practicality", "ADAS Safety", "Powerful Diesel", "True 4x4"],
    cons: ["Long Waiting Period", "Firm Ride", "Premium Pricing"],
    competitors: ["Force Gurkha 5-Door", "Tata Harrier", "Hyundai Creta"]
  },
  {
    id: 304,
    slug: "mahindra-xuv-3xo",
    name: "Mahindra XUV 3XO",
    brand: "Mahindra",
    bodyType: "Compact SUV",
    tagline: "Smart SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/153603/xuv-3xo-interior-dashboard.jpeg"
    ],
    price: "₹7.79 - 15.49 Lakh",
    priceNumeric: 779000,
    originalPrice: "₹8.30 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic", "AMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Mahindra XUV 3XO (formerly XUV300) is a compact SUV with segment-leading features, powerful engines, and 5-star safety.",
    keyHighlights: [
      "10.25-inch Touchscreen",
      "AdrenoX Connected Car",
      "Panoramic Sunroof",
      "6 Airbags as Standard",
      "Wireless Charging",
      "5-Star NCAP Safety"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Turbo Petrol / 1.5L Diesel" },
        { label: "Max Power", value: "130 bhp / 115 bhp" },
        { label: "Max Torque", value: "230 Nm / 300 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1821 mm" },
        { label: "Height", value: "1647 mm" },
        { label: "Wheelbase", value: "2600 mm" },
        { label: "Boot Space", value: "364 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "18.4 kmpl" },
        { label: "Mileage (Diesel)", value: "20.1 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "7-inch Digital" },
        { label: "Connectivity", value: "AdrenoX" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Nebula Blue", hex: "#2E5090" },
      { name: "Everest White", hex: "#F5F5F5" },
      { name: "Red Rage", hex: "#C41E3A" },
      { name: "Tango Red", hex: "#8B2500" },
      { name: "Dazzling Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "MX1", price: "₹7.79 Lakh", features: ["6 Airbags", "ABS", "Manual AC"] },
      { name: "MX2", price: "₹9.50 Lakh", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "MX2 Pro", price: "₹11.00 Lakh", features: ["Sunroof", "Wireless Charger"] },
      { name: "AX5", price: "₹12.50 Lakh", features: ["Panoramic Sunroof", "Digital Cluster"] },
      { name: "AX7", price: "₹15.49 Lakh", features: ["AdrenoX", "Premium Sound", "360 Camera"] }
    ],
    offers: generateOffers("₹35,000", "₹40,000"),
    pros: ["5-Star Safety", "Powerful Engines", "Feature Rich", "Good Value"],
    cons: ["Small Boot", "Rear Space Average", "Firm Ride"],
    competitors: ["Tata Nexon", "Hyundai Venue", "Kia Sonet", "Maruti Brezza"]
  },
  {
    id: 305,
    slug: "mahindra-scorpio-n",
    name: "Mahindra Scorpio N",
    brand: "Mahindra",
    bodyType: "Full-Size SUV",
    tagline: "Big Daddy of SUVs",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-right-front-three-quarter-56.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-right-front-three-quarter-56.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/107745/scorpio-n-interior-dashboard.jpeg"
    ],
    price: "₹13.85 - 24.54 Lakh",
    priceNumeric: 1385000,
    originalPrice: "₹14.50 Lakh",
    discount: "₹65,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Mahindra Scorpio N is a rugged full-size SUV with powerful engines, 4x4 capability, and modern features.",
    keyHighlights: [
      "4x4 with Low Range",
      "8-inch Touchscreen",
      "AdrenoX Connected Car",
      "Sony 3D Sound",
      "Dual-Zone Climate Control",
      "175 bhp Diesel Engine"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Turbo Petrol / 2.2L Diesel" },
        { label: "Max Power", value: "200 bhp / 175 bhp" },
        { label: "Max Torque", value: "380 Nm / 400 Nm (AT)" },
        { label: "Displacement", value: "1997 / 2184 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4662 mm" },
        { label: "Width", value: "1917 mm" },
        { label: "Height", value: "1870 mm" },
        { label: "Wheelbase", value: "2750 mm" },
        { label: "Ground Clearance", value: "200 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "11.8 kmpl" },
        { label: "Mileage (Diesel)", value: "14.5 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "8-inch Touchscreen" },
        { label: "Connectivity", value: "AdrenoX" },
        { label: "Sound System", value: "Sony 3D Premium" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Napoli Black", hex: "#1A1A1A" },
      { name: "Everest White", hex: "#F5F5F5" },
      { name: "Red Rage", hex: "#C41E3A" },
      { name: "Deep Forest", hex: "#2E4E3F" },
      { name: "Dazzling Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "Z2", price: "₹13.85 Lakh", features: ["6 Airbags", "Touchscreen", "Manual AC"] },
      { name: "Z4", price: "₹15.50 Lakh", features: ["Auto Climate", "Alloys", "LED DRLs"] },
      { name: "Z6", price: "₹17.80 Lakh", features: ["Sunroof", "Wireless Charger", "AdrenoX"] },
      { name: "Z8", price: "₹20.50 Lakh", features: ["Sony Sound", "360 Camera", "Leather Seats"] },
      { name: "Z8 L 4x4", price: "₹24.54 Lakh", features: ["4x4", "Terrain Modes", "Premium Interior"] }
    ],
    offers: generateOffers("₹50,000", "₹60,000"),
    pros: ["True SUV Character", "Powerful Diesel", "4x4 Capability", "5-Star Safety"],
    cons: ["Stiff Ride", "Average Mileage", "Basic Interiors"],
    competitors: ["Tata Safari", "Hyundai Alcazar", "MG Hector Plus"]
  },
  {
    id: 306,
    slug: "mahindra-bolero",
    name: "Mahindra Bolero",
    brand: "Mahindra",
    bodyType: "MUV",
    tagline: "Live Young Live Free",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/39329/bolero-exterior-right-front-three-quarter-9.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/39329/bolero-exterior-right-front-three-quarter-9.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/39329/bolero-exterior-rear-view.jpeg"
    ],
    price: "₹9.79 - 10.84 Lakh",
    priceNumeric: 979000,
    originalPrice: "₹10.20 Lakh",
    discount: "₹41,000",
    fuelTypes: ["Diesel"],
    transmission: ["Manual"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Mahindra Bolero is an iconic rugged MUV known for reliability, durability, and excellent off-road capability.",
    keyHighlights: [
      "7/9 Seater Options",
      "1.5L Diesel Engine",
      "High Ground Clearance",
      "Power Steering",
      "Durable Build Quality",
      "Low Maintenance Cost"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L mHawk Diesel" },
        { label: "Max Power", value: "76 bhp" },
        { label: "Max Torque", value: "210 Nm" },
        { label: "Displacement", value: "1493 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1745 mm" },
        { label: "Height", value: "1880 mm" },
        { label: "Wheelbase", value: "2680 mm" },
        { label: "Ground Clearance", value: "180 mm" }
      ],
      performance: [
        { label: "Mileage", value: "16 kmpl" }
      ],
      features: [
        { label: "Steering", value: "Power Assisted" },
        { label: "AC", value: "Manual" }
      ],
      safety: [
        { label: "Airbags", value: "Dual Front" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Diamond White", hex: "#F5F5F5" },
      { name: "Mist Silver", hex: "#A8A9AD" },
      { name: "Lake Side Brown", hex: "#6B4423" },
      { name: "Majestic Silver", hex: "#C0C0C0" }
    ],
    variants: [
      { name: "B4", price: "₹9.79 Lakh", features: ["Power Steering", "AC", "Dual Airbags"] },
      { name: "B6", price: "₹10.25 Lakh", features: ["Music System", "Power Windows", "Central Locking"] },
      { name: "B6 (O)", price: "₹10.84 Lakh", features: ["Alloy Wheels", "Fog Lamps", "Rear Defogger"] }
    ],
    offers: generateOffers("₹15,000", "₹20,000"),
    pros: ["Reliable", "Durable", "Low Maintenance", "Off-road Capable"],
    cons: ["Basic Features", "Poor Safety", "Outdated Design"],
    competitors: ["Maruti Eeco", "Force Trax"]
  },
  {
    id: 307,
    slug: "mahindra-bolero-neo",
    name: "Mahindra Bolero Neo",
    brand: "Mahindra",
    bodyType: "Compact SUV",
    tagline: "Tough and Stylish",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/89387/bolero-neo-exterior-right-front-three-quarter-3.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/89387/bolero-neo-exterior-right-front-three-quarter-3.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/89387/bolero-neo-exterior-rear-view.jpeg"
    ],
    price: "₹9.76 - 12.25 Lakh",
    priceNumeric: 976000,
    originalPrice: "₹10.30 Lakh",
    discount: "₹54,000",
    fuelTypes: ["Diesel"],
    transmission: ["Manual"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Mahindra Bolero Neo is a modernized version of TUV300 with contemporary styling and improved features.",
    keyHighlights: [
      "7-inch Touchscreen",
      "Micro-Hybrid Technology",
      "Static Bending Headlamps",
      "1.5L Diesel Engine",
      "7-Seater Configuration"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L mHawk Diesel" },
        { label: "Max Power", value: "100 bhp" },
        { label: "Max Torque", value: "240 Nm" },
        { label: "Displacement", value: "1493 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1795 mm" },
        { label: "Height", value: "1840 mm" },
        { label: "Wheelbase", value: "2680 mm" },
        { label: "Ground Clearance", value: "180 mm" }
      ],
      performance: [
        { label: "Mileage", value: "17 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "7-inch Touchscreen" },
        { label: "Connectivity", value: "Bluetooth" }
      ],
      safety: [
        { label: "Airbags", value: "Dual Front" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Pearl White", hex: "#F5F5F5" },
      { name: "Napoli Black", hex: "#1A1A1A" },
      { name: "Highway Red", hex: "#C41E3A" },
      { name: "Mist Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "N4", price: "₹9.76 Lakh", features: ["Dual Airbags", "ABS", "Power Windows"] },
      { name: "N8", price: "₹11.00 Lakh", features: ["Touchscreen", "Alloys", "Fog Lamps"] },
      { name: "N10", price: "₹12.25 Lakh", features: ["Projector Headlamps", "Cruise Control", "Rear Camera"] }
    ],
    offers: generateOffers("₹20,000", "₹25,000"),
    pros: ["Rugged Build", "Reliable Engine", "7 Seats", "Good Ground Clearance"],
    cons: ["Basic Interiors", "Average Safety", "Outdated Platform"],
    competitors: ["Renault Triber", "Nissan Magnite"]
  },
  {
    id: 308,
    slug: "mahindra-xuv400",
    name: "Mahindra XUV400",
    brand: "Mahindra",
    bodyType: "Electric",
    tagline: "Electric SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/124681/xuv400-exterior-right-front-three-quarter-4.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/124681/xuv400-exterior-right-front-three-quarter-4.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/124681/xuv400-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/124681/xuv400-interior-dashboard.jpeg"
    ],
    price: "₹15.49 - 19.19 Lakh",
    priceNumeric: 1549000,
    originalPrice: "₹16.00 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Mahindra XUV400 is an electric SUV based on XUV300 with good range, fast charging, and SUV practicality.",
    keyHighlights: [
      "456 km Range (ARAI)",
      "Fast Charging Support",
      "7-inch Touchscreen",
      "AdrenoX Connected",
      "3 Drive Modes",
      "Sunroof"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "148 bhp" },
        { label: "Max Torque", value: "310 Nm" },
        { label: "Battery", value: "39.4 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "4200 mm" },
        { label: "Width", value: "1821 mm" },
        { label: "Height", value: "1627 mm" },
        { label: "Wheelbase", value: "2600 mm" },
        { label: "Boot Space", value: "378 L" }
      ],
      performance: [
        { label: "Range (ARAI)", value: "456 km" },
        { label: "Top Speed", value: "150 kmph" },
        { label: "0-100 kmph", value: "8.3 sec" },
        { label: "Fast Charging", value: "0-80% in 50 min" }
      ],
      features: [
        { label: "Infotainment", value: "7-inch Touchscreen" },
        { label: "Connectivity", value: "AdrenoX" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Napoli Black", hex: "#1A1A1A" },
      { name: "Galaxy Grey", hex: "#4A4A4A" },
      { name: "Arctic Blue", hex: "#367588" },
      { name: "Everest White", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "EC", price: "₹15.49 Lakh", features: ["34.5 kWh Battery", "375 km Range"] },
      { name: "EL", price: "₹17.00 Lakh", features: ["39.4 kWh Battery", "456 km Range", "Sunroof"] },
      { name: "EL Pro", price: "₹19.19 Lakh", features: ["Fast Charging", "AdrenoX", "Premium Sound"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["Good Range", "Fast Charging", "SUV Practicality", "Fun to Drive"],
    cons: ["Average Interiors", "Small Boot", "Limited Network"],
    competitors: ["Tata Nexon EV", "MG ZS EV", "Hyundai Kona Electric"]
  },
  {
    id: 309,
    slug: "mahindra-marazzo",
    name: "Mahindra Marazzo",
    brand: "Mahindra",
    bodyType: "MPV",
    tagline: "The Shark Inspired MPV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/32689/marazzo-exterior-right-front-three-quarter-6.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/32689/marazzo-exterior-right-front-three-quarter-6.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/32689/marazzo-exterior-rear-view.jpeg"
    ],
    price: "₹13.99 - 18.74 Lakh",
    priceNumeric: 1399000,
    originalPrice: "₹14.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Mahindra Marazzo is a shark-inspired MPV with spacious interiors, comfortable ride, and practical 7/8-seater layout.",
    keyHighlights: [
      "7/8 Seater Options",
      "Shark-Inspired Design",
      "Best-in-Class Ride Comfort",
      "Surround Cool Technology",
      "Low NVH Levels"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.5L mFalcon Diesel" },
        { label: "Max Power", value: "121 bhp" },
        { label: "Max Torque", value: "300 Nm" },
        { label: "Displacement", value: "1497 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4585 mm" },
        { label: "Width", value: "1866 mm" },
        { label: "Height", value: "1774 mm" },
        { label: "Wheelbase", value: "2760 mm" }
      ],
      performance: [
        { label: "Mileage", value: "17.3 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "7-inch Touchscreen" },
        { label: "Climate Control", value: "Surround Cool" }
      ],
      safety: [
        { label: "Airbags", value: "2 Airbags" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Maroon", hex: "#5C2018" },
      { name: "Pearl White", hex: "#F5F5F5" },
      { name: "Silver", hex: "#A8A9AD" },
      { name: "Grey", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "M2", price: "₹13.99 Lakh", features: ["Dual Airbags", "Power Windows", "AC"] },
      { name: "M4", price: "₹15.50 Lakh", features: ["Touchscreen", "Steering Controls", "Alloys"] },
      { name: "M6+", price: "₹17.00 Lakh", features: ["Leather Seats", "Climate Control", "Rear AC"] },
      { name: "M8", price: "₹18.74 Lakh", features: ["Automatic", "Premium Interior", "Cruise Control"] }
    ],
    offers: generateOffers("₹30,000", "₹35,000"),
    pros: ["Spacious", "Comfortable Ride", "Good Diesel Engine", "Practical"],
    cons: ["Basic Safety", "Dated Design", "No Petrol Option"],
    competitors: ["Maruti Ertiga", "Kia Carens", "Toyota Innova Hycross"]
  },
  {
    id: 310,
    slug: "mahindra-be-6e",
    name: "Mahindra BE 6e",
    brand: "Mahindra",
    bodyType: "Electric",
    tagline: "Born Electric",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/176221/be-6e-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/176221/be-6e-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/176221/be-6e-exterior-rear-view.jpeg"
    ],
    price: "₹18.90 - 26.90 Lakh",
    priceNumeric: 1890000,
    originalPrice: "₹19.50 Lakh",
    discount: "₹60,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "Coming Soon",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: true,
    launchDate: "Q1 2025",
    overview: "The Mahindra BE 6e is the first model from Mahindra's new born-electric platform with futuristic design and 500+ km range.",
    keyHighlights: [
      "Born Electric Platform (INGLO)",
      "500+ km Range",
      "800V Architecture",
      "DC Fast Charging",
      "Futuristic Coupe SUV Design",
      "ADAS Safety Suite"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "228 bhp (est.)" },
        { label: "Max Torque", value: "380 Nm (est.)" },
        { label: "Battery", value: "79 kWh (est.)" }
      ],
      dimensions: [
        { label: "Length", value: "4550 mm (est.)" },
        { label: "Width", value: "1900 mm (est.)" },
        { label: "Height", value: "1650 mm (est.)" },
        { label: "Wheelbase", value: "2775 mm (est.)" }
      ],
      performance: [
        { label: "Range", value: "500+ km (est.)" },
        { label: "0-100 kmph", value: "6.5 sec (est.)" },
        { label: "Fast Charging", value: "20-80% in 20 min (est.)" }
      ],
      features: [
        { label: "Infotainment", value: "Dual Large Screens" },
        { label: "Connectivity", value: "Advanced Connected Car" }
      ],
      safety: [
        { label: "Airbags", value: "6+ Airbags" },
        { label: "ADAS", value: "Level 2" }
      ]
    },
    colors: [
      { name: "Red", hex: "#C41E3A" },
      { name: "White", hex: "#F5F5F5" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Blue", hex: "#2E5090" }
    ],
    variants: [
      { name: "Pack One", price: "₹18.90 Lakh", features: ["59 kWh Battery", "450 km Range"] },
      { name: "Pack Two", price: "₹22.00 Lakh", features: ["79 kWh Battery", "550 km Range", "ADAS"] },
      { name: "Pack Three", price: "₹26.90 Lakh", features: ["Premium Interior", "All Features", "Performance Pack"] }
    ],
    offers: generateOffers("₹0", "₹0"),
    pros: ["Long Range", "Fast Charging", "Futuristic Design", "Indian Brand EV"],
    cons: ["Unproven Platform", "Premium Pricing", "Service Network"],
    competitors: ["Tata Curvv EV", "Hyundai Creta EV", "MG ZS EV"]
  }
];

export default mahindraCars;
