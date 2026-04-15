import { motion } from "framer-motion";
import {
  Zap,
  BadgePercent,
  HeadphonesIcon,
  Truck,
  Globe,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const problems = [
  {
    icon: BadgePercent,
    problem: "Opaque dealer pricing",
    solution: "Competitive Corporate Pricing",
    detail: "Exclusive bulk discounts up to 15% — transparent, volume-based rates unavailable at retail.",
  },
  {
    icon: HeadphonesIcon,
    problem: "Juggling multiple dealers",
    solution: "Single Point of Contact",
    detail: "One dedicated account manager handles every brand, model, and location for your entire fleet.",
  },
  {
    icon: Zap,
    problem: "Months-long procurement",
    solution: "Priority Allocation & Speed",
    detail: "Skip the queue — dedicated inventory access and 2-week delivery timelines for corporate orders.",
  },
  {
    icon: Globe,
    problem: "Limited geographic reach",
    solution: "Pan-India Delivery Network",
    detail: "Coordinated multi-location delivery across 100+ cities with local service support.",
  },
  {
    icon: FileCheck,
    problem: "Paperwork overload",
    solution: "End-to-End Documentation",
    detail: "GST-compliant invoicing, registration, insurance — we handle every document so you don't have to.",
  },
  {
    icon: Truck,
    problem: "No post-purchase support",
    solution: "Fleet Lifecycle Management",
    detail: "Scheduled maintenance, insurance renewals, and warranty coordination for your entire fleet.",
  },
];

export const CorporateValueProposition = () => {
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
            Fleet Procurement is Broken.{" "}
            <span className="text-primary">We Fix It.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Enterprise-grade solutions that replace fragmented dealer negotiations
            with a single, streamlined partnership.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {problems.map((item, index) => (
            <motion.div
              key={item.solution}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              viewport={{ once: true }}
              className={cn(
                "group bg-card border border-border/50 rounded-xl p-6",
                "transition-all duration-300 hover:shadow-md hover:border-primary/20"
              )}
            >
              {/* Problem label */}
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-destructive/70 mb-3">
                Problem: {item.problem}
              </span>

              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  "bg-primary/10 text-foreground",
                  "group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                )}
              >
                <item.icon className="h-6 w-6" />
              </div>

              <h3 className="font-heading font-semibold text-foreground text-lg mb-2">
                {item.solution}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
