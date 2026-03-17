import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import {
  Plus, Key, Copy, Eye, EyeOff, RefreshCw, Trash2, Edit, Shield, Globe,
  BarChart3, Zap, Users, Activity, AlertTriangle, CheckCircle2, XCircle,
  ArrowUpRight, Clock, Webhook, Code2, BookOpen, Download
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────
interface Partner {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  api_key_hash: string | null;
  api_secret_hash: string | null;
  is_active: boolean | null;
  allowed_services: string[] | null;
  rate_limit_per_minute: number | null;
  webhook_url: string | null;
  callback_url: string | null;
  ip_whitelist: string[] | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  commission_percentage: number | null;
  branding_enabled: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  vertical_ids: string[] | null;
  api_key_prefix: string | null;
  total_requests: number | null;
  last_request_at: string | null;
}

interface Vertical {
  id: string;
  name: string;
  slug: string;
}

interface VerticalAccess {
  id: string;
  partner_id: string;
  vertical_id: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

// ─── Component ──────────────────────────────────────────────────
export function OpenAPIPortal() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("partners");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [generatedKeys, setGeneratedKeys] = useState<{ apiKey: string; apiSecret: string } | null>(null);
  const [selectedPartnerForAccess, setSelectedPartnerForAccess] = useState<Partner | null>(null);

  const [form, setForm] = useState({
    name: "", slug: "", description: "", contact_name: "", contact_email: "",
    contact_phone: "", webhook_url: "", callback_url: "", rate_limit: 60,
    ip_whitelist: "", notes: "", commission: 0, branding: true,
  });

  // ─── Queries ────────────────────────────────────────────────
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["open-api-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_partners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Partner[];
    },
  });

  const { data: verticals = [] } = useQuery({
    queryKey: ["verticals-for-api"],
    queryFn: async () => {
      const { data } = await supabase.from("business_verticals").select("id, name, slug").eq("is_active", true).order("sort_order");
      return (data || []) as Vertical[];
    },
  });

  const { data: apiLogs = [] } = useQuery({
    queryKey: ["api-logs-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: usageData = [] } = useQuery({
    queryKey: ["api-usage-daily"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_usage_daily")
        .select("*")
        .gte("usage_date", subDays(new Date(), 30).toISOString().split("T")[0])
        .order("usage_date", { ascending: false });
      return data || [];
    },
  });

  const { data: verticalAccessMap = [] } = useQuery({
    queryKey: ["api-vertical-access", selectedPartnerForAccess?.id],
    queryFn: async () => {
      if (!selectedPartnerForAccess) return [];
      const { data } = await supabase
        .from("api_key_vertical_access")
        .select("*")
        .eq("partner_id", selectedPartnerForAccess.id);
      return (data || []) as VerticalAccess[];
    },
    enabled: !!selectedPartnerForAccess,
  });

  // ─── Mutations ──────────────────────────────────────────────
  const createPartner = useMutation({
    mutationFn: async () => {
      const apiKey = `gyc_${crypto.randomUUID().replace(/-/g, "")}`;
      const apiSecret = `gycs_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const prefix = apiKey.slice(0, 12);

      const { error } = await supabase.from("api_partners").insert({
        name: form.name,
        slug: form.slug.toLowerCase().replace(/\s+/g, "-"),
        description: form.description || null,
        api_key_hash: apiKey,
        api_secret_hash: apiSecret,
        api_key_prefix: prefix,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        webhook_url: form.webhook_url || null,
        callback_url: form.callback_url || null,
        rate_limit_per_minute: form.rate_limit,
        ip_whitelist: form.ip_whitelist ? form.ip_whitelist.split(",").map(s => s.trim()).filter(Boolean) : null,
        notes: form.notes || null,
        commission_percentage: form.commission,
        branding_enabled: form.branding,
        is_active: true,
      } as any);

      if (error) throw error;
      return { apiKey, apiSecret };
    },
    onSuccess: (keys) => {
      queryClient.invalidateQueries({ queryKey: ["open-api-partners"] });
      setGeneratedKeys(keys);
      toast.success("Partner created! Save the API credentials now.");
    },
    onError: () => toast.error("Failed to create partner"),
  });

  const togglePartner = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("api_partners").update({ is_active: active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-api-partners"] });
      toast.success("Partner updated");
    },
  });

  const deletePartner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-api-partners"] });
      toast.success("Partner deleted");
    },
  });

  const rotateKeys = useMutation({
    mutationFn: async (id: string) => {
      const apiKey = `gyc_${crypto.randomUUID().replace(/-/g, "")}`;
      const apiSecret = `gycs_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const { error } = await supabase.from("api_partners").update({
        api_key_hash: apiKey,
        api_secret_hash: apiSecret,
        api_key_prefix: apiKey.slice(0, 12),
        key_rotated_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
      return { apiKey, apiSecret };
    },
    onSuccess: (keys) => {
      queryClient.invalidateQueries({ queryKey: ["open-api-partners"] });
      setGeneratedKeys(keys);
      toast.success("Keys rotated! Save new credentials.");
    },
  });

  const saveVerticalAccess = useMutation({
    mutationFn: async ({ partnerId, verticalId, permissions }: { partnerId: string; verticalId: string; permissions: { can_read: boolean; can_write: boolean; can_delete: boolean } }) => {
      const { error } = await supabase.from("api_key_vertical_access").upsert({
        partner_id: partnerId,
        vertical_id: verticalId,
        ...permissions,
      } as any, { onConflict: "partner_id,vertical_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-vertical-access"] });
      toast.success("Access updated");
    },
  });

  const removeVerticalAccess = useMutation({
    mutationFn: async ({ partnerId, verticalId }: { partnerId: string; verticalId: string }) => {
      const { error } = await supabase.from("api_key_vertical_access").delete()
        .eq("partner_id", partnerId).eq("vertical_id", verticalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-vertical-access"] });
      toast.success("Access removed");
    },
  });

  // ─── Helpers ────────────────────────────────────────────────
  const resetForm = () => setForm({ name: "", slug: "", description: "", contact_name: "", contact_email: "", contact_phone: "", webhook_url: "", callback_url: "", rate_limit: 60, ip_whitelist: "", notes: "", commission: 0, branding: true });
  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };
  const maskKey = (key: string) => key ? `${key.slice(0, 12)}${"•".repeat(20)}` : "—";

  const totalRequests = partners.reduce((sum, p) => sum + (p.total_requests || 0), 0);
  const activePartners = partners.filter(p => p.is_active).length;
  const recentErrors = apiLogs.filter(l => (l.response_code || 0) >= 400).length;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const gatewayBaseUrl = `https://${projectId}.supabase.co/functions/v1/api-gateway`;

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{partners.length}</p>
                <p className="text-xs text-muted-foreground">Total Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{activePartners}</p>
                <p className="text-xs text-muted-foreground">Active Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Activity className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total API Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
              <div>
                <p className="text-2xl font-bold">{recentErrors}</p>
                <p className="text-xs text-muted-foreground">Recent Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="partners" className="gap-2"><Key className="h-4 w-4" />Partners & Keys</TabsTrigger>
          <TabsTrigger value="access" className="gap-2"><Shield className="h-4 w-4" />Vertical Access</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" />Usage Analytics</TabsTrigger>
          <TabsTrigger value="docs" className="gap-2"><BookOpen className="h-4 w-4" />API Docs</TabsTrigger>
        </TabsList>

        {/* ─── Partners Tab ─────────────────────────────────── */}
        <TabsContent value="partners" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">API Partners</h3>
              <p className="text-sm text-muted-foreground">Generate and manage API keys for external integrations</p>
            </div>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> New Partner
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading partners...</div>
          ) : partners.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Key className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No API Partners Yet</h3>
                <p className="text-muted-foreground mb-4">Create your first API partner to generate integration keys</p>
                <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>Create First Partner</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {partners.map((partner) => (
                <Card key={partner.id} className={`transition-all ${!partner.is_active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{partner.name}</h4>
                          <Badge variant={partner.is_active ? "default" : "secondary"}>
                            {partner.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-xs">{partner.slug}</Badge>
                        </div>
                        {partner.description && <p className="text-sm text-muted-foreground">{partner.description}</p>}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {(partner.total_requests || 0).toLocaleString()} requests</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Rate: {partner.rate_limit_per_minute || 60}/min</span>
                          {partner.last_request_at && <span className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> Last: {format(new Date(partner.last_request_at), "dd MMM HH:mm")}</span>}
                          {partner.contact_email && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {partner.contact_email}</span>}
                        </div>

                        {/* API Key Display */}
                        <div className="flex items-center gap-2 mt-2 p-2 rounded bg-muted/50">
                          <code className="text-xs font-mono flex-1">
                            {showSecrets[partner.id] ? partner.api_key_hash : maskKey(partner.api_key_hash || "")}
                          </code>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSecrets(s => ({ ...s, [partner.id]: !s[partner.id] }))}>
                            {showSecrets[partner.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyText(partner.api_key_hash || "")}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setSelectedPartnerForAccess(partner); setActiveTab("access"); }}>
                          <Shield className="h-3 w-3" /> Access
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => rotateKeys.mutate(partner.id)}>
                          <RefreshCw className="h-3 w-3" /> Rotate
                        </Button>
                        <Switch checked={partner.is_active || false} onCheckedChange={(checked) => togglePartner.mutate({ id: partner.id, active: checked })} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete this partner?")) deletePartner.mutate(partner.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Vertical Access Tab ──────────────────────────── */}
        <TabsContent value="access" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Label>Select Partner:</Label>
            <Select value={selectedPartnerForAccess?.id || ""} onValueChange={(val) => setSelectedPartnerForAccess(partners.find(p => p.id === val) || null)}>
              <SelectTrigger className="w-[300px]"><SelectValue placeholder="Choose a partner" /></SelectTrigger>
              <SelectContent>
                {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedPartnerForAccess ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vertical Permissions for {selectedPartnerForAccess.name}</CardTitle>
                <CardDescription>Grant read/write/delete access per business vertical</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vertical</TableHead>
                      <TableHead className="text-center">Read</TableHead>
                      <TableHead className="text-center">Write</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verticals.map((v) => {
                      const access = verticalAccessMap.find(a => a.vertical_id === v.id);
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox checked={access?.can_read || false} onCheckedChange={(checked) => {
                              saveVerticalAccess.mutate({ partnerId: selectedPartnerForAccess.id, verticalId: v.id, permissions: { can_read: !!checked, can_write: access?.can_write || false, can_delete: access?.can_delete || false } });
                            }} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox checked={access?.can_write || false} onCheckedChange={(checked) => {
                              saveVerticalAccess.mutate({ partnerId: selectedPartnerForAccess.id, verticalId: v.id, permissions: { can_read: access?.can_read || true, can_write: !!checked, can_delete: access?.can_delete || false } });
                            }} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox checked={access?.can_delete || false} onCheckedChange={(checked) => {
                              saveVerticalAccess.mutate({ partnerId: selectedPartnerForAccess.id, verticalId: v.id, permissions: { can_read: access?.can_read || true, can_write: access?.can_write || false, can_delete: !!checked } });
                            }} />
                          </TableCell>
                          <TableCell className="text-center">
                            {access && (
                              <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => removeVerticalAccess.mutate({ partnerId: selectedPartnerForAccess.id, verticalId: v.id })}>
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Select a partner to manage vertical access</CardContent></Card>
          )}
        </TabsContent>

        {/* ─── Analytics Tab ────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <h3 className="text-lg font-semibold">API Request Logs</h3>
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No API calls yet</TableCell></TableRow>
                    ) : apiLogs.map((log: any) => {
                      const partner = partners.find(p => p.id === log.partner_id);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{log.created_at ? format(new Date(log.created_at), "dd MMM HH:mm:ss") : "—"}</TableCell>
                          <TableCell className="text-xs font-medium">{partner?.name || "Unknown"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{log.method}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                          <TableCell>
                            <Badge variant={log.response_code < 400 ? "default" : "destructive"} className="text-xs">
                              {log.response_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{log.duration_ms}ms</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── API Docs Tab ─────────────────────────────────── */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code2 className="h-5 w-5" /> API Documentation</CardTitle>
              <CardDescription>Share this documentation with your integration partners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Base URL</h4>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted font-mono text-sm">
                  <code className="flex-1">{gatewayBaseUrl}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyText(gatewayBaseUrl)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Authentication Headers</h4>
                <div className="p-3 rounded-lg bg-muted font-mono text-sm space-y-1">
                  <p><span className="text-green-600">x-api-key</span>: your_api_key</p>
                  <p><span className="text-green-600">x-api-secret</span>: your_api_secret</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Endpoints</h4>
                <div className="space-y-3">
                  {[
                    { method: "GET", path: "/health", desc: "Check API connection status" },
                    { method: "GET", path: "/leads", desc: "Fetch leads (filtered by vertical access)" },
                    { method: "POST", path: "/leads", desc: "Create a new lead (requires write access)" },
                    { method: "GET", path: "/cars", desc: "Fetch car catalog" },
                    { method: "GET", path: "/verticals", desc: "List available business verticals" },
                  ].map((ep) => (
                    <div key={ep.path} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="font-mono w-16 justify-center">{ep.method}</Badge>
                      <code className="font-mono text-sm flex-1">{ep.path}</code>
                      <span className="text-sm text-muted-foreground">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example: Create Lead (cURL)</h4>
                <div className="p-3 rounded-lg bg-muted font-mono text-xs overflow-x-auto">
                  <pre>{`curl -X POST ${gatewayBaseUrl}/leads \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: gyc_your_key_here" \\
  -H "x-api-secret: gycs_your_secret_here" \\
  -d '{
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "source": "partner_crm",
    "service_category": "car_sales",
    "city": "Delhi"
  }'`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Rate Limits</h4>
                <p className="text-sm text-muted-foreground">Each partner has a configurable rate limit (default: 60 requests/minute). Exceeding the limit returns <code className="text-destructive">429 Too Many Requests</code>.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Error Responses</h4>
                <div className="space-y-1 text-sm">
                  <p><Badge variant="destructive" className="mr-2">401</Badge> Invalid or missing API credentials</p>
                  <p><Badge variant="destructive" className="mr-2">403</Badge> IP not whitelisted or insufficient permissions</p>
                  <p><Badge variant="destructive" className="mr-2">429</Badge> Rate limit exceeded</p>
                  <p><Badge variant="destructive" className="mr-2">404</Badge> Endpoint not found</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Create Partner Dialog ───────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create API Partner</DialogTitle>
            <DialogDescription>Generate API credentials for an external integration partner</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Partner Name *</Label>
                <Input placeholder="Acme Corp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input placeholder="acme-corp" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="What this partner integrates..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Webhook URL</Label>
                <Input placeholder="https://partner.com/webhook" value={form.webhook_url} onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))} />
              </div>
              <div>
                <Label>Callback URL</Label>
                <Input placeholder="https://partner.com/callback" value={form.callback_url} onChange={e => setForm(f => ({ ...f, callback_url: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Rate Limit (/min)</Label>
                <Input type="number" value={form.rate_limit} onChange={e => setForm(f => ({ ...f, rate_limit: parseInt(e.target.value) || 60 }))} />
              </div>
              <div>
                <Label>Commission %</Label>
                <Input type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={form.branding} onCheckedChange={c => setForm(f => ({ ...f, branding: c }))} />
                <Label>Branding</Label>
              </div>
            </div>
            <div>
              <Label>IP Whitelist (comma-separated, optional)</Label>
              <Input placeholder="192.168.1.1, 10.0.0.1" value={form.ip_whitelist} onChange={e => setForm(f => ({ ...f, ip_whitelist: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createPartner.mutate()} disabled={!form.name || !form.slug}>
              <Key className="h-4 w-4 mr-2" /> Generate API Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Generated Keys Dialog ───────────────────────────── */}
      <Dialog open={!!generatedKeys} onOpenChange={() => setGeneratedKeys(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /> API Keys Generated</DialogTitle>
            <DialogDescription>Save these credentials now. The secret will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">API Key</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted font-mono text-sm">
                <code className="flex-1 break-all">{generatedKeys?.apiKey}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(generatedKeys?.apiKey || "")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">API Secret</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted font-mono text-sm">
                <code className="flex-1 break-all">{generatedKeys?.apiSecret}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(generatedKeys?.apiSecret || "")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              <strong>Warning:</strong> Store these credentials securely. The API Secret cannot be retrieved after closing this dialog.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedKeys(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
