import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Loader2, Plus, X, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number;
  image: string;
  inStock: boolean;
  features: string;
  badge: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: ProductFormData;
  setForm: (f: ProductFormData) => void;
  onSave: () => void;
  isEdit: boolean;
  categories: string[];
  onAddCategory: (cat: string) => void;
  onDeleteCategory: (cat: string) => void;
}

export function AccessoryProductForm({
  open, onOpenChange, form, setForm, onSave, isEdit, categories, onAddCategory, onDeleteCategory,
}: Props) {
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [showCatManager, setShowCatManager] = useState(false);

  const callAI = async (action: string) => {
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("accessory-ai-helper", {
        body: {
          action,
          category: form.category,
          name: form.name,
          description: form.description,
          features: form.features,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (action === "generate_name" && data.name) {
        setForm({ ...form, name: data.name });
        toast.success("AI name generated!");
      } else if (action === "generate_description" && data.description) {
        setForm({ ...form, description: data.description });
        toast.success("AI description generated!");
      } else if (action === "generate_features" && data.features) {
        setForm({ ...form, features: data.features });
        toast.success("AI features generated!");
      } else if (action === "generate_badge" && data.badge) {
        setForm({ ...form, badge: data.badge });
        toast.success("AI badge generated!");
      } else if (action === "generate_image" && data.image) {
        setForm({ ...form, image: data.image });
        toast.success("AI image generated!");
      } else if (action === "auto_fill_all" && data.product) {
        const p = data.product;
        setForm({
          ...form,
          name: p.name || form.name,
          description: p.description || form.description,
          features: p.features || form.features,
          badge: p.badge || form.badge,
          price: p.price || form.price,
          originalPrice: p.originalPrice || form.originalPrice,
        });
        toast.success("All fields auto-filled by AI!");
      }
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    } finally {
      setAiLoading(null);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      toast.error("Category already exists");
      return;
    }
    onAddCategory(trimmed);
    setNewCat("");
    toast.success(`Category "${trimmed}" added`);
  };

  const AIButton = ({ action, label }: { action: string; label: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
      onClick={() => callAI(action)}
      disabled={!!aiLoading}
    >
      {aiLoading === action ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Edit Product" : "Add Product"}
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Sparkles className="h-3 w-3" /> AI-Powered
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Auto-Fill All Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
          onClick={() => callAI("auto_fill_all")}
          disabled={!!aiLoading}
        >
          {aiLoading === "auto_fill_all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Auto-Fill Everything with AI
        </Button>

        <div className="grid gap-3">
          {/* Category (select first so AI uses it) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Category</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] gap-1"
                onClick={() => setShowCatManager(!showCatManager)}
              >
                <Plus className="h-3 w-3" /> Manage
              </Button>
            </div>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showCatManager && (
              <div className="mt-2 p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    placeholder="New category name..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                  />
                  <Button size="sm" className="h-8 px-3" onClick={handleAddCategory} disabled={!newCat.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {categories.map((c) => (
                    <Badge key={c} variant="outline" className="gap-1 text-[11px] pr-1">
                      {c}
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(c)}
                        className="ml-0.5 hover:text-destructive rounded-full p-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Name with AI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Product Name</Label>
              <AIButton action="generate_name" label="AI Generate" />
            </div>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Car Cover" />
          </div>

          {/* Description with AI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Description</Label>
              <AIButton action="generate_description" label="AI Generate" />
            </div>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Professional product description..." />
          </div>

          {/* Features with AI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Features (comma-separated)</Label>
              <AIButton action="generate_features" label="AI Generate" />
            </div>
            <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Waterproof, UV Protection, Dust Resistant" />
            {form.features && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {form.features.split(",").map((f) => f.trim()).filter(Boolean).map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Badge with AI */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Badge</Label>
                <AIButton action="generate_badge" label="AI" />
              </div>
              <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Bestseller" />
            </div>
            <div>
              <Label className="mb-1 block">Slug (auto)</Label>
              <Input
                value={form.name ? form.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') : ''}
                readOnly
                className="bg-muted/50 text-muted-foreground"
                placeholder="auto-generated-from-name"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
            </div>
            <div>
              <Label>Original Price (₹)</Label>
              <Input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: +e.target.value })} />
            </div>
          </div>

          {/* Image with AI generation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Product Image</Label>
              <AIButton action="generate_image" label="AI Generate" />
            </div>
            <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image URL or generate with AI" />
            {form.image && form.image !== "/placeholder.svg" && (
              <div className="mt-2 rounded-lg border overflow-hidden h-32 bg-muted flex items-center justify-center">
                <img src={form.image} alt="Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.inStock} onCheckedChange={(v) => setForm({ ...form, inStock: v })} />
            <Label>In Stock</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={!form.name || !form.price}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
