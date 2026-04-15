import { motion } from "framer-motion";
import { Shield, FileText, Zap, Clock, Car, Star, Building2, Phone, CreditCard, Wrench, RefreshCw, Key, Umbrella, Battery, ArrowRight, CheckCircle2 } from "lucide-react";

const keyFeatures = [
  { icon: CreditCard, title: "Low Premiums", desc: "Starting at ₹2,094* with up to 85% discount" },
  { icon: FileText, title: "Zero Paperwork", desc: "100% online — buy or renew in 2 minutes" },
  { icon: Zap, title: "Instant Claims", desc: "Minor claims settled instantly, majors within 7 days" },
  { icon: Star, title: "No Claim Bonus", desc: "Save up to 50% with consecutive claim-free years" },
  { icon: Building2, title: "4,000+ Garages", desc: "Cashless repairs at network garages across India" },
  { icon: Shield, title: "₹15L PA Cover", desc: "Personal Accident cover for the owner-driver" },
  { icon: RefreshCw, title: "Unlimited Claims", desc: "No limit on the number of claims per policy" },
  { icon: Car, title: "Pick & Drop", desc: "Free vehicle pickup & delivery during repairs" },
  { icon: Battery, title: "100% Battery", desc: "Full battery replacement without depreciation" },
  { icon: Phone, title: "24/7 Support", desc: "Round-the-clock assistance, just a call away" },
  { icon: Key, title: "Easy Renewal", desc: "Renew online with just your policy number" },
  { icon: Umbrella, title: "Total Convenience", desc: "Buy, renew, or claim anytime — even at midnight" },
];

const policyTypes = [
  {
    title: "Third Party Insurance",
    tag: "Mandatory",
    tagColor: "bg-blue-500/10 text-blue-600",
    desc: "Covers damages to others' vehicle, property, or injuries. Required by law under the Motor Vehicles Act, 1988.",
  },
  {
    title: "Comprehensive Insurance",
    tag: "Recommended",
    tagColor: "bg-primary/10 text-primary",
    desc: "Includes Third Party + own damage from accidents, theft, fire, natural disasters, and rat bites.",
  },
  {
    title: "Zero Depreciation",
    tag: "Premium",
    tagColor: "bg-chart-4/10 text-chart-4",
    desc: "Full claim without depreciation deduction on parts. 100% cost coverage for replacements.",
  },
  {
    title: "Own Damage Cover",
    tag: "Add-on",
    tagColor: "bg-chart-2/10 text-chart-2",
    desc: "Standalone cover for damage to your own car from accidents, natural disasters, fire, or theft.",
  },
];

export function InsuranceContentSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--muted)/0.5),transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* What is Car Insurance — Acko-style bold heading */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">
              What is <span className="text-primary">car insurance</span>?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Car insurance provides financial protection against damages or losses to your vehicle from accidents, natural disasters, theft, or fire. A Comprehensive policy also covers third-party liabilities, ensuring you comply with the Motor Vehicles Act, 1988 while protecting your own car.
            </p>
          </motion.div>
        </div>

        {/* Key Features — Clean grid cards */}
        <div className="mb-24">
          <motion.h3
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-heading font-bold text-center mb-12"
          >
            Key features of <span className="text-primary">online car insurance</span>
          </motion.h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {keyFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="group"
              >
                <div className="bg-card rounded-2xl border border-border/60 p-5 h-full hover:border-primary/30 hover:shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.08)] transition-all duration-500 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/8 group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors duration-300">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-foreground">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Policy Types — Acko-style large cards with arrows */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h3 className="text-2xl md:text-3xl font-heading font-bold">
              Types of car insurance <span className="text-primary">policies</span>
            </h3>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {policyTypes.map((policy, i) => (
              <motion.div
                key={policy.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group"
              >
                <div className="bg-card rounded-3xl border border-border/60 p-7 h-full hover:border-primary/30 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] transition-all duration-500">
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="font-heading font-bold text-lg text-foreground">{policy.title}</h4>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${policy.tagColor}`}>{policy.tag}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{policy.desc}</p>

                  {/* Acko-style arrow */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">Learn more</span>
                    <div className="w-9 h-9 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
