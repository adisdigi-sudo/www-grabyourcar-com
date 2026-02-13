import { useState } from "react";
import { AdminImageUpload } from "./AdminImageUpload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Image as ImageIcon } from "lucide-react";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  brand: string | null;
  price_range: string | null;
  launch_date: string | null;
  image_url: string;
  cta_label: string | null;
  cta_link: string | null;
  cta_secondary_label: string | null;
  cta_secondary_link: string | null;
  spec_1_label: string | null;
  spec_1_value: string | null;
  spec_2_label: string | null;
  spec_2_value: string | null;
  spec_3_label: string | null;
  spec_3_value: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const emptySlide = {
  title: "", subtitle: "", description: "", brand: "", price_range: "", launch_date: "",
  image_url: "", cta_label: "Get Launch Alert", cta_link: "/upcoming-cars",
  cta_secondary_label: "Explore More", cta_secondary_link: "/cars",
  spec_1_label: "", spec_1_value: "", spec_2_label: "", spec_2_value: "",
  spec_3_label: "", spec_3_value: "", sort_order: 0, is_active: true,
};

export const HeroSlidesManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [formData, setFormData] = useState(emptySlide);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as HeroSlide[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("hero_slides").update(data).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hero_slides").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success(editingSlide ? "Slide updated" : "Slide created");
      setIsDialogOpen(false);
      setEditingSlide(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success("Slide deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("hero_slides").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
    },
  });

  const openCreate = () => {
    setEditingSlide(null);
    setFormData({ ...emptySlide, sort_order: slides.length + 1 });
    setIsDialogOpen(true);
  };

  const openEdit = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title, subtitle: slide.subtitle || "", description: slide.description || "",
      brand: slide.brand || "", price_range: slide.price_range || "", launch_date: slide.launch_date || "",
      image_url: slide.image_url, cta_label: slide.cta_label || "", cta_link: slide.cta_link || "",
      cta_secondary_label: slide.cta_secondary_label || "", cta_secondary_link: slide.cta_secondary_link || "",
      spec_1_label: slide.spec_1_label || "", spec_1_value: slide.spec_1_value || "",
      spec_2_label: slide.spec_2_label || "", spec_2_value: slide.spec_2_value || "",
      spec_3_label: slide.spec_3_label || "", spec_3_value: slide.spec_3_value || "",
      sort_order: slide.sort_order, is_active: slide.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.image_url) {
      toast.error("Title and Image URL are required");
      return;
    }
    saveMutation.mutate(editingSlide ? { ...formData, id: editingSlide.id } : formData);
  };

  const f = (key: keyof typeof formData, value: any) => setFormData((p) => ({ ...p, [key]: value }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> Hero Slides Manager
          </CardTitle>
          <CardDescription>Manage the full-screen hero carousel on the homepage</CardDescription>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Slide</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading slides...</p>
        ) : slides.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hero slides yet. Add your first slide above.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Launch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slides.map((slide) => (
                <TableRow key={slide.id}>
                  <TableCell className="text-muted-foreground">{slide.sort_order}</TableCell>
                  <TableCell>
                    <div className="w-24 h-14 rounded-lg overflow-hidden bg-muted">
                      <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{slide.title}</TableCell>
                  <TableCell>{slide.brand || "—"}</TableCell>
                  <TableCell className="text-sm">{slide.price_range || "—"}</TableCell>
                  <TableCell className="text-sm">{slide.launch_date || "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={slide.is_active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: slide.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(slide)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Delete this slide?")) deleteMutation.mutate(slide.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlide ? "Edit Hero Slide" : "Add Hero Slide"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Car / Title *</Label>
              <Input value={formData.title} onChange={(e) => f("title", e.target.value)} placeholder="e.g. Tata Sierra EV" />
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={formData.brand} onChange={(e) => f("brand", e.target.value)} placeholder="e.g. Tata Motors" />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={formData.subtitle} onChange={(e) => f("subtitle", e.target.value)} placeholder="e.g. The Future of Adventure" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => f("description", e.target.value)} rows={2} placeholder="Short description..." />
            </div>
            <div className="col-span-2">
              <AdminImageUpload
                value={formData.image_url}
                onChange={(url) => f("image_url", url)}
                label="Hero Image *"
                folder="hero-slides"
                recommendedSize="1920×900"
                placeholder="https://... or upload an image"
              />
            </div>
            <div>
              <Label>Expected Price Range</Label>
              <Input value={formData.price_range} onChange={(e) => f("price_range", e.target.value)} placeholder="₹25 – 35 Lakh" />
            </div>
            <div>
              <Label>Launch Date</Label>
              <Input value={formData.launch_date} onChange={(e) => f("launch_date", e.target.value)} placeholder="Q3 2026" />
            </div>

            {/* Specs */}
            <div className="col-span-2 border-t pt-4">
              <Label className="text-sm font-semibold mb-2 block">Key Specs (up to 3)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input value={formData.spec_1_label} onChange={(e) => f("spec_1_label", e.target.value)} placeholder="Spec 1 Label (e.g. Battery)" />
                <Input value={formData.spec_1_value} onChange={(e) => f("spec_1_value", e.target.value)} placeholder="Spec 1 Value (e.g. 69 kWh)" />
                <Input value={formData.spec_2_label} onChange={(e) => f("spec_2_label", e.target.value)} placeholder="Spec 2 Label (e.g. Range)" />
                <Input value={formData.spec_2_value} onChange={(e) => f("spec_2_value", e.target.value)} placeholder="Spec 2 Value (e.g. 500+ km)" />
                <Input value={formData.spec_3_label} onChange={(e) => f("spec_3_label", e.target.value)} placeholder="Spec 3 Label (e.g. 0-100)" />
                <Input value={formData.spec_3_value} onChange={(e) => f("spec_3_value", e.target.value)} placeholder="Spec 3 Value (e.g. 6.7 sec)" />
              </div>
            </div>

            {/* CTAs */}
            <div className="col-span-2 border-t pt-4">
              <Label className="text-sm font-semibold mb-2 block">Call-to-Action Buttons</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input value={formData.cta_label} onChange={(e) => f("cta_label", e.target.value)} placeholder="Primary CTA (e.g. Get Launch Alert)" />
                <Input value={formData.cta_link} onChange={(e) => f("cta_link", e.target.value)} placeholder="Primary Link (e.g. /upcoming-cars)" />
                <Input value={formData.cta_secondary_label} onChange={(e) => f("cta_secondary_label", e.target.value)} placeholder="Secondary CTA (e.g. Explore More)" />
                <Input value={formData.cta_secondary_link} onChange={(e) => f("cta_secondary_link", e.target.value)} placeholder="Secondary Link (e.g. /cars)" />
              </div>
            </div>

            {/* Sort & Active */}
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={formData.sort_order} onChange={(e) => f("sort_order", parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={formData.is_active} onCheckedChange={(v) => f("is_active", v)} />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Slide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
