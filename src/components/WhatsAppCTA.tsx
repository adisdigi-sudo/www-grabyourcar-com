import { Car, Bot, Sparkles, ChevronRight } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { leadEngineMessages, getWhatsAppUrl as getLeadEngineUrl } from "@/components/WhatsAppLeadEngine";

import { WHATSAPP_NUMBER } from "@/config/contact";

interface WhatsAppCTAProps extends Omit<ButtonProps, "variant"> {
  /** Pre-filled message for WhatsApp chat */
  message?: string;
  /** CTA label text */
  label?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Button variant override */
  variant?: "whatsapp" | "outline" | "ghost";
  /** Context for analytics (car name, page, etc.) */
  context?: string;
}

/**
 * Track WhatsApp CTA click in analytics
 */
const trackWhatsAppClick = async (context?: string, label?: string, page?: string) => {
  try {
    await supabase.from('analytics_events').insert({
      event_type: 'whatsapp_cta_click',
      page_url: window.location.pathname,
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
      event_data: {
        context: context || 'general',
        label: label || 'Chat on WhatsApp',
        page: page || window.location.pathname,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track WhatsApp click:', error);
  }
};

/**
 * Pre-configured WhatsApp messages for different contexts
 */
export const whatsappMessages = {
  // General
  general: "Hi GrabYourCar! 🚗\n\nI'm looking for a new car. Please help me find the best deal!\n\nThanks!",
  bestPrice: "Hi GrabYourCar! 💰\n\nI want to know the *best price* for a new car.\n\nPlease share available offers and discounts!\n\nThanks!",
  
  // Car-specific
  carPrice: (carName: string) => 
    `Hi GrabYourCar! 💰\n\nI want the *best on-road price* for *${carName}*.\n\nPlease share:\n✅ Complete price breakup\n✅ Current offers\n✅ Available stock\n\nThanks!`,
  carWaitingPeriod: (carName: string) => 
    `Hi GrabYourCar! ⏰\n\nWhat's the *current waiting period* for *${carName}*?\n\nDo you have any ready stock available?\n\nThanks!`,
  carTestDrive: (carName: string) => 
    `Hi GrabYourCar! 🚗\n\nI'd like to *book a test drive* for *${carName}*.\n\nPlease share nearest showroom details and available slots.\n\nThanks!`,
  carOffers: (carName: string) => 
    `Hi GrabYourCar! 🎁\n\nWhat are the *latest offers* on *${carName}*?\n\n• Cash discounts\n• Exchange bonus\n• Free accessories\n• Finance offers\n\nThanks!`,
  carBrochure: (carName: string) => 
    `Hi GrabYourCar! 📄\n\nPlease share the *official brochure* for *${carName}*.\n\nThanks!`,
  carCompare: (carName: string) =>
    `Hi GrabYourCar! 📊\n\nI need help *comparing variants* of *${carName}*.\n\nPlease guide me to choose the best one!\n\nThanks!`,
  
  // Services
  loan: "Hi GrabYourCar! 🏦\n\nI need a *car loan*.\n\nPlease share:\n• Best interest rates\n• EMI options\n• Required documents\n\nThanks!",
  loanForCar: (carName: string, loanAmount?: number) =>
    `Hi GrabYourCar! 🏦\n\nI need *EMI details* for *${carName}*${loanAmount ? ` (Loan: ₹${(loanAmount/100000).toFixed(1)}L)` : ''}.\n\nPlease share best financing options.\n\nThanks!`,
  insurance: "Hi GrabYourCar! 🛡️\n\nI want to *compare car insurance* quotes.\n\nPlease help me find the best deal!\n\nThanks!",
  insuranceForCar: (carName: string) =>
    `Hi GrabYourCar! 🛡️\n\nI need *insurance quotes* for *${carName}*.\n\nPlease share best premium rates and coverage options.\n\nThanks!`,
  hsrp: "Hi GrabYourCar! 🔖\n\nI need help with *HSRP registration*.\n\nPlease share the process and pricing.\n\nThanks!",
  
  // Dealer
  dealer: "Hi GrabYourCar! 📍\n\nI want to visit a *dealer near me*.\n\nPlease share nearest showroom details.\n\nThanks!",
  dealerSpecific: (dealerName: string, city: string) => 
    `Hi GrabYourCar! 📍\n\nI want to visit *${dealerName}* in *${city}*.\n\nPlease help me schedule a visit.\n\nThanks!`,
  
  // Corporate
  corporate: "Hi GrabYourCar! 🏢\n\nI'm interested in *corporate/fleet buying*.\n\nPlease share:\n• Bulk discounts\n• Fleet management options\n• Leasing solutions\n\nThanks!",
  
  // Accessories
  accessories: "Hi GrabYourCar! 🎁\n\nI'm interested in *car accessories*.\n\nPlease share the catalog and pricing.\n\nThanks!",
  
  // Expert
  speakToExpert: (carName?: string) =>
    carName 
      ? `Hi GrabYourCar! 👋\n\nI need *expert advice* on *${carName}*.\n\nPlease connect me with a car expert.\n\nThanks!`
      : `Hi GrabYourCar! 👋\n\nI need *expert advice* to choose the right car.\n\nPlease connect me with a car expert.\n\nThanks!`,
};

/**
 * Generate WhatsApp URL with pre-filled message
 */
export const getWhatsAppUrl = (message: string): string => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
};

/**
 * Reusable WhatsApp CTA button with pre-filled messages
 */
export const WhatsAppCTA = ({
  message = whatsappMessages.general,
  label = "Chat on WhatsApp",
  showIcon = true,
  variant = "whatsapp",
  context,
  className,
  size = "default",
  ...props
}: WhatsAppCTAProps) => {
  const whatsappUrl = getWhatsAppUrl(message);

  const handleClick = () => {
    trackWhatsAppClick(context, label);
    import("@/lib/adTracking").then(({ trackWhatsAppConversion }) => trackWhatsAppConversion(context));
  };

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex"
      onClick={handleClick}
    >
      <Button
        variant={variant}
        size={size}
        className={cn(
          "font-semibold hover:scale-105 transition-transform",
          className
        )}
        {...props}
      >
        {showIcon && <Car className="h-5 w-5 mr-2" />}
        {label}
      </Button>
    </a>
  );
};

/**
 * Floating WhatsApp button for quick access
 */
export const WhatsAppFloatingButton = ({
  message = whatsappMessages.general,
  className,
}: {
  message?: string;
  className?: string;
}) => {
  const whatsappUrl = getWhatsAppUrl(message);

  const handleClick = () => {
    trackWhatsAppClick('floating_button', 'Floating WhatsApp');
    import("@/lib/adTracking").then(({ trackWhatsAppConversion }) => trackWhatsAppConversion("floating_button"));
  };

  return (
    <div className={cn("fixed bottom-20 right-3 z-40 flex flex-col items-center gap-1 sm:bottom-24 sm:right-6", className)}>
      {/* Label */}
      <div className="hidden items-center gap-1 whitespace-nowrap rounded-full border border-success/30 bg-gradient-to-r from-card via-card to-success/10 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-lg glow-border-pulse sm:flex">
        <Car className="h-3 w-3 text-success" />
        <span>AutoBot</span>
        <Sparkles className="h-2.5 w-2.5 animate-pulse text-success" />
      </div>
      {/* Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-xl transition-all hover:scale-110 sm:h-14 sm:w-14 animate-bounce-slow autobot-glow"
        aria-label="Chat with AutoBot on WhatsApp"
        onClick={handleClick}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366]/40 animate-ping" />
        {/* Icon container with car + bot hybrid */}
        <div className="relative flex items-center justify-center">
          <Car className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-sm">
            <Bot className="h-2.5 w-2.5 text-[#25D366]" />
          </div>
        </div>
      </a>
    </div>
  );
};

/**
 * WhatsApp CTA with sales-driven label
 */
export const WhatsAppSalesCTA = ({
  carName,
  type = "price",
  size = "lg",
  className,
}: {
  carName?: string;
  type?: "price" | "waiting" | "testDrive" | "offers";
  size?: ButtonProps["size"];
  className?: string;
}) => {
  const labels: Record<typeof type, string> = {
    price: "Get On-Road Price",
    waiting: "Check Waiting Period",
    testDrive: "Book Test Drive",
    offers: "Unlock Offers",
  };

  const messages: Record<typeof type, string> = {
    price: carName ? whatsappMessages.carPrice(carName) : whatsappMessages.bestPrice,
    waiting: carName ? whatsappMessages.carWaitingPeriod(carName) : whatsappMessages.bestPrice,
    testDrive: carName ? whatsappMessages.carTestDrive(carName) : whatsappMessages.dealer,
    offers: carName ? whatsappMessages.carOffers(carName) : whatsappMessages.bestPrice,
  };

  return (
    <WhatsAppCTA
      label={labels[type]}
      message={messages[type]}
      size={size}
      className={className}
      context={carName ? `car_${type}_${carName}` : type}
    />
  );
};

/**
 * Compact WhatsApp button for card layouts
 */
export const WhatsAppCardButton = ({
  carName,
  className,
}: {
  carName: string;
  className?: string;
}) => {
  const whatsappUrl = getWhatsAppUrl(whatsappMessages.carPrice(carName));

  const handleClick = () => {
    trackWhatsAppClick(`car_listing_${carName}`, 'Unlock Best Price', '/cars');
  };

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 min-w-0"
      onClick={handleClick}
    >
      <Button
        variant="whatsapp"
        size="sm"
        className={cn(
          "w-full gap-1 font-semibold hover:scale-[1.02] transition-transform px-1.5 sm:px-2",
          className
        )}
      >
        <Car className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
        <span className="text-[9px] sm:text-xs whitespace-nowrap">Best Deal</span>
      </Button>
    </a>
  );
};

export default WhatsAppCTA;
