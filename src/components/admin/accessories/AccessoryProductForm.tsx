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
import { Sparkles, Loader2, Plus, X, Wand2, ImagePlus } from "lucide-react";
import { invokeAccessoryAI } from "@/lib/accessoryAi";

export interface ProductFormData {
  name: string;
  description: string;
  fullDescription: string;
  category: string;
  price: number;
  originalPrice: number;
  image: string;
  images: string[];
  imagePrompt: string;
  inStock: boolean;
  features: string;
  badge: string;
  slug: string;
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
  const [ideaText, setIdeaText] = useState("");

  const callAI = async (action: string) => {
    setAiLoading(action);
    try {
      const data = await invokeAccessoryAI({
        action,
        category: form.category,
        name: form.name,
        description: form.description,
        features: form.features,
        imagePrompt: form.imagePrompt,
        imageCount: 4,
        userIdea: ideaText,
      });

      if (action === "generate_name" && data.name) {
        setForm({ ...form, name: data.name, slug: data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') });
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
      } else if (action === "generate_image_prompt" && data.prompt) {
        setForm({ ...form, imagePrompt: data.prompt });
        toast.success("AI prompt generated!");
      } else if (action === "generate_image" && data.image) {
        setForm({ ...form, image: data.image, images: data.images || [data.image], imagePrompt: data.prompt || form.imagePrompt });
        toast.success("AI product images generated!");
      } else if (action === "auto_fill_all" && data.product) {
        const p = data.product;
        setForm({
          ...form,
          name: p.name || form.name,
          description: p.description || form.description,
          fullDescription: p.fullDescription || form.fullDescription || p.description || form.description,
          features: p.features || form.features,
          badge: p.badge || form.badge,
          slug: p.slug || form.slug,
          imagePrompt: p.imagePrompt || form.imagePrompt,
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

  const slugValue = form.slug || (form.name ? form.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') : '');

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
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') })} placeholder="e.g. Premium Car Cover" />
          </div>

          {/* Description with AI */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Description</Label>
              <AIButton action="generate_description" label="AI Generate" />
            </div>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Professional product description..." />
          </div>

          <div>
            <Label className="mb-1 block">Full Description</Label>
            <Textarea value={form.fullDescription} onChange={(e) => setForm({ ...form, fullDescription: e.target.value })} rows={4} placeholder="Detailed product page copy..." />
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
                value={slugValue}
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
              <Label>Product Images</Label>
              <AIButton action="generate_image" label="Generate 4 AI Images" />
            </div>
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input value={ideaText} onChange={(e) => setIdeaText(e.target.value)} placeholder="Type rough idea like: black premium cover for SUV, realistic product image" />
                <Button type="button" variant="outline" onClick={() => callAI("generate_image_prompt")} disabled={!!aiLoading} className="gap-2">
                  {aiLoading === "generate_image_prompt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  AI Prompt
                </Button>
              </div>
              <Textarea value={form.imagePrompt} onChange={(e) => setForm({ ...form, imagePrompt: e.target.value })} rows={3} placeholder="AI image prompt for exact product look, angle and background" />
              <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value, images: [e.target.value, ...form.images.filter((img) => img !== e.target.value)] })} placeholder="Primary image URL or generate with AI" />
            </div>
            {form.images.length > 0 && form.images.some((img) => img && img !== "/placeholder.svg") && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {form.images.filter((img) => img && img !== "/placeholder.svg").map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    type="button"
                    onClick={() => setForm({ ...form, image: img })}
                    className={`rounded-lg border overflow-hidden bg-muted aspect-square ${form.image === img ? 'ring-2 ring-primary' : ''}`}
                    title="Set as primary image"
                  >
                    <img src={img} alt={`Product preview ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
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
