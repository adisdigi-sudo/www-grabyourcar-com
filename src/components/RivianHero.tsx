import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight, Calendar, IndianRupee, Battery, Gauge, Zap } from "lucide-react";
import heroImg1 from "@/assets/hero-upcoming-1.jpg";
import heroImg2 from "@/assets/hero-upcoming-2.jpg";
import heroImg3 from "@/assets/hero-upcoming-3.jpg";

// Map local fallback images
const localImages: Record<string, string> = {
  "/assets/hero-upcoming-1.jpg": heroImg1,
  "/assets/hero-upcoming-2.jpg": heroImg2,
  "/assets/hero-upcoming-3.jpg": heroImg3,
};

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  brand: string | null;
  price_range: string | null;
  launch_date: string | null;
  image_url: string;
  cta_label: string | null;
  cta_link: string | null;
  cta_secondary_label: string | null;
  cta_secondary_link: string | null;
  spec_1_label: string | null;
  spec_1_value: string | null;
  spec_2_label: string | null;
  spec_2_value: string | null;
  spec_3_label: string | null;
  spec_3_value: string | null;
  sort_order: number;
}

const fallbackSlides: HeroSlide[] = [
  {
    id: "1", title: "Tata Sierra EV", subtitle: "The Future of Adventure", brand: "Tata Motors",
    description: "500+ km range, Level 2 ADAS, 69 kWh battery. India's most anticipated electric SUV.",
    price_range: "₹25 – 35 Lakh", launch_date: "Q3 2026", image_url: heroImg1,
    cta_label: "Get Launch Alert", cta_link: "/upcoming-cars", cta_secondary_label: "Explore More", cta_secondary_link: "/cars",
    spec_1_label: "Battery", spec_1_value: "69 kWh", spec_2_label: "Range", spec_2_value: "500+ km", spec_3_label: "ADAS", spec_3_value: "Level 2", sort_order: 1,
  },
  {
    id: "2", title: "Tesla Model 3", subtitle: "Finally in India", brand: "Tesla",
    description: "The world's best-selling EV arrives. Premium performance, autopilot, zero emissions.",
    price_range: "₹35 – 45 Lakh", launch_date: "2026", image_url: heroImg2,
    cta_label: "Get Notified", cta_link: "/upcoming-cars", cta_secondary_label: "View All EVs", cta_secondary_link: "/cars",
    spec_1_label: "Battery", spec_1_value: "60 kWh", spec_2_label: "Range", spec_2_value: "513 km", spec_3_label: "0-100", spec_3_value: "6.1 sec", sort_order: 2,
  },
  {
    id: "3", title: "Mahindra BE 6e", subtitle: "Born Electric", brand: "Mahindra",
    description: "800V architecture, 0-100 in 6.7s, 682 km range. India's boldest electric statement.",
    price_range: "₹18.90 – 26.90 Lakh", launch_date: "Available Now", image_url: heroImg3,
    cta_label: "Book Now", cta_link: "/upcoming-cars", cta_secondary_label: "Compare EVs", cta_secondary_link: "/cars",
    spec_1_label: "Architecture", spec_1_value: "800V", spec_2_label: "Range", spec_2_value: "682 km", spec_3_label: "0-100", spec_3_value: "6.7 sec", sort_order: 3,
  },
];

const specIcons: Record<string, React.ReactNode> = {
  "Battery": <Battery className="h-5 w-5" />,
  "Range": <Gauge className="h-5 w-5" />,
  "ADAS": <Zap className="h-5 w-5" />,
  "0-100": <Zap className="h-5 w-5" />,
  "Architecture": <Zap className="h-5 w-5" />,
  "Charging": <Battery className="h-5 w-5" />,
  "Motor": <Gauge className="h-5 w-5" />,
  "Platform": <Zap className="h-5 w-5" />,
  "Segment": <Gauge className="h-5 w-5" />,
  "Drive": <Zap className="h-5 w-5" />,
  "Motors": <Gauge className="h-5 w-5" />,
};

const resolveImage = (url: string): string => {
  return localImages[url] || url;
};

