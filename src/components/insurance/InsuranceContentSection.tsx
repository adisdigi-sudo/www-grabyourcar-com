import { motion } from "framer-motion";
import { Shield, FileText, Zap, Clock, Car, Star, Building2, Phone, CreditCard, Wrench, RefreshCw, Key, Umbrella, Battery } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
    desc: "Covers damages to others' vehicle, property, or injuries. Required by law under the Motor Vehicles Act, 1988.",
    color: "bg-blue-500",
  },
  {
    title: "Comprehensive Insurance",
    tag: "Recommended",
    desc: "Includes Third Party + own damage from accidents, theft, fire, natural disasters, and rat bites.",
    color: "bg-primary",
  },
  {
    title: "Zero Depreciation (Bumper-to-Bumper)",
    tag: "Premium",
    desc: "Full claim without depreciation deduction on parts. 100% cost coverage for replacements.",
    color: "bg-amber-500",
  },
  {
    title: "Own Damage Cover",
    tag: "Add-on",
    desc: "Standalone cover for damage to your own car from accidents, natural disasters, fire, or theft.",
    color: "bg-emerald-500",
  },
];

export function InsuranceContentSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* What is Car Insurance */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge className="mb-4" variant="secondary">Understanding Insurance</Badge>
          <h2 className="text-2xl md:text-4xl font-heading font-bold mb-6">
            What is Car Insurance?
          </h2>
          <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
            Car insurance provides financial protection against damages or losses to your vehicle from accidents, natural disasters, theft, or fire. A Comprehensive policy also covers third-party liabilities, ensuring you comply with the Motor Vehicles Act, 1988 while protecting your own car.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="mb-20">
          <h3 className="text-xl md:text-2xl font-heading font-bold text-center mb-10">
            Key Features of Online Car Insurance
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {keyFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all group">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-0.5">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Policy Types */}
        <div>
          <div className="text-center mb-10">
            <Badge className="mb-4" variant="secondary">Policy Types</Badge>
            <h3 className="text-xl md:text-2xl font-heading font-bold">
              Types of Car Insurance Policies
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {policyTypes.map((policy, i) => (
              <motion.div
                key={policy.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-3 h-3 rounded-full ${policy.color}`} />
                      <h4 className="font-heading font-bold text-base">{policy.title}</h4>
                      <Badge variant="outline" className="text-[10px] ml-auto">{policy.tag}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {policy.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
