import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FolderOpen, Upload, Download, Search, Plus, FileText, Trash2, Eye,
  File, Image, Archive, FolderPlus, Tag
} from "lucide-react";

const CATEGORIES = [
  { value: "hr", label: "HR Documents" },
  { value: "financial", label: "Financial Documents" },
  { value: "business", label: "Business Documents" },
  { value: "employee", label: "Employee Documents" },
  { value: "legal", label: "Legal Documents" },
  { value: "template", label: "Templates" },
];

const SUB_CATEGORIES: Record<string, string[]> = {
  hr: ["offer_letter", "id_proof", "salary_agreement", "contract", "experience_letter"],
  financial: ["invoice", "payout_record", "salary_slip", "expense_receipt", "tax_document"],
  business: ["agreement", "proposal", "report", "presentation"],
  employee: ["aadhaar", "pan", "passport", "bank_details", "photo"],
  legal: ["compliance", "license", "registration"],
  template: ["hr_template", "finance_template", "marketing_template"],
};

export const DocumentVault = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ["document-vault", category],
    queryFn: async () => {
      let q = (supabase.from("document_vault") as any).select("*").eq("status", "active").order("created_at", { ascending: false });
      if (category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const path = `${category || "general"}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("hr-documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      // Use signed URL for private bucket
      const { data: signedData } = await supabase.storage.from("hr-documents").createSignedUrl(path, 31536000);

      const { error } = await (supabase.from("document_vault") as any).insert({
        title: form.title || file.name,
        description: form.description || "",
        category: form.category || "general",
        sub_category: form.sub_category || "",
        file_url: publicUrl,
        file_name: file.name,
        file_size: `${(file.size / 1024).toFixed(1)} KB`,
        file_type: file.type,
        tags: form.tags?.split(",").map((t: string) => t.trim()).filter(Boolean) || [],
        folder_path: form.folder_path || "/",
        related_entity_type: form.related_entity_type || "",
        related_entity_id: form.related_entity_id || "",
        uploaded_by: user?.id,
        month_year: format(new Date(), "yyyy-MM"),
      });
      if (error) throw error;

      toast.success("Document uploaded successfully");
      qc.invalidateQueries({ queryKey: ["document-vault"] });
      setShowUpload(false);
      setForm({});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("document_vault") as any).update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-vault"] });
      toast.success("Document archived");
    },
  });

  const filtered = documents.filter((d: any) =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const categoryCounts = CATEGORIES.map(c => ({
    ...c,
    count: documents.filter((d: any) => d.category === c.value).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><FolderOpen className="h-5 w-5" /> Document Vault</h2>
          <p className="text-sm text-muted-foreground">{documents.length} documents</p>
        </div>
        <Button onClick={() => setShowUpload(true)}><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
      </div>

      {/* Category Filter Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className={`cursor-pointer transition-all ${category === "all" ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setCategory("all")}>
          <CardContent className="p-3 text-center">
            <FolderOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">All</p>
            <p className="text-lg font-bold">{documents.length}</p>
          </CardContent>
        </Card>
        {categoryCounts.map(c => (
          <Card key={c.value} className={`cursor-pointer transition-all ${category === c.value ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setCategory(c.value)}>
            <CardContent className="p-3 text-center">
              <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">{c.label}</p>
              <p className="text-lg font-bold">{c.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search documents, tags..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc: any) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {doc.tags?.slice(0, 3).map((t: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{doc.file_size}</TableCell>
                  <TableCell className="text-sm">{doc.created_at ? format(new Date(doc.created_at), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {doc.file_url && (
                        <Button size="icon" variant="ghost" asChild>
                          <a href={doc.file_url} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                        if (confirm("Archive this document?")) deleteMutation.mutate(doc.id);
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Document Title *</Label><Input value={form.title || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category || ""} onValueChange={v => setForm(p => ({ ...p, category: v, sub_category: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sub-Category</Label>
                <Select value={form.sub_category || ""} onValueChange={v => setForm(p => ({ ...p, sub_category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(SUB_CATEGORIES[form.category] || []).map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags || ""} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="payroll, march, 2026" /></div>
            <div>
              <Label>File *</Label>
              <Input type="file" onChange={e => {
                const file = e.target.files?.[0];
                if (file) setForm(p => ({ ...p, file, title: p.title || file.name }));
              }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button disabled={!form.file || uploading} onClick={() => uploadFile(form.file)}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentVault;
