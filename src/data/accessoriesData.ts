export interface Accessory {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  badge?: string;
}

export const accessoriesData: Accessory[] = [
  // HSRP Frames
  {
    id: 1,
    name: "Premium IND HSRP Frame - Chrome",
    price: 599,
    originalPrice: 899,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    category: "HSRP Frames",
    description: "High-quality chrome finish HSRP frame with anti-rust coating. Fits all standard Indian number plates.",
    rating: 4.5,
    reviews: 234,
    inStock: true,
    badge: "Bestseller"
  },
  {
    id: 2,
    name: "Carbon Fiber HSRP Frame",
    price: 899,
    originalPrice: 1299,
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400",
    category: "HSRP Frames",
    description: "Lightweight carbon fiber texture HSRP frame. Premium look with durable construction.",
    rating: 4.7,
    reviews: 156,
    inStock: true,
    badge: "Premium"
  },
  {
    id: 3,
    name: "Matte Black HSRP Frame",
    price: 499,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400",
    category: "HSRP Frames",
    description: "Sleek matte black finish HSRP frame. Perfect for dark colored vehicles.",
    rating: 4.3,
    reviews: 189,
    inStock: true
  },
  {
    id: 4,
    name: "LED Illuminated HSRP Frame",
    price: 1499,
    originalPrice: 1999,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400",
    category: "HSRP Frames",
    description: "HSRP frame with integrated LED lighting. Automatic on/off with headlights.",
    rating: 4.6,
    reviews: 98,
    inStock: true,
    badge: "New"
  },
  // Car Covers
  {
    id: 5,
    name: "Waterproof Car Body Cover - Sedan",
    price: 1299,
    originalPrice: 1799,
    image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400",
    category: "Car Covers",
    description: "100% waterproof car cover with UV protection. Fits most sedans. Includes storage bag.",
    rating: 4.4,
    reviews: 312,
    inStock: true,
    badge: "Popular"
  },
  {
    id: 6,
    name: "Premium SUV Car Cover",
    price: 1799,
    originalPrice: 2499,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
    category: "Car Covers",
    description: "Heavy-duty SUV cover with triple-layer protection. Fits all popular SUVs.",
    rating: 4.6,
    reviews: 245,
    inStock: true
  },
  // Floor Mats
  {
    id: 7,
    name: "3D Premium Floor Mats - Universal",
    price: 2499,
    originalPrice: 3499,
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
    category: "Floor Mats",
    description: "Premium 3D floor mats with raised edges. Waterproof and easy to clean.",
    rating: 4.8,
    reviews: 456,
    inStock: true,
    badge: "Top Rated"
  },
  {
    id: 8,
    name: "Leather Floor Mats - Luxury",
    price: 4999,
    originalPrice: 6999,
    image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400",
    category: "Floor Mats",
    description: "Genuine leather floor mats with custom stitching. Premium luxury feel.",
    rating: 4.7,
    reviews: 123,
    inStock: true,
    badge: "Luxury"
  },
  // Seat Covers
  {
    id: 9,
    name: "Premium Leather Seat Covers - Full Set",
    price: 5999,
    originalPrice: 7999,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400",
    category: "Seat Covers",
    description: "Full set of premium leather seat covers. Custom fit available for all models.",
    rating: 4.5,
    reviews: 289,
    inStock: true
  },
  {
    id: 10,
    name: "Cooling Seat Covers with Fan",
    price: 3999,
    originalPrice: 4999,
    image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400",
    category: "Seat Covers",
    description: "Seat covers with built-in cooling fans. USB powered. Perfect for summer.",
    rating: 4.2,
    reviews: 167,
    inStock: false
  },
  // Accessories
  {
    id: 11,
    name: "Car Phone Holder - Magnetic",
    price: 399,
    originalPrice: 599,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    category: "Accessories",
    description: "Strong magnetic phone holder with 360° rotation. Universal compatibility.",
    rating: 4.4,
    reviews: 567,
    inStock: true
  },
  {
    id: 12,
    name: "Dash Camera - 4K",
    price: 4499,
    originalPrice: 5999,
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
    category: "Accessories",
    description: "4K dash camera with night vision and parking mode. 32GB SD card included.",
    rating: 4.6,
    reviews: 234,
    inStock: true,
    badge: "Featured"
  },
  {
    id: 13,
    name: "Car Air Purifier",
    price: 1999,
    originalPrice: 2999,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400",
    category: "Accessories",
    description: "HEPA filter air purifier with ionizer. Removes 99.9% pollutants.",
    rating: 4.3,
    reviews: 178,
    inStock: true
  },
  {
    id: 14,
    name: "Steering Wheel Cover - Premium",
    price: 799,
    originalPrice: 999,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
    category: "Accessories",
    description: "Premium leather steering wheel cover. Anti-slip grip. Universal size.",
    rating: 4.5,
    reviews: 345,
    inStock: true
  },
  {
    id: 15,
    name: "Car Vacuum Cleaner - Portable",
    price: 1499,
    originalPrice: 1999,
    image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400",
    category: "Accessories",
    description: "Powerful portable vacuum with wet/dry function. 12V car powered.",
    rating: 4.4,
    reviews: 289,
    inStock: true
  },
  {
    id: 16,
    name: "Tire Inflator - Digital",
    price: 1299,
    originalPrice: 1799,
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400",
    category: "Accessories",
    description: "Digital tire inflator with auto-stop feature. LED light for night use.",
    rating: 4.6,
    reviews: 412,
    inStock: true,
    badge: "Essential"
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
