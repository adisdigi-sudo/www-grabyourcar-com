import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageCircle, Mail, Download, Send, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

interface ClientDetails {
  id?: string;
  customer_name?: string;
  phone?: string;
  email?: string;
  vehicle_number?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  current_insurer?: string;
  current_policy_type?: string;
  quote_amount?: number;
}

interface SharePdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  generatePdf: () => { doc: jsPDF; fileName: string };
  defaultPhone?: string;
  defaultEmail?: string;
  customerName?: string;
  shareMessage?: string;
  onShared?: () => void;
  leadId?: string;
  /** Pass client details for auto-saving quote history & pipeline update */
  clientDetails?: ClientDetails;
}

export function SharePdfDialog({
  open,
  onOpenChange,
  title,
  generatePdf,
  defaultPhone = "",
  defaultEmail = "",
  customerName = "",
  shareMessage = "",
  onShared,
  leadId,
  clientDetails,
}: SharePdfDialogProps) {
  const [tab, setTab] = useState<"whatsapp" | "whatsapp_api" | "email" | "download">("whatsapp");
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [sendingApi, setSendingApi] = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setPhone(defaultPhone);
      setEmail(defaultEmail);
    }
    onOpenChange(v);
  };

  /** Upload PDF to storage and save to quote_share_history + update pipeline */
  const autoSaveQuote = async (doc: jsPDF, fileName: string, shareMethod: string) => {
    try {
      const cd = clientDetails;
      const name = cd?.customer_name || customerName || "Customer";

      // 1. Upload PDF to storage
      let pdfPath: string | null = null;
      try {
        const pdfBlob = doc.output("blob");
        const storagePath = `quotes/${new Date().toISOString().slice(0, 10)}/${fileName}`;
        const { error } = await supabase.storage.from("quote-pdfs").upload(storagePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });
        if (!error) pdfPath = storagePath;
        else console.warn("Quote PDF upload failed:", error.message);
      } catch (uploadErr) {
        console.warn("Quote PDF upload exception:", uploadErr);
      }

      // 2. Save to quote_share_history
      const quoteRef = `QS-${Date.now().toString(36).toUpperCase()}`;
      const { error: insertError } = await supabase.from("quote_share_history" as any).insert({
        customer_name: name,
        customer_phone: cd?.phone || phone || null,
        customer_email: cd?.email || email || null,
        vehicle_number: cd?.vehicle_number || null,
        vehicle_make: cd?.vehicle_make || null,
        vehicle_model: cd?.vehicle_model || null,
        vehicle_year: cd?.vehicle_year ? String(cd.vehicle_year) : null,
        insurance_company: cd?.current_insurer || "Best Available",
        policy_type: cd?.current_policy_type || "Comprehensive",
        total_premium: cd?.quote_amount || null,
        share_method: shareMethod,
        pdf_storage_path: pdfPath,
        quote_ref: quoteRef,
        notes: `Auto-saved via ${title} share`,
      } as any);

      if (insertError) {
        console.error("Quote save to history failed:", insertError);
        toast.error("Quote generated but failed to save to history: " + insertError.message);
        return;
      }

      // 3. Move client pipeline to quote_shared (only if not already won/policy_issued)
      if (cd?.id) {
        const { data: current } = await supabase
          .from("insurance_clients")
          .select("pipeline_stage, lead_status")
          .eq("id", cd.id)
          .single();

        const skipStages = ["policy_issued", "won", "converted"];
        const currentStage = (current?.pipeline_stage || "").toLowerCase();
        const currentStatus = (current?.lead_status || "").toLowerCase();

        if (!skipStages.includes(currentStage) && !skipStages.includes(currentStatus)) {
          await supabase
            .from("insurance_clients")
            .update({
              pipeline_stage: "quote_shared",
              journey_last_event: "quote_shared",
              journey_last_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any)
            .eq("id", cd.id);
        }
      }
    } catch (err) {
      console.error("Auto-save quote error:", err);
      toast.error("Quote save failed — check console for details");
    }
  };

  const handleWhatsAppShare = async () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Please enter a valid phone number"); return; }
    const { doc, fileName } = generatePdf();
    const msg = shareMessage || `Hi ${customerName}! Please find the attached ${title}. For any queries, contact us at +91 98559 24442. - Grabyourcar Insurance`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: cleanPhone, message: msg + `\n\nDocument: ${fileName}`, name: customerName, logEvent: "pdf_share" });
    await autoSaveQuote(doc, fileName, "whatsapp");
    toast.success("📋 Quote saved & shared via WhatsApp!");
    onShared?.();
    onOpenChange(false);
  };

  const handleWhatsAppApiShare = async () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Please enter a valid phone number"); return; }
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    setSendingApi(true);
    try {
      const { doc, fileName } = generatePdf();
      const { error } = await supabase.functions.invoke("wa-automation-trigger", {
        body: {
          event: title.toLowerCase().includes("renewal") ? "insurance_renewal_share" : "insurance_quote_share",
          phone: fullPhone,
          name: customerName || "Customer",
          leadId: leadId,
          data: {
            document_type: title,
            message: shareMessage || `Your ${title} is ready. Please review and contact us for the best rates!`,
          },
        },
      });
      if (error) throw error;
      await autoSaveQuote(doc, fileName, "whatsapp_api");
      toast.success(`🚀 ${title} sent via WhatsApp API & saved!`);
      onShared?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to send via WhatsApp API");
    } finally {
      setSendingApi(false);
    }
  };

  const handleEmailShare = async () => {
    if (!email || !email.includes("@")) { toast.error("Please enter a valid email address"); return; }
    const { doc, fileName } = generatePdf();
    const subject = encodeURIComponent(`${title} - ${customerName || "Customer"} | Grabyourcar Insurance`);
    const body = encodeURIComponent(
      shareMessage || `Dear ${customerName || "Valued Customer"},\n\nPlease find the attached ${title} for your reference.\n\nFor any queries, feel free to contact us:\nPhone: +91 98559 24442\nEmail: hello@grabyourcar.com\nWeb: www.grabyourcar.com\n\nBest regards,\nGrabyourcar Insurance Desk`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    await autoSaveQuote(doc, fileName, "email");
    toast.success(`📋 Quote saved & Email opened for ${email}`);
    onShared?.();
    onOpenChange(false);
  };

  const handleDownload = async () => {
    const { doc, fileName } = generatePdf();
    doc.save(fileName);
    await autoSaveQuote(doc, fileName, "pdf_download");
    toast.success("📋 PDF downloaded & quote auto-saved!");
    onShared?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Share {title}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="whatsapp" className="text-[10px] gap-1 px-1.5">
              <MessageCircle className="h-3 w-3" /> WA
            </TabsTrigger>
            <TabsTrigger value="whatsapp_api" className="text-[10px] gap-1 px-1.5">
              <Zap className="h-3 w-3" /> WA API
            </TabsTrigger>
            <TabsTrigger value="email" className="text-[10px] gap-1 px-1.5">
              <Mail className="h-3 w-3" /> Email
            </TabsTrigger>
            <TabsTrigger value="download" className="text-[10px] gap-1 px-1.5">
              <Download className="h-3 w-3" /> Save
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WhatsApp Number</Label>
              <Input placeholder="Enter mobile number (e.g. 9876543210)" value={phone} onChange={e => setPhone(e.target.value)} className="h-9" />
              <p className="text-[10px] text-muted-foreground">PDF will be downloaded. WhatsApp will open with the message. Quote auto-saved.</p>
            </div>
            <Button onClick={handleWhatsAppShare} className="w-full gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white">
              <Send className="h-4 w-4" /> Share via WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp_api" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WhatsApp Number</Label>
              <Input placeholder="Enter mobile number" value={phone} onChange={e => setPhone(e.target.value)} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Sends automatically via WhatsApp Business API. Quote auto-saved.</p>
            </div>
            <Button onClick={handleWhatsAppApiShare} disabled={sendingApi} className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white">
              {sendingApi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Send via WA API
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email Address</Label>
              <Input type="email" placeholder="Enter email address" value={email} onChange={e => setEmail(e.target.value)} className="h-9" />
              <p className="text-[10px] text-muted-foreground">PDF will be downloaded. Email client will open. Quote auto-saved.</p>
            </div>
            <Button onClick={handleEmailShare} className="w-full gap-2">
              <Send className="h-4 w-4" /> Share via Email
            </Button>
          </TabsContent>

          <TabsContent value="download" className="space-y-3 mt-3">
            <p className="text-sm text-muted-foreground">Download the PDF directly. Quote will be auto-saved to history.</p>
            <Button onClick={handleDownload} variant="outline" className="w-full gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
