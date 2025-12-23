import { Card } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
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
    text: "Zero waiting period for my Nexon EV! Grabyourcar found ready stock when everyone else said 3 months wait. Highly recommend!",
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

export const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join 50,000+ happy car buyers who saved money with Grabyourcar
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.id}
              variant="elevated"
              className="p-6 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-heading font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.car} • {testimonial.location}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
