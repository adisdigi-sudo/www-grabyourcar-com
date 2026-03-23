import { useState } from "react";
import { useRentalAgreements, useCreateAgreement, useUpdateAgreement, useAddAgreementHistory, useAgreementHistory, useKYCDocuments, RentalAgreement } from "@/hooks/useRentalAgreements";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Plus, Send, Eye, Edit, CheckCircle2, Clock, XCircle, History, MessageCircle, Copy, Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  viewed: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  signed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
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

export function AgreementManagement() {
  const { data: agreements = [], isLoading } = useRentalAgreements();
  const createMut = useCreateAgreement();
  const updateMut = useUpdateAgreement();
  const addHistory = useAddAgreementHistory();

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<RentalAgreement | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "",
    vehicle_name: "", vehicle_number: "",
    pickup_date: "", dropoff_date: "",
    pickup_location: "", dropoff_location: "",
    rental_amount: 0, security_deposit: 0,
    terms_html: DEFAULT_TERMS, notes: "",
  });

  const filtered = agreements.filter(a =>
    a.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    a.customer_phone.includes(search) ||
    (a.agreement_number || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.customer_name || !form.customer_phone) {
      toast.error("Customer name & phone required");
      return;
    }
    try {
      const result = await createMut.mutateAsync({ ...form, status: "draft" });
      await addHistory.mutateAsync({
        agreement_id: result.id,
        action: "created",
        action_by: "admin",
        details: { customer_name: form.customer_name },
      });
      toast.success("Agreement created!");
      setShowCreate(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSend = async (agr: RentalAgreement) => {
    const shareUrl = `${window.location.origin}/agreement/${agr.share_token}`;
    try {
      await updateMut.mutateAsync({ id: agr.id, updates: { status: "sent", shared_at: new Date().toISOString() } });
      await addHistory.mutateAsync({ agreement_id: agr.id, action: "sent_to_client", action_by: "admin", details: { url: shareUrl } });
      
      const waMsg = `Hi ${agr.customer_name}, your rental agreement from *GrabYourCar* is ready for review & signing.\n\n📄 Agreement: ${agr.agreement_number}\n🚗 Vehicle: ${agr.vehicle_name || "TBD"}\n\nPlease review and sign here:\n${shareUrl}\n\nThank you!`;
      const waUrl = `https://wa.me/91${agr.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(waMsg)}`;
      window.open(waUrl, "_blank");
      
      await updateMut.mutateAsync({ id: agr.id, updates: { shared_via_whatsapp: true } });
      toast.success("Agreement sent via WhatsApp!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copyLink = (agr: RentalAgreement) => {
    const url = `${window.location.origin}/agreement/${agr.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Agreement link copied!");
  };

  const resetForm = () => setForm({
    customer_name: "", customer_phone: "", customer_email: "",
    vehicle_name: "", vehicle_number: "",
    pickup_date: "", dropoff_date: "",
    pickup_location: "", dropoff_location: "",
    rental_amount: 0, security_deposit: 0,
    terms_html: DEFAULT_TERMS, notes: "",
  });

  const openEdit = (agr: RentalAgreement) => {
    setForm({
      customer_name: agr.customer_name, customer_phone: agr.customer_phone,
      customer_email: agr.customer_email || "",
      vehicle_name: agr.vehicle_name || "", vehicle_number: agr.vehicle_number || "",
      pickup_date: agr.pickup_date || "", dropoff_date: agr.dropoff_date || "",
      pickup_location: agr.pickup_location || "", dropoff_location: agr.dropoff_location || "",
      rental_amount: agr.rental_amount, security_deposit: agr.security_deposit,
      terms_html: agr.terms_html, notes: agr.notes || "",
    });
    setSelected(agr);
    setShowCreate(true);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await updateMut.mutateAsync({ id: selected.id, updates: form as any });
      await addHistory.mutateAsync({ agreement_id: selected.id, action: "edited", action_by: "admin" });
      toast.success("Agreement updated!");
      setShowCreate(false);
      setSelected(null);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search agreements..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => { resetForm(); setSelected(null); setShowCreate(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Agreement
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading agreements...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No agreements yet</p>
          <p className="text-xs mt-1">Create your first branded rental agreement</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(agr => (
            <Card key={agr.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelected(agr); setShowDetail(true); }}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{agr.customer_name}</span>
                        <Badge className={`text-[10px] ${STATUS_COLORS[agr.status] || STATUS_COLORS.draft}`}>
                          {agr.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{agr.agreement_number}</span>
                        <span>•</span>
                        <span>{agr.customer_phone}</span>
                        {agr.vehicle_name && <><span>•</span><span>{agr.vehicle_name}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {agr.status === "draft" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(agr)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="default" className="gap-1" onClick={() => handleSend(agr)}>
                          <Send className="h-3.5 w-3.5" /> Send
                        </Button>
                      </>
                    )}
                    {agr.status === "sent" && (
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => copyLink(agr)}>
                        <Copy className="h-3.5 w-3.5" /> Copy Link
                      </Button>
                    )}
                    {agr.client_signed_at && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Signed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? "Edit Agreement" : "Create New Agreement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Phone *</Label><Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} /></div>
              <div><Label className="text-xs">Email</Label><Input value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} /></div>
              <div><Label className="text-xs">Vehicle</Label><Input value={form.vehicle_name} onChange={e => setForm(f => ({ ...f, vehicle_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Vehicle Number</Label><Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} /></div>
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
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={selected ? handleUpdate : handleCreate} disabled={createMut.isPending || updateMut.isPending}>
                {selected ? "Update Agreement" : "Create Agreement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail / History Dialog */}
      {selected && showDetail && (
        <AgreementDetailDialog agreement={selected} onClose={() => { setShowDetail(false); setSelected(null); }} />
      )}
    </div>
  );
}

function AgreementDetailDialog({ agreement, onClose }: { agreement: RentalAgreement; onClose: () => void }) {
  const { data: history = [] } = useAgreementHistory(agreement.id);
  const { data: kycDocs = [] } = useKYCDocuments(agreement.id, agreement.customer_phone);

  const ACTION_ICONS: Record<string, any> = {
    created: Clock, sent_to_client: Send, edited: Edit,
    viewed_by_client: Eye, signed_by_client: CheckCircle2, kyc_uploaded: FileText,
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {agreement.agreement_number}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 pr-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Customer:</span> <strong>{agreement.customer_name}</strong></div>
              <div><span className="text-muted-foreground">Phone:</span> {agreement.customer_phone}</div>
              <div><span className="text-muted-foreground">Vehicle:</span> {agreement.vehicle_name || "N/A"}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_COLORS[agreement.status]}>{agreement.status}</Badge></div>
              <div><span className="text-muted-foreground">Amount:</span> ₹{agreement.rental_amount.toLocaleString()}</div>
              <div><span className="text-muted-foreground">Deposit:</span> ₹{agreement.security_deposit.toLocaleString()}</div>
            </div>

            {agreement.client_signed_at && (
              <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Client Signed</span>
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    Signed by: {agreement.client_signed_name} ({agreement.client_signature_type}) • {format(new Date(agreement.client_signed_at), "PPp")}
                  </div>
                  {agreement.client_signature_type === "draw" && agreement.client_signature_data && (
                    <img src={agreement.client_signature_data} alt="Signature" className="mt-2 h-16 border rounded bg-white" />
                  )}
                  {agreement.client_signature_type === "type" && agreement.client_signature_data && (
                    <div className="mt-2 text-xl italic font-serif border rounded px-3 py-1 bg-white text-black inline-block">
                      {agreement.client_signature_data}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* KYC Status */}
            {kycDocs.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">KYC Documents</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {kycDocs.map(doc => (
                      <Card key={doc.id} className="text-xs">
                        <CardContent className="py-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium capitalize">{doc.document_type.replace(/_/g, " ")}</span>
                            <Badge className={doc.verification_status === "verified" ? "bg-emerald-100 text-emerald-700" : doc.verification_status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                              {doc.verification_status}
                            </Badge>
                          </div>
                          {doc.document_number && <div className="text-muted-foreground mt-0.5">{doc.document_number}</div>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* History */}
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                <History className="h-4 w-4" /> Agreement History
              </h4>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history yet</p>
              ) : (
                <div className="space-y-2">
                  {history.map(h => {
                    const Icon = ACTION_ICONS[h.action] || Clock;
                    return (
                      <div key={h.id} className="flex items-start gap-2 text-xs">
                        <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                        <div>
                          <span className="font-medium capitalize">{h.action.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground ml-1">by {h.action_by || "system"}</span>
                          <div className="text-muted-foreground">{format(new Date(h.created_at), "PPp")}</div>
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
