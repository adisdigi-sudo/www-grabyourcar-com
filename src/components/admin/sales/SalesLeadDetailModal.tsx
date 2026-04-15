import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import {
  Phone, MessageSquare, UserPlus, PhoneCall, Tag, FileText,
  BarChart3, Handshake, CheckCircle2, XCircle, Star, Clock,
  Calendar, Trophy, Download, Share2, Upload, Image, Video, X, Car,
} from "lucide-react";
import { SalesCustomerTimeline } from "./SalesCustomerTimeline";
import { OmniShareDialog } from "@/components/admin/shared/OmniShareDialog";
import { generateSalesOfferPDF } from "./SalesOfferPDF";

const CALL_STATUSES = ["Interested", "Not Interested", "Call Back", "No Answer", "Wrong Number", "Busy", "Follow Up"];
const BUYING_INTENTS = ["Immediate (This Week)", "Within 15 Days", "Within 1 Month", "Exploring Options", "Not Sure"];
const LOST_REASONS = ["Budget constraints", "Bought elsewhere", "Not interested anymore", "Better offer", "Loan rejected", "Changed mind", "Other"];

interface SalesLeadDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: any;
  activities: any[];
  stages: any[];
  onUpdate: (updates: any, logAction?: string, logRemarks?: string) => void;
}

