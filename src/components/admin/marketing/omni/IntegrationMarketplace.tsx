import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Store, Plug, Webhook, Shield, CheckCircle, XCircle, AlertTriangle,
  ExternalLink, Loader2, Plus, Settings, Trash2, Eye, Activity, Search, Clock
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  required_secrets: string[];
  supported_channels: string[];
  pricing_tier: string;
  is_available: boolean;
}

interface Connection {
  id: string;
  provider_id: string;
  display_name: string;
  channel: string | null;
  is_active: boolean;
  credentials_configured: boolean;
  health_status: string;
  last_health_check: string | null;
  total_messages_sent: number;
  total_messages_failed: number;
  connected_at: string;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  secret_header: string;
  events_subscribed: string[];
  last_received_at: string | null;
  total_received: number;
  total_processed: number;
  total_failed: number;
  created_at: string;
}

interface WebhookLog {
  id: string;
  event_type: string | null;
  status: string;
  processing_time_ms: number | null;
  ip_address: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  messaging: "📱 Messaging",
  email: "📧 Email",
  payments: "💳 Payments",
  kyc: "🔐 KYC & Verification",
  ai: "🤖 AI",
  scraping: "🕷️ Scraping",
  content: "📰 Content",
};

export function IntegrationMarketplace() {
  const [tab, setTab] = useState("marketplace");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [showConnectProvider, setShowConnectProvider] = useState<Provider | null>(null);

  // Webhook form
  const [whName, setWhName] = useState("");
  const [whSlug, setWhSlug] = useState("");
  const [whSecret, setWhSecret] = useState("");

  // Connection form
  const [connName, setConnName] = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [p, c, w, l] = await Promise.all([
      (supabase as any).from("integration_providers").select("*").order("sort_order"),
      (supabase as any).from("integration_connections").select("*").order("connected_at", { ascending: false }),
      (supabase as any).from("webhook_endpoints").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("webhook_logs").select("id, event_type, status, processing_time_ms, ip_address, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    if (p.data) setProviders(p.data);
    if (c.data) setConnections(c.data);
    if (w.data) setWebhooks(w.data);
    if (l.data) setWebhookLogs(l.data);
    setLoading(false);
  };

  const connectProvider = async (provider: Provider) => {
    if (!connName.trim()) { toast.error("Display name required"); return; }
    const { error } = await (supabase as any).from("integration_connections").insert({
      provider_id: provider.id, display_name: connName.trim(),
      channel: provider.supported_channels?.[0] || null,
      credentials_configured: false, health_status: "pending",
    });
    if (error) { toast.error("Failed to connect"); return; }
    toast.success(`${provider.name} connected — configure credentials in Settings`);
    setShowConnectProvider(null); setConnName("");
    fetchAll();
  };

  const toggleConnection = async (id: string, active: boolean) => {
    await (supabase as any).from("integration_connections").update({ is_active: active }).eq("id", id);
    fetchAll();
  };

  const deleteConnection = async (id: string) => {
    await (supabase as any).from("integration_connections").delete().eq("id", id);
    toast.success("Disconnected");
    fetchAll();
  };

  const createWebhook = async () => {
    if (!whName.trim() || !whSlug.trim()) { toast.error("Name and slug required"); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { error } = await (supabase as any).from("webhook_endpoints").insert({
      name: whName.trim(), slug: whSlug.trim().toLowerCase().replace(/\s+/g, "-"),
      secret_value: whSecret || null,
      endpoint_url: `${supabaseUrl}/functions/v1/webhook-receiver?endpoint=${whSlug.trim().toLowerCase().replace(/\s+/g, "-")}`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Webhook endpoint created");
    setShowAddWebhook(false); setWhName(""); setWhSlug(""); setWhSecret("");
    fetchAll();
  };

  const toggleWebhook = async (id: string, active: boolean) => {
    await (supabase as any).from("webhook_endpoints").update({ is_active: active }).eq("id", id);
    fetchAll();
  };

  const deleteWebhook = async (id: string) => {
    await (supabase as any).from("webhook_endpoints").delete().eq("id", id);
    toast.success("Deleted");
    fetchAll();
  };

  const filteredProviders = providers.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.includes(search.toLowerCase()));
  const groupedProviders = filteredProviders.reduce((acc, p) => { (acc[p.category] = acc[p.category] || []).push(p); return acc; }, {} as Record<string, Provider[]>);
  const connectedProviderIds = new Set(connections.map(c => c.provider_id));

  const healthIcon = (status: string) => {
    if (status === "healthy") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "unhealthy") return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="marketplace" className="gap-1.5"><Store className="h-3.5 w-3.5" />Marketplace</TabsTrigger>
          <TabsTrigger value="connections" className="gap-1.5"><Plug className="h-3.5 w-3.5" />Active Connections <Badge variant="secondary" className="ml-1">{connections.length}</Badge></TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" />Webhooks <Badge variant="secondary" className="ml-1">{webhooks.length}</Badge></TabsTrigger>
        </TabsList>

        {/* MARKETPLACE */}
        <TabsContent value="marketplace">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {Object.entries(groupedProviders).map(([cat, provs]) => (
            <div key={cat} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">{CATEGORY_LABELS[cat] || cat}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {provs.map(p => {
                  const isConnected = connectedProviderIds.has(p.id);
                  return (
                    <Card key={p.id} className={`transition-all ${isConnected ? "ring-2 ring-primary/30" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm">{p.name}</h4>
                            <Badge variant="outline" className="text-[10px] mt-1">{p.pricing_tier}</Badge>
                          </div>
                          {isConnected ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px]">Connected</Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => { setShowConnectProvider(p); setConnName(p.name); }}>
                              <Plug className="h-3 w-3 mr-1" />Connect
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                        {p.supported_channels.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {p.supported_channels.map(ch => (
                              <Badge key={ch} variant="secondary" className="text-[10px]">{ch}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          Requires: {p.required_secrets.join(", ")}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* CONNECTIONS */}
        <TabsContent value="connections">
          {connections.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              <Plug className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No active connections. Visit the marketplace to connect providers.</p>
            </CardContent></Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Connection</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-center">Sent</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.credentials_configured ? "✅ Credentials set" : "⚠️ Needs credentials"}
                      </div>
                    </TableCell>
                    <TableCell>{healthIcon(c.health_status)}</TableCell>
                    <TableCell>{c.channel ? <Badge variant="secondary">{c.channel}</Badge> : "—"}</TableCell>
                    <TableCell className="text-center">{c.total_messages_sent}</TableCell>
                    <TableCell className="text-center">{c.total_messages_failed}</TableCell>
                    <TableCell><Switch checked={c.is_active} onCheckedChange={v => toggleConnection(c.id, v)} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteConnection(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* WEBHOOKS */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddWebhook(true)}><Plus className="h-4 w-4 mr-1" />New Endpoint</Button>
          </div>

          {webhooks.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              <Webhook className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No webhook endpoints configured.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {webhooks.map(wh => (
                <Card key={wh.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {wh.name}
                          <Switch checked={wh.is_active} onCheckedChange={v => toggleWebhook(wh.id, v)} />
                        </div>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded block mt-1 break-all">
                          {import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver?endpoint={wh.slug}
                        </code>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex gap-3">
                          <span className="text-muted-foreground">Received: <strong>{wh.total_received}</strong></span>
                          <span className="text-muted-foreground">Processed: <strong>{wh.total_processed}</strong></span>
                          {wh.total_failed > 0 && <span className="text-destructive">Failed: <strong>{wh.total_failed}</strong></span>}
                        </div>
                        {wh.last_received_at && <div className="text-xs text-muted-foreground mt-1">Last: {new Date(wh.last_received_at).toLocaleString()}</div>}
                        <Button variant="ghost" size="icon" className="mt-1" onClick={() => deleteWebhook(wh.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {webhookLogs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />Recent Webhook Events</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookLogs.slice(0, 20).map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{log.event_type || "—"}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={log.status === "processed" ? "default" : "destructive"} className="text-xs">{log.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{log.processing_time_ms ? `${log.processing_time_ms}ms` : "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Connect Provider Dialog */}
      <Dialog open={!!showConnectProvider} onOpenChange={() => setShowConnectProvider(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Connect {showConnectProvider?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{showConnectProvider?.description}</p>
            <div><Label>Display Name</Label><Input value={connName} onChange={e => setConnName(e.target.value)} /></div>
            {showConnectProvider?.required_secrets && showConnectProvider.required_secrets.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-1">Required Secrets (configure in Settings → Secrets):</p>
                {showConnectProvider.required_secrets.map(s => (
                  <Badge key={s} variant="outline" className="text-xs mr-1 font-mono">{s}</Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectProvider(null)}>Cancel</Button>
            <Button onClick={() => showConnectProvider && connectProvider(showConnectProvider)}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Webhook Dialog */}
      <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Webhook Endpoint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={whName} onChange={e => setWhName(e.target.value)} placeholder="Resend Events" /></div>
            <div><Label>Slug (URL identifier)</Label><Input value={whSlug} onChange={e => setWhSlug(e.target.value)} placeholder="resend-events" /></div>
            <div><Label>Webhook Secret (optional)</Label><Input value={whSecret} onChange={e => setWhSecret(e.target.value)} placeholder="whsec_..." /></div>
            {whSlug && (
              <div className="p-2 bg-muted rounded text-xs break-all">
                <strong>Endpoint URL:</strong><br />
                {import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-receiver?endpoint={whSlug.toLowerCase().replace(/\s+/g, "-")}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
            <Button onClick={createWebhook}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
