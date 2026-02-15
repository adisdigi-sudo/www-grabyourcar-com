import { motion } from "framer-motion";
import { Car, Phone, MessageCircle, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppCTA, whatsappMessages } from "@/components/WhatsAppCTA";

export function InsuranceCTA() {
  return (
    <section className="py-20 md:py-28 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Rich background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-foreground/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary-foreground/8 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--primary-foreground)) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-20 h-20 rounded-3xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-8">
              <Shield className="h-10 w-10" />
            </div>
            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-5 leading-tight">
              Ready to protect your car?
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
              Get the best car insurance quotes in just 2 minutes. Compare, choose, and buy online with instant policy issuance.
            </p>

            {/* Trust pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {["98% Claim Settlement", "20+ Insurers", "2 Min Instant Policy", "Zero Paperwork"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-4 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-chart-4" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" className="gap-2 text-base h-14 px-10 rounded-2xl font-bold shadow-xl">
                <Car className="h-5 w-5" />
                Get Free Quote
                <ArrowRight className="h-5 w-5" />
              </Button>
              <WhatsAppCTA message={whatsappMessages.insurance} label="Get Insurance Quote" size="lg" className="h-14 px-10 text-base rounded-2xl font-bold" />
              <a href="tel:+919855924442">
                <Button size="lg" variant="outline" className="gap-2 text-base h-14 px-10 rounded-2xl font-bold bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  <Phone className="h-5 w-5" />
                  Talk to Expert
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
