import { useState } from "react";
import { useKYCDocuments, useUpdateKYC, RentalKYCDocument } from "@/hooks/useRentalAgreements";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ShieldCheck, ShieldAlert, Search, Eye, CheckCircle2, XCircle,
  FileText, Upload, RefreshCw, CreditCard, UserCheck, MapPin,
} from "lucide-react";

const DOC_ICONS: Record<string, any> = {
  aadhaar: UserCheck,
  driving_license: CreditCard,
  pan_card: FileText,
  address_proof: MapPin,
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  auto_verified: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export function KYCVerificationPanel() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RentalKYCDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const updateKYC = useUpdateKYC();

  // Load all KYC documents across all agreements
  const { data: allDocs = [], isLoading, refetch } = useKYCDocuments(undefined, undefined);

  // Since we pass undefined for both, the query is disabled. Let's use a different approach.
  // We'll load all via a direct query.
  const [docs, setDocs] = useState<RentalKYCDocument[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadAll = async () => {
    const { data, error } = await supabase
      .from("rental_kyc_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setDocs(data as RentalKYCDocument[]);
    setLoaded(true);
  };

  if (!loaded) loadAll();

  const filtered = docs.filter(d =>
    (d.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    d.customer_phone.includes(search) ||
    d.document_type.includes(search.toLowerCase())
  );

  const handleVerify = async (doc: RentalKYCDocument) => {
    try {
      await updateKYC.mutateAsync({
        id: doc.id,
        updates: {
          verification_status: "verified",
          verified_via: "manual",
          verified_at: new Date().toISOString(),
          verified_by: "admin",
        },
      });
      toast.success(`${doc.document_type} verified!`);
      setSelected(null);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = async (doc: RentalKYCDocument) => {
    if (!rejectionReason.trim()) { toast.error("Please provide rejection reason"); return; }
    try {
      await updateKYC.mutateAsync({
        id: doc.id,
        updates: {
          verification_status: "rejected",
          rejection_reason: rejectionReason,
          verified_by: "admin",
          verified_at: new Date().toISOString(),
        },
      });
      toast.success(`${doc.document_type} rejected`);
      setSelected(null);
      setRejectionReason("");
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSurepassVerify = async (doc: RentalKYCDocument) => {
    if (!doc.document_number) { toast.error("Document number required for auto-verification"); return; }
    toast.info("Initiating Surepass verification...");
    try {
      const { data, error } = await supabase.functions.invoke("surepass-verify", {
        body: { document_type: doc.document_type, document_number: doc.document_number },
      });
      if (error) throw error;
      await updateKYC.mutateAsync({
        id: doc.id,
        updates: {
          verification_status: data?.verified ? "auto_verified" : "pending",
          verified_via: "surepass",
          verified_at: new Date().toISOString(),
          surepass_response: data || {},
          extracted_data: data?.extracted_data || {},
        },
      });
      toast.success(data?.verified ? "Auto-verified via Surepass!" : "Verification inconclusive, manual review needed");
      loadAll();
    } catch (e: any) {
      toast.error("Surepass verification failed: " + e.message);
    }
  };

  const pendingCount = docs.filter(d => d.verification_status === "pending").length;
  const verifiedCount = docs.filter(d => ["verified", "auto_verified"].includes(d.verification_status)).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="py-3 text-center">
          <div className="text-2xl font-bold">{docs.length}</div>
          <div className="text-xs text-muted-foreground">Total Documents</div>
        </CardContent></Card>
        <Card className="border-amber-200"><CardContent className="py-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          <div className="text-xs text-muted-foreground">Pending Review</div>
        </CardContent></Card>
        <Card className="border-emerald-200"><CardContent className="py-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{verifiedCount}</div>
          <div className="text-xs text-muted-foreground">Verified</div>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, type..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" variant="outline" onClick={() => loadAll()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {docs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No KYC documents uploaded yet</p>
          <p className="text-xs mt-1">Documents will appear here when clients upload via agreement page</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(doc => {
            const Icon = DOC_ICONS[doc.document_type] || FileText;
            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(doc)}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm capitalize">{doc.document_type.replace(/_/g, " ")}</span>
                          <Badge className={`text-[10px] ${STATUS_STYLES[doc.verification_status]}`}>
                            {doc.verification_status.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {doc.customer_name || "N/A"} • {doc.customer_phone}
                          {doc.document_number && <> • {doc.document_number}</>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {doc.verification_status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" className="text-emerald-600 gap-1" onClick={() => handleVerify(doc)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="text-blue-600 gap-1" onClick={() => handleSurepassVerify(doc)}>
                            <ShieldCheck className="h-3.5 w-3.5" /> Auto-Verify
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="capitalize">{selected.document_type.replace(/_/g, " ")} - {selected.customer_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><Label className="text-xs text-muted-foreground">Phone</Label><div>{selected.customer_phone}</div></div>
                <div><Label className="text-xs text-muted-foreground">Document #</Label><div>{selected.document_number || "N/A"}</div></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={STATUS_STYLES[selected.verification_status]}>{selected.verification_status}</Badge>
                </div>
                {selected.verified_at && (
                  <div><Label className="text-xs text-muted-foreground">Verified At</Label><div className="text-xs">{format(new Date(selected.verified_at), "PPp")}</div></div>
                )}
              </div>

              {/* Document Images */}
              <div className="grid grid-cols-2 gap-2">
                {selected.document_front_url && (
                  <div>
                    <Label className="text-xs">Front</Label>
                    <img src={selected.document_front_url} alt="Front" className="w-full rounded border mt-1" />
                  </div>
                )}
                {selected.document_back_url && (
                  <div>
                    <Label className="text-xs">Back</Label>
                    <img src={selected.document_back_url} alt="Back" className="w-full rounded border mt-1" />
                  </div>
                )}
              </div>

              {/* Extracted Data */}
              {selected.extracted_data && Object.keys(selected.extracted_data).length > 0 && (
                <div>
                  <Label className="text-xs">Extracted Data (Surepass)</Label>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                    {JSON.stringify(selected.extracted_data, null, 2)}
                  </pre>
                </div>
              )}

              {selected.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-950/20 rounded p-2 text-xs text-red-700">
                  <strong>Rejection Reason:</strong> {selected.rejection_reason}
                </div>
              )}

              {selected.verification_status === "pending" && (
                <div className="space-y-2">
                  <Textarea placeholder="Rejection reason (required to reject)..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleReject(selected)}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-blue-600" onClick={() => handleSurepassVerify(selected)}>
                      <ShieldCheck className="h-3.5 w-3.5" /> Surepass Verify
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => handleVerify(selected)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
