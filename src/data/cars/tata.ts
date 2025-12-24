import { Car, generateOffers } from "./types";

const tataCars: Car[] = [
  {
    id: 201,
    slug: "tata-nexon",
    name: "Tata Nexon",
    brand: "Tata",
    bodyType: "Compact SUV",
    tagline: "Made of Dark",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-71.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-right-front-three-quarter-71.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141867/nexon-interior-dashboard.jpeg"
    ],
    price: "₹8.10 - 15.50 Lakh",
    priceNumeric: 810000,
    originalPrice: "₹8.60 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic", "AMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Tata Nexon is India's safest and best-selling compact SUV with 5-star GNCAP rating, multiple powertrains, and feature-packed variants.",
    keyHighlights: [
      "5-Star Global NCAP Rating",
      "10.25-inch Touchscreen",
      "360-Degree Camera",
      "Ventilated Front Seats",
      "Electric Sunroof",
      "Connected Car Tech"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Turbo Petrol / 1.5L Diesel" },
        { label: "Max Power", value: "118 bhp / 113 bhp" },
        { label: "Max Torque", value: "170 Nm / 260 Nm" },
        { label: "Displacement", value: "1199 / 1497 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1804 mm" },
        { label: "Height", value: "1620 mm" },
        { label: "Wheelbase", value: "2498 mm" },
        { label: "Boot Space", value: "382 L" },
        { label: "Ground Clearance", value: "209 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "17.4 kmpl" },
        { label: "Mileage (Diesel)", value: "24.1 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Connectivity", value: "iRA Connected Car" },
        { label: "Sound System", value: "JBL 9-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" },
        { label: "ISOFIX", value: "Child Seat Anchors" }
      ]
    },
    colors: [
      { name: "Flame Red", hex: "#C41E3A" },
      { name: "Creative Ocean", hex: "#1E4D6B" },
      { name: "Fearless Purple", hex: "#6B3FA0" },
      { name: "Pristine White", hex: "#F5F5F5" },
      { name: "Pure Grey", hex: "#808080" },
      { name: "Daytona Grey", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Smart", price: "₹8.10 Lakh", features: ["6 Airbags", "ABS", "Manual AC"] },
      { name: "Smart+", price: "₹9.50 Lakh", features: ["10.25 Screen", "Auto Climate", "LED DRLs"] },
      { name: "Pure+", price: "₹10.80 Lakh", features: ["Sunroof", "Cruise Control", "Rear AC"] },
      { name: "Creative", price: "₹12.50 Lakh", features: ["360 Camera", "Ventilated Seats", "iRA"] },
      { name: "Fearless+", price: "₹15.50 Lakh", features: ["JBL Sound", "Air Purifier", "Premium Interior"] }
    ],
    offers: generateOffers("₹35,000", "₹40,000"),
    pros: ["5-Star Safety", "Strong Diesel", "Feature Rich", "Good Build Quality"],
    cons: ["Average Petrol Mileage", "Cramped Rear", "Jerky AMT"],
    competitors: ["Hyundai Venue", "Kia Sonet", "Maruti Brezza", "Mahindra XUV 3XO"]
  },
  {
    id: 202,
    slug: "tata-punch",
    name: "Tata Punch",
    brand: "Tata",
    bodyType: "Compact SUV",
    tagline: "Pack a Punch",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-right-front-three-quarter-101.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-right-front-three-quarter-101.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/130591/punch-interior-dashboard.jpeg"
    ],
    price: "₹6.13 - 10.20 Lakh",
    priceNumeric: 613000,
    originalPrice: "₹6.50 Lakh",
    discount: "₹37,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "AMT"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Tata Punch is a micro SUV with 5-star safety rating, high ground clearance, and SUV-like stance in a compact package.",
    keyHighlights: [
      "5-Star Global NCAP Rating",
      "190mm Ground Clearance",
      "7-inch Touchscreen",
      "90-Degree Door Opening",
      "iRA Connected Car",
      "Terrain Modes"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Revotron Petrol / 1.2L CNG" },
        { label: "Max Power", value: "86 bhp / 72 bhp" },
        { label: "Max Torque", value: "113 Nm / 95 Nm" },
        { label: "Displacement", value: "1199 cc" }
      ],
      dimensions: [
        { label: "Length", value: "3827 mm" },
        { label: "Width", value: "1742 mm" },
        { label: "Height", value: "1615 mm" },
        { label: "Wheelbase", value: "2445 mm" },
        { label: "Boot Space", value: "366 L" },
        { label: "Ground Clearance", value: "190 mm" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "18.8 kmpl" },
        { label: "Mileage (CNG)", value: "26.99 km/kg" },
        { label: "Top Speed", value: "160 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "7-inch Touchscreen" },
        { label: "Instrument Cluster", value: "Part-Digital" },
        { label: "Connectivity", value: "iRA Connected" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Available" }
      ]
    },
    colors: [
      { name: "Meteor Bronze", hex: "#8B7355" },
      { name: "Tornado Blue", hex: "#2E5090" },
      { name: "Atomic Orange", hex: "#FF6B35" },
      { name: "Orcus White", hex: "#F5F5F5" },
      { name: "Calypso Red", hex: "#9B2335" }
    ],
    variants: [
      { name: "Pure", price: "₹6.13 Lakh", features: ["Dual Airbags", "ABS", "Manual AC"] },
      { name: "Adventure", price: "₹7.30 Lakh", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "Accomplished", price: "₹8.50 Lakh", features: ["Auto Climate", "Push Button Start"] },
      { name: "Creative", price: "₹10.20 Lakh", features: ["Sunroof", "6 Airbags", "iRA Connect"] }
    ],
    offers: generateOffers("₹20,000", "₹25,000"),
    pros: ["5-Star Safety", "High Ground Clearance", "Practical", "CNG Option"],
    cons: ["Underpowered Engine", "No Diesel", "Basic Interiors"],
    competitors: ["Hyundai Exter", "Maruti Fronx", "Nissan Magnite", "Renault Kiger"]
  },
  {
    id: 203,
    slug: "tata-harrier",
    name: "Tata Harrier",
    brand: "Tata",
    bodyType: "Mid-Size SUV",
    tagline: "Above All",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139139/harrier-facelift-interior-dashboard.jpeg"
    ],
    price: "₹15.49 - 26.44 Lakh",
    priceNumeric: 1549000,
    originalPrice: "₹16.00 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The 2024 Tata Harrier facelift is a premium SUV with bold design, ADAS safety, and powerful Kryotec diesel engine built on OMEGARC platform.",
    keyHighlights: [
      "ADAS Level 2 - 21 Features",
      "12.3-inch Touchscreen",
      "Panoramic Sunroof",
      "JBL 10-Speaker Sound",
      "360-Degree Camera",
      "Flush Door Handles"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Kryotec Diesel" },
        { label: "Max Power", value: "168 bhp" },
        { label: "Max Torque", value: "350 Nm" },
        { label: "Displacement", value: "1956 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4605 mm" },
        { label: "Width", value: "1965 mm" },
        { label: "Height", value: "1786 mm" },
        { label: "Wheelbase", value: "2741 mm" },
        { label: "Boot Space", value: "425 L" },
        { label: "Ground Clearance", value: "200 mm" }
      ],
      performance: [
        { label: "Mileage", value: "14.6 kmpl" },
        { label: "Top Speed", value: "180 kmph" },
        { label: "0-100 kmph", value: "9.9 sec" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Connectivity", value: "iRA 2.0 Connected" },
        { label: "Sound System", value: "JBL 10-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2 - 21 Features" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Ash Grey", hex: "#4A4A4A" },
      { name: "Coral Red", hex: "#C41E3A" },
      { name: "Summit Gold", hex: "#C5A572" },
      { name: "Stellar Frost", hex: "#F5F5F5" },
      { name: "Sunlit Bronze", hex: "#8B7355" }
    ],
    variants: [
      { name: "Smart", price: "₹15.49 Lakh", features: ["6 Airbags", "10.25 Screen", "Auto Climate"] },
      { name: "Pure+", price: "₹17.80 Lakh", features: ["Panoramic Sunroof", "Wireless Charger"] },
      { name: "Adventure+", price: "₹20.50 Lakh", features: ["ADAS Level 1", "360 Camera", "iRA 2.0"] },
      { name: "Fearless+", price: "₹26.44 Lakh", features: ["ADAS Level 2", "JBL Sound", "Air Purifier"] }
    ],
    offers: generateOffers("₹50,000", "₹60,000"),
    pros: ["ADAS Safety", "Powerful Diesel", "Premium Interior", "5-Star Safety"],
    cons: ["Diesel Only", "Average Mileage", "Heavy Steering"],
    competitors: ["Hyundai Creta", "Kia Seltos", "MG Hector", "Mahindra XUV700"]
  },
  {
    id: 204,
    slug: "tata-safari",
    name: "Tata Safari",
    brand: "Tata",
    bodyType: "Full-Size SUV",
    tagline: "Reclaim Your Life",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/139141/safari-facelift-interior-dashboard.jpeg"
    ],
    price: "₹16.19 - 27.34 Lakh",
    priceNumeric: 1619000,
    originalPrice: "₹16.80 Lakh",
    discount: "₹61,000",
    fuelTypes: ["Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The 2024 Tata Safari facelift is a 6/7-seater flagship SUV with ADAS, premium interiors, and commanding road presence.",
    keyHighlights: [
      "6/7 Seater Options",
      "ADAS Level 2",
      "12.3-inch Touchscreen",
      "Panoramic Sunroof",
      "Ventilated Front Seats",
      "Boss Mode 2.0"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L Kryotec Diesel" },
        { label: "Max Power", value: "168 bhp" },
        { label: "Max Torque", value: "350 Nm" },
        { label: "Displacement", value: "1956 cc" }
      ],
      dimensions: [
        { label: "Length", value: "4661 mm" },
        { label: "Width", value: "1894 mm" },
        { label: "Height", value: "1786 mm" },
        { label: "Wheelbase", value: "2741 mm" },
        { label: "Boot Space", value: "447 L (7-seat)" },
        { label: "Ground Clearance", value: "200 mm" }
      ],
      performance: [
        { label: "Mileage", value: "14.5 kmpl" },
        { label: "Top Speed", value: "180 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Sound System", value: "JBL 10-Speaker" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" },
        { label: "ADAS", value: "Level 2 - 21 Features" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" }
      ]
    },
    colors: [
      { name: "Stardust Ash", hex: "#4A4A4A" },
      { name: "Orcus White", hex: "#F5F5F5" },
      { name: "Cosmic Gold", hex: "#C5A572" },
      { name: "Oberon Black", hex: "#1A1A1A" }
    ],
    variants: [
      { name: "Smart", price: "₹16.19 Lakh", features: ["6 Airbags", "Touchscreen", "Manual AC"] },
      { name: "Pure+", price: "₹18.80 Lakh", features: ["Sunroof", "Boss Mode", "Auto Climate"] },
      { name: "Adventure+", price: "₹22.50 Lakh", features: ["ADAS Level 1", "360 Camera", "iRA 2.0"] },
      { name: "Accomplished+", price: "₹27.34 Lakh", features: ["ADAS Level 2", "JBL Sound", "Ventilated Seats"] }
    ],
    offers: generateOffers("₹55,000", "₹65,000"),
    pros: ["3-Row Seating", "ADAS Safety", "Premium Interior", "Powerful Engine"],
    cons: ["Diesel Only", "Cramped Third Row", "Heavy to Maneuver"],
    competitors: ["Hyundai Alcazar", "MG Hector Plus", "Mahindra XUV700"]
  },
  {
    id: 205,
    slug: "tata-altroz",
    name: "Tata Altroz",
    brand: "Tata",
    bodyType: "Hatchback",
    tagline: "The Gold Standard",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-exterior-right-front-three-quarter-11.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-exterior-right-front-three-quarter-11.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/32597/altroz-interior-dashboard.jpeg"
    ],
    price: "₹6.60 - 10.74 Lakh",
    priceNumeric: 660000,
    originalPrice: "₹7.00 Lakh",
    discount: "₹40,000",
    fuelTypes: ["Petrol", "Diesel", "CNG"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Tata Altroz is a premium hatchback with 5-star safety rating, multiple engine options, and segment-leading features.",
    keyHighlights: [
      "5-Star Global NCAP Rating",
      "10.25-inch Touchscreen",
      "1.2L Turbo Petrol Engine",
      "iRA Connected Car",
      "Premium Harman Sound",
      "Diesel & CNG Options"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Petrol / 1.2L Turbo / 1.5L Diesel" },
        { label: "Max Power", value: "86 bhp / 118 bhp / 89 bhp" },
        { label: "Max Torque", value: "113 Nm / 170 Nm / 200 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3990 mm" },
        { label: "Width", value: "1755 mm" },
        { label: "Height", value: "1523 mm" },
        { label: "Wheelbase", value: "2501 mm" },
        { label: "Boot Space", value: "345 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "19.3 kmpl" },
        { label: "Mileage (Diesel)", value: "25.1 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "iRA Connected" },
        { label: "Sound System", value: "Harman Premium" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" }
      ]
    },
    colors: [
      { name: "Harbour Blue", hex: "#2E5090" },
      { name: "High Street Gold", hex: "#C5A572" },
      { name: "Downtown Red", hex: "#9B2335" },
      { name: "Avenue White", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "XE", price: "₹6.60 Lakh", features: ["Dual Airbags", "Manual AC", "ABS"] },
      { name: "XM", price: "₹7.50 Lakh", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "XZ", price: "₹8.80 Lakh", features: ["Auto Climate", "LED DRLs", "Alloys"] },
      { name: "XZ+", price: "₹10.74 Lakh", features: ["Sunroof", "iRA Connect", "Ventilated Seats"] }
    ],
    offers: generateOffers("₹25,000", "₹30,000"),
    pros: ["5-Star Safety", "Multiple Engines", "Premium Interior", "Diesel & CNG"],
    cons: ["Average Petrol Engine", "No Automatic in Base", "Firm Ride"],
    competitors: ["Hyundai i20", "Maruti Baleno", "Honda Jazz", "Toyota Glanza"]
  },
  {
    id: 206,
    slug: "tata-nexon-ev",
    name: "Tata Nexon EV",
    brand: "Tata",
    bodyType: "Electric",
    tagline: "Born Electric",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/nexon-ev-exterior-right-front-three-quarter-11.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/nexon-ev-exterior-right-front-three-quarter-11.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/nexon-ev-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/141125/nexon-ev-interior-dashboard.jpeg"
    ],
    price: "₹14.79 - 19.94 Lakh",
    priceNumeric: 1479000,
    originalPrice: "₹15.50 Lakh",
    discount: "₹71,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Tata Nexon EV is India's best-selling electric SUV with long range, fast charging, and 5-star safety rating.",
    keyHighlights: [
      "465 km Range (ARAI)",
      "Fast Charging Support",
      "10.25-inch Touchscreen",
      "Connected Car Tech",
      "Vehicle-to-Vehicle Charging",
      "5-Star NCAP Safety"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "143 bhp" },
        { label: "Max Torque", value: "215 Nm" },
        { label: "Battery", value: "40.5 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "3993 mm" },
        { label: "Width", value: "1811 mm" },
        { label: "Height", value: "1616 mm" },
        { label: "Wheelbase", value: "2498 mm" },
        { label: "Boot Space", value: "350 L" }
      ],
      performance: [
        { label: "Range (ARAI)", value: "465 km" },
        { label: "Top Speed", value: "150 kmph" },
        { label: "0-100 kmph", value: "8.9 sec" },
        { label: "Fast Charging", value: "10-80% in 56 min" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Connectivity", value: "ZConnect 2.0" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "NCAP Rating", value: "5 Star (GNCAP)" }
      ]
    },
    colors: [
      { name: "Teal Blue", hex: "#367588" },
      { name: "Pristine White", hex: "#F5F5F5" },
      { name: "Fearless Purple", hex: "#6B3FA0" },
      { name: "Daytona Grey", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Prime", price: "₹14.79 Lakh", features: ["30.2 kWh Battery", "312 km Range"] },
      { name: "Creative+", price: "₹16.79 Lakh", features: ["40.5 kWh Battery", "465 km Range"] },
      { name: "Fearless+", price: "₹19.94 Lakh", features: ["Sunroof", "JBL Sound", "Air Purifier"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["Long Range", "Fast Charging", "5-Star Safety", "Good Value"],
    cons: ["Limited Charging Network", "Average Interiors", "No AWD"],
    competitors: ["MG ZS EV", "Hyundai Kona Electric", "Mahindra XUV400"]
  },
  {
    id: 207,
    slug: "tata-tiago",
    name: "Tata Tiago",
    brand: "Tata",
    bodyType: "Hatchback",
    tagline: "Your Fantastic Car",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/48542/tiago-exterior-right-front-three-quarter-6.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/48542/tiago-exterior-right-front-three-quarter-6.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/48542/tiago-exterior-rear-view.jpeg"
    ],
    price: "₹5.65 - 8.60 Lakh",
    priceNumeric: 565000,
    originalPrice: "₹6.00 Lakh",
    discount: "₹35,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "AMT"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Tata Tiago is an affordable hatchback with good safety features, multiple powertrain options, and practical design.",
    keyHighlights: [
      "4-Star Global NCAP Rating",
      "7-inch Touchscreen",
      "Factory CNG Option",
      "Harman Infotainment",
      "Connected Car Tech"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Revotron Petrol / 1.2L CNG" },
        { label: "Max Power", value: "86 bhp / 72 bhp" },
        { label: "Max Torque", value: "113 Nm / 95 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3765 mm" },
        { label: "Width", value: "1677 mm" },
        { label: "Height", value: "1535 mm" },
        { label: "Wheelbase", value: "2400 mm" },
        { label: "Boot Space", value: "242 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "19.8 kmpl" },
        { label: "Mileage (CNG)", value: "26.5 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "7-inch Touchscreen" },
        { label: "Connectivity", value: "iRA Connected" }
      ],
      safety: [
        { label: "Airbags", value: "4 Airbags" },
        { label: "NCAP Rating", value: "4 Star (GNCAP)" }
      ]
    },
    colors: [
      { name: "Opal White", hex: "#F5F5F5" },
      { name: "Flame Red", hex: "#C41E3A" },
      { name: "Daytona Grey", hex: "#4A4A4A" },
      { name: "Arizona Blue", hex: "#2E5090" }
    ],
    variants: [
      { name: "XE", price: "₹5.65 Lakh", features: ["Dual Airbags", "Manual AC", "Power Steering"] },
      { name: "XM", price: "₹6.30 Lakh", features: ["Central Locking", "Power Windows"] },
      { name: "XZ", price: "₹7.30 Lakh", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "XZ+", price: "₹8.60 Lakh", features: ["Alloys", "iRA Connect", "Projector Lamps"] }
    ],
    offers: generateOffers("₹20,000", "₹20,000"),
    pros: ["Affordable", "Good Safety", "CNG Option", "Stylish Design"],
    cons: ["Underpowered Engine", "Small Boot", "Basic Interiors"],
    competitors: ["Maruti WagonR", "Hyundai Santro", "Renault Kwid"]
  },
  {
    id: 208,
    slug: "tata-tigor",
    name: "Tata Tigor",
    brand: "Tata",
    bodyType: "Sedan",
    tagline: "Make a Statement",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/48107/tigor-exterior-right-front-three-quarter-4.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/48107/tigor-exterior-right-front-three-quarter-4.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/48107/tigor-exterior-rear-view.jpeg"
    ],
    price: "₹6.30 - 9.55 Lakh",
    priceNumeric: 630000,
    originalPrice: "₹6.70 Lakh",
    discount: "₹40,000",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "AMT"],
    availability: "In Stock",
    isHot: false,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Tata Tigor is a compact sedan offering 4-star safety, spacious interiors, and efficient powertrain options.",
    keyHighlights: [
      "4-Star Global NCAP Rating",
      "7-inch Touchscreen",
      "Factory CNG Option",
      "Connected Car Tech",
      "Stylish Coupe Design"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Revotron Petrol / 1.2L CNG" },
        { label: "Max Power", value: "86 bhp / 72 bhp" },
        { label: "Max Torque", value: "113 Nm / 95 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "3992 mm" },
        { label: "Width", value: "1677 mm" },
        { label: "Height", value: "1532 mm" },
        { label: "Wheelbase", value: "2450 mm" },
        { label: "Boot Space", value: "419 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "19.8 kmpl" },
        { label: "Mileage (CNG)", value: "26.5 km/kg" }
      ],
      features: [
        { label: "Infotainment", value: "7-inch Touchscreen" },
        { label: "Connectivity", value: "iRA Connected" }
      ],
      safety: [
        { label: "Airbags", value: "4 Airbags" },
        { label: "NCAP Rating", value: "4 Star (GNCAP)" }
      ]
    },
    colors: [
      { name: "Arizona Blue", hex: "#2E5090" },
      { name: "Opal White", hex: "#F5F5F5" },
      { name: "Daytona Grey", hex: "#4A4A4A" },
      { name: "Flame Red", hex: "#C41E3A" }
    ],
    variants: [
      { name: "XE", price: "₹6.30 Lakh", features: ["Dual Airbags", "Manual AC", "ABS"] },
      { name: "XM", price: "₹7.00 Lakh", features: ["Power Windows", "Central Locking"] },
      { name: "XZ", price: "₹8.00 Lakh", features: ["Touchscreen", "Rear Parking Sensors"] },
      { name: "XZ+", price: "₹9.55 Lakh", features: ["Alloys", "iRA Connect", "Auto Climate"] }
    ],
    offers: generateOffers("₹25,000", "₹25,000"),
    pros: ["4-Star Safety", "Spacious Boot", "CNG Option", "Stylish"],
    cons: ["Underpowered Engine", "Average Ride", "Basic Interiors"],
    competitors: ["Maruti Dzire", "Honda Amaze", "Hyundai Aura"]
  },
  {
    id: 209,
    slug: "tata-curvv",
    name: "Tata Curvv",
    brand: "Tata",
    bodyType: "Compact SUV",
    tagline: "The Coupe SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/169763/curvv-exterior-right-front-three-quarter-2.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/169763/curvv-exterior-right-front-three-quarter-2.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/169763/curvv-exterior-rear-view.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/169763/curvv-interior-dashboard.jpeg"
    ],
    price: "₹10.00 - 19.00 Lakh",
    priceNumeric: 1000000,
    originalPrice: "₹10.50 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "Booking Open",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Tata Curvv is India's first coupe SUV with stunning design, ADAS safety, and multiple powertrain options.",
    keyHighlights: [
      "Coupe SUV Design",
      "ADAS Level 2",
      "12.3-inch Touchscreen",
      "Panoramic Sunroof",
      "360-Degree Camera",
      "Flush Door Handles"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.2L Turbo Petrol / 1.5L Diesel" },
        { label: "Max Power", value: "118 bhp / 113 bhp" },
        { label: "Max Torque", value: "170 Nm / 260 Nm" }
      ],
      dimensions: [
        { label: "Length", value: "4308 mm" },
        { label: "Width", value: "1810 mm" },
        { label: "Height", value: "1630 mm" },
        { label: "Wheelbase", value: "2560 mm" },
        { label: "Boot Space", value: "500 L" }
      ],
      performance: [
        { label: "Mileage (Petrol)", value: "18 kmpl" },
        { label: "Mileage (Diesel)", value: "22 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Instrument Cluster", value: "10.25-inch Digital" },
        { label: "Connectivity", value: "iRA 2.0 Connected" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Virtual Sunrise", hex: "#FF6B35" },
      { name: "Opera Blue", hex: "#2E5090" },
      { name: "Pure Grey", hex: "#808080" },
      { name: "Pristine White", hex: "#F5F5F5" }
    ],
    variants: [
      { name: "Smart", price: "₹10.00 Lakh", features: ["6 Airbags", "10.25 Screen", "Auto Climate"] },
      { name: "Pure+", price: "₹12.50 Lakh", features: ["Panoramic Sunroof", "Wireless Charger"] },
      { name: "Creative+", price: "₹15.50 Lakh", features: ["ADAS Level 1", "360 Camera", "iRA 2.0"] },
      { name: "Accomplished+", price: "₹19.00 Lakh", features: ["ADAS Level 2", "JBL Sound", "Ventilated Seats"] }
    ],
    offers: generateOffers("₹25,000", "₹30,000"),
    pros: ["Unique Design", "ADAS Safety", "Large Boot", "Feature Rich"],
    cons: ["Unproven Product", "Rear Headroom", "Premium Pricing"],
    competitors: ["Hyundai Creta", "Kia Seltos", "Citroen Basalt"]
  },
  {
    id: 210,
    slug: "tata-curvv-ev",
    name: "Tata Curvv EV",
    brand: "Tata",
    bodyType: "Electric",
    tagline: "Electric Coupe SUV",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/169773/curvv-ev-exterior-right-front-three-quarter.jpeg",
    gallery: [
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/169773/curvv-ev-exterior-right-front-three-quarter.jpeg",
      "https://imgd.aeplcdn.com/664x374/n/cw/ec/169773/curvv-ev-exterior-rear-view.jpeg"
    ],
    price: "₹17.49 - 21.99 Lakh",
    priceNumeric: 1749000,
    originalPrice: "₹18.00 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Electric"],
    transmission: ["Automatic"],
    availability: "Booking Open",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Tata Curvv EV is India's first electric coupe SUV with 585 km range, fast charging, and futuristic design.",
    keyHighlights: [
      "585 km Range (ARAI)",
      "Coupe SUV Design",
      "ADAS Level 2",
      "12.3-inch Touchscreen",
      "Panoramic Sunroof",
      "V2L & V2V Charging"
    ],
    specifications: {
      engine: [
        { label: "Motor Type", value: "Permanent Magnet Synchronous" },
        { label: "Max Power", value: "167 bhp" },
        { label: "Max Torque", value: "215 Nm" },
        { label: "Battery", value: "55 kWh Lithium-ion" }
      ],
      dimensions: [
        { label: "Length", value: "4308 mm" },
        { label: "Width", value: "1810 mm" },
        { label: "Height", value: "1630 mm" },
        { label: "Wheelbase", value: "2560 mm" },
        { label: "Boot Space", value: "500 L" }
      ],
      performance: [
        { label: "Range (ARAI)", value: "585 km" },
        { label: "Top Speed", value: "160 kmph" },
        { label: "0-100 kmph", value: "8.6 sec" },
        { label: "Fast Charging", value: "10-80% in 40 min" }
      ],
      features: [
        { label: "Infotainment", value: "12.3-inch Touchscreen" },
        { label: "Connectivity", value: "ZConnect 2.0" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags" },
        { label: "ADAS", value: "Level 2" }
      ]
    },
    colors: [
      { name: "Pristine White", hex: "#F5F5F5" },
      { name: "Virtual Sunrise", hex: "#FF6B35" },
      { name: "Opera Blue", hex: "#2E5090" },
      { name: "Empowered Oxide", hex: "#4A4A4A" }
    ],
    variants: [
      { name: "Creative", price: "₹17.49 Lakh", features: ["45 kWh Battery", "473 km Range"] },
      { name: "Accomplished", price: "₹19.25 Lakh", features: ["55 kWh Battery", "585 km Range", "Sunroof"] },
      { name: "Empowered+", price: "₹21.99 Lakh", features: ["ADAS Level 2", "JBL Sound", "360 Camera"] }
    ],
    offers: generateOffers("₹30,000", "₹40,000"),
    pros: ["Long Range", "Unique Design", "ADAS Safety", "Feature Rich"],
    cons: ["Expensive", "Unproven Product", "Rear Headroom"],
    competitors: ["MG ZS EV", "Hyundai Kona Electric", "Mahindra XUV400"]
  }
];

export default tataCars;
