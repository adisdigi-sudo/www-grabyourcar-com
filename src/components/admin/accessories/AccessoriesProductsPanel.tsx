import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Search, Edit, Trash2, Package, Image, Star } from "lucide-react";

const CATEGORIES = [
  "HSRP Frames", "Car Covers", "Seat Covers", "Floor Mats",
  "Phone Holders", "Dash Cameras", "Air Fresheners", "Cleaning Kits",
  "LED Lights", "Steering Covers", "Sun Shades", "Boot Organizers",
  "Perfumes", "Key Chains", "Number Plates", "Other",
];

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  features: string[];
  badge?: string;
}

// Static product catalog (can later connect to DB)
const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: "Premium Car Cover - UV Protection", description: "Heavy-duty waterproof car cover with UV protection", category: "Car Covers", price: 1499, originalPrice: 2499, image: "/placeholder.svg", inStock: true, rating: 4.5, reviews: 128, features: ["Waterproof", "UV Protection", "Dust Resistant"], badge: "Bestseller" },
  { id: 2, name: "3D Floor Mats - Universal Fit", description: "Premium 3D floor mats with anti-slip base", category: "Floor Mats", price: 899, originalPrice: 1299, image: "/placeholder.svg", inStock: true, rating: 4.3, reviews: 95, features: ["Anti-slip", "Waterproof", "Easy Clean"] },
  { id: 3, name: "Dash Cam Pro 1080p", description: "Full HD dash camera with night vision", category: "Dash Cameras", price: 3499, originalPrice: 4999, image: "/placeholder.svg", inStock: true, rating: 4.7, reviews: 210, features: ["1080p", "Night Vision", "Loop Recording"], badge: "New" },
  { id: 4, name: "Magnetic Phone Mount", description: "360° rotatable magnetic phone holder", category: "Phone Holders", price: 499, image: "/placeholder.svg", inStock: true, rating: 4.2, reviews: 340, features: ["Magnetic", "360° Rotation"] },
];

export function AccessoriesProductsPanel() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category: "Other", price: 0, originalPrice: 0,
    image: "", inStock: true, features: "", badge: "",
  });

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleSave = () => {
    const newProduct: Product = {
      id: editProduct?.id || Date.now(),
      name: form.name,
      description: form.description,
      category: form.category,
      price: form.price,
      originalPrice: form.originalPrice || undefined,
      image: form.image || "/placeholder.svg",
      inStock: form.inStock,
      rating: editProduct?.rating || 0,
      reviews: editProduct?.reviews || 0,
      features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
      badge: form.badge || undefined,
    };

    if (editProduct) {
      setProducts((prev) => prev.map((p) => (p.id === editProduct.id ? newProduct : p)));
      toast.success("Product updated");
    } else {
      setProducts((prev) => [...prev, newProduct]);
      toast.success("Product added");
    }
    setShowAddDialog(false);
    setEditProduct(null);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, description: p.description, category: p.category,
      price: p.price, originalPrice: p.originalPrice || 0, image: p.image,
      inStock: p.inStock, features: p.features.join(", "), badge: p.badge || "",
    });
    setEditProduct(p);
    setShowAddDialog(true);
  };

  const openAdd = () => {
    setForm({ name: "", description: "", category: "Other", price: 0, originalPrice: 0, image: "", inStock: true, features: "", badge: "" });
    setEditProduct(null);
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow group">
            <div className="relative aspect-square bg-muted flex items-center justify-center">
              {p.image && p.image !== "/placeholder.svg" ? (
                <img src={p.image} alt={p.name} className="object-cover w-full h-full" />
              ) : (
                <Image className="h-12 w-12 text-muted-foreground/30" />
              )}
              {p.badge && (
                <Badge className="absolute top-2 left-2 text-[10px]">{p.badge}</Badge>
              )}
              {!p.inStock && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Badge variant="destructive">Out of Stock</Badge>
                </div>
              )}
            </div>
            <CardContent className="p-3 space-y-1">
              <p className="text-sm font-medium line-clamp-1">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.category}</p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">₹{p.price.toLocaleString("en-IN")}</span>
                {p.originalPrice && (
                  <span className="text-xs line-through text-muted-foreground">₹{p.originalPrice.toLocaleString("en-IN")}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {p.rating} ({p.reviews})
              </div>
              <div className="flex gap-1 pt-1">
                <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openEdit(p)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive"
                  onClick={() => { setProducts((prev) => prev.filter((x) => x.id !== p.id)); toast.success("Product removed"); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Badge (optional)</Label>
                <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Bestseller" />
              </div>
            </div>
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
            <div>
              <Label>Image URL</Label>
              <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </div>
            <div>
              <Label>Features (comma-separated)</Label>
              <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Waterproof, UV, Dust" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.inStock} onCheckedChange={(v) => setForm({ ...form, inStock: v })} />
              <Label>In Stock</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.price}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
