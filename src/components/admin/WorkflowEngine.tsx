import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, CheckCircle, AlertTriangle, Lock, ArrowRight, Shield, FileText, Phone, Save, Loader2 } from "lucide-react";

// Pre-configured workflow stages per vertical
const WORKFLOW_CONFIGS = {
  sales: {
    name: "Car Sales Pipeline",
    stages: [
      { id: "new_inquiry", label: "New Inquiry", required: ["name", "phone"], order: 1 },
      { id: "test_drive", label: "Test Drive Scheduled", required: ["preferred_car"], order: 2 },
      { id: "negotiation", label: "Price Negotiation", required: ["quoted_price"], order: 3 },
      { id: "booking", label: "Booking Confirmed", required: ["booking_amount"], approval: true, order: 4 },
      { id: "documentation", label: "Documentation", required: ["kyc_docs"], docs: true, order: 5 },
      { id: "delivery", label: "Delivery", required: ["delivery_date"], approval: true, order: 6 },
      { id: "completed", label: "Completed", required: [], order: 7 },
    ],
    guardrails: [
      { id: "call_before_td", rule: "Mandatory call before test drive", active: true },
      { id: "booking_approval", rule: "Booking requires manager approval above ₹50K discount", active: true },
      { id: "kyc_block", rule: "Delivery blocked without KYC documents", active: true },
      { id: "lost_reason", rule: "Lost reason mandatory when closing lead", active: true },
    ],
  },
  insurance: {
    name: "Insurance Lead Journey",
    stages: [
      { id: "new_lead", label: "New Lead", required: ["name", "phone"], order: 1 },
      { id: "contacted", label: "Contacted", required: ["call_log"], order: 2 },
      { id: "interested", label: "Interested", required: ["vehicle_details"], order: 3 },
      { id: "quote_sent", label: "Quote Sent", required: ["quote_amount"], order: 4 },
      { id: "negotiation", label: "Negotiation", required: [], order: 5 },
      { id: "docs_pending", label: "Docs Pending", required: ["kyc"], docs: true, order: 6 },
      { id: "payment_pending", label: "Payment Pending", required: ["payment_link"], order: 7 },
      { id: "won", label: "Won", required: ["policy_number", "premium"], approval: true, order: 8 },
      { id: "lost", label: "Lost", required: ["lost_reason"], order: 9 },
    ],
    guardrails: [
      { id: "first_call", rule: "Mandatory first call within 2 hours of lead creation", active: true },
      { id: "won_docs", rule: "Won requires policy document upload", active: true },
      { id: "lost_detail", rule: "Lost requires detailed reason and remarks", active: true },
      { id: "auto_escalate", rule: "Auto-escalate if no activity for 48 hours", active: true },
    ],
  },
  loans: {
    name: "Car Loan Pipeline",
    stages: [
      { id: "new_lead", label: "New Lead", required: ["name", "phone", "income"], order: 1 },
      { id: "credit_check", label: "Credit Check", required: ["pan_number"], order: 2 },
      { id: "eligible", label: "Eligible", required: ["credit_score"], order: 3 },
      { id: "docs_collection", label: "Document Collection", required: ["kyc", "income_proof"], docs: true, order: 4 },
      { id: "bank_submission", label: "Bank Submission", required: ["bank_name"], order: 5 },
      { id: "sanctioned", label: "Sanctioned", required: ["sanction_letter"], approval: true, order: 6 },
      { id: "disbursement", label: "Disbursement Pending", required: ["agreement_signed"], order: 7 },
      { id: "disbursed", label: "Disbursed", required: ["disbursement_proof"], approval: true, order: 8 },
      { id: "converted", label: "Converted", required: [], order: 9 },
      { id: "lost", label: "Lost", required: ["lost_reason"], order: 10 },
    ],
    guardrails: [
      { id: "credit_first", rule: "Credit check mandatory before eligibility", active: true },
      { id: "kyc_bank", rule: "All KYC documents required before bank submission", active: true },
      { id: "mgr_approval", rule: "Manager approval needed for sanction above ₹20L", active: true },
      { id: "disburse_proof", rule: "Mandatory disbursement proof upload", active: true },
      { id: "lost_competitor", rule: "Lost must have reason and competitor info", active: true },
    ],
  },
  rental: {
    name: "Rental Booking Flow",
    stages: [
      { id: "inquiry", label: "Inquiry", required: ["name", "phone"], order: 1 },
      { id: "quote_shared", label: "Quote Shared", required: ["vehicle_type", "duration"], order: 2 },
      { id: "confirmed", label: "Confirmed", required: ["advance_payment"], order: 3 },
      { id: "vehicle_assigned", label: "Vehicle Assigned", required: ["vehicle_number"], order: 4 },
      { id: "active", label: "Active Trip", required: [], order: 5 },
      { id: "returned", label: "Returned", required: ["final_reading"], order: 6 },
      { id: "completed", label: "Completed", required: ["final_bill"], order: 7 },
    ],
    guardrails: [
      { id: "kyc_handover", rule: "KYC mandatory before vehicle handover", active: true },
      { id: "security_deposit", rule: "Security deposit required for bookings > 7 days", active: true },
      { id: "damage_report", rule: "Damage report mandatory at return", active: false },
    ],
  },
  hsrp: {
    name: "HSRP Booking Flow",
    stages: [
      { id: "new_booking", label: "New Booking", required: ["name", "phone", "vehicle_number"], order: 1 },
      { id: "payment_pending", label: "Payment Pending", required: ["payment_amount"], order: 2 },
      { id: "payment_done", label: "Payment Done", required: ["payment_proof"], order: 3 },
      { id: "appointment_scheduled", label: "Appointment Scheduled", required: ["appointment_date"], order: 4 },
      { id: "plate_fitted", label: "Plate Fitted", required: ["photo_proof"], order: 5 },
      { id: "completed", label: "Completed", required: [], order: 6 },
    ],
    guardrails: [
      { id: "payment_first", rule: "Payment must be verified before scheduling appointment", active: true },
      { id: "photo_mandatory", rule: "Photo proof mandatory after plate fitting", active: true },
    ],
  },
};

