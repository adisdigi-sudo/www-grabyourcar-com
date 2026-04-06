import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star, Building2, Car, Clock, TrendingDown, CheckCircle, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface CaseStudy {
  industry: string;
  company: string;
  quote: string;
  name: string;
  designation: string;
  vehiclesDelivered: string;
  timeSaved: string;
  costSavings: string;
}

const caseStudies: CaseStudy[] = [
  {
    industry: "Real Estate",
    company: "Gaur Group",
    quote: "What used to take months of dealer negotiations was completed in weeks. Their account manager understood our multi-site requirements perfectly.",
    name: "Rajesh Sharma",
    designation: "Head of Administration",
    vehiclesDelivered: "25+",
    timeSaved: "45 Days",
    costSavings: "12%",
  },
  {
    industry: "Healthcare",
    company: "Virmani Hospital",
    quote: "The flexibility in financing and coordinated delivery across our hospital network was exceptional. No more dealership hassle.",
    name: "Dr. Priya Virmani",
    designation: "Director",
    vehiclesDelivered: "20+",
    timeSaved: "35 Days",
    costSavings: "15%",
  },
  {
    industry: "Manufacturing",
    company: "Banshidhar Group",
    quote: "Transparent pricing and priority allocation for new models has saved us both time and money over 3+ years. A truly professional experience.",
    name: "Amit Banshidhar",
    designation: "Managing Director",
    vehiclesDelivered: "40+",
    timeSaved: "50 Days",
    costSavings: "14%",
  },
  {
    industry: "Education",
    company: "Orange Group",
    quote: "Single point of contact for all our procurement needs — no more juggling multiple dealers. The cost savings of 12% on our bulk order was significant.",
    name: "Anita Kapoor",
    designation: "CFO",
    vehiclesDelivered: "30+",
    timeSaved: "40 Days",
    costSavings: "12%",
  },
];

const summaryStats = [
  { value: 70, suffix: "+", label: "Vehicles Delivered", icon: Car },
  { value: 135, suffix: "+", label: "Days Saved", icon: Clock },
  { value: 11, suffix: "%", label: "Avg. Cost Savings", icon: TrendingDown },
  { value: 4, suffix: "+", label: "Industries Served", icon: Building2 },
];

export const CorporateTrustSection = () => {
  const statsRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(statsRef, { once: true, margin: "-50px" });

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Real Results from{" "}
            <span className="text-primary">Real Partners</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Client success stories with measurable impact across industries
          </p>
        </motion.div>

        {/* Combined Case Study + Testimonial Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-14">
          {caseStudies.map((study, index) => (
            <motion.div
              key={study.company}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={cn(
                "relative bg-card border border-border/50 rounded-2xl overflow-hidden",
                "transition-all duration-300 hover:shadow-lg hover:border-primary/20"
              )}
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-foreground">
                      {study.industry}
                    </span>
                    <span className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                      ))}
                    </span>
                  </div>
                </div>

                {/* Quote */}
                <div className="relative mb-4">
                  <Quote className="absolute -top-1 -left-1 h-6 w-6 text-primary/20" />
                  <blockquote className="pl-6 text-foreground text-sm leading-relaxed italic">
                    "{study.quote}"
                  </blockquote>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{study.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {study.designation}, {study.company}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-3 divide-x divide-border/50 bg-secondary/30 border-t border-border/50">
                <div className="p-3 text-center">
                  <span className="block text-lg font-bold text-foreground">{study.vehiclesDelivered}</span>
                  <span className="text-xs text-muted-foreground">Vehicles</span>
                </div>
                <div className="p-3 text-center">
                  <span className="block text-lg font-bold text-foreground">{study.timeSaved}</span>
                  <span className="text-xs text-muted-foreground">Time Saved</span>
                </div>
                <div className="p-3 text-center">
                  <span className="block text-lg font-bold text-foreground">{study.costSavings}</span>
                  <span className="text-xs text-muted-foreground">Cost Saved</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary Stats with Animated Counters */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {summaryStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center p-5 rounded-xl bg-primary/5 border border-primary/10"
            >
              <stat.icon className="h-5 w-5 text-foreground mx-auto mb-2" />
              <span className="block text-2xl md:text-3xl font-bold text-foreground">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </span>
              <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
