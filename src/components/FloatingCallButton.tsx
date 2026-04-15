import { Phone } from "lucide-react";
import { PHONE_NUMBER } from "@/config/contact";
import { trackCallConversion } from "@/lib/adTracking";

/** Mobile-only sticky call button */
export const FloatingCallButton = () => {
  const handleClick = () => {
    trackCallConversion();
  };

  return (
    <a
      href={`tel:${PHONE_NUMBER}`}
      onClick={handleClick}
      className="fixed bottom-20 left-3 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-110 sm:hidden"
      aria-label="Call us"
    >
      <Phone className="h-5 w-5" />
    </a>
  );
};
