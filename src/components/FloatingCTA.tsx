import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FloatingCTA = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* WhatsApp Button */}
      <a
        href="https://wa.me/919855924442"
        target="_blank"
        rel="noopener noreferrer"
        className="group"
      >
        <Button
          variant="whatsapp"
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </a>

      {/* Call Button */}
      <a href="tel:+919855924442" className="group md:hidden">
        <Button
          variant="call"
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <Phone className="h-6 w-6" />
        </Button>
      </a>
    </div>
  );
};
