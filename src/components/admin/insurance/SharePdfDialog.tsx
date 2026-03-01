import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageCircle, Mail, Download, Send, Loader2 } from "lucide-react";
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
}: SharePdfDialogProps) {
  const [tab, setTab] = useState<"whatsapp" | "email" | "download">("whatsapp");
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);

  // Reset fields when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setPhone(defaultPhone);
      setEmail(defaultEmail);
    }
    onOpenChange(v);
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    // Generate and download the PDF first
    const { fileName } = generatePdf();

    // Open WhatsApp with message
    const msg = shareMessage || `Hi ${customerName}! Please find the attached ${title}. For any queries, contact us at +91 98559 24442. - Grabyourcar Insurance`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg + `\n\nDocument: ${fileName}`)}`, "_blank");

    toast.success(`PDF downloaded & WhatsApp opened for ${phone}`);
    onShared?.();
    onOpenChange(false);
  };

  const handleEmailShare = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Generate and download the PDF
    const { fileName } = generatePdf();

    // Open email client
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whatsapp" className="text-xs gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </TabsTrigger>
            <TabsTrigger value="download" className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Download
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WhatsApp Number</Label>
              <Input
                placeholder="Enter mobile number (e.g. 9876543210)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">PDF will be downloaded. WhatsApp will open with the message.</p>
            </div>
            <Button onClick={handleWhatsAppShare} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Send className="h-4 w-4" /> Share via WhatsApp
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email Address</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-9"
              />
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
