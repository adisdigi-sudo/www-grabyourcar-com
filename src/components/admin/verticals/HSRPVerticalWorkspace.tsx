import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2 } from "lucide-react";
import { HSRPManagement } from "../HSRPManagement";

export function HSRPVerticalWorkspace() {
  return (
    <div className="space-y-4">
      <Card className="border-teal-200 dark:border-teal-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950">
                <Shield className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">HSRP & FASTag</h2>
                <p className="text-xs text-muted-foreground">HSRP Plate Registrations, FASTag Issuance & Order Tracking</p>
              </div>
            </div>
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>
      <HSRPManagement />
    </div>
  );
}
