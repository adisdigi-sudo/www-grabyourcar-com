import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Star,
} from "lucide-react";

interface LogisticsPartner {
  id: string;
  name: string;
  slug: string;
  api_base_url: string | null;
  auth_type: string;
  api_email: string | null;
  api_token: string | null;
  api_key: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  is_default: boolean;
  supported_services: string[];
  config: any;
  created_at: string;
}

const PRESET_PARTNERS = [
  {
    name: "Shiprocket",
    slug: "shiprocket",
    api_base_url: "https://apiv2.shiprocket.in",
    auth_type: "email_password",
    supported_services: ["shipping", "tracking", "returns", "cod"],
  },
  {
    name: "Delhivery",
    slug: "delhivery",
    api_base_url: "https://track.delhivery.com",
    auth_type: "token",
    supported_services: ["shipping", "tracking", "returns"],
  },
  {
    name: "BlueDart",
    slug: "bluedart",
    api_base_url: "https://netconnect.bluedart.com",
    auth_type: "api_key",
    supported_services: ["shipping", "tracking"],
  },
  {
    name: "DTDC",
    slug: "dtdc",
    api_base_url: "https://blabordelivery.dtdc.com",
    auth_type: "api_key",
    supported_services: ["shipping", "tracking"],
  },
  {
    name: "Ecom Express",
    slug: "ecom-express",
    api_base_url: "https://api.ecomexpress.in",
    auth_type: "api_key",
    supported_services: ["shipping", "tracking", "cod"],
  },
  {
    name: "XpressBees",
    slug: "xpressbees",
    api_base_url: "https://shipment.xpressbees.com",
    auth_type: "token",
    supported_services: ["shipping", "tracking", "returns"],
  },
  {
    name: "Custom Partner",
    slug: "",
    api_base_url: "",
    auth_type: "api_key",
    supported_services: [],
  },
];

const EMPTY_FORM = {
  name: "",
  slug: "",
  api_base_url: "",
  auth_type: "token",
  api_email: "",
  api_password: "",
  api_token: "",
  api_key: "",
  is_active: true,
  is_default: false,
  supported_services: [] as string[],
};

