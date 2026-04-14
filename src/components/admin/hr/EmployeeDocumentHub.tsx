import { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Download, Send, Search, Plus, Eye, CheckCircle2,
  Mail, MessageSquare, Upload, Shield, IndianRupee, UserCheck
} from "lucide-react";
import { generateEmployeeDocumentPDF } from "@/lib/generateEmployeeDocumentPDF";

const DOC_TYPES = [
  { value: "offer_letter", label: "Offer Letter" },
  { value: "joining_letter", label: "Joining Letter" },
  { value: "welcome_letter", label: "Welcome Letter" },
  { value: "appointment_letter", label: "Appointment Letter" },
  { value: "salary_structure", label: "Salary Structure" },
  { value: "salary_slip", label: "Salary Slip" },
  { value: "employment_contract", label: "Employment Contract" },
];

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const EmployeeDocumentHub = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-doc-hub"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_profiles") as any)
        .select("*").eq("is_active", true).order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["hr-all-documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employee_documents")
        .select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const selectedEmployee = employees.find((e: any) => e.id === form.employee_profile_id);

  // Auto-fill form when employee selected
  const handleEmployeeSelect = (profileId: string) => {
    const emp = employees.find((e: any) => e.id === profileId);
    if (!emp) return;
    setForm(prev => ({
      ...prev,
      employee_profile_id: profileId,
      employee_name: emp.full_name,
      designation: emp.designation,
      department: emp.department,
      vertical: emp.vertical_name,
      manager: emp.manager_name,
      joining_date: emp.joining_date,
      monthly_ctc: emp.monthly_ctc,
      basic_salary: emp.basic_salary,
      hra: emp.hra,
      da: emp.da,
      special_allowance: emp.special_allowance,
      pf_deduction: emp.pf_deduction,
      esi_deduction: emp.esi_deduction,
      professional_tax: emp.professional_tax,
      tds: emp.tds,
      employment_type: emp.employment_type,
      working_days: emp.working_days_per_month,
      shift_start: emp.shift_start,
      shift_end: emp.shift_end,
      net_salary: Number(emp.monthly_ctc || 0) - Number(emp.pf_deduction || 0) - Number(emp.esi_deduction || 0) - Number(emp.professional_tax || 0) - Number(emp.tds || 0),
      employee_user_id: emp.user_id,
      employee_id: emp.team_member_id,
      email: emp.email,
      phone: emp.phone,
    }));
  };

  const generateDoc = useMutation({
    mutationFn: async () => {
      if (!form.document_type || !form.employee_name) throw new Error("Select employee & document type");

      const generatedData = {
        name: form.employee_name,
        employee_name: form.employee_name,
        designation: form.designation,
        department: form.department,
        vertical: form.vertical,
        vertical_name: form.vertical,
        manager: form.manager,
        manager_name: form.manager,
        joining_date: form.joining_date,
        ctc: form.monthly_ctc,
        monthly_ctc: form.monthly_ctc,
        basic_salary: form.basic_salary,
        hra: form.hra,
        da: form.da,
        special_allowance: form.special_allowance,
        pf_deduction: form.pf_deduction,
        esi_deduction: form.esi_deduction,
        professional_tax: form.professional_tax,
        tds: form.tds,
        net_salary: form.net_salary,
        employment_type: form.employment_type,
        working_days: form.working_days,
        total_working_days: form.working_days,
        shift_start: form.shift_start,
        shift_end: form.shift_end,
      };

      const docName = `${DOC_TYPES.find(d => d.value === form.document_type)?.label || form.document_type} - ${form.employee_name}`;

      // Save to database
      const { error } = await (supabase.from("employee_documents") as any).insert({
        employee_user_id: form.employee_user_id || user?.id,
        employee_name: form.employee_name,
        employee_id: form.employee_id,
        document_type: form.document_type,
        document_name: docName,
        generated_data: generatedData,
        uploaded_by: user?.id,
      });
      if (error) throw error;

      // Generate PDF locally
      generateEmployeeDocumentPDF({
        document_type: form.document_type,
        document_name: docName,
        employee_name: form.employee_name,
        generated_data: generatedData,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-all-documents"] });
      toast.success("Document generated & saved! ✅");
      setShowGenerate(false);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDownload = (doc: any) => {
    generateEmployeeDocumentPDF(doc);
    toast.success("PDF downloading...");
  };

  const handleShareEmail = async (doc: any) => {
    const emp = employees.find((e: any) => e.full_name === doc.employee_name);
    const email = emp?.email;
    if (!email) { toast.error("Employee email not found"); return; }

    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "hr-document-shared",
          recipientEmail: email,
          idempotencyKey: `hr-doc-${doc.id}`,
          templateData: {
            name: doc.employee_name,
            documentType: doc.document_type?.replace(/_/g, " "),
            documentName: doc.document_name,
          },
        },
      });
      toast.success(`Email sent to ${email}`);
    } catch {
      toast.info("Email trigger sent");
    }
  };

  const handleShareWhatsApp = async (doc: any) => {
    const emp = employees.find((e: any) => e.full_name === doc.employee_name);
    const phone = emp?.phone;
    if (!phone) { toast.error("Employee phone not found"); return; }

    try {
      await supabase.functions.invoke("whatsapp-send", {
        body: {
          to: phone,
          type: "text",
          message: `Dear ${doc.employee_name},\n\nYour ${doc.document_type?.replace(/_/g, " ")} has been generated by HR.\n\nPlease check your email for the document.\n\nRegards,\nGrabYourCar HR`,
        },
      });
      toast.success(`WhatsApp sent to ${phone}`);
    } catch {
      toast.info("WhatsApp message queued");
    }
  };

  const handleVerify = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("employee_documents").update({
        is_verified: true,
        verified_by: user?.email || "HR Admin",
        verified_at: new Date().toISOString(),
      }).eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-all-documents"] });
      toast.success("Document verified ✅");
    },
  });

  const filteredDocs = useMemo(() => {
    if (!search) return documents;
    const q = search.toLowerCase();
    return documents.filter((d: any) =>
      d.employee_name?.toLowerCase().includes(q) ||
      d.document_type?.toLowerCase().includes(q) ||
      d.document_name?.toLowerCase().includes(q)
    );
  }, [documents, search]);

  const docStats = {
    total: documents.length,
    verified: documents.filter((d: any) => d.is_verified).length,
    pending: documents.filter((d: any) => !d.is_verified).length,
    thisMonth: documents.filter((d: any) => d.created_at?.startsWith(format(new Date(), "yyyy-MM"))).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{docStats.total}</p><p className="text-xs text-muted-foreground">Total Documents</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-2xl font-bold">{docStats.verified}</p><p className="text-xs text-muted-foreground">Verified</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg"><Shield className="h-5 w-5 text-amber-500" /></div>
            <div><p className="text-2xl font-bold">{docStats.pending}</p><p className="text-xs text-muted-foreground">Pending Verification</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Upload className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold">{docStats.thisMonth}</p><p className="text-xs text-muted-foreground">This Month</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, type..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => setShowGenerate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Generate Document
        </Button>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">All Employee Documents</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.employee_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {doc.document_type?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.created_at ? format(new Date(doc.created_at), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {doc.is_verified ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedDoc(doc)} title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)} title="Download PDF">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleShareEmail(doc)} title="Email">
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleShareWhatsApp(doc)} title="WhatsApp">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        {!doc.is_verified && (
                          <Button size="sm" variant="ghost" onClick={() => handleVerify.mutate(doc.id)} title="Verify">
                            <UserCheck className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No documents found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Generate Document Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Generate HR Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Employee</Label>
              <Select onValueChange={handleEmployeeSelect} value={form.employee_profile_id || ""}>
                <SelectTrigger><SelectValue placeholder="Choose employee..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.designation || "No designation"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Document Type</Label>
              <Select onValueChange={v => setForm(p => ({ ...p, document_type: v }))} value={form.document_type || ""}>
                <SelectTrigger><SelectValue placeholder="Choose type..." /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEmployee && (
              <>
                <Separator />
                <h4 className="font-semibold text-sm text-muted-foreground">Pre-filled Details (editable)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name</Label><Input value={form.employee_name || ""} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} /></div>
                  <div><Label>Designation</Label><Input value={form.designation || ""} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} /></div>
                  <div><Label>Department</Label><Input value={form.department || ""} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
                  <div><Label>Vertical</Label><Input value={form.vertical || ""} onChange={e => setForm(p => ({ ...p, vertical: e.target.value }))} /></div>
                  <div><Label>Manager</Label><Input value={form.manager || ""} onChange={e => setForm(p => ({ ...p, manager: e.target.value }))} /></div>
                  <div><Label>Joining Date</Label><Input type="date" value={form.joining_date || ""} onChange={e => setForm(p => ({ ...p, joining_date: e.target.value }))} /></div>
                </div>

                <Separator />
                <h4 className="font-semibold text-sm text-muted-foreground">Salary Breakdown</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Monthly CTC</Label><Input type="number" value={form.monthly_ctc || ""} onChange={e => setForm(p => ({ ...p, monthly_ctc: Number(e.target.value) }))} /></div>
                  <div><Label>Basic</Label><Input type="number" value={form.basic_salary || ""} onChange={e => setForm(p => ({ ...p, basic_salary: Number(e.target.value) }))} /></div>
                  <div><Label>HRA</Label><Input type="number" value={form.hra || ""} onChange={e => setForm(p => ({ ...p, hra: Number(e.target.value) }))} /></div>
                  <div><Label>DA</Label><Input type="number" value={form.da || ""} onChange={e => setForm(p => ({ ...p, da: Number(e.target.value) }))} /></div>
                  <div><Label>Special Allow.</Label><Input type="number" value={form.special_allowance || ""} onChange={e => setForm(p => ({ ...p, special_allowance: Number(e.target.value) }))} /></div>
                  <div><Label>Net Salary</Label><Input type="number" value={form.net_salary || ""} disabled className="bg-muted" /></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowGenerate(false); setForm({}); }}>Cancel</Button>
            <Button onClick={() => generateDoc.mutate()} disabled={generateDoc.isPending}>
              <FileText className="h-4 w-4 mr-2" /> Generate & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.document_name}</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <strong>{selectedDoc.employee_name}</strong></div>
                <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline" className="capitalize">{selectedDoc.document_type?.replace(/_/g, " ")}</Badge></div>
                <div><span className="text-muted-foreground">Created:</span> {selectedDoc.created_at ? format(new Date(selectedDoc.created_at), "dd MMM yyyy") : "—"}</div>
                <div><span className="text-muted-foreground">Verified:</span> {selectedDoc.is_verified ? "✅ Yes" : "❌ No"}</div>
              </div>
              {selectedDoc.generated_data && (
                <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                  <p><strong>Designation:</strong> {selectedDoc.generated_data.designation}</p>
                  <p><strong>Department:</strong> {selectedDoc.generated_data.department}</p>
                  <p><strong>CTC:</strong> {fmt(selectedDoc.generated_data.ctc || selectedDoc.generated_data.monthly_ctc)}</p>
                  <p><strong>Net Salary:</strong> {fmt(selectedDoc.generated_data.net_salary)}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleDownload(selectedDoc)}><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
                <Button size="sm" variant="outline" onClick={() => handleShareEmail(selectedDoc)}><Mail className="h-3.5 w-3.5 mr-1" /> Email</Button>
                <Button size="sm" variant="outline" onClick={() => handleShareWhatsApp(selectedDoc)}><MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeDocumentHub;
