import { TrendingUp, Flame, Timer, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

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
    <div className="bg-gradient-to-r from-primary via-primary to-success text-primary-foreground py-2 md:py-3 overflow-hidden shadow-md">
      <div className="container mx-auto px-3 md:px-4">
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
