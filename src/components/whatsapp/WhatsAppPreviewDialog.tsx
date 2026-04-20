import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Eye, Lock } from "lucide-react";

export interface WhatsAppPreviewPayload {
  phone: string;
  message: string;
  name?: string;
  templateName?: string;
  messageType?: string;
  mediaUrl?: string;
  mediaFileName?: string;
  bulkCount?: number; // if set → bulk mode (this is sample of N)
  vertical?: string;
  logEvent?: string;
}

type Resolver = (result: { confirmed: boolean; editedMessage?: string; skipNextTime?: boolean }) => void;

let openDialogFn: ((payload: WhatsAppPreviewPayload, resolver: Resolver) => void) | null = null;

export const SKIP_PREVIEW_KEY = "wa_skip_preview_session";

export function shouldSkipPreview(): boolean {
  try { return sessionStorage.getItem(SKIP_PREVIEW_KEY) === "1"; } catch { return false; }
}
export function setSkipPreview(v: boolean) {
  try { v ? sessionStorage.setItem(SKIP_PREVIEW_KEY, "1") : sessionStorage.removeItem(SKIP_PREVIEW_KEY); } catch {}
}

/** Programmatic API used by sendWhatsApp() */
export function requestWhatsAppPreview(payload: WhatsAppPreviewPayload): Promise<{ confirmed: boolean; editedMessage?: string; skipNextTime?: boolean }> {
  return new Promise((resolve) => {
    if (!openDialogFn) {
      // Dialog not mounted — fail open (send as-is)
      resolve({ confirmed: true });
      return;
    }
    openDialogFn(payload, resolve);
  });
}

export function WhatsAppPreviewProvider() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<WhatsAppPreviewPayload | null>(null);
  const [edited, setEdited] = useState("");
  const [skip, setSkip] = useState(false);
  const [resolver, setResolver] = useState<Resolver | null>(null);

  useEffect(() => {
    openDialogFn = (p, r) => {
      setPayload(p);
      setEdited(p.message || "");
      setSkip(false);
      setResolver(() => r);
      setOpen(true);
    };
    return () => { openDialogFn = null; };
  }, []);

  const isTemplate = Boolean(payload?.templateName);
  const isMedia = Boolean(payload?.mediaUrl);
  const editable = !isTemplate; // hybrid: free-text editable, templates read-only
  const isBulk = (payload?.bulkCount ?? 0) > 1;

  const handleConfirm = () => {
    setSkipPreview(skip);
    resolver?.({ confirmed: true, editedMessage: edited, skipNextTime: skip });
    setOpen(false);
  };
  const handleCancel = () => {
    resolver?.({ confirmed: false });
    setOpen(false);
  };

  if (!payload) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Preview WhatsApp Message
            {isBulk && <Badge variant="secondary" className="ml-2">Bulk: {payload.bulkCount} recipients</Badge>}
            {isTemplate && <Badge variant="outline" className="ml-2"><Lock className="h-3 w-3 mr-1" />Meta Template</Badge>}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? <>Sample below shows the first recipient. Same template will be sent to <b>{payload.bulkCount}</b> contacts.</>
              : <>To: <b>{payload.name || "—"}</b> · {payload.phone}</>
            }
            {payload.vertical && <> · <Badge variant="outline" className="ml-1 text-[10px]">{payload.vertical}</Badge></>}
          </DialogDescription>
        </DialogHeader>

        {/* WhatsApp-style chat bubble preview */}
        <div className="bg-[#e5ddd5] dark:bg-muted/30 rounded-lg p-4 max-h-[55vh]">
          <ScrollArea className="max-h-[45vh]">
            <div className="bg-[#dcf8c6] dark:bg-green-900/30 rounded-lg p-3 shadow-sm max-w-[85%] ml-auto">
              {isMedia && (
                <div className="mb-2 p-2 bg-background/50 rounded text-xs flex items-center gap-2">
                  📎 <span className="font-mono truncate">{payload.mediaFileName || "attachment"}</span>
                </div>
              )}
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{edited || "(empty)"}</pre>
              <div className="text-[10px] text-muted-foreground text-right mt-1">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓</div>
            </div>
          </ScrollArea>
        </div>

        {editable ? (
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Eye className="h-3 w-3" /> Edit before sending (optional)</label>
            <Textarea value={edited} onChange={(e) => setEdited(e.target.value)} rows={5} className="font-mono text-xs" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic flex items-center gap-1">
            <Lock className="h-3 w-3" /> Meta-approved templates can't be edited — only variables are filled.
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Checkbox id="skip-wa-preview" checked={skip} onCheckedChange={(v) => setSkip(Boolean(v))} />
          <label htmlFor="skip-wa-preview" className="text-xs text-muted-foreground cursor-pointer">
            Skip preview for the rest of this session
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-1" />
            {isBulk ? `Send to ${payload.bulkCount} contacts` : "Confirm & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
