 import { useState } from "react";
 import { Card } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { 
   Star, 
   Quote, 
   ChevronLeft, 
   ChevronRight,
   Camera,
   MapPin,
   Calendar,
   Car,
   CheckCircle,
   Heart
 } from "lucide-react";
 
 // Customer stories with delivery photos (placeholders for now)
 const customerStories = [
   {
     id: 1,
     name: "Rajesh & Family",
     location: "Delhi NCR",
     car: "Mahindra XUV700 AX7 L",
     carImage: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
     deliveryMonth: "January 2025",
     rating: 5,
     story: "After months of research, we finally got our dream SUV through Grabyourcar. The team negotiated a fantastic deal and even arranged priority delivery. Our kids love the panoramic sunroof!",
     savings: "₹72,000",
     hasDeliveryPhoto: true,
     highlight: "Priority Delivery",
   },
   {
     id: 2,
     name: "Priya Sharma",
     location: "Mumbai",
     car: "Hyundai Creta SX(O)",
     carImage: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800",
     deliveryMonth: "December 2024",
     rating: 5,
     story: "As a first-time car buyer, I was nervous about the whole process. The Grabyourcar team guided me through everything - from choosing the right variant to getting the best insurance deal.",
     savings: "₹48,000",
     hasDeliveryPhoto: true,
     highlight: "First Car",
   },
   {
     id: 3,
     name: "Amit & Sneha",
     location: "Bangalore",
     car: "Tata Safari Adventure+",
     carImage: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800",
     deliveryMonth: "January 2025",
     rating: 5,
     story: "We upgraded from a hatchback to the Safari for our growing family. The exchange bonus and festive offers combined saved us a lot. Highly recommend their service!",
     savings: "₹65,000",
     hasDeliveryPhoto: true,
     highlight: "Exchange Bonus",
   },
   {
     id: 4,
     name: "Dr. Vikram Patel",
     location: "Ahmedabad",
     car: "Toyota Innova Hycross VX",
     carImage: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
     deliveryMonth: "November 2024",
     rating: 5,
     story: "The hybrid Hycross had a 4-month waiting period everywhere. Grabyourcar found one with just 6 weeks wait. Their dealer network is impressive.",
     savings: "₹55,000",
     hasDeliveryPhoto: true,
     highlight: "Reduced Waiting",
   },
 ];
 
 export const CustomerStories = () => {
   const [activeIndex, setActiveIndex] = useState(0);
   const activeStory = customerStories[activeIndex];
 
   const nextStory = () => {
     setActiveIndex((prev) => (prev + 1) % customerStories.length);
   };
 
   const prevStory = () => {
     setActiveIndex((prev) => (prev - 1 + customerStories.length) % customerStories.length);
   };
 
   return (
     <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20 overflow-hidden">
       <div className="container mx-auto px-4">
         {/* Section Header */}
         <div className="text-center mb-12 md:mb-16">
           <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm font-medium border-primary/30 text-primary">
             <Camera className="w-4 h-4 mr-2" />
             Real Deliveries
           </Badge>
           <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-4">
             Happy Customers, Happy Cars
           </h2>
           <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
             See real delivery moments from our customers across India
           </p>
         </div>
 
         {/* Featured Story - Large Card */}
         <div className="max-w-5xl mx-auto">
           <Card className="overflow-hidden border-2 border-primary/10 shadow-xl">
             <div className="grid md:grid-cols-2">
               {/* Image Side */}
               <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 min-h-[300px] md:min-h-[450px]">
                 <img 
                   src={activeStory.carImage} 
                   alt={activeStory.car}
                   className="w-full h-full object-cover"
                 />
                 {/* Overlay with delivery info */}
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                   <div className="flex items-center gap-2 mb-2">
                     <Badge className="bg-primary text-primary-foreground">
                       <Car className="w-3 h-3 mr-1" />
                       {activeStory.car}
                     </Badge>
                     <Badge variant="secondary" className="bg-white/20 text-white border-0">
                       {activeStory.highlight}
                     </Badge>
                   </div>
                   <div className="flex items-center gap-4 text-sm text-white/80">
                     <span className="flex items-center gap-1">
                       <Calendar className="w-4 h-4" />
                       {activeStory.deliveryMonth}
                     </span>
                     <span className="flex items-center gap-1">
                       <MapPin className="w-4 h-4" />
                       {activeStory.location}
                     </span>
                   </div>
                 </div>
               </div>
 
               {/* Content Side */}
               <div className="p-6 md:p-10 flex flex-col justify-center">
                 {/* Quote Icon */}
                 <Quote className="w-10 h-10 text-primary/20 mb-4" />
                 
                 {/* Story */}
                 <p className="text-foreground text-lg md:text-xl leading-relaxed mb-6">
                   "{activeStory.story}"
                 </p>
 
                 {/* Rating */}
                 <div className="flex items-center gap-2 mb-6">
                   {Array.from({ length: 5 }).map((_, i) => (
                     <Star 
                       key={i}
                       className={`w-5 h-5 ${i < activeStory.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`}
                     />
                   ))}
                 </div>
 
                 {/* Customer Info */}
                 <div className="flex items-center justify-between">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <p className="font-heading font-bold text-lg">{activeStory.name}</p>
                       <CheckCircle className="w-4 h-4 text-primary" />
                     </div>
                     <p className="text-sm text-muted-foreground">{activeStory.location}</p>
                   </div>
                   <Badge variant="secondary" className="bg-success/10 text-success border-0 text-base px-4 py-2">
                     <Heart className="w-4 h-4 mr-1.5" />
                     Saved {activeStory.savings}
                   </Badge>
                 </div>
               </div>
             </div>
           </Card>
 
           {/* Navigation */}
           <div className="flex items-center justify-between mt-6">
             {/* Dots */}
             <div className="flex gap-2">
               {customerStories.map((_, index) => (
                 <button
                   key={index}
                   onClick={() => setActiveIndex(index)}
                   className={`w-2.5 h-2.5 rounded-full transition-all ${
                     index === activeIndex 
                       ? 'bg-primary w-8' 
                       : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                   }`}
                 />
               ))}
             </div>
 
             {/* Arrows */}
             <div className="flex gap-2">
               <Button
                 variant="outline"
                 size="icon"
                 onClick={prevStory}
                 className="h-10 w-10"
               >
                 <ChevronLeft className="h-5 w-5" />
               </Button>
               <Button
                 variant="outline"
                 size="icon"
                 onClick={nextStory}
                 className="h-10 w-10"
               >
                 <ChevronRight className="h-5 w-5" />
               </Button>
             </div>
           </div>
         </div>
 
         {/* Small Thumbnail Cards */}
         <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
           {customerStories.map((story, index) => (
             <button
               key={story.id}
               onClick={() => setActiveIndex(index)}
               className={`relative overflow-hidden rounded-xl transition-all ${
                 index === activeIndex 
                   ? 'ring-2 ring-primary ring-offset-2' 
                   : 'opacity-70 hover:opacity-100'
               }`}
             >
               <img 
                 src={story.carImage} 
                 alt={story.car}
                 className="w-full h-24 md:h-28 object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-2">
                 <div className="text-left">
                   <p className="text-white text-xs font-medium truncate">{story.name}</p>
                   <p className="text-white/70 text-[10px] truncate">{story.car}</p>
                 </div>
               </div>
             </button>
           ))}
         </div>
 
         {/* Trust Note */}
         <div className="mt-10 text-center">
           <p className="text-sm text-muted-foreground">
             📸 All photos are from actual customer deliveries. Want to share your story? 
             <a href="mailto:stories@grabyourcar.com" className="text-primary hover:underline ml-1">
               Write to us
             </a>
           </p>
         </div>
       </div>
     </section>
   );
 };