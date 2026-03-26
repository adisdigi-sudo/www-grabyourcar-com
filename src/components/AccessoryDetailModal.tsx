import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  Check, 
  Truck, 
  Shield, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BadgeCheck
} from "lucide-react";
import { Accessory } from "@/data/accessoriesData";
import { useCart } from "@/hooks/useCart";
import { useAccessoryWishlist } from "@/hooks/useAccessoryWishlist";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccessoryDetailModalProps {
  accessory: Accessory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccessoryDetailModal = ({ accessory, open, onOpenChange }: AccessoryDetailModalProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useAccessoryWishlist();

  if (!accessory) return null;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: accessory.id,
        name: accessory.name,
        price: accessory.price,
        image: accessory.image,
        category: accessory.category
      });
    }
    toast.success(`${quantity} × ${accessory.name} added to cart`);
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % accessory.images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + accessory.images.length) % accessory.images.length);
  };

  const discount = accessory.originalPrice 
    ? Math.round(((accessory.originalPrice - accessory.price) / accessory.originalPrice) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Gallery */}
          <div className="relative bg-muted/30 p-4">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-background">
              <img
                src={accessory.images[selectedImageIndex]}
                alt={accessory.name}
                className="w-full h-full object-cover"
              />
              
              {accessory.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              {accessory.badge && (
                <Badge className="absolute top-3 left-3">{accessory.badge}</Badge>
              )}

              {!accessory.inStock && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Badge variant="secondary" className="text-lg py-2 px-4">Out of Stock</Badge>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {accessory.images.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center">
                {accessory.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={cn(
                      "w-16 h-16 rounded-md overflow-hidden border-2 transition-all",
                      selectedImageIndex === index 
                        ? "border-primary" 
                        : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-6 flex flex-col">
            <DialogHeader className="text-left space-y-2">
              <p className="text-sm text-muted-foreground">{accessory.category}</p>
              <DialogTitle className="text-xl md:text-2xl font-bold leading-tight">
                {accessory.name}
              </DialogTitle>
            </DialogHeader>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded text-sm">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="font-medium">{accessory.rating}</span>
              </div>
              <span className="text-muted-foreground text-sm">
                {accessory.reviews} reviews
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-bold text-foreground">
                ₹{accessory.price.toLocaleString()}
              </span>
              {accessory.originalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{accessory.originalPrice.toLocaleString()}
                  </span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {discount}% OFF
                  </Badge>
                </>
              )}
            </div>

            <p className="text-muted-foreground mt-4">
              {accessory.description}
            </p>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4 mt-6">
              <div className="flex items-center border rounded-md">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setQuantity(q => q + 1)}
                >
                  +
                </Button>
              </div>
              
              <Button 
                className="flex-1" 
                size="lg"
                disabled={!accessory.inStock}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => toggleWishlist(accessory.id, accessory.name)}
              >
                <Heart className={cn(
                  "h-5 w-5",
                  isInWishlist(accessory.id) && "fill-red-500 text-red-500"
                )} />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-foreground" />
                <span>Free Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-foreground" />
                <span>Genuine</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <RotateCcw className="h-4 w-4 text-foreground" />
                <span>Easy Returns</span>
              </div>
            </div>

            {/* Tabs for Details */}
            <Tabs defaultValue="description" className="mt-6 flex-1">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="specifications">Specs</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({accessory.customerReviews.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="mt-4">
                <p className="text-muted-foreground leading-relaxed">
                  {accessory.fullDescription}
                </p>
              </TabsContent>
              
              <TabsContent value="specifications" className="mt-4">
                <div className="space-y-3">
                  {accessory.specifications.map((spec, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "flex justify-between py-2",
                        index !== accessory.specifications.length - 1 && "border-b"
                      )}
                    >
                      <span className="text-muted-foreground">{spec.label}</span>
                      <span className="font-medium text-right">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="reviews" className="mt-4">
                <div className="space-y-4 max-h-48 overflow-y-auto">
                  {accessory.customerReviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.author}</span>
                          {review.verified && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <BadgeCheck className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.date).toLocaleDateString('en-IN', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={cn(
                              "h-3.5 w-3.5",
                              i < review.rating 
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-muted-foreground"
                            )} 
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
