import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Phone, PhoneOff, PhoneMissed, Ban, AlertTriangle, CalendarIcon, Loader2, CheckCircle2, Flame, ThumbsUp, ThumbsDown, BellOff, PowerOff } from "lucide-react";

export type Disposition =
  | "hot"
  | "interested"
  | "not_connected"
  | "callback_requested"
  | "wrong_number"
  | "busy"
  | "dnd"
  | "switched_off"
  | "connected"
  | "no_answer";

interface CallDispositionModalProps {
  open: boolean;
  onClose: () => void;
  leadPhone: string;
  leadName: string;
  leadId?: string;
  leadType?: string;
  verticalId?: string;
  callMethod: "phone" | "whatsapp";
  onSaved?: () => void;
}

const DISPOSITIONS: { value: Disposition; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "hot",                label: "🔥 Hot Lead",      icon: <Flame className="h-4 w-4" />,        color: "bg-orange-500/15 text-orange-700 border-orange-300 dark:text-orange-300" },
  { value: "interested",         label: "✅ Interested",     icon: <ThumbsUp className="h-4 w-4" />,     color: "bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300" },
  { value: "not_connected",      label: "❌ Not Interested", icon: <ThumbsDown className="h-4 w-4" />,   color: "bg-red-500/15 text-red-700 border-red-300 dark:text-red-300" },
  { value: "callback_requested", label: "📅 Callback",       icon: <CalendarIcon className="h-4 w-4" />, color: "bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300" },
  { value: "wrong_number",       label: "🚫 Wrong Number",   icon: <AlertTriangle className="h-4 w-4" />,color: "bg-rose-500/15 text-rose-700 border-rose-300 dark:text-rose-300" },
  { value: "busy",               label: "📵 Busy",           icon: <PhoneMissed className="h-4 w-4" />,  color: "bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300" },
  { value: "dnd",                label: "🔇 DND",            icon: <BellOff className="h-4 w-4" />,      color: "bg-slate-500/15 text-slate-700 border-slate-300 dark:text-slate-300" },
  { value: "switched_off",       label: "💬 Switched Off",   icon: <PowerOff className="h-4 w-4" />,     color: "bg-gray-500/15 text-gray-700 border-gray-300 dark:text-gray-300" },
];

const LEAD_STAGES = [
  "New Lead", "Contacted", "Qualified", "Interested", "Negotiation",
  "Proposal Sent", "Follow-up", "Hot Prospect", "Converted", "Lost",
];

const FOLLOW_UP_PRIORITIES = [
  { value: "hot", label: "🔥 Hot", desc: "Call within hours" },
  { value: "high", label: "⚡ High", desc: "Call today" },
  { value: "normal", label: "📋 Normal", desc: "Standard follow-up" },
];

export function CallDispositionModal({
  open, onClose, leadPhone, leadName, leadId, leadType, verticalId, callMethod, onSaved,
}: CallDispositionModalProps) {
  const { user } = useAuth();
  const [disposition, setDisposition] = useState<Disposition | "">("");
  const [notes, setNotes] = useState("");
  const [leadStage, setLeadStage] = useState("");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [followUpTime, setFollowUpTime] = useState("10:00");
  const [followUpPriority, setFollowUpPriority] = useState("normal");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [saving, setSaving] = useState(false);

  const needsFollowUp =
    disposition === "callback_requested" ||
    disposition === "busy" ||
    disposition === "switched_off" ||
    disposition === "hot" ||
    disposition === "interested";

  const handleSave = async () => {
    if (!disposition) {
      toast.error("You MUST select a call disposition before closing.");
      return;
    }
    if (!user?.id) {
      toast.error("Authentication error.");
      return;
    }

    setSaving(true);
    try {
      let followUpAt: string | null = null;
      if (followUpDate) {
        const [h, m] = followUpTime.split(":").map(Number);
        const d = new Date(followUpDate);
        d.setHours(h, m, 0, 0);
        followUpAt = d.toISOString();
      }

      const { error } = await supabase.from("call_logs").insert({
        agent_id: user.id,
        lead_phone: leadPhone,
        lead_name: leadName || null,
        lead_id: leadId || null,
        lead_type: leadType || "general",
        call_type: "outbound",
        call_method: callMethod,
        disposition: disposition as Disposition,
        duration_seconds: durationMinutes ? Math.round(parseFloat(durationMinutes) * 60) : 0,
        notes: notes || null,
        lead_stage_after: leadStage || null,
        follow_up_at: followUpAt,
        follow_up_priority: followUpAt ? followUpPriority : null,
        vertical_id: verticalId || null,
      });

      if (error) throw error;

      toast.success("Call logged successfully!");
      // Reset
      setDisposition("");
      setNotes("");
      setLeadStage("");
      setFollowUpDate(undefined);
      setDurationMinutes("");
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to log call: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {
      // FORCED MODAL — block all close attempts (ESC, backdrop, X)
      // Modal can ONLY be closed via successful save in handleSave()
      toast.error("⚠️ Disposition mandatory — call status save karna zaroori hai!");
    }}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          toast.error("⚠️ ESC disabled — pehle disposition select karein.");
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          toast.error("⚠️ Pehle call status save karein.");
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Log Call Disposition
            <Badge variant="destructive" className="ml-auto text-[10px] uppercase tracking-wide">Action Required</Badge>
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{leadName || "Unknown"}</span> • {leadPhone}
            <Badge variant="outline" className="ml-2 text-xs">{callMethod === "whatsapp" ? "WhatsApp" : "Phone"}</Badge>
          </DialogDescription>
        </DialogHeader>

        {/* Forced banner */}
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive font-medium flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          Yeh modal tab tak band nahi hoga jab tak aap disposition save nahi karte. Next call queue tabhi aage badhega.
        </div>

        <div className="space-y-5 py-2">
          {/* Disposition Selection - MANDATORY */}
          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-1">
              Call Status <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DISPOSITIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDisposition(d.value)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                    disposition === d.value
                      ? `${d.color} ring-2 ring-primary/30 shadow-sm`
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  {d.icon} {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label className="text-sm font-medium">Duration (minutes)</Label>
            <Input
              type="number"
              placeholder="e.g. 5"
              step="0.5"
              min="0"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Lead Stage Update */}
          <div>
            <Label className="text-sm font-medium">Update Lead Stage</Label>
            <Select value={leadStage} onValueChange={setLeadStage}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select new stage (optional)" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Follow-up scheduling */}
          {(needsFollowUp || followUpDate) && (
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 space-y-3">
              <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300">📅 Schedule Follow-up</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {followUpDate ? format(followUpDate, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-28"
                />
              </div>
              <RadioGroup value={followUpPriority} onValueChange={setFollowUpPriority} className="flex gap-3">
                {FOLLOW_UP_PRIORITIES.map((p) => (
                  <div key={p.value} className="flex items-center gap-1.5">
                    <RadioGroupItem value={p.value} id={`pri-${p.value}`} />
                    <Label htmlFor={`pri-${p.value}`} className="text-xs cursor-pointer">{p.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {!needsFollowUp && !followUpDate && (
            <Button variant="ghost" size="sm" onClick={() => setFollowUpDate(new Date())} className="text-blue-600">
              + Add Follow-up
            </Button>
          )}

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Call Notes</Label>
            <Textarea
              placeholder="Key points from the call..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving || !disposition}
            className="w-full shadow-lg shadow-primary/25"
            size="lg"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : !disposition ? (
              <><AlertTriangle className="h-4 w-4 mr-2" /> Select Status to Continue</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Log Call & Continue</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
