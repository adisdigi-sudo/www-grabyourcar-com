import { motion } from "framer-motion";

// Sleek F1-style supercar SVG
const SuperCar = ({ color, index }: { color: string; index: number }) => (
  <svg
    width="120"
    height="36"
    viewBox="0 0 120 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-lg"
  >
    <defs>
      <linearGradient id={`carGrad${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={color} stopOpacity="0.9" />
        <stop offset="100%" stopColor={color} />
      </linearGradient>
    </defs>
    
    {/* Speed blur lines */}
    <rect x="0" y="14" width="25" height="2" rx="1" fill="white" opacity="0.4" />
    <rect x="5" y="18" width="20" height="1.5" rx="1" fill="white" opacity="0.3" />
    <rect x="10" y="22" width="15" height="1" rx="1" fill="white" opacity="0.2" />
    
    {/* Main body */}
    <path
      d="M30 26 L35 18 L50 14 L75 12 L95 12 L108 16 L115 22 L115 28 L30 28 Z"
      fill={`url(#carGrad${index})`}
    />
    
    {/* Cockpit/Window */}
    <path
      d="M55 14 L62 8 L80 8 L88 12 L55 12 Z"
      fill="rgba(50,50,50,0.8)"
    />
    <path
      d="M58 13 L64 9 L78 9 L84 12 L58 12 Z"
      fill="rgba(100,180,255,0.5)"
    />
    
    {/* Front spoiler */}
    <path
      d="M108 20 L118 18 L118 24 L112 24 Z"
      fill={color}
      opacity="0.9"
    />
    
    {/* Rear wing */}
    <rect x="28" y="8" width="8" height="3" rx="1" fill={color} opacity="0.8" />
    <rect x="30" y="11" width="4" height="6" fill={color} opacity="0.6" />
    
    {/* Headlights */}
    <ellipse cx="112" cy="20" rx="2" ry="3" fill="white" opacity="0.95" />
    
    {/* Tail lights */}
    <rect x="30" y="22" width="3" height="4" rx="1" fill="#ff3333" opacity="0.9" />
    
    {/* Front wheel */}
    <ellipse cx="100" cy="28" rx="8" ry="6" fill="#1a1a1a" />
    <ellipse cx="100" cy="28" rx="5" ry="4" fill="#333" />
    <ellipse cx="100" cy="28" rx="2" ry="1.5" fill="#666" />
    
    {/* Rear wheel */}
    <ellipse cx="48" cy="28" rx="8" ry="6" fill="#1a1a1a" />
    <ellipse cx="48" cy="28" rx="5" ry="4" fill="#333" />
    <ellipse cx="48" cy="28" rx="2" ry="1.5" fill="#666" />
    
    {/* Body details */}
    <path d="M40 24 L105 22" stroke="white" strokeWidth="0.5" opacity="0.3" />
  </svg>
);

// Supercar colors - Ferrari, Lambo, McLaren, Porsche, Bugatti, Aston Martin
const carColors = [
  "#e11d48", // Rose/Ferrari Red
  "#f97316", // Orange/McLaren
  "#facc15", // Yellow/Lambo
  "#22c55e", // Green/Aston
  "#3b82f6", // Blue/Porsche
  "#a855f7", // Purple/Bugatti
  "#06b6d4", // Cyan/Maserati
  "#ef4444", // Red variant
];

export const PromoBanner = () => {
  return (
    <div className="relative h-12 md:h-14 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden shadow-lg">
      {/* Racing track lines */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top track line */}
        <div className="absolute top-2 left-0 right-0 h-px bg-white/10" />
        {/* Bottom track line */}
        <div className="absolute bottom-2 left-0 right-0 h-px bg-white/10" />
        
        {/* Animated road markings */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 overflow-hidden">
          <motion.div
            className="flex gap-6 absolute whitespace-nowrap"
            animate={{ x: [0, -120] }}
            transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
          >
            {[...Array(40)].map((_, i) => (
              <div key={i} className="w-10 h-0.5 bg-yellow-400/40 rounded-full flex-shrink-0" />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Racing supercars - Wave 1 */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 flex items-center gap-10"
        initial={{ x: "100vw" }}
        animate={{ x: "-1200px" }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {carColors.map((color, index) => (
          <SuperCar key={`w1-${index}`} color={color} index={index} />
        ))}
      </motion.div>

      {/* Racing supercars - Wave 2 (staggered) */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 flex items-center gap-10"
        initial={{ x: "100vw" }}
        animate={{ x: "-1200px" }}
        transition={{
          duration: 3,
          delay: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {[...carColors].reverse().map((color, index) => (
          <SuperCar key={`w2-${index}`} color={color} index={index + 10} />
        ))}
      </motion.div>

      {/* Checkered flag pattern on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10" />
      
    </div>
  );
};