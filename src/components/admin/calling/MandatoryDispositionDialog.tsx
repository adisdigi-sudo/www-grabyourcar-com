import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Phone } from "lucide-react";

export interface DispositionOption {
  value: string;
  label: string;
  tone: string;
  requiresRemarks?: boolean;
  requiresFollowUp?: boolean;
}

export const FULL_DISPOSITIONS: DispositionOption[] = [
  { value: "hot",            label: "🔥 Hot",            tone: "bg-red-500 text-white hover:bg-red-600",         requiresRemarks: true,  requiresFollowUp: true },
  { value: "interested",     label: "✅ Interested",     tone: "bg-emerald-500 text-white hover:bg-emerald-600", requiresRemarks: true },
  { value: "callback",       label: "📅 Callback",       tone: "bg-blue-500 text-white hover:bg-blue-600",       requiresRemarks: true,  requiresFollowUp: true },
  { value: "not_interested", label: "❌ Not Interested", tone: "bg-rose-500 text-white hover:bg-rose-600" },
  { value: "no_answer",      label: "📵 No Answer",      tone: "bg-slate-500 text-white hover:bg-slate-600" },
  { value: "busy",           label: "⏳ Busy",           tone: "bg-amber-500 text-white hover:bg-amber-600" },
  { value: "wrong_number",   label: "🚫 Wrong Number",   tone: "bg-zinc-500 text-white hover:bg-zinc-600" },
  { value: "dnd",            label: "🔇 DND",            tone: "bg-purple-500 text-white hover:bg-purple-600" },
];

interface Props {
  open: boolean;
  contact: { name?: string | null; phone?: string | null; dial_attempts?: number } | null;
  onSave: (payload: { disposition: string; remarks: string; followUpAt: string | null }) => Promise<void>;
}

/**
 * Blocking modal — once a call ends, agent CANNOT close, dial next, or
 * navigate away until a disposition is saved. Hot / Interested / Callback
 * REQUIRE a free-text remark. Hot + Callback also require follow-up datetime.
 */
export function MandatoryDispositionDialog({ open, contact, onSave }: Props) {
  const [disposition, setDisposition] = useState("");
  const [remarks, setRemarks] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDisposition("");
      setRemarks("");
      setFollowUp("");
    }
  }, [open]);

  const selected = FULL_DISPOSITIONS.find((d) => d.value === disposition);
  const remarksMissing = !!selected?.requiresRemarks && remarks.trim().length < 3;
  const followUpMissing = !!selected?.requiresFollowUp && !followUp;
  const canSave = !!disposition && !remarksMissing && !followUpMissing && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        disposition,
        remarks: remarks.trim(),
        followUpAt: followUp ? new Date(followUp).toISOString() : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* blocked */ }}>
      <DialogContent
        className="max-w-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Mark Disposition — Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 flex items-center gap-3">
            <Phone className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-semibold">{contact?.name || "Unknown caller"}</p>
              <p className="text-xs text-muted-foreground">+91 {contact?.phone}</p>
            </div>
            {contact?.dial_attempts ? (
              <Badge variant="outline" className="ml-auto text-[10px]">Attempt #{contact.dial_attempts}</Badge>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Pick the call outcome:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FULL_DISPOSITIONS.map((d) => (
                <Button
                  key={d.value}
                  type="button"
                  size="sm"
                  className={disposition === d.value ? d.tone : "bg-muted text-foreground hover:bg-muted/70"}
                  onClick={() => setDisposition(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Remarks {selected?.requiresRemarks && <span className="text-red-600">*</span>}
            </label>
            <Textarea
              placeholder={
                selected?.requiresRemarks
                  ? "Required — what did the customer say? (min 3 characters)"
                  : "Optional notes…"
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="text-sm"
            />
            {remarksMissing && (
              <p className="text-[10px] text-red-600 mt-1">Remarks are required for {selected?.label}.</p>
            )}
          </div>

          {selected?.requiresFollowUp && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Schedule Follow-up <span className="text-red-600">*</span>
              </label>
              <Input
                type="datetime-local"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
              />
            </div>
          )}

          <Button onClick={handleSave} disabled={!canSave} className="w-full">
            {saving ? "Saving…" : "Save & load next number →"}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            🔒 You cannot dial the next number without saving this disposition.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
