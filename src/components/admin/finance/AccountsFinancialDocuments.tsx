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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FolderOpen, Plus, Search, FileText, Shield, Users, Scale,
  Building2, Eye, Trash2, Upload, AlertTriangle, CheckCircle2,
  Clock, Archive, Download, Filter, UserCheck, Briefcase
} from "lucide-react";

const DOC_TYPES = [
  { value: "kyc", label: "KYC Document", icon: Shield, color: "text-blue-600" },
  { value: "director_doc", label: "Director Document", icon: UserCheck, color: "text-purple-600" },
  { value: "investor_doc", label: "Investor Document", icon: Users, color: "text-emerald-600" },
  { value: "agreement", label: "Agreement / Contract", icon: Scale, color: "text-orange-600" },
  { value: "due_diligence", label: "Due Diligence", icon: Eye, color: "text-red-600" },
  { value: "tax", label: "Tax Document", icon: Building2, color: "text-amber-600" },
  { value: "compliance", label: "Compliance", icon: CheckCircle2, color: "text-teal-600" },
  { value: "financial_statement", label: "Financial Statement", icon: Briefcase, color: "text-indigo-600" },
  { value: "other", label: "Other", icon: FileText, color: "text-gray-600" },
];

const ENTITY_TYPES = ["director", "investor", "company", "vendor", "partner", "employee"];
const STATUS_OPTIONS = ["active", "expired", "pending", "archived", "under_review"];

const KYC_CATEGORIES = ["PAN Card", "Aadhaar Card", "Passport", "Driving License", "Voter ID", "GST Certificate", "Company PAN", "TAN Certificate", "FSSAI License", "Shop Act License", "Trade License", "Import/Export Code"];
const DIRECTOR_CATEGORIES = ["DIN Certificate", "DSC Certificate", "Appointment Letter", "Resignation Letter", "Board Resolution", "Director KYC", "MoA/AoA", "Form DIR-12"];
const INVESTOR_CATEGORIES = ["Term Sheet", "SHA Agreement", "Investment Agreement", "Cap Table", "Valuation Report", "DPIIT Certificate", "Share Certificate", "Conversion Notice"];
const AGREEMENT_CATEGORIES = ["Vendor Agreement", "Service Agreement", "NDA", "Employment Agreement", "Lease Agreement", "Franchise Agreement", "Partnership Deed", "MoU", "SLA"];
const DD_CATEGORIES = ["Financial Due Diligence", "Legal Due Diligence", "Tax Due Diligence", "Commercial DD", "HR Due Diligence", "IP Due Diligence", "Environmental DD"];

const getCategoryOptions = (docType: string) => {
  switch (docType) {
    case "kyc": return KYC_CATEGORIES;
    case "director_doc": return DIRECTOR_CATEGORIES;
    case "investor_doc": return INVESTOR_CATEGORIES;
    case "agreement": return AGREEMENT_CATEGORIES;
    case "due_diligence": return DD_CATEGORIES;
    default: return ["General", "Other"];
  }
};

