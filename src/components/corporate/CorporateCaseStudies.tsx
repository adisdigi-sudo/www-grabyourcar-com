import { useRef } from "react";
import { Car, Clock, TrendingDown, CheckCircle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface CaseStudy {
  industry: string;
  title: string;
  description: string;
  metrics: {
    vehiclesDelivered: string;
    timeSaved: string;
    costSavings: string;
  };
  highlights: string[];
}

const caseStudies: CaseStudy[] = [
  {
    industry: "Real Estate",
    title: "Multi-Site Fleet Deployment",
    description: "A leading real estate developer needed vehicles for their sales teams across multiple project sites in NCR region.",
    metrics: {
      vehiclesDelivered: "25+",
      timeSaved: "45 Days",
      costSavings: "12%",
    },
    highlights: [
      "Coordinated delivery across 8 locations",
      "Customized financing package",
      "Dedicated account support",
    ],
  },
  {
    industry: "Education",
    title: "School Transport Fleet",
    description: "An established school chain required reliable vehicles for administrative staff and inter-campus transportation.",
    metrics: {
      vehiclesDelivered: "15+",
      timeSaved: "30 Days",
      costSavings: "10%",
    },
    highlights: [
      "Priority allocation for new models",
      "Extended warranty packages",
      "Fleet insurance coordination",
    ],
  },
  {
    industry: "Healthcare",
    title: "Medical Staff Mobility",
    description: "A healthcare institution needed vehicles for doctors and medical staff across their hospital network.",
    metrics: {
      vehiclesDelivered: "20+",
      timeSaved: "35 Days",
      costSavings: "15%",
    },
    highlights: [
      "24/7 breakdown support arranged",
      "Flexible EMI options",
      "Quick documentation process",
    ],
  },
  {
    industry: "Hospitality",
    title: "Guest Services Fleet",
    description: "A hospitality services company required premium vehicles for guest pickup and corporate shuttle services.",
    metrics: {
      vehiclesDelivered: "12+",
      timeSaved: "25 Days",
      costSavings: "8%",
    },
    highlights: [
      "Premium SUV procurement",
      "Corporate branding coordination",
      "Scheduled maintenance plans",
    ],
  },
];

interface SummaryStat {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
  icon: React.ElementType;
}

const summaryStats: SummaryStat[] = [
  { value: 70, suffix: "+", label: "Vehicles Delivered", icon: Car },
  { value: 135, suffix: "+", label: "Days Saved", icon: Clock },
  { value: 11, suffix: "%", label: "Avg. Cost Savings", icon: TrendingDown },
  { value: 4, suffix: "+", label: "Industries Served", icon: Building2 },
];

export const CorporateCaseStudies = () => {
  const statsRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(statsRef, { once: true, margin: "-50px" });

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <span className="text-foreground text-sm font-semibold uppercase tracking-wider mb-2 block">
            Success Stories
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Fleet Deployments That Made an Impact
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real results from organizations that trusted Grabyourcar for their automotive needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {caseStudies.map((study, index) => (
            <div
              key={study.title}
              className={cn(
                "group relative bg-card border border-border/50 rounded-2xl overflow-hidden",
                "transition-all duration-300 ease-out",
                "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20"
              )}
            >
              {/* Header with industry badge */}
              <div className="p-6 pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-foreground">
                    {study.industry}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                  {study.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {study.description}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 divide-x divide-border/50 bg-secondary/30">
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Car className="h-4 w-4 text-foreground mr-1" />
                  </div>
                  <span className="block text-2xl font-bold text-foreground">
                    {study.metrics.vehiclesDelivered}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Vehicles
                  </span>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="h-4 w-4 text-foreground mr-1" />
                  </div>
                  <span className="block text-2xl font-bold text-foreground">
                    {study.metrics.timeSaved}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Time Saved
                  </span>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingDown className="h-4 w-4 text-foreground mr-1" />
                  </div>
                  <span className="block text-2xl font-bold text-foreground">
                    {study.metrics.costSavings}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Cost Saved
                  </span>
                </div>
              </div>

              {/* Highlights */}
              <div className="p-6 pt-4">
                <ul className="space-y-2">
                  {study.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Decorative accent */}
              <div 
                className={cn(
                  "absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-primary/50 to-transparent",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                )}
              />
            </div>
          ))}
        </div>

        {/* Summary Stats with Animated Counters */}
        <div 
          ref={statsRef}
          className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {summaryStats.map((stat, index) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10"
            >
              <stat.icon className="h-5 w-5 text-foreground mx-auto mb-2" />
              <span className="block text-2xl md:text-3xl font-bold text-foreground">
                <AnimatedCounter 
                  value={stat.value} 
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                />
              </span>
              <span className="text-xs md:text-sm text-muted-foreground">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
