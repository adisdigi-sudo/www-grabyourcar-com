import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Quote, Star, Building2, Car } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Testimonial {
  id: number;
  name: string;
  designation: string;
  company: string;
  industry: string;
  quote: string;
  rating: number;
  vehiclesOrdered?: string;
  initials: string;
  accentColor: string;
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
    initials: "RS",
    accentColor: "from-blue-500 to-cyan-500",
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
    initials: "PV",
    accentColor: "from-rose-500 to-pink-500",
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
    initials: "AB",
    accentColor: "from-amber-500 to-orange-500",
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
    initials: "SD",
    accentColor: "from-emerald-500 to-teal-500",
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
    initials: "VS",
    accentColor: "from-violet-500 to-purple-500",
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
    initials: "AK",
    accentColor: "from-indigo-500 to-blue-500",
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
    <section className="py-16 md:py-24 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full border border-primary/20">
            Client Testimonials
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            What Our{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Corporate Partners
            </span>{" "}
            Say
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trusted partnerships built on exceptional service and measurable results
          </p>
        </motion.div>

        {/* Featured Large Testimonial */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto mb-12"
        >
          <div className="relative bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 rounded-3xl p-8 md:p-12 shadow-xl">
            {/* Large quote icon */}
            <div className="absolute -top-6 left-8 md:left-12">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Quote className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-tr-3xl rounded-bl-[200px]" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/10 to-transparent rounded-bl-3xl rounded-tr-[150px]" />

            <div className="relative">
              <blockquote className="text-xl md:text-2xl text-foreground leading-relaxed mb-8 font-medium">
                "{testimonials[current].quote}"
              </blockquote>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarFallback className={cn(
                      "bg-gradient-to-br text-white font-bold text-lg",
                      testimonials[current].accentColor
                    )}>
                      {testimonials[current].initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-heading font-bold text-lg text-foreground">
                      {testimonials[current].name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonials[current].designation}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-3 w-3 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        {testimonials[current].company}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="flex gap-1">
                    {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  {testimonials[current].vehiclesOrdered && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                      <Car className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        {testimonials[current].vehiclesOrdered}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Carousel of smaller cards */}
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
              {testimonials.map((testimonial, index) => (
                <CarouselItem 
                  key={testimonial.id} 
                  className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                      "h-full cursor-pointer transition-all duration-300",
                      current === index ? "scale-100" : "scale-95 opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className={cn(
                      "h-full bg-card border rounded-2xl p-6 flex flex-col relative overflow-hidden group",
                      "transition-all duration-300",
                      current === index 
                        ? "border-primary/50 shadow-lg shadow-primary/10" 
                        : "border-border/50 hover:border-primary/20 hover:shadow-md"
                    )}>
                      {/* Accent bar */}
                      <div className={cn(
                        "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                        testimonial.accentColor,
                        current === index ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                      )} />

                      {/* Quote icon */}
                      <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Quote className="h-10 w-10 text-primary" />
                      </div>

                      {/* Avatar and info */}
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-12 w-12 border-2 border-border/50">
                          <AvatarFallback className={cn(
                            "bg-gradient-to-br text-white font-bold text-sm",
                            testimonial.accentColor
                          )}>
                            {testimonial.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground text-sm">
                            {testimonial.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {testimonial.designation}
                          </div>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="flex gap-0.5 mb-3">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3.5 w-3.5 fill-primary text-primary"
                          />
                        ))}
                      </div>

                      {/* Quote preview */}
                      <blockquote className="text-muted-foreground text-sm leading-relaxed flex-grow mb-4 line-clamp-3">
                        "{testimonial.quote}"
                      </blockquote>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            {testimonial.company}
                          </span>
                        </div>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground">
                          {testimonial.industry}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 lg:-left-6 bg-background border-border hover:bg-primary hover:text-primary-foreground" />
            <CarouselNext className="hidden md:flex -right-4 lg:-right-6 bg-background border-border hover:bg-primary hover:text-primary-foreground" />
          </Carousel>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  current === index
                    ? "w-8 bg-gradient-to-r from-primary to-accent"
                    : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
