import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, CheckCircle2, ClipboardList, Plus, Users, IndianRupee, Shield, Building2, Clock } from "lucide-react";

const DEFAULT_STEPS = [
  "Assign Role & Manager",
  "Set CTC & Salary Structure",
  "Upload ID Proof",
  "Upload Offer Letter",
  "Upload Salary Agreement",
  "Generate Welcome Letter",
  "Set KPI Targets",
  "System Access Created",
  "Welcome Kit Delivered",
  "First Day Orientation",
];

const ROLES = ["employee", "team_lead", "manager", "senior_manager", "head"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "freelancer"];

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const HROnboarding = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [step, setStep] = useState(1); // wizard step
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: verticals = [] } = useQuery({
    queryKey: ["business-verticals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_verticals").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("is_active", true).order("display_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: onboardingData = [] } = useQuery({
    queryKey: ["hr-onboarding"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("hr_onboarding") as any).select("*").order("step_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["employee-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_profiles") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const grouped = onboardingData.reduce((acc: any, item: any) => {
    if (!acc[item.employee_id]) acc[item.employee_id] = { name: item.employee_name, steps: [] };
    acc[item.employee_id].steps.push(item);
    return acc;
  }, {});

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const emp = employees.find((e: any) => e.id === form.employee_id);
      const vertical = verticals.find((v: any) => v.id === form.vertical_id);
      const manager = teamMembers.find((m: any) => m.user_id === form.manager_user_id);
      const monthlyCTC = Number(form.monthly_ctc || 0);
      const basic = Math.round(monthlyCTC * 0.4);
      const hra = Math.round(monthlyCTC * 0.2);
      const da = Math.round(monthlyCTC * 0.1);
      const special = Math.round(monthlyCTC * 0.3);
      const pf = Math.round(basic * 0.12);
      const esi = monthlyCTC <= 21000 ? Math.round(monthlyCTC * 0.0075) : 0;

      // 1. Create employee profile
      const { error: profileError } = await (supabase.from("employee_profiles") as any).insert({
        user_id: emp?.user_id || null,
        team_member_id: form.employee_id,
        full_name: emp?.full_name || form.employee_name,
        email: emp?.email,
        phone: emp?.phone,
        designation: form.designation || emp?.designation,
        department: form.department || emp?.department,
        role: form.role || "employee",
        manager_user_id: form.manager_user_id || null,
        manager_name: manager?.display_name || form.manager_name || "",
        vertical_id: form.vertical_id || null,
        vertical_name: vertical?.name || "",
        monthly_ctc: monthlyCTC,
        basic_salary: basic,
        hra,
        da,
        special_allowance: special,
        pf_deduction: pf,
        esi_deduction: esi,
        professional_tax: Number(form.professional_tax || 200),
        tds: Number(form.tds || 0),
        joining_date: form.joining_date || new Date().toISOString().split("T")[0],
        probation_end_date: form.probation_end_date || null,
        employment_type: form.employment_type || "full_time",
        working_days_per_month: Number(form.working_days || 26),
        shift_start: form.shift_start || "09:00",
        shift_end: form.shift_end || "18:00",
        grace_minutes: Number(form.grace_minutes || 15),
        onboarded_by: user?.id,
      });
      if (profileError) throw profileError;

      // 2. Create onboarding checklist
      const steps = DEFAULT_STEPS.map((s, i) => ({
        employee_id: form.employee_id,
        employee_name: emp?.full_name || form.employee_name,
        step_name: s,
        step_order: i + 1,
        is_completed: i < 2, // First 2 steps auto-completed
      }));
      const { error: stepsError } = await (supabase.from("hr_onboarding") as any).insert(steps);
      if (stepsError) throw stepsError;

      // 3. Generate welcome letter document
      const { error: docError } = await (supabase.from("employee_documents") as any).insert({
        employee_user_id: emp?.user_id || user?.id,
        employee_name: emp?.full_name || form.employee_name,
        employee_id: form.employee_id,
        document_type: "welcome_letter",
        document_name: `Welcome Letter - ${emp?.full_name || form.employee_name}`,
        generated_data: {
          name: emp?.full_name || form.employee_name,
          designation: form.designation,
          department: form.department,
          vertical: vertical?.name,
          manager: manager?.display_name || form.manager_name,
          joining_date: form.joining_date,
          ctc: monthlyCTC,
        },
      });
      if (docError) console.error("Doc error:", docError);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-onboarding"] });
      qc.invalidateQueries({ queryKey: ["employee-profiles"] });
      toast.success("Employee onboarded successfully! 🎉");
      setShowNew(false);
      setStep(1);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStep = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await (supabase.from("hr_onboarding") as any).update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: user?.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-onboarding"] }),
  });

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const monthlyCTC = Number(form.monthly_ctc || 0);
  const calcBasic = Math.round(monthlyCTC * 0.4);
  const calcHRA = Math.round(monthlyCTC * 0.2);
  const calcDA = Math.round(monthlyCTC * 0.1);
  const calcSpecial = Math.round(monthlyCTC * 0.3);
  const calcPF = Math.round(calcBasic * 0.12);
  const calcESI = monthlyCTC <= 21000 ? Math.round(monthlyCTC * 0.0075) : 0;
  const calcNet = monthlyCTC - calcPF - calcESI - Number(form.professional_tax || 200) - Number(form.tds || 0);

  const renderWizardStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Personal & Team Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Select Employee</Label>
                <Select value={form.employee_id || ""} onValueChange={v => {
                  const emp = employees.find((e: any) => e.id === v);
                  updateField("employee_id", v);
                  updateField("employee_name", emp?.full_name || "");
                  updateField("designation", emp?.designation || "");
                  updateField("department", emp?.department || "");
                }}>
                  <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter((e: any) => !grouped[e.id]).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation</Label>
                <Input value={form.designation || ""} onChange={e => updateField("designation", e.target.value)} placeholder="e.g. Sales Executive" />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={form.department || ""} onChange={e => updateField("department", e.target.value)} placeholder="e.g. Insurance" />
              </div>
              <div>
                <Label>Role Level</Label>
                <Select value={form.role || "employee"} onValueChange={v => updateField("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign Vertical</Label>
                <Select value={form.vertical_id || ""} onValueChange={v => updateField("vertical_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
                  <SelectContent>
                    {verticals.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign Manager</Label>
                <Select value={form.manager_user_id || ""} onValueChange={v => {
                  const mgr = teamMembers.find((m: any) => m.user_id === v);
                  updateField("manager_user_id", v);
                  updateField("manager_name", mgr?.display_name || "");
                }}>
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employment Type</Label>
                <Select value={form.employment_type || "full_time"} onValueChange={v => updateField("employment_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Joining Date</Label>
                <Input type="date" value={form.joining_date || ""} onChange={e => updateField("joining_date", e.target.value)} />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><IndianRupee className="h-4 w-4" /> CTC & Salary Structure</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Monthly CTC (₹)</Label>
                <Input type="number" value={form.monthly_ctc || ""} onChange={e => updateField("monthly_ctc", e.target.value)} placeholder="e.g. 25000" />
              </div>
            </div>
            {monthlyCTC > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold">Auto-Calculated Breakdown:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Basic (40%)</span><span className="font-medium">{fmt(calcBasic)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">HRA (20%)</span><span className="font-medium">{fmt(calcHRA)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">DA (10%)</span><span className="font-medium">{fmt(calcDA)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Special (30%)</span><span className="font-medium">{fmt(calcSpecial)}</span></div>
                    <div className="flex justify-between text-red-600"><span>PF (12% of Basic)</span><span>-{fmt(calcPF)}</span></div>
                    {calcESI > 0 && <div className="flex justify-between text-red-600"><span>ESI</span><span>-{fmt(calcESI)}</span></div>}
                    <div className="flex justify-between text-red-600"><span>Prof. Tax</span><span>-{fmt(Number(form.professional_tax || 200))}</span></div>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Net Take-Home</span><span className="text-green-600">{fmt(calcNet)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Professional Tax</Label><Input type="number" value={form.professional_tax || "200"} onChange={e => updateField("professional_tax", e.target.value)} /></div>
              <div><Label>TDS</Label><Input type="number" value={form.tds || "0"} onChange={e => updateField("tds", e.target.value)} /></div>
              <div><Label>Annual CTC</Label><Input disabled value={fmt(monthlyCTC * 12)} /></div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Work Schedule & Policies</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Working Days/Month</Label><Input type="number" value={form.working_days || "26"} onChange={e => updateField("working_days", e.target.value)} /></div>
              <div><Label>Grace Minutes (Late)</Label><Input type="number" value={form.grace_minutes || "15"} onChange={e => updateField("grace_minutes", e.target.value)} /></div>
              <div><Label>Shift Start</Label><Input type="time" value={form.shift_start || "09:00"} onChange={e => updateField("shift_start", e.target.value)} /></div>
              <div><Label>Shift End</Label><Input type="time" value={form.shift_end || "18:00"} onChange={e => updateField("shift_end", e.target.value)} /></div>
              <div><Label>Probation End Date</Label><Input type="date" value={form.probation_end_date || ""} onChange={e => updateField("probation_end_date", e.target.value)} /></div>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Onboarding Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Employee:</span> <strong>{form.employee_name || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Role:</span> <strong>{form.role || "employee"}</strong></div>
                  <div><span className="text-muted-foreground">Manager:</span> <strong>{form.manager_name || "—"}</strong></div>
                  <div><span className="text-muted-foreground">CTC:</span> <strong>{fmt(monthlyCTC)}/mo</strong></div>
                  <div><span className="text-muted-foreground">Vertical:</span> <strong>{verticals.find((v: any) => v.id === form.vertical_id)?.name || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Net Salary:</span> <strong className="text-green-600">{fmt(calcNet)}/mo</strong></div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Employee Onboarding</h2>
          <p className="text-sm text-muted-foreground">{Object.keys(grouped).length} active · {profiles.length} onboarded</p>
        </div>
        <Button onClick={() => { setShowNew(true); setStep(1); setForm({}); }}><Plus className="h-4 w-4 mr-2" /> Onboard Employee</Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Onboardings ({Object.keys(grouped).length})</TabsTrigger>
          <TabsTrigger value="completed">Onboarded Employees ({profiles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {Object.keys(grouped).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active onboardings. Click "Onboard Employee" to begin.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(grouped).map(([empId, data]: [string, any]) => {
                const completed = data.steps.filter((s: any) => s.is_completed).length;
                const total = data.steps.length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <Card key={empId}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{data.name}</CardTitle>
                        <Badge className={pct === 100 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{pct}%</Badge>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {data.steps.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <Checkbox checked={s.is_completed} onCheckedChange={(checked) => toggleStep.mutate({ id: s.id, completed: !!checked })} />
                          <span className={`text-sm ${s.is_completed ? "line-through text-muted-foreground" : ""}`}>{s.step_name}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{p.full_name}</h4>
                    <Badge variant="outline">{p.role}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{p.designation} · {p.department}</p>
                    <p>Vertical: {p.vertical_name || "—"}</p>
                    <p>Manager: {p.manager_name || "—"}</p>
                    <p>CTC: {fmt(p.monthly_ctc)}/mo · Net: {fmt(p.monthly_ctc - (p.pf_deduction || 0) - (p.esi_deduction || 0) - (p.professional_tax || 0) - (p.tds || 0))}/mo</p>
                    <p>Joined: {p.joining_date ? format(new Date(p.joining_date), "dd MMM yyyy") : "—"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {profiles.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-8">No employees onboarded yet.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Onboarding Wizard Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Onboard New Employee — Step {step} of 3</DialogTitle>
            <Progress value={(step / 3) * 100} className="h-1.5 mt-2" />
          </DialogHeader>
          {renderWizardStep()}
          <DialogFooter className="flex justify-between">
            <div>
              {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              {step < 3 ? (
                <Button disabled={step === 1 && !form.employee_id} onClick={() => setStep(s => s + 1)}>Next</Button>
              ) : (
                <Button onClick={() => completeOnboarding.mutate()} disabled={completeOnboarding.isPending}>
                  {completeOnboarding.isPending ? "Creating..." : "Complete Onboarding"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HROnboarding;
