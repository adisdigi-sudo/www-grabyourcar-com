import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Plus, Search, Edit2, Trash2, Star, ClipboardCheck, ShieldCheck, XCircle } from "lucide-react";

const STATUSES = ["open", "screening", "interview", "offered", "hired", "rejected", "on_hold"];
const JOB_TYPES = ["full_time", "part_time", "contract", "intern"];
const SOURCES = ["LinkedIn", "Naukri", "Indeed", "Referral", "Walk-in", "Campus", "Other"];

const TEST_TYPES: Record<string, { label: string; description: string }> = {
  telecaller: { label: "Telecaller Test", description: "Communication, Hindi/English fluency, objection handling, mock call" },
  team_leader: { label: "Team Leader Test", description: "Team mgmt, reporting, conflict resolution, target planning" },
  manager: { label: "Manager Test", description: "Strategy, P&L understanding, leadership, CRM knowledge, KPI setting" },
  senior_manager: { label: "Sr. Manager Test", description: "Business planning, cross-vertical ops, advanced analytics" },
  finance: { label: "Finance Test", description: "Tally, GST, TDS, reconciliation, MIS reporting" },
  insurance: { label: "Insurance Test", description: "IRDAI regulations, policy types, claims process, renewals" },
  marketing: { label: "Marketing Test", description: "Digital ads, SEO, social media, lead generation, analytics" },
  operations: { label: "Operations Test", description: "Process optimization, vendor mgmt, logistics, SLA" },
  technical: { label: "Technical Test", description: "Domain-specific technical assessment" },
};

const PASS_THRESHOLD = 60; // 60% minimum to pass

