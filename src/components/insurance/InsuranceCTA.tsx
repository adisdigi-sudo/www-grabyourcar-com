import { motion } from "framer-motion";
import { Car, Phone, MessageCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppCTA, whatsappMessages } from "@/components/WhatsAppCTA";

export function InsuranceCTA() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Ready to Protect Your Car?
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8">
              Get the best car insurance quotes in just 2 minutes. Compare, choose, and buy online with instant policy issuance.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 text-base h-12 px-8"
              >
                <Car className="h-5 w-5" />
                Get Free Quote
              </Button>
              <WhatsAppCTA
                message={whatsappMessages.insurance}
                label="Get Insurance Quote"
                size="lg"
                className="h-12 px-8 text-base"
              />
              <a href="tel:+919855924442">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 text-base h-12 px-8 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                >
                  <Phone className="h-5 w-5" />
                  Talk to Expert
                </Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>24/7 Customer Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>98% Claim Settlement</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
