import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceBanner } from "@/components/ServiceBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, 
  Star, 
  Search, 
  Filter,
  Check,
  Heart,
  Package,
  Eye
} from "lucide-react";
import { accessoriesData, categories, Accessory } from "@/data/accessoriesData";
import { useCart } from "@/hooks/useCart";
import { useAccessoryWishlist } from "@/hooks/useAccessoryWishlist";
import { useAuth } from "@/hooks/useAuth";
import { CartSheet } from "@/components/CartSheet";
import { AccessoryDetailModal } from "@/components/AccessoryDetailModal";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Accessories = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [addedItems, setAddedItems] = useState<number[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Accessory | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, wishlist } = useAccessoryWishlist();
  const { user } = useAuth();

  const filteredProducts = accessoriesData
    .filter(product => {
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

  const handleAddToCart = (product: Accessory) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category
    });
    setAddedItems(prev => [...prev, product.id]);
    toast.success(`${product.name} added to cart`);
    
    setTimeout(() => {
      setAddedItems(prev => prev.filter(id => id !== product.id));
    }, 2000);
  };

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case "Bestseller":
      case "Popular":
        return "default";
      case "Premium":
      case "Luxury":
        return "secondary";
      case "New":
      case "Featured":
        return "outline";
      default:
        return "default";
    }
  };

  const handleViewDetails = (product: Accessory) => {
    setSelectedProduct(product);
    setDetailModalOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Car Accessories | HSRP Frames, Covers & More | GrabYourCar</title>
        <meta
          name="description"
          content="Shop premium car accessories - HSRP frames, car covers, floor mats, and more. Free delivery, genuine products, and top quality. Order online now!"
        />
      </Helmet>

      <Header />

      {/* Service Banner */}
      <ServiceBanner
        highlightText="Free Shipping"
        title="Flat 20% Off on All Car Accessories!"
        subtitle="Use code: GRAB20 | Free installation on orders above ₹2,000"
        variant="accent"
        showCountdown
        countdownHours={36}
      />
      
      <main className="min-h-screen bg-background pt-6">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <Badge className="mb-4">Shop Accessories</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Premium Car Accessories
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Discover our wide range of high-quality HSRP frames, car covers, floor mats, and accessories. 
                Free delivery on all orders.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span>Free Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Genuine Products</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span>Top Rated</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters & Search */}
        <section className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="whitespace-nowrap"
                  >
                    {category}
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search accessories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>

                <Link to="/accessory-wishlist">
                  <Button variant="outline" size="icon" className="relative">
                    <Heart className="h-5 w-5" />
                    {wishlist.length > 0 && (
                      <Badge 
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500"
                      >
                        {wishlist.length}
                      </Badge>
                    )}
                  </Button>
                </Link>

                <CartSheet />
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                Showing {filteredProducts.length} products
              </p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => handleViewDetails(product)}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.badge && (
                        <Badge 
                          variant={getBadgeVariant(product.badge)}
                          className="absolute top-2 left-2"
                        >
                          {product.badge}
                        </Badge>
                      )}
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Badge variant="secondary">Out of Stock</Badge>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`bg-background/80 hover:bg-background transition-opacity ${
                            isInWishlist(product.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product.id, product.name);
                          }}
                        >
                          <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(product);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                      <h3 className="font-medium text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.reviews})</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg font-bold text-primary">
                          ₹{product.price.toLocaleString()}
                        </span>
                        {product.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={!product.inStock || addedItems.includes(product.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                      >
                        {addedItems.includes(product.id) ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Added
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-12 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">Free Delivery</h4>
                <p className="text-sm text-muted-foreground">On all orders</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">Genuine Products</h4>
                <p className="text-sm text-muted-foreground">100% authentic</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">Top Quality</h4>
                <p className="text-sm text-muted-foreground">Premium materials</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">Easy Returns</h4>
                <p className="text-sm text-muted-foreground">7-day return policy</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <AccessoryDetailModal
        accessory={selectedProduct}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </>
  );
};

export default Accessories;
