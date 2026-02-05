import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] active:bg-success active:text-success-foreground",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-success hover:text-success-foreground shadow-card hover:shadow-card-hover hover:scale-[1.02]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-success hover:text-success-foreground hover:border-success hover:scale-[1.02]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-success hover:text-success-foreground hover:scale-[1.02]",
        ghost: "hover:bg-success/10 hover:text-success",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom variants for Grabyourcar
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-card hover:shadow-accent-glow font-semibold hover:scale-[1.03]",
        hero: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-accent-glow font-semibold text-base hover:scale-[1.03]",
        cta: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-card hover:shadow-accent-glow font-semibold hover:scale-[1.03]",
        whatsapp: "bg-success text-success-foreground hover:bg-success/80 shadow-card font-semibold hover:scale-[1.05] hover:shadow-lg",
        call: "bg-primary text-primary-foreground hover:bg-success hover:text-success-foreground shadow-card font-semibold hover:scale-[1.03]",
        trust: "border-2 border-primary text-primary bg-transparent hover:bg-success hover:text-success-foreground hover:border-success hover:scale-[1.02]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
