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

  const handleWhatsAppShare = () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Please enter a valid phone number"); return; }
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const { fileName } = generatePdf();
    const msg = shareMessage || `Hi ${customerName}! Please find the attached ${title}. For any queries, contact us at +91 98559 24442. - Grabyourcar Insurance`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg + `\n\nDocument: ${fileName}`)}`, "_blank");
    toast.success(`PDF downloaded & WhatsApp opened for ${phone}`);
    onShared?.();
    onOpenChange(false);
  };

  const handleWhatsAppApiShare = async () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Please enter a valid phone number"); return; }
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    setSendingApi(true);
    try {
      generatePdf(); // Download PDF locally too
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
      toast.success(`🚀 ${title} sent via WhatsApp API to ${phone}!`);
      onShared?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to send via WhatsApp API");
    } finally {
      setSendingApi(false);
    }
  };

  const handleEmailShare = () => {
    if (!email || !email.includes("@")) { toast.error("Please enter a valid email address"); return; }
    const { fileName } = generatePdf();
    const subject = encodeURIComponent(`${title} - ${customerName || "Customer"} | Grabyourcar Insurance`);
    const body = encodeURIComponent(
      shareMessage || `Dear ${customerName || "Valued Customer"},\n\nPlease find the attached ${title} for your reference.\n\nFor any queries, feel free to contact us:\nPhone: +91 98559 24442\nEmail: hello@grabyourcar.com\nWeb: www.grabyourcar.com\n\nBest regards,\nGrabyourcar Insurance Desk`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    toast.success(`PDF downloaded & Email opened for ${email}`);
    onShared?.();
    onOpenChange(false);
  };

  const handleDownload = () => {
    generatePdf();
    toast.success("PDF downloaded!");
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
              <p className="text-[10px] text-muted-foreground">PDF will be downloaded. WhatsApp will open with the message.</p>
            </div>
            <Button onClick={handleWhatsAppShare} className="w-full gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white">
              <Send className="h-4 w-4" /> Share via WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp_api" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WhatsApp Number</Label>
              <Input placeholder="Enter mobile number" value={phone} onChange={e => setPhone(e.target.value)} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Sends automatically via WhatsApp Business API. No need to open WhatsApp manually.</p>
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
              <p className="text-[10px] text-muted-foreground">PDF will be downloaded. Email client will open with the message.</p>
            </div>
            <Button onClick={handleEmailShare} className="w-full gap-2">
              <Send className="h-4 w-4" /> Share via Email
            </Button>
          </TabsContent>

          <TabsContent value="download" className="space-y-3 mt-3">
            <p className="text-sm text-muted-foreground">Download the PDF directly to your device.</p>
            <Button onClick={handleDownload} variant="outline" className="w-full gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
