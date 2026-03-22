import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, CreditCard, User, Calendar } from "lucide-react";

const requirements = [
  { icon: FileText, title: "Driving License", description: "Valid Indian DL (at least 1 year old)", required: true },
  { icon: User, title: "ID Proof", description: "Aadhaar Card or Passport", required: true },
  { icon: Calendar, title: "Age 21+", description: "Minimum age 21 years with valid DL", required: true },
  { icon: CreditCard, title: "Security Deposit", description: "Credit/Debit card or UPI for refundable deposit", required: true },
];

export const RentalDocRequirements = () => (
  <section className="py-6 border-b border-border bg-amber-50/50 dark:bg-amber-950/10">
    <div className="container mx-auto px-4">
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        <span className="text-sm font-medium text-foreground flex items-center gap-2">
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">Required</Badge>
          Documents for Booking:
        </span>
        {requirements.map((req, i) => {
          const Icon = req.icon;
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4 text-primary" />
              <span>{req.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
