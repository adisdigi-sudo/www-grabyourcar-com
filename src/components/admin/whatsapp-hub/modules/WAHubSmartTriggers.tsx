import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Plus, Zap, Edit, Trash2, Play, FileText, Banknote, MessageCircle, Search, CheckCircle2, XCircle, Activity, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const INTENT_TYPES = [
  { value: "payment_info", label: "💰 Payment / Bank / UPI Info", icon: Banknote },
  { value: "document", label: "📄 Send Document (Policy/Invoice/Sanction)", icon: FileText },
  { value: "sales_info", label: "🚗 Sales Info from DB (Car details, status)", icon: Search },
  { value: "fixed_reply", label: "💬 Fixed Reply", icon: MessageCircle },
  { value: "redirect", label: "🔀 Redirect / Help Menu", icon: Zap },
];

const VERTICALS = [
  { value: "_global", label: "🌐 Global (all verticals)" },
  { value: "insurance", label: "Insurance" },
  { value: "loans", label: "Car Loans" },
  { value: "hsrp", label: "HSRP" },
  { value: "self-drive", label: "Self-Drive Rentals" },
  { value: "accessories", label: "Accessories" },
  { value: "crm", label: "CRM (Cars Sales)" },
];

// Common typo / Hinglish variants for popular keywords
const TYPO_VARIANTS: Record<string, string[]> = {
  policy: ["policy", "policy copy", "paalisi", "polisy", "policy pdf", "insurance copy", "send my policy"],
  invoice: ["invoice", "bill", "receipt", "rasid", "invoice pdf", "send invoice"],
  brochure: ["brochure", "brouche", "brocher", "broacher", "broucher", "catalog", "leaflet", "pdf"],
  photos: ["photo", "photos", "image", "images", "pic", "pics", "tasveer", "gallery"],
  account: ["account", "bank", "upi", "payment details", "khata", "kaha bhejun", "account number"],
  sanction: ["sanction", "sanction letter", "loan letter", "manjoori", "loan approval"],
  hsrp: ["hsrp", "plate status", "number plate", "plate order"],
};

// One-click templates for the most common scenarios
const QUICK_PRESETS = [
  {
    label: "📄 Send Policy (per customer)",
    apply: {
      trigger_name: "Send Insurance Policy",
      keywords: TYPO_VARIANTS.policy.join(", "),
      intent_type: "document",
      required_identity_fields: "vehicle_number, phone",
      fallback_message: "Please share your vehicle number (e.g. HR26AB1234) so I can fetch your policy.",
      action_config: { source_table: "insurance_policies", document_type: "policy_pdf", lookup_field: "vehicle_number", pdf_url_field: "policy_document_url" },
    },
  },
  {
    label: "🧾 Send Invoice (per customer)",
    apply: {
      trigger_name: "Send Invoice",
      keywords: TYPO_VARIANTS.invoice.join(", "),
      intent_type: "document",
      required_identity_fields: "phone",
      fallback_message: "Please share your registered phone number so I can find your invoice.",
      action_config: { source_table: "invoices", document_type: "invoice", lookup_field: "client_phone", pdf_url_field: "pdf_url" },
    },
  },
  {
    label: "🚗 Car Brochure (auto from DB)",
    apply: {
      trigger_name: "Car Brochure Request",
      keywords: TYPO_VARIANTS.brochure.join(", "),
      intent_type: "sales_info",
      required_identity_fields: "",
      fallback_message: "Please mention the exact car model name. Example: Thar brochure",
      action_config: { source_table: "cars", lookup_field: "name", fields_to_send: ["name", "brand", "brochure_url"], reply_prefix: "Sure ji 🙏 Here is the brochure:" },
    },
  },
  {
    label: "📸 Car Photo (auto from DB)",
    apply: {
      trigger_name: "Car Photo Request",
      keywords: TYPO_VARIANTS.photos.join(", "),
      intent_type: "sales_info",
      required_identity_fields: "",
      fallback_message: "Please mention the exact car model name. Example: Thar photos",
      action_config: { source_table: "cars", lookup_field: "name", fields_to_send: ["name", "brand"], reply_prefix: "Sure ji 🙏 Here is the photo:" },
    },
  },
  {
    label: "🏦 Payment / UPI details",
    apply: {
      trigger_name: "Payment Details",
      keywords: TYPO_VARIANTS.account.join(", "),
      intent_type: "payment_info",
      required_identity_fields: "",
      fallback_message: "",
      action_config: { account_name: "", account_number: "", ifsc: "", bank: "", upi_id: "", upi_number: "" },
    },
  },
];

interface TriggerForm {
  vertical_slug: string;
  trigger_name: string;
  keywords: string;
  intent_type: string;
  action_config: Record<string, any>;
  required_identity_fields: string;
  fallback_message: string;
  priority: number;
  is_active: boolean;
}

