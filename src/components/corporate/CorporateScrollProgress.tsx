import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const sections = [
  { id: "hero", label: "Overview" },
  { id: "logos", label: "Clients" },
  { id: "stats", label: "Stats" },
  { id: "industries", label: "Industries" },
  { id: "process", label: "Process" },
  { id: "why-choose", label: "Why Us" },
  { id: "comparison", label: "Compare" },
  { id: "case-studies", label: "Case Studies" },
  { id: "testimonials", label: "Reviews" },
  { id: "faq", label: "FAQ" },
  { id: "cta", label: "Contact" },
];

export const CorporateScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);

      // Show after scrolling past hero
      setIsVisible(scrollTop > 300);

      // Determine active section based on scroll position
      const sectionIndex = Math.min(
        Math.floor((progress / 100) * sections.length),
        sections.length - 1
      );
      setActiveSection(sectionIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (index: number) => {
    const targetProgress = (index / sections.length) * 100;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const targetScroll = (targetProgress / 100) * docHeight;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-end gap-1"
    >
      {/* Progress bar background */}
      <div className="absolute right-[7px] top-0 bottom-0 w-0.5 bg-muted rounded-full" />
      
      {/* Progress bar fill */}
      <motion.div
        className="absolute right-[7px] top-0 w-0.5 bg-primary rounded-full origin-top"
        style={{ height: `${scrollProgress}%` }}
      />

      {/* Section dots */}
      {sections.map((section, index) => (
        <button
          key={section.id}
          onClick={() => scrollToSection(index)}
          className="group flex items-center gap-2 py-1.5"
        >
          {/* Label tooltip */}
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded bg-card shadow-md border opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap",
              activeSection === index ? "text-primary" : "text-muted-foreground"
            )}
          >
            {section.label}
          </span>

          {/* Dot indicator */}
          <motion.div
            className={cn(
              "w-3.5 h-3.5 rounded-full border-2 transition-all duration-300",
              activeSection === index
                ? "bg-primary border-primary scale-110"
                : "bg-card border-muted-foreground/30 group-hover:border-primary/50"
            )}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          />
        </button>
      ))}

      {/* Percentage indicator */}
      <div className="mt-3 text-xs font-mono text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm border">
        {Math.round(scrollProgress)}%
      </div>
    </motion.div>
  );
};