export const RivianHero = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const { data: slides = fallbackSlides } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error || !data || data.length === 0) return fallbackSlides;
      return data as HeroSlide[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  // Reset to 0 if slides change
  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  const slide = slides[current];
  if (!slide) return null;

  const specs = [
    slide.spec_1_label && slide.spec_1_value ? { label: slide.spec_1_label, value: slide.spec_1_value } : null,
    slide.spec_2_label && slide.spec_2_value ? { label: slide.spec_2_label, value: slide.spec_2_value } : null,
    slide.spec_3_label && slide.spec_3_value ? { label: slide.spec_3_label, value: slide.spec_3_value } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const imageVariants = {
    enter: (dir: number) => ({ opacity: 0, scale: 1.08, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, scale: 1, x: 0, transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] as const } },
    exit: (dir: number) => ({ opacity: 0, scale: 1.03, x: dir > 0 ? -60 : 60, transition: { duration: 0.5 } }),
  };

  return (
    <section className="relative h-[75vh] md:h-[85vh] lg:h-screen w-full overflow-hidden bg-black">
      {/* Full-bleed background image */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={imageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          <img
            src={resolveImage(slide.image_url)}
            alt={slide.title}
            className="w-full h-full object-cover object-bottom md:object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex items-end pb-20 md:items-center md:pb-0">
        <div className="container mx-auto px-4 md:px-12 lg:px-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.25 } }}
              exit={{ opacity: 0, y: -30, transition: { duration: 0.3 } }}
              className="max-w-2xl"
            >
              {/* Brand label */}
              {slide.brand && (
                <p className="text-white/40 text-[10px] md:text-xs tracking-[0.35em] uppercase font-medium mb-2 md:mb-3">
                  {slide.brand}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-5">
                {slide.launch_date && (
                  <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm text-white/90 font-medium">
                    <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    {slide.launch_date}
                  </span>
                )}
                {slide.price_range && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 rounded-full px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm text-emerald-300 font-medium">
                    <IndianRupee className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    {slide.price_range}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-1 md:mb-2">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-base md:text-xl lg:text-2xl text-white/60 font-light mb-2 md:mb-4">
                  {slide.subtitle}
                </p>
              )}

              {/* Description */}
              {slide.description && (
                <p className="text-sm md:text-base lg:text-lg text-white/50 leading-relaxed mb-4 md:mb-6 max-w-md line-clamp-2 md:line-clamp-none">
                  {slide.description}
                </p>
              )}

              {/* Specs */}
              {specs.length > 0 && (
                <div className="flex gap-2 md:gap-3 mb-5 md:mb-8 overflow-x-auto pb-1 -mx-1 px-1">
                  {specs.map((spec) => (
                    <div key={spec.label} className="bg-white/5 backdrop-blur-md rounded-lg md:rounded-xl px-3 py-2 md:px-4 md:py-3 border border-white/10 min-w-[80px] md:min-w-[100px] flex-shrink-0">
                      <div className="text-emerald-400 mb-0.5 md:mb-1">
                        {specIcons[spec.label] || <Zap className="h-3.5 w-3.5 md:h-5 md:w-5" />}
                      </div>
                      <p className="text-white font-bold text-sm md:text-base">{spec.value}</p>
                      <p className="text-white/40 text-[9px] md:text-[11px] uppercase tracking-wider">{spec.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div className="flex items-center gap-3 md:gap-4">
                <Link to={slide.cta_link || "/upcoming-cars"}>
                  <Button
                    size="lg"
                    className="rounded-full bg-white text-black hover:bg-white/90 px-5 py-5 md:px-8 md:py-6 text-sm md:text-base font-semibold shadow-2xl hover:shadow-white/20 transition-all"
                  >
                    {slide.cta_label || "Learn More"}
                  </Button>
                </Link>
                <Link to={slide.cta_secondary_link || "/cars"}>
                  <Button
                    size="lg"
                    className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600 px-5 py-5 md:px-8 md:py-6 text-sm md:text-base font-semibold shadow-2xl hover:shadow-emerald-500/20 transition-all"
                  >
                    {slide.cta_secondary_label || "Book Now"}
                    <ArrowRight className="h-4 w-4 ml-1 md:ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
        {slides.map((s, i) => (
          <button
            key={s.id || i}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            className={`relative rounded-full transition-all duration-500 overflow-hidden ${
              i === current
                ? "w-16 md:w-24 h-7 md:h-8 bg-white/20 backdrop-blur-md border border-white/30"
                : "w-2.5 h-2.5 md:w-3 md:h-3 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Go to ${s.title}`}
          >
            {i === current && (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] md:text-[11px] text-white font-semibold tracking-wide truncate px-1.5 md:px-2">
                {s.title}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Slide counter */}
      <div className="absolute top-20 md:top-24 right-4 md:right-12 z-20 text-white/30 text-xs md:text-sm font-mono">
        {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
      </div>
    </section>
  );
};
