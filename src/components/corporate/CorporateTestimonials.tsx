import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Quote, Star } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

interface Testimonial {
  id: number;
  name: string;
  designation: string;
  company: string;
  industry: string;
  quote: string;
  rating: number;
  vehiclesOrdered?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Rajesh Sharma",
    designation: "Head of Administration",
    company: "Gaur Group",
    industry: "Real Estate",
    quote: "Grabyourcar streamlined our entire fleet procurement process. What used to take us months of dealer negotiations was completed in weeks. Their dedicated account manager understood our multi-site requirements perfectly.",
    rating: 5,
    vehiclesOrdered: "25+ vehicles",
  },
  {
    id: 2,
    name: "Dr. Priya Virmani",
    designation: "Director",
    company: "Virmani Hospital",
    industry: "Healthcare",
    quote: "The flexibility in financing options and coordinated delivery across our hospital network was exceptional. Grabyourcar made it easy for our doctors and staff to get their vehicles without the usual dealership hassle.",
    rating: 5,
    vehiclesOrdered: "20+ vehicles",
  },
  {
    id: 3,
    name: "Amit Banshidhar",
    designation: "Managing Director",
    company: "Banshidhar Group",
    industry: "Manufacturing",
    quote: "We've been partnering with Grabyourcar for over 3 years now. Their transparent pricing and priority allocation for new models has saved us both time and money. A truly professional corporate experience.",
    rating: 5,
    vehiclesOrdered: "40+ vehicles",
  },
  {
    id: 4,
    name: "Sunita Dewan",
    designation: "Principal",
    company: "Dewan Public School",
    industry: "Education",
    quote: "Procuring vehicles for our administrative staff across multiple campuses was seamless. The extended warranty packages and fleet insurance coordination exceeded our expectations.",
    rating: 5,
    vehiclesOrdered: "15+ vehicles",
  },
  {
    id: 5,
    name: "Vikram Singh",
    designation: "Operations Head",
    company: "Sewa Hospitality",
    industry: "Hospitality",
    quote: "For our guest pickup services, we needed premium SUVs delivered on a tight timeline. Grabyourcar delivered ahead of schedule with corporate branding coordination included. Outstanding service!",
    rating: 5,
    vehiclesOrdered: "12+ vehicles",
  },
  {
    id: 6,
    name: "Anita Kapoor",
    designation: "CFO",
    company: "Orange Group",
    industry: "Corporate",
    quote: "The cost savings of 12% on our bulk order was significant, but what impressed us most was the single point of contact for all our procurement needs. No more juggling multiple dealers.",
    rating: 5,
    vehiclesOrdered: "30+ vehicles",
  },
];

export const CorporateTestimonials = () => {
  const [api, setApi] = useState<any>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <span className="text-primary text-sm font-semibold uppercase tracking-wider mb-2 block">
            Client Testimonials
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our Corporate Partners Say
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trusted partnerships built on exceptional service and results
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 5000,
                stopOnInteraction: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial) => (
                <CarouselItem 
                  key={testimonial.id} 
                  className="pl-4 md:basis-1/2 lg:basis-1/3"
                >
                  <Card className="h-full bg-card border border-border/50 p-6 flex flex-col relative overflow-hidden group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                    {/* Quote icon */}
                    <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Quote className="h-12 w-12 text-primary" />
                    </div>

                    {/* Rating */}
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-primary text-primary"
                        />
                      ))}
                    </div>

                    {/* Quote */}
                    <blockquote className="text-muted-foreground text-sm leading-relaxed flex-grow mb-6">
                      "{testimonial.quote}"
                    </blockquote>

                    {/* Author */}
                    <div className="border-t border-border/50 pt-4 mt-auto">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground">
                            {testimonial.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {testimonial.designation}
                          </div>
                          <div className="text-xs text-primary font-medium mt-0.5">
                            {testimonial.company}
                          </div>
                        </div>
                        {testimonial.vehiclesOrdered && (
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Ordered</div>
                            <div className="text-sm font-semibold text-foreground">
                              {testimonial.vehiclesOrdered}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                          {testimonial.industry}
                        </span>
                      </div>
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 lg:-left-6" />
            <CarouselNext className="hidden md:flex -right-4 lg:-right-6" />
          </Carousel>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  current === index
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