const AccountsFinancialDocuments = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [activeType, setActiveType] = useState("all");

  const { data: documents = [] } = useQuery({
    queryKey: ["financial-documents"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("financial_documents") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (rec: any) => {
      const { error } = await (supabase.from("financial_documents") as any).insert(rec);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-documents"] });
      toast.success("Document added");
      setShowDialog(false);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("financial_documents") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financial-documents"] }); toast.success("Deleted"); },
  });

  const filtered = documents.filter((d: any) => {
    const matchesType = activeType === "all" || d.document_type === activeType;
    const matchesSearch = !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.entity_name?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
      expired: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
      pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
      archived: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
      under_review: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return <Badge className={`text-[10px] ${styles[status] || styles.active}`}>{status?.replace("_", " ")}</Badge>;
  };

  const getDocIcon = (type: string) => {
    const dt = DOC_TYPES.find(d => d.value === type);
    if (!dt) return <FileText className="h-5 w-5 text-muted-foreground" />;
    const Icon = dt.icon;
    return <Icon className={`h-5 w-5 ${dt.color}`} />;
  };

  const typeCounts = DOC_TYPES.map(dt => ({
    ...dt,
    count: documents.filter((d: any) => d.document_type === dt.value).length,
  }));

  const expiringCount = documents.filter((d: any) => {
    if (!d.expiry_date) return false;
    const diff = (new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;

  const expiredCount = documents.filter((d: any) => d.status === "expired" || (d.expiry_date && new Date(d.expiry_date) < new Date())).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><FolderOpen className="h-4 w-4 text-blue-600" /><p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Documents</p></div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{documents.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Active</p></div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{documents.filter((d: any) => d.status === "active").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-600" /><p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Expiring Soon</p></div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{expiringCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-red-600" /><p className="text-xs text-red-700 dark:text-red-400 font-medium">Expired</p></div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{expiredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Type Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <Button variant={activeType === "all" ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => setActiveType("all")}>
          All ({documents.length})
        </Button>
        {typeCounts.filter(t => t.count > 0).map(tc => (
          <Button key={tc.value} variant={activeType === tc.value ? "default" : "outline"} size="sm" className="text-xs h-8 gap-1" onClick={() => setActiveType(tc.value)}>
            <tc.icon className="h-3 w-3" /> {tc.label} ({tc.count})
          </Button>
        ))}
      </div>

      {/* Search + Add */}
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents, entities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => { setForm({ document_type: "kyc", status: "active" }); setShowDialog(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Document
        </Button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc: any) => (
          <Card key={doc.id} className="group hover:shadow-lg transition-all duration-300 hover:border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-muted/50">{getDocIcon(doc.document_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.document_category || doc.document_type?.replace("_", " ")}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(doc.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {doc.entity_name && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Entity</span>
                    <span className="font-medium">{doc.entity_name}</span>
                  </div>
                )}
                {doc.reference_number && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono">{doc.reference_number}</span>
                  </div>
                )}
                {doc.expiry_date && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Expiry</span>
                    <span className={`font-medium ${new Date(doc.expiry_date) < new Date() ? "text-red-600" : ""}`}>
                      {format(new Date(doc.expiry_date), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                {doc.issued_date && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Issued</span>
                    <span>{format(new Date(doc.issued_date), "dd MMM yyyy")}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  {getStatusBadge(doc.status)}
                  {doc.entity_type && <Badge variant="outline" className="text-[10px] capitalize">{doc.entity_type}</Badge>}
                </div>
                {doc.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{doc.description}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="p-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">No documents found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Upload KYC, agreements, DD reports and more</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Document Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Financial Document</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div><Label>Document Type *</Label>
              <Select value={form.document_type || "kyc"} onValueChange={v => setForm(p => ({ ...p, document_type: v, document_category: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={form.document_category || ""} onValueChange={v => setForm(p => ({ ...p, document_category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{getCategoryOptions(form.document_type).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Title *</Label><Input value={form.title || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. PAN Card - Rajesh Kumar" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entity Name</Label><Input value={form.entity_name || ""} onChange={e => setForm(p => ({ ...p, entity_name: e.target.value }))} placeholder="Director / Investor name" /></div>
              <div><Label>Entity Type</Label>
                <Select value={form.entity_type || ""} onValueChange={v => setForm(p => ({ ...p, entity_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issued Date</Label><Input type="date" value={form.issued_date || ""} onChange={e => setForm(p => ({ ...p, issued_date: e.target.value }))} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date || ""} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Reference Number</Label><Input value={form.reference_number || ""} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} placeholder="Doc ID / Number" /></div>
              <div><Label>Status</Label>
                <Select value={form.status || "active"} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>File URL</Label><Input value={form.file_url || ""} onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))} placeholder="https://..." /></div>
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate(form)} disabled={!form.title || !form.document_type}>Add Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsFinancialDocuments;
