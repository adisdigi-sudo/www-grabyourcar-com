import { Badge } from "@/components/ui/badge";
import { Shield, Lock, FileCheck, Headphones, Users, BadgeCheck, Clock, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";

const trustItems = [
  { icon: Shield, title: "RBI Registered Partners", desc: "All our lending partners are registered with RBI" },
  { icon: Lock, title: "256-bit SSL Encryption", desc: "Your data is encrypted with bank-grade security" },
  { icon: FileCheck, title: "Transparent Process", desc: "No hidden charges, clear terms & conditions" },
  { icon: Headphones, title: "Dedicated Support", desc: "Personal loan advisor throughout your journey" },
  { icon: Users, title: "1 Lakh+ Happy Customers", desc: "Trusted by over 1 lakh car buyers across India" },
  { icon: BadgeCheck, title: "No Impact on CIBIL", desc: "Soft check only — your credit score stays safe" },
];

const documents = [
  { category: "Identity", items: ["Aadhaar Card", "PAN Card"] },
  { category: "Income (Salaried)", items: ["3-month salary slips", "6-month bank statement"] },
  { category: "Income (Self-Employed)", items: ["2-year ITR", "6-month bank statement"] },
  { category: "Vehicle", items: ["Proforma invoice", "Insurance quote"] },
];

export const CarLoanTrustSection = () => {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        {/* Trust Grid */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3 border-primary/30">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Trust & Security
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            Your Data is Safe With Us
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We follow strict security protocols and partner only with RBI-registered institutions
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto mb-16">
          {trustItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center p-5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/10"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Documents Checklist */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-heading font-bold text-foreground text-center mb-8">
            Documents Required
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {documents.map((doc, i) => (
              <div key={i} className="bg-muted/30 rounded-xl p-5 border border-border/50">
                <h4 className="font-semibold text-foreground mb-3 text-sm">{doc.category}</h4>
                <ul className="space-y-2">
                  {doc.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