const EMPTY_FORM: TriggerForm = {
  vertical_slug: "_global",
  trigger_name: "",
  keywords: "",
  intent_type: "fixed_reply",
  action_config: {},
  required_identity_fields: "",
  fallback_message: "",
  priority: 100,
  is_active: true,
};

export function WAHubSmartTriggers() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("triggers");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TriggerForm>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const { data: triggers, isLoading } = useQuery({
    queryKey: ["smart-triggers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_flow_triggers")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["smart-trigger-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_flow_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: tab === "logs" ? 5000 : false,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: TriggerForm) => {
      const payload = {
        vertical_slug: data.vertical_slug === "_global" ? null : data.vertical_slug,
        trigger_name: data.trigger_name,
        keywords: data.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        intent_type: data.intent_type,
        action_config: data.action_config,
        required_identity_fields: data.required_identity_fields.split(",").map((k) => k.trim()).filter(Boolean),
        fallback_message: data.fallback_message || null,
        priority: data.priority,
        is_active: data.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("whatsapp_flow_triggers").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_flow_triggers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Trigger updated" : "Trigger created");
      queryClient.invalidateQueries({ queryKey: ["smart-triggers"] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_flow_triggers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trigger deleted");
      queryClient.invalidateQueries({ queryKey: ["smart-triggers"] });
    },
  });

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("whatsapp_flow_triggers").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["smart-triggers"] });
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      vertical_slug: t.vertical_slug || "_global",
      trigger_name: t.trigger_name,
      keywords: (t.keywords || []).join(", "),
      intent_type: t.intent_type,
      action_config: t.action_config || {},
      required_identity_fields: (t.required_identity_fields || []).join(", "),
      fallback_message: t.fallback_message || "",
      priority: t.priority || 100,
      is_active: t.is_active,
    });
    setDialogOpen(true);
  };

  const startNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const runTest = async () => {
    if (!testMessage) return toast.error("Enter a test message");
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-flow-engine", {
        body: {
          customer_phone: testPhone || "919999999999",
          message_text: testMessage,
        },
      });
      if (error) throw error;
      setTestResult(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  const renderConfigFields = () => {
    switch (form.intent_type) {
      case "payment_info":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Reply Template (overrides individual fields)</Label>
              <Textarea
                value={form.action_config.reply_template || ""}
                onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, reply_template: e.target.value } })}
                rows={6}
                placeholder="🏦 Payment Details..."
              />
            </div>
            <Input placeholder="Account Name" value={form.action_config.account_name || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, account_name: e.target.value } })} />
            <Input placeholder="Account Number" value={form.action_config.account_number || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, account_number: e.target.value } })} />
            <Input placeholder="IFSC" value={form.action_config.ifsc || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, ifsc: e.target.value } })} />
            <Input placeholder="Bank Name" value={form.action_config.bank || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, bank: e.target.value } })} />
            <Input placeholder="UPI ID" value={form.action_config.upi_id || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, upi_id: e.target.value } })} />
            <Input placeholder="UPI Number" value={form.action_config.upi_number || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, upi_number: e.target.value } })} />
          </div>
        );
      case "document":
        return (
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Source table (e.g. insurance_policies)" value={form.action_config.source_table || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, source_table: e.target.value } })} />
            <Input placeholder="Document type (e.g. policy_pdf)" value={form.action_config.document_type || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, document_type: e.target.value } })} />
            <Input placeholder="Lookup field (e.g. vehicle_number)" value={form.action_config.lookup_field || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, lookup_field: e.target.value } })} />
            <Input placeholder="PDF URL field (e.g. policy_pdf_url)" value={form.action_config.pdf_url_field || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, pdf_url_field: e.target.value } })} />
          </div>
        );
      case "sales_info":
        return (
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Source table (e.g. cars)" value={form.action_config.source_table || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, source_table: e.target.value } })} />
            <Input placeholder="Lookup field (e.g. name)" value={form.action_config.lookup_field || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, lookup_field: e.target.value } })} />
            <Input className="col-span-2" placeholder="Fields to send (comma-separated, e.g. name,brand,price_min)" value={(form.action_config.fields_to_send || []).join(",")} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, fields_to_send: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} />
            <Input className="col-span-2" placeholder='Reply prefix (e.g. "Yes ji sir 🙏 Here are the details:")' value={form.action_config.reply_prefix || ""} onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, reply_prefix: e.target.value } })} />
          </div>
        );
      case "fixed_reply":
        return (
          <Textarea
            placeholder="Reply text..."
            rows={6}
            value={form.action_config.reply_text || ""}
            onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, reply_text: e.target.value } })}
          />
        );
      case "redirect":
        return (
          <Textarea
            placeholder="Redirect / help menu message..."
            rows={6}
            value={form.action_config.redirect_message || ""}
            onChange={(e) => setForm({ ...form, action_config: { ...form.action_config, redirect_message: e.target.value } })}
          />
        );
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="text-amber-500" /> Smart Triggers — WhatsApp Auto-Reply Engine
          </h2>
          <p className="text-sm text-muted-foreground">
            Database-driven keyword → action engine. No AI needed. Fully exportable.
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="mr-2 h-4 w-4" /> New Trigger
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="triggers">Triggers ({triggers?.length || 0})</TabsTrigger>
          <TabsTrigger value="tester">🧪 Live Tester</TabsTrigger>
          <TabsTrigger value="logs">📊 Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="triggers">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Vertical</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Triggered</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                  )}
                  {triggers?.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.trigger_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.vertical_slug || "Global"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{INTENT_TYPES.find((x) => x.value === t.intent_type)?.label.split(" ")[0] || t.intent_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(t.keywords || []).slice(0, 4).map((k: string) => (
                            <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                          ))}
                          {(t.keywords || []).length > 4 && (
                            <Badge variant="secondary" className="text-xs">+{t.keywords.length - 4}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{t.total_triggered || 0}</TableCell>
                      <TableCell>
                        <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t.id, t.is_active)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tester">
          <Card>
            <CardHeader>
              <CardTitle>🧪 Test Your Triggers Live</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Customer Phone (optional)</Label>
                  <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="919999999999" />
                </div>
                <div>
                  <Label>Test Message</Label>
                  <Input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder='Try: "send my policy", "account number", "fortuner price"'
                    onKeyDown={(e) => e.key === "Enter" && runTest()}
                  />
                </div>
              </div>
              <Button onClick={runTest} disabled={testing}>
                <Play className="mr-2 h-4 w-4" /> {testing ? "Testing..." : "Run Test"}
              </Button>

              {testResult && (
                <Card className="bg-muted">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={testResult.matched ? "default" : "destructive"}>
                        {testResult.matched ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {testResult.matched || "No match"}
                      </Badge>
                      <Badge variant="outline">{testResult.action}</Badge>
                    </div>
                    <div>
                      <Label className="text-xs">Bot Reply:</Label>
                      <pre className="bg-background p-3 rounded mt-1 whitespace-pre-wrap text-sm">{testResult.outbound}</pre>
                    </div>
                    {testResult.attachments?.length > 0 && (
                      <div>
                        <Label className="text-xs">Attachments:</Label>
                        <pre className="bg-background p-3 rounded mt-1 text-xs">{JSON.stringify(testResult.attachments, null, 2)}</pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {logs?.map((log: any) => (
                    <Card key={log.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{log.customer_phone}</Badge>
                            <Badge variant={log.success ? "default" : "destructive"}>{log.action_taken}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm"><strong>In:</strong> {log.inbound_message}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2"><strong>Out:</strong> {log.outbound_message}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{log.processing_time_ms}ms</Badge>
                      </div>
                    </Card>
                  ))}
                  {!logs?.length && <p className="text-center py-8 text-muted-foreground">No activity yet. Send a test message above.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Trigger" : "Create New Trigger"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Trigger Name</Label>
                <Input value={form.trigger_name} onChange={(e) => setForm({ ...form, trigger_name: e.target.value })} placeholder="Send Insurance Policy" />
              </div>
              <div>
                <Label>Vertical</Label>
                <Select value={form.vertical_slug} onValueChange={(v) => setForm({ ...form, vertical_slug: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VERTICALS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Trigger Keywords (comma-separated)</Label>
              <Textarea
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="policy, policy copy, send my policy, insurance pdf"
                rows={2}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(TYPO_VARIANTS).map(([key, list]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const existing = form.keywords.split(",").map((s) => s.trim()).filter(Boolean);
                      const merged = Array.from(new Set([...existing, ...list]));
                      setForm({ ...form, keywords: merged.join(", ") });
                    }}
                  >
                    + {key} typos
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Match is case-insensitive. Click chips above to auto-add common typos / Hinglish variants.</p>
            </div>

            <div>
              <Label>Intent Type</Label>
              <Select value={form.intent_type} onValueChange={(v) => setForm({ ...form, intent_type: v, action_config: {} })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Action Configuration</Label>
              <div className="border rounded p-3 mt-1">{renderConfigFields()}</div>
            </div>

            {form.intent_type === "document" && (
              <div>
                <Label>Required Identity Fields (comma-separated)</Label>
                <Input
                  value={form.required_identity_fields}
                  onChange={(e) => setForm({ ...form, required_identity_fields: e.target.value })}
                  placeholder="vehicle_number, phone"
                />
                <p className="text-xs text-muted-foreground mt-1">Customer must provide these before document is sent.</p>
              </div>
            )}

            <div>
              <Label>Fallback Message (when identity missing or not found)</Label>
              <Textarea
                value={form.fallback_message}
                onChange={(e) => setForm({ ...form, fallback_message: e.target.value })}
                rows={2}
                placeholder="Please share your vehicle number..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <Label>Priority (lower = higher)</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 100 })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.trigger_name || !form.keywords}>
              {editingId ? "Update" : "Create"} Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
