export interface Review {
  id: number;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export interface Specification {
  label: string;
  value: string;
}

export interface Accessory {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  category: string;
  description: string;
  fullDescription: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  badge?: string;
  specifications: Specification[];
  customerReviews: Review[];
}

export const accessoriesData: Accessory[] = [
  // HSRP Frames
  {
    id: 1,
    name: "Premium IND HSRP Frame - Chrome",
    price: 599,
    originalPrice: 899,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800",
    ],
    category: "HSRP Frames",
    description: "High-quality chrome finish HSRP frame with anti-rust coating. Fits all standard Indian number plates.",
    fullDescription: "Upgrade your vehicle's look with our Premium IND HSRP Frame in stunning chrome finish. This high-quality frame is designed to perfectly fit all standard Indian High Security Registration Plates. Features an advanced anti-rust coating that ensures long-lasting durability even in harsh weather conditions. The precision-engineered design provides a snug fit while the chrome finish adds a touch of elegance to your vehicle.",
    rating: 4.5,
    reviews: 234,
    inStock: true,
    badge: "Bestseller",
    specifications: [
      { label: "Material", value: "Stainless Steel with Chrome Plating" },
      { label: "Finish", value: "Mirror Chrome" },
      { label: "Compatibility", value: "All Indian HSRP Plates" },
      { label: "Dimensions", value: "340mm x 200mm" },
      { label: "Weight", value: "180g" },
      { label: "Warranty", value: "1 Year" },
    ],
    customerReviews: [
      { id: 1, author: "Rahul M.", rating: 5, date: "2024-12-15", comment: "Excellent quality! Fits perfectly on my Creta. The chrome finish looks premium.", verified: true },
      { id: 2, author: "Priya S.", rating: 4, date: "2024-12-10", comment: "Good product, easy installation. Slightly heavy but looks great.", verified: true },
      { id: 3, author: "Amit K.", rating: 5, date: "2024-12-05", comment: "Best HSRP frame I've used. No rust even after 6 months.", verified: true },
    ]
  },
  {
    id: 2,
    name: "Carbon Fiber HSRP Frame",
    price: 899,
    originalPrice: 1299,
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400",
    images: [
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
    ],
    category: "HSRP Frames",
    description: "Lightweight carbon fiber texture HSRP frame. Premium look with durable construction.",
    fullDescription: "Make a bold statement with our Carbon Fiber HSRP Frame. This lightweight yet incredibly durable frame features an authentic carbon fiber texture that gives your vehicle a sporty, modern look. The frame is UV-resistant and won't fade over time. Perfect for enthusiasts who want to add a racing-inspired touch to their vehicles.",
    rating: 4.7,
    reviews: 156,
    inStock: true,
    badge: "Premium",
    specifications: [
      { label: "Material", value: "Carbon Fiber Composite" },
      { label: "Finish", value: "3K Carbon Weave Pattern" },
      { label: "Compatibility", value: "All Indian HSRP Plates" },
      { label: "Dimensions", value: "340mm x 200mm" },
      { label: "Weight", value: "95g" },
      { label: "Warranty", value: "2 Years" },
    ],
    customerReviews: [
      { id: 1, author: "Vikram J.", rating: 5, date: "2024-12-18", comment: "Love the carbon fiber look! Very lightweight and premium quality.", verified: true },
      { id: 2, author: "Sneha R.", rating: 5, date: "2024-12-12", comment: "Perfect match for my black SUV. Highly recommended!", verified: true },
    ]
  },
  {
    id: 3,
    name: "Matte Black HSRP Frame",
    price: 499,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400",
    images: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800",
    ],
    category: "HSRP Frames",
    description: "Sleek matte black finish HSRP frame. Perfect for dark colored vehicles.",
    fullDescription: "Achieve a stealthy, sophisticated look with our Matte Black HSRP Frame. This frame features a powder-coated matte finish that resists fingerprints and scratches. The understated elegance of matte black complements any vehicle color but looks particularly stunning on dark-colored cars.",
    rating: 4.3,
    reviews: 189,
    inStock: true,
    specifications: [
      { label: "Material", value: "Aluminum Alloy" },
      { label: "Finish", value: "Powder Coated Matte" },
      { label: "Compatibility", value: "All Indian HSRP Plates" },
      { label: "Dimensions", value: "340mm x 200mm" },
      { label: "Weight", value: "120g" },
      { label: "Warranty", value: "1 Year" },
    ],
    customerReviews: [
      { id: 1, author: "Karan P.", rating: 4, date: "2024-12-14", comment: "Good value for money. Matte finish looks classy.", verified: true },
      { id: 2, author: "Ritu A.", rating: 5, date: "2024-12-08", comment: "Simple yet elegant. Perfect for my black car.", verified: true },
    ]
  },
  {
    id: 4,
    name: "LED Illuminated HSRP Frame",
    price: 1499,
    originalPrice: 1999,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400",
    images: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    ],
    category: "HSRP Frames",
    description: "HSRP frame with integrated LED lighting. Automatic on/off with headlights.",
    fullDescription: "Stand out from the crowd with our innovative LED Illuminated HSRP Frame. Features integrated LED strips that automatically turn on with your headlights, providing enhanced visibility and a futuristic look. The LEDs are weather-sealed and consume minimal power. Legal for road use with white illumination only.",
    rating: 4.6,
    reviews: 98,
    inStock: true,
    badge: "New",
    specifications: [
      { label: "Material", value: "ABS Plastic with LED Array" },
      { label: "LED Color", value: "White (Legal)" },
      { label: "Power", value: "12V DC (Auto with headlights)" },
      { label: "Compatibility", value: "All Indian HSRP Plates" },
      { label: "Dimensions", value: "345mm x 205mm" },
      { label: "Warranty", value: "1 Year (LED + Frame)" },
    ],
    customerReviews: [
      { id: 1, author: "Arun T.", rating: 5, date: "2024-12-20", comment: "Looks amazing at night! Easy installation.", verified: true },
      { id: 2, author: "Deepak S.", rating: 4, date: "2024-12-16", comment: "Great product. LEDs are bright and visible.", verified: true },
    ]
  },
  // Car Covers
  {
    id: 5,
    name: "Waterproof Car Body Cover - Sedan",
    price: 1299,
    originalPrice: 1799,
    image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400",
    images: [
      "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800",
    ],
    category: "Car Covers",
    description: "100% waterproof car cover with UV protection. Fits most sedans. Includes storage bag.",
    fullDescription: "Protect your sedan from the elements with our premium Waterproof Car Body Cover. Made from triple-layer fabric that provides 100% waterproof protection while remaining breathable to prevent moisture buildup. UV-resistant coating protects your car's paint from sun damage. Elastic hem ensures a snug fit. Comes with a convenient storage bag.",
    rating: 4.4,
    reviews: 312,
    inStock: true,
    badge: "Popular",
    specifications: [
      { label: "Material", value: "Triple-Layer PEVA Fabric" },
      { label: "Waterproof Rating", value: "100% (Seam-Sealed)" },
      { label: "UV Protection", value: "UPF 50+" },
      { label: "Fits", value: "Sedans up to 4.8m" },
      { label: "Includes", value: "Storage Bag, Buckle Straps" },
      { label: "Warranty", value: "6 Months" },
    ],
    customerReviews: [
      { id: 1, author: "Manoj V.", rating: 5, date: "2024-12-19", comment: "Saved my car in the monsoons! Completely waterproof.", verified: true },
      { id: 2, author: "Anita G.", rating: 4, date: "2024-12-11", comment: "Good quality cover. Fits my Honda City perfectly.", verified: true },
    ]
  },
  {
    id: 6,
    name: "Premium SUV Car Cover",
    price: 1799,
    originalPrice: 2499,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800",
      "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800",
    ],
    category: "Car Covers",
    description: "Heavy-duty SUV cover with triple-layer protection. Fits all popular SUVs.",
    fullDescription: "Our Premium SUV Car Cover offers unmatched protection for larger vehicles. The heavy-duty construction withstands harsh weather conditions while the soft inner lining protects your paint from scratches. Features reinforced grommets for secure tie-down and mirror pockets for a perfect fit.",
    rating: 4.6,
    reviews: 245,
    inStock: true,
    specifications: [
      { label: "Material", value: "Heavy-Duty Oxford Fabric" },
      { label: "Layers", value: "Triple-Layer Construction" },
      { label: "Fits", value: "SUVs up to 5.2m" },
      { label: "Features", value: "Mirror Pockets, Tie-Down Grommets" },
      { label: "Includes", value: "Storage Bag" },
      { label: "Warranty", value: "1 Year" },
    ],
    customerReviews: [
      { id: 1, author: "Suresh K.", rating: 5, date: "2024-12-17", comment: "Perfect fit for my XUV700. Heavy duty quality!", verified: true },
    ]
  },
  // Floor Mats
  {
    id: 7,
    name: "3D Premium Floor Mats - Universal",
    price: 2499,
    originalPrice: 3499,
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
    images: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800",
    ],
    category: "Floor Mats",
    description: "Premium 3D floor mats with raised edges. Waterproof and easy to clean.",
    fullDescription: "Keep your car's interior pristine with our 3D Premium Floor Mats. These precision-molded mats feature raised edges that trap water, mud, and debris. Made from odorless, eco-friendly TPE material that's easy to clean - just hose them off! Anti-slip backing keeps mats firmly in place.",
    rating: 4.8,
    reviews: 456,
    inStock: true,
    badge: "Top Rated",
    specifications: [
      { label: "Material", value: "Eco-Friendly TPE" },
      { label: "Edge Height", value: "15mm Raised Edges" },
      { label: "Compatibility", value: "Universal Fit (Trimmable)" },
      { label: "Pieces", value: "5 Piece Set" },
      { label: "Features", value: "Waterproof, Anti-Slip, Odorless" },
      { label: "Warranty", value: "2 Years" },
    ],
    customerReviews: [
      { id: 1, author: "Rajesh N.", rating: 5, date: "2024-12-21", comment: "Best floor mats I've ever used. Easy to clean and looks great!", verified: true },
      { id: 2, author: "Meera L.", rating: 5, date: "2024-12-13", comment: "Perfect fit after trimming. Very happy with the purchase.", verified: true },
      { id: 3, author: "Sanjay P.", rating: 4, date: "2024-12-07", comment: "Good quality. Keeps all the dirt contained.", verified: true },
    ]
  },
  {
    id: 8,
    name: "Leather Floor Mats - Luxury",
    price: 4999,
    originalPrice: 6999,
    image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400",
    images: [
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800",
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
    ],
    category: "Floor Mats",
    description: "Genuine leather floor mats with custom stitching. Premium luxury feel.",
    fullDescription: "Elevate your car's interior with our Luxury Leather Floor Mats. Crafted from genuine leather with custom contrast stitching, these mats add a touch of sophistication to any vehicle. Features a waterproof XPE base layer that protects against spills. Available in multiple colors to match your interior.",
    rating: 4.7,
    reviews: 123,
    inStock: true,
    badge: "Luxury",
    specifications: [
      { label: "Material", value: "Genuine Leather + XPE Base" },
      { label: "Stitching", value: "Diamond Pattern" },
      { label: "Colors", value: "Black, Beige, Brown" },
      { label: "Pieces", value: "5 Piece Set" },
      { label: "Features", value: "Waterproof Base, Anti-Slip" },
      { label: "Warranty", value: "3 Years" },
    ],
    customerReviews: [
      { id: 1, author: "Aditya M.", rating: 5, date: "2024-12-22", comment: "Absolutely premium quality. Transformed my car's interior!", verified: true },
    ]
  },
  // Seat Covers
  {
    id: 9,
    name: "Premium Leather Seat Covers - Full Set",
    price: 5999,
    originalPrice: 7999,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400",
    images: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
      "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800",
    ],
    category: "Seat Covers",
    description: "Full set of premium leather seat covers. Custom fit available for all models.",
    fullDescription: "Transform your car's interior with our Premium Leather Seat Covers. Made from high-grade synthetic leather that looks and feels like genuine leather but is more durable and easier to maintain. Features foam padding for extra comfort and airbag-compatible side seams.",
    rating: 4.5,
    reviews: 289,
    inStock: true,
    specifications: [
      { label: "Material", value: "Premium PU Leather" },
      { label: "Padding", value: "5mm Foam" },
      { label: "Compatibility", value: "Universal / Custom Fit" },
      { label: "Pieces", value: "Full Set (Front + Rear)" },
      { label: "Features", value: "Airbag Compatible, Easy Install" },
      { label: "Warranty", value: "1 Year" },
    ],
    customerReviews: [
      { id: 1, author: "Nitin R.", rating: 5, date: "2024-12-18", comment: "Looks like original leather seats. Great value!", verified: true },
      { id: 2, author: "Pooja D.", rating: 4, date: "2024-12-09", comment: "Good quality. Installation took some time but worth it.", verified: true },
    ]
  },
  {
    id: 10,
    name: "Cooling Seat Covers with Fan",
    price: 3999,
    originalPrice: 4999,
    image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400",
    images: [
      "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800",
    ],
    category: "Seat Covers",
    description: "Seat covers with built-in cooling fans. USB powered. Perfect for summer.",
    fullDescription: "Beat the summer heat with our innovative Cooling Seat Covers. Features built-in fans that provide continuous airflow to keep you cool during long drives. USB powered for universal compatibility. Breathable mesh fabric ensures maximum comfort.",
    rating: 4.2,
    reviews: 167,
    inStock: false,
    specifications: [
      { label: "Material", value: "Breathable Mesh + PU Leather" },
      { label: "Fans", value: "2 Built-in Fans per Seat" },
      { label: "Power", value: "USB (5V)" },
      { label: "Compatibility", value: "Universal Fit" },
      { label: "Features", value: "3 Speed Settings" },
      { label: "Warranty", value: "6 Months" },
    ],
    customerReviews: [
      { id: 1, author: "Vivek T.", rating: 4, date: "2024-11-25", comment: "Really helps in summer. Fans are quiet.", verified: true },
    ]
  },
  // Accessories
  {
    id: 11,
    name: "Car Phone Holder - Magnetic",
    price: 399,
    originalPrice: 599,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    ],
    category: "Accessories",
    description: "Strong magnetic phone holder with 360° rotation. Universal compatibility.",
    fullDescription: "Keep your phone securely mounted with our Magnetic Car Phone Holder. Features powerful N52 neodymium magnets that hold your phone firmly even on bumpy roads. 360° rotation allows optimal viewing angles. Dashboard mount with strong adhesive.",
    rating: 4.4,
    reviews: 567,
    inStock: true,
    specifications: [
      { label: "Magnet Type", value: "N52 Neodymium" },
      { label: "Rotation", value: "360° Ball Joint" },
      { label: "Mount Type", value: "Dashboard Adhesive" },
      { label: "Compatibility", value: "All Smartphones" },
      { label: "Includes", value: "2 Metal Plates" },
      { label: "Warranty", value: "6 Months" },
    ],
    customerReviews: [
      { id: 1, author: "Arjun S.", rating: 5, date: "2024-12-20", comment: "Super strong magnet. Phone never falls off.", verified: true },
      { id: 2, author: "Kavitha M.", rating: 4, date: "2024-12-15", comment: "Good product. Easy to install.", verified: true },
    ]
  },
  {
    id: 12,
    name: "Dash Camera - 4K",
    price: 4499,
    originalPrice: 5999,
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
    images: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    ],
    category: "Accessories",
    description: "4K dash camera with night vision and parking mode. 32GB SD card included.",
    fullDescription: "Capture everything on the road with our 4K Dash Camera. Features Sony STARVIS sensor for excellent night vision, G-sensor for automatic incident recording, and parking mode that activates when motion is detected. Includes 32GB SD card and all mounting accessories.",
    rating: 4.6,
    reviews: 234,
    inStock: true,
    badge: "Featured",
    specifications: [
      { label: "Resolution", value: "4K @ 30fps / 1080p @ 60fps" },
      { label: "Sensor", value: "Sony STARVIS IMX335" },
      { label: "Display", value: "3-inch IPS LCD" },
      { label: "Storage", value: "32GB SD Card Included" },
      { label: "Features", value: "Night Vision, G-Sensor, Parking Mode" },
      { label: "Warranty", value: "1 Year" },
    ],
    customerReviews: [
      { id: 1, author: "Rohit B.", rating: 5, date: "2024-12-19", comment: "Crystal clear video quality. Night mode is excellent!", verified: true },
      { id: 2, author: "Shweta K.", rating: 5, date: "2024-12-14", comment: "Best dash cam in this price range. Very satisfied.", verified: true },
    ]
  },
  {
    id: 13,
    name: "Car Air Purifier",
    price: 1999,
    originalPrice: 2999,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400",
    images: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800",
    ],
    category: "Accessories",
    description: "HEPA filter air purifier with ionizer. Removes 99.9% pollutants.",
    fullDescription: "Breathe clean air on every journey with our Car Air Purifier. Features a true HEPA filter that removes 99.9% of pollutants, allergens, and PM2.5 particles. Built-in ionizer freshens the air naturally. Quiet operation and sleek design complement any car interior.",
    rating: 4.3,
    reviews: 178,
    inStock: true,
    specifications: [
      { label: "Filter", value: "True HEPA H13" },
      { label: "Coverage", value: "Up to 10 sq.m" },
      { label: "Ionizer", value: "Yes (Negative Ions)" },
      { label: "Power", value: "USB-C (5V/2A)" },
      { label: "Noise Level", value: "<35dB" },
      { label: "Warranty", value: "1 Year" },
    ],
    customerReviews: [
      { id: 1, author: "Gaurav H.", rating: 4, date: "2024-12-17", comment: "Noticeable difference in air quality. Compact design.", verified: true },
    ]
  },
  {
    id: 14,
    name: "Steering Wheel Cover - Premium",
    price: 799,
    originalPrice: 999,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800",
    ],
    category: "Accessories",
    description: "Premium leather steering wheel cover. Anti-slip grip. Universal size.",
    fullDescription: "Enhance your driving experience with our Premium Steering Wheel Cover. Made from soft microfiber leather with a non-slip inner lining for secure grip. Breathable design keeps your hands comfortable in all weather. Universal size fits most steering wheels.",
    rating: 4.5,
    reviews: 345,
    inStock: true,
    specifications: [
      { label: "Material", value: "Microfiber Leather" },
      { label: "Diameter", value: "37-38cm (Universal)" },
      { label: "Features", value: "Anti-Slip, Breathable" },
      { label: "Installation", value: "Easy Stretch Fit" },
      { label: "Colors", value: "Black, Grey, Tan" },
      { label: "Warranty", value: "6 Months" },
    ],
    customerReviews: [
      { id: 1, author: "Anand V.", rating: 5, date: "2024-12-16", comment: "Great grip and comfortable. Looks premium.", verified: true },
    ]
  },
  {
    id: 15,
    name: "Car Vacuum Cleaner - Portable",
    price: 1499,
    originalPrice: 1999,
    image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400",
    images: [
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800",
    ],
    category: "Accessories",
    description: "Powerful portable vacuum with wet/dry function. 12V car powered.",
    fullDescription: "Keep your car spotless with our Portable Car Vacuum Cleaner. Features powerful 120W suction that handles both wet and dry messes. Comes with multiple attachments for reaching tight spaces. Connects directly to your car's 12V outlet.",
    rating: 4.4,
    reviews: 289,
    inStock: true,
    specifications: [
      { label: "Power", value: "120W Motor" },
      { label: "Suction", value: "6500Pa" },
      { label: "Function", value: "Wet & Dry" },
      { label: "Power Source", value: "12V Car Outlet" },
      { label: "Cord Length", value: "4.5m" },
      { label: "Warranty", value: "1 Year" },
    ],
    customerReviews: [
      { id: 1, author: "Ramesh G.", rating: 4, date: "2024-12-18", comment: "Good suction power. Long cord is very useful.", verified: true },
    ]
  },
  {
    id: 16,
    name: "Tire Inflator - Digital",
    price: 1299,
    originalPrice: 1799,
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400",
    images: [
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800",
    ],
    category: "Accessories",
    description: "Digital tire inflator with auto-stop feature. LED light for night use.",
    fullDescription: "Never worry about flat tires again with our Digital Tire Inflator. Features preset pressure settings with auto-stop for precise inflation. Built-in LED light helps during nighttime emergencies. Compact design stores easily in your trunk.",
    rating: 4.6,
    reviews: 412,
    inStock: true,
    badge: "Essential",
    specifications: [
      { label: "Max Pressure", value: "150 PSI" },
      { label: "Display", value: "Digital LCD" },
      { label: "Features", value: "Auto-Stop, LED Light" },
      { label: "Power", value: "12V Car Outlet" },
      { label: "Accessories", value: "3 Nozzle Adapters" },
      { label: "Warranty", value: "1 Year" },
    ],
    customerReviews: [
      { id: 1, author: "Sunil M.", rating: 5, date: "2024-12-21", comment: "Saved me multiple times. Auto-stop feature is very accurate.", verified: true },
      { id: 2, author: "Lakshmi P.", rating: 5, date: "2024-12-12", comment: "Must-have for every car. Fast and easy to use.", verified: true },
    ]
  }
];

export const categories = [
  "All",
  "HSRP Frames",
  "Car Covers",
  "Floor Mats",
  "Seat Covers",
  "Accessories"
];
