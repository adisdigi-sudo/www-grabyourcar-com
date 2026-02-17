import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banknote, CheckCircle2, LayoutDashboard, Users, Building2, BarChart3 } from "lucide-react";
import { LoanCRMDashboard } from "../LoanCRMDashboard";

export function LoansVerticalWorkspace() {
  return (
    <div className="space-y-4">
      <Card className="border-purple-200 dark:border-purple-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950">
                <Banknote className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Car Loans / Finance</h2>
                <p className="text-xs text-muted-foreground">Loan Pipeline, Applications, Bank Partners, EMI & Disbursement</p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>
      <LoanCRMDashboard />
    </div>
  );
}
