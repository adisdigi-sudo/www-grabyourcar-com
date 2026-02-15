import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export const CarLoanBankComparison = () => {
  const { data: partners = [] } = useQuery({
    queryKey: ["loan-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_partners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  if (partners.length === 0) return null;

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3 border-primary/30">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Compare Partners
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            Top Bank & NBFC Partners
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We've partnered with India's leading banks to get you the best rates
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {partners.map((partner, i) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all h-full group">
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{partner.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-muted-foreground">{partner.rating}</span>
                      </div>
                    </div>
                    {partner.highlight && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        {partner.highlight}
                      </Badge>
                    )}
                  </div>

                  {/* Rate */}
                  <div className="bg-primary/5 rounded-lg p-3 mb-4">
                    <p className="text-xs text-muted-foreground mb-0.5">Interest Rate</p>
                    <p className="text-xl font-bold text-primary">
                      {partner.interest_rate_min}% - {partner.interest_rate_max}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Processing Fee: {partner.processing_fee} · Max {partner.max_tenure_years} years
                    </p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 mb-4">
                    <ul className="space-y-1.5">
                      {(partner.features || []).slice(0, 3).map((f: string, j: number) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      document.getElementById("eligibility-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Check Eligibility <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
