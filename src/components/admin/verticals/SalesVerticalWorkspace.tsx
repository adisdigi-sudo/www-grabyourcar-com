import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CheckCircle2 } from "lucide-react";
import { SalesWorkspace } from "../sales/SalesWorkspace";

export function SalesVerticalWorkspace() {
  return (
    <div className="space-y-4">
      <Card className="border-blue-200 dark:border-blue-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Car Sales Vertical</h2>
                <p className="text-xs text-muted-foreground">Lead Pipeline, Smart Calling, Quotes, Booking, Delivery & After Sales</p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>
      <SalesWorkspace />
    </div>
  );
}
