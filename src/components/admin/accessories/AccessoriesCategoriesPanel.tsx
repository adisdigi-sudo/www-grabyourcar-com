import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Grid3X3, GripVertical } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  isActive: boolean;
}

const INITIAL: Category[] = [
  { id: "1", name: "HSRP Frames", slug: "hsrp-frames", productCount: 8, isActive: true },
  { id: "2", name: "Car Covers", slug: "car-covers", productCount: 12, isActive: true },
  { id: "3", name: "Seat Covers", slug: "seat-covers", productCount: 15, isActive: true },
  { id: "4", name: "Floor Mats", slug: "floor-mats", productCount: 10, isActive: true },
  { id: "5", name: "Phone Holders", slug: "phone-holders", productCount: 6, isActive: true },
  { id: "6", name: "Dash Cameras", slug: "dash-cameras", productCount: 4, isActive: true },
  { id: "7", name: "Air Fresheners", slug: "air-fresheners", productCount: 18, isActive: true },
  { id: "8", name: "Cleaning Kits", slug: "cleaning-kits", productCount: 7, isActive: true },
  { id: "9", name: "LED Lights", slug: "led-lights", productCount: 9, isActive: false },
  { id: "10", name: "Steering Covers", slug: "steering-covers", productCount: 5, isActive: true },
];

export function AccessoriesCategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>(INITIAL);
  const [showDialog, setShowDialog] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [name, setName] = useState("");

  const openAdd = () => { setEditCat(null); setName(""); setShowDialog(true); };
  const openEdit = (c: Category) => { setEditCat(c); setName(c.name); setShowDialog(true); };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editCat) {
      setCategories((prev) =>
        prev.map((c) => c.id === editCat.id ? { ...c, name, slug: name.toLowerCase().replace(/\s+/g, "-") } : c)
      );
      toast.success("Category updated");
    } else {
      setCategories((prev) => [
        ...prev,
        { id: String(Date.now()), name, slug: name.toLowerCase().replace(/\s+/g, "-"), productCount: 0, isActive: true },
      ]);
      toast.success("Category created");
    }
    setShowDialog(false);
  };

  const toggleActive = (id: string) => {
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      <div className="space-y-1">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="flex items-center gap-3 p-3">
              <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
              <Grid3X3 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{cat.name}</p>
                <p className="text-[11px] text-muted-foreground">{cat.productCount} products</p>
              </div>
              <Badge variant={cat.isActive ? "default" : "outline"} className="text-[10px] cursor-pointer" onClick={() => toggleActive(cat.id)}>
                {cat.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(cat)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                onClick={() => { setCategories((p) => p.filter((c) => c.id !== cat.id)); toast.success("Deleted"); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Category Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Seat Covers" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
