import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRCLookup } from "@/hooks/useRCLookup";

export const HSRPComplianceChecker = () => {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [checked, setChecked] = useState(false);

  const { lookup, loading, data, error, reset } = useRCLookup({ showToast: false });

  const handleCheck = async () => {
    setChecked(false);
    const result = await lookup(vehicleNumber);
    if (result) setChecked(true);
  };

  const handleReset = () => {
    setVehicleNumber("");
    setChecked(false);
    reset();
  };

  // Heuristic: older vehicles (pre-2019) likely don't have HSRP
  const registrationYear = data?.registration_date 
    ? new Date(data.registration_date).getFullYear() 
    : null;
  const likelyHasHSRP = registrationYear ? registrationYear >= 2019 : false;
  const isOldVehicle = registrationYear ? registrationYear < 2019 : true;
  const fineRisk = !likelyHasHSRP;

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-amber-500" />
          HSRP Compliance Checker
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Check if your vehicle needs HSRP and avoid ₹10,000 challan
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter vehicle number (e.g., DL01AB1234)"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <Button onClick={handleCheck} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {checked && data && (
          <div className="space-y-3">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{data.registration_number}</span>
                <Badge variant={fineRisk ? "destructive" : "default"}>
                  {fineRisk ? "HSRP Needed" : "Likely Compliant"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Vehicle: {data.maker_model}</p>
                <p>Registered: {data.registration_date || "N/A"}</p>
                <p>Category: {data.vehicle_class}</p>
              </div>
            </div>

            {fineRisk ? (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">High Challan Risk</p>
                    <p className="text-sm text-muted-foreground">
                      Your vehicle was registered {registrationYear ? `in ${registrationYear}` : "before the HSRP mandate"}. 
                      Non-compliance can result in fines up to <strong>₹10,000</strong> under Motor Vehicles Act.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Book HSRP Now — Avoid Fine
                </Button>
              </div>
            ) : (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Likely Compliant</p>
                    <p className="text-sm text-muted-foreground">
                      Your vehicle was registered in {registrationYear}, which likely came with factory-fitted HSRP. 
                      If you've replaced plates or are unsure, book a fresh set to stay compliant.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={handleReset}>Check Another Vehicle</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
