import { useState } from "react";
import {
  useRentalAgreements, useCreateAgreement, useUpdateAgreement,
  useAddAgreementHistory, useAgreementHistory, useKYCDocuments,
  RentalAgreement,
} from "@/hooks/useRentalAgreements";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import {
  FileText, Plus, Send, Eye, Edit, CheckCircle2, Clock, XCircle,
  History, Copy, Search, Download, RefreshCw,
  ExternalLink, ShieldCheck,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  viewed: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  signed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const STATUS_ICONS: Record<string, any> = {
  draft: Edit, sent: Send, viewed: Eye, signed: CheckCircle2, expired: XCircle,
};

const DEFAULT_TERMS = `<h2>Self-Drive Car Rental Agreement</h2>
<p>This Rental Agreement ("Agreement") is entered into between <strong>GrabYourCar</strong> ("Company") and the Customer identified below.</p>
<h3>Terms & Conditions</h3>
<ol>
<li>The vehicle shall be used exclusively by the authorized renter whose KYC is verified.</li>
<li>The renter shall return the vehicle on the agreed date with the same fuel level.</li>
<li>Any traffic violations or challans during the rental period are the renter's responsibility.</li>
<li>Security deposit will be refunded within 3-5 business days after trip completion inspection.</li>
<li>Extra KM charges apply beyond the agreed limit at ₹12/km.</li>
<li>Late return will attract ₹500/hour penalty beyond 2 hours grace period.</li>
<li>The renter must not use the vehicle for illegal activities, racing, or sub-renting.</li>
<li>Insurance excess/deductible up to ₹15,000 is payable by the renter in case of accident.</li>
<li>Vehicle condition will be documented via photos before and after the trip.</li>
<li>GrabYourCar reserves the right to remotely disable the vehicle in case of misuse.</li>
</ol>`;

type FormState = {
  customer_name: string; customer_phone: string; customer_email: string;
  vehicle_name: string; vehicle_number: string;
  pickup_date: string; dropoff_date: string;
  pickup_location: string; dropoff_location: string;
  rental_amount: number; security_deposit: number;
  terms_html: string; notes: string;
};

const emptyForm: FormState = {
  customer_name: "", customer_phone: "", customer_email: "",
  vehicle_name: "", vehicle_number: "",
  pickup_date: "", dropoff_date: "",
  pickup_location: "", dropoff_location: "",
  rental_amount: 0, security_deposit: 0,
  terms_html: DEFAULT_TERMS, notes: "",
};

export function AgreementManagement() {
  const { data: agreements = [], isLoading, refetch } = useRentalAgreements();
  const createMut = useCreateAgreement();
  const updateMut = useUpdateAgreement();
  const addHistory = useAddAgreementHistory();

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<RentalAgreement | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [form, setForm] = useState<FormState>({ ...emptyForm });

  const filtered = agreements.filter(a => {
    const matchSearch = a.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      a.customer_phone.includes(search) ||
      (a.agreement_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = agreements.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCreate = async () => {
    if (!form.customer_name || !form.customer_phone) {
      toast.error("Customer name & phone are required"); return;
    }
    try {
      const result = await createMut.mutateAsync({ ...form, status: "draft" });
      await addHistory.mutateAsync({
        agreement_id: result.id, action: "created", action_by: "admin",
        details: { customer_name: form.customer_name },
      });
      toast.success("Agreement created!");
      setShowCreate(false);
      setForm({ ...emptyForm });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSend = async (agr: RentalAgreement) => {
    const shareUrl = `${window.location.origin}/agreement/${agr.share_token}`;
    try {
      await updateMut.mutateAsync({ id: agr.id, updates: { status: "sent", shared_at: new Date().toISOString() } });
      await addHistory.mutateAsync({ agreement_id: agr.id, action: "sent_to_client", action_by: "admin", details: { url: shareUrl } });

      const waMsg = `Hi ${agr.customer_name}, your rental agreement from *GrabYourCar* is ready.\n\n📄 ${agr.agreement_number}\n🚗 ${agr.vehicle_name || "TBD"}\n\nReview & sign: ${shareUrl}`;
      window.open(`https://wa.me/91${agr.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(waMsg)}`, "_blank");

      await updateMut.mutateAsync({ id: agr.id, updates: { shared_via_whatsapp: true } });
      toast.success("Agreement sent via WhatsApp!");
    } catch (e: any) { toast.error(e.message); }
  };

  const copyLink = (agr: RentalAgreement) => {
    navigator.clipboard.writeText(`${window.location.origin}/agreement/${agr.share_token}`);
    toast.success("Link copied!");
  };

  const openEdit = (agr: RentalAgreement) => {
    if (agr.status === "signed") {
      toast.error("Cannot edit signed agreements. Create a new version instead.");
      return;
    }
    setForm({
      customer_name: agr.customer_name, customer_phone: agr.customer_phone,
      customer_email: agr.customer_email || "", vehicle_name: agr.vehicle_name || "",
      vehicle_number: agr.vehicle_number || "",
      pickup_date: agr.pickup_date || "", dropoff_date: agr.dropoff_date || "",
      pickup_location: agr.pickup_location || "", dropoff_location: agr.dropoff_location || "",
      rental_amount: agr.rental_amount, security_deposit: agr.security_deposit,
      terms_html: agr.terms_html, notes: agr.notes || "",
    });
    setSelected(agr);
    setShowCreate(true);
  };

  const handleCreateNewVersion = async (agr: RentalAgreement) => {
    try {
      const result = await createMut.mutateAsync({
        customer_name: agr.customer_name, customer_phone: agr.customer_phone,
        customer_email: agr.customer_email || undefined, vehicle_name: agr.vehicle_name || undefined,
        vehicle_number: agr.vehicle_number || undefined,
        pickup_date: agr.pickup_date || undefined, dropoff_date: agr.dropoff_date || undefined,
        pickup_location: agr.pickup_location || undefined, dropoff_location: agr.dropoff_location || undefined,
        rental_amount: agr.rental_amount, security_deposit: agr.security_deposit,
        terms_html: agr.terms_html, notes: `New version of ${agr.agreement_number}`,
        status: "draft",
      });
      await addHistory.mutateAsync({
        agreement_id: result.id, action: "created", action_by: "admin",
        details: { previous_version: agr.agreement_number, source: "version_copy" },
      });
      await addHistory.mutateAsync({
        agreement_id: agr.id, action: "new_version_created", action_by: "admin",
        details: { new_agreement_id: result.id },
      });
      toast.success("New version created as draft!");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await updateMut.mutateAsync({ id: selected.id, updates: form as any });
      await addHistory.mutateAsync({ agreement_id: selected.id, action: "edited", action_by: "admin" });
      toast.success("Agreement updated!");
      setShowCreate(false);
      setSelected(null);
      setForm({ ...emptyForm });
    } catch (e: any) { toast.error(e.message); }
  };

  const downloadPDF = (agr: RentalAgreement) => {
    try {
      const doc = new jsPDF();
      const w = doc.internal.pageSize.getWidth();
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("GrabYourCar - Rental Agreement", w / 2, 20, { align: "center" });
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(agr.agreement_number || "", w / 2, 27, { align: "center" });
      doc.line(15, 32, w - 15, 32);

      let y = 40;
      const fields = [
        ["Customer", agr.customer_name], ["Phone", agr.customer_phone],
        ["Vehicle", `${agr.vehicle_name || "N/A"} ${agr.vehicle_number || ""}`],
        ["Pickup", agr.pickup_date || "N/A"], ["Dropoff", agr.dropoff_date || "N/A"],
        ["Amount", `Rs. ${agr.rental_amount.toLocaleString("en-IN")}`],
        ["Deposit", `Rs. ${agr.security_deposit.toLocaleString("en-IN")}`],
        ["Status", agr.status.toUpperCase()],
      ];
      fields.forEach(([l, v]) => {
        doc.setFont("helvetica", "bold"); doc.text(`${l}:`, 18, y);
        doc.setFont("helvetica", "normal"); doc.text(String(v), 60, y); y += 7;
      });

      y += 5; doc.line(15, y, w - 15, y); y += 8;
      doc.setFont("helvetica", "bold"); doc.text("Terms", 18, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      const text = agr.terms_html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      doc.splitTextToSize(text, w - 36).forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 18, y); y += 4.5;
      });

      if (agr.client_signed_at) {
        if (y > 240) { doc.addPage(); y = 20; }
        y += 8; doc.line(15, y, w - 15, y); y += 8;
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text("Signature", 18, y); y += 7;
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text(`Signed by: ${agr.client_signed_name || agr.customer_name}`, 18, y); y += 5;
        doc.text(`Method: ${agr.client_signature_type === "draw" ? "Hand-drawn" : "Typed"}`, 18, y); y += 5;
        doc.text(`Date: ${format(new Date(agr.client_signed_at), "PPpp")}`, 18, y); y += 5;
        if (agr.client_ip_address) { doc.text(`IP: ${agr.client_ip_address}`, 18, y); y += 5; }
        if (agr.client_signature_type === "draw" && agr.client_signature_data) {
          try { doc.addImage(agr.client_signature_data, "PNG", 18, y, 80, 25); } catch { /* skip */ }
        } else if (agr.client_signature_type === "type" && agr.client_signature_data) {
          y += 4; doc.setFontSize(18); doc.setFont("times", "italic");
          doc.text(agr.client_signature_data, 18, y);
        }
      }

      doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text("Legally binding digital agreement - GrabYourCar", w / 2, 285, { align: "center" });
      doc.save(`${agr.agreement_number || "agreement"}.pdf`);
      toast.success("PDF downloaded!");
    } catch { toast.error("PDF generation failed"); }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Total", count: agreements.length, color: "", filter: "all" },
          { label: "Draft", count: statusCounts.draft || 0, color: "text-muted-foreground", filter: "draft" },
          { label: "Sent", count: statusCounts.sent || 0, color: "text-blue-600", filter: "sent" },
          { label: "Viewed", count: statusCounts.viewed || 0, color: "text-amber-600", filter: "viewed" },
          { label: "Signed", count: statusCounts.signed || 0, color: "text-emerald-600", filter: "signed" },
        ].map(s => (
          <Card key={s.filter}
            className={`cursor-pointer transition-all ${statusFilter === s.filter ? "ring-2 ring-primary" : "hover:shadow-md"}`}
            onClick={() => setStatusFilter(s.filter)}>
            <CardContent className="py-2.5 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, agreement..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => { setForm({ ...emptyForm }); setSelected(null); setShowCreate(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Agreement
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No agreements found</p>
          <p className="text-xs mt-1">Create your first branded rental agreement</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(agr => {
            const SIcon = STATUS_ICONS[agr.status] || FileText;
            return (
              <Card key={agr.id} className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => { setSelected(agr); setShowDetail(true); }}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${agr.status === "signed" ? "bg-emerald-100 dark:bg-emerald-950" : "bg-primary/10"}`}>
                        <SIcon className={`h-4 w-4 ${agr.status === "signed" ? "text-emerald-600" : "text-primary"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{agr.customer_name}</span>
                          <Badge className={`text-[10px] ${STATUS_COLORS[agr.status] || STATUS_COLORS.draft}`}>
                            {agr.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                          <span>{agr.agreement_number}</span>
                          <span>•</span><span>{agr.customer_phone}</span>
                          {agr.vehicle_name && <><span>•</span><span>{agr.vehicle_name}</span></>}
                          {agr.client_signed_at && <><span>•</span><span>Signed {format(new Date(agr.client_signed_at), "dd MMM")}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {agr.status === "draft" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(agr)} title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="default" className="gap-1" onClick={() => handleSend(agr)}>
                            <Send className="h-3.5 w-3.5" /> Send
                          </Button>
                        </>
                      )}
                      {(agr.status === "sent" || agr.status === "viewed") && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(agr)} title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => copyLink(agr)} title="Copy Link"><Copy className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleSend(agr)} title="Resend"><Send className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                      {agr.status === "signed" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => downloadPDF(agr)} title="Download PDF"><Download className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleCreateNewVersion(agr)}>
                            <Plus className="h-3 w-3" /> New Version
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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selected ? `Edit Agreement ${selected.agreement_number || ""}` : "Create New Agreement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Full legal name" /></div>
              <div><Label className="text-xs">Phone *</Label><Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="10-digit mobile" /></div>
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} /></div>
              <div><Label className="text-xs">Vehicle</Label><Input value={form.vehicle_name} onChange={e => setForm(f => ({ ...f, vehicle_name: e.target.value }))} placeholder="e.g. Hyundai Creta" /></div>
              <div><Label className="text-xs">Vehicle Number</Label><Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="e.g. MH12AB1234" /></div>
              <div><Label className="text-xs">Pickup Date</Label><Input type="date" value={form.pickup_date} onChange={e => setForm(f => ({ ...f, pickup_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Dropoff Date</Label><Input type="date" value={form.dropoff_date} onChange={e => setForm(f => ({ ...f, dropoff_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Pickup Location</Label><Input value={form.pickup_location} onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value }))} /></div>
              <div><Label className="text-xs">Dropoff Location</Label><Input value={form.dropoff_location} onChange={e => setForm(f => ({ ...f, dropoff_location: e.target.value }))} /></div>
              <div><Label className="text-xs">Rental Amount (₹)</Label><Input type="number" value={form.rental_amount} onChange={e => setForm(f => ({ ...f, rental_amount: +e.target.value }))} /></div>
              <div><Label className="text-xs">Security Deposit (₹)</Label><Input type="number" value={form.security_deposit} onChange={e => setForm(f => ({ ...f, security_deposit: +e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs">Agreement Terms (HTML)</Label>
              <Textarea rows={8} value={form.terms_html} onChange={e => setForm(f => ({ ...f, terms_html: e.target.value }))} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs">Internal Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setSelected(null); }}>Cancel</Button>
              <Button onClick={selected ? handleUpdate : handleCreate}
                disabled={createMut.isPending || updateMut.isPending}>
                {selected ? "Update Agreement" : "Create Agreement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selected && showDetail && (
        <AgreementDetailDialog agreement={selected}
          onClose={() => { setShowDetail(false); setSelected(null); }}
          onDownloadPDF={() => downloadPDF(selected)}
          onCreateVersion={() => handleCreateNewVersion(selected)}
        />
      )}
    </div>
  );
}

// ─── Detail Dialog ─────────────────────────────────────────────────
function AgreementDetailDialog({ agreement, onClose, onDownloadPDF, onCreateVersion }: {
  agreement: RentalAgreement; onClose: () => void;
  onDownloadPDF: () => void; onCreateVersion: () => void;
}) {
  const { data: history = [], isLoading: histLoading } = useAgreementHistory(agreement.id);
  const { data: kycDocs = [] } = useKYCDocuments(agreement.id, agreement.customer_phone);

  const HISTORY_ICONS: Record<string, any> = {
    created: Clock, sent_to_client: Send, edited: Edit,
    viewed_by_client: Eye, signed_by_client: CheckCircle2,
    kyc_uploaded: FileText, new_version_created: RefreshCw,
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {agreement.agreement_number}
            <Badge className={STATUS_COLORS[agreement.status]}>{agreement.status.toUpperCase()}</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-5 pr-4">
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Customer</span><div className="font-medium">{agreement.customer_name}</div></div>
              <div><span className="text-muted-foreground text-xs">Phone</span><div className="font-medium">{agreement.customer_phone}</div></div>
              <div><span className="text-muted-foreground text-xs">Vehicle</span><div className="font-medium">{agreement.vehicle_name || "N/A"} {agreement.vehicle_number ? `(${agreement.vehicle_number})` : ""}</div></div>
              <div><span className="text-muted-foreground text-xs">Amount</span><div className="font-bold text-primary">₹{agreement.rental_amount.toLocaleString("en-IN")}</div></div>
              <div><span className="text-muted-foreground text-xs">Deposit</span><div className="font-medium">₹{agreement.security_deposit.toLocaleString("en-IN")}</div></div>
              <div><span className="text-muted-foreground text-xs">Created</span><div className="font-medium text-xs">{format(new Date(agreement.created_at), "PPp")}</div></div>
              {agreement.pickup_date && <div><span className="text-muted-foreground text-xs">Pickup</span><div className="font-medium">{agreement.pickup_date}</div></div>}
              {agreement.dropoff_date && <div><span className="text-muted-foreground text-xs">Dropoff</span><div className="font-medium">{agreement.dropoff_date}</div></div>}
            </div>

            {/* Signature Block */}
            {agreement.client_signed_at && (
              <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-semibold text-sm">Client Signed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Name: <strong>{agreement.client_signed_name}</strong></div>
                    <div>Method: <strong>{agreement.client_signature_type === "draw" ? "Hand-drawn" : "Typed"}</strong></div>
                    <div>Date: <strong>{format(new Date(agreement.client_signed_at), "PPpp")}</strong></div>
                    {agreement.client_ip_address && <div>IP: <strong>{agreement.client_ip_address}</strong></div>}
                  </div>
                  {agreement.client_signature_type === "draw" && agreement.client_signature_data && (
                    <img src={agreement.client_signature_data} alt="Signature" className="h-16 border rounded bg-white p-1" />
                  )}
                  {agreement.client_signature_type === "type" && agreement.client_signature_data && (
                    <div className="text-xl italic font-serif border rounded px-3 py-1 bg-white text-black inline-block">
                      {agreement.client_signature_data}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {agreement.share_token && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
                  window.open(`${window.location.origin}/agreement/${agreement.share_token}`, "_blank");
                }}>
                  <ExternalLink className="h-3.5 w-3.5" /> View Agreement Page
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onDownloadPDF}>
                <Download className="h-3.5 w-3.5" /> Download PDF
              </Button>
              {agreement.status === "signed" && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onCreateVersion}>
                  <Plus className="h-3.5 w-3.5" /> New Version
                </Button>
              )}
            </div>

            {/* KYC Docs */}
            {kycDocs.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" /> KYC Documents
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {kycDocs.map(doc => (
                      <Card key={doc.id} className="text-xs">
                        <CardContent className="py-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium capitalize">{doc.document_type.replace(/_/g, " ")}</span>
                            <Badge className={
                              doc.verification_status === "verified" || doc.verification_status === "auto_verified"
                                ? "bg-emerald-100 text-emerald-700"
                                : doc.verification_status === "rejected" ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }>{doc.verification_status}</Badge>
                          </div>
                          {doc.document_number && <div className="text-muted-foreground mt-0.5">{doc.document_number}</div>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* History Timeline */}
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                <History className="h-4 w-4 text-primary" /> Agreement Timeline
              </h4>
              {histLoading ? (
                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history recorded</p>
              ) : (
                <div className="space-y-0">
                  {history.map((h, i) => {
                    const HIcon = HISTORY_ICONS[h.action] || Clock;
                    return (
                      <div key={h.id} className="flex gap-3 relative">
                        {i < history.length - 1 && (
                          <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
                        )}
                        <div className="p-1 rounded-full bg-muted z-10 shrink-0">
                          <HIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="pb-4 flex-1 min-w-0">
                          <div className="text-xs font-medium capitalize">{h.action.replace(/_/g, " ")}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {h.action_by && <span>by {h.action_by} • </span>}
                            {format(new Date(h.created_at), "PPp")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
