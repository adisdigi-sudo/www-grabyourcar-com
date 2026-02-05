import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/ui/animated-counter";
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
  Heart,
  Users,
  ThumbsUp,
  Award,
  Clock,
  TrendingUp,
  Sparkles,
  Play,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Import delivery photos
import delivery1 from "@/assets/customers/delivery-1.jpg";
import delivery2 from "@/assets/customers/delivery-2.jpg";
import delivery3 from "@/assets/customers/delivery-3.jpg";
import delivery4 from "@/assets/customers/delivery-4.jpg";
import delivery5 from "@/assets/customers/delivery-5.jpg";
import delivery6 from "@/assets/customers/delivery-6.jpg";

// Premium customer stories with real delivery photos
const customerStories = [
  {
    id: 1,
    name: "Rajesh & Meena Sharma",
    location: "Delhi NCR",
    car: "Hyundai Creta SX(O)",
    image: delivery1,
    deliveryMonth: "January 2025",
    rating: 5,
    story: "After months of research, we finally got our dream SUV through Grabyourcar. The team negotiated a fantastic deal and even arranged priority delivery. Our kids love the panoramic sunroof!",
    savings: "₹72,000",
    highlight: "Priority Delivery",
    buyerType: "Family Upgrade",
    waitTime: "3 weeks",
    journeySteps: ["Inquiry via WhatsApp", "Variant selection call", "Dealer visit arranged", "Delivery in 21 days"],
  },
  {
    id: 2,
    name: "Priya & Arjun Mehta",
    location: "Mumbai",
    car: "Tata Nexon EV Max",
    image: delivery2,
    deliveryMonth: "December 2024",
    rating: 5,
    story: "As first-time car buyers, we were nervous about going electric. The Grabyourcar team explained everything - from charging to subsidies. Got our Nexon EV with all accessories included!",
    savings: "₹55,000",
    highlight: "First EV Purchase",
    buyerType: "Young Professionals",
    waitTime: "4 weeks",
    journeySteps: ["Online inquiry", "EV consultation call", "Test drive arranged", "Home delivery"],
  },
  {
    id: 3,
    name: "Vikram Patel",
    location: "Ahmedabad",
    car: "Mahindra XUV700 AX7",
    image: delivery3,
    deliveryMonth: "January 2025",
    rating: 5,
    story: "The XUV700 had a 4-month waiting period at showrooms. Grabyourcar found one with just 6 weeks wait through their dealer network. The exchange bonus was also better than market rate.",
    savings: "₹68,000",
    highlight: "Reduced Waiting",
    buyerType: "Business Owner",
    waitTime: "6 weeks",
    journeySteps: ["Called for availability", "Exchange valuation", "Priority allocation", "Festive delivery"],
  },
  {
    id: 4,
    name: "Dr. Anita Reddy",
    location: "Bangalore",
    car: "Maruti Grand Vitara Hybrid",
    image: delivery4,
    deliveryMonth: "November 2024",
    rating: 5,
    story: "Wanted a fuel-efficient hybrid for my daily hospital commute. The team helped me choose the right variant and got me the best insurance deal. Very professional service!",
    savings: "₹51,000",
    highlight: "Best Insurance Deal",
    buyerType: "Working Professional",
    waitTime: "5 weeks",
    journeySteps: ["WhatsApp inquiry", "Virtual car tour", "Finance approval", "Showroom delivery"],
  },
  {
    id: 5,
    name: "Kumar Family",
    location: "Chennai",
    car: "Toyota Innova Hycross VX",
    image: delivery5,
    deliveryMonth: "October 2024",
    rating: 5,
    story: "We needed a spacious MPV for our joint family. The Hycross was perfect but unavailable everywhere. Grabyourcar tracked one down and made our family celebration complete!",
    savings: "₹62,000",
    highlight: "Joint Family Purchase",
    buyerType: "Multi-Gen Family",
    waitTime: "8 weeks",
    journeySteps: ["Family consultation", "Test drive for elders", "Finance assistance", "Special pooja ceremony"],
  },
  {
    id: 6,
    name: "Rohan Kapoor",
    location: "Pune",
    car: "Kia Seltos HTX+",
    image: delivery6,
    deliveryMonth: "January 2025",
    rating: 5,
    story: "Second car purchase through Grabyourcar. First was a Swift for my parents. They always find better deals than showrooms. The Seltos was delivered with free accessories worth ₹15,000!",
    savings: "₹45,000",
    highlight: "Repeat Customer",
    buyerType: "Young IT Professional",
    waitTime: "2 weeks",
    journeySteps: ["Existing customer inquiry", "Quick variant finalization", "Same dealer network", "Express delivery"],
  },
];

// Trust stats with real numbers
const trustStats = [
  { icon: Users, value: 500, suffix: "+", label: "Happy Customers" },
  { icon: ThumbsUp, value: 4.8, suffix: "/5", label: "Average Rating" },
  { icon: Award, value: 25, prefix: "₹", suffix: "L+", label: "Customer Savings" },
  { icon: Clock, value: 48, suffix: "hrs", label: "Avg. Response Time" },
];

