import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceBannerProps {
  title: string;
  subtitle: string;
  highlightText?: string;
  ctaText?: string;
  ctaLink?: string;
  variant?: "primary" | "accent" | "gradient" | "dark";
  showContactButtons?: boolean;
  className?: string;
}

export const ServiceBanner = ({
  title,
  subtitle,
  highlightText,
  ctaText = "Get Started",
  ctaLink,
  variant = "primary",
  showContactButtons = true,
  className,
}: ServiceBannerProps) => {
  const variantStyles = {
    primary: "bg-primary text-primary-foreground",
    accent: "bg-amber-500 text-amber-950",
    gradient: "bg-gradient-to-r from-primary via-primary/90 to-primary-dark text-primary-foreground",
    dark: "bg-foreground text-background",
  };

  return (
    <section className={cn("py-4 md:py-5", variantStyles[variant], className)}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              {highlightText && (
                <span className={cn(
                  "inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide w-fit mx-auto md:mx-0",
                  variant === "accent" ? "bg-amber-700/20 text-amber-900" : "bg-white/20"
                )}>
                  {highlightText}
                </span>
              )}
              <h3 className="text-lg md:text-xl font-bold">{title}</h3>
            </div>
            <p className={cn(
              "text-sm mt-1",
              variant === "accent" ? "text-amber-900/80" : "opacity-90"
            )}>
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {showContactButtons && (
              <>
                <a href="https://wa.me/919855924442" target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    variant={variant === "accent" ? "default" : "secondary"}
                    className="gap-1.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                </a>
                <a href="tel:+919855924442">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "gap-1.5",
                      variant !== "accent" && "bg-transparent border-white/30 text-white hover:bg-white/10"
                    )}
                  >
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Call Now</span>
                  </Button>
                </a>
              </>
            )}
            {ctaLink && (
              <a href={ctaLink}>
                <Button
                  size="sm"
                  variant={variant === "accent" ? "default" : "secondary"}
                  className="gap-1.5"
                >
                  {ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
