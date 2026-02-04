import { MessageCircle } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WHATSAPP_NUMBER = "919855924442";

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
 * Pre-configured WhatsApp messages for different contexts
 */
export const whatsappMessages = {
  // General
  general: "Hi Grabyourcar! I'm looking for a new car. Please help me find the best deal.",
  bestPrice: "Hi Grabyourcar! I want to know the best price for a new car.",
  
  // Car-specific
  carPrice: (carName: string) => 
    `Hi Grabyourcar! I want the best price for ${carName}. Please share the on-road price and available offers.`,
  carWaitingPeriod: (carName: string) => 
    `Hi Grabyourcar! What's the current waiting period for ${carName}? Also share the on-road price.`,
  carTestDrive: (carName: string) => 
    `Hi Grabyourcar! I'd like to book a test drive for ${carName}. Please share the nearest dealer details.`,
  carOffers: (carName: string) => 
    `Hi Grabyourcar! What are the latest offers and discounts on ${carName}?`,
  
  // Services
  loan: "Hi Grabyourcar! I need a car loan. Please share the best interest rates and EMI options.",
  insurance: "Hi Grabyourcar! I want to compare car insurance quotes. Please help me find the best deal.",
  hsrp: "Hi Grabyourcar! I need help with HSRP registration. Please share the process and pricing.",
  
  // Dealer
  dealer: "Hi Grabyourcar! I want to visit a dealer near me. Please share the nearest showroom details.",
  dealerSpecific: (dealerName: string, city: string) => 
    `Hi Grabyourcar! I want to visit ${dealerName} in ${city}. Please help me schedule a visit.`,
  
  // Corporate
  corporate: "Hi Grabyourcar! I'm interested in corporate/fleet buying. Please share the bulk purchase options and discounts.",
  
  // Accessories
  accessories: "Hi Grabyourcar! I'm interested in car accessories. Please share the catalog and pricing.",
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
  className,
  size = "default",
  ...props
}: WhatsAppCTAProps) => {
  const whatsappUrl = getWhatsAppUrl(message);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex"
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
        {showIcon && <MessageCircle className="h-5 w-5 mr-2" />}
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

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BD5A] shadow-lg flex items-center justify-center transition-all hover:scale-110",
        className
      )}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </a>
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
    />
  );
};

export default WhatsAppCTA;