export function SalesLeadDetailModal({
  open,
  onOpenChange,
  lead,
  activities,
  stages,
  onUpdate,
}: SalesLeadDetailModalProps) {
  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState(lead.call_status || "");
  const [callRemarks, setCallRemarks] = useState("");
  const [buyingIntent, setBuyingIntent] = useState(lead.buying_intent || "");
  const [lostReason, setLostReason] = useState("");
  const [lostRemarks, setLostRemarks] = useState("");
  const [statusOutcome, setStatusOutcome] = useState<string>(lead.status_outcome || "");
  const [feedbackRating, setFeedbackRating] = useState(lead.feedback_rating || 0);
  const [feedbackText, setFeedbackText] = useState(lead.feedback_text || "");
  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date || "");
  const [followUpTime, setFollowUpTime] = useState(lead.follow_up_time || "");
  const [deliveryDate, setDeliveryDate] = useState(lead.delivery_date || "");
  const [deliveryImages, setDeliveryImages] = useState<string[]>((lead.delivery_images as string[]) || []);
  const [videoUrl, setVideoUrl] = useState(lead.video_url || "");
  const [dealValue, setDealValue] = useState(lead.deal_value || "");
  const [bookingAmount, setBookingAmount] = useState(lead.booking_amount || "");
  const [processingFees, setProcessingFees] = useState(lead.processing_fees || "");
  const [otherExpenses, setOtherExpenses] = useState(lead.other_expenses || "");
  const [otherExpensesLabel, setOtherExpensesLabel] = useState(lead.other_expenses_label || "Other Expenses");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showShareOffer, setShowShareOffer] = useState(false);

  // Full INR formatter — never abbreviate
  const fmtINR = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

  // Computed deal summary
  const totalCarPrice = Number(lead.on_road_price) || Number(dealValue) || 0;
  const totalDeductions = (Number(bookingAmount) || 0) + (Number(processingFees) || 0) + (Number(otherExpenses) || 0);
  const balancePayable = totalCarPrice - totalDeductions;

  const pendingStage = lead._targetStage;
  const currentStage = pendingStage || lead.pipeline_stage;
  const stageConfig = stages.find((s: any) => s.value === currentStage);

  // ─── Journey Breadcrumb ─────────────────────
  const journeyStages = stages.map((s: any) => {
    const isActive = s.value === currentStage;
    const stageIdx = stages.findIndex((st: any) => st.value === s.value);
    const currentIdx = stages.findIndex((st: any) => st.value === currentStage);
    const isPast = stageIdx < currentIdx;
    return { ...s, isActive, isPast };
  });

  // ─── Handlers ───────────────────────────────
  const handleCallSave = () => {
    if (!callStatus || !callRemarks.trim()) {
      toast.error("Status and remarks are mandatory");
      return;
    }
    const updates: any = {
      call_status: callStatus,
      call_remarks: callRemarks,
      call_attempts: (lead.call_attempts || 0) + 1,
    };
    if (callStatus === "Interested") updates.pipeline_stage = "requirement_understood";
    if (callStatus === "Not Interested") {
      updates.pipeline_stage = "lost";
      updates.status_outcome = "lost";
      updates.lost_reason = "Not interested";
    }
    onUpdate(updates, "call_logged", `Call: ${callStatus} - ${callRemarks}`);
    toast.success("Call logged");
    setCallRemarks("");
  };

  const handleWonLostSave = () => {
    if (!statusOutcome) {
      toast.error("Select Won or Lost");
      return;
    }
    if (statusOutcome === "lost" && (!lostReason || !lostRemarks.trim())) {
      toast.error("Reason and remarks are mandatory for Lost");
      return;
    }
    const updates: any = { status_outcome: statusOutcome };
    if (statusOutcome === "lost") {
      updates.pipeline_stage = "lost";
      updates.lost_reason = lostReason;
      updates.lost_remarks = lostRemarks;
    }
    if (statusOutcome === "won") {
      updates.pipeline_stage = "won";
    }
    onUpdate(
      updates,
      statusOutcome === "won" ? "marked_won" : "marked_lost",
      statusOutcome === "won" ? "Deal Won!" : `Lost: ${lostReason} - ${lostRemarks}`
    );
    toast.success(statusOutcome === "won" ? "🎉 Deal Won!" : "Marked as Lost");
    onOpenChange(false);
  };

  const handleAddRemark = () => {
    if (!remarks.trim()) return;
    const history = Array.isArray(lead.remarks_history) ? lead.remarks_history : [];
    onUpdate(
      { remarks_history: [...history, { text: remarks, at: new Date().toISOString(), by: "agent" }] },
      "remark_added",
      remarks
    );
    toast.success("Remark saved");
    setRemarks("");
  };

  const handleFollowUpSave = () => {
    if (!followUpDate) {
      toast.error("Select follow-up date");
      return;
    }
    onUpdate(
      { follow_up_date: followUpDate, follow_up_time: followUpTime },
      "follow_up_set",
      `Follow-up: ${followUpDate} ${followUpTime}`
    );
    toast.success("Follow-up saved");
  };

  const handleImageUpload = async (files: FileList) => {
    const urls: string[] = [...deliveryImages];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `delivery/${lead.id}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("car-assets").upload(path, file, { contentType: file.type, upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("car-assets").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setDeliveryImages(urls);
    onUpdate({ delivery_images: urls }, "delivery_media_added", `${files.length} image(s) added`);
    toast.success("Images uploaded");
  };

  const handleGenerateQuote = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, w, 50, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Car Sales Quotation", w / 2, 22, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("GrabYourCar - Your Trusted Auto Partner", w / 2, 32, { align: "center" });
    doc.text("www.grabyourcar.com", w / 2, 40, { align: "center" });

    let y = 65;
    doc.setTextColor(60, 60, 60);
    const rows = [
      ["Customer Name", lead.customer_name || "-"],
      ["Phone", lead.phone || "-"],
      ["City", lead.city || "-"],
      ["Car", `${lead.car_brand || ""} ${lead.car_model || ""} ${lead.car_variant || ""}`.trim() || "-"],
      ["Source", lead.source || "-"],
      ["Buying Intent", lead.buying_intent || "-"],
      ["Date", format(new Date(), "dd MMM yyyy")],
    ];
    const boxX = 20;
    const boxW = w - 40;
    rows.forEach(([label, value], i) => {
      const rowY = y + i * 12;
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(boxX, rowY - 4, boxW, 12, "F");
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(label, boxX + 8, rowY + 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(value, boxX + boxW - 8, rowY + 4, { align: "right" });
    });
    doc.save(`Quote_${lead.customer_name?.replace(/\s/g, "_") || "customer"}.pdf`);
    toast.success("Quotation PDF downloaded!");
    onUpdate({}, "quote_shared", "Quote PDF generated");
  };

  const handleShareQuoteWhatsApp = async () => {
    const { getCrmMessage } = await import("@/lib/crmMessageTemplates");
    const msg = await getCrmMessage("sales_quote_share", {
      customer_name: lead.customer_name || "",
      car_details: `${lead.car_brand || ""} ${lead.car_model || ""} ${lead.car_variant || ""}`.trim(),
      city: lead.city || "-",
      buying_intent: lead.buying_intent || "-",
    });
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: lead.phone || "", message: msg, name: lead.customer_name, logEvent: "sales_quote" });
    onUpdate({}, "whatsapp_sent", "Quote shared via WhatsApp");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{lead.customer_name}</span>
            {lead.client_id && (
              <Badge variant="outline" className="font-mono text-xs">{lead.client_id}</Badge>
            )}
            <Badge className={stageConfig?.color}>{stageConfig?.label}</Badge>
            {lead.status_outcome === "won" && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Won</Badge>
            )}
            {lead.status_outcome === "lost" && (
              <Badge className="bg-red-500/10 text-red-600 border-0">Lost</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Journey Breadcrumb */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {journeyStages.map((s, i) => (
            <div key={s.value} className="flex items-center gap-1 shrink-0">
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
                  s.isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : s.isPast
                    ? "bg-emerald-500/20 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <s.icon className="h-3 w-3" />
                {s.label}
              </div>
              {i < journeyStages.length - 1 && (
                <div className={`w-4 h-px ${s.isPast ? "bg-emerald-400" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Client Info */}
        <Card className="border bg-muted/30">
          <CardContent className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Phone</span>
              <div className="flex items-center gap-2 font-medium">
                {lead.phone}
                <a href={`tel:${lead.phone}`} className="text-primary">
                  <Phone className="h-3.5 w-3.5" />
                </a>
                <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`} target="_blank" className="text-emerald-600">
                  <MessageSquare className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            {lead.email && (
              <div>
                <span className="text-muted-foreground text-xs">Email</span>
                <p className="font-medium truncate">{lead.email}</p>
              </div>
            )}
            {lead.city && (
              <div>
                <span className="text-muted-foreground text-xs">City</span>
                <p className="font-medium">{lead.city}</p>
              </div>
            )}
            {(lead.car_brand || lead.car_model) && (
              <div>
                <span className="text-muted-foreground text-xs">Car Interest</span>
                <p className="font-medium">
                  {[lead.car_brand, lead.car_model, lead.car_variant].filter(Boolean).join(" ")}
                </p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-xs">Source</span>
              <Badge variant="outline" className="text-xs mt-0.5">{lead.source || "Unknown"}</Badge>
            </div>
            {lead.buying_intent && (
              <div>
                <span className="text-muted-foreground text-xs">Buying Intent</span>
                <p className="font-medium">{lead.buying_intent}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="actions" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="deal">Deal Info</TabsTrigger>
          </TabsList>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4 mt-3">
            {/* Smart Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <a href={`tel:${lead.phone}`}>
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Call
                </Button>
              </a>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  const { getCrmMessage } = await import("@/lib/crmMessageTemplates");
                  const msg = await getCrmMessage("sales_greeting", { customer_name: lead.customer_name || "" });
                  const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
                  await sendWhatsApp({
                    phone: lead.phone || "",
                    message: msg,
                    name: lead.customer_name,
                    logEvent: "sales_contact",
                  });
                }}
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateQuote}>
                <Download className="h-3.5 w-3.5" /> Quote PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShareQuoteWhatsApp}>
                <Share2 className="h-3.5 w-3.5" /> Share Quote
              </Button>
            </div>

            {/* Stage-specific actions */}
            {currentStage === "new_lead" && (
              <Card className="border border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> New Lead - Take Action
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdate({ pipeline_stage: "contacted" }, "stage_change", "Moved to Contacted");
                      toast.success("Moved to Contacted");
                    }}
                    className="w-full gap-2"
                  >
                    <PhoneCall className="h-4 w-4" /> Move to Contacted
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStage === "contacted" && (
              <Card className="border border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" /> Log Call
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Call Status *</Label>
                      <Select value={callStatus} onValueChange={setCallStatus}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {CALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Buying Intent</Label>
                      <Select
                        value={buyingIntent}
                        onValueChange={(v) => {
                          setBuyingIntent(v);
                          onUpdate({ buying_intent: v }, "intent_set", `Intent: ${v}`);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {BUYING_INTENTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Call Remarks *</Label>
                    <Textarea
                      value={callRemarks}
                      onChange={(e) => setCallRemarks(e.target.value)}
                      placeholder="Discussion summary..."
                      rows={2}
                    />
                  </div>
                  {lead.call_attempts > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Previous calls: {lead.call_attempts} attempt(s)
                    </p>
                  )}
                  <Button onClick={handleCallSave} className="w-full">Save Call Log</Button>
                </CardContent>
              </Card>
            )}

            {currentStage === "requirement_understood" && (
              <Card className="border border-cyan-500/20 bg-cyan-500/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Requirement Understood
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={handleGenerateQuote} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Generate Quote
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShareQuoteWhatsApp} className="gap-1.5">
                      <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdate({ pipeline_stage: "quote_shared" }, "stage_change", "Quote shared, moved to Quote Shared");
                      toast.success("Moved to Quote Shared");
                    }}
                    className="w-full"
                  >
                    Move to Quote Shared
                  </Button>
                </CardContent>
              </Card>
            )}

            {(currentStage === "quote_shared" || currentStage === "follow_up") && (
              <Card className="border border-violet-500/20 bg-violet-500/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Follow Up & Negotiate
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onUpdate({ pipeline_stage: "follow_up" }, "stage_change", "Moved to Follow-Up");
                        toast.success("Moved to Follow-Up");
                      }}
                    >
                      Follow-Up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onUpdate({ pipeline_stage: "negotiation" }, "stage_change", "Moved to Negotiation");
                        toast.success("Moved to Negotiation");
                      }}
                    >
                      Negotiation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStage === "negotiation" && (
              <Card className="border border-pink-500/20 bg-pink-500/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Handshake className="h-4 w-4" /> Negotiation - Close the Deal
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={statusOutcome === "won" ? "default" : "outline"}
                      className={`h-14 flex-col gap-1 ${statusOutcome === "won" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                      onClick={() => setStatusOutcome("won")}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-bold">Won</span>
                    </Button>
                    <Button
                      variant={statusOutcome === "lost" ? "default" : "outline"}
                      className={`h-14 flex-col gap-1 ${statusOutcome === "lost" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                      onClick={() => setStatusOutcome("lost")}
                    >
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm font-bold">Lost</span>
                    </Button>
                  </div>
                  {statusOutcome === "lost" && (
                    <>
                      <div>
                        <Label>Lost Reason *</Label>
                        <Select value={lostReason} onValueChange={setLostReason}>
                          <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                          <SelectContent>
                            {LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Remarks *</Label>
                        <Textarea value={lostRemarks} onChange={(e) => setLostRemarks(e.target.value)} rows={2} />
                      </div>
                    </>
                  )}
                  <Button onClick={handleWonLostSave} disabled={!statusOutcome} className="w-full">
                    {statusOutcome === "won" ? "🎉 Mark Won" : statusOutcome === "lost" ? "Mark Lost" : "Select Outcome"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {(currentStage === "won" || pendingStage === "won") && (
              <Card className="border border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Won - Delivery & After Sales
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Delivery Date</Label>
                      <Input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => {
                          setDeliveryDate(e.target.value);
                          onUpdate({ delivery_date: e.target.value }, "delivery_date_set", `Delivery: ${e.target.value}`);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Deal Value (Rs.)</Label>
                      <Input
                        type="number"
                        value={dealValue}
                        onChange={(e) => {
                          setDealValue(e.target.value);
                          onUpdate({ deal_value: Number(e.target.value) }, "deal_value_set", `Deal: Rs. ${e.target.value}`);
                        }}
                        placeholder="e.g. 850000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Image className="h-4 w-4" /> Delivery Photos
                    </Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {deliveryImages.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                          <img src={url} alt={`Delivery ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                            onClick={() => {
                              const updated = deliveryImages.filter((_, idx) => idx !== i);
                              setDeliveryImages(updated);
                              onUpdate({ delivery_images: updated });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50"
                      >
                        <Upload className="h-4 w-4 text-muted-foreground/50" />
                        <span className="text-[9px] text-muted-foreground">Add</span>
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) handleImageUpload(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {/* Customer Feedback */}
                  <Separator />
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" /> Customer Feedback
                  </h4>
                  {lead.incentive_eligible ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Incentive Eligible</Badge>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${lead.feedback_rating >= n ? "text-yellow-500" : "text-muted-foreground/30"}`}
                            fill={lead.feedback_rating >= n ? "currentColor" : "none"}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setFeedbackRating(n)}
                            className={`p-1 rounded-lg transition-all ${
                              feedbackRating >= n ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground/30 hover:text-yellow-400"
                            }`}
                          >
                            <Star className="h-5 w-5" fill={feedbackRating >= n ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Customer feedback..."
                        rows={2}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (feedbackRating < 1 || !feedbackText.trim()) {
                            toast.error("Rating and feedback required");
                            return;
                          }
                          onUpdate(
                            { feedback_rating: feedbackRating, feedback_text: feedbackText, incentive_eligible: true },
                            "after_sales_closed",
                            `Rating: ${feedbackRating}/5 - ${feedbackText}`
                          );
                          toast.success("Feedback saved - Incentive Eligible!");
                        }}
                        className="w-full"
                      >
                        Save Feedback & Mark Incentive Eligible
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {(currentStage === "lost" || pendingStage === "lost") && !lead.status_outcome && (
              <Card className="border border-red-500/20 bg-red-500/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Mark as Lost
                  </h3>
                  <div>
                    <Label>Lost Reason *</Label>
                    <Select value={lostReason} onValueChange={setLostReason}>
                      <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                      <SelectContent>
                        {LOST_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Remarks *</Label>
                    <Textarea value={lostRemarks} onChange={(e) => setLostRemarks(e.target.value)} rows={2} />
                  </div>
                  <Button
                    onClick={() => {
                      if (!lostReason || !lostRemarks.trim()) {
                        toast.error("Reason and remarks required");
                        return;
                      }
                      onUpdate(
                        { pipeline_stage: "lost", status_outcome: "lost", lost_reason: lostReason, lost_remarks: lostRemarks },
                        "marked_lost",
                        `Lost: ${lostReason} - ${lostRemarks}`
                      );
                      toast.success("Marked as Lost");
                      onOpenChange(false);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    Confirm Lost
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Follow-up & Remarks */}
            <Separator />
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-36" />
                <Input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} className="w-28" />
                <Button size="sm" variant="outline" onClick={handleFollowUpSave}>
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Set Follow-up
                </Button>
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add remark / note..."
                  rows={2}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddRemark} className="self-end">
                  Save
                </Button>
              </div>
            </div>

            {/* Quick Stage Move */}
            {!pendingStage && !["won", "lost"].includes(currentStage) && (
              <div className="border-t pt-3">
                <p className="text-[10px] text-muted-foreground mb-2">Quick Move</p>
                <div className="flex flex-wrap gap-1.5">
                  {stages
                    .filter((s: any) => s.value !== currentStage)
                    .map((s: any) => (
                      <Button
                        key={s.value}
                        variant="outline"
                        size="sm"
                        className={`text-[10px] h-7 ${s.color}`}
                        onClick={() => {
                          if (s.value === "won" || s.value === "lost") {
                            setStatusOutcome(s.value);
                            return;
                          }
                          onUpdate({ pipeline_stage: s.value }, "stage_change", `Moved to ${s.label}`);
                          toast.success(`Moved to ${s.label}`);
                        }}
                      >
                        {s.label}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-3">
            <SalesCustomerTimeline activities={activities} websiteJourney={lead.website_journey} />
          </TabsContent>

          {/* Deal Info Tab */}
          <TabsContent value="deal" className="mt-3 space-y-3">
            <Card className="border">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Car className="h-4 w-4" /> Deal Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded bg-muted/30 border">
                    <p className="text-[10px] text-muted-foreground">Car</p>
                    <p className="font-medium text-sm">
                      {[lead.car_brand, lead.car_model, lead.car_variant].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/30 border">
                    <p className="text-[10px] text-muted-foreground">Source</p>
                    <p className="font-medium text-sm">{lead.source || "—"}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/30 border">
                    <p className="text-[10px] text-muted-foreground">Deal Value</p>
                    <p className="font-medium text-sm">
                      {lead.deal_value
                        ? fmtINR(Number(lead.deal_value))
                        : "—"}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/30 border">
                    <p className="text-[10px] text-muted-foreground">Dealership</p>
                    <p className="font-medium text-sm">{lead.dealership || "—"}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/30 border">
                    <p className="text-[10px] text-muted-foreground">Delivery Date</p>
                    <p className="font-medium text-sm">
                      {lead.delivery_date ? format(new Date(lead.delivery_date), "dd MMM yyyy") : "—"}
                    </p>
                  </div>
                  <div className="p-2 rounded bg-muted/30 border">
                    <p className="text-[10px] text-muted-foreground">Created</p>
                    <p className="font-medium text-sm">
                      {lead.created_at ? format(new Date(lead.created_at), "dd MMM yyyy") : "—"}
                    </p>
                  </div>
                </div>

                {/* ── Deal Calculator ── */}
                <Separator />
                <h3 className="font-semibold text-sm flex items-center gap-2 mt-2">
                  <BarChart3 className="h-4 w-4" /> Deal Calculator — Share with Client
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px]">On-Road / Total Car Price (Rs.)</Label>
                    <Input
                      type="number"
                      value={dealValue}
                      onChange={(e) => {
                        setDealValue(e.target.value);
                        onUpdate({ deal_value: Number(e.target.value) }, "deal_value_set", `Deal: Rs. ${Number(e.target.value).toLocaleString("en-IN")}`);
                      }}
                      placeholder="e.g. 850000"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Booking Amount Received (Rs.)</Label>
                    <Input
                      type="number"
                      value={bookingAmount}
                      onChange={(e) => {
                        setBookingAmount(e.target.value);
                        onUpdate({ booking_amount: Number(e.target.value) });
                      }}
                      placeholder="e.g. 50000"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Processing Fees (Rs.)</Label>
                    <Input
                      type="number"
                      value={processingFees}
                      onChange={(e) => {
                        setProcessingFees(e.target.value);
                        onUpdate({ processing_fees: Number(e.target.value) });
                      }}
                      placeholder="e.g. 10000"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Other Expenses (Rs.)</Label>
                    <Input
                      type="number"
                      value={otherExpenses}
                      onChange={(e) => {
                        setOtherExpenses(e.target.value);
                        onUpdate({ other_expenses: Number(e.target.value) });
                      }}
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>

                {/* Summary Card */}
                {totalCarPrice > 0 && (
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Car Price</span>
                      <span className="font-semibold">{fmtINR(totalCarPrice)}</span>
                    </div>
                    {Number(bookingAmount) > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Less: Booking Amount</span>
                        <span>- {fmtINR(Number(bookingAmount))}</span>
                      </div>
                    )}
                    {Number(processingFees) > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Less: Processing Fees</span>
                        <span>- {fmtINR(Number(processingFees))}</span>
                      </div>
                    )}
                    {Number(otherExpenses) > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Less: {otherExpensesLabel}</span>
                        <span>- {fmtINR(Number(otherExpenses))}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Balance Payable</span>
                      <span className="text-emerald-600">{fmtINR(balancePayable)}</span>
                    </div>
                  </div>
                )}

                {/* One-Click Share */}
                <Button onClick={() => setShowShareOffer(true)} className="w-full gap-2">
                  <Share2 className="h-4 w-4" /> Share Deal Offer to Client (1-Click)
                </Button>

                {/* Remarks history */}
                {Array.isArray(lead.remarks_history) && lead.remarks_history.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <h4 className="text-xs font-medium text-muted-foreground">Notes History</h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {lead.remarks_history.map((r: any, i: number) => (
                        <div key={i} className="text-xs bg-muted/50 rounded p-2">
                          <span className="text-muted-foreground">
                            {r.at ? format(new Date(r.at), "dd MMM, hh:mm a") : ""}
                          </span>
                          <p className="mt-0.5">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Share Offer button - fixed at bottom */}
        <div className="border-t pt-3 mt-2">
          <Button onClick={() => setShowShareOffer(true)} className="w-full gap-2" variant="outline">
            <Share2 className="h-4 w-4" /> Share Car Offer (PDF / WhatsApp / Email / RCS)
          </Button>
        </div>
      </DialogContent>

      <OmniShareDialog
        open={showShareOffer}
        onOpenChange={setShowShareOffer}
        title="Car Deal Offer"
        defaultPhone={lead.phone || ""}
        defaultEmail={lead.email || ""}
        customerName={lead.name || lead.customer_name || "Customer"}
        vertical="car_sales"
        shareMessage={(() => {
          const name = lead.name || lead.customer_name || "";
          const car = lead.car_model || lead.interested_model || "your dream car";
          let msg = `Hi ${name}! Here is your car deal offer for *${car}*.\n\n`;
          if (totalCarPrice > 0) {
            msg += `🚗 Total Car Price: ${fmtINR(totalCarPrice)}\n`;
            if (Number(bookingAmount) > 0) msg += `💰 Less Booking: - ${fmtINR(Number(bookingAmount))}\n`;
            if (Number(processingFees) > 0) msg += `📋 Less Processing: - ${fmtINR(Number(processingFees))}\n`;
            if (Number(otherExpenses) > 0) msg += `📎 Less ${otherExpensesLabel}: - ${fmtINR(Number(otherExpenses))}\n`;
            if (totalDeductions > 0) msg += `\n✅ *Balance Payable: ${fmtINR(balancePayable)}*\n`;
          } else if (lead.deal_value) {
            msg += `Deal Value: ${fmtINR(Number(lead.deal_value))}\n`;
          }
          msg += `\nFor queries, call +91 98559 24442\nwww.grabyourcar.com\n- Grabyourcar`;
          return msg;
        })()}
        generatePdf={() => generateSalesOfferPDF({
          customerName: lead.name || lead.customer_name || "Customer",
          phone: lead.phone || "",
          carModel: lead.car_model || lead.interested_model || "N/A",
          variant: lead.variant || undefined,
          color: lead.color || undefined,
          dealValue: totalCarPrice > 0 ? totalCarPrice : (lead.deal_value ? Number(lead.deal_value) : undefined),
          exShowroomPrice: lead.ex_showroom_price ? Number(lead.ex_showroom_price) : undefined,
          onRoadPrice: lead.on_road_price ? Number(lead.on_road_price) : undefined,
          specialTerms: lead.special_terms || undefined,
          dealership: lead.dealership || undefined,
          bookingAmount: Number(bookingAmount) || undefined,
          processingFees: Number(processingFees) || undefined,
          otherExpenses: Number(otherExpenses) || undefined,
          otherExpensesLabel: otherExpensesLabel !== "Other Expenses" ? otherExpensesLabel : undefined,
        })}
      />
    </Dialog>
  );
}
