import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Plus, Tags, Copy, Trash2, Edit } from "lucide-react";

interface DiscountCode {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string;
}

const INITIAL: DiscountCode[] = [
  { id: "1", code: "FLAT10", type: "percentage", value: 10, minOrder: 500, maxUses: 100, usedCount: 42, isActive: true, expiresAt: "2026-06-30" },
  { id: "2", code: "SAVE200", type: "fixed", value: 200, minOrder: 1000, maxUses: 50, usedCount: 18, isActive: true, expiresAt: "2026-04-30" },
  { id: "3", code: "WELCOME15", type: "percentage", value: 15, minOrder: 0, maxUses: 200, usedCount: 87, isActive: false, expiresAt: "2026-03-15" },
];

export function AccessoriesDiscountCodesPanel() {
  const [codes, setCodes] = useState<DiscountCode[]>(INITIAL);
  const [showDialog, setShowDialog] = useState(false);
  const [editCode, setEditCode] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState({ code: "", type: "percentage" as "percentage" | "fixed", value: 0, minOrder: 0, maxUses: 100, expiresAt: "" });

  const openAdd = () => {
    setEditCode(null);
    setForm({ code: "", type: "percentage", value: 0, minOrder: 0, maxUses: 100, expiresAt: "" });
    setShowDialog(true);
  };

  const openEdit = (c: DiscountCode) => {
    setEditCode(c);
    setForm({ code: c.code, type: c.type, value: c.value, minOrder: c.minOrder, maxUses: c.maxUses, expiresAt: c.expiresAt });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.code.trim()) return;
    if (editCode) {
      setCodes((prev) => prev.map((c) => c.id === editCode.id ? { ...c, ...form } : c));
      toast.success("Discount code updated");
    } else {
      setCodes((prev) => [...prev, { id: String(Date.now()), ...form, usedCount: 0, isActive: true }]);
      toast.success("Discount code created");
    }
    setShowDialog(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discount Codes</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Create Code
        </Button>
      </div>

      <div className="space-y-2">
        {codes.map((dc) => (
          <Card key={dc.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Tags className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono font-bold text-sm">{dc.code}</p>
                  <button onClick={() => copyCode(dc.code)} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {dc.type === "percentage" ? `${dc.value}% off` : `₹${dc.value} off`}
                  {dc.minOrder > 0 ? ` · Min ₹${dc.minOrder}` : ""}
                  {" · "}Expires: {dc.expiresAt || "Never"}
                </p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-sm font-semibold">{dc.usedCount}/{dc.maxUses}</p>
                <p className="text-[10px] text-muted-foreground">used</p>
              </div>
              <Badge variant={dc.isActive ? "default" : "outline"} className="text-[10px] cursor-pointer shrink-0"
                onClick={() => setCodes((p) => p.map((c) => c.id === dc.id ? { ...c, isActive: !c.isActive } : c))}>
                {dc.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(dc)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                onClick={() => { setCodes((p) => p.filter((c) => c.id !== dc.id)); toast.success("Deleted"); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCode ? "Edit Code" : "Create Discount Code"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="FLAT10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: +e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Order (₹)</Label>
                <Input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: +e.target.value })} />
              </div>
              <div>
                <Label>Max Uses</Label>
                <Input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: +e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Expires At</Label>
              <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.code.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
