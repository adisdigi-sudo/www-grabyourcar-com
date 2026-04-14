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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Target, Brain, Award, Plus, TrendingUp, BarChart3, Star, Users } from "lucide-react";

const DESIGNATIONS = [
  "Sales Executive", "Insurance Executive", "Loan Executive", "Telecaller",
  "Team Leader", "Manager", "Senior Manager", "Operations Executive",
  "HR Executive", "Marketing Executive", "Accounts Executive", "HSRP Executive",
  "Accessories Executive", "Self-Drive Executive", "Dealer Manager",
];

const VERTICALS = [
  "Car Sales", "Insurance", "Car Loans", "HSRP", "Self Drive",
  "Accessories", "Marketing", "Accounts", "HR", "Operations",
  "Telecalling", "Dealer Network",
];

const KSA_CATEGORIES = [
  { value: "knowledge", label: "Knowledge", icon: Brain, color: "bg-blue-100 text-blue-800" },
  { value: "skill", label: "Skills", icon: Target, color: "bg-green-100 text-green-800" },
  { value: "attitude", label: "Attitude", icon: Star, color: "bg-purple-100 text-purple-800" },
];

const DEFAULT_KRA_TEMPLATES: Record<string, { name: string; weight: number; criteria: string }[]> = {
  "Sales Executive": [
    { name: "Revenue Generation", weight: 40, criteria: "Monthly sales revenue vs target" },
    { name: "Lead Conversion", weight: 25, criteria: "% of leads converted to deals" },
    { name: "Customer Follow-up", weight: 20, criteria: "Follow-up adherence & timeliness" },
    { name: "Documentation & Compliance", weight: 15, criteria: "Timely paperwork & CRM updates" },
  ],
  "Insurance Executive": [
    { name: "Premium Collection", weight: 35, criteria: "Monthly premium revenue vs target" },
    { name: "Policy Renewals", weight: 25, criteria: "Renewal conversion rate" },
    { name: "New Business Acquisition", weight: 25, criteria: "New policies issued per month" },
    { name: "Customer Retention", weight: 15, criteria: "Client retention & satisfaction score" },
  ],
  "Telecaller": [
    { name: "Call Volume", weight: 30, criteria: "Daily calls made vs target" },
    { name: "Lead Qualification", weight: 30, criteria: "% of qualified leads generated" },
    { name: "Appointment Setting", weight: 25, criteria: "Appointments booked for executives" },
    { name: "Data Quality", weight: 15, criteria: "Accuracy of CRM data entry" },
  ],
};

