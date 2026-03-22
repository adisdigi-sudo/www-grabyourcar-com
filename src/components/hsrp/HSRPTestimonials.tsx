import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rajesh Sharma",
    vehicle: "Hyundai Creta 2018",
    location: "Delhi",
    rating: 5,
    text: "Booked HSRP online and got installation done at home within 2 days. Saved me from a ₹10,000 challan! Very smooth process.",
  },
  {
    name: "Priya Gupta",
    vehicle: "Maruti Swift 2016",
    location: "Noida",
    rating: 5,
    text: "Was worried about the fine after seeing news. GrabYourCar made it super easy — just entered my RC number and everything was filled automatically.",
  },
  {
    name: "Amit Kumar",
    vehicle: "Honda City 2017",
    location: "Gurugram",
    rating: 4,
    text: "Good service. The technician arrived on time and installation was done in 15 minutes. The plates look genuine and tamper-proof.",
  },
  {
    name: "Sunita Verma",
    vehicle: "Tata Nexon 2019",
    location: "Ghaziabad",
    rating: 5,
    text: "Best HSRP service! I compared prices with 3-4 websites and GrabYourCar had the most transparent pricing. No hidden charges.",
  },
];

export const HSRPTestimonials = () => (
  <section className="py-12 md:py-16">
    <div className="container mx-auto px-4">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          What Our Customers Say
        </h2>
        <p className="text-muted-foreground">Real reviews from verified HSRP installations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {testimonials.map((t, i) => (
          <Card key={i} className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-3">
              <Quote className="h-6 w-6 text-primary/30" />
              <p className="text-sm text-muted-foreground leading-relaxed">{t.text}</p>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`h-3.5 w-3.5 ${j < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <div className="border-t border-border pt-3">
                <p className="font-medium text-sm text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.vehicle} • {t.location}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);
