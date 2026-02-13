import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Calendar, Battery, Gauge } from "lucide-react";
import heroImg1 from "@/assets/hero-upcoming-1.jpg";
import heroImg2 from "@/assets/hero-upcoming-2.jpg";
import heroImg3 from "@/assets/hero-upcoming-3.jpg";

interface UpcomingCarSection {
  image: string;
  name: string;
  brand: string;
  tagline: string;
  specs: { icon: React.ReactNode; label: string; value: string }[];
  price: string;
  launchDate: string;
}

const upcomingCars: UpcomingCarSection[] = [
  {
    image: heroImg1,
    name: "Sierra EV",
    brand: "Tata Motors",
    tagline: "Adventure, Electrified",
    specs: [
      { icon: <Battery className="h-5 w-5" />, label: "Battery", value: "69 kWh" },
      { icon: <Gauge className="h-5 w-5" />, label: "Range", value: "500+ km" },
      { icon: <Zap className="h-5 w-5" />, label: "ADAS", value: "Level 2" },
    ],
    price: "₹25 – 35 Lakh*",
    launchDate: "Expected Q3 2026",
  },
  {
    image: heroImg2,
    name: "Model 3",
    brand: "Tesla",
    tagline: "The Future is Electric",
    specs: [
      { icon: <Battery className="h-5 w-5" />, label: "Battery", value: "60 kWh" },
      { icon: <Gauge className="h-5 w-5" />, label: "Range", value: "513 km" },
      { icon: <Zap className="h-5 w-5" />, label: "0-100", value: "6.1 sec" },
    ],
    price: "₹35 – 45 Lakh*",
    launchDate: "Expected 2026",
  },
  {
    image: heroImg3,
    name: "BE 6e",
    brand: "Mahindra",
    tagline: "Born Electric, Born Bold",
    specs: [
      { icon: <Battery className="h-5 w-5" />, label: "Architecture", value: "800V" },
      { icon: <Gauge className="h-5 w-5" />, label: "Range", value: "682 km" },
      { icon: <Zap className="h-5 w-5" />, label: "0-100", value: "6.7 sec" },
    ],
    price: "₹18.90 – 26.90 Lakh*",
    launchDate: "Available Now",
  },
];

const CarSection = ({ car, index }: { car: UpcomingCarSection; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.95, 1, 1, 0.95]);

  const isEven = index % 2 === 0;

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Full-bleed background */}
      <motion.div style={{ scale }} className="absolute inset-0">
        <img
          src={car.image}
          alt={`${car.brand} ${car.name}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className={`absolute inset-0 ${isEven 
          ? "bg-gradient-to-r from-black/85 via-black/50 to-transparent" 
          : "bg-gradient-to-l from-black/85 via-black/50 to-transparent"
        }`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y, opacity }}
        className={`relative z-10 container mx-auto px-6 md:px-12 lg:px-20 ${
          isEven ? "" : "flex justify-end"
        }`}
      >
        <div className="max-w-lg">
          {/* Brand */}
          <p className="text-white/50 text-sm tracking-[0.3em] uppercase font-medium mb-2">
            {car.brand}
          </p>

          {/* Name — large like Rivian's vehicle pages */}
          <h2 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-none mb-3">
            {car.name}
          </h2>
          <p className="text-xl md:text-2xl text-white/60 font-light mb-8">
            {car.tagline}
          </p>

          {/* Specs grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {car.specs.map((spec) => (
              <div key={spec.label} className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-emerald-400 mb-2">{spec.icon}</div>
                <p className="text-white font-bold text-lg">{spec.value}</p>
                <p className="text-white/40 text-xs uppercase tracking-wider">{spec.label}</p>
              </div>
            ))}
          </div>

          {/* Price & Launch */}
          <div className="flex items-center gap-4 mb-8">
            <span className="text-white font-semibold text-lg">{car.price}</span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1.5 text-white/60 text-sm">
              <Calendar className="h-4 w-4" />
              {car.launchDate}
            </span>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link to="/upcoming-cars">
              <Button
                size="lg"
                className="rounded-full bg-white text-black hover:bg-white/90 px-8 py-6 text-base font-semibold"
              >
                Get Launch Alert
              </Button>
            </Link>
            <Link to="/cars">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base font-semibold"
              >
                Explore <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export const UpcomingCarsShowcase = () => {
  return (
    <div>
      {/* Section intro */}
      <section className="bg-black py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-emerald-400 text-sm tracking-[0.3em] uppercase font-medium mb-4">
            Coming to India
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
            The Future is<br />Almost Here
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            From revolutionary EVs to next-gen SUVs — discover what's launching next on Indian roads
          </p>
        </motion.div>
      </section>

      {/* Full-screen car sections */}
      {upcomingCars.map((car, i) => (
        <CarSection key={car.name} car={car} index={i} />
      ))}

      {/* Bottom CTA */}
      <section className="bg-black py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-white/90 px-10 py-6 text-base font-semibold">
            <Link to="/upcoming-cars">
              View All Upcoming Cars <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </section>
    </div>
  );
};
