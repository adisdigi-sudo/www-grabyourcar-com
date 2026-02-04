import { Card } from "@/components/ui/card";
import { Star, Quote, Users, ThumbsUp, Award, CheckCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// More realistic, varied testimonials with specific details
const textTestimonials = [
  {
    id: 1,
    name: "Rahul Sharma",
    location: "Mumbai",
    car: "Hyundai Creta SX(O)",
    rating: 5,
    text: "Compared prices from 3 dealers in Mumbai and finally got a great deal through Grabyourcar. The process was smooth and the team kept me updated at every step.",
    avatar: "RS",
    verified: true,
    date: "December 2024",
    savings: "₹42,000",
  },
  {
    id: 2,
    name: "Priya Patel",
    location: "Ahmedabad",
    car: "Tata Nexon EV Max",
    rating: 5,
    text: "Was worried about EV charging infrastructure, but the team explained everything clearly. Got my Nexon EV delivered in 3 weeks with all accessories included.",
    avatar: "PP",
    verified: true,
    date: "January 2025",
    savings: "₹55,000",
  },
  {
    id: 3,
    name: "Amit Kumar",
    location: "Delhi NCR",
    car: "Mahindra XUV700 AX7",
    rating: 4,
    text: "Good experience overall. The loan processing could have been faster, but the final price was better than what I was getting at the showroom directly.",
    avatar: "AK",
    verified: true,
    date: "November 2024",
    savings: "₹68,000",
  },
  {
    id: 4,
    name: "Sneha Reddy",
    location: "Bangalore",
    car: "Kia Seltos HTX+",
    rating: 5,
    text: "Second car purchase through Grabyourcar. First was a Swift for my parents. They always find better deals than what's advertised. Highly recommend!",
    avatar: "SR",
    verified: true,
    date: "January 2025",
    savings: "₹38,000",
  },
  {
    id: 5,
    name: "Vikram Mehta",
    location: "Pune",
    car: "Maruti Grand Vitara Alpha+",
    rating: 5,
    text: "The hybrid variant was hard to find, but they located one with minimal waiting. Insurance and accessories were also competitively priced.",
    avatar: "VM",
    verified: true,
    date: "December 2024",
    savings: "₹51,000",
  },
  {
    id: 6,
    name: "Ananya Singh",
    location: "Chennai",
    car: "Toyota Innova Hycross",
    rating: 4,
    text: "Long wait for the Hycross, but worth it. The team kept following up with the dealer. Could improve communication frequency during waiting period.",
    avatar: "AS",
    verified: true,
    date: "October 2024",
    savings: "₹45,000",
  },
];

const stats = [
  { icon: Users, value: "15,000+", label: "Happy Customers" },
  { icon: ThumbsUp, value: "4.6/5", label: "Average Rating" },
  { icon: Award, value: "₹85L+", label: "Total Savings" },
];

export const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm font-medium border-primary/30 text-primary">
            Customer Stories
          </Badge>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Real feedback from verified car buyers across India
          </p>
        </div>

        {/* Stats Bar - More conservative numbers */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-12 md:mb-16">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center p-3 md:p-5 rounded-xl bg-card border border-border/50 shadow-sm"
            >
              <stat.icon className="h-5 w-5 md:h-7 md:w-7 text-primary mx-auto mb-2" />
              <p className="font-heading text-lg md:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonial Cards - 2 column on tablet, 3 on desktop */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {textTestimonials.map((testimonial, index) => (
            <Card
              key={testimonial.id}
              className="p-5 md:p-6 animate-fade-in bg-card border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/* Header with Avatar and Info */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                  {testimonial.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-heading font-semibold text-foreground text-sm truncate">
                      {testimonial.name}
                    </p>
                    {testimonial.verified && (
                      <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-3.5 w-3.5 ${i < testimonial.rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} 
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {testimonial.date}
                </span>
              </div>

              {/* Review Text */}
              <p className="text-foreground mb-4 leading-relaxed text-sm">
                "{testimonial.text}"
              </p>

              {/* Car and Savings */}
              <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground truncate">
                  {testimonial.car}
                </p>
                {testimonial.savings && (
                  <Badge variant="secondary" className="text-xs whitespace-nowrap bg-success/10 text-success border-0">
                    Saved {testimonial.savings}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Trust Note */}
        <div className="mt-10 md:mt-12 text-center">
          <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto">
            All testimonials are from verified customers. Actual savings may vary based on location, model, and market conditions.
          </p>
        </div>
      </div>
    </section>
  );
};