type VerticalKey = keyof typeof WORKFLOW_CONFIGS;

// Stage transition validation
export function validateStageTransition(
  vertical: VerticalKey,
  currentStage: string,
  targetStage: string,
  leadData: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const config = WORKFLOW_CONFIGS[vertical];
  if (!config) return { valid: false, errors: ["Unknown vertical"] };

  const currentIdx = config.stages.findIndex(s => s.id === currentStage);
  const targetIdx = config.stages.findIndex(s => s.id === targetStage);

  if (currentIdx === -1 || targetIdx === -1) return { valid: false, errors: ["Invalid stage"] };

  const errors: string[] = [];

  // Allow moving to "lost" from any stage
  if (targetStage !== "lost" && targetStage !== "won") {
    // Can't skip stages (only move forward by 1 or backward)
    if (targetIdx > currentIdx + 1) {
      errors.push(`Cannot skip stages. Move to "${config.stages[currentIdx + 1].label}" first.`);
    }
  }

  // Check required fields for target stage
  const targetConfig = config.stages[targetIdx];
  if (targetConfig.required.length > 0) {
    for (const field of targetConfig.required) {
      if (!leadData[field] && leadData[field] !== 0) {
        errors.push(`"${field.replace(/_/g, " ")}" is required for "${targetConfig.label}" stage`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Get guardrail state from DB (admin_settings table)
function useGuardrailSettings(vertical: VerticalKey) {
  return useQuery({
    queryKey: ["guardrail-settings", vertical],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", `workflow_guardrails_${vertical}`)
        .maybeSingle();
      return data?.setting_value as Record<string, boolean> | null;
    },
  });
}

export const WorkflowEngine = () => {
  const queryClient = useQueryClient();
  const [activeVertical, setActiveVertical] = useState<VerticalKey>("sales");
  const config = WORKFLOW_CONFIGS[activeVertical];

  const { data: savedGuardrails } = useGuardrailSettings(activeVertical);
  
  // Merge saved guardrails with defaults
  const [localGuardrails, setLocalGuardrails] = useState<Record<string, Record<string, boolean>>>({});

  const guardrailStates = useMemo(() => {
    const saved = savedGuardrails || {};
    const local = localGuardrails[activeVertical] || {};
    return config.guardrails.map(g => ({
      ...g,
      active: local[g.id] !== undefined ? local[g.id] : (saved[g.id] !== undefined ? saved[g.id] : g.active),
    }));
  }, [config.guardrails, savedGuardrails, localGuardrails, activeVertical]);

  const toggleGuardrail = useCallback((id: string) => {
    setLocalGuardrails(prev => ({
      ...prev,
      [activeVertical]: {
        ...(prev[activeVertical] || {}),
        [id]: !(prev[activeVertical]?.[id] ?? guardrailStates.find(g => g.id === id)?.active ?? true),
      }
    }));
  }, [activeVertical, guardrailStates]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const guardrailMap: Record<string, boolean> = {};
      guardrailStates.forEach(g => { guardrailMap[g.id] = g.active; });

      const { error } = await supabase.from("admin_settings").upsert({
        setting_key: `workflow_guardrails_${activeVertical}`,
        setting_value: guardrailMap as unknown as Record<string, unknown>,
        description: `Workflow guardrail settings for ${activeVertical}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guardrails saved!");
      queryClient.invalidateQueries({ queryKey: ["guardrail-settings", activeVertical] });
    },
    onError: () => toast.error("Failed to save guardrails"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            Workflow Engine
          </h1>
          <p className="text-muted-foreground mt-1">Enforced stage transitions, mandatory fields & approval checkpoints</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Tabs value={activeVertical} onValueChange={(v) => setActiveVertical(v as VerticalKey)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="sales">🚗 Sales</TabsTrigger>
          <TabsTrigger value="insurance">🛡️ Insurance</TabsTrigger>
          <TabsTrigger value="loans">💰 Loans</TabsTrigger>
          <TabsTrigger value="rental">🚙 Rental</TabsTrigger>
          <TabsTrigger value="hsrp">📋 HSRP</TabsTrigger>
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
                          stage.id === "lost" ? "border-destructive/50 bg-destructive/5" :
                          ["won", "completed", "converted", "disbursed"].includes(stage.id)
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
                          <div className="text-[9px] text-muted-foreground mt-1">Step {stage.order}</div>
                        </div>
                      </div>
                      {i < cfg.stages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-amber-500" /> Approval Required</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-blue-500" /> Document Upload</span>
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-destructive" /> Mandatory Fields</span>
                </div>

                {/* Enforcement Note */}
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-primary flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Stage transitions are enforced — leads cannot skip stages or advance without required fields
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Guardrails */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Process Guardrails
                  <Badge variant="secondary" className="text-xs">DB-Backed</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(key === activeVertical ? guardrailStates : cfg.guardrails).map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {g.active ? (
                        <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm">{g.rule}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={g.active}
                        onCheckedChange={() => key === activeVertical && toggleGuardrail(g.id)}
                      />
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
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{stage.label}</p>
                        <Badge variant="outline" className="text-[10px]">Step {stage.order}</Badge>
                      </div>
                      <div className="space-y-1">
                        {stage.required.map((field) => (
                          <div key={field} className="flex items-center gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-primary" />
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
