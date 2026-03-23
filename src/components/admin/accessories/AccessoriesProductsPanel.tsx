import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Image, Star } from "lucide-react";
import { AccessoryProductForm, ProductFormData } from "./AccessoryProductForm";
import { useAccessoriesCatalog } from "@/hooks/useAccessoriesCatalog";
import { createAccessorySlug } from "@/lib/accessoriesCatalog";

const DEFAULT_CATEGORIES = [
  "HSRP Frames", "Car Covers", "Seat Covers", "Floor Mats",
  "Phone Holders", "Dash Cameras", "Air Fresheners", "Cleaning Kits",
  "LED Lights", "Steering Covers", "Sun Shades", "Boot Organizers",
  "Perfumes", "Key Chains", "Number Plates", "Other",
];

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  fullDescription: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  imagePrompt?: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  features: string[];
  badge?: string;
}

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: "Premium Car Cover - UV Protection", slug: createAccessorySlug("Premium Car Cover - UV Protection"), description: "Heavy-duty waterproof car cover with UV protection", fullDescription: "Heavy-duty waterproof car cover with UV protection", category: "Car Covers", price: 1499, originalPrice: 2499, image: "/placeholder.svg", images: ["/placeholder.svg"], inStock: true, rating: 4.5, reviews: 128, features: ["Waterproof", "UV Protection", "Dust Resistant"], badge: "Bestseller" },
  { id: 2, name: "3D Floor Mats - Universal Fit", slug: createAccessorySlug("3D Floor Mats - Universal Fit"), description: "Premium 3D floor mats with anti-slip base", fullDescription: "Premium 3D floor mats with anti-slip base", category: "Floor Mats", price: 899, originalPrice: 1299, image: "/placeholder.svg", images: ["/placeholder.svg"], inStock: true, rating: 4.3, reviews: 95, features: ["Anti-slip", "Waterproof", "Easy Clean"] },
  { id: 3, name: "Dash Cam Pro 1080p", slug: createAccessorySlug("Dash Cam Pro 1080p"), description: "Full HD dash camera with night vision", fullDescription: "Full HD dash camera with night vision", category: "Dash Cameras", price: 3499, originalPrice: 4999, image: "/placeholder.svg", images: ["/placeholder.svg"], inStock: true, rating: 4.7, reviews: 210, features: ["1080p", "Night Vision", "Loop Recording"], badge: "New" },
  { id: 4, name: "Magnetic Phone Mount", slug: createAccessorySlug("Magnetic Phone Mount"), description: "360° rotatable magnetic phone holder", fullDescription: "360° rotatable magnetic phone holder", category: "Phone Holders", price: 499, image: "/placeholder.svg", images: ["/placeholder.svg"], inStock: true, rating: 4.2, reviews: 340, features: ["Magnetic", "360° Rotation"] },
];

export function AccessoriesProductsPanel() {
  const { catalog, saveCatalog, isSaving } = useAccessoriesCatalog();
  const [products, setProducts] = useState<Product[]>(catalog.products.length ? (catalog.products as Product[]) : INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(catalog.categories.length ? catalog.categories : DEFAULT_CATEGORIES);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    name: "", slug: "", description: "", fullDescription: "", category: "Other", price: 0, originalPrice: 0,
    image: "", images: [], imagePrompt: "", inStock: true, features: "", badge: "",
  });

  useEffect(() => {
    if (catalog.products.length) {
      setProducts(catalog.products as Product[]);
    }
    if (catalog.categories.length) {
      setCategories(catalog.categories);
    }
  }, [catalog]);

  const persistCatalog = async (nextProducts: Product[], nextCategories: string[]) => {
    setProducts(nextProducts);
    setCategories(nextCategories);
    await saveCatalog({ products: nextProducts, categories: nextCategories });
  };

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleSave = async () => {
    const newProduct: Product = {
      id: editProduct?.id || Date.now(),
      name: form.name,
      slug: form.slug || createAccessorySlug(form.name),
      description: form.description,
      fullDescription: form.fullDescription || form.description,
      category: form.category,
      price: form.price,
      originalPrice: form.originalPrice || undefined,
      image: form.image || "/placeholder.svg",
      images: form.images.length ? form.images : [form.image || "/placeholder.svg"],
      imagePrompt: form.imagePrompt || undefined,
      inStock: form.inStock,
      rating: editProduct?.rating || 0,
      reviews: editProduct?.reviews || 0,
      features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
      badge: form.badge || undefined,
    };

    try {
      if (editProduct) {
        const nextProducts = products.map((p) => (p.id === editProduct.id ? newProduct : p));
        await persistCatalog(nextProducts, categories);
        toast.success("Product updated");
      } else {
        const nextProducts = [...products, newProduct];
        await persistCatalog(nextProducts, categories);
        toast.success("Product added");
      }
      setShowDialog(false);
      setEditProduct(null);
    } catch {
      toast.error("Failed to save product to website catalog");
      return;
    }
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, slug: p.slug, description: p.description, fullDescription: p.fullDescription, category: p.category,
      price: p.price, originalPrice: p.originalPrice || 0, image: p.image, images: p.images || [p.image], imagePrompt: p.imagePrompt || "",
      inStock: p.inStock, features: p.features.join(", "), badge: p.badge || "",
    });
    setEditProduct(p);
    setShowDialog(true);
  };

  const openAdd = () => {
    setForm({ name: "", slug: "", description: "", fullDescription: "", category: "Other", price: 0, originalPrice: 0, image: "", images: [], imagePrompt: "", inStock: true, features: "", badge: "" });
    setEditProduct(null);
    setShowDialog(true);
  };

  const handleAddCategory = async (cat: string) => {
    const nextCategories = [...categories, cat];
    try {
      await persistCatalog(products, nextCategories);
    } catch {
      toast.error("Failed to save category");
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    const nextCategories = categories.filter((c) => c !== cat);
    const nextProducts = products.map((product) => product.category === cat ? { ...product, category: "Other" } : product);
    if (form.category === cat) setForm({ ...form, category: "Other" });
    try {
      await persistCatalog(nextProducts, nextCategories);
      toast.success(`Category "${cat}" removed`);
    } catch {
      toast.error("Failed to delete category");
    }
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
          <Button onClick={openAdd} size="sm" disabled={isSaving}>
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
            {categories.map((c) => (
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
                  onClick={async () => {
                    try {
                      const nextProducts = products.filter((x) => x.id !== p.id);
                      await persistCatalog(nextProducts, categories);
                      toast.success("Product removed");
                    } catch {
                      toast.error("Failed to remove product");
                    }
                  }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AccessoryProductForm
        open={showDialog}
        onOpenChange={setShowDialog}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        isEdit={!!editProduct}
        categories={categories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
}
