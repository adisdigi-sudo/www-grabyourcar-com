 import { Link } from "react-router-dom";
 import {
   Carousel,
   CarouselContent,
   CarouselItem,
 } from "@/components/ui/carousel";
 import Autoplay from "embla-carousel-autoplay";
 import { 
   Car, 
   Clock, 
   Scale, 
   Shield, 
   CreditCard, 
   Building2, 
   CarFront, 
   Package,
   Sparkles,
   ArrowRight 
 } from "lucide-react";
 import { motion } from "framer-motion";
 
 // Premium service banners with clean typography
 const premiumBanners = [
   {
     id: 1,
     title: "New Cars",
     subtitle: "Pan-India Deals",
     description: "Best prices from 500+ authorized dealers",
     icon: Car,
     link: "/cars",
     gradient: "from-primary/90 via-primary to-primary/80",
     accent: "bg-success/20",
   },
   {
     id: 2,
     title: "Zero Waiting",
     subtitle: "Instant Delivery",
     description: "Ready stock cars with same-week delivery",
     icon: Clock,
     link: "/cars?filter=no-waiting",
     gradient: "from-accent via-accent/90 to-accent/80",
     accent: "bg-primary/20",
   },
   {
     id: 3,
     title: "Compare Offers",
     subtitle: "Smart Choice",
     description: "Side-by-side comparison across brands",
     icon: Scale,
     link: "/compare",
     gradient: "from-primary via-primary/90 to-primary/80",
     accent: "bg-accent/20",
   },
   {
     id: 4,
     title: "Insurance",
     subtitle: "Complete Protection",
     description: "Compare & save on car insurance",
     icon: Shield,
     link: "/car-insurance",
     gradient: "from-accent/90 via-accent to-accent/80",
     accent: "bg-success/20",
   },
   {
     id: 5,
     title: "Car Finance",
     subtitle: "Lowest EMI",
     description: "Loans from top banks at 8.5%* onwards",
     icon: CreditCard,
     link: "/car-loans",
     gradient: "from-primary/90 via-primary to-primary/80",
     accent: "bg-accent/20",
   },
   {
     id: 6,
     title: "Corporate Sales",
     subtitle: "Fleet Solutions",
     description: "Bulk buying with exclusive discounts",
     icon: Building2,
     link: "/corporate",
     gradient: "from-accent via-accent/90 to-accent/80",
     accent: "bg-primary/20",
   },
  {
    id: 7,
    title: "Self-Drive",
    subtitle: "Rent Now",
    description: "Premium car rentals on demand",
    icon: CarFront,
    link: "/self-drive",
    gradient: "from-primary via-primary/90 to-primary/80",
     accent: "bg-muted/30",
   },
   {
     id: 8,
     title: "Accessories",
     subtitle: "& HSRP",
     description: "Premium add-ons & registration plates",
     icon: Package,
     link: "/accessories",
     gradient: "from-primary via-primary/90 to-primary/80",
     accent: "bg-success/20",
   },
 ];
 
 export const PremiumBannerCarousel = () => {
   return (
     <div className="w-full max-w-5xl mx-auto">
       <Carousel
         opts={{
           align: "start",
           loop: true,
         }}
         plugins={[
           Autoplay({
             delay: 4000,
             stopOnInteraction: false,
             stopOnMouseEnter: true,
           }),
         ]}
         className="w-full"
       >
         <CarouselContent className="-ml-3 md:-ml-4">
           {premiumBanners.map((banner, index) => (
             <CarouselItem key={banner.id} className="pl-3 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
               <Link to={banner.link} className="group block">
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: index * 0.1, duration: 0.5 }}
                   className={`
                     relative overflow-hidden rounded-2xl h-40 md:h-44
                     bg-gradient-to-br ${banner.gradient}
                     shadow-lg border border-card/20
                     transition-all duration-300 
                     group-hover:scale-[1.02] group-hover:shadow-xl
                     group-hover:shadow-primary/20
                   `}
                 >
                   {/* Background Pattern */}
                   <div className="absolute inset-0 opacity-10">
                     <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-card/20 -translate-y-1/2 translate-x-1/2" />
                     <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-card/10 translate-y-1/2 -translate-x-1/2" />
                   </div>
 
                   {/* Content */}
                   <div className="relative z-10 h-full flex flex-col justify-between p-5">
                     <div className="flex items-start justify-between">
                       <div className="flex-1">
                         <div className="flex items-center gap-2 mb-1">
                           <h3 className="text-lg md:text-xl font-bold text-card tracking-tight">
                             {banner.title}
                           </h3>
                           {banner.subtitle === "Coming Soon" && (
                             <span className="text-[10px] bg-card/20 text-card px-2 py-0.5 rounded-full font-medium">
                               Soon
                             </span>
                           )}
                         </div>
                         <p className="text-sm font-semibold text-card/90">
                           {banner.subtitle}
                         </p>
                       </div>
                       <div className={`w-12 h-12 rounded-xl ${banner.accent} backdrop-blur-sm flex items-center justify-center flex-shrink-0`}>
                         <banner.icon className="h-6 w-6 text-card" />
                       </div>
                     </div>
 
                     <div className="flex items-end justify-between gap-4">
                       <p className="text-xs text-card/80 leading-relaxed flex-1 max-w-[200px]">
                         {banner.description}
                       </p>
                       <div className="w-8 h-8 rounded-full bg-card/20 flex items-center justify-center group-hover:bg-card/30 transition-colors flex-shrink-0">
                         <ArrowRight className="h-4 w-4 text-card group-hover:translate-x-0.5 transition-transform" />
                       </div>
                     </div>
                   </div>
 
                   {/* Hover Glow Effect */}
                   <div className="absolute inset-0 bg-gradient-to-t from-card/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                 </motion.div>
               </Link>
             </CarouselItem>
           ))}
         </CarouselContent>
 
         {/* Premium Carousel Indicators */}
         <div className="flex justify-center gap-1.5 mt-5">
           {premiumBanners.map((_, index) => (
             <div
               key={index}
               className="w-1.5 h-1.5 rounded-full bg-card/40 transition-all duration-300"
             />
           ))}
         </div>
       </Carousel>
 
       {/* Trust line below banners */}
       <div className="flex items-center justify-center gap-2 mt-4">
         <Sparkles className="h-3.5 w-3.5 text-accent" />
         <p className="text-xs text-card/70 font-medium">
           Trusted by 10,000+ car buyers across India
         </p>
       </div>
     </div>
   );
 };