import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryModeSelectorProps {
  mode: "pickup" | "delivery";
  onModeChange: (mode: "pickup" | "delivery") => void;
}

export const DeliveryModeSelector = ({ mode, onModeChange }: DeliveryModeSelectorProps) => (
  <div className="flex gap-3">
    <button
      type="button"
      onClick={() => onModeChange("pickup")}
      className={cn(
        "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
        mode === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
      )}
    >
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", 
        mode === "pickup" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        <Building2 className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium text-sm text-foreground">Pick Up from Hub</p>
        <p className="text-xs text-muted-foreground">Free • Multiple locations in Delhi NCR</p>
      </div>
    </button>

    <button
      type="button"
      onClick={() => onModeChange("delivery")}
      className={cn(
        "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
        mode === "delivery" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
      )}
    >
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0",
        mode === "delivery" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        <Truck className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-foreground">Doorstep Delivery</p>
          <Badge variant="secondary" className="text-[10px]">+₹500</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Delivered to your location</p>
      </div>
    </button>
  </div>
);
