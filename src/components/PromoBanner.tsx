import { TrendingUp, Flame, Timer, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Modern sleek supercar SVG
const ModernSupercar = ({ color, accentColor }: { color: string; accentColor: string }) => (
  <svg
    width="100"
    height="40"
    viewBox="0 0 100 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-xl"
  >
    {/* Speed trail effect */}
    <defs>
      <linearGradient id={`trail-${color}`} x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
        <stop offset="100%" stopColor={accentColor} stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id={`body-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={color} />
        <stop offset="50%" stopColor={color} />
        <stop offset="100%" stopColor={accentColor} />
      </linearGradient>
    </defs>
    
    {/* Speed lines */}
    <rect x="0" y="18" width="20" height="2" fill={`url(#trail-${color})`} rx="1" />
    <rect x="5" y="22" width="15" height="1.5" fill={`url(#trail-${color})`} rx="1" />
    <rect x="8" y="26" width="12" height="1" fill={`url(#trail-${color})`} rx="1" />
    
    {/* Car body - sleek modern design */}
    <path
      d="M25 28 L30 22 L38 18 L55 16 L70 16 L82 18 L90 22 L92 26 L92 30 L25 30 Z"
      fill={`url(#body-${color})`}
    />
    
    {/* Roof/cabin */}
    <path
      d="M42 18 L48 12 L62 12 L70 16 L42 16 Z"
      fill="rgba(0,0,0,0.3)"
    />
    
    {/* Windows */}
    <path
      d="M44 17 L49 13 L60 13 L66 16 L44 16 Z"
      fill="rgba(135,206,235,0.6)"
    />
    
    {/* Front headlight */}
    <ellipse cx="88" cy="24" rx="3" ry="2" fill="#fff" opacity="0.95" />
    <ellipse cx="88" cy="24" rx="2" ry="1" fill="#fef08a" opacity="0.8" />
    
    {/* Rear light */}
    <rect x="26" y="24" width="4" height="3" rx="1" fill="#ef4444" opacity="0.9" />
    
    {/* Body accent line */}
    <path
      d="M30 25 L88 25"
      stroke={accentColor}
      strokeWidth="1"
      opacity="0.8"
    />
    
    {/* Front wheel */}
    <circle cx="78" cy="30" r="6" fill="#1f2937" />
    <circle cx="78" cy="30" r="4" fill="#374151" />
    <circle cx="78" cy="30" r="2" fill="#6b7280" />
    {/* Wheel spokes */}
    <line x1="78" y1="26" x2="78" y2="34" stroke="#9ca3af" strokeWidth="0.5" />
    <line x1="74" y1="30" x2="82" y2="30" stroke="#9ca3af" strokeWidth="0.5" />
    
    {/* Rear wheel */}
    <circle cx="38" cy="30" r="6" fill="#1f2937" />
    <circle cx="38" cy="30" r="4" fill="#374151" />
    <circle cx="38" cy="30" r="2" fill="#6b7280" />
    {/* Wheel spokes */}
    <line x1="38" y1="26" x2="38" y2="34" stroke="#9ca3af" strokeWidth="0.5" />
    <line x1="34" y1="30" x2="42" y2="30" stroke="#9ca3af" strokeWidth="0.5" />
  </svg>
);

// Racing car data with colors
const racingCars = [
  { color: "#dc2626", accentColor: "#991b1b", name: "Ferrari" },
  { color: "#f97316", accentColor: "#c2410c", name: "McLaren" },
  { color: "#eab308", accentColor: "#a16207", name: "Lambo" },
  { color: "#22c55e", accentColor: "#15803d", name: "Aston" },
  { color: "#3b82f6", accentColor: "#1d4ed8", name: "Porsche" },
  { color: "#8b5cf6", accentColor: "#6d28d9", name: "Bugatti" },
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
    <div className="relative bg-gradient-to-r from-primary via-primary/95 to-success text-primary-foreground py-3 md:py-4 overflow-hidden shadow-lg">
      {/* Animated road pattern background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Road surface texture */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-transparent" />
        
        {/* Moving dashed center line */}
        <div className="absolute bottom-1 left-0 right-0 h-[2px] overflow-hidden">
          <motion.div
            className="flex gap-4 absolute"
            animate={{ x: [0, -80] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
          >
            {[...Array(50)].map((_, i) => (
              <div key={i} className="w-6 h-[2px] bg-white/20 rounded-full flex-shrink-0" />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Racing cars animation - continuous line racing */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute flex items-center gap-6"
          style={{ top: "50%", transform: "translateY(-50%)" }}
          animate={{ 
            x: ["100vw", "-800px"]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {racingCars.map((car, index) => (
            <div key={index} className="flex-shrink-0">
              <ModernSupercar color={car.color} accentColor={car.accentColor} />
            </div>
          ))}
        </motion.div>
        
        {/* Second wave of cars with offset */}
        <motion.div
          className="absolute flex items-center gap-6"
          style={{ top: "50%", transform: "translateY(-50%)" }}
          animate={{ 
            x: ["100vw", "-800px"]
          }}
          transition={{
            duration: 8,
            delay: 4,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {[...racingCars].reverse().map((car, index) => (
            <div key={index} className="flex-shrink-0">
              <ModernSupercar color={car.color} accentColor={car.accentColor} />
            </div>
          ))}
        </motion.div>
      </div>

    </div>
  );
};