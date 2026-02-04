import { useEffect, useRef, useState } from "react";
import { useInView, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export const AnimatedCounter = ({ 
  value, 
  suffix = "", 
  prefix = "",
  duration = 2000 
}: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hasAnimated, setHasAnimated] = useState(false);

  const spring = useSpring(0, { 
    mass: 0.8, 
    stiffness: 75, 
    damping: 15,
    restDelta: 0.001 
  });
  
  const display = useTransform(spring, (current) => Math.round(current));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      spring.set(value);
      setHasAnimated(true);
    }
  }, [isInView, value, spring, hasAnimated]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [display]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};
