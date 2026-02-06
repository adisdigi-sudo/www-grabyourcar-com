import { TrendingUp, Flame, Timer, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Racing car SVG component
const RacingCar = ({ color, delay, speed }: { color: string; delay: number; speed: number }) => (
  <motion.div
    className="absolute top-1/2 -translate-y-1/2"
    initial={{ x: "100vw" }}
    animate={{ x: "-150px" }}
    transition={{
      duration: speed,
      delay: delay,
      repeat: Infinity,
      ease: "linear",
    }}
  >
    <svg
      width="80"
      height="32"
      viewBox="0 0 80 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-lg"
    >
      {/* Car body */}
      <path
        d="M12 20C12 20 16 12 28 10C40 8 52 8 60 10C68 12 72 16 72 20H12Z"
        fill={color}
      />
      {/* Windshield */}
      <path
        d="M30 10C30 10 32 6 40 6C48 6 52 8 54 10L30 10Z"
        fill="rgba(255,255,255,0.3)"
      />
      {/* Front wheel */}
      <circle cx="22" cy="22" r="6" fill="#1a1a1a" />
      <circle cx="22" cy="22" r="3" fill="#333" />
      {/* Rear wheel */}
      <circle cx="58" cy="22" r="6" fill="#1a1a1a" />
      <circle cx="58" cy="22" r="3" fill="#333" />
      {/* Headlight */}
      <ellipse cx="68" cy="16" rx="3" ry="2" fill="#fff" opacity="0.9" />
      {/* Speed lines */}
      <line x1="0" y1="14" x2="8" y2="14" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <line x1="2" y1="18" x2="10" y2="18" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1="4" y1="22" x2="10" y2="22" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>
  </motion.div>
);

// Different supercar colors
const carColors = [
  "#ef4444", // Red Ferrari
  "#f59e0b", // Orange Lambo
  "#3b82f6", // Blue Porsche
  "#10b981", // Green McLaren
  "#8b5cf6", // Purple Bugatti
];

export const PromoBanner = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 47,
    minutes: 59,
    seconds: 59,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative bg-gradient-to-r from-primary via-primary to-success text-primary-foreground py-2 md:py-3 overflow-hidden shadow-md">
      {/* Racing cars animation layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {carColors.map((color, index) => (
          <RacingCar
            key={index}
            color={color}
            delay={index * 1.5}
            speed={4 + index * 0.5}
          />
        ))}
      </div>

      {/* Road/track lines decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/30 -translate-y-1/2" />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 flex gap-8"
          animate={{ x: [0, -100] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(30)].map((_, i) => (
            <div key={i} className="w-8 h-1 bg-white/40 rounded-full" />
          ))}
        </motion.div>
      </div>

      <div className="container mx-auto px-3 md:px-4 relative z-10">
        {/* Mobile: Single line compact layout */}
        <div className="flex md:hidden items-center justify-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 animate-pulse flex-shrink-0" />
          <span className="font-heading font-bold truncate">
            Mega Savings Live — Up to ₹2.5L OFF
          </span>
          <span className="text-primary-foreground/60">•</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0 font-mono text-xs px-1.5 py-0">
              {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
            </Badge>
          </div>
        </div>

        {/* Desktop: Full layout - Premium Announcement Strip */}
        <div className="hidden md:flex items-center justify-center gap-8 text-center">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 animate-pulse" />
            <span className="font-heading font-bold text-base tracking-wide">
              🚗 Mega Savings Live
            </span>
          </div>
          
          <div className="w-px h-6 bg-primary-foreground/30" />
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Unlock Exclusive Dealer Offers Today — Up to ₹2,50,000 OFF</span>
          </div>
          
          <div className="w-px h-6 bg-primary-foreground/30" />
          
          <div className="flex items-center gap-3">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-medium">Ends in:</span>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="bg-primary-foreground/25 text-primary-foreground border-0 font-mono font-bold">
                {String(timeLeft.hours).padStart(2, "0")}h
              </Badge>
              <span className="font-bold">:</span>
              <Badge variant="secondary" className="bg-primary-foreground/25 text-primary-foreground border-0 font-mono font-bold">
                {String(timeLeft.minutes).padStart(2, "0")}m
              </Badge>
              <span className="font-bold">:</span>
              <Badge variant="secondary" className="bg-primary-foreground/25 text-primary-foreground border-0 font-mono font-bold">
                {String(timeLeft.seconds).padStart(2, "0")}s
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};