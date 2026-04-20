import { CallingQueueWorkspace } from "../calling/CallingQueueWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneCall, ShieldCheck, AlertTriangle } from "lucide-react";

export function AccessoriesCallingPanel() {
  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-orange-600" />
            Calling Queue — Order Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verify every COD order via call before processing & dispatch
          </p>
        </div>
      </div>

      {/* COD Policy Banner */}
      <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 shrink-0">
              <ShieldCheck className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-orange-900 dark:text-orange-200">
                COD Verification Policy — Mandatory
              </p>
              <ul className="mt-1.5 space-y-0.5 text-orange-800/90 dark:text-orange-300/90 text-xs list-disc list-inside">
                <li>All COD orders must be confirmed by call before status is moved to <b>Processing</b></li>
                <li>Disposition must be marked as <b>Confirmed / Hot</b> to release the order to logistics</li>
                <li>If <b>Not Interested / Wrong Number / DND</b> → cancel order with reason in remarks</li>
                <li>If <b>Callback / No Answer</b> → 3 attempts before auto-cancel (24h SLA)</li>
              </ul>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-medium">Mandatory</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <CallingQueueWorkspace
        verticalSlug="accessories"
        verticalLabel="Accessories — COD Verify"
        accentClass="border-orange-200 dark:border-orange-900"
      />
    </div>
  );
}