const statusColor: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  screening: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  interview: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  offered: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  hired: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  on_hold: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export const HRRecruitmentModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [tab, setTab] = useState("all");

  const { data: records = [] } = useQuery({
    queryKey: ["hr-recruitment"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("hr_recruitment") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) delete payload.id;
      // Auto-calculate pass/fail
      if (payload.test_score != null && payload.test_max_score) {
        const pct = (Number(payload.test_score) / Number(payload.test_max_score)) * 100;
        payload.test_passed = pct >= PASS_THRESHOLD;
        if (!payload.test_taken_at) payload.test_taken_at = new Date().toISOString();
      }
      const { error } = await (supabase.from("hr_recruitment") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-recruitment"] }); toast.success(editing ? "Updated" : "Posting created"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("hr_recruitment") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-recruitment"] }); toast.success("Deleted"); },
  });

  const filtered = records.filter((r: any) => {
    const matchSearch = !search || r.position_title?.toLowerCase().includes(search.toLowerCase()) || r.applicant_name?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || r.status === tab;
    return matchSearch && matchTab;
  });

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: records.filter((r: any) => r.status === s).length }), {} as Record<string, number>);
  const testPassCount = records.filter((r: any) => r.test_passed === true).length;
  const testFailCount = records.filter((r: any) => r.test_passed === false).length;

  const getTestPct = (r: any) => r.test_score != null && r.test_max_score ? Math.round((r.test_score / r.test_max_score) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Openings</p><p className="text-2xl font-bold">{records.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Positions</p><p className="text-2xl font-bold text-blue-600">{counts.open || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Interview</p><p className="text-2xl font-bold text-purple-600">{counts.interview || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-500" /> Test Passed</p><p className="text-2xl font-bold text-green-600">{testPassCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> Test Failed</p><p className="text-2xl font-bold text-red-600">{testFailCount}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search positions or applicants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ status: "open", job_type: "full_time", test_max_score: 100 }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Opening</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({records.length})</TabsTrigger>
          {STATUSES.map(s => <TabsTrigger key={s} value={s}>{s.replace("_", " ")} ({counts[s] || 0})</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Position</TableHead><TableHead>Applicant</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead>Hard Test</TableHead><TableHead>Interview</TableHead><TableHead>Rating</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((r: any) => {
              const pct = getTestPct(r);
              return (
                <TableRow key={r.id}>
                  <TableCell><div><p className="font-medium text-sm">{r.position_title}</p><p className="text-xs text-muted-foreground">{r.department} • {r.job_type?.replace("_", " ")}</p></div></TableCell>
                  <TableCell><div><p className="text-sm">{r.applicant_name || "—"}</p><p className="text-xs text-muted-foreground">{r.applicant_phone || r.applicant_email || ""}</p></div></TableCell>
                  <TableCell className="text-sm">{r.source || "—"}</TableCell>
                  <TableCell><Badge className={statusColor[r.status] || ""}>{r.status}</Badge></TableCell>
                  <TableCell>
                    {pct !== null ? (
                      <div className="flex items-center gap-1.5">
                        {r.test_passed ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        <span className={`text-sm font-semibold ${r.test_passed ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
                        <span className="text-xs text-muted-foreground">({r.test_type ? TEST_TYPES[r.test_type]?.label || r.test_type : "General"})</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Not taken</span>}
                  </TableCell>
                  <TableCell className="text-sm">{r.interview_date ? format(new Date(r.interview_date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>{r.interview_rating ? <div className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /><span className="text-sm">{r.interview_rating}/5</span></div> : "—"}</TableCell>
                  <TableCell className="text-right"><div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setForm({ ...r }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div></TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No records found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New Job Opening"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Position Title *</Label><Input value={form.position_title || ""} onChange={e => setForm(p => ({ ...p, position_title: e.target.value }))} /></div>
              <div><Label>Department</Label><Input value={form.department || ""} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Job Type</Label><Select value={form.job_type || "full_time"} onValueChange={v => setForm(p => ({ ...p, job_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Experience</Label><Input value={form.experience_required || ""} onChange={e => setForm(p => ({ ...p, experience_required: e.target.value }))} placeholder="e.g. 2-4 years" /></div>
              <div><Label>Salary Range</Label><Input value={form.salary_range || ""} onChange={e => setForm(p => ({ ...p, salary_range: e.target.value }))} placeholder="e.g. 4-6 LPA" /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            
            <hr className="my-2" />
            <p className="text-sm font-semibold text-muted-foreground">Applicant Details</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Name</Label><Input value={form.applicant_name || ""} onChange={e => setForm(p => ({ ...p, applicant_name: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.applicant_phone || ""} onChange={e => setForm(p => ({ ...p, applicant_phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.applicant_email || ""} onChange={e => setForm(p => ({ ...p, applicant_email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Source</Label><Select value={form.source || ""} onValueChange={v => setForm(p => ({ ...p, source: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Interview Date</Label><Input type="date" value={form.interview_date?.split("T")[0] || ""} onChange={e => setForm(p => ({ ...p, interview_date: e.target.value }))} /></div>
              <div><Label>Rating (1-5)</Label><Input type="number" min="1" max="5" value={form.interview_rating || ""} onChange={e => setForm(p => ({ ...p, interview_rating: e.target.value }))} /></div>
            </div>

            {/* HARD TEST SECTION */}
            <hr className="my-2" />
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-primary">Eligibility Hard Test (Min {PASS_THRESHOLD}% to qualify)</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Test Type *</Label>
                  <Select value={form.test_type || ""} onValueChange={v => setForm(p => ({ ...p, test_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select test type" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEST_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Score</Label><Input type="number" min="0" max={form.test_max_score || 100} value={form.test_score ?? ""} onChange={e => setForm(p => ({ ...p, test_score: e.target.value ? Number(e.target.value) : null }))} placeholder="0" /></div>
                <div><Label>Max Score</Label><Input type="number" min="1" value={form.test_max_score || 100} onChange={e => setForm(p => ({ ...p, test_max_score: Number(e.target.value) || 100 }))} /></div>
              </div>
              {form.test_type && TEST_TYPES[form.test_type] && (
                <p className="text-xs text-muted-foreground italic">
                  📋 Areas: {TEST_TYPES[form.test_type].description}
                </p>
              )}
              {form.test_score != null && form.test_max_score && (
                <div className="flex items-center gap-2">
                  {((form.test_score / form.test_max_score) * 100) >= PASS_THRESHOLD ? (
                    <Badge className="bg-green-100 text-green-800 gap-1"><ShieldCheck className="h-3 w-3" /> PASSED ({Math.round((form.test_score / form.test_max_score) * 100)}%)</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="h-3 w-3" /> FAILED ({Math.round((form.test_score / form.test_max_score) * 100)}%) — Not eligible for onboarding</Badge>
                  )}
                </div>
              )}
              <div><Label>Test Evaluation Notes</Label><Textarea value={form.test_notes || ""} onChange={e => setForm(p => ({ ...p, test_notes: e.target.value }))} placeholder="Strengths, weaknesses, detailed evaluation..." rows={2} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label><Select value={form.status || "open"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Offered Salary</Label><Input type="number" value={form.offered_salary || ""} onChange={e => setForm(p => ({ ...p, offered_salary: e.target.value }))} /></div>
            </div>
            <div><Label>Interview Notes</Label><Textarea value={form.interview_notes || ""} onChange={e => setForm(p => ({ ...p, interview_notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.position_title}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRRecruitmentModule;
