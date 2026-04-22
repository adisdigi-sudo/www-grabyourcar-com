import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";

export const IncentivesTab = () => {
  return (
    <Card>
      <CardContent className="p-10 text-center text-muted-foreground space-y-2">
        <Award className="h-10 w-10 mx-auto opacity-40" />
        <p className="text-sm font-medium">Incentive Engine — Coming next</p>
        <p className="text-xs">Slab-based commission rules per vertical, auto-calculate per employee, approval & payout flow</p>
      </CardContent>
    </Card>
  );
};
