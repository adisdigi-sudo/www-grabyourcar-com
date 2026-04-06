import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Calculator, Layers3 } from "lucide-react";
import { motion } from "framer-motion";
import { FleetRequirementBuilder } from "./FleetRequirementBuilder";
import { LeaseVsBuyCalculator } from "./LeaseVsBuyCalculator";
import { CorporatePricingTiers } from "./CorporatePricingTiers";

export const CorporateFleetTools = () => {
  const [tab, setTab] = useState("planner");

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-14"
        >
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Plan Your Fleet
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Interactive tools to build requirements, compare ownership models, and explore pricing tiers.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 h-12">
              <TabsTrigger value="planner" className="gap-1.5 text-sm">
                <LayoutDashboard className="h-4 w-4" /> Fleet Planner
              </TabsTrigger>
              <TabsTrigger value="calculator" className="gap-1.5 text-sm">
                <Calculator className="h-4 w-4" /> Lease vs Buy
              </TabsTrigger>
              <TabsTrigger value="tiers" className="gap-1.5 text-sm">
                <Layers3 className="h-4 w-4" /> Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planner">
              <FleetRequirementBuilder />
            </TabsContent>

            <TabsContent value="calculator">
              <LeaseVsBuyCalculator />
            </TabsContent>

            <TabsContent value="tiers">
              <CorporatePricingTiers />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};
