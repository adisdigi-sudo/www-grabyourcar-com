import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle2, AlertCircle, Clock, Package, Wrench, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const stages = [
  { key: "new_booking", label: "Booked", icon: Package },
  { key: "verification", label: "Verified", icon: CheckCircle2 },
  { key: "payment_done", label: "Paid", icon: CheckCircle2 },
  { key: "scheduled", label: "Scheduled", icon: Calendar },
  { key: "installation", label: "Installing", icon: Wrench },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

function getStageIndex(status: string): number {
  const normalized = status?.toLowerCase().replace(/\s+/g, "_") || "";
  if (normalized.includes("complet") || normalized.includes("done") || normalized.includes("installed")) return 5;
  if (normalized.includes("install")) return 4;
  if (normalized.includes("schedul")) return 3;
  if (normalized.includes("pay") || normalized.includes("paid")) return 2;
  if (normalized.includes("verif")) return 1;
  return 0;
}

export const HSRPOrderTracker = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async () => {
    const q = query.trim();
    if (!q) { toast.error("Enter order ID, registration number, or phone"); return; }
    setLoading(true);
    setResult(null);
    setNotFound(false);

    try {
      const cleanPhone = q.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("hsrp_bookings")
        .select("*")
        .or(`tracking_id.eq.${q},registration_number.ilike.${q},phone.eq.${cleanPhone}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setResult(data);
      }
    } catch {
      toast.error("Failed to track. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stageIdx = result ? getStageIndex(result.order_status || result.stage || "") : -1;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-foreground" />
          Track Your HSRP Order
        </CardTitle>
        <p className="text-sm text-muted-foreground">Enter your order ID, vehicle number, or phone number</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g., HSRP12345 / DL01AB1234 / 9876543210"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
          />
          <Button onClick={handleTrack} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
          </Button>
        </div>

        {notFound && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm">No booking found. Please check your details and try again.</span>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{result.registration_number}</span>
                <Badge variant="secondary">{result.order_status || result.stage || "Booked"}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <span>Owner: {result.owner_name || "N/A"}</span>
                <span>Type: {result.vehicle_category || result.service_type || "Car"}</span>
                <span>Amount: ₹{(result.amount || result.total_amount || 0).toLocaleString()}</span>
                <span>Booked: {result.created_at ? new Date(result.created_at).toLocaleDateString("en-IN") : "N/A"}</span>
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="relative">
              <div className="flex items-center justify-between">
                {stages.map((stage, i) => {
                  const Icon = stage.icon;
                  const isComplete = i <= stageIdx;
                  const isCurrent = i === stageIdx;
                  return (
                    <div key={stage.key} className="flex flex-col items-center flex-1">
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        isComplete 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[10px] mt-1 text-center ${isComplete ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Progress line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0 mx-4">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(0, (stageIdx / (stages.length - 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