export function LogisticsPartnersPanel() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showSecret, setShowSecret] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["logistics-partners"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("logistics_partners")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as LogisticsPartner[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload: any = {
        name: values.name,
        slug: values.slug || values.name.toLowerCase().replace(/\s+/g, "-"),
        api_base_url: values.api_base_url || null,
        auth_type: values.auth_type,
        api_email: values.api_email || null,
        api_token: values.api_token || null,
        api_key: values.api_key || null,
        is_active: values.is_active,
        is_default: values.is_default,
        supported_services: values.supported_services,
        updated_at: new Date().toISOString(),
      };

      // Store password as encrypted field
      if (values.api_password) {
        payload.api_password_encrypted = values.api_password;
      }

      if (values.id) {
        const { error } = await (supabase as any)
          .from("logistics_partners")
          .update(payload)
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("logistics_partners")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics-partners"] });
      toast.success(editId ? "Partner updated" : "Partner added");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("logistics_partners")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics-partners"] });
      toast.success("Partner removed");
    },
  });

  const testConnection = async (partner: LogisticsPartner) => {
    setTestingId(partner.id);
    try {
      if (partner.slug === "shiprocket") {
        const res = await fetch(
          `${partner.api_base_url}/v1/external/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: partner.api_email,
              password: partner.config?.password || "",
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          // Save the token
          await (supabase as any)
            .from("logistics_partners")
            .update({
              api_token: data.token,
              token_expires_at: new Date(
                Date.now() + 10 * 24 * 60 * 60 * 1000
              ).toISOString(),
            })
            .eq("id", partner.id);
          queryClient.invalidateQueries({ queryKey: ["logistics-partners"] });
          toast.success("Shiprocket connected! Token saved.");
        } else {
          toast.error("Shiprocket auth failed — check credentials");
        }
      } else {
        toast.info("Connection test not available for this partner yet");
      }
    } catch {
      toast.error("Connection failed — check API URL and credentials");
    } finally {
      setTestingId(null);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setDialogOpen(false);
    setShowSecret(false);
  };

  const openEdit = (p: LogisticsPartner) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      api_base_url: p.api_base_url || "",
      auth_type: p.auth_type,
      api_email: p.api_email || "",
      api_password: "",
      api_token: p.api_token || "",
      api_key: p.api_key || "",
      is_active: p.is_active,
      is_default: p.is_default,
      supported_services: p.supported_services || [],
    });
    setDialogOpen(true);
  };

  const applyPreset = (preset: (typeof PRESET_PARTNERS)[number]) => {
    setForm((prev) => ({
      ...prev,
      name: preset.name === "Custom Partner" ? "" : preset.name,
      slug: preset.slug,
      api_base_url: preset.api_base_url,
      auth_type: preset.auth_type,
      supported_services: preset.supported_services,
    }));
  };

  const toggleService = (svc: string) => {
    setForm((prev) => ({
      ...prev,
      supported_services: prev.supported_services.includes(svc)
        ? prev.supported_services.filter((s) => s !== svc)
        : [...prev.supported_services, svc],
    }));
  };

  const maskSecret = (val: string | null) => {
    if (!val) return "—";
    return val.length > 8 ? val.slice(0, 4) + "••••" + val.slice(-4) : "••••••••";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" /> Logistics Partners
          </h1>
          <p className="text-sm text-muted-foreground">
            Add and manage Shiprocket, Delhivery, and other courier API integrations
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(v) => (v ? setDialogOpen(true) : resetForm())}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Add"} Logistics Partner</DialogTitle>
            </DialogHeader>

            {/* Presets */}
            {!editId && (
              <div>
                <Label className="text-xs text-muted-foreground">Quick Add</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {PRESET_PARTNERS.map((p) => (
                    <Badge
                      key={p.slug || "custom"}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => applyPreset(p)}
                    >
                      {p.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Partner Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Shiprocket"
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="auto-generated"
                  />
                </div>
              </div>

              <div>
                <Label>API Base URL</Label>
                <Input
                  value={form.api_base_url}
                  onChange={(e) => setForm((p) => ({ ...p, api_base_url: e.target.value }))}
                  placeholder="https://apiv2.shiprocket.in"
                />
              </div>

              <div>
                <Label>Auth Type</Label>
                <Select
                  value={form.auth_type}
                  onValueChange={(v) => setForm((p) => ({ ...p, auth_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_password">Email + Password (Shiprocket)</SelectItem>
                    <SelectItem value="token">API Token</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="api_key_secret">API Key + Secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional credential fields */}
              {form.auth_type === "email_password" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>API Email</Label>
                    <Input
                      value={form.api_email}
                      onChange={(e) => setForm((p) => ({ ...p, api_email: e.target.value }))}
                      placeholder="api@example.com"
                    />
                  </div>
                  <div>
                    <Label>API Password</Label>
                    <div className="relative">
                      <Input
                        type={showSecret ? "text" : "password"}
                        value={form.api_password}
                        onChange={(e) => setForm((p) => ({ ...p, api_password: e.target.value }))}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-2.5 text-muted-foreground"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(form.auth_type === "token" || form.auth_type === "api_key_secret") && (
                <div>
                  <Label>API Token</Label>
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={form.api_token}
                    onChange={(e) => setForm((p) => ({ ...p, api_token: e.target.value }))}
                    placeholder="Bearer token"
                  />
                </div>
              )}

              {(form.auth_type === "api_key" || form.auth_type === "api_key_secret") && (
                <div>
                  <Label>API Key</Label>
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={form.api_key}
                    onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
                    placeholder="Your API key"
                  />
                </div>
              )}

              {/* Services */}
              <div>
                <Label className="text-xs">Supported Services</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["shipping", "tracking", "returns", "cod", "warehousing", "ndr"].map(
                    (svc) => (
                      <Badge
                        key={svc}
                        variant={form.supported_services.includes(svc) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleService(svc)}
                      >
                        {svc}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                  />
                  <Label className="text-sm">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_default}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, is_default: v }))}
                  />
                  <Label className="text-sm">Default Partner</Label>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!form.name || saveMutation.isPending}
                onClick={() => saveMutation.mutate({ ...form, id: editId || undefined })}
              >
                {saveMutation.isPending ? "Saving..." : editId ? "Update Partner" : "Add Partner"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Partners Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : partners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No logistics partners configured</p>
            <p className="text-sm mt-1">Add Shiprocket or other courier partners to manage shipping</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        {p.is_default && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{p.api_base_url}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {p.auth_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(p.supported_services || []).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px] capitalize">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.is_active ? (
                        <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {p.api_token ? maskSecret(p.api_token) : "—"}
                      {p.token_expires_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Exp:{" "}
                          {new Date(p.token_expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => testConnection(p)}
                          disabled={testingId === p.id}
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${testingId === p.id ? "animate-spin" : ""}`}
                          />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Remove ${p.name}?`)) deleteMutation.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Shiprocket Quick Guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📦 Shiprocket Setup Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Go to Shiprocket Dashboard → Settings → API</li>
            <li>Create API user with a separate email (not your login email)</li>
            <li>Click "Add Partner" above → select Shiprocket preset</li>
            <li>Enter the API email and password</li>
            <li>Click the refresh button to test connection & generate token</li>
            <li>Token auto-refreshes every 10 days</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
