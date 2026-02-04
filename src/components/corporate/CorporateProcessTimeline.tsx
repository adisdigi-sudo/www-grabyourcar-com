import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { 
  MessageSquare, 
  FileText, 
  Car, 
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessStep {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
  duration: string;
  details: string[];
}

const processSteps: ProcessStep[] = [
  {
    step: 1,
    title: "Initial Inquiry",
    description: "Share your fleet requirements with our corporate team",
    icon: MessageSquare,
    duration: "Day 1",
    details: [
      "Dedicated account manager assigned",
      "Requirement assessment call",
      "Budget & timeline discussion",
    ],
  },
  {
    step: 2,
    title: "Custom Proposal",
    description: "Receive a tailored fleet solution with best pricing",
    icon: FileText,
    duration: "Day 2-3",
    details: [
      "Model recommendations",
      "Volume-based pricing",
      "Financing options",
    ],
  },
  {
    step: 3,
    title: "Order Processing",
    description: "Streamlined documentation and order confirmation",
    icon: Car,
    duration: "Day 4-7",
    details: [
      "Single-point coordination",
      "Priority vehicle allocation",
      "Insurance & registration",
    ],
  },
  {
    step: 4,
    title: "Fleet Delivery",
    description: "Coordinated delivery to your locations",
    icon: CheckCircle,
    duration: "Day 8-14",
    details: [
      "Multi-location delivery",
      "Handover & orientation",
      "After-sales support setup",
    ],
  },
];

export const CorporateProcessTimeline = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-secondary/20 to-background overflow-hidden">
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
            How It Works
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Procurement Journey
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From inquiry to delivery in as little as 2 weeks — streamlined for corporate efficiency
          </p>
        </motion.div>

        {/* Timeline */}
        <div ref={ref} className="max-w-6xl mx-auto">
          {/* Desktop Timeline */}
          <div className="hidden lg:block relative">
            {/* Connecting Line Background */}
            <div className="absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-border/30" />
            
            {/* Animated Progress Line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary origin-left"
            />

            {/* Step Numbers Row */}
            <div className="relative grid grid-cols-4 gap-6 mb-8">
              {processSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.3 }}
                  className="flex justify-center"
                >
                  {/* Step Number Circle */}
                  <div className="relative">
                    {/* Pulse ring animation */}
                    <motion.div
                      initial={{ opacity: 0, scale: 1 }}
                      animate={isInView ? { 
                        opacity: [0, 0.5, 0], 
                        scale: [1, 1.5, 1.8] 
                      } : {}}
                      transition={{ 
                        duration: 1.5, 
                        delay: 0.5 + index * 0.3,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                      className="absolute inset-0 rounded-full bg-primary"
                    />
                    
                    {/* Main number circle */}
                    <div className={cn(
                      "relative z-10 w-20 h-20 rounded-full flex items-center justify-center",
                      "bg-gradient-to-br from-primary to-primary/80",
                      "border-4 border-background shadow-xl shadow-primary/30"
                    )}>
                      <span className="text-2xl font-bold text-primary-foreground">
                        {step.step}
                      </span>
                    </div>

                    {/* Connecting dots to next step */}
                    {index < processSteps.length - 1 && (
                      <div className="absolute top-1/2 left-full -translate-y-1/2 flex items-center gap-2 px-4">
                        {[...Array(3)].map((_, dotIndex) => (
                          <motion.div
                            key={dotIndex}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                            transition={{ 
                              duration: 0.3, 
                              delay: 0.8 + index * 0.3 + dotIndex * 0.1 
                            }}
                            className="w-2 h-2 rounded-full bg-primary/60"
                          />
                        ))}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                          transition={{ duration: 0.3, delay: 1.1 + index * 0.3 }}
                        >
                          <ArrowRight className="w-4 h-4 text-primary" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Content Cards Row */}
            <div className="grid grid-cols-4 gap-6">
              {processSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.2 }}
                  className="relative group"
                >
                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center",
                      "bg-gradient-to-br from-card to-secondary border border-primary/20",
                      "shadow-lg group-hover:border-primary/50 transition-all duration-300"
                    )}>
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className={cn(
                    "bg-card border border-border/50 rounded-2xl p-6",
                    "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                    "transition-all duration-300"
                  )}>
                    {/* Duration Badge */}
                    <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold rounded-full bg-accent/10 text-accent border border-accent/20">
                      {step.duration}
                    </div>

                    <h3 className="font-heading font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {step.description}
                    </p>

                    {/* Details List */}
                    <ul className="space-y-2">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet Timeline */}
          <div className="lg:hidden space-y-6">
            {processSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative flex gap-4"
              >
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                    "bg-gradient-to-br from-primary to-primary/80",
                    "shadow-lg shadow-primary/20"
                  )}>
                    <step.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-primary to-border mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className={cn(
                  "flex-1 bg-card border border-border/50 rounded-xl p-5 mb-2",
                  "hover:border-primary/30 transition-colors"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary">Step {step.step}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent">
                      {step.duration}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {step.description}
                  </p>
                  <ul className="space-y-1.5">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <a
              href="#corporate-form"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              Start Your Journey
              <ArrowRight className="h-5 w-5" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
