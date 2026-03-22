import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Fuel, Gauge, Clock, XCircle, Shield, IndianRupee } from "lucide-react";

const policies = [
  {
    id: "fuel",
    label: "Fuel Policy",
    icon: Fuel,
    items: [
      "Fuel is NOT included in the rental price",
      "Vehicle will be delivered with a specific fuel level",
      "Return the car with the same fuel level",
      "Refueling charges: ₹500 + actual fuel cost if returned low",
    ],
  },
  {
    id: "km",
    label: "KM Limits",
    icon: Gauge,
    items: [
      "Daily rentals: 300 KMs/day included",
      "Weekly rentals: 250 KMs/day included",
      "Monthly rentals: 200 KMs/day included",
      "Excess KM charges: ₹8/km for Hatchbacks, ₹10/km for SUVs",
    ],
  },
  {
    id: "late",
    label: "Late Returns",
    icon: Clock,
    items: [
      "Grace period: 30 minutes after scheduled return",
      "30 min - 3 hours late: ₹300 penalty",
      "3 - 6 hours late: Half-day rental charged",
      "6+ hours late: Full day rental charged",
    ],
  },
  {
    id: "cancel",
    label: "Cancellation",
    icon: XCircle,
    items: [
      "48+ hours before: Full refund",
      "24 - 48 hours: 50% refund",
      "12 - 24 hours: 25% refund",
      "Less than 12 hours: No refund",
    ],
  },
  {
    id: "deposit",
    label: "Security Deposit",
    icon: IndianRupee,
    items: [
      "Hatchback: ₹5,000 refundable deposit",
      "Sedan: ₹7,000 refundable deposit",
      "SUV: ₹10,000 refundable deposit",
      "Premium/Luxury: ₹15,000 - ₹25,000 refundable deposit",
      "Deposit refunded within 3-5 business days after return",
    ],
  },
  {
    id: "insurance",
    label: "Insurance",
    icon: Shield,
    items: [
      "Basic insurance included with all rentals",
      "Covers third-party liability",
      "Collision Damage Waiver (CDW): +₹200/day — reduces excess to ₹5,000",
      "Zero Excess Protection: +₹500/day — covers everything",
    ],
  },
];

export const RentalPolicies = () => (
  <section className="py-10 md:py-14 bg-muted/30">
    <div className="container mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Rental Policies</h2>
        <p className="text-muted-foreground">Transparent pricing and policies — no hidden charges</p>
      </div>

      <Tabs defaultValue="fuel" className="max-w-4xl mx-auto">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {policies.map((p) => {
            const Icon = p.icon;
            return (
              <TabsTrigger key={p.id} value={p.id} className="gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {p.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {policies.map((p) => (
          <TabsContent key={p.id} value={p.id}>
            <Card>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {p.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </section>
);
