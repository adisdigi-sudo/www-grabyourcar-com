import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  PartyPopper,
  ShieldCheck,
} from "lucide-react";

interface Step {
  step: string;
  ok: boolean;
  message?: string;
  data?: any;
}

interface ConnectResult {
  success: boolean;
  account?: any;
  templates_synced?: number;
  webhook_url?: string;
  webhook_verify_token?: string;
  steps?: Step[];
  error?: string;
}

const STEP_LABELS: Record<string, string> = {
  validate_phone: "Validating phone number",
  fetch_waba: "Fetching business account",
  register_phone: "Registering phone for Cloud API",
  subscribe_webhook: "Subscribing webhook",
  encrypt_secrets: "Encrypting credentials",
  save_account: "Saving connection",
  sync_templates: "Syncing message templates",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export default function WhatsAppSetupWizard({ open, onOpenChange, onConnected }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ConnectResult | null>(null);

  useEffect(() => {
    if (!open) {
      // soft reset on close
      setTimeout(() => {
        setStep(1);
        setResult(null);
        setPhoneNumberId("");
        setWabaId("");
        setAccessToken("");
      }, 200);
    }
  }, [open]);

  const handleConnect = async () => {
    if (!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()) {
      toast.error("Sab 3 fields zaroori hain");
      return;
    }
    setSubmitting(true);
    setResult(null);
    setStep(3);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
        body: {
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim(),
          access_token: accessToken.trim(),
        },
      });
      if (error) throw error;
      setResult(data as ConnectResult);
      if ((data as ConnectResult).success) {
        toast.success("WhatsApp connected!");
        onConnected?.();
      } else {
        toast.error((data as ConnectResult).error || "Connection failed");
      }
    } catch (e: any) {
      setResult({ success: false, error: e?.message || "Network error" });
      toast.error(e?.message || "Connection failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label || "Copied"} to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Connect Meta WhatsApp Cloud API
          </DialogTitle>
          <DialogDescription>
            Sirf 3 fields do — phone register, webhook subscribe aur templates sync sab
            automatic hoga.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 my-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= (n as 1 | 2 | 3)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {n}
              </div>
              {n < 3 && (
                <div
                  className={`h-1 flex-1 rounded ${
                    step > (n as 1 | 2 | 3) ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Instructions */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Meta se 3 cheezein nikalo</h3>
            <ol className="space-y-3 text-sm">
              <li>
                <strong>1. Meta Business Suite</strong> kholo →{" "}
                <a
                  href="https://business.facebook.com/wa/manage/home/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 underline"
                >
                  WhatsApp Manager <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <strong>2. Phone Number ID</strong> & <strong>WABA ID</strong> — WhatsApp
                Manager → Phone numbers tab me dono visible hote hain.
              </li>
              <li>
                <strong>3. Permanent Access Token</strong> →{" "}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 underline"
                >
                  Apps Console <ExternalLink className="h-3 w-3" />
                </a>{" "}
                → System Users → "Generate New Token" with{" "}
                <code className="text-xs bg-muted px-1 rounded">whatsapp_business_management</code>{" "}
                +{" "}
                <code className="text-xs bg-muted px-1 rounded">whatsapp_business_messaging</code>{" "}
                permissions.
              </li>
            </ol>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              Token database me <strong>encrypted</strong> save hota hai (pgcrypto + AES). Plain
              text kabhi store nahi hoga.
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Got it <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pnid">Phone Number ID</Label>
              <Input
                id="pnid"
                placeholder="e.g. 474586035740"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waba">WABA ID</Label>
              <Input
                id="waba"
                placeholder="e.g. 464323476769582"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Permanent Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="EAAJ..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleConnect}
                disabled={submitting || !phoneNumberId || !wabaId || !accessToken}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Connect & Verify
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Live progress + result */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Step list */}
            <div className="rounded-lg border divide-y">
              {Object.keys(STEP_LABELS).map((key) => {
                const found = result?.steps?.find((s) => s.step === key);
                const isPending = submitting && !found;
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-3 text-sm">
                    {isPending ? (
                      <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                    ) : found?.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(142_76%_36%)]" />
                    ) : found ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{STEP_LABELS[key]}</div>
                      {found?.message && (
                        <div
                          className={`text-xs ${
                            found.ok ? "text-muted-foreground" : "text-destructive"
                          }`}
                        >
                          {found.message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {result && result.success && result.account && (
              <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <PartyPopper className="h-5 w-5" /> Successfully connected!
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="font-medium">
                      {result.account.display_phone_number || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Business</div>
                    <div className="font-medium">{result.account.business_name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Quality</div>
                    <Badge variant="outline">{result.account.quality_rating || "UNKNOWN"}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Templates synced</div>
                    <div className="font-medium">{result.templates_synced ?? 0}</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">Webhook URL (paste in Meta → Configuration)</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={result.webhook_url || ""} className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copy(result.webhook_url, "Webhook URL")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Label className="text-xs">Verify Token</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={result.webhook_verify_token || ""}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copy(result.webhook_verify_token, "Verify token")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {result && !result.success && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <div className="flex items-center gap-2 text-destructive font-semibold mb-1">
                  <XCircle className="h-5 w-5" /> Connection failed
                </div>
                <p>{result.error || "Unknown error. Check the steps above."}</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Edit credentials
              </Button>
              {result?.success ? (
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              ) : (
                !submitting && (
                  <Button onClick={handleConnect} disabled={submitting}>
                    Retry
                  </Button>
                )
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
