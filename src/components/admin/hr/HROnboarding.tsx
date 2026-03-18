import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { UserPlus, CheckCircle2, Circle, ClipboardList, Plus } from "lucide-react";

const DEFAULT_STEPS = [
  "Assign Role & Manager",
  "Upload ID Proof",
  "Upload Offer Letter",
  "Upload Salary Agreement",
  "Set KPI Targets",
  "System Access Created",
  "Welcome Kit Delivered",
  "First Day Orientation",
];

export const HROnboarding = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("*").order("full_name");
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

  // Group by employee
  const grouped = onboardingData.reduce((acc: any, item: any) => {
    if (!acc[item.employee_id]) acc[item.employee_id] = { name: item.employee_name, steps: [] };
    acc[item.employee_id].steps.push(item);
    return acc;
  }, {});

  const initOnboarding = useMutation({
    mutationFn: async ({ employeeId, employeeName }: { employeeId: string; employeeName: string }) => {
      const steps = DEFAULT_STEPS.map((s, i) => ({
        employee_id: employeeId,
        employee_name: employeeName,
        step_name: s,
        step_order: i + 1,
        is_completed: false,
      }));
      const { error } = await (supabase.from("hr_onboarding") as any).insert(steps);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-onboarding"] });
      toast.success("Onboarding checklist created");
      setShowNew(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Employee Onboarding</h2>
          <p className="text-sm text-muted-foreground">{Object.keys(grouped).length} active onboardings</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" /> Start Onboarding</Button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No active onboardings. Click "Start Onboarding" to begin.</p>
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
                    <Badge className={pct === 100 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {pct}%
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.steps.map((step: any) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={step.is_completed}
                        onCheckedChange={(checked) => toggleStep.mutate({ id: step.id, completed: !!checked })}
                      />
                      <span className={`text-sm ${step.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {step.step_name}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Employee Onboarding</DialogTitle></DialogHeader>
          <div>
            <Label>Select Employee</Label>
            <Select value={form.employee_id || ""} onValueChange={v => {
              const emp = employees.find((e: any) => e.id === v);
              setForm({ employee_id: v, employee_name: emp?.full_name || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
              <SelectContent>
                {employees.filter((e: any) => !grouped[e.id]).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!form.employee_id} onClick={() => initOnboarding.mutate({
              employeeId: form.employee_id,
              employeeName: form.employee_name,
            })}>Create Checklist</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HROnboarding;
