import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Car, Bike, Truck, Zap, Tractor, GripVertical, Eye } from "lucide-react";

interface HSRPBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  vehicle_class: string;
  icon_type: string;
  gradient_from: string;
  gradient_to: string;
  badge_text: string | null;
  badge_color: string;
  features: string[] | null;
  price_key: string;
  cta_text: string;
  sort_order: number;
  is_active: boolean;
  animation_type: string;
}

const iconOptions = [
  { value: "car", label: "Car", icon: Car },
  { value: "bike", label: "Bike", icon: Bike },
  { value: "truck", label: "Truck", icon: Truck },
  { value: "ev", label: "EV/Zap", icon: Zap },
  { value: "tractor", label: "Tractor", icon: Tractor },
];

const vehicleClasses = [
  { value: "2w", label: "Two Wheeler (2W)" },
  { value: "4w", label: "Four Wheeler (4W)" },
  { value: "ev", label: "Electric Vehicle" },
  { value: "commercial", label: "Commercial Vehicle" },
  { value: "tractor", label: "Tractor/Agricultural" },
];

const priceKeys = [
  { value: "two_wheeler", label: "Two Wheeler" },
  { value: "four_wheeler", label: "Four Wheeler" },
  { value: "ev", label: "Electric Vehicle" },
  { value: "commercial", label: "Commercial" },
  { value: "tractor", label: "Tractor" },
];

const animationTypes = [
  { value: "slide", label: "Slide" },
  { value: "fade", label: "Fade" },
  { value: "scale", label: "Scale" },
];

const defaultForm = {
  title: "",
  subtitle: "",
  description: "",
  vehicle_class: "4w",
  icon_type: "car",
  gradient_from: "#2563eb",
  gradient_to: "#3b82f6",
  badge_text: "",
  badge_color: "green",
  features: "",
  price_key: "four_wheeler",
  cta_text: "Book Now",
  is_active: true,
  animation_type: "slide",
};

