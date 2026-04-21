import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Zap, Plus, Pencil, Trash2, X } from "lucide-react";

export interface QuickReply {
  id: string;
  label: string;
  body: string;
}

const STORAGE_KEY = "omni-chat-quick-replies-v1";

const DEFAULT_REPLIES: QuickReply[] = [
  { id: "qr-1", label: "👋 Greeting", body: "Hi {{name}}, thanks for reaching out to GrabYourCar! How can I help you today?" },
  { id: "qr-2", label: "📋 Share details", body: "Could you please share your full name, city, and the service you're interested in?" },
  { id: "qr-3", label: "📞 Callback", body: "Sure, our team will call you back shortly. Please confirm your preferred time." },
  { id: "qr-4", label: "💰 Pricing", body: "I'll share the latest pricing and offers with you in a moment." },
  { id: "qr-5", label: "🙏 Thanks", body: "Thank you for connecting with GrabYourCar. Have a great day!" },
];

function loadReplies(): QuickReply[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REPLIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_REPLIES;
  } catch {
    return DEFAULT_REPLIES;
  }
}

interface QuickReplyChipsProps {
  onPick: (body: string) => void;
  customerName?: string | null;
}

export function QuickReplyChips({ onPick, customerName }: QuickReplyChipsProps) {
  const [replies, setReplies] = useState<QuickReply[]>(() => loadReplies());
  const [manageOpen, setManageOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftBody, setDraftBody] = useState("");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(replies)); } catch {}
  }, [replies]);

  const expand = (body: string) => body.replace(/\{\{name\}\}/gi, customerName?.split(" ")[0] || "there");

  const startEdit = (qr: QuickReply | null) => {
    setEditing(qr);
    setDraftLabel(qr?.label || "");
    setDraftBody(qr?.body || "");
  };

  const saveEdit = () => {
    if (!draftLabel.trim() || !draftBody.trim()) return;
    if (editing) {
      setReplies((rs) => rs.map((r) => (r.id === editing.id ? { ...r, label: draftLabel.trim(), body: draftBody.trim() } : r)));
    } else {
      setReplies((rs) => [...rs, { id: `qr-${Date.now()}`, label: draftLabel.trim(), body: draftBody.trim() }]);
    }
    startEdit(null);
  };

  const remove = (id: string) => setReplies((rs) => rs.filter((r) => r.id !== id));

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      <Zap className="h-3 w-3 shrink-0 text-primary" />
      {replies.map((qr) => (
        <Button
          key={qr.id}
          type="button"
          variant="outline"
          size="sm"
          className="h-6 shrink-0 px-2 text-[10px]"
          onClick={() => onPick(expand(qr.body))}
          title={qr.body}
        >
          {qr.label}
        </Button>
      ))}
      <Dialog open={manageOpen} onOpenChange={(o) => { setManageOpen(o); if (!o) startEdit(null); }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" title="Manage quick replies">
            <Plus className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Reply Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <ScrollArea className="max-h-64 pr-2">
              <div className="space-y-1.5">
                {replies.map((qr) => (
                  <div key={qr.id} className="flex items-start gap-2 rounded border p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{qr.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{qr.body}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(qr)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(qr.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {replies.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No templates yet</p>}
              </div>
            </ScrollArea>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{editing ? "Edit template" : "Add new template"}</p>
                {editing && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => startEdit(null)}>
                    <X className="mr-1 h-3 w-3" /> Cancel
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Label (button text)</Label>
                <Input
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  placeholder="e.g. 👋 Greeting"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Message body — use {`{{name}}`} for customer name</Label>
                <Textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="Hi {{name}}, thanks for reaching out!"
                  className="min-h-20 text-xs"
                />
              </div>
              <Button size="sm" className="w-full" onClick={saveEdit} disabled={!draftLabel.trim() || !draftBody.trim()}>
                {editing ? "Save changes" : "Add template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
