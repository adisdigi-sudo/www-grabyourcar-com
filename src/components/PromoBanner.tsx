import { Clock, TrendingUp, Flame, Timer } from "lucide-react";
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
    <div className="bg-accent text-accent-foreground py-3 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 animate-pulse" />
            <span className="font-heading font-bold text-sm md:text-base">
              🎉 Year-End Mega Sale!
            </span>
          </div>
          
          <div className="hidden md:block w-px h-6 bg-accent-foreground/30" />
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Up to ₹2,50,000 OFF on Select Models</span>
          </div>
          
          <div className="hidden md:block w-px h-6 bg-accent-foreground/30" />
          
          <div className="flex items-center gap-3">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-medium">Ends in:</span>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="bg-accent-foreground/20 text-accent-foreground border-0 font-mono">
                {String(timeLeft.hours).padStart(2, "0")}h
              </Badge>
              <span>:</span>
              <Badge variant="secondary" className="bg-accent-foreground/20 text-accent-foreground border-0 font-mono">
                {String(timeLeft.minutes).padStart(2, "0")}m
              </Badge>
              <span>:</span>
              <Badge variant="secondary" className="bg-accent-foreground/20 text-accent-foreground border-0 font-mono">
                {String(timeLeft.seconds).padStart(2, "0")}s
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