const DEFAULT_KSA_ATTRIBUTES = {
  knowledge: ["Product Knowledge", "Industry Awareness", "Process Understanding", "Compliance Knowledge", "CRM/Tool Proficiency"],
  skill: ["Communication", "Negotiation", "Time Management", "Problem Solving", "Presentation Skills"],
  attitude: ["Ownership & Accountability", "Team Collaboration", "Punctuality & Discipline", "Initiative & Proactiveness", "Customer Orientation"],
};

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const PerformanceEvaluationSystem = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showKpiDialog, setShowKpiDialog] = useState(false);
  const [showKraDialog, setShowKraDialog] = useState(false);
  const [showKsaDialog, setShowKsaDialog] = useState(false);
  const [kpiForm, setKpiForm] = useState<Record<string, any>>({});
  const [kraForm, setKraForm] = useState<Record<string, any>>({});
  const [ksaForm, setKsaForm] = useState<Record<string, any>>({});

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-perf-employees"],
    queryFn: async () => {
      const { data } = await (supabase.from("hr_team_directory") as any).select("*").eq("employment_status", "active").order("full_name");
      return data || [];
    },
  });

  const { data: kpiMetrics = [] } = useQuery({
    queryKey: ["kpi-metrics", selectedMonth],
    queryFn: async () => {
      const { data } = await (supabase.from("employee_kpi_metrics") as any).select("*").eq("month_year", selectedMonth).order("employee_name");
      return data || [];
    },
  });

  const { data: kraDefinitions = [] } = useQuery({
    queryKey: ["kra-definitions"],
    queryFn: async () => {
      const { data } = await (supabase.from("employee_kra_definitions") as any).select("*").eq("is_active", true).order("designation, weightage_pct desc");
      return data || [];
    },
  });

  const { data: ksaScores = [] } = useQuery({
    queryKey: ["ksa-scores", selectedMonth],
    queryFn: async () => {
      const { data } = await (supabase.from("employee_ksa_scores") as any).select("*").eq("evaluation_period", selectedMonth).order("employee_name");
      return data || [];
    },
  });

  const saveKpi = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from("employee_kpi_metrics") as any).insert({
        employee_id: form.employee_id,
        employee_name: form.employee_name,
        designation: form.designation,
        vertical_name: form.vertical_name,
        metric_name: form.metric_name,
        target_value: Number(form.target_value) || 0,
        achieved_value: Number(form.achieved_value) || 0,
        unit: form.unit || "count",
        month_year: selectedMonth,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kpi-metrics"] }); toast.success("KPI metric saved"); setShowKpiDialog(false); setKpiForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveKra = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from("employee_kra_definitions") as any).insert({
        designation: form.designation,
        vertical_name: form.vertical_name || "",
        kra_name: form.kra_name,
        description: form.description,
        weightage_pct: Number(form.weightage_pct) || 0,
        evaluation_criteria: form.evaluation_criteria,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kra-definitions"] }); toast.success("KRA definition saved"); setShowKraDialog(false); setKraForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveKsa = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await (supabase.from("employee_ksa_scores") as any).insert({
        employee_id: form.employee_id,
        employee_name: form.employee_name,
        designation: form.designation,
        vertical_name: form.vertical_name || "",
        category: form.category,
        attribute_name: form.attribute_name,
        max_score: Number(form.max_score) || 10,
        scored_value: Number(form.scored_value) || 0,
        evaluator_name: form.evaluator_name,
        evaluator_notes: form.evaluator_notes,
        evaluation_period: selectedMonth,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ksa-scores"] }); toast.success("KSA score saved"); setShowKsaDialog(false); setKsaForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const loadKraTemplate = () => {
    const template = DEFAULT_KRA_TEMPLATES[kraForm.designation];
    if (!template) { toast.error("No template for this designation"); return; }
    Promise.all(template.map(t => (supabase.from("employee_kra_definitions") as any).insert({
      designation: kraForm.designation,
      vertical_name: kraForm.vertical_name || "",
      kra_name: t.name,
      weightage_pct: t.weight,
      evaluation_criteria: t.criteria,
    }))).then(() => {
      qc.invalidateQueries({ queryKey: ["kra-definitions"] });
      toast.success("Template loaded!");
      setShowKraDialog(false);
    });
  };

  // Summary stats
  const avgKpiScore = kpiMetrics.length > 0 ? Math.round(kpiMetrics.reduce((s: number, k: any) => s + Number(k.score || 0), 0) / kpiMetrics.length) : 0;
  const avgKsaScore = ksaScores.length > 0 ? Math.round(ksaScores.reduce((s: number, k: any) => s + ((Number(k.scored_value) / Number(k.max_score)) * 100), 0) / ksaScores.length) : 0;
  const kraDesignations = [...new Set(kraDefinitions.map((k: any) => k.designation))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Performance Evaluation System</h2>
          <p className="text-sm text-muted-foreground">KPI · KRA · KSA — Structured employee performance tracking</p>
        </div>
        <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-44" />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Target className="h-4 w-4" /> KPI Metrics</div>
          <p className="text-2xl font-bold mt-1">{kpiMetrics.length}</p>
          <p className="text-xs text-muted-foreground">Avg Score: {avgKpiScore}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Award className="h-4 w-4" /> KRA Definitions</div>
          <p className="text-2xl font-bold mt-1">{kraDefinitions.length}</p>
          <p className="text-xs text-muted-foreground">{kraDesignations.length} designations covered</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Brain className="h-4 w-4" /> KSA Evaluations</div>
          <p className="text-2xl font-bold mt-1">{ksaScores.length}</p>
          <p className="text-xs text-muted-foreground">Avg Score: {avgKsaScore}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Users className="h-4 w-4" /> Employees</div>
          <p className="text-2xl font-bold mt-1">{employees.length}</p>
          <p className="text-xs text-muted-foreground">Active team members</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="kpi">
        <TabsList>
          <TabsTrigger value="kpi" className="gap-1"><Target className="h-3.5 w-3.5" /> KPI (Output Metrics)</TabsTrigger>
          <TabsTrigger value="kra" className="gap-1"><Award className="h-3.5 w-3.5" /> KRA (Accountability)</TabsTrigger>
          <TabsTrigger value="ksa" className="gap-1"><Brain className="h-3.5 w-3.5" /> KSA (Capability)</TabsTrigger>
        </TabsList>

        {/* ── KPI Tab ── */}
        <TabsContent value="kpi" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Key Performance Indicators</h3>
              <p className="text-xs text-muted-foreground">Measurable output — sales, revenue, calls, conversions</p>
            </div>
            <Button size="sm" onClick={() => { setKpiForm({}); setShowKpiDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Add KPI</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Achieved</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiMetrics.map((k: any) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.employee_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{k.designation}</Badge></TableCell>
                      <TableCell>{k.metric_name}</TableCell>
                      <TableCell>{k.target_value} {k.unit}</TableCell>
                      <TableCell>{k.achieved_value} {k.unit}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(Number(k.score), 100)} className="w-16 h-2" />
                          <Badge className={Number(k.score) >= 100 ? "bg-green-100 text-green-800" : Number(k.score) >= 70 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                            {k.score}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {kpiMetrics.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No KPI data for {selectedMonth}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── KRA Tab ── */}
        <TabsContent value="kra" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Key Result Areas</h3>
              <p className="text-xs text-muted-foreground">Role-based accountability — what the person is responsible for</p>
            </div>
            <Button size="sm" onClick={() => { setKraForm({}); setShowKraDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Define KRA</Button>
          </div>
          {kraDesignations.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No KRA definitions yet. Add one or load a template.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {kraDesignations.map((designation: string) => {
                const items = kraDefinitions.filter((k: any) => k.designation === designation);
                const totalWeight = items.reduce((s: number, k: any) => s + Number(k.weightage_pct || 0), 0);
                return (
                  <Card key={designation}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{designation}</CardTitle>
                        <Badge variant={totalWeight === 100 ? "default" : "destructive"} className="text-xs">{totalWeight}% allocated</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {items.map((k: any) => (
                        <div key={k.id} className="flex items-center justify-between py-1 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{k.kra_name}</p>
                            <p className="text-xs text-muted-foreground">{k.evaluation_criteria}</p>
                          </div>
                          <Badge variant="outline">{k.weightage_pct}%</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── KSA Tab ── */}
        <TabsContent value="ksa" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Knowledge, Skills & Attitude</h3>
              <p className="text-xs text-muted-foreground">Capability evaluation — how effectively the person performs</p>
            </div>
            <Button size="sm" onClick={() => { setKsaForm({}); setShowKsaDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Evaluate Employee</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Attribute</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Evaluator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ksaScores.map((k: any) => {
                    const pct = Number(k.max_score) > 0 ? Math.round((Number(k.scored_value) / Number(k.max_score)) * 100) : 0;
                    const cat = KSA_CATEGORIES.find(c => c.value === k.category);
                    return (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.employee_name}</TableCell>
                        <TableCell><Badge className={cat?.color || ""}>{cat?.label || k.category}</Badge></TableCell>
                        <TableCell>{k.attribute_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="w-14 h-2" />
                            <span className="text-sm font-medium">{k.scored_value}/{k.max_score}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{k.evaluator_name || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {ksaScores.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No KSA evaluations for {selectedMonth}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* KPI Dialog */}
      <Dialog open={showKpiDialog} onOpenChange={setShowKpiDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add KPI Metric</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={kpiForm.employee_id || ""} onValueChange={v => {
                const emp = employees.find((e: any) => e.id === v);
                setKpiForm(p => ({ ...p, employee_id: v, employee_name: emp?.full_name || "", designation: emp?.designation || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.designation || "N/A"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vertical</Label>
                <Select value={kpiForm.vertical_name || ""} onValueChange={v => setKpiForm(p => ({ ...p, vertical_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Metric Name</Label>
                <Input value={kpiForm.metric_name || ""} onChange={e => setKpiForm(p => ({ ...p, metric_name: e.target.value }))} placeholder="e.g. Policies Sold" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Target</Label><Input type="number" value={kpiForm.target_value || ""} onChange={e => setKpiForm(p => ({ ...p, target_value: e.target.value }))} /></div>
              <div><Label>Achieved</Label><Input type="number" value={kpiForm.achieved_value || ""} onChange={e => setKpiForm(p => ({ ...p, achieved_value: e.target.value }))} /></div>
              <div>
                <Label>Unit</Label>
                <Select value={kpiForm.unit || "count"} onValueChange={v => setKpiForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["count", "₹", "%", "hours", "leads", "calls", "deals"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKpiDialog(false)}>Cancel</Button>
            <Button onClick={() => saveKpi.mutate(kpiForm)} disabled={!kpiForm.employee_id || !kpiForm.metric_name}>Save KPI</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KRA Dialog */}
      <Dialog open={showKraDialog} onOpenChange={setShowKraDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Define KRA</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Designation</Label>
                <Select value={kraForm.designation || ""} onValueChange={v => setKraForm(p => ({ ...p, designation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>{DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vertical</Label>
                <Select value={kraForm.vertical_name || ""} onValueChange={v => setKraForm(p => ({ ...p, vertical_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {kraForm.designation && DEFAULT_KRA_TEMPLATES[kraForm.designation] && (
              <Button variant="outline" size="sm" className="w-full" onClick={loadKraTemplate}>
                ⚡ Load Template for {kraForm.designation}
              </Button>
            )}
            <div>
              <Label>KRA Name</Label>
              <Input value={kraForm.kra_name || ""} onChange={e => setKraForm(p => ({ ...p, kra_name: e.target.value }))} placeholder="e.g. Revenue Generation" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Weightage (%)</Label><Input type="number" value={kraForm.weightage_pct || ""} onChange={e => setKraForm(p => ({ ...p, weightage_pct: e.target.value }))} placeholder="e.g. 40" /></div>
              <div><Label>Evaluation Criteria</Label><Input value={kraForm.evaluation_criteria || ""} onChange={e => setKraForm(p => ({ ...p, evaluation_criteria: e.target.value }))} placeholder="How is this measured?" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKraDialog(false)}>Cancel</Button>
            <Button onClick={() => saveKra.mutate(kraForm)} disabled={!kraForm.designation || !kraForm.kra_name}>Save KRA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KSA Dialog */}
      <Dialog open={showKsaDialog} onOpenChange={setShowKsaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Evaluate Employee (KSA)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={ksaForm.employee_id || ""} onValueChange={v => {
                const emp = employees.find((e: any) => e.id === v);
                setKsaForm(p => ({ ...p, employee_id: v, employee_name: emp?.full_name || "", designation: emp?.designation || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={ksaForm.category || ""} onValueChange={v => setKsaForm(p => ({ ...p, category: v, attribute_name: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{KSA_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Attribute</Label>
                <Select value={ksaForm.attribute_name || ""} onValueChange={v => setKsaForm(p => ({ ...p, attribute_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(DEFAULT_KSA_ATTRIBUTES[ksaForm.category as keyof typeof DEFAULT_KSA_ATTRIBUTES] || []).map((a: string) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Max Score</Label><Input type="number" value={ksaForm.max_score || "10"} onChange={e => setKsaForm(p => ({ ...p, max_score: e.target.value }))} /></div>
              <div><Label>Score Given</Label><Input type="number" value={ksaForm.scored_value || ""} onChange={e => setKsaForm(p => ({ ...p, scored_value: e.target.value }))} placeholder="0-10" /></div>
              <div><Label>Evaluator Name</Label><Input value={ksaForm.evaluator_name || ""} onChange={e => setKsaForm(p => ({ ...p, evaluator_name: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={ksaForm.evaluator_notes || ""} onChange={e => setKsaForm(p => ({ ...p, evaluator_notes: e.target.value }))} placeholder="Evaluation feedback..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKsaDialog(false)}>Cancel</Button>
            <Button onClick={() => saveKsa.mutate(ksaForm)} disabled={!ksaForm.employee_id || !ksaForm.category || !ksaForm.attribute_name}>Save Score</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformanceEvaluationSystem;