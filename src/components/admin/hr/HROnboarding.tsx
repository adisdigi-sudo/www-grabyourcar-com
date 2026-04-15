import { useState, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, CheckCircle2, ClipboardList, Plus, Users, IndianRupee, Shield, Building2, Clock, FileUp, Send, IdCard, Upload, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEFAULT_STEPS = [
  "Candidate Screening Done",
  "Interview Scheduled",
  "Interview Completed",
  "Offer Extended",
  "Offer Accepted",
  "KYC Documents Collected",
  "Aadhaar Verified",
  "PAN Verified",
  "Bank Details Collected",
  "Employee ID Created",
  "Role & Manager Assigned",
  "CTC & Salary Finalized",
  "System Access Created",
  "Offer Letter Generated",
  "Appointment Letter Generated",
  "Welcome Letter Sent",
  "First Day Orientation",
];

const WIZARD_STEPS = [
  { num: 1, label: "Lead & Interview", icon: Users },
  { num: 2, label: "KYC & Documents", icon: Shield },
  { num: 3, label: "CTC & Salary", icon: IndianRupee },
  { num: 4, label: "Work Schedule", icon: Clock },
  { num: 5, label: "Review & Finalize", icon: CheckCircle2 },
];

const ROLES = ["employee", "team_lead", "manager", "senior_manager", "head"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "freelancer"];

const DEPARTMENTS = [
  "Sales", "Insurance", "Loans", "HSRP", "Self Drive Rentals",
  "Marketing", "Operations", "Finance & Accounts", "HR & Admin",
  "IT & Technology", "Customer Support", "Dealer Network",
  "Accessories", "Service & Workshop", "Legal & Compliance",
  "Custom",
];

const DESIGNATION_GROUPS = [
  {
    category: "🧹 Support Staff",
    items: [
      { value: "office_assistant", label: "Office Assistant", hint: "Peon / Helper" },
      { value: "facility_coordinator", label: "Facility Coordinator", hint: "Office Boy" },
      { value: "dispatch_runner", label: "Dispatch Runner", hint: "Runner / Errand" },
    ],
  },
  {
    category: "📞 Caller / Telecaller",
    items: [
      { value: "revenue_growth_associate", label: "Revenue Growth Associate", hint: "Telecaller" },
      { value: "revenue_enhancer", label: "Revenue Enhancer", hint: "Sr. Telecaller" },
      { value: "client_success_advisor", label: "Client Success Advisor", hint: "Telecaller" },
    ],
  },
  {
    category: "💼 Executive / Field",
    items: [
      { value: "business_development_executive", label: "Business Development Executive", hint: "Field Sales" },
      { value: "growth_catalyst", label: "Growth Catalyst", hint: "Sales Exec" },
      { value: "relationship_manager", label: "Relationship Manager", hint: "RM" },
      { value: "senior_relationship_manager", label: "Senior Relationship Manager", hint: "Sr. RM" },
      { value: "operations_executive", label: "Operations Executive", hint: "Ops" },
      { value: "data_entry_operator", label: "Data Entry Operator", hint: "DEO" },
      { value: "accounts_executive", label: "Accounts Executive", hint: "Accounts" },
    ],
  },
  {
    category: "👑 Team Lead",
    items: [
      { value: "client_acquisition_lead", label: "Client Acquisition Lead", hint: "Team Lead" },
      { value: "performance_coach", label: "Performance Coach", hint: "Team Lead" },
      { value: "team_leader", label: "Team Leader", hint: "TL" },
    ],
  },
  {
    category: "🏢 Manager & Above",
    items: [
      { value: "revenue_strategist", label: "Revenue Strategist", hint: "Manager" },
      { value: "operations_manager", label: "Operations Manager", hint: "Manager" },
      { value: "assistant_manager", label: "Assistant Manager", hint: "Asst. Mgr" },
      { value: "branch_manager", label: "Branch Manager", hint: "Branch Head" },
      { value: "zonal_head", label: "Zonal Head", hint: "Zonal" },
    ],
  },
  {
    category: "✏️ Other",
    items: [
      { value: "custom", label: "Custom Designation", hint: "Type your own" },
    ],
  },
];

const ALL_DESIGNATIONS = DESIGNATION_GROUPS.flatMap(g => g.items);

// Auto-map designation to role level
const DESIGNATION_ROLE_MAP: Record<string, string> = {
  office_assistant: "employee",
  facility_coordinator: "employee",
  dispatch_runner: "employee",
  revenue_growth_associate: "employee",
  revenue_enhancer: "employee",
  client_success_advisor: "employee",
  business_development_executive: "employee",
  growth_catalyst: "employee",
  relationship_manager: "employee",
  senior_relationship_manager: "employee",
  operations_executive: "employee",
  data_entry_operator: "employee",
  accounts_executive: "employee",
  client_acquisition_lead: "team_lead",
  performance_coach: "team_lead",
  team_leader: "team_lead",
  revenue_strategist: "manager",
  operations_manager: "manager",
  assistant_manager: "manager",
  branch_manager: "senior_manager",
  zonal_head: "head",
};

// Indian Govt norms for PF/ESI/PT (as of 2024-25)
// PF: Mandatory only when 20+ employees. Basic ≤15,000 compulsory; >15,000 can opt out
// ESI: Mandatory only when 10+ employees AND gross ≤21,000/month
// Professional Tax: Max ₹200/month (state dependent), some states exempt <₹15,000
// TDS: Only if annual income > ₹3,00,000 (old) or ₹7,00,000 (new regime)
const calcGovtDeductions = (monthlyCTC: number, totalEmployees: number) => {
  const basic = Math.round(monthlyCTC * 0.4);
  const annualCTC = monthlyCTC * 12;

  // PF: Not applicable if <20 employees (EPFO registration not required)
  const pfApplicable = totalEmployees >= 20;
  const pf = pfApplicable ? Math.round(Math.min(basic, 15000) * 0.12) : 0;

  // ESI: Not applicable if <10 employees OR gross >21,000
  const esiApplicable = totalEmployees >= 10 && monthlyCTC <= 21000;
  const esi = esiApplicable ? Math.round(monthlyCTC * 0.0075) : 0;

  // Professional Tax: Exempt if monthly income <15,000 (most states)
  const pt = monthlyCTC >= 15000 ? 200 : 0;

  // TDS: Only if annual CTC > ₹3,00,000 (old regime basic exemption)
  // Rough estimate: 5% of amount exceeding 3L, divided by 12
  const tds = annualCTC > 300000 ? Math.round(((annualCTC - 300000) * 0.05) / 12) : 0;

  return { pf, esi, pt, tds, pfApplicable, esiApplicable };
};

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const HROnboarding = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [step, setStep] = useState(1); // wizard step
  const [form, setForm] = useState<Record<string, any>>({});
  const [showComplianceForm, setShowComplianceForm] = useState(false);
  const [complianceForm, setComplianceForm] = useState<Record<string, string>>({});

  // Fetch company compliance registration IDs
  const { data: complianceData } = useQuery({
    queryKey: ["company-compliance-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "company_compliance_ids").single();
      return (data?.setting_value as any) || {};
    },
  });

  const saveComplianceIds = useMutation({
    mutationFn: async (ids: Record<string, string>) => {
      const payload = {
        setting_key: "company_compliance_ids",
        setting_value: ids as any,
        description: "PF/ESI/PT Registration Numbers (auto-enforced by HR system)",
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from("admin_settings").select("id").eq("setting_key", "company_compliance_ids").single();
      if (existing) {
        const { error } = await supabase.from("admin_settings").update(payload).eq("setting_key", "company_compliance_ids");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("admin_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-compliance-ids"] });
      toast.success("Compliance IDs saved! Accounts team will be notified. ✅");
      setShowComplianceForm(false);
    },
    onError: (e: any) => toast.error(e.message),
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
      if (!form.employee_name?.trim()) throw new Error("Candidate name is required");
      const vertical = verticals.find((v: any) => v.id === form.vertical_id);
      const manager = teamMembers.find((m: any) => m.user_id === form.manager_user_id);
      const empCode = "GYC-" + (form.designation?.slice(0, 3) || "EMP").toUpperCase() + "-" + Date.now().toString().slice(-6);
      const monthlyCTC = Number(form.monthly_ctc || 0);
      const empCount = profiles.length;
      const basic = Math.round(monthlyCTC * 0.4);
      const hra = Math.round(monthlyCTC * 0.2);
      const da = Math.round(monthlyCTC * 0.1);
      const special = Math.round(monthlyCTC * 0.3);
      const ded = calcGovtDeductions(monthlyCTC, empCount);
      const pf = ded.pf;
      const esi = ded.esi;

      // 0. First create employee in hr_team_directory
      const { data: newEmp, error: dirError } = await supabase.from("hr_team_directory").insert({
        full_name: form.employee_name.trim(),
        phone: form.candidate_phone || null,
        email: form.candidate_email || null,
        designation: form.designation || "New Hire",
        department: form.department || vertical?.name || "",
        vertical_name: vertical?.name || "",
        date_of_joining: form.joining_date || new Date().toISOString().split("T")[0],
        salary_ctc: monthlyCTC * 12,
        employment_type: form.employment_type || "full_time",
        is_active: true,
      }).select("id").single();
      if (dirError) throw dirError;
      const newEmpId = newEmp.id;

      // 1. Create employee profile
      const { error: profileError } = await (supabase.from("employee_profiles") as any).insert({
        user_id: null,
        team_member_id: newEmpId,
        full_name: form.employee_name.trim(),
        email: form.candidate_email || null,
        phone: form.candidate_phone || null,
        designation: form.designation || "",
        department: form.department || "",
        role: form.role || "employee",
        employee_code: empCode,
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
        professional_tax: ded.pt,
        tds: ded.tds,
        pan_number: form.pan_number || null,
        aadhaar_number: form.aadhaar_number || null,
        bank_account_number: form.bank_account_number || null,
        bank_ifsc: form.bank_ifsc || null,
        bank_name: form.bank_name || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        blood_group: form.blood_group || null,
        joining_date: form.joining_date || new Date().toISOString().split("T")[0],
        probation_end_date: form.probation_end_date || null,
        employment_type: form.employment_type || "full_time",
        working_days_per_month: Number(form.working_days || 26),
        shift_start: form.shift_start || "09:00",
        shift_end: form.shift_end || "18:00",
        grace_minutes: Number(form.grace_minutes || 15),
        interview_notes: form.interview_notes || null,
        recruitment_source: form.recruitment_source || null,
        onboarded_by: user?.id,
      });
      if (profileError) throw profileError;

      // 2. Create onboarding checklist
      const steps = DEFAULT_STEPS.map((s, i) => ({
        employee_id: newEmpId,
        employee_name: form.employee_name.trim(),
        step_name: s,
        step_order: i + 1,
        is_completed: i < 2, // First 2 steps auto-completed
      }));
      const { error: stepsError } = await (supabase.from("hr_onboarding") as any).insert(steps);
      if (stepsError) throw stepsError;

      // 3. Generate starter HR documents
      const baseGeneratedData = {
        name: form.employee_name.trim(),
        designation: form.designation,
        department: form.department,
        vertical: vertical?.name,
        manager: manager?.display_name || form.manager_name,
        joining_date: form.joining_date,
        ctc: monthlyCTC,
        basic_salary: basic,
        hra,
        da,
        special_allowance: special,
        pf_deduction: pf,
        esi_deduction: esi,
        professional_tax: ded.pt,
        tds: ded.tds,
        employment_type: form.employment_type || "full_time",
        shift_start: form.shift_start || "09:00",
        shift_end: form.shift_end || "18:00",
        working_days: Number(form.working_days || 26),
      };
      const { error: docError } = await (supabase.from("employee_documents") as any).insert([
        {
          employee_user_id: user?.id,
          employee_name: form.employee_name.trim(),
          employee_id: newEmpId,
          document_type: "welcome_letter",
          document_name: `Welcome Letter - ${form.employee_name.trim()}`,
          generated_data: baseGeneratedData,
        },
        {
          employee_user_id: user?.id,
          employee_name: form.employee_name.trim(),
          employee_id: newEmpId,
          document_type: "offer_letter",
          document_name: `Offer Letter - ${form.employee_name.trim()}`,
          generated_data: baseGeneratedData,
        },
        {
          employee_user_id: user?.id,
          employee_name: form.employee_name.trim(),
          employee_id: newEmpId,
          document_type: "joining_letter",
          document_name: `Joining Letter - ${form.employee_name.trim()}`,
          generated_data: baseGeneratedData,
        },
        {
          employee_user_id: user?.id,
          employee_name: form.employee_name.trim(),
          employee_id: newEmpId,
          document_type: "salary_structure",
          document_name: `Salary Structure - ${form.employee_name.trim()}`,
          generated_data: { ...baseGeneratedData, net_salary: calcNet },
        },
      ]);
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
  const totalEmployees = profiles.length; // current headcount
  const calcBasic = Math.round(monthlyCTC * 0.4);
  const calcHRA = Math.round(monthlyCTC * 0.2);
  const calcDA = Math.round(monthlyCTC * 0.1);
  const calcSpecial = Math.round(monthlyCTC * 0.3);
  const govtDed = calcGovtDeductions(monthlyCTC, totalEmployees);
  const calcPF = govtDed.pf;
  const calcESI = govtDed.esi;
  const calcPT = govtDed.pt;
  const calcTDS = govtDed.tds;
  const calcNet = monthlyCTC - calcPF - calcESI - calcPT - calcTDS;

  // Compliance blockers — check if this hire will cross the threshold
  const needsPF = totalEmployees >= 19; // will become 20 after this hire
  const needsESI = totalEmployees >= 9; // will become 10 after this hire
  const hasPFId = !!complianceData?.pf_registration_number;
  const hasESIId = !!complianceData?.esi_registration_number;
  const complianceBlocked = (needsPF && !hasPFId) || (needsESI && !hasESIId);

  const renderWizardStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Step 1: Lead & Interview Details</h3>
            <p className="text-sm text-muted-foreground">Naye candidate ki basic info aur interview details fill karo — yeh fresh hire hai</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Candidate Full Name *</Label>
                <Input value={form.employee_name || ""} onChange={e => updateField("employee_name", e.target.value)} placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={form.candidate_phone || ""} onChange={e => updateField("candidate_phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10 digit mobile" maxLength={10} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.candidate_email || ""} onChange={e => updateField("candidate_email", e.target.value)} placeholder="candidate@email.com" />
              </div>
              <div>
                <Label>Recruitment Source</Label>
                <Select value={form.recruitment_source || ""} onValueChange={v => updateField("recruitment_source", v)}>
                  <SelectTrigger><SelectValue placeholder="How did they apply?" /></SelectTrigger>
                  <SelectContent>
                    {["walk_in", "referral", "job_portal", "linkedin", "campus", "internal", "other"].map(s => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation *</Label>
                <Select value={form.designation_key || ""} onValueChange={v => {
                  updateField("designation_key", v);
                  if (v !== "custom") {
                    const found = ALL_DESIGNATIONS.find(d => d.value === v);
                    updateField("designation", found?.label || v);
                    updateField("custom_designation", "");
                    // Auto-set role level
                    const autoRole = DESIGNATION_ROLE_MAP[v];
                    if (autoRole) updateField("role", autoRole);
                  } else {
                    updateField("designation", "");
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {DESIGNATION_GROUPS.map(group => (
                      <SelectGroup key={group.category}>
                        <SelectLabel className="text-xs font-bold text-muted-foreground">{group.category}</SelectLabel>
                        {group.items.map(d => (
                          <SelectItem key={d.value} value={d.value}>
                            <span>{d.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({d.hint})</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {form.designation_key === "custom" && (
                  <Input className="mt-2" value={form.custom_designation || ""} onChange={e => { updateField("custom_designation", e.target.value); updateField("designation", e.target.value); }} placeholder="Type custom designation..." />
                )}
              </div>
              <div>
                <Label>Department *</Label>
                <Select value={form.department_key || ""} onValueChange={v => {
                  updateField("department_key", v);
                  if (v !== "Custom") {
                    updateField("department", v);
                    updateField("custom_department", "");
                  } else {
                    updateField("department", "");
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d === "Custom" ? "✏️ Custom Department" : d}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.department_key === "Custom" && (
                  <Input className="mt-2" value={form.custom_department || ""} onChange={e => { updateField("custom_department", e.target.value); updateField("department", e.target.value); }} placeholder="Type department name..." />
                )}
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
            <div>
              <Label>Interview Notes / Observations</Label>
              <Textarea value={form.interview_notes || ""} onChange={e => updateField("interview_notes", e.target.value)} placeholder="Interview feedback, strengths, areas of improvement..." rows={3} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Step 2: KYC & Document Collection</h3>
            <p className="text-sm text-muted-foreground">Employee ke identity aur bank details collect karo</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aadhaar Number</Label>
                <Input value={form.aadhaar_number || ""} onChange={e => updateField("aadhaar_number", e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12 digit Aadhaar" maxLength={12} />
                {form.aadhaar_number?.length === 12 && <p className="text-xs text-green-600 mt-1">✓ Valid format</p>}
              </div>
              <div>
                <Label>PAN Number</Label>
                <Input value={form.pan_number || ""} onChange={e => updateField("pan_number", e.target.value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" maxLength={10} />
                {/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan_number || "") && <p className="text-xs text-green-600 mt-1">✓ Valid PAN</p>}
              </div>
              <div>
                <Label>Bank Account Number</Label>
                <Input value={form.bank_account_number || ""} onChange={e => updateField("bank_account_number", e.target.value)} placeholder="Account number" />
              </div>
              <div>
                <Label>Bank IFSC Code</Label>
                <Input value={form.bank_ifsc || ""} onChange={e => updateField("bank_ifsc", e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input value={form.bank_name || ""} onChange={e => updateField("bank_name", e.target.value)} placeholder="e.g. State Bank of India" />
              </div>
              <div>
                <Label>Blood Group</Label>
                <Select value={form.blood_group || ""} onValueChange={v => updateField("blood_group", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Emergency Contact Name</Label>
                <Input value={form.emergency_contact_name || ""} onChange={e => updateField("emergency_contact_name", e.target.value)} placeholder="Father / Guardian" />
              </div>
              <div>
                <Label>Emergency Contact Phone</Label>
                <Input value={form.emergency_contact_phone || ""} onChange={e => updateField("emergency_contact_phone", e.target.value)} placeholder="10 digit number" maxLength={10} />
              </div>
            </div>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">KYC documents will be auto-linked to the employee profile after onboarding</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Step 3: CTC & Salary Structure</h3>
            <p className="text-sm text-muted-foreground">Monthly CTC daalo, breakdown auto-calculate hoga</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Monthly CTC (₹)</Label>
                <Input type="number" value={form.monthly_ctc || ""} onChange={e => updateField("monthly_ctc", e.target.value)} placeholder="e.g. 25000" />
              </div>
            </div>
            {monthlyCTC > 0 && (
              <>
                <Card className="bg-muted/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Auto-Calculated Breakdown (Govt Norms):</p>
                      <Badge variant="outline" className="text-xs">{totalEmployees} employees in company</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Basic (40%)</span><span className="font-medium">{fmt(calcBasic)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">HRA (20%)</span><span className="font-medium">{fmt(calcHRA)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">DA (10%)</span><span className="font-medium">{fmt(calcDA)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Special (30%)</span><span className="font-medium">{fmt(calcSpecial)}</span></div>
                      <div className="flex justify-between text-destructive">
                        <span>PF {!govtDed.pfApplicable ? "(N/A <20 emp)" : "(12% of Basic, cap ₹15K)"}</span>
                        <span>{calcPF > 0 ? `-${fmt(calcPF)}` : "₹0"}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>ESI {!govtDed.esiApplicable ? `(N/A ${totalEmployees < 10 ? "<10 emp" : "gross >₹21K"})` : "(0.75%)"}</span>
                        <span>{calcESI > 0 ? `-${fmt(calcESI)}` : "₹0"}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>Prof. Tax {calcPT === 0 ? "(Exempt <₹15K)" : ""}</span>
                        <span>{calcPT > 0 ? `-${fmt(calcPT)}` : "₹0"}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>TDS {calcTDS === 0 ? "(Below ₹3L/yr)" : "(~5% above ₹3L)"}</span>
                        <span>{calcTDS > 0 ? `-${fmt(calcTDS)}` : "₹0"}</span>
                      </div>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Net Take-Home</span><span className="text-green-600">{fmt(calcNet)}</span>
                    </div>
                  </CardContent>
                </Card>
                {/* Compliance status for small companies */}
                {!complianceBlocked && totalEmployees < 20 && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-3 text-sm text-blue-800">
                      <p className="font-medium">📋 Govt Compliance Status:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                        {totalEmployees < 20 && <li><strong>PF (EPFO):</strong> Not required until 20 employees. Currently {totalEmployees} employees.</li>}
                        {totalEmployees < 10 && <li><strong>ESI (ESIC):</strong> Not required until 10 employees. Currently {totalEmployees} employees.</li>}
                        <li><strong>Professional Tax:</strong> {calcPT === 0 ? "Exempt — monthly income below ₹15,000" : "₹200/month applicable"}</li>
                        <li><strong>TDS:</strong> {calcTDS === 0 ? "Not applicable — annual CTC below ₹3,00,000" : `~₹${calcTDS}/month estimated`}</li>
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* 🚨 COMPLIANCE BLOCKER — PF/ESI registration required */}
                {complianceBlocked && (
                  <Card className="border-red-300 bg-red-50">
                    <CardContent className="p-4 space-y-3">
                      <p className="font-semibold text-red-800 flex items-center gap-2">
                        <Shield className="h-4 w-4" /> ⚠️ Compliance Registration Required
                      </p>
                      <p className="text-sm text-red-700">
                        This hire will bring your team to <strong>{totalEmployees + 1} employees</strong>. 
                        As per Indian Govt norms, the following registrations are now <strong>mandatory</strong> before you can proceed:
                      </p>
                      <div className="space-y-2">
                        {needsPF && !hasPFId && (
                          <div className="flex items-center gap-2 p-2 rounded bg-red-100 border border-red-200">
                            <span className="text-red-600 font-bold text-lg">①</span>
                            <div>
                              <p className="text-sm font-semibold text-red-800">EPFO (PF) Registration Number</p>
                              <p className="text-xs text-red-600">Mandatory for 20+ employees. Register at epfindia.gov.in</p>
                            </div>
                          </div>
                        )}
                        {needsESI && !hasESIId && (
                          <div className="flex items-center gap-2 p-2 rounded bg-red-100 border border-red-200">
                            <span className="text-red-600 font-bold text-lg">②</span>
                            <div>
                              <p className="text-sm font-semibold text-red-800">ESIC (ESI) Registration Number</p>
                              <p className="text-xs text-red-600">Mandatory for 10+ employees. Register at esic.gov.in</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {!showComplianceForm ? (
                        <Button variant="destructive" size="sm" onClick={() => {
                          setShowComplianceForm(true);
                          setComplianceForm({
                            pf_registration_number: complianceData?.pf_registration_number || "",
                            esi_registration_number: complianceData?.esi_registration_number || "",
                            pt_registration_number: complianceData?.pt_registration_number || "",
                          });
                        }}>
                          Enter Registration IDs to Continue →
                        </Button>
                      ) : (
                        <div className="space-y-2 p-3 rounded border border-red-200 bg-white">
                          <p className="text-xs font-semibold text-muted-foreground">Enter your company registration IDs (will be saved & sent to Accounts):</p>
                          {needsPF && (
                            <div>
                              <Label className="text-xs">PF Registration Number *</Label>
                              <Input placeholder="e.g. MH/BOM/12345/000" value={complianceForm.pf_registration_number || ""} onChange={e => setComplianceForm(p => ({ ...p, pf_registration_number: e.target.value }))} />
                            </div>
                          )}
                          {needsESI && (
                            <div>
                              <Label className="text-xs">ESI Registration Number *</Label>
                              <Input placeholder="e.g. 31-12345-67" value={complianceForm.esi_registration_number || ""} onChange={e => setComplianceForm(p => ({ ...p, esi_registration_number: e.target.value }))} />
                            </div>
                          )}
                          <div>
                            <Label className="text-xs">PT Registration Number (optional)</Label>
                            <Input placeholder="State PT number" value={complianceForm.pt_registration_number || ""} onChange={e => setComplianceForm(p => ({ ...p, pt_registration_number: e.target.value }))} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" disabled={
                              (needsPF && !complianceForm.pf_registration_number?.trim()) ||
                              (needsESI && !complianceForm.esi_registration_number?.trim()) ||
                              saveComplianceIds.isPending
                            } onClick={() => saveComplianceIds.mutate(complianceForm)}>
                              {saveComplianceIds.isPending ? "Saving..." : "✅ Save & Unlock Onboarding"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowComplianceForm(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Show saved compliance IDs if they exist */}
                {(hasPFId || hasESIId) && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-3 text-sm text-green-800">
                      <p className="font-medium">✅ Registered Compliance IDs (Accounts notified):</p>
                      <div className="mt-1 space-y-0.5 text-xs">
                        {hasPFId && <p><strong>PF:</strong> {complianceData.pf_registration_number}</p>}
                        {hasESIId && <p><strong>ESI:</strong> {complianceData.esi_registration_number}</p>}
                        {complianceData?.pt_registration_number && <p><strong>PT:</strong> {complianceData.pt_registration_number}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Annual CTC</Label><Input disabled value={fmt(monthlyCTC * 12)} /></div>
              <div><Label>Total Deductions</Label><Input disabled value={fmt(calcPF + calcESI + calcPT + calcTDS)} /></div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Step 4: Work Schedule & Policies</h3>
            <p className="text-sm text-muted-foreground">Shift timing aur working policies set karo</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Working Days/Month</Label><Input type="number" value={form.working_days || "26"} onChange={e => updateField("working_days", e.target.value)} /></div>
              <div><Label>Grace Minutes (Late)</Label><Input type="number" value={form.grace_minutes || "15"} onChange={e => updateField("grace_minutes", e.target.value)} /></div>
              <div><Label>Shift Start</Label><Input type="time" value={form.shift_start || "09:00"} onChange={e => updateField("shift_start", e.target.value)} /></div>
              <div><Label>Shift End</Label><Input type="time" value={form.shift_end || "18:00"} onChange={e => updateField("shift_end", e.target.value)} /></div>
              <div><Label>Probation End Date</Label><Input type="date" value={form.probation_end_date || ""} onChange={e => updateField("probation_end_date", e.target.value)} /></div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Step 5: Review & Finalize</h3>
            <p className="text-sm text-muted-foreground">Sab details check karo. Submit karne pe Employee ID create hoga aur documents generate honge.</p>
            
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-center">
                <IdCard className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Employee ID will be auto-generated</p>
                <p className="text-lg font-mono font-bold mt-1">GYC-{(form.designation?.slice(0, 3) || "EMP").toUpperCase()}-XXXXXX</p>
              </CardContent>
            </Card>

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
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <h4 className="font-semibold mb-2 text-sm">KYC Status</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Aadhaar:</span> <strong>{form.aadhaar_number ? "✓ Collected" : "✗ Missing"}</strong></div>
                <div><span className="text-muted-foreground">PAN:</span> <strong>{form.pan_number ? "✓ Collected" : "✗ Missing"}</strong></div>
                <div><span className="text-muted-foreground">Bank:</span> <strong>{form.bank_account_number ? "✓ Collected" : "✗ Missing"}</strong></div>
                <div><span className="text-muted-foreground">Source:</span> <strong>{form.recruitment_source || "—"}</strong></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <p className="text-sm font-semibold text-blue-800 mb-2">📄 Documents that will be auto-generated:</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
                  <p>✓ Offer Letter PDF</p>
                  <p>✓ Appointment Letter PDF</p>
                  <p>✓ Welcome Letter PDF</p>
                  <p>✓ Salary Structure PDF</p>
                </div>
                <p className="text-xs text-blue-600 mt-2">These can be shared via WhatsApp/Email from Document Hub</p>
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

      <Dialog open={showNew} onOpenChange={v => { if (!v) { setShowNew(false); setStep(1); setForm({}); } else setShowNew(true); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Onboard New Employee</DialogTitle>
            <div className="flex items-center gap-1 mt-3">
              {WIZARD_STEPS.map((ws) => {
                const Icon = ws.icon;
                const isActive = step === ws.num;
                const isDone = step > ws.num;
                return (
                  <div key={ws.num} className="flex items-center flex-1">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                      {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                      <span className="hidden sm:inline">{ws.label}</span>
                      <span className="sm:hidden">{ws.num}</span>
                    </div>
                    {ws.num < 5 && <div className={`h-0.5 flex-1 mx-1 rounded ${isDone ? "bg-green-400" : "bg-muted"}`} />}
                  </div>
                );
              })}
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <div className="py-2">{renderWizardStep()}</div>
          </ScrollArea>
          <DialogFooter className="flex justify-between border-t pt-3">
            <div>
              {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              {step < 5 ? (
                <Button disabled={step === 1 && !form.employee_name?.trim()} onClick={() => setStep(s => s + 1)}>Next</Button>
              ) : (
                <Button onClick={() => completeOnboarding.mutate()} disabled={completeOnboarding.isPending}>
                  {completeOnboarding.isPending ? "Creating..." : "🚀 Complete Onboarding & Generate Docs"}
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