export function HSRPBannersManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HSRPBanner | null>(null);
  const [form, setForm] = useState(defaultForm);

  // Fetch banners
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["hsrp-service-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hsrp_service_banners")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as HSRPBanner[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof defaultForm) => {
      const maxOrder = banners.reduce((max, b) => Math.max(max, b.sort_order), 0);
      const { error } = await supabase.from("hsrp_service_banners").insert({
        title: data.title,
        subtitle: data.subtitle || null,
        description: data.description || null,
        vehicle_class: data.vehicle_class,
        icon_type: data.icon_type,
        gradient_from: data.gradient_from,
        gradient_to: data.gradient_to,
        badge_text: data.badge_text || null,
        badge_color: data.badge_color,
        features: data.features ? data.features.split(",").map(f => f.trim()) : null,
        price_key: data.price_key,
        cta_text: data.cta_text,
        is_active: data.is_active,
        animation_type: data.animation_type,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hsrp-service-banners"] });
      toast.success("Banner created");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create banner"),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof defaultForm }) => {
      const { error } = await supabase.from("hsrp_service_banners").update({
        title: data.title,
        subtitle: data.subtitle || null,
        description: data.description || null,
        vehicle_class: data.vehicle_class,
        icon_type: data.icon_type,
        gradient_from: data.gradient_from,
        gradient_to: data.gradient_to,
        badge_text: data.badge_text || null,
        badge_color: data.badge_color,
        features: data.features ? data.features.split(",").map(f => f.trim()) : null,
        price_key: data.price_key,
        cta_text: data.cta_text,
        is_active: data.is_active,
        animation_type: data.animation_type,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hsrp-service-banners"] });
      toast.success("Banner updated");
      setDialogOpen(false);
      setEditingBanner(null);
      resetForm();
    },
    onError: () => toast.error("Failed to update banner"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hsrp_service_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hsrp-service-banners"] });
      toast.success("Banner deleted");
    },
    onError: () => toast.error("Failed to delete banner"),
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("hsrp_service_banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hsrp-service-banners"] });
    },
  });

  const resetForm = () => setForm(defaultForm);

  const openEdit = (banner: HSRPBanner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      description: banner.description || "",
      vehicle_class: banner.vehicle_class,
      icon_type: banner.icon_type,
      gradient_from: banner.gradient_from,
      gradient_to: banner.gradient_to,
      badge_text: banner.badge_text || "",
      badge_color: banner.badge_color,
      features: banner.features?.join(", ") || "",
      price_key: banner.price_key,
      cta_text: banner.cta_text,
      is_active: banner.is_active,
      animation_type: banner.animation_type,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getIcon = (iconType: string) => {
    const opt = iconOptions.find(o => o.value === iconType);
    if (!opt) return Car;
    return opt.icon;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>HSRP Service Banners</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingBanner(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBanner ? "Edit Banner" : "Create HSRP Banner"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Four Wheeler HSRP"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="Cars & SUVs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Vehicle Class</Label>
                  <Select value={form.vehicle_class} onValueChange={(v) => setForm({ ...form, vehicle_class: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {vehicleClasses.map((vc) => (
                        <SelectItem key={vc.value} value={vc.value}>{vc.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={form.icon_type} onValueChange={(v) => setForm({ ...form, icon_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>{icon.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price Key</Label>
                  <Select value={form.price_key} onValueChange={(v) => setForm({ ...form, price_key: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priceKeys.map((pk) => (
                        <SelectItem key={pk.value} value={pk.value}>{pk.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gradient From</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={form.gradient_from}
                      onChange={(e) => setForm({ ...form, gradient_from: e.target.value })}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={form.gradient_from}
                      onChange={(e) => setForm({ ...form, gradient_from: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gradient To</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={form.gradient_to}
                      onChange={(e) => setForm({ ...form, gradient_to: e.target.value })}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={form.gradient_to}
                      onChange={(e) => setForm({ ...form, gradient_to: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Badge Text (optional)</Label>
                  <Input
                    value={form.badge_text}
                    onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                    placeholder="Most Popular"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Badge Color</Label>
                  <Select value={form.badge_color} onValueChange={(v) => setForm({ ...form, badge_color: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Animation</Label>
                  <Select value={form.animation_type} onValueChange={(v) => setForm({ ...form, animation_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {animationTypes.map((at) => (
                        <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features (comma-separated)</Label>
                <Input
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder="Quick Delivery, Free Installation, RTO Compliant"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTA Button Text</Label>
                  <Input
                    value={form.cta_text}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                    placeholder="Book Now"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label>Active</Label>
                </div>
              </div>

              {/* Preview */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">Preview</Label>
                <div
                  className="rounded-xl p-6 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${form.gradient_from}, ${form.gradient_to})`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    {(() => {
                      const Icon = getIcon(form.icon_type);
                      return <Icon className="h-12 w-12" />;
                    })()}
                    <div>
                      <h3 className="text-xl font-bold">{form.title || "Banner Title"}</h3>
                      {form.subtitle && <p className="text-sm opacity-80">{form.subtitle}</p>}
                    </div>
                    {form.badge_text && (
                      <Badge className="ml-auto">{form.badge_text}</Badge>
                    )}
                  </div>
                  {form.features && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {form.features.split(",").map((f, i) => (
                        <span key={i} className="text-xs bg-white/20 px-2 py-1 rounded">{f.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full" disabled={!form.title}>
                {editingBanner ? "Update Banner" : "Create Banner"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No HSRP banners configured</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Order</TableHead>
                <TableHead>Banner</TableHead>
                <TableHead>Vehicle Class</TableHead>
                <TableHead>Price Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => {
                const Icon = getIcon(banner.icon_type);
                return (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="ml-1">{banner.sort_order}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                          style={{
                            background: `linear-gradient(135deg, ${banner.gradient_from}, ${banner.gradient_to})`,
                          }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{banner.title}</p>
                          {banner.subtitle && (
                            <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                          )}
                        </div>
                        {banner.badge_text && (
                          <Badge variant="secondary" className="ml-2">{banner.badge_text}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {vehicleClasses.find(vc => vc.value === banner.vehicle_class)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{banner.price_key}</TableCell>
                    <TableCell>
                      <Switch
                        checked={banner.is_active}
                        onCheckedChange={(v) => toggleActiveMutation.mutate({ id: banner.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => window.open('/hsrp', '_blank')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(banner)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this banner?")) {
                              deleteMutation.mutate(banner.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
