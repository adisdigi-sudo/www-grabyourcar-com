import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, Download, Trash2, Plus, Eye, File } from "lucide-react";

const DOC_TYPES = [
  { value: "policy_copy", label: "Policy Copy" },
  { value: "rc_copy", label: "RC Copy" },
  { value: "id_proof", label: "ID Proof" },
  { value: "claim_form", label: "Claim Form" },
  { value: "invoice", label: "Invoice" },
  { value: "other", label: "Other" },
];

export function InsuranceDocumentVault() {
  const [clientFilter, setClientFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["ins-documents", clientFilter],
    queryFn: async () => {
      let q = supabase
        .from("insurance_documents")
        .select("*, insurance_clients(customer_name, phone)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (clientFilter !== "all") q = q.eq("client_id", clientFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["ins-clients-doc-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-documents"] });
      toast.success("Document deleted");
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async (form: { client_id: string; document_type: string; document_name: string; file: File }) => {
      // Upload to storage
      const ext = form.file.name.split(".").pop();
      const path = `insurance-docs/${form.client_id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("car-assets")
        .upload(path, form.file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("car-assets").getPublicUrl(path);

      const { error } = await supabase.from("insurance_documents").insert({
        client_id: form.client_id,
        document_type: form.document_type,
        document_name: form.document_name || form.file.name,
        file_url: urlData.publicUrl,
        file_size: `${(form.file.size / 1024).toFixed(0)} KB`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-documents"] });
      toast.success("Document uploaded");
      setShowUpload(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.customer_name || c.phone}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Upload className="h-4 w-4" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <UploadForm clients={clients || []} onSubmit={(f) => uploadDoc.mutate(f)} loading={uploadDoc.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Document Vault</CardTitle>
          <CardDescription>{documents?.length || 0} documents stored</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <File className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{d.document_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] capitalize">{d.document_type?.replace("_", " ")}</Badge>
                        <span className="text-[10px] text-muted-foreground">{d.insurance_clients?.customer_name || "—"}</span>
                        {d.file_size && <span className="text-[10px] text-muted-foreground">• {d.file_size}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(d.file_url, "_blank")}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(d.file_url, "_blank")}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteDoc.mutate(d.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UploadForm({ clients, onSubmit, loading }: { clients: any[]; onSubmit: (f: any) => void; loading: boolean }) {
  const [form, setForm] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Client *</Label>
        <Select value={form.client_id || ""} onValueChange={v => setForm((p: any) => ({ ...p, client_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.customer_name || c.phone}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Document Type *</Label>
        <Select value={form.document_type || ""} onValueChange={v => setForm((p: any) => ({ ...p, document_type: v }))}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Document Name</Label>
        <Input value={form.document_name || ""} onChange={e => setForm((p: any) => ({ ...p, document_name: e.target.value }))} placeholder="e.g. Policy Copy 2025" />
      </div>
      <div>
        <Label className="text-xs">File *</Label>
        <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      </div>
      <Button
        onClick={() => file && onSubmit({ ...form, file })}
        disabled={loading || !form.client_id || !form.document_type || !file}
        className="w-full"
      >
        {loading ? "Uploading..." : "Upload Document"}
      </Button>
    </div>
  );
}
