import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight, Zap, Calendar, IndianRupee } from "lucide-react";
import heroImg1 from "@/assets/hero-upcoming-1.jpg";
import heroImg2 from "@/assets/hero-upcoming-2.jpg";
import heroImg3 from "@/assets/hero-upcoming-3.jpg";

interface SlideData {
  image: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  launchDate: string;
  link: string;
  ctaLabel: string;
  ctaSecondary: string;
}

const slides: SlideData[] = [
  {
    image: heroImg1,
    title: "Tata Sierra EV",
    subtitle: "The Future of Adventure",
    description: "500+ km range, Level 2 ADAS, 69 kWh battery. India's most anticipated electric SUV is almost here.",
    price: "₹25 – 35 Lakh",
    launchDate: "Q3 2026",
    link: "/upcoming-cars",
    ctaLabel: "Get Launch Alert",
    ctaSecondary: "Explore More",
  },
  {
    image: heroImg2,
    title: "Tesla Model 3",
    subtitle: "Coming to India",
    description: "The world's best-selling EV is finally arriving. Premium performance, autopilot, and zero emissions.",
    price: "₹35 – 45 Lakh",
    launchDate: "2026",
    link: "/upcoming-cars",
    ctaLabel: "Get Notified",
    ctaSecondary: "View All EVs",
  },
  {
    image: heroImg3,
    title: "Mahindra BE 6e",
    subtitle: "Born Electric",
    description: "800V architecture, 0-100 in 6.7s, 682 km range. Mahindra's bold electric statement.",
    price: "₹18.90 – 26.90 Lakh",
    launchDate: "Launching Now",
    link: "/upcoming-cars",
    ctaLabel: "Book Now",
    ctaSecondary: "Compare EVs",
  },
];

export const RivianHero = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  const imageVariants = {
    enter: (dir: number) => ({ opacity: 0, scale: 1.1, x: dir > 0 ? 100 : -100 }),
    center: { opacity: 1, scale: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const } },
    exit: (dir: number) => ({ opacity: 0, scale: 1.05, x: dir > 0 ? -100 : 100, transition: { duration: 0.5 } }),
  };

  const textVariants = {
    enter: { opacity: 0, y: 40 },
    center: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.3, ease: "easeOut" as const } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
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
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </motion.div>
      </AnimatePresence>

      {/* Content — left-aligned like Rivian */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              variants={textVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="max-w-xl"
            >
              {/* Launch badge */}
              <div className="flex items-center gap-3 mb-6">
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/90 font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  {slide.launchDate}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 rounded-full px-4 py-1.5 text-sm text-emerald-300 font-medium">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {slide.price}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-2">
                {slide.title}
              </h1>
              <p className="text-xl md:text-2xl text-white/70 font-light mb-4">
                {slide.subtitle}
              </p>

              {/* Description */}
              <p className="text-base md:text-lg text-white/60 leading-relaxed mb-8 max-w-md">
                {slide.description}
              </p>

              {/* CTAs — Rivian style: pill buttons */}
              <div className="flex items-center gap-4">
                <Link to={slide.link}>
                  <Button
                    size="lg"
                    className="rounded-full bg-white text-black hover:bg-white/90 px-8 py-6 text-base font-semibold shadow-2xl hover:shadow-white/20 transition-all"
                  >
                    {slide.ctaLabel}
                  </Button>
                </Link>
                <Link to="/cars">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base font-semibold backdrop-blur-sm"
                  >
                    {slide.ctaSecondary}
                    <ArrowRight className="h-4 w-4 ml-2" />
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
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide indicators — bottom center like Rivian */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === current ? "w-8 bg-white" : "w-3 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};
