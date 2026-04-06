import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Send, Download, Mail, MessageCircle, Phone, Building2,
  FileText, IndianRupee, Calculator, Share2, Loader2, CheckCircle2, Radio
} from "lucide-react";
import { generateLoanOfferPDF, generateBankComparisonPDF } from "./LoanOfferPDF";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { OmniShareDialog } from "@/components/admin/shared/OmniShareDialog";
import { omniSend, omniSendBulk } from "@/lib/omniSend";

interface LoanBulkOfferPanelProps {
  applications: any[];
  bankPartners: any[];
}

export const LoanBulkOfferPanel = ({ applications, bankPartners }: LoanBulkOfferPanelProps) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bankId, setBankId] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [customTenure, setCustomTenure] = useState("60");
  const [specialOffer, setSpecialOffer] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk" | "compare">("bulk");
  const [shareApp, setShareApp] = useState<any>(null);

  const eligibleApps = applications.filter((a: any) =>
    ["interested", "offer_shared", "smart_calling"].includes(a.stage) && a.loan_amount
  );

  const selectedBank = bankPartners.find((b: any) => b.id === bankId);
  const rate = customRate ? Number(customRate) : selectedBank?.interest_rate_min || 8.5;
  const tenure = Number(customTenure) || 60;

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const selectAll = () => {
    if (selected.size === eligibleApps.length) setSelected(new Set());
    else setSelected(new Set(eligibleApps.map(a => a.id)));
  };

  const calcEMI = (amt: number, r: number, m: number) => {
    const mr = r / 12 / 100;
    return mr > 0 ? (amt * mr * Math.pow(1 + mr, m)) / (Math.pow(1 + mr, m) - 1) : amt / m;
  };

  // ── Download PDFs ──
  const handleDownloadAll = () => {
    const apps = eligibleApps.filter(a => selected.has(a.id));
    if (!apps.length) { toast.error("Select at least one lead"); return; }

    apps.forEach(app => {
      const doc = generateLoanOfferPDF({
        customerName: app.customer_name,
        phone: app.phone,
        carModel: app.car_model,
        loanAmount: Number(app.loan_amount),
        interestRate: rate,
        tenureMonths: tenure,
        bankName: selectedBank?.name || "Partner Bank",
        specialOffer,
      });
      doc.save(`Loan_Offer_${app.customer_name.replace(/\s/g, '_')}.pdf`);
    });
    toast.success(`${apps.length} PDFs downloaded`);
  };

  // ── Bank Comparison PDF ──
  const handleComparisonPDF = (app: any) => {
    if (!bankPartners.length) { toast.error("No bank partners configured"); return; }
    const comparisons = bankPartners.slice(0, 8).map((b: any) => {
      const r = b.interest_rate_min || 8.5;
      const emi = calcEMI(Number(app.loan_amount), r, tenure);
      return {
        bankName: b.name,
        interestRate: r,
        processingFee: (Number(app.loan_amount) * (b.processing_fee_percent || 1)) / 100,
        emi,
        totalPayable: emi * tenure,
        specialOffer: b.special_offer || "",
      };
    });
    const doc = generateBankComparisonPDF(
      { name: app.customer_name, phone: app.phone, carModel: app.car_model },
      comparisons, Number(app.loan_amount), tenure
    );
    doc.save(`Bank_Comparison_${app.customer_name.replace(/\s/g, '_')}.pdf`);
    toast.success("Bank comparison PDF downloaded");
  };

  // ── Send via WhatsApp ──
  const handleWhatsAppBulk = async () => {
    const apps = eligibleApps.filter(a => selected.has(a.id));
    if (!apps.length) { toast.error("Select leads first"); return; }
    setSending(true);
    let sent = 0;
    for (const app of apps) {
      const emi = calcEMI(Number(app.loan_amount), rate, tenure);
      const msg = `Hi ${app.customer_name},\n\nHere's your *Car Loan Offer* from GrabYourCar:\n\nLoan Amount: Rs. ${Math.round(Number(app.loan_amount)).toLocaleString("en-IN")}\nBank: ${selectedBank?.name || "Partner Bank"}\nInterest Rate: ${rate}% p.a.\nTenure: ${tenure} months\n*Monthly EMI: Rs. ${Math.round(emi).toLocaleString("en-IN")}*\n${specialOffer ? `\nSpecial Offer: ${specialOffer}` : ""}\n\nCall us: +91-98559-24442\nwww.grabyourcar.com`;
      await sendWhatsApp({ phone: app.phone, message: msg, name: app.customer_name, logEvent: "loan_offer_bulk", silent: true });
      sent++;
      await new Promise(r => setTimeout(r, 1500));
    }
    toast.success(`Offers sent to ${sent} leads via WhatsApp`);
    setSending(false);
  };

  // ── Email Bulk (via wa.me fallback for now) ──
  const handleEmailBulk = async () => {
    toast.info("Email integration — coming soon. Use WhatsApp or download PDFs for now.");
  };

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" /> Bulk Offers
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-600" /> Loan Offer Manager — Bulk & Single
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Config Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Bank / NBFC</Label>
                <Select value={bankId} onValueChange={setBankId}>
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {bankPartners.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.interest_rate_min ? `(${b.interest_rate_min}%)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Interest Rate (%)</Label>
                <Input type="number" step="0.1" value={customRate} onChange={e => setCustomRate(e.target.value)} placeholder={`${rate}`} />
              </div>
              <div>
                <Label className="text-xs">Tenure (months)</Label>
                <Input type="number" value={customTenure} onChange={e => setCustomTenure(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Special Offer</Label>
                <Input value={specialOffer} onChange={e => setSpecialOffer(e.target.value)} placeholder="e.g. 0% processing" />
              </div>
            </div>

            {/* Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox checked={selected.size === eligibleApps.length && eligibleApps.length > 0} onCheckedChange={selectAll} />
                <span className="text-xs text-muted-foreground">Select All ({eligibleApps.length} eligible)</span>
              </div>
              <Badge variant="outline">{selected.size} selected</Badge>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="divide-y">
                {eligibleApps.map(app => {
                  const emi = calcEMI(Number(app.loan_amount), rate, tenure);
                  return (
                    <div key={app.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                      <Checkbox checked={selected.has(app.id)} onCheckedChange={() => toggleSelect(app.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{app.customer_name}</span>
                          <Badge variant="outline" className="text-[9px]">{app.stage}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{app.phone}</span>
                          {app.car_model && <span>{app.car_model}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-600">Rs. {Math.round(emi).toLocaleString("en-IN")}/m</p>
                        <p className="text-[10px] text-muted-foreground">Loan: Rs. {(Number(app.loan_amount) / 100000).toFixed(1)}L</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Share Offer (All Channels)"
                          onClick={() => setShareApp(app)}>
                          <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Bank Comparison"
                          onClick={() => handleComparisonPDF(app)}>
                          <Building2 className="h-3.5 w-3.5 text-violet-600" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {eligibleApps.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">No eligible leads (need Interested/Offer Shared stage with loan amount)</div>
                )}
              </div>
            </ScrollArea>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button onClick={handleDownloadAll} disabled={!selected.size} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="h-4 w-4" /> Download {selected.size} PDFs
              </Button>
              <Button onClick={handleWhatsAppBulk} disabled={!selected.size || sending} variant="outline" className="gap-1.5 text-green-600 border-green-500/30">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                WhatsApp Bulk ({selected.size})
              </Button>
              <Button onClick={handleEmailBulk} disabled={!selected.size || sending} variant="outline" className="gap-1.5 text-blue-600 border-blue-500/30">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Email Bulk ({selected.size})
              </Button>
              <Button onClick={handleRcsBulk} disabled={!selected.size || sending} variant="outline" className="gap-1.5 text-purple-600 border-purple-500/30">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                RCS Bulk ({selected.size})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
