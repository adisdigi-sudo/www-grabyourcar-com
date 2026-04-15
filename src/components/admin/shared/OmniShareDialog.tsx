import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageCircle, Mail, Download, Send, Loader2, Zap, Radio } from "lucide-react";
import { omniSend } from "@/lib/omniSend";
import jsPDF from "jspdf";

type TabValue = "whatsapp" | "whatsapp_api" | "email" | "rcs" | "download";

interface OmniShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  generatePdf: () => { doc: jsPDF; fileName: string };
  defaultPhone?: string;
  defaultEmail?: string;
  customerName?: string;
  shareMessage?: string;
  onShared?: () => void;
  vertical?: string;
}

export function OmniShareDialog({
  open,
  onOpenChange,
  title,
  generatePdf,
  defaultPhone = "",
  defaultEmail = "",
  customerName = "",
  shareMessage = "",
  onShared,
  vertical,
}: OmniShareDialogProps) {
  const [tab, setTab] = useState<TabValue>("whatsapp");
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [sendingApi, setSendingApi] = useState(false);
  const [sendingRcs, setSendingRcs] = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setPhone(defaultPhone);
      setEmail(defaultEmail);
    }
    onOpenChange(v);
  };

  const defaultMsg = shareMessage || `Hi ${customerName}! Please find the attached ${title}. For any queries, contact us at +91 98559 24442. - Grabyourcar`;

  const handleWhatsAppShare = async () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Please enter a valid phone number"); return; }
    const { doc, fileName } = generatePdf();
    doc.save(fileName);
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(defaultMsg + `\n\nDocument: ${fileName}`)}`;
    window.open(waUrl, "_blank");
    toast.success("📋 PDF downloaded & WhatsApp opened!");
    onShared?.();
    onOpenChange(false);
  };

  const handleWhatsAppApiShare = async () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Please enter a valid phone number"); return; }
    setSendingApi(true);
    try {
      const { doc, fileName } = generatePdf();
      const result = await omniSend({
        channel: "whatsapp",
        phone: cleanPhone,
        message: defaultMsg,
        name: customerName,
        logEvent: "omni_share_wa_api",
        vertical,
      });
      if (result.success) {
        toast.success(`🚀 ${title} sent via WhatsApp API!`);
        onShared?.();
        onOpenChange(false);
      } else if (result.fallback) {
        toast.info("📱 Opened WhatsApp — send manually");
        onShared?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to send");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send via WhatsApp API");
    } finally {
      setSendingApi(false);
    }
  };

  const handleEmailShare = async () => {
    if (!email || !email.includes("@")) { toast.error("Please enter a valid email address"); return; }
    setSendingApi(true);
    try {
      const { doc, fileName } = generatePdf();
      const result = await omniSend({
        channel: "email",
        email,
        message: defaultMsg,
        subject: `${title} - ${customerName || "Customer"} | Grabyourcar`,
        name: customerName,
        logEvent: "omni_share_email",
        vertical,
      });
      if (result.success) {
        toast.success(`📧 Email sent to ${email}!`);
        onShared?.();
        onOpenChange(false);
      } else {
        // Fallback to mailto
        const subject = encodeURIComponent(`${title} - ${customerName || "Customer"} | Grabyourcar`);
        const body = encodeURIComponent(defaultMsg);
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
        doc.save(fileName);
        toast.info("📋 Email client opened & PDF downloaded");
        onShared?.();
        onOpenChange(false);
      }
    } catch {
      const subject = encodeURIComponent(`${title} - ${customerName || "Customer"} | Grabyourcar`);
      const body = encodeURIComponent(defaultMsg);
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
      toast.info("📋 Email client opened");
      onShared?.();
      onOpenChange(false);
    } finally {
      setSendingApi(false);
    }
  };

  const handleRcsShare = async () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Please enter a valid phone number"); return; }
    setSendingRcs(true);
    try {
      const result = await omniSend({
        channel: "rcs",
        phone: cleanPhone,
        message: defaultMsg,
        name: customerName,
        logEvent: "omni_share_rcs",
        vertical,
      });
      if (result.success) {
        toast.success(`📲 RCS sent to ${customerName || phone}!`);
        onShared?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "RCS send failed — channel may not be configured");
      }
    } catch {
      toast.error("RCS send failed");
    } finally {
      setSendingRcs(false);
    }
  };

  const handleDownload = () => {
    const { doc, fileName } = generatePdf();
    doc.save(fileName);
    toast.success("📋 PDF downloaded!");
    onShared?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Share {title}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as TabValue)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="whatsapp" className="text-[10px] gap-1 px-1">
              <MessageCircle className="h-3 w-3" /> WA
            </TabsTrigger>
            <TabsTrigger value="whatsapp_api" className="text-[10px] gap-1 px-1">
              <Zap className="h-3 w-3" /> API
            </TabsTrigger>
            <TabsTrigger value="email" className="text-[10px] gap-1 px-1">
              <Mail className="h-3 w-3" /> Email
            </TabsTrigger>
            <TabsTrigger value="rcs" className="text-[10px] gap-1 px-1">
              <Radio className="h-3 w-3" /> RCS
            </TabsTrigger>
            <TabsTrigger value="download" className="text-[10px] gap-1 px-1">
              <Download className="h-3 w-3" /> PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WhatsApp Number</Label>
              <Input placeholder="e.g. 9876543210" value={phone} onChange={e => setPhone(e.target.value)} className="h-9" />
              <p className="text-[10px] text-muted-foreground">PDF downloads, WhatsApp opens with message.</p>
            </div>
            <Button onClick={handleWhatsAppShare} className="w-full gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white">
              <Send className="h-4 w-4" /> Share via WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp_api" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WhatsApp Number</Label>
              <Input placeholder="Enter mobile number" value={phone} onChange={e => setPhone(e.target.value)} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Sends automatically via WhatsApp Business API.</p>
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
              <p className="text-[10px] text-muted-foreground">Sends via configured email provider, or opens email client.</p>
            </div>
            <Button onClick={handleEmailShare} disabled={sendingApi} className="w-full gap-2">
              {sendingApi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Share via Email
            </Button>
          </TabsContent>

          <TabsContent value="rcs" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mobile Number</Label>
              <Input placeholder="Enter mobile number" value={phone} onChange={e => setPhone(e.target.value)} className="h-9" />
              <p className="text-[10px] text-muted-foreground">Sends via RCS Business Messaging.</p>
            </div>
            <Button onClick={handleRcsShare} disabled={sendingRcs} className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              {sendingRcs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Send via RCS
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
