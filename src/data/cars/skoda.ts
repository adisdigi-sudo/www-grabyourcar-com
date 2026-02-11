import { Car, generateOffers } from "./types";

const skodaCars: Car[] = [
  {
    id: 801,
    slug: "skoda-kushaq",
    name: "Škoda Kushaq",
    brand: "Skoda",
    bodyType: "Compact SUV",
    tagline: "Easy to Love",
    image: "https://cdn.skoda-auto.com/images/kushaq-hero-front.webp",
    gallery: [],
    price: "₹10.89 - 18.79 Lakh",
    priceNumeric: 1089000,
    originalPrice: "₹11.50 Lakh",
    discount: "₹61,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The new Škoda Kushaq – Easy to Love. Refreshed with bold new front grille with sporty red stripes, illuminated light band, connected LED taillights with illuminated Škoda lettering. All-new 8-speed automatic torque converter with 1.0 TSI across variants. 1.5 TSI with 7-speed DSG and Active Cylinder Technology. 25.6 cm infotainment screen with wireless Android Auto & Apple CarPlay, 26.03 cm digital cockpit with turn-by-turn navigation. Rear seat massage, panoramic sunroof (top variants), electric sunroof standard across range. 5-star Global NCAP safety, 6 airbags standard, up to 40 safety features. Alloy wheels standard on all variants.",
    keyHighlights: [
      "5-Star Global NCAP Safety",
      "New 8-Speed Automatic TC",
      "1.0L TSI / 1.5L TSI Engines",
      "25.6 cm Infotainment Screen",
      "Rear Seat Massage",
      "Panoramic Sunroof",
      "6 Airbags Standard",
      "Alloy Wheels Standard All Variants"
    ],
    specifications: {
      engine: [
        { label: "Engine (1.0L)", value: "1.0L TSI, 114 bhp, 178 Nm" },
        { label: "Engine (1.5L)", value: "1.5L TSI EVO, 148 bhp, 250 Nm" },
        { label: "Transmission (1.0L)", value: "6-Speed MT / 8-Speed AT (Torque Converter)" },
        { label: "Transmission (1.5L)", value: "7-Speed DSG with ACT" }
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
        { label: "Mileage (1.5 TSI)", value: "17.65 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "25.6 cm Touchscreen" },
        { label: "Digital Cockpit", value: "26.03 cm with Turn-by-Turn Nav" },
        { label: "Connectivity", value: "Wireless Android Auto & Apple CarPlay" },
        { label: "Comfort", value: "Rear Seat Massage, Ventilated Seats" },
        { label: "Sunroof", value: "Electric (Standard) / Panoramic (Top)" }
      ],
      safety: [
        { label: "NCAP Rating", value: "5 Star Global NCAP" },
        { label: "Airbags", value: "6 Airbags (Standard)" },
        { label: "Safety Features", value: "Up to 40 Features" },
        { label: "ESP", value: "Standard" },
        { label: "Disc Brakes", value: "All Wheels (1.5 TSI)" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Carbon Steel", hex: "#4A4A4A" },
      { name: "Tornado Red", hex: "#B22222" },
      { name: "Honey Orange", hex: "#FF6B35" },
      { name: "Reflex Silver", hex: "#A8A9AD" },
      { name: "Deep Black", hex: "#0D0D0D" }
    ],
    variants: [
      { name: "Active 1.0 TSI MT", price: "₹10.89 Lakh", features: ["6 Airbags", "LED DRLs", "Alloy Wheels", "Electric Sunroof"] },
      { name: "Ambition 1.0 TSI MT", price: "₹13.00 Lakh", features: ["25.6 cm Screen", "Digital Cockpit", "Wireless Charger"] },
      { name: "Ambition 1.0 TSI 8AT", price: "₹14.00 Lakh", features: ["8-Speed AT", "Auto Climate", "Rear Camera"] },
      { name: "Style 1.0 TSI 8AT", price: "₹15.50 Lakh", features: ["Panoramic Sunroof", "Connected Car", "Ventilated Seats"] },
      { name: "Style 1.5 TSI DSG", price: "₹17.00 Lakh", features: ["1.5L TSI", "7-Speed DSG", "Rear Seat Massage"] },
      { name: "Monte Carlo 1.5 TSI DSG", price: "₹18.79 Lakh", features: ["Monte Carlo Edition", "All Features", "Sport Styling"] }
    ],
    offers: generateOffers("₹40,000", "₹50,000"),
    pros: ["5-Star Safety", "New 8-Speed AT", "Rear Seat Massage", "Build Quality", "TSI Engines"],
    cons: ["No Diesel", "Maintenance Costs", "Average Boot Space"],
    competitors: ["Hyundai Creta", "Kia Seltos", "VW Taigun", "Honda Elevate"]
  },
  {
    id: 802,
    slug: "skoda-slavia",
    name: "Škoda Slavia",
    brand: "Skoda",
    bodyType: "Sedan",
    tagline: "Discover Your World in Style",
    image: "https://cdn.skoda-auto.com/images/slavia-hero-front.webp",
    gallery: [],
    price: "₹9.99 - 17.99 Lakh",
    priceNumeric: 999900,
    originalPrice: "₹10.50 Lakh",
    discount: "₹51,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: false,
    isUpcoming: false,
    overview: "The Škoda Slavia – discover your world in style. Widest sedan in its segment with sharp crystalline design and generous space. Available with 1.0L TSI (MT/AT) and 1.5L TSI DSG powertrains. Virtual Cockpit, chrome elements, ambient lighting. Packed with cutting-edge safety features including 5-star GNCAP rating. Advanced connectivity with wireless Android Auto & Apple CarPlay. 521L boot space.",
    keyHighlights: [
      "Widest Sedan in Segment",
      "5-Star GNCAP Safety",
      "1.0L TSI / 1.5L TSI DSG",
      "Virtual Cockpit",
      "Ambient Lighting",
      "521L Boot Space"
    ],
    specifications: {
      engine: [
        { label: "Engine (1.0L)", value: "1.0L TSI, 114 bhp, 178 Nm" },
        { label: "Engine (1.5L)", value: "1.5L TSI EVO, 148 bhp, 250 Nm" },
        { label: "Transmission", value: "6-Speed MT / 6-Speed AT / 7-Speed DSG" }
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
        { label: "Instrument Cluster", value: "Virtual Cockpit" },
        { label: "Connectivity", value: "Wireless Android Auto & Apple CarPlay" }
      ],
      safety: [
        { label: "NCAP Rating", value: "5 Star GNCAP" },
        { label: "Airbags", value: "6 Airbags" },
        { label: "ESP", value: "Standard" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Carbon Steel", hex: "#4A4A4A" },
      { name: "Tornado Red", hex: "#B22222" },
      { name: "Brilliant Silver", hex: "#A8A9AD" },
      { name: "Deep Black", hex: "#0D0D0D" }
    ],
    variants: [
      { name: "Active 1.0 TSI MT", price: "₹9.99 Lakh", features: ["6 Airbags", "LED Headlamps", "Digital Cockpit"] },
      { name: "Ambition 1.0 TSI MT", price: "₹13.28 Lakh", features: ["10-inch Screen", "Auto Climate", "Wireless Charger"] },
      { name: "Ambition 1.0 TSI AT", price: "₹14.34 Lakh", features: ["6-Speed AT", "Auto Climate"] },
      { name: "Ambition+ 1.0 TSI MT", price: "₹13.49 Lakh", features: ["Sunroof", "Connected Car"] },
      { name: "Ambition+ 1.0 TSI AT", price: "₹14.55 Lakh", features: ["6-Speed AT", "Sunroof"] },
      { name: "Style 1.0 TSI MT", price: "₹14.99 Lakh", features: ["Ventilated Seats", "Premium Interior"] },
      { name: "Style 1.0 TSI AT", price: "₹16.43 Lakh", features: ["6-Speed AT", "All Features"] },
      { name: "Style 1.5 TSI DSG", price: "₹17.93 Lakh", features: ["1.5L TSI", "7-Speed DSG", "Premium"] },
      { name: "Monte Carlo 1.0 TSI AT", price: "₹16.49 Lakh", features: ["Sport Styling", "Black Accents"] },
      { name: "Monte Carlo 1.5 TSI DSG", price: "₹17.99 Lakh", features: ["Monte Carlo Edition", "All Features", "Sport Mode"] }
    ],
    offers: generateOffers("₹45,000", "₹55,000"),
    pros: ["5-Star Safety", "Huge Boot (521L)", "TSI Performance", "Build Quality", "Widest in Segment"],
    cons: ["No Diesel", "Maintenance Costs", "Average Rear Headroom"],
    competitors: ["Hyundai Verna", "Honda City", "VW Virtus", "Maruti Ciaz"]
  },
  {
    id: 803,
    slug: "skoda-kodiaq",
    name: "Škoda Kodiaq",
    brand: "Skoda",
    bodyType: "Mid-Size SUV",
    tagline: "Crafted to Redefine",
    image: "https://cdn.skoda-auto.com/images/kodiaq-hero-front.webp",
    gallery: [],
    price: "₹39.99 - 48.99 Lakh",
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
    overview: "The all-new Škoda Kodiaq – Crafted to Redefine. Available in Sportline (7-seater) and Lounge (5-seater). 2.0L TSI engine with 7-speed DSG. Crystalline headlights with horizontal light strip, C-shaped LED rear lights with animated indicators. 32.77 cm touchscreen, 26.03 cm Virtual Cockpit, Canton 13-speaker 725W sound system. Ergo seats with heating, cooling, and pneumatic massage. Panoramic sunroof, Smart Dials, Intelligent Park Assist, Hill Descent Control. Up to 9 airbags, ESC, ABS, Multi-Collision Brake, Driver Attention Alert. 4-year warranty, 4 labour-free services, 4-year roadside assistance.",
    keyHighlights: [
      "2.0L TSI with 7-Speed DSG",
      "32.77 cm Touchscreen",
      "Canton 725W 13-Speaker Sound",
      "Ergo Massage/Heated/Cooled Seats",
      "9 Airbags",
      "Intelligent Park Assist",
      "Panoramic Sunroof",
      "7-Seater (Sportline) / 5-Seater (Lounge)"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "2.0L TSI" },
        { label: "Max Power", value: "188 bhp" },
        { label: "Max Torque", value: "320 Nm" },
        { label: "Displacement", value: "1984 cc" },
        { label: "Transmission", value: "7-Speed DSG" }
      ],
      dimensions: [
        { label: "Length", value: "4758 mm" },
        { label: "Width", value: "1864 mm" },
        { label: "Height", value: "1659 mm" },
        { label: "Wheelbase", value: "2791 mm" },
        { label: "Seating", value: "7-Seater (Sportline) / 5-Seater (Lounge)" }
      ],
      performance: [
        { label: "Mileage", value: "12.96 kmpl" },
        { label: "Top Speed", value: "210 kmph" }
      ],
      features: [
        { label: "Infotainment", value: "32.77 cm Touchscreen" },
        { label: "Instrument Cluster", value: "26.03 cm Virtual Cockpit" },
        { label: "Sound System", value: "Canton 13-Speaker 725W" },
        { label: "Controls", value: "Smart Dials (Tactile + Touchscreen)" },
        { label: "Comfort", value: "Ergo Massage/Heated/Cooled Seats" },
        { label: "Sunroof", value: "Two-Piece Panoramic" }
      ],
      safety: [
        { label: "Airbags", value: "9 Airbags" },
        { label: "ESP / ESC", value: "Standard" },
        { label: "Park Assist", value: "Intelligent Park Assist (Autonomous)" },
        { label: "Hill Descent", value: "Hill Descent Control" },
        { label: "Driver Alert", value: "Advanced Driver Attention Alert" },
        { label: "Multi-Collision", value: "Multi-Collision Brake" }
      ]
    },
    colors: [
      { name: "Lava Blue", hex: "#2E5090" },
      { name: "Moon White", hex: "#F5F5F5" },
      { name: "Magic Black", hex: "#1A1A1A" },
      { name: "Steel Grey", hex: "#4A4A4A" },
      { name: "Graphite Grey", hex: "#5C5C5C" }
    ],
    variants: [
      { name: "Sportline 2.0 TSI DSG (7-Seater)", price: "₹39.99 Lakh", features: ["7-Seater", "Panoramic Sunroof", "Canton Sound", "Massage Seats"] },
      { name: "Lounge 2.0 TSI DSG (5-Seater)", price: "₹48.99 Lakh", features: ["5-Seater Luxury", "All Features", "Premium Interior", "Park Assist"] }
    ],
    offers: generateOffers("₹90,000", "₹70,000"),
    pros: ["Premium SUV", "Canton Sound System", "Massage Seats", "9 Airbags", "Smart Dials"],
    cons: ["Expensive", "No Diesel", "No AWD in India", "High Running Costs"],
    competitors: ["Toyota Fortuner", "Jeep Compass", "VW Tiguan R-Line"]
  },
  {
    id: 805,
    slug: "skoda-kylaq",
    name: "Škoda Kylaq",
    brand: "Skoda",
    bodyType: "Compact SUV",
    tagline: "Own Your Dream",
    image: "https://cdn.skoda-auto.com/images/kylaq-hero-front.webp",
    gallery: [],
    price: "₹7.59 - 12.99 Lakh",
    priceNumeric: 759000,
    originalPrice: "₹8.25 Lakh",
    discount: "₹50,000",
    fuelTypes: ["Petrol"],
    transmission: ["Manual", "Automatic"],
    availability: "In Stock",
    isHot: true,
    isLimited: false,
    isNew: true,
    isUpcoming: false,
    overview: "The Škoda Kylaq – Own Your Dream. Modern-solid design built to conquer Indian roads. Glossy black grille, slim LED headlights, aluminium-fresh spoiler. 446L boot expanding to 1,265L. Ventilated front seats, ambient lighting, adjustable headrest, cooled glovebox. 6 airbags standard, cruise control, TPMS, ESC. 1.0L TSI engine with 6-speed MT or 8-speed AT. Simply Clever features: Smartclip ticket holder, coat hooks, smartphone pocket. 4-year warranty, 4 labour-free services, 4-year roadside assistance.",
    keyHighlights: [
      "1.0L TSI Engine",
      "6 Airbags Standard",
      "446L Boot (1265L Expandable)",
      "Ventilated Front Seats",
      "Ambient Lighting",
      "ESC & Cruise Control Standard",
      "8-Speed Automatic",
      "4-Year Warranty"
    ],
    specifications: {
      engine: [
        { label: "Engine Type", value: "1.0L TSI" },
        { label: "Max Power", value: "114 bhp" },
        { label: "Max Torque", value: "178 Nm" },
        { label: "Displacement", value: "999 cc" },
        { label: "Transmission", value: "6-Speed MT / 8-Speed AT" }
      ],
      dimensions: [
        { label: "Length", value: "3995 mm" },
        { label: "Width", value: "1783 mm" },
        { label: "Height", value: "1619 mm" },
        { label: "Wheelbase", value: "2566 mm" },
        { label: "Boot Space", value: "446 L (1265 L expandable)" }
      ],
      performance: [
        { label: "Mileage", value: "19.67 kmpl" }
      ],
      features: [
        { label: "Infotainment", value: "10.1-inch Touchscreen" },
        { label: "Connectivity", value: "Wireless Android Auto & Apple CarPlay" },
        { label: "Comfort", value: "Ventilated Front Seats, Cooled Glovebox" },
        { label: "Ambient Lighting", value: "Standard (Top Variants)" }
      ],
      safety: [
        { label: "Airbags", value: "6 Airbags (Standard)" },
        { label: "ESP / ESC", value: "Standard" },
        { label: "TPMS", value: "Standard" },
        { label: "Cruise Control", value: "Standard" },
        { label: "Hill Hold", value: "Available" }
      ]
    },
    colors: [
      { name: "Candy White", hex: "#F5F5F5" },
      { name: "Brilliant Silver", hex: "#A8A9AD" },
      { name: "Tornado Red", hex: "#B22222" },
      { name: "Carbon Steel", hex: "#4A4A4A" },
      { name: "Lava Blue", hex: "#2E5090" },
      { name: "Deep Black", hex: "#0D0D0D" }
    ],
    variants: [
      { name: "Classic MT", price: "₹7.59 Lakh", features: ["6 Airbags", "LED DRLs", "ESC"] },
      { name: "Signature MT", price: "₹8.25 Lakh", features: ["Rear Camera", "Auto Climate"] },
      { name: "Signature AT", price: "₹9.25 Lakh", features: ["8-Speed AT", "Rear Camera"] },
      { name: "Signature+ MT", price: "₹9.43 Lakh", features: ["Alloy Wheels", "Wireless Charger"] },
      { name: "Signature+ AT", price: "₹10.43 Lakh", features: ["8-Speed AT", "Alloys"] },
      { name: "Prestige MT", price: "₹10.77 Lakh", features: ["Ventilated Seats", "Sunroof"] },
      { name: "Prestige AT", price: "₹11.77 Lakh", features: ["8-Speed AT", "Ventilated Seats"] },
      { name: "Prestige+ MT", price: "₹11.75 Lakh", features: ["Ambient Lighting", "Connected Car"] },
      { name: "Prestige+ AT", price: "₹12.75 Lakh", features: ["8-Speed AT", "All Features"] },
      { name: "Monte Carlo MT", price: "₹11.99 Lakh", features: ["Sport Styling", "All Features"] },
      { name: "Monte Carlo AT", price: "₹12.99 Lakh", features: ["8-Speed AT", "Monte Carlo Edition", "Premium Interior"] }
    ],
    offers: generateOffers("₹25,000", "₹35,000"),
    pros: ["Value for Money", "TSI Engine", "446L Boot", "6 Airbags Standard", "Build Quality"],
    cons: ["No Diesel", "No Sunroof on Base", "Service Network"],
    competitors: ["Tata Nexon", "Hyundai Venue", "Kia Sonet", "Maruti Brezza"]
  }
];

export default skodaCars;
