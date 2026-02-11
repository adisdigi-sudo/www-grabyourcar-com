import { Car, generateOffers } from "./types";

const volkswagenCars: Car[] = [
  {
    id: 901,
    slug: "volkswagen-taigun",
    name: "Volkswagen Taigun",
    brand: "Volkswagen",
    bodyType: "Compact SUV",
    tagline: "India's Safest SUVW",
    image: "https://assets.volkswagen.com/is/image/volkswagenag/taigun-chrome-all-models-mofa-image?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
    gallery: [
      "https://assets.volkswagen.com/is/image/volkswagenag/taigun-chrome-all-models-mofa-image?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
      "https://assets.volkswagen.com/is/image/volkswagenag/taigun-sport-mofa-1?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
      "https://assets.volkswagen.com/is/image/volkswagenag/GNCAP-logo?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA=="
    ],
    price: "₹10.58 - 19.18 Lakh",
    priceNumeric: 1058300,
    originalPrice: "₹11.42 Lakh",
    discount: "₹84,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "No drive is just another drive in a Volkswagen Taigun. India's safest SUVW with 5-star GNCAP rating for both adult and child occupants. Available in Chrome and Sport lines with 1.0L TSI and 1.5L TSI engines, 7-speed DSG, ventilated seats, 10.25-inch touchscreen, wireless connectivity. Set India Book of Records: 4,423.82 km in 24 hrs and 29.8 km/l fuel efficiency.",
    keyHighlights: [
      "5-Star GNCAP (Adult & Child)",
      "1.0L TSI / 1.5L TSI Engines",
      "7-Speed DSG",
      "10.25-inch Touchscreen",
      "Ventilated Front Seats",
      "188mm Ground Clearance",
      "India Record: 4423.82 km in 24 hrs"
    ],
    specifications: {
      engine: [
        { label: "Engine (1.0L)", value: "1.0L TSI, 114 bhp, 178 Nm" },
        { label: "Engine (1.5L)", value: "1.5L TSI EVO, 148 bhp, 250 Nm" },
        { label: "Transmission", value: "6-Speed MT / 7-Speed DSG" }
      ],
      dimensions: [
        { label: "Length", value: "4221 mm" },
        { label: "Width", value: "1760 mm" },
        { label: "Height", value: "1612 mm" },
        { label: "Wheelbase", value: "2651 mm" },
        { label: "Boot Space", value: "385 L" },
        { label: "Ground Clearance", value: "188 mm" },
        { label: "Fuel Tank", value: "50 L" }
      ],
      performance: [
        { label: "Mileage (1.0 TSI)", value: "18.64 kmpl" },
        { label: "Mileage (1.5 TSI)", value: "17.88 kmpl" },
        { label: "Record (24hr)", value: "4,423.82 km / 29.8 km/l" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "8-inch Digital Cockpit" },
        { label: "Connectivity", value: "Wireless Android Auto & Apple CarPlay" },
        { label: "Comfort", value: "Ventilated Front Seats, Wireless Charger" }
      ],
      safety: [
        { label: "NCAP Rating", value: "5 Star GNCAP (Adult & Child)" },
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" },
        { label: "ABS", value: "With EBD" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Curcuma Yellow", hex: "#FFD700" },
      { name: "Wild Cherry Red", hex: "#B22222" },
      { name: "Carbon Steel Grey", hex: "#4A4A4A" },
      { name: "Reflex Silver", hex: "#A8A9AD" },
      { name: "Deep Black Pearl", hex: "#0D0D0D" }
    ],
    variants: [
      { name: "Comfortline 1.0 TSI MT (Chrome)", price: "₹10.58 Lakh", features: ["6 Airbags", "LED Lamps", "8-inch Screen"] },
      { name: "Highline 1.0 TSI MT (Chrome)", price: "₹12.50 Lakh", features: ["10.25-inch Screen", "Digital Cockpit", "Rear Camera"] },
      { name: "Topline 1.0 TSI AT (Chrome)", price: "₹14.50 Lakh", features: ["DSG", "Ventilated Seats", "Wireless Charger"] },
      { name: "GT Line 1.0 TSI MT (Sport)", price: "₹14.33 Lakh", features: ["Sport Styling", "GT Accents", "All Features"] },
      { name: "GT Plus 1.5 TSI DSG (Chrome)", price: "₹18.00 Lakh", features: ["1.5L TSI", "DSG", "Premium Interior"] },
      { name: "GT Plus 1.5 TSI DSG (Sport)", price: "₹19.18 Lakh", features: ["1.5L TSI", "Sport GT Styling", "All Features"] }
    ],
    offers: generateOffers("₹45,000", "₹55,000"),
    pros: ["5-Star Safety (Adult & Child)", "German Engineering", "TSI Performance", "Build Quality"],
    cons: ["No Diesel", "Maintenance Costs", "Average Rear Space"],
    competitors: ["Hyundai Creta", "Kia Seltos", "Skoda Kushaq", "Honda Elevate"]
  },
  {
    id: 902,
    slug: "volkswagen-virtus",
    name: "Volkswagen Virtus",
    brand: "Volkswagen",
    bodyType: "Sedan",
    tagline: "You're in a Virtus",
    image: "https://assets.volkswagen.com/is/image/volkswagenag/virtus-chrome-mofa-1?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
    gallery: [
      "https://assets.volkswagen.com/is/image/volkswagenag/virtus-chrome-mofa-1?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
      "https://assets.volkswagen.com/is/image/volkswagenag/virtus-sport-mofa-1?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
      "https://assets.volkswagen.com/is/image/volkswagenag/virtus-endurance-1920x1080-2?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA=="
    ],
    price: "₹10.50 - 19.41 Lakh",
    priceNumeric: 1049900,
    originalPrice: "₹11.00 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Volkswagen Virtus takes every drive to new heights. 5-star GNCAP rating for both adult and child occupants with 40 safety features. 521L boot (expandable to 1050L), 179mm ground clearance. Set India Book of Records at NATRAX: 4,654.48 km in 24 hours. Available in Chrome and Sport lines with 1.0L TSI and 1.5L TSI engines.",
    keyHighlights: [
      "5-Star GNCAP (Adult & Child)",
      "40 Safety Features",
      "521L Boot (1050L Expandable)",
      "1.0L TSI / 1.5L TSI Engines",
      "7-Speed DSG",
      "India Record: 4654.48 km in 24 hrs"
    ],
    specifications: {
      engine: [
        { label: "Engine (1.0L)", value: "1.0L TSI, 114 bhp, 178 Nm" },
        { label: "Engine (1.5L)", value: "1.5L TSI EVO, 148 bhp, 250 Nm" },
        { label: "Transmission", value: "6-Speed MT / 7-Speed DSG" }
      ],
      dimensions: [
        { label: "Length", value: "4561 mm" },
        { label: "Width", value: "1752 mm" },
        { label: "Height", value: "1507 mm" },
        { label: "Wheelbase", value: "2651 mm" },
        { label: "Boot Space", value: "521 L (1050 L expandable)" },
        { label: "Ground Clearance", value: "179 mm" }
      ],
      performance: [
        { label: "Mileage (1.0 TSI)", value: "19.44 kmpl" },
        { label: "Mileage (1.5 TSI)", value: "18.67 kmpl" },
        { label: "Record (24hr)", value: "4,654.48 km" }
      ],
      features: [
        { label: "Infotainment", value: "10.25-inch Touchscreen" },
        { label: "Instrument Cluster", value: "Digital Cockpit Pro" },
        { label: "Connectivity", value: "Wireless Android Auto & Apple CarPlay" }
      ],
      safety: [
        { label: "NCAP Rating", value: "5 Star GNCAP (Adult & Child)" },
        { label: "Safety Features", value: "40 Standard" },
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Rising Blue", hex: "#2E5090" },
      { name: "Wild Cherry Red", hex: "#B22222" },
      { name: "Carbon Steel Grey", hex: "#4A4A4A" },
      { name: "Reflex Silver", hex: "#A8A9AD" },
      { name: "Deep Black Pearl", hex: "#0D0D0D" }
    ],
    variants: [
      { name: "Comfortline 1.0 TSI MT (Chrome)", price: "₹10.50 Lakh", features: ["6 Airbags", "LED Lamps", "Digital Cockpit"] },
      { name: "Highline 1.0 TSI MT (Chrome)", price: "₹12.50 Lakh", features: ["10.25-inch Screen", "Sunroof", "Leatherette Seats"] },
      { name: "Topline 1.0 TSI AT (Chrome)", price: "₹14.50 Lakh", features: ["DSG", "Ventilated Seats", "Connected Car"] },
      { name: "GT Line 1.0 TSI MT (Sport)", price: "₹14.10 Lakh", features: ["Sport Styling", "GT Accents"] },
      { name: "GT Plus 1.5 TSI DSG (Chrome)", price: "₹18.00 Lakh", features: ["1.5L TSI", "DSG", "Premium Interior"] },
      { name: "GT Plus 1.5 TSI DSG (Sport)", price: "₹19.41 Lakh", features: ["GT Sport Styling", "All Features", "Sport Mode"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["5-Star Safety (Adult & Child)", "Huge Boot (1050L)", "TSI Performance", "German Build"],
    cons: ["No Diesel", "Average Rear Headroom", "Maintenance Costs"],
    competitors: ["Hyundai Verna", "Honda City", "Skoda Slavia", "Maruti Ciaz"]
  },
  {
    id: 903,
    slug: "volkswagen-tiguan-r-line",
    name: "Volkswagen Tiguan R-Line",
    brand: "Volkswagen",
    bodyType: "Mid-Size SUV",
    tagline: "Beyond BetteR",
    image: "https://assets.volkswagen.com/is/image/volkswagenag/tiguan-r-line-mofa?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
    gallery: [
      "https://assets.volkswagen.com/is/image/volkswagenag/new-gallery-image-2-2?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA==",
      "https://assets.volkswagen.com/is/image/volkswagenag/tiguan-r-line-interiors-image?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA==",
      "https://assets.volkswagen.com/is/image/volkswagenag/tiguan-r-line-dashboard?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA==",
      "https://assets.volkswagen.com/is/image/volkswagenag/gallery-5-3?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA==",
      "https://assets.volkswagen.com/is/image/volkswagenag/tiguan-r-line-homepage-image?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA=="
    ],
    price: "₹45.73 Lakh",
    priceNumeric: 4573000,
    originalPrice: "₹46.50 Lakh",
    discount: "₹77,000",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The all-new Tiguan R-Line. 2.0L TSI EVO (204 PS, 320 Nm), 4MOTION AWD, 7-speed DSG. 21 Level 2 ADAS features, 9 airbags, 5-star Euro NCAP. 38.1 cm (15-inch) infotainment, Head-Up Display, Digital Cockpit Pro, massage seats, 3-zone Climatronic, panoramic sunroof, DCC Pro with driving mode selection, Park Assist Plus, 30-colour ambient lighting. R 19\" Coventry alloy wheels.",
    keyHighlights: [
      "2.0L TSI EVO 204 PS / 320 Nm",
      "4MOTION AWD",
      "21 Level 2 ADAS",
      "9 Airbags Standard",
      "15-inch Infotainment + HUD",
      "Massage Seats",
      "DCC Pro + Driving Modes",
      "Panoramic Sunroof",
      "5-Star Euro NCAP"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L TSI EVO" },
        { label: "Max Power", value: "204 PS (150 kW)" },
        { label: "Max Torque", value: "320 Nm" },
        { label: "Transmission", value: "7-Speed DSG" },
        { label: "Drivetrain", value: "4MOTION AWD" }
      ],
      dimensions: [
        { label: "Wheelbase", value: "2681 mm" },
        { label: "Alloy Wheels", value: "19-inch Coventry" }
      ],
      performance: [
        { label: "Power", value: "204 PS" },
        { label: "Torque", value: "320 Nm" },
        { label: "Suspension", value: "DCC Pro Adaptive" }
      ],
      features: [
        { label: "Infotainment", value: "38.1 cm (15-inch) Touchscreen" },
        { label: "Instrument Cluster", value: "26.04 cm Digital Cockpit Pro" },
        { label: "Voice Control", value: "IDA Voice Assistant" },
        { label: "Connectivity", value: "Wireless App-Connect" },
        { label: "Head-Up Display", value: "Standard" },
        { label: "Ambient Lighting", value: "30 Colours" },
        { label: "Comfort", value: "Massage Seats, 3-Zone Climatronic" }
      ],
      safety: [
        { label: "NCAP Rating", value: "5 Star Euro NCAP" },
        { label: "Airbags", value: "9 Airbags" },
        { label: "ADAS", value: "21 Level 2 Features" },
        { label: "Lane Assist", value: "Standard" },
        { label: "Front Assist", value: "Standard" },
        { label: "Hill Control", value: "Start Assist + Descent Control" },
        { label: "Park Assist", value: "Park Assist Plus" }
      ]
    },
    colors: [
      { name: "Persimmon Red Metallic", hex: "#C0392B" },
      { name: "Cipressino Green Metallic", hex: "#2E7D32" },
      { name: "Nightshade Blue Metallic", hex: "#1A237E" },
      { name: "Grenadilla Black Metallic", hex: "#0D0D0D" },
      { name: "Oyster Silver Metallic", hex: "#A8A9AD" },
      { name: "Oryx White Mother of Pearl", hex: "#FFFAF0" }
    ],
    variants: [
      { name: "R-Line 2.0 TSI 4MOTION DSG", price: "₹45.73 Lakh", features: ["4MOTION AWD", "21 ADAS", "Massage Seats", "HUD", "All Features"] }
    ],
    offers: generateOffers("₹70,000", "₹50,000"),
    pros: ["4MOTION AWD", "21 ADAS Features", "Massage Seats", "15-inch Screen", "German Build"],
    cons: ["Expensive", "Single Variant", "Average Mileage"],
    competitors: ["Jeep Compass", "Skoda Kodiaq", "Hyundai Tucson"]
  },
  {
    id: 905,
    slug: "volkswagen-golf-gti",
    name: "Volkswagen Golf GTI",
    brand: "Volkswagen",
    bodyType: "Hatchback",
    tagline: "Enough Said",
    image: "https://assets.volkswagen.com/is/image/volkswagenag/golf-gti-mofa-image?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
    gallery: [
      "https://assets.volkswagen.com/is/image/volkswagenag/golf-gti-mofa-image?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
      "https://assets.volkswagen.com/is/image/volkswagenag/golf-gti-performance-3?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA==",
      "https://assets.volkswagen.com/is/image/volkswagenag/golf-gti-logo?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA=="
    ],
    price: "₹50.91 Lakh",
    priceNumeric: 5090900,
    originalPrice: "₹51.50 Lakh",
    discount: "Sold Out",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "Sold Out",
    isHot: true,
    isLimited: true,
    isNew: true,
    isUpcoming: false,
    overview: "The VW Golf GTI. 2.0L TSI (265 PS, 370 Nm), 0-100 in 5.9s, 7-speed DSG. Set NATRAX record at 254.6 km/h – highest FWD speed in India. ICOTY Premium Car of the Year 2026 & AutoX Best of 2025 winner. 12.9-inch touchscreen, Digital Cockpit Pro, 7 airbags, adaptive cruise, lane assist, panoramic sunroof, Scalepaper Plaid seats, 30-colour ambient lighting, 380L boot (1237L expandable). Currently sold out.",
    keyHighlights: [
      "265 PS / 370 Nm",
      "0-100 in 5.9 Seconds",
      "ICOTY Premium Car 2026",
      "254.6 km/h NATRAX Record",
      "12.9-inch Touchscreen",
      "7 Airbags",
      "Scalepaper Plaid Seats",
      "Panoramic Sunroof"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L TSI" },
        { label: "Displacement", value: "1984 cc" },
        { label: "Max Power", value: "265 PS (195 kW) @ 5250-6500 rpm" },
        { label: "Max Torque", value: "370 Nm @ 1600-4500 rpm" },
        { label: "Transmission", value: "7-Speed DSG" }
      ],
      dimensions: [
        { label: "Length", value: "4289 mm" },
        { label: "Width", value: "1789 mm" },
        { label: "Height", value: "1471 mm" },
        { label: "Boot Space", value: "380 L (1237 L expandable)" },
        { label: "Ground Clearance", value: "136 mm" },
        { label: "Alloy Wheels", value: "18-inch Richmond Diamond-Turned" }
      ],
      performance: [
        { label: "0-100 km/h", value: "5.9 seconds" },
        { label: "Top Speed (Record)", value: "254.6 km/h (NATRAX)" },
        { label: "Top Speed (Rated)", value: "267 km/h" }
      ],
      features: [
        { label: "Infotainment", value: "32.8 cm (12.9-inch) Touchscreen" },
        { label: "Instrument Cluster", value: "26.04 cm Digital Cockpit Pro" },
        { label: "Sound System", value: "7-Speaker Immersive" },
        { label: "Voice Control", value: "IDA Voice Control & Enhancer" },
        { label: "Connectivity", value: "Wired & Wireless App-Connect" },
        { label: "Ambient Lighting", value: "30 Colours" },
        { label: "Seats", value: "Scalepaper Plaid with Red Accents" },
        { label: "Sunroof", value: "Panoramic Sunroof" }
      ],
      safety: [
        { label: "Airbags", value: "7 Airbags" },
        { label: "Adaptive Cruise", value: "Standard" },
        { label: "Lane Assist", value: "Standard" },
        { label: "Front Assist", value: "Emergency Braking with Pedestrian/Cyclist" },
        { label: "Differential", value: "XDS Electronic Front Differential Lock" },
        { label: "Rear Camera", value: "With Park Distance Control" }
      ]
    },
    colors: [
      { name: "Kings Red Metallic", hex: "#B22222" },
      { name: "Deep Black Pearl", hex: "#0D0D0D" },
      { name: "Moonstone Grey", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "GTI 2.0 TSI DSG", price: "₹50.91 Lakh", features: ["265 PS", "7-Speed DSG", "All Features", "ICOTY 2026 Winner"] }
    ],
    offers: generateOffers("Sold Out", "Sold Out"),
    pros: ["265 PS Performance", "5.9s 0-100", "ICOTY Winner", "German Hot Hatch Legend", "Build Quality"],
    cons: ["Sold Out", "CBU Import Price", "136mm Ground Clearance", "No AWD"],
    competitors: ["MINI Cooper S", "Skoda Octavia RS", "BMW 220i"]
  },
  {
    id: 906,
    slug: "volkswagen-tayron-r-line",
    name: "Volkswagen Tayron R-Line",
    brand: "Volkswagen",
    bodyType: "Mid-Size SUV",
    tagline: "Room for Big Plans",
    image: "https://assets.volkswagen.com/is/image/volkswagenag/tayron-r-line-mofa-new?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
    gallery: [
      "https://assets.volkswagen.com/is/image/volkswagenag/tayron-r-line-mofa-new?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
      "https://assets.volkswagen.com/is/image/volkswagenag/tyron-r-line-intro-section?Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA=="
    ],
    price: "Announcing Soon",
    priceNumeric: 5500000,
    originalPrice: "₹55.00 Lakh (Est.)",
    discount: "Pre-Booking Benefits",
    fuelTypes: ["Petrol"],
    transmission: ["Automatic"],
    availability: "Pre-Booking Open",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: true,
    overview: "The Volkswagen Tayron R-Line is designed for people who move between roles and routines. 2.0L TSI EVO (204 PS, 320 Nm), 4MOTION AWD, DSG. Up to 7 seats, 850L boot space, 15-inch infotainment, 19-inch Coventry diamond-turned alloy wheels, IQ.LIGHT LED, Varenna leatherette seats, 30-colour ambient lighting, panoramic sunroof, Park Assist Plus, driver assistance systems, exit warning system.",
    keyHighlights: [
      "2.0L TSI EVO 204 PS / 320 Nm",
      "4MOTION AWD",
      "Up to 7 Seats",
      "850L Boot Space",
      "15-inch Infotainment",
      "IQ.LIGHT LED",
      "Park Assist Plus",
      "Panoramic Sunroof"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L TSI EVO" },
        { label: "Max Power", value: "204 PS" },
        { label: "Max Torque", value: "320 Nm" },
        { label: "Transmission", value: "DSG" },
        { label: "Drivetrain", value: "4MOTION AWD" }
      ],
      dimensions: [
        { label: "Seating", value: "Up to 7 Seats" },
        { label: "Boot Space", value: "850 L" },
        { label: "Alloy Wheels", value: "19-inch Coventry Diamond-Turned" }
      ],
      performance: [
        { label: "Power", value: "204 PS" },
        { label: "Torque", value: "320 Nm" }
      ],
      features: [
        { label: "Infotainment", value: "15-inch Touchscreen" },
        { label: "Lighting", value: "Signature IQ.LIGHT LED" },
        { label: "Seats", value: "Varenna Leatherette" },
        { label: "Ambient Lighting", value: "30 Colours" },
        { label: "Sunroof", value: "Panoramic Sunroof" },
        { label: "Driving Profiles", value: "Profile Selector" }
      ],
      safety: [
        { label: "Driver Assistance", value: "Advanced Systems" },
        { label: "Park Assist", value: "Park Assist Plus" },
        { label: "Exit Warning", value: "Standard" }
      ]
    },
    colors: [
      { name: "Oryx White", hex: "#FFFAF0" },
      { name: "Grenadilla Black", hex: "#0D0D0D" },
      { name: "Oyster Silver", hex: "#A8A9AD" }
    ],
    variants: [
      { name: "R-Line 2.0 TSI 4MOTION", price: "Announcing Soon", features: ["7 Seats", "4MOTION", "850L Boot", "All Features"] }
    ],
    offers: generateOffers("Pre-Booking", "Pre-Booking"),
    pros: ["7-Seater", "4MOTION AWD", "850L Boot", "Premium Features", "German Build"],
    cons: ["Price TBA", "No Diesel", "Heavy"],
    competitors: ["Skoda Kodiaq", "Hyundai Tucson", "Jeep Meridian"]
  },
  {
    id: 904,
    slug: "volkswagen-polo",
    name: "Volkswagen Polo",
    brand: "Volkswagen",
    bodyType: "Hatchback",
    tagline: "The Legend",
    image: "https://assets.volkswagen.com/is/image/volkswagenag/polo-exterior-right-front-three-quarter-3?Zml0PWNyb3AsMSZmbXQ9d2VicC1hbHBoYSZxbHQ9Nzkmd2lkPU5hTiZiZmM9b2ZmJjNkNWI=",
    gallery: [],
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
