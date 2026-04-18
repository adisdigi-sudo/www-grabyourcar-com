import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useWaPdfRules,
  useUpsertWaPdfRule,
  useDeleteWaPdfRule,
  useWaPdfLogs,
  type WaPdfAutomationRule,
} from "@/hooks/useWaPdfAutomation";
import { Plus, Trash2, Pencil, FileText, CheckCircle2, XCircle, Clock, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const VERTICALS = [
  { value: "sales", label: "Sales" },
  { value: "insurance", label: "Insurance" },
  { value: "hsrp", label: "HSRP" },
  { value: "self-drive", label: "Self-Drive" },
  { value: "loans", label: "Loans" },
  { value: "accessories", label: "Accessories" },
  { value: "fastag", label: "FASTag" },
];

const PDF_TYPES = [
  "invoice", "quote", "policy", "agreement", "sanction_letter", "receipt", "brochure", "custom",
];

const COMMON_EVENTS = [
  "deal_won", "quote_shared", "policy_issued", "order_confirmed",
  "order_dispatched", "booking_confirmed", "sanction_approved", "disbursed",
  "renewal_due", "delivery_completed", "payment_received",
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
    sent: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
    failed: { color: "bg-destructive/15 text-destructive", icon: XCircle },
    pending: { color: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Clock },
    queued: { color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: Clock },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1 border-0`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

export function WaPdfAutomationControl() {
  const { data: rules = [], isLoading } = useWaPdfRules();
  const { data: logs = [] } = useWaPdfLogs(150);
  const upsert = useUpsertWaPdfRule();
  const remove = useDeleteWaPdfRule();

  const [editing, setEditing] = useState<Partial<WaPdfAutomationRule> | null>(null);
  const [filterVertical, setFilterVertical] = useState<string>("all");

  const filteredRules = useMemo(
    () => rules.filter(r => filterVertical === "all" || r.vertical === filterVertical),
    [rules, filterVertical],
  );

  const stats = useMemo(() => {
    const sent = logs.filter(l => l.status === "sent").length;
    const failed = logs.filter(l => l.status === "failed").length;
    const last24h = logs.filter(l => Date.now() - new Date(l.created_at).getTime() < 86400000).length;
    return { active: rules.filter(r => r.is_active).length, total: rules.length, sent, failed, last24h };
  }, [rules, logs]);

  async function handleSave() {
    if (!editing) return;
    if (!editing.vertical || !editing.event_name || !editing.pdf_type) {
      toast.error("Vertical, Event and PDF type are required");
      return;
    }
    try {
      await upsert.mutateAsync(editing);
      toast.success("Rule saved");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rule? Past logs will be retained.")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Rule deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function toggleActive(rule: WaPdfAutomationRule) {
    try {
      await upsert.mutateAsync({ id: rule.id, is_active: !rule.is_active });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            WhatsApp PDF Automations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Auto-deliver branded PDFs (invoices, policies, agreements) over WhatsApp on lifecycle events.
          </p>
        </div>
        <Button onClick={() => setEditing({ is_active: true, cooldown_hours: 24, max_sends_per_record: 1, delay_minutes: 0 })}>
          <Plus className="h-4 w-4 mr-1" /> New Rule
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Active Rules" value={stats.active} sub={`of ${stats.total}`} />
        <StatCard label="Sent (last 150)" value={stats.sent} icon={<Send className="h-4 w-4" />} />
        <StatCard label="Failed" value={stats.failed} tone="destructive" icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Last 24h" value={stats.last24h} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Verticals" value={new Set(rules.map(r => r.vertical)).size} icon={<FileText className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs ({logs.length})</TabsTrigger>
          <TabsTrigger value="docs">Integration Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Automation Rules</CardTitle>
                <CardDescription>Each rule maps an event in a vertical to an auto-sent PDF.</CardDescription>
              </div>
              <Select value={filterVertical} onValueChange={setFilterVertical}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All verticals</SelectItem>
                  {VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vertical</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>PDF Type</TableHead>
                    <TableHead>Caption Preview</TableHead>
                    <TableHead className="text-center">Cooldown</TableHead>
                    <TableHead className="text-center">Sent</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filteredRules.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No rules. Click "New Rule" to add one.</TableCell></TableRow>
                  ) : filteredRules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell><Badge variant="secondary">{rule.vertical}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{rule.event_name}</TableCell>
                      <TableCell><Badge variant="outline">{rule.pdf_type}</Badge></TableCell>
                      <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                        {rule.caption_template || "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs">{rule.cooldown_hours}h</TableCell>
                      <TableCell className="text-center font-semibold">{rule.total_sent}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(rule)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
              <CardDescription>Last 150 PDF dispatches over WhatsApp. Auto-refreshes.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Vertical</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>PDF</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No deliveries yet.</TableCell></TableRow>
                    ) : logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.created_at), "MMM dd HH:mm")}</TableCell>
                        <TableCell><Badge variant="secondary">{log.vertical}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{log.event_name}</TableCell>
                        <TableCell>
                          {log.pdf_url ? (
                            <a href={log.pdf_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">{log.pdf_type}</a>
                          ) : <span className="text-xs">{log.pdf_type}</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{log.customer_name || "—"}</div>
                          <div className="text-muted-foreground">{log.phone}</div>
                        </TableCell>
                        <TableCell><StatusBadge status={log.status} /></TableCell>
                        <TableCell className="text-xs text-destructive max-w-[200px] truncate">{log.error_message || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>Trigger PDF auto-sends from anywhere in the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1">1. Generate the PDF (any vertical)</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`import { generateBrandedInvoice } from "@/lib/pdf";
const blob = await generateBrandedInvoice(invoiceData, { vertical: "sales", returnBlob: true });`}</pre>
              </div>
              <div>
                <h4 className="font-semibold mb-1">2. Trigger the auto-send</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{`import { triggerWhatsAppPdf } from "@/lib/whatsappPdfTrigger";

// Convert blob → base64 and dispatch
const reader = new FileReader();
reader.onloadend = () => {
  const b64 = (reader.result as string).split(",")[1];
  triggerWhatsAppPdf({
    vertical: "sales",
    event: "deal_won",
    phone: customer.phone,
    name: customer.name,
    recordId: deal.id,
    pdfBase64: b64,
    fileName: \`invoice-\${invoice.invoice_number}.pdf\`,
    variables: { car_model: deal.car_model },
  });
};
reader.readAsDataURL(blob);`}</pre>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Caption variables</h4>
                <p className="text-muted-foreground">Use <code className="bg-muted px-1 rounded">{`{name}`}</code>, <code className="bg-muted px-1 rounded">{`{phone}`}</code>, plus any keys you pass in <code>variables</code>.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Rule" : "New Automation Rule"}</DialogTitle>
            <DialogDescription>Define which PDF auto-sends for which event in which vertical.</DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vertical *</Label>
                <Select value={editing.vertical || ""} onValueChange={(v) => setEditing({ ...editing, vertical: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose vertical" /></SelectTrigger>
                  <SelectContent>
                    {VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>PDF Type *</Label>
                <Select value={editing.pdf_type || ""} onValueChange={(v) => setEditing({ ...editing, pdf_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose pdf type" /></SelectTrigger>
                  <SelectContent>
                    {PDF_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Event Name *</Label>
                <Input
                  list="event-suggestions"
                  value={editing.event_name || ""}
                  onChange={(e) => setEditing({ ...editing, event_name: e.target.value })}
                  placeholder="e.g. deal_won, policy_issued"
                />
                <datalist id="event-suggestions">
                  {COMMON_EVENTS.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>
              <div className="col-span-2">
                <Label>Caption Template</Label>
                <Textarea
                  rows={3}
                  value={editing.caption_template || ""}
                  onChange={(e) => setEditing({ ...editing, caption_template: e.target.value })}
                  placeholder="Hi {name}, your invoice is attached…"
                />
                <p className="text-xs text-muted-foreground mt-1">Variables: {`{name}`}, {`{phone}`}, plus any custom keys.</p>
              </div>
              <div>
                <Label>Cooldown (hours)</Label>
                <Input type="number" value={editing.cooldown_hours ?? 24}
                  onChange={(e) => setEditing({ ...editing, cooldown_hours: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Max sends per record</Label>
                <Input type="number" value={editing.max_sends_per_record ?? 1}
                  onChange={(e) => setEditing({ ...editing, max_sends_per_record: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Internal note (optional)" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label className="!m-0">Active</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label, value, sub, tone, icon,
}: { label: string; value: number | string; sub?: string; tone?: "destructive"; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className={`text-2xl font-bold mt-1 ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
