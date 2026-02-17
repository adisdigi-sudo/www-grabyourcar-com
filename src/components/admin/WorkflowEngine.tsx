import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, CheckCircle, AlertTriangle, Lock, ArrowRight, Shield, FileText, Phone } from "lucide-react";

// Pre-configured workflow stages per vertical
const WORKFLOW_CONFIGS = {
  sales: {
    name: "Car Sales Pipeline",
    stages: [
      { id: "new_inquiry", label: "New Inquiry", required: ["name", "phone"] },
      { id: "test_drive", label: "Test Drive Scheduled", required: ["preferred_car"] },
      { id: "negotiation", label: "Price Negotiation", required: ["quoted_price"] },
      { id: "booking", label: "Booking Confirmed", required: ["booking_amount"], approval: true },
      { id: "documentation", label: "Documentation", required: ["kyc_docs"], docs: true },
      { id: "delivery", label: "Delivery", required: ["delivery_date"], approval: true },
      { id: "completed", label: "Completed", required: [] },
    ],
    guardrails: [
      { rule: "Mandatory call before test drive", active: true },
      { rule: "Booking requires manager approval above ₹50K discount", active: true },
      { rule: "Delivery blocked without KYC documents", active: true },
      { rule: "Lost reason mandatory when closing lead", active: true },
    ],
  },
  insurance: {
    name: "Insurance Lead Journey",
    stages: [
      { id: "new_lead", label: "New Lead", required: ["name", "phone"] },
      { id: "contacted", label: "Contacted", required: ["call_log"] },
      { id: "interested", label: "Interested", required: ["vehicle_details"] },
      { id: "quote_sent", label: "Quote Sent", required: ["quote_amount"] },
      { id: "negotiation", label: "Negotiation", required: [] },
      { id: "docs_pending", label: "Docs Pending", required: ["kyc"], docs: true },
      { id: "payment_pending", label: "Payment Pending", required: ["payment_link"] },
      { id: "won", label: "Won", required: ["policy_number", "premium"], approval: true },
      { id: "lost", label: "Lost", required: ["lost_reason"] },
    ],
    guardrails: [
      { rule: "Mandatory first call within 2 hours of lead creation", active: true },
      { rule: "Won requires policy document upload", active: true },
      { rule: "Lost requires detailed reason and remarks", active: true },
      { rule: "Auto-escalate if no activity for 48 hours", active: true },
    ],
  },
  loans: {
    name: "Car Loan Pipeline",
    stages: [
      { id: "new_lead", label: "New Lead", required: ["name", "phone", "income"] },
      { id: "credit_check", label: "Credit Check", required: ["pan_number"] },
      { id: "eligible", label: "Eligible", required: ["credit_score"] },
      { id: "docs_collection", label: "Document Collection", required: ["kyc", "income_proof"], docs: true },
      { id: "bank_submission", label: "Bank Submission", required: ["bank_name"] },
      { id: "sanctioned", label: "Sanctioned", required: ["sanction_letter"], approval: true },
      { id: "disbursement", label: "Disbursement Pending", required: ["agreement_signed"] },
      { id: "disbursed", label: "Disbursed", required: ["disbursement_proof"], approval: true },
      { id: "converted", label: "Converted", required: [] },
      { id: "lost", label: "Lost", required: ["lost_reason"] },
    ],
    guardrails: [
      { rule: "Credit check mandatory before eligibility", active: true },
      { rule: "All KYC documents required before bank submission", active: true },
      { rule: "Manager approval needed for sanction above ₹20L", active: true },
      { rule: "Mandatory disbursement proof upload", active: true },
      { rule: "Lost must have reason and competitor info", active: true },
    ],
  },
  rental: {
    name: "Rental Booking Flow",
    stages: [
      { id: "inquiry", label: "Inquiry", required: ["name", "phone"] },
      { id: "quote_shared", label: "Quote Shared", required: ["vehicle_type", "duration"] },
      { id: "confirmed", label: "Confirmed", required: ["advance_payment"] },
      { id: "vehicle_assigned", label: "Vehicle Assigned", required: ["vehicle_number"] },
      { id: "active", label: "Active Trip", required: [] },
      { id: "returned", label: "Returned", required: ["final_reading"] },
      { id: "completed", label: "Completed", required: ["final_bill"] },
    ],
    guardrails: [
      { rule: "KYC mandatory before vehicle handover", active: true },
      { rule: "Security deposit required for bookings > 7 days", active: true },
      { rule: "Damage report mandatory at return", active: false },
    ],
  },
};

type VerticalKey = keyof typeof WORKFLOW_CONFIGS;

export const WorkflowEngine = () => {
  const [activeVertical, setActiveVertical] = useState<VerticalKey>("sales");
  const config = WORKFLOW_CONFIGS[activeVertical];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" />
          Workflow Engine
        </h1>
        <p className="text-muted-foreground mt-1">Configurable stages, mandatory fields & approval checkpoints</p>
      </div>

      <Tabs value={activeVertical} onValueChange={(v) => setActiveVertical(v as VerticalKey)}>
        <TabsList>
          <TabsTrigger value="sales">🚗 Sales</TabsTrigger>
          <TabsTrigger value="insurance">🛡️ Insurance</TabsTrigger>
          <TabsTrigger value="loans">💰 Loans</TabsTrigger>
          <TabsTrigger value="rental">🚙 Rental</TabsTrigger>
        </TabsList>

        {Object.entries(WORKFLOW_CONFIGS).map(([key, cfg]) => (
          <TabsContent key={key} value={key} className="mt-4 space-y-6">
            {/* Pipeline Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{cfg.name} — Stage Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  {cfg.stages.map((stage, i) => (
                    <div key={stage.id} className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div className={`px-3 py-2 rounded-lg border text-center min-w-[100px] ${
                          stage.approval ? "border-amber-500/50 bg-amber-500/5" :
                          stage.docs ? "border-blue-500/50 bg-blue-500/5" :
                          stage.id === "lost" ? "border-red-500/50 bg-red-500/5" :
                          stage.id === "won" || stage.id === "completed" || stage.id === "converted" || stage.id === "disbursed"
                            ? "border-green-500/50 bg-green-500/5" : "border-border"
                        }`}>
                          <p className="text-xs font-medium">{stage.label}</p>
                          <div className="flex gap-1 mt-1 justify-center">
                            {stage.approval && <Lock className="h-3 w-3 text-amber-500" />}
                            {stage.docs && <FileText className="h-3 w-3 text-blue-500" />}
                            {stage.required.length > 0 && (
                              <Badge variant="outline" className="text-[8px] px-1">{stage.required.length} req</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {i < cfg.stages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-amber-500" /> Approval Required</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-blue-500" /> Document Upload</span>
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-red-500" /> Mandatory Fields</span>
                </div>
              </CardContent>
            </Card>

            {/* Guardrails */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Process Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cfg.guardrails.map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {g.active ? (
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm">{g.rule}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={g.active} />
                      <Label className="text-xs">{g.active ? "Active" : "Off"}</Label>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stage Requirements Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stage Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cfg.stages.filter((s) => s.required.length > 0).map((stage) => (
                    <div key={stage.id} className="p-3 border rounded-lg">
                      <p className="font-medium text-sm mb-2">{stage.label}</p>
                      <div className="space-y-1">
                        {stage.required.map((field) => (
                          <div key={field} className="flex items-center gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="capitalize">{field.replace(/_/g, " ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default WorkflowEngine;
