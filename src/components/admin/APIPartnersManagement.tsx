import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Copy, Eye, EyeOff, Globe, Key, Webhook, Shield, RefreshCw, ExternalLink } from "lucide-react";
import { APIPartner } from "@/hooks/useRentalServices";

const serviceOptions = [
  { value: 'self_drive', label: 'Self Drive Rentals' },
  { value: 'with_driver', label: 'With Driver' },
  { value: 'outstation', label: 'Outstation Trips' },
];

export const APIPartnersManagement = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<APIPartner | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ apiKey: string; apiSecret: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    webhook_url: '',
    callback_url: '',
    allowed_services: ['self_drive', 'with_driver', 'outstation'] as string[],
    commission_percentage: 0,
    branding_enabled: true,
    rate_limit_per_minute: 60,
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
    ip_whitelist: '',
  });

  const { data: partners, isLoading, refetch } = useQuery({
    queryKey: ['admin-api-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_partners')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as APIPartner[];
    }
  });

  const { data: apiLogs } = useQuery({
    queryKey: ['admin-api-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (partnerData: Partial<APIPartner>) => {
      // Generate API keys
      const apiKey = `gyc_${crypto.randomUUID().replace(/-/g, '')}`;
      const apiSecret = `gycs_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
      
      const { data, error } = await supabase
        .from('api_partners')
        .insert([{
          ...partnerData,
          api_key_hash: apiKey, // In production, hash these
          api_secret_hash: apiSecret,
        } as any])
        .select()
        .single();
      
      if (error) throw error;
      return { partner: data, apiKey, apiSecret };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-partners'] });
      setGeneratedKey({ apiKey: result.apiKey, apiSecret: result.apiSecret });
      toast.success('API Partner created! Save the credentials now.');
    },
    onError: () => {
      toast.error('Failed to create partner');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<APIPartner> }) => {
      const { error } = await supabase
        .from('api_partners')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-partners'] });
      toast.success('Partner updated');
      setIsModalOpen(false);
      setEditingPartner(null);
    },
    onError: () => {
      toast.error('Failed to update partner');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_partners')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-partners'] });
      toast.success('Partner deleted');
    },
    onError: () => {
      toast.error('Failed to delete partner');
    }
  });

  const handleOpenModal = (partner?: APIPartner) => {
    if (partner) {
      setEditingPartner(partner);
      setForm({
        name: partner.name,
        slug: partner.slug,
        description: partner.description || '',
        webhook_url: partner.webhook_url || '',
        callback_url: partner.callback_url || '',
        allowed_services: partner.allowed_services || [],
        commission_percentage: partner.commission_percentage || 0,
        branding_enabled: partner.branding_enabled,
        rate_limit_per_minute: partner.rate_limit_per_minute || 60,
        contact_name: partner.contact_name || '',
        contact_email: partner.contact_email || '',
        contact_phone: partner.contact_phone || '',
        notes: partner.notes || '',
        ip_whitelist: partner.ip_whitelist?.join(', ') || '',
      });
    } else {
      setEditingPartner(null);
      setForm({
        name: '',
        slug: '',
        description: '',
        webhook_url: '',
        callback_url: '',
        allowed_services: ['self_drive', 'with_driver', 'outstation'],
        commission_percentage: 0,
        branding_enabled: true,
        rate_limit_per_minute: 60,
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        notes: '',
        ip_whitelist: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.slug) {
      toast.error('Name and slug are required');
      return;
    }

    const partnerData = {
      name: form.name,
      slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
      description: form.description || null,
      webhook_url: form.webhook_url || null,
      callback_url: form.callback_url || null,
      allowed_services: form.allowed_services,
      commission_percentage: form.commission_percentage,
      branding_enabled: form.branding_enabled,
      rate_limit_per_minute: form.rate_limit_per_minute,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      notes: form.notes || null,
      ip_whitelist: form.ip_whitelist ? form.ip_whitelist.split(',').map(s => s.trim()) : null,
    };

    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, updates: partnerData });
    } else {
      createMutation.mutate(partnerData);
    }
  };

  const toggleService = (service: string) => {
    setForm(prev => ({
      ...prev,
      allowed_services: prev.allowed_services.includes(service)
        ? prev.allowed_services.filter(s => s !== service)
        : [...prev.allowed_services, service]
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Partners</h2>
          <p className="text-muted-foreground">Manage third-party integrations and API access</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{partners?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total Partners</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {partners?.filter(p => p.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{apiLogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">API Calls (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {apiLogs?.filter(l => l.response_code >= 400).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Errors (24h)</p>
          </CardContent>
        </Card>
      </div>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Partners</CardTitle>
          <CardDescription>
            Partners can create bookings via API with your branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : partners?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No API partners configured
                  </TableCell>
                </TableRow>
              ) : partners?.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{partner.name}</div>
                      <div className="text-xs text-muted-foreground">{partner.slug}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {partner.allowed_services?.map(s => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{partner.commission_percentage}%</TableCell>
                  <TableCell>{partner.rate_limit_per_minute}/min</TableCell>
                  <TableCell>
                    <Badge variant={partner.is_active ? "default" : "secondary"}>
                      {partner.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(partner.created_at), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenModal(partner)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Delete this partner?')) {
                            deleteMutation.mutate(partner.id);
                          }
                        }}
                      >
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

      {/* API Documentation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="bg-muted p-3 rounded-lg font-mono text-xs">
            <div className="text-muted-foreground mb-1">Create Booking</div>
            <code>POST /functions/v1/partner-booking</code>
          </div>
          <div className="bg-muted p-3 rounded-lg font-mono text-xs">
            <div className="text-muted-foreground mb-1">Get Vehicles</div>
            <code>GET /functions/v1/partner-vehicles</code>
          </div>
          <div className="bg-muted p-3 rounded-lg font-mono text-xs">
            <div className="text-muted-foreground mb-1">Check Availability</div>
            <code>POST /functions/v1/partner-availability</code>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setGeneratedKey(null);
          setEditingPartner(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Edit Partner' : 'Add API Partner'}</DialogTitle>
            <DialogDescription>
              Configure API access for third-party integrations
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ Save these credentials now! They won't be shown again.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input value={generatedKey.apiKey} readOnly />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey.apiKey, 'API Key')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>API Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={generatedKey.apiSecret}
                      readOnly
                    />
                    <Button size="sm" variant="outline" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey.apiSecret, 'API Secret')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  setIsModalOpen(false);
                  setGeneratedKey(null);
                }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Partner Name *</Label>
                  <Input
                    placeholder="Acme Corp"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Slug *</Label>
                  <Input
                    placeholder="acme-corp"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  placeholder="Partner description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Allowed Services</Label>
                <div className="flex flex-wrap gap-4">
                  {serviceOptions.map((service) => (
                    <label key={service.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.allowed_services.includes(service.value)}
                        onCheckedChange={() => toggleService(service.value)}
                      />
                      <span className="text-sm">{service.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Commission %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.commission_percentage}
                    onChange={(e) => setForm({ ...form, commission_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Rate Limit (per min)</Label>
                  <Input
                    type="number"
                    value={form.rate_limit_per_minute}
                    onChange={(e) => setForm({ ...form, rate_limit_per_minute: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <Webhook className="h-3 w-3" /> Webhook URL
                </Label>
                <Input
                  placeholder="https://partner.com/webhook"
                  value={form.webhook_url}
                  onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> IP Whitelist (comma-separated)
                </Label>
                <Input
                  placeholder="192.168.1.1, 10.0.0.1"
                  value={form.ip_whitelist}
                  onChange={(e) => setForm({ ...form, ip_whitelist: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Contact Name</Label>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contact Phone</Label>
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.branding_enabled}
                  onCheckedChange={(checked) => setForm({ ...form, branding_enabled: checked })}
                />
                <Label>Enable partner branding on booking confirmations</Label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPartner ? 'Save Changes' : 'Create Partner'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default APIPartnersManagement;
