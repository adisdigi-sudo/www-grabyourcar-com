import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, CheckCircle2 } from "lucide-react";
import { SmartCallingQueue } from "./SmartCallingQueue";

export function CallingDashboard() {
  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <PhoneCall className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Smart Calling System</h2>
                <p className="text-xs text-muted-foreground">Auto-prioritized queue • Click-to-call • Forced disposition • Follow-up tracking</p>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>
      <SmartCallingQueue />
    </div>
  );
}
