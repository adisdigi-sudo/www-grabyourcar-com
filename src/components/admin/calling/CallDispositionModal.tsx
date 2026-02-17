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
import { Phone, PhoneOff, PhoneMissed, Ban, AlertTriangle, CalendarIcon, Loader2, CheckCircle2 } from "lucide-react";

export type Disposition = "connected" | "not_connected" | "busy" | "switched_off" | "wrong_number" | "no_answer" | "callback_requested";

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
  { value: "connected", label: "Connected", icon: <Phone className="h-4 w-4" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { value: "not_connected", label: "Not Connected", icon: <PhoneOff className="h-4 w-4" />, color: "bg-red-500/10 text-red-600 border-red-200" },
  { value: "busy", label: "Busy", icon: <PhoneMissed className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { value: "switched_off", label: "Switched Off", icon: <Ban className="h-4 w-4" />, color: "bg-gray-500/10 text-gray-600 border-gray-200" },
  { value: "wrong_number", label: "Wrong Number", icon: <AlertTriangle className="h-4 w-4" />, color: "bg-rose-500/10 text-rose-600 border-rose-200" },
  { value: "no_answer", label: "No Answer", icon: <PhoneOff className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-600 border-orange-200" },
  { value: "callback_requested", label: "Callback Requested", icon: <CalendarIcon className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
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

  const needsFollowUp = disposition === "callback_requested" || disposition === "busy" || disposition === "no_answer";

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
      if (!disposition) {
        toast.error("⚠️ You MUST log the call disposition before closing!");
        return;
      }
      onClose();
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Log Call Disposition
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{leadName || "Unknown"}</span> • {leadPhone}
            <Badge variant="outline" className="ml-2 text-xs">{callMethod === "whatsapp" ? "WhatsApp" : "Phone"}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Disposition Selection - MANDATORY */}
          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-1">
              Call Status <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
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
          <Button variant="outline" onClick={() => {
            if (!disposition) {
              toast.error("⚠️ You MUST log the call disposition!");
              return;
            }
            onClose();
          }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !disposition} className="shadow-lg shadow-primary/25">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Log Call</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
