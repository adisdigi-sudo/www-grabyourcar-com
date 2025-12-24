import { Card } from "@/components/ui/card";
import { Star, Play, Quote, Users, ThumbsUp, Award } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const videoTestimonials = [
  {
    id: 1,
    name: "Vikram Mehta",
    location: "Mumbai",
    car: "Hyundai Creta SX(O)",
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    savings: "₹45,000",
  },
  {
    id: 2,
    name: "Anjali Sharma",
    location: "Delhi NCR",
    car: "Tata Nexon EV",
    thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    savings: "₹72,000",
  },
  {
    id: 3,
    name: "Rajesh Kumar",
    location: "Bangalore",
    car: "Mahindra XUV700",
    thumbnail: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    savings: "₹80,000",
  },
];

const textTestimonials = [
  {
    id: 1,
    name: "Rahul Sharma",
    location: "Mumbai",
    car: "Hyundai Creta SX(O)",
    rating: 5,
    text: "Got my dream car at ₹45,000 less than showroom price! The team was incredibly helpful and transparent throughout the process.",
    avatar: "RS",
  },
  {
    id: 2,
    name: "Priya Patel",
    location: "Ahmedabad",
    car: "Tata Nexon EV",
    rating: 5,
    text: "Zero waiting period for my Nexon EV! Grabyourcar found ready stock when everyone else said 3 months wait.",
    avatar: "PP",
  },
  {
    id: 3,
    name: "Amit Kumar",
    location: "Delhi NCR",
    car: "Mahindra XUV700",
    rating: 5,
    text: "Compared offers from 5 dealers and saved ₹80,000 on my XUV700. The process was smooth and completely transparent.",
    avatar: "AK",
  },
  {
    id: 4,
    name: "Sneha Reddy",
    location: "Bangalore",
    car: "Kia Seltos GTX+",
    rating: 5,
    text: "Best car buying experience! Got festive offers plus additional corporate discount. Saved almost ₹1 lakh on my Seltos.",
    avatar: "SR",
  },
];

const stats = [
  { icon: Users, value: "50,000+", label: "Happy Customers" },
  { icon: ThumbsUp, value: "4.9/5", label: "Average Rating" },
  { icon: Award, value: "₹2Cr+", label: "Total Savings" },
];

export const Testimonials = () => {
  const [activeVideo, setActiveVideo] = useState<number | null>(null);

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm font-medium border-primary/30 text-primary">
            Customer Stories
          </Badge>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4">
            Real People, Real Savings
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Hear from thousands of happy customers who saved big on their new car purchase
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto mb-16">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center p-4 md:p-6 rounded-2xl bg-card border border-border/50 shadow-sm"
            >
              <stat.icon className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
              <p className="font-heading text-xl md:text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Video Testimonials */}
        <div className="mb-16">
          <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-8 text-center">
            Watch Customer Stories
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {videoTestimonials.map((video, index) => (
              <Card 
                key={video.id} 
                className="overflow-hidden group cursor-pointer animate-fade-in border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setActiveVideo(video.id)}
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={video.thumbnail} 
                    alt={video.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 shadow-lg">
                      <Play className="h-7 w-7 text-primary-foreground fill-primary-foreground ml-1" />
                    </div>
                  </div>

                  {/* Savings Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-accent text-accent-foreground font-semibold px-3 py-1">
                      Saved {video.savings}
                    </Badge>
                  </div>

                  {/* Customer Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <p className="font-heading font-semibold text-lg">{video.name}</p>
                    <p className="text-sm text-white/80">{video.car} • {video.location}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Text Testimonials */}
        <div>
          <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-8 text-center">
            What Our Customers Say
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {textTestimonials.map((testimonial, index) => (
              <Card
                key={testimonial.id}
                className="p-6 animate-fade-in bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Quote className="h-8 w-8 text-primary/20 mb-4 group-hover:text-primary/40 transition-colors" />
                
                <p className="text-foreground mb-6 leading-relaxed text-sm">
                  "{testimonial.text}"
                </p>

                {/* Rating */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground text-sm">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.car}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Video Modal */}
        {activeVideo && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setActiveVideo(null)}
          >
            <div className="relative w-full max-w-4xl aspect-video">
              <button 
                onClick={() => setActiveVideo(null)}
                className="absolute -top-12 right-0 text-white hover:text-primary transition-colors text-lg font-medium"
              >
                Close ✕
              </button>
              <iframe
                src={videoTestimonials.find(v => v.id === activeVideo)?.videoUrl}
                className="w-full h-full rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