export const CustomerStories = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const activeStory = customerStories[activeIndex];

  // Auto-rotate stories
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % customerStories.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const nextStory = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev + 1) % customerStories.length);
  };

  const prevStory = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev - 1 + customerStories.length) % customerStories.length);
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-secondary/10 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm font-medium border-primary/30 text-primary animate-pulse">
            <Camera className="w-4 h-4 mr-2" />
            Real Delivery Stories
          </Badge>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-4">
            500+ Happy Customers & Counting
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Real delivery moments and genuine buyer journeys from across India
          </p>
        </div>

        {/* Trust Stats Bar with Animated Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto mb-12 md:mb-16">
          {trustStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-4 md:p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <p className="font-heading text-xl md:text-3xl font-bold text-foreground">
                <AnimatedCounter 
                  value={stat.value} 
                  prefix={stat.prefix} 
                  suffix={stat.suffix} 
                />
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Featured Story - Premium Card */}
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="overflow-hidden border-2 border-primary/10 shadow-2xl bg-card">
                <div className="grid md:grid-cols-2">
                  {/* Image Side with Overlay */}
                  <div className="relative min-h-[350px] md:min-h-[500px]">
                    <img 
                      src={activeStory.image} 
                      alt={`${activeStory.name} - ${activeStory.car} delivery`}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      <Badge className="bg-primary text-primary-foreground shadow-lg">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {activeStory.highlight}
                      </Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
                        {activeStory.buyerType}
                      </Badge>
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <Badge className="bg-success text-success-foreground mb-3">
                        <Car className="w-3 h-3 mr-1" />
                        {activeStory.car}
                      </Badge>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {activeStory.deliveryMonth}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {activeStory.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {activeStory.waitTime} delivery
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="p-6 md:p-10 flex flex-col justify-between">
                    <div>
                      {/* Quote */}
                      <Quote className="w-12 h-12 text-primary/20 mb-4" />
                      
                      {/* Story */}
                      <p className="text-foreground text-lg md:text-xl leading-relaxed mb-6 font-medium">
                        "{activeStory.story}"
                      </p>

                      {/* Rating */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-5 h-5 ${i < activeStory.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">Verified Purchase</span>
                      </div>

                      {/* Buyer Journey Timeline */}
                      <div className="bg-secondary/50 rounded-xl p-4 mb-6">
                        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                          Buyer Journey
                        </p>
                        <div className="space-y-2">
                          {activeStory.journeySteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === activeStory.journeySteps.length - 1 
                                  ? 'bg-success text-success-foreground' 
                                  : 'bg-primary/20 text-primary'
                              }`}>
                                {idx + 1}
                              </div>
                              <span className="text-sm text-foreground">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Customer Info & Savings */}
                    <div className="flex items-end justify-between gap-4 pt-4 border-t border-border">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-heading font-bold text-lg">{activeStory.name}</p>
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">{activeStory.location}</p>
                      </div>
                      <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-base px-4 py-2 font-bold">
                        <Heart className="w-4 h-4 mr-1.5 fill-success" />
                        Saved {activeStory.savings}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-6 px-2">
            {/* Progress Dots */}
            <div className="flex gap-2">
              {customerStories.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setActiveIndex(index);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === activeIndex 
                      ? 'bg-primary w-8' 
                      : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            {/* Play/Pause & Arrows */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="h-10 w-10"
              >
                {isAutoPlaying ? (
                  <div className="w-3 h-3 border-2 border-current rounded-sm" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </Button>
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

        {/* Thumbnail Gallery */}
        <div className="mt-10 grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 max-w-5xl mx-auto">
          {customerStories.map((story, index) => (
            <motion.button
              key={story.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsAutoPlaying(false);
                setActiveIndex(index);
              }}
              className={`relative overflow-hidden rounded-xl aspect-square transition-all ${
                index === activeIndex 
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img 
                src={story.image} 
                alt={story.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                <div className="text-left">
                  <p className="text-white text-[10px] md:text-xs font-medium truncate">{story.name.split(' ')[0]}</p>
                  <p className="text-white/70 text-[8px] md:text-[10px] truncate">{story.car.split(' ')[0]}</p>
                </div>
              </div>
              {index === activeIndex && (
                <div className="absolute top-1 right-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 md:mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-gradient-to-r from-primary/10 via-success/10 to-primary/10 rounded-2xl border border-primary/20">
            <div className="text-center sm:text-left">
              <p className="font-semibold text-foreground mb-1">Want to be our next happy customer?</p>
              <p className="text-sm text-muted-foreground">Join 500+ satisfied car buyers across India</p>
            </div>
            <Button variant="cta" size="lg" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Get Best Deal
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Trust Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            📸 All photos are from actual customer deliveries. Names shared with consent. 
            <a href="mailto:stories@grabyourcar.com" className="text-primary hover:underline ml-1">
              Share your story
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};