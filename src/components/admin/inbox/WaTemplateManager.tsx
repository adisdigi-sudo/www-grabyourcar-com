import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Edit, Trash2, Copy, Zap, LayoutTemplate, Save, CheckCircle, Clock, XCircle,
  AlertTriangle, Eye, Send, MessageSquare, Shield, Megaphone,
  FileText, Image, Video, Globe, Search, Filter, RefreshCw, BarChart3,
  GitBranch, TrendingUp, Phone, Link, Reply, PhoneCall, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Types & Constants ---
const META_CATEGORIES = {
  utility: { label: "Utility", icon: <Zap className="h-3.5 w-3.5" />, color: "bg-blue-500/10 text-blue-700 border-blue-200", pricing: "₹0.35/msg", desc: "Order updates, account alerts, appointment reminders" },
  authentication: { label: "Auth", icon: <Shield className="h-3.5 w-3.5" />, color: "bg-green-500/10 text-green-700 border-green-200", pricing: "₹0.30/msg", desc: "OTP, login verification codes" },
  marketing: { label: "Marketing", icon: <Megaphone className="h-3.5 w-3.5" />, color: "bg-orange-500/10 text-orange-700 border-orange-200", pricing: "₹0.80/msg", desc: "Promotions, offers, product launches" },
  service: { label: "Service", icon: <MessageSquare className="h-3.5 w-3.5" />, color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", pricing: "FREE", desc: "Customer service replies" },
} as const;
type MetaCategory = keyof typeof META_CATEGORIES;

interface Template {
  id: string; name: string; display_name: string | null; category: string; language: string;
  body: string; header_type: string | null; header_content: string | null; footer: string | null;
  variables: any; buttons: any; status: string; vertical: string | null;
  meta_template_id: string | null; meta_rejection_reason: string | null; created_at: string;
  sent_count: number; delivered_count: number; read_count: number; failed_count: number;
  replied_count: number; ab_variant_of: string | null; ab_variant_label: string | null;
  conversion_rate: number; last_sent_at: string | null;
}

interface QuickReply {
  id: string; title: string; shortcut: string | null; message: string;
  variables: string[] | null; category: string; vertical: string | null; is_active: boolean;
}

interface MetaButton {
  type: "URL" | "QUICK_REPLY" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

const COMMON_VARS = ["customer_name", "phone", "vehicle_number", "insurer", "premium", "expiry_date", "policy_number", "order_id", "amount", "date"];
const VERTICALS = ["Insurance", "Car Sales", "Self Drive", "HSRP", "Accessories", "Loans", "Marketing"];

const SAMPLE_VALUES: Record<string, string> = {
  customer_name: "Rahul Sharma", phone: "9876543210", vehicle_number: "MH02AB1234",
  insurer: "HDFC ERGO", premium: "₹12,500", expiry_date: "15 Apr 2026",
  policy_number: "POL-2024-12345", order_id: "ORD-789", amount: "₹8,500", date: "11 Apr 2026",
  otp: "123456", car_model: "Hyundai Creta", booking_id: "BK-001",
};

// ─── META VALIDATION ENGINE ───
interface ValidationIssue {
  type: "error" | "warning";
  field: string;
  message: string;
}

function validateTemplate(tpl: Partial<Template>, buttons: MetaButton[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const name = tpl.name || "";
  const body = tpl.body || "";
  const category = tpl.category || "utility";

  // Name validation
  if (!name) {
    issues.push({ type: "error", field: "name", message: "Template name is required" });
  } else {
    if (!/^[a-z0-9_]+$/.test(name)) {
      issues.push({ type: "error", field: "name", message: "Name must be lowercase with only letters, numbers, underscore. No spaces or special chars." });
    }
    if (name.length > 512) {
      issues.push({ type: "error", field: "name", message: "Name must be under 512 characters" });
    }
    if (name.startsWith("_") || name.endsWith("_")) {
      issues.push({ type: "warning", field: "name", message: "Avoid starting/ending with underscore" });
    }
  }

  // Body validation
  if (!body) {
    issues.push({ type: "error", field: "body", message: "Message body is required" });
  } else {
    if (body.length > 1024) {
      issues.push({ type: "error", field: "body", message: `Body exceeds 1024 chars (${body.length}/1024)` });
    }
    const invalidVars = body.match(/\{\{[^}]*[^a-zA-Z0-9_}][^}]*\}\}/g);
    if (invalidVars) {
      issues.push({ type: "error", field: "body", message: `Invalid variable format: ${invalidVars.join(", ")}. Use {{variable_name}} format.` });
    }

    const normalizedBody = body.replace(/\{\{([^}]+)\}\}/g, (_match, inner: string) => `{{${inner.trim()}}}`);
    const positionalMatches = normalizedBody.match(/\{\{\d+\}\}/g) || [];
    const namedMatches = normalizedBody.match(/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g) || [];
    const totalVariables = positionalMatches.length + namedMatches.length;
    const plainWords = normalizedBody
      .replace(/\{\{[^}]+\}\}/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const minimumWordsNeeded = totalVariables * 3;

    if (totalVariables > 0 && plainWords.length < minimumWordsNeeded) {
      issues.push({
        type: "error",
        field: "body",
        message: `Too many variables for body length: ${totalVariables} variables need about ${minimumWordsNeeded} real words, only ${plainWords.length} found. Add more text or reduce variables.`,
      });
    }

    if (category === "marketing" && body.replace(/\{\{\w+\}\}/g, "").trim().length < 10) {
      issues.push({ type: "warning", field: "body", message: "Marketing templates need substantial text content beyond variables" });
    }
  }

  // Header validation
  if (tpl.header_type === "text" && tpl.header_content) {
    const h = tpl.header_content;
    if (h.length > 60) {
      issues.push({ type: "error", field: "header", message: "Text header must be under 60 characters" });
    }
    if (/[\n\r]/.test(h)) {
      issues.push({ type: "error", field: "header", message: "Header cannot contain newlines" });
    }
    if (/\*/.test(h)) {
      issues.push({ type: "error", field: "header", message: "Header cannot contain asterisks (*)" });
    }
    if (/[\u{1F600}-\u{1F9FF}\u{2600}-\u{27BF}]/u.test(h)) {
      issues.push({ type: "error", field: "header", message: "Header cannot contain emojis" });
    }
    const headerVars = h.match(/\{\{\w+\}\}/g) || [];
    if (headerVars.length > 1) {
      issues.push({ type: "error", field: "header", message: "Header can have at most 1 variable" });
    }
  }

  // Footer validation
  if (tpl.footer) {
    if (tpl.footer.length > 60) {
      issues.push({ type: "error", field: "footer", message: "Footer must be under 60 characters" });
    }
    if (/\{\{/.test(tpl.footer)) {
      issues.push({ type: "error", field: "footer", message: "Footer cannot contain variables" });
    }
  }

  // Button validation
  if (buttons.length > 3) {
    issues.push({ type: "error", field: "buttons", message: "Maximum 3 buttons allowed" });
  }
  const urlButtons = buttons.filter(b => b.type === "URL");
  const phoneButtons = buttons.filter(b => b.type === "PHONE_NUMBER");
  if (urlButtons.length > 2) {
    issues.push({ type: "error", field: "buttons", message: "Maximum 2 URL buttons allowed" });
  }
  if (phoneButtons.length > 1) {
    issues.push({ type: "error", field: "buttons", message: "Maximum 1 phone number button allowed" });
  }
  buttons.forEach((btn, i) => {
    if (!btn.text || btn.text.length > 25) {
      issues.push({ type: "error", field: "buttons", message: `Button ${i + 1}: Text required & max 25 chars` });
    }
    if (btn.type === "URL" && !btn.url) {
      issues.push({ type: "error", field: "buttons", message: `Button ${i + 1}: URL is required` });
    }
    if (btn.type === "PHONE_NUMBER" && !btn.phone_number) {
      issues.push({ type: "error", field: "buttons", message: `Button ${i + 1}: Phone number is required` });
    }
    if (btn.type === "URL" && btn.url && !/^https?:\/\//.test(btn.url)) {
      issues.push({ type: "error", field: "buttons", message: `Button ${i + 1}: URL must start with http:// or https://` });
    }
  });

  // Auth category specific
  if (category === "authentication") {
    if (!body.includes("{{") || !body.match(/\{\{(otp|code|1)\}\}/i)) {
      issues.push({ type: "warning", field: "body", message: "Auth templates typically need an OTP/code variable" });
    }
  }

  return issues;
}

// --- Phone Preview Component ---
function PhonePreview({ template, buttons }: { template: Partial<Template>; buttons?: MetaButton[] }) {
  const renderBody = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_, v) => SAMPLE_VALUES[v] || `[${v}]`);
  const btns = buttons || (template.buttons as MetaButton[]) || [];

  return (
    <div className="w-[280px] mx-auto">
      <div className="bg-gray-900 rounded-[2rem] p-2 shadow-2xl">
        <div className="bg-gray-900 rounded-t-[1.5rem] pt-6 pb-1 px-4">
          <div className="flex items-center gap-2 text-white text-xs">
            <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">G</div>
            <div>
              <p className="font-medium text-sm">GrabYourCar</p>
              <p className="text-[10px] text-gray-400">Business Account</p>
            </div>
          </div>
        </div>
        <div className="bg-[#e5ddd5] rounded-b-[1.5rem] p-3 min-h-[320px] flex flex-col justify-end">
          <div className="bg-white rounded-lg p-2.5 shadow-sm max-w-[90%] ml-auto">
            {template.header_type === "text" && template.header_content && (
              <p className="font-bold text-xs mb-1">{renderBody(template.header_content)}</p>
            )}
            {template.header_type === "image" && (
              <div className="bg-gray-200 rounded h-24 flex items-center justify-center mb-2">
                <Image className="h-6 w-6 text-gray-400" />
              </div>
            )}
            {template.header_type === "video" && (
              <div className="bg-gray-800 rounded h-24 flex items-center justify-center mb-2">
                <Video className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <p className="text-[11px] whitespace-pre-wrap leading-relaxed">
              {renderBody(template.body || "Your message preview will appear here...")}
            </p>
            {template.footer && (
              <p className="text-[9px] text-gray-500 mt-1.5 border-t pt-1">{template.footer}</p>
            )}
            <p className="text-[9px] text-gray-400 text-right mt-1">
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
            </p>
          </div>
          {/* Buttons */}
          {btns.length > 0 && (
            <div className="mt-1 max-w-[90%] ml-auto space-y-0.5">
              {btns.map((btn, i) => (
                <div key={i} className="bg-white rounded-lg py-1.5 text-center text-[11px] text-blue-600 font-medium shadow-sm flex items-center justify-center gap-1">
                  {btn.type === "URL" && <Globe className="h-3 w-3" />}
                  {btn.type === "PHONE_NUMBER" && <PhoneCall className="h-3 w-3" />}
                  {btn.type === "QUICK_REPLY" && <Reply className="h-3 w-3" />}
                  {btn.text || "Button"}
                </div>
              ))}
            </div>
          )}
          {/* Category Badge */}
          <div className="flex items-center gap-1.5 mt-2 justify-end">
            {template.category && (
              <Badge variant="outline" className={cn("text-[8px]", META_CATEGORIES[template.category as MetaCategory]?.color)}>
                {META_CATEGORIES[template.category as MetaCategory]?.label || template.category}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Validation Panel ---
function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const errors = issues.filter(i => i.type === "error");
  const warnings = issues.filter(i => i.type === "warning");
  if (issues.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-2.5 text-xs text-green-700 flex items-center gap-2">
        <CheckCircle className="h-4 w-4" />
        <span className="font-medium">✅ Meta Ready — Template passes all validation checks</span>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {errors.map((e, i) => (
        <div key={`e-${i}`} className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-2 text-xs text-red-700 flex items-start gap-2">
          <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div><span className="font-medium capitalize">{e.field}:</span> {e.message}</div>
        </div>
      ))}
      {warnings.map((w, i) => (
        <div key={`w-${i}`} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-2 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div><span className="font-medium capitalize">{w.field}:</span> {w.message}</div>
        </div>
      ))}
    </div>
  );
}

// --- Button Editor Component ---
function ButtonEditor({ buttons, onChange }: { buttons: MetaButton[]; onChange: (b: MetaButton[]) => void }) {
  const addButton = (type: MetaButton["type"]) => {
    if (buttons.length >= 3) { toast.error("Max 3 buttons"); return; }
    onChange([...buttons, { type, text: "", url: type === "URL" ? "https://" : undefined, phone_number: type === "PHONE_NUMBER" ? "+91" : undefined }]);
  };
  const removeButton = (idx: number) => onChange(buttons.filter((_, i) => i !== idx));
  const updateButton = (idx: number, updates: Partial<MetaButton>) => {
    onChange(buttons.map((b, i) => i === idx ? { ...b, ...updates } : b));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Buttons (optional, max 3)</Label>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => addButton("URL")} disabled={buttons.length >= 3}>
            <Globe className="h-3 w-3" /> URL
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => addButton("QUICK_REPLY")} disabled={buttons.length >= 3}>
            <Reply className="h-3 w-3" /> Reply
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => addButton("PHONE_NUMBER")} disabled={buttons.length >= 3}>
            <PhoneCall className="h-3 w-3" /> Call
          </Button>
        </div>
      </div>
      {buttons.map((btn, idx) => (
        <div key={idx} className="border rounded-lg p-2.5 space-y-1.5 bg-muted/30">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[9px]">
              {btn.type === "URL" ? "🔗 URL" : btn.type === "PHONE_NUMBER" ? "📞 Call" : "↩️ Quick Reply"}
            </Badge>
            <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeButton(idx)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Input value={btn.text} onChange={e => updateButton(idx, { text: e.target.value })} placeholder="Button text (max 25 chars)" className="h-7 text-xs" maxLength={25} />
          {btn.type === "URL" && (
            <div>
              <Input value={btn.url || ""} onChange={e => updateButton(idx, { url: e.target.value })} placeholder="https://example.com/{{1}}" className="h-7 text-xs font-mono" />
              <p className="text-[9px] text-muted-foreground mt-0.5">Use {"{{1}}"} for dynamic URL suffix</p>
            </div>
          )}
          {btn.type === "PHONE_NUMBER" && (
            <Input value={btn.phone_number || ""} onChange={e => updateButton(idx, { phone_number: e.target.value })} placeholder="+919577200023" className="h-7 text-xs font-mono" />
          )}
        </div>
      ))}
    </div>
  );
}

// --- Performance Stats Component ---
function TemplateStats({ template }: { template: Template }) {
  const total = template.sent_count || 1;
  const deliveryRate = total > 0 ? Math.round((template.delivered_count / total) * 100) : 0;
  const readRate = total > 0 ? Math.round((template.read_count / total) * 100) : 0;
  const replyRate = total > 0 ? Math.round((template.replied_count / total) * 100) : 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-5 gap-2 text-center">
        {[
          { label: "Sent", val: template.sent_count, color: "text-blue-600" },
          { label: "Delivered", val: template.delivered_count, color: "text-green-600" },
          { label: "Read", val: template.read_count, color: "text-cyan-600" },
          { label: "Replied", val: template.replied_count, color: "text-purple-600" },
          { label: "Failed", val: template.failed_count, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-muted/50 rounded p-1.5">
            <p className={cn("text-sm font-bold", s.color)}>{s.val}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          { label: "Delivery", val: deliveryRate },
          { label: "Read", val: readRate },
          { label: "Reply", val: replyRate },
        ].map(s => (
          <div key={s.label}>
            <div className="flex items-center justify-between text-[10px]">
              <span>{s.label}</span><span className="font-mono">{s.val}%</span>
            </div>
            <Progress value={s.val} className="h-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Category Rules Panel ---
function CategoryRulesPanel() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("wa_category_rules").select("*").order("meta_category").order("rule_name")
      .then(({ data }) => { setRules(data || []); setLoading(false); });
  }, []);

  const categoryColors: Record<string, string> = {
    service: "bg-emerald-100 text-emerald-800 border-emerald-200",
    utility: "bg-blue-100 text-blue-800 border-blue-200",
    marketing: "bg-orange-100 text-orange-800 border-orange-200",
    authentication: "bg-green-100 text-green-800 border-green-200",
  };

  const categoryPricing: Record<string, string> = {
    service: "FREE (24hr window)",
    utility: "₹0.35/msg",
    marketing: "₹0.80/msg",
    authentication: "₹0.30/msg",
  };

  if (loading) return <div className="text-center p-8 text-muted-foreground text-sm">Loading rules...</div>;

  const grouped = rules.reduce((acc: Record<string, any[]>, r) => {
    const cat = r.meta_category || "service";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg p-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-blue-600" /> Meta Message Category Rules</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Yeh rules define karte hain ki konsa message kis Meta category me jayega. <strong>Service = FREE</strong> (24hr window ke andar), 
          <strong> Utility = ₹0.35</strong> (existing clients ko updates), <strong> Marketing = ₹0.80</strong> (new client outreach).
          System automatically enforce karta hai — koi bhi message galat category me nahi jayega.
        </p>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-4 gap-3">
        {(["service", "utility", "marketing", "authentication"] as const).map(cat => (
          <Card key={cat}>
            <CardContent className="p-3 text-center">
              <Badge variant="outline" className={cn("text-[10px] mb-1.5", categoryColors[cat])}>
                {cat.toUpperCase()}
              </Badge>
              <p className="text-lg font-bold">{categoryPricing[cat]}</p>
              <p className="text-[10px] text-muted-foreground">{grouped[cat]?.length || 0} rules</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rules by Category */}
      {(["service", "utility", "marketing", "authentication"] as const).map(cat => (
        <Card key={cat}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", categoryColors[cat])}>
                {cat === "service" ? "🆓" : cat === "utility" ? "🔧" : cat === "marketing" ? "📣" : "🔐"} {cat.toUpperCase()}
              </Badge>
              <span className="text-muted-foreground font-normal text-xs">— {categoryPricing[cat]}</span>
              {cat === "service" && <Badge className="bg-green-600 text-[9px]">Best for CRM Clients</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!grouped[cat] || grouped[cat].length === 0 ? (
              <p className="text-xs text-muted-foreground">No rules in this category</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Rule</TableHead>
                    <TableHead className="text-xs">Context</TableHead>
                    <TableHead className="text-xs">Template Required</TableHead>
                    <TableHead className="text-xs">Opt-out Footer</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(grouped[cat] || []).map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell className="text-xs font-medium">{rule.rule_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-mono">{rule.message_context}</Badge>
                      </TableCell>
                      <TableCell>
                        {rule.requires_template ? (
                          <Badge className="text-[9px] bg-amber-500">Required</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] text-green-600 border-green-200">Free Text OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.opt_out_footer_required ? (
                          <Badge variant="outline" className="text-[9px]">Yes</Badge>
                        ) : (
                          <span className="text-[9px] text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[200px]">{rule.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 text-xs">
        <p className="font-semibold text-amber-800">💡 Cost-Saving Strategy Active</p>
        <ul className="mt-1.5 space-y-1 text-amber-700">
          <li>• <strong>CRM Clients (Key Clients):</strong> Sabko free text jaata hai 24hr window ke andar + opt-out footer</li>
          <li>• <strong>Renewal Reminders:</strong> Pehle window check hota hai → agar open hai toh FREE, varna utility template</li>
          <li>• <strong>New Client Outreach:</strong> Marketing template mandatory — Meta policy strictly enforced</li>
          <li>• <strong>Bulk Campaigns:</strong> Campaign type ke hisaab se auto-categorize hota hai</li>
        </ul>
      </div>
    </div>
  );
}

// --- Main Component ---
export function WaTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [mainTab, setMainTab] = useState("templates");
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Template & QuickReply> | null>(null);
  const [editButtons, setEditButtons] = useState<MetaButton[]>([]);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterVertical, setFilterVertical] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsTemplate, setStatsTemplate] = useState<Template | null>(null);
  const [abCompareOpen, setAbCompareOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [submittingTemplateId, setSubmittingTemplateId] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [autoSyncActive, setAutoSyncActive] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  // Auto-sync: poll Meta every 30s when there are pending templates
  useEffect(() => {
    const hasPending = templates.some(t => t.status === "pending");
    if (!hasPending) { setAutoSyncActive(false); return; }
    setAutoSyncActive(true);
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "sync_templates" } });
        if (!error && data?.synced > 0) {
          await fetchAll();
          // Check if any pending became approved
          const { data: updated } = await supabase.from("wa_templates").select("id, status, display_name").in("status", ["approved", "rejected"]);
          const newlyApproved = (updated || []).filter(u => u.status === "approved" && templates.find(t => t.id === u.id && t.status === "pending"));
          newlyApproved.forEach(t => toast.success(`✅ "${t.display_name}" approved by Meta — now sendable!`));
          const newlyRejected = (updated || []).filter(u => u.status === "rejected" && templates.find(t => t.id === u.id && t.status === "pending"));
          newlyRejected.forEach(t => toast.error(`❌ "${t.display_name}" rejected by Meta`));
        }
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [templates]);

  // Live validation
  const validationIssues = useMemo(() => {
    if (!editItem || mainTab === "quick_replies") return [];
    return validateTemplate(editItem, editButtons);
  }, [editItem, editButtons, mainTab]);

  const hasErrors = validationIssues.some(i => i.type === "error");

  const fetchAll = async () => {
    const [tRes, qRes] = await Promise.all([
      supabase.from("wa_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("wa_quick_replies").select("*").order("sort_order"),
    ]);
    setTemplates((tRes.data || []) as unknown as Template[]);
    setQuickReplies((qRes.data || []) as unknown as QuickReply[]);
  };

  const syncFromMeta = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "sync_templates" } });
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} templates from Meta`);
      await fetchAll();
    } catch (err: any) { toast.error(err.message || "Sync failed"); }
    finally { setIsSyncing(false); }
  };

  const submitToMeta = async (template: Template) => {
    if (submittingTemplateId === template.id) return;

    const templateIssues = validateTemplate(template, Array.isArray(template.buttons) ? (template.buttons as MetaButton[]) : []);
    const blockingIssue = templateIssues.find(issue => issue.type === "error");
    if (blockingIssue) {
      toast.error(blockingIssue.message);
      return;
    }

    setSubmittingTemplateId(template.id);
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "submit_template", template_id: template.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Submitted to Meta ✅ — Auto-sync will track approval status");
      await fetchAll();
      // Trigger immediate sync after 5s to catch fast approvals
      setTimeout(async () => {
        try {
          await supabase.functions.invoke("meta-templates", { body: { action: "sync_templates" } });
          await fetchAll();
        } catch { /* silent */ }
      }, 5000);
    } catch (err: any) {
      toast.error(err.message || "Meta submission failed");
      await fetchAll();
    } finally {
      setSubmittingTemplateId(null);
    }
  };

  const deleteFromMeta = async (template: Template) => {
    if (!confirm(`Delete "${template.display_name || template.name}" from Meta?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "delete_template", template_name: template.name } });
      if (error) throw error;
      toast.success("Deleted from Meta");
      await fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const saveTemplate = async () => {
    if (isSavingTemplate) return;
    if (hasErrors) {
      toast.error("Fix validation errors before saving");
      return;
    }
    if (!editItem?.name || !editItem?.body) { toast.error("Name and body required"); return; }

    setIsSavingTemplate(true);
    const cleanName = editItem.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const payload: any = {
      name: cleanName, display_name: editItem.display_name || editItem.name,
      category: editItem.category || "utility", language: editItem.language || "en",
      body: editItem.body, header_type: editItem.header_type || null,
      header_content: editItem.header_content || null, footer: editItem.footer || null,
      variables: editItem.variables || [], buttons: editButtons.length > 0 ? editButtons : [],
      status: editItem.status || "draft", vertical: editItem.vertical || null,
      ab_variant_of: editItem.ab_variant_of || null,
      ab_variant_label: editItem.ab_variant_label || null,
    };

    try {
      let savedId = editItem.id;
      if (editItem.id) {
        await supabase.from("wa_templates").update(payload).eq("id", editItem.id);
        toast.success("Template updated");
      } else {
        const { data: ins } = await supabase.from("wa_templates").insert(payload).select("id").single();
        savedId = ins?.id;
        toast.success("Template created as Draft");
      }

      setIsEditing(false); setEditItem(null); setEditButtons([]); await fetchAll();

      if (savedId && (!editItem.id || editItem.status === "draft")) {
        const savedTemplate = templates.find(t => t.id === savedId) || ({ ...payload, id: savedId } as Template);
        const templateIssues = validateTemplate(savedTemplate, editButtons);
        const blockingIssue = templateIssues.find(issue => issue.type === "error");
        if (blockingIssue) {
          toast.error(`Saved locally. ${blockingIssue.message}`);
          return;
        }

        toast.info("Auto-submitting to Meta…");
        setSubmittingTemplateId(savedId);
        try {
          const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "submit_template", template_id: savedId } });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          toast.success("Submitted to Meta ✅");
          await fetchAll();
        } catch (err: any) {
          toast.error("Saved locally, Meta submission failed: " + (err.message || "Unknown error"));
          await fetchAll();
        } finally {
          setSubmittingTemplateId(null);
        }
      }
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const saveQuickReply = async () => {
    if (!editItem?.title || !(editItem as any)?.message) { toast.error("Title and message required"); return; }
    const payload = {
      title: editItem.title, shortcut: (editItem as any).shortcut || null,
      message: (editItem as any).message, variables: (editItem as any).variables || null,
      category: (editItem as any).category || "general", vertical: editItem.vertical || null,
      is_active: (editItem as any).is_active !== false,
    };
    if (editItem.id) {
      await supabase.from("wa_quick_replies").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("wa_quick_replies").insert(payload);
    }
    toast.success("Saved"); setIsEditing(false); setEditItem(null); fetchAll();
  };

  const deleteItem = async (id: string, type: "template" | "quick_reply") => {
    if (!confirm("Delete?")) return;
    await supabase.from(type === "template" ? "wa_templates" : "wa_quick_replies").delete().eq("id", id);
    toast.success("Deleted"); fetchAll();
  };

  const createAbVariant = (parentTemplate: Template) => {
    setEditItem({
      name: parentTemplate.name + "_b",
      display_name: (parentTemplate.display_name || parentTemplate.name) + " (Variant B)",
      category: parentTemplate.category, language: parentTemplate.language,
      body: parentTemplate.body, header_type: parentTemplate.header_type,
      header_content: parentTemplate.header_content, footer: parentTemplate.footer,
      vertical: parentTemplate.vertical, ab_variant_of: parentTemplate.id, ab_variant_label: "B",
    });
    setEditButtons((parentTemplate.buttons as MetaButton[]) || []);
    setIsEditing(true);
  };

  const insertVariable = (varName: string) => {
    if (!editItem) return;
    const key = mainTab === "templates" ? "body" : "message";
    setEditItem({ ...editItem, [key]: ((editItem as any)[key] || "") + `{{${varName}}}` });
  };

  const filteredTemplates = templates.filter(t => {
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterVertical !== "all" && t.vertical !== filterVertical) return false;
    if (searchQuery && !t.name.includes(searchQuery.toLowerCase()) && !(t.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCatMeta = (cat: string) => META_CATEGORIES[cat as MetaCategory] || META_CATEGORIES.utility;
  const getStatusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    if (s === "rejected") return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    if (s === "pending") return <Clock className="h-3.5 w-3.5 text-yellow-600" />;
    return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const abParents = templates.filter(t => !t.ab_variant_of && templates.some(v => v.ab_variant_of === t.id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                Template Manager Pro
                <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">Meta Live Sync</Badge>
              </h2>
              <p className="text-xs text-muted-foreground">Create, validate, A/B test — strict Meta compliance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoSyncActive && (
              <Badge variant="outline" className="text-[10px] border-yellow-300 text-yellow-700 animate-pulse gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Auto-Syncing (Pending templates)
              </Badge>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={syncFromMeta} disabled={isSyncing}>
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} /> {isSyncing ? "Syncing…" : "Sync from Meta"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", val: templates.length, icon: LayoutTemplate, color: "text-primary" },
          { label: "Approved", val: templates.filter(t => t.status === "approved").length, icon: CheckCircle, color: "text-green-600" },
          { label: "Pending", val: templates.filter(t => t.status === "pending").length, icon: Clock, color: "text-yellow-600" },
          { label: "A/B Tests", val: abParents.length, icon: GitBranch, color: "text-purple-600" },
          { label: "Total Sent", val: templates.reduce((s, t) => s + (t.sent_count || 0), 0), icon: Send, color: "text-blue-600" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <s.icon className={cn("h-7 w-7", s.color)} />
              <div>
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="templates" className="gap-1.5 text-xs"><LayoutTemplate className="h-3.5 w-3.5" /> Templates</TabsTrigger>
            <TabsTrigger value="quick_replies" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" /> Quick Replies</TabsTrigger>
            <TabsTrigger value="ab_testing" className="gap-1.5 text-xs"><GitBranch className="h-3.5 w-3.5" /> A/B Tests</TabsTrigger>
            <TabsTrigger value="category_rules" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> Category Rules</TabsTrigger>
          </TabsList>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditItem({}); setEditButtons([]); setIsEditing(true); }}>
            <Plus className="h-3.5 w-3.5" /> {mainTab === "quick_replies" ? "New Quick Reply" : "New Template"}
          </Button>
        </div>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-3">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-xs" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="authentication">Auth</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVertical} onValueChange={setFilterVertical}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verticals</SelectItem>
                {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[220px]">Template</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No templates found</TableCell></TableRow>
                    ) : filteredTemplates.map(t => {
                      const catMeta = getCatMeta(t.category);
                      const hasVariants = templates.some(v => v.ab_variant_of === t.id);
                      const total = t.sent_count || 0;
                      const readPct = total > 0 ? Math.round((t.read_count / total) * 100) : 0;
                      const btnCount = Array.isArray(t.buttons) ? t.buttons.length : 0;
                      return (
                        <TableRow key={t.id} className="group">
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm">{t.display_name || t.name}</p>
                                {t.ab_variant_label && (
                                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                                    <GitBranch className="h-2.5 w-2.5 mr-0.5" />{t.ab_variant_label}
                                  </Badge>
                                )}
                                {hasVariants && <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700">A/B</Badge>}
                                {btnCount > 0 && <Badge variant="outline" className="text-[9px]">{btnCount} btn</Badge>}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono">{t.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.body}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]", catMeta.color)}>
                              {catMeta.icon}<span className="ml-1">{catMeta.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                {getStatusIcon(t.status)}
                                <span className="text-xs capitalize">{t.status}</span>
                              </div>
                              {t.status === "rejected" && t.meta_rejection_reason && (
                                <p className="text-[10px] text-destructive line-clamp-1 max-w-[150px]">{t.meta_rejection_reason}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {total > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium">{total} sent</span>
                                <div className="w-16"><Progress value={readPct} className="h-1" /></div>
                                <span className="text-[10px] text-muted-foreground">{readPct}%</span>
                              </div>
                            ) : <span className="text-[10px] text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Preview" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}>
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Stats" onClick={() => { setStatsTemplate(t); setStatsOpen(true); }}>
                                <BarChart3 className="h-3.5 w-3.5" />
                              </Button>
                              {!t.ab_variant_of && t.status === "approved" && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-600" title="A/B Variant" onClick={() => createAbVariant(t)}>
                                  <GitBranch className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                setEditItem(t);
                                setEditButtons(Array.isArray(t.buttons) ? t.buttons as MetaButton[] : []);
                                setIsEditing(true);
                              }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(t.body); toast.success("Copied!"); }}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              {(t.status === "draft" || t.status === "rejected") ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-green-600"
                                  title={submittingTemplateId === t.id ? "Submitting..." : "Submit to Meta"}
                                  onClick={() => submitToMeta(t)}
                                  disabled={submittingTemplateId === t.id}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                              ) : t.status === "approved" ? (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteFromMeta(t)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Replies Tab */}
        <TabsContent value="quick_replies" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickReplies.map(qr => (
              <Card key={qr.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{qr.title}</CardTitle>
                    <Badge variant={qr.is_active ? "default" : "secondary"} className="text-[10px]">{qr.is_active ? "Active" : "Off"}</Badge>
                  </div>
                  {qr.shortcut && <Badge variant="outline" className="text-[9px] w-fit font-mono">/{qr.shortcut}</Badge>}
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{qr.message}</p>
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setMainTab("quick_replies"); setEditItem(qr as any); setIsEditing(true); }}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteItem(qr.id, "quick_reply")}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {quickReplies.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-8">No quick replies yet.</p>
            )}
          </div>
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="ab_testing" className="mt-3">
          {abParents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <GitBranch className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="font-medium">No A/B Tests Yet</p>
                <p className="text-sm text-muted-foreground">Create a variant of any approved template to start A/B testing</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {abParents.map(parent => {
                const variants = templates.filter(t => t.ab_variant_of === parent.id);
                const allVersions = [parent, ...variants];
                const bestPerf = allVersions.reduce((best, t) => (t.read_count > (best?.read_count || 0) ? t : best), allVersions[0]);
                return (
                  <Card key={parent.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-purple-600" />
                          {parent.display_name || parent.name}
                          <Badge variant="outline" className="text-[10px]">{allVersions.length} variants</Badge>
                        </CardTitle>
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => createAbVariant(parent)}>
                          <Plus className="h-3 w-3" /> Add Variant
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allVersions.map(t => (
                          <div key={t.id} className={cn("border rounded-lg p-3 space-y-2", t.id === bestPerf?.id && t.sent_count > 0 && "border-green-300 bg-green-50/50")}>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">{t.ab_variant_label || "A"}</Badge>
                              {t.id === bestPerf?.id && t.sent_count > 0 && (
                                <Badge className="text-[9px] bg-green-600"><TrendingUp className="h-2.5 w-2.5 mr-0.5" /> Winner</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{t.body}</p>
                            <TemplateStats template={t} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Category Rules Tab */}
        <TabsContent value="category_rules" className="mt-3">
          <CategoryRulesPanel />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={v => { if (!v) { setIsEditing(false); setEditItem(null); setEditButtons([]); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editItem?.id ? "Edit" : "Create"} {mainTab === "quick_replies" ? "Quick Reply" : "Template"}
              {editItem?.ab_variant_of && <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700"><GitBranch className="h-3 w-3 mr-1" />A/B Variant</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-6">
            {/* Form */}
            <div className="flex-1 space-y-3 min-w-0">
              {mainTab !== "quick_replies" ? (
                <>
                  {/* Live Validation Panel */}
                  <ValidationPanel issues={validationIssues} />

                  {/* Category info banner */}
                  {editItem?.category && (
                    <div className={cn("border rounded-lg p-2 text-xs flex items-center gap-2", META_CATEGORIES[editItem.category as MetaCategory]?.color)}>
                      {META_CATEGORIES[editItem.category as MetaCategory]?.icon}
                      <div>
                        <span className="font-medium">{META_CATEGORIES[editItem.category as MetaCategory]?.label}</span>
                        <span className="ml-1.5 opacity-70">— {META_CATEGORIES[editItem.category as MetaCategory]?.pricing}</span>
                        <span className="ml-1.5 opacity-60">| {META_CATEGORIES[editItem.category as MetaCategory]?.desc}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Template Name * <span className="text-muted-foreground">(lowercase, underscores only)</span></Label>
                      <Input value={editItem?.name || ""} onChange={e => setEditItem({ ...editItem, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="insurance_followup" className="h-8 text-sm font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs">Display Name</Label>
                      <Input value={editItem?.display_name || ""} onChange={e => setEditItem({ ...editItem, display_name: e.target.value })} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Category *</Label>
                      <Select value={editItem?.category || "utility"} onValueChange={v => setEditItem({ ...editItem, category: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utility">🔧 Utility — ₹0.35/msg</SelectItem>
                          <SelectItem value="marketing">📢 Marketing — ₹0.80/msg</SelectItem>
                          <SelectItem value="authentication">🔐 Auth — ₹0.30/msg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Language</Label>
                      <Select value={editItem?.language || "en"} onValueChange={v => setEditItem({ ...editItem, language: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Vertical</Label>
                      <Select value={editItem?.vertical || ""} onValueChange={v => setEditItem({ ...editItem, vertical: v || null })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Global" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global</SelectItem>
                          {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Header</Label>
                    <div className="flex gap-1.5 mb-1.5">
                      {["none", "text", "image", "video", "document"].map(ht => (
                        <Button key={ht} type="button" size="sm" variant={(editItem?.header_type || "none") === ht ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => setEditItem({ ...editItem, header_type: ht === "none" ? null : ht })}>
                          {ht.charAt(0).toUpperCase() + ht.slice(1)}
                        </Button>
                      ))}
                    </div>
                    {editItem?.header_type === "text" && (
                      <div>
                        <Input value={editItem?.header_content || ""} onChange={e => setEditItem({ ...editItem, header_content: e.target.value })} placeholder="Header text (max 60 chars, no emoji/bold)" className="h-8 text-sm" maxLength={60} />
                        <p className="text-[9px] text-muted-foreground mt-0.5">No emojis, no *, no newlines. Max 1 variable.</p>
                      </div>
                    )}
                    {editItem?.header_type && editItem.header_type !== "text" && (
                      <p className="text-[10px] text-muted-foreground">Media header — upload at send time. No URL needed here.</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Body * <span className="text-muted-foreground">({(editItem?.body || "").length}/1024)</span></Label>
                      <div className="flex gap-1 flex-wrap">
                        {COMMON_VARS.slice(0, 8).map(v => (
                          <button key={v} onClick={() => insertVariable(v)} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-mono">{`{{${v}}}`}</button>
                        ))}
                      </div>
                    </div>
                    <Textarea value={editItem?.body || ""} onChange={e => setEditItem({ ...editItem, body: e.target.value })} rows={5} className="text-sm font-mono" maxLength={1024} />
                  </div>
                  <div>
                    <Label className="text-xs">Footer <span className="text-muted-foreground">(max 60 chars, no variables)</span></Label>
                    <Input value={editItem?.footer || ""} onChange={e => setEditItem({ ...editItem, footer: e.target.value })} className="h-8 text-sm" placeholder="Reply STOP to unsubscribe" maxLength={60} />
                  </div>

                  {/* Button Editor */}
                  <ButtonEditor buttons={editButtons} onChange={setEditButtons} />

                  {editItem?.ab_variant_of && (
                    <div>
                      <Label className="text-xs">Variant Label</Label>
                      <Input value={editItem?.ab_variant_label || "B"} onChange={e => setEditItem({ ...editItem, ab_variant_label: e.target.value })} className="h-8 text-sm w-20" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs">Title *</Label>
                    <Input value={editItem?.title || ""} onChange={e => setEditItem({ ...editItem, title: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Shortcut</Label>
                    <Input value={(editItem as any)?.shortcut || ""} onChange={e => setEditItem({ ...editItem, shortcut: e.target.value } as any)} className="h-8 text-sm font-mono" placeholder="/greet" />
                  </div>
                  <div>
                    <Label className="text-xs">Message *</Label>
                    <Textarea value={(editItem as any)?.message || ""} onChange={e => setEditItem({ ...editItem, message: e.target.value } as any)} rows={4} className="text-sm" />
                  </div>
                </>
              )}
            </div>

            {/* Live Phone Preview */}
            {mainTab !== "quick_replies" && (
              <div className="shrink-0">
                <p className="text-xs font-medium text-center mb-2 text-muted-foreground">Live Preview</p>
                <PhonePreview template={editItem || {}} buttons={editButtons} />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setIsEditing(false); setEditItem(null); setEditButtons([]); }} disabled={isSavingTemplate}>Cancel</Button>
            <Button onClick={mainTab === "quick_replies" ? saveQuickReply : saveTemplate} className="gap-2" disabled={(mainTab !== "quick_replies" && hasErrors) || isSavingTemplate}>
              <Save className="h-4 w-4" /> {isSavingTemplate ? "Saving..." : hasErrors ? "Fix Errors First" : "Save & Submit to Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Template Preview</DialogTitle></DialogHeader>
          {previewTemplate && <PhonePreview template={previewTemplate} />}
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Template Performance
            </DialogTitle>
          </DialogHeader>
          {statsTemplate && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{statsTemplate.display_name || statsTemplate.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{statsTemplate.name}</p>
              </div>
              <TemplateStats template={statsTemplate} />
              {statsTemplate.last_sent_at && (
                <p className="text-xs text-muted-foreground">Last sent: {new Date(statsTemplate.last_sent_at).toLocaleString("en-IN")}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
