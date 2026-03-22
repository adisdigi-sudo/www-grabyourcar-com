import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Car, ShoppingCart } from "lucide-react";

interface FleetItem {
  id: string;
  model: string;
  quantity: number;
  type: "buy" | "lease" | "subscription";
  fuelType: string;
}

interface FleetRequirementBuilderProps {
  onRequirementsChange?: (items: FleetItem[]) => void;
}

const popularModels = [
  "Maruti Swift", "Maruti Dzire", "Hyundai Creta", "Hyundai Venue",
  "Tata Nexon", "Tata Punch", "Toyota Innova", "Toyota Fortuner",
  "Kia Seltos", "Kia Sonet", "Mahindra XUV700", "Mahindra Scorpio",
  "Honda City", "MG Hector", "Skoda Slavia", "Volkswagen Virtus",
];

export const FleetRequirementBuilder = ({ onRequirementsChange }: FleetRequirementBuilderProps) => {
  const [items, setItems] = useState<FleetItem[]>([
    { id: "1", model: "", quantity: 1, type: "buy", fuelType: "Petrol" },
  ]);

  const addItem = () => {
    const newItem: FleetItem = {
      id: Date.now().toString(),
      model: "",
      quantity: 1,
      type: "buy",
      fuelType: "Petrol",
    };
    const updated = [...items, newItem];
    setItems(updated);
    onRequirementsChange?.(updated);
  };

  const removeItem = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    onRequirementsChange?.(updated);
  };

  const updateItem = (id: string, field: keyof FleetItem, value: any) => {
    const updated = items.map((i) => (i.id === id ? { ...i, [field]: value } : i));
    setItems(updated);
    onRequirementsChange?.(updated);
  };

  const totalVehicles = items.reduce((sum, i) => sum + i.quantity, 0);
  const tierLabel = totalVehicles >= 20 ? "Enterprise" : totalVehicles >= 5 ? "Business" : "Standard";
  const discountPct = totalVehicles >= 20 ? 15 : totalVehicles >= 5 ? 10 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Build Your Fleet Requirement
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">{totalVehicles} Vehicles</Badge>
          <Badge variant="outline" className="border-primary/30 text-primary">{tierLabel} Tier</Badge>
          {discountPct > 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              {discountPct}% Volume Discount
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, idx) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs text-muted-foreground mb-1 block">Car Model</label>
              <Select value={item.model} onValueChange={(v) => updateItem(item.id, "model", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {popularModels.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-4 md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={item.quantity}
                onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                className="h-9 text-sm"
              />
            </div>

            <div className="col-span-4 md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Procurement</label>
              <Select value={item.type} onValueChange={(v) => updateItem(item.id, "type", v as FleetItem["type"])}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="lease">Lease</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-3 md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Fuel</label>
              <Select value={item.fuelType} onValueChange={(v) => updateItem(item.id, "fuelType", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                  <SelectItem value="CNG">CNG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end">
              {items.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" className="gap-2" onClick={addItem}>
          <Plus className="h-4 w-4" />
          Add Another Vehicle
        </Button>
      </CardContent>
    </Card>
  );
};
