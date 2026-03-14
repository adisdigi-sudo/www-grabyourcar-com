import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Car, Shield, Calendar, AlertTriangle, CheckCircle2,
  FileText, Loader2, RefreshCw, Phone, Zap, Clock, Info,
  ChevronRight, ArrowRight, CreditCard
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format, differenceInDays } from "date-fns";

interface VehicleData {
  registration_number: string;
  owner_name: string;
  father_name?: string | null;
  mobile_number?: string | null;
  present_address?: string | null;
  vehicle_class: string;
  fuel_type: string;
  maker_model: string;
  maker?: string | null;
  registration_date: string;
  insurance_expiry: string | null;
  insurance_company: string | null;
  insurance_policy_number?: string | null;
  puc_expiry: string | null;
  fitness_expiry: string | null;
  rto: string;
  chassis_number: string;
  engine_number: string;
  vehicle_age_years: number;
  hypothecation: string | null;
  vehicle_color?: string | null;
  norms_type?: string | null;
  source?: "surepass" | "mock";
  triggers: {
    insurance_renewal: boolean;
    insurance_days_left: number | null;
    loan_refinance: boolean;
    puc_renewal: boolean;
    fitness_renewal: boolean;
  };
}

export default function VehicleLookup() {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VehicleData | null>(null);
  const [error, setError] = useState("");

  const handleLookup = async () => {
    const cleaned = vehicleNumber.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(cleaned)) {
      setError("Enter a valid Indian vehicle number (e.g., DL01AB1234)");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("vehicle-lookup", {
        body: { vehicle_number: cleaned },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message || "Lookup failed");
      toast.error("Vehicle lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const getDaysColor = (days: number | null) => {
    if (days === null) return "text-muted-foreground";
    if (days <= 0) return "text-red-600";
    if (days <= 15) return "text-red-500";
    if (days <= 30) return "text-amber-500";
    if (days <= 60) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Car className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Vehicle RC Lookup</h1>
          <p className="text-muted-foreground mb-8">
            Enter any Indian vehicle registration number to get complete details — insurance status, fitness, PUC & more
          </p>

          {/* Search Box */}
          <Card className="shadow-lg border-primary/20">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    placeholder="DL01AB1234"
                    className="pl-10 text-lg h-12 font-mono tracking-wider"
                    maxLength={15}
                  />
                </div>
                <Button
                  onClick={handleLookup}
                  disabled={loading || !vehicleNumber.trim()}
                  size="lg"
                  className="h-12 px-8"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Lookup
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive mt-3 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {error}
                </p>
              )}

              {/* Data source indicator */}
              {result && (
                <div className={`mt-4 p-3 rounded-lg border ${result.source === 'surepass' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-muted/50 border-dashed border-muted-foreground/30'}`}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {result.source === 'surepass' ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                        <span className="text-green-700 dark:text-green-400">
                          <strong>Live Data:</strong> Verified from RC database via Surepass
                        </span>
                      </>
                    ) : (
                      <>
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          <strong>Demo Data:</strong> Showing sample data. Live RC verification active.
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="container mx-auto px-4 max-w-4xl py-8 space-y-6">
          {/* Cross-sell Trigger Alerts */}
          {(result.triggers.insurance_renewal || result.triggers.loan_refinance || result.triggers.puc_renewal || result.triggers.fitness_renewal) && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Smart Alerts — Cross-sell Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.triggers.insurance_renewal && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-red-200">
                      <Shield className="h-5 w-5 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Insurance {result.triggers.insurance_days_left! <= 0 ? "Expired" : "Expiring"}</p>
                        <p className={`text-xs ${getDaysColor(result.triggers.insurance_days_left)}`}>
                          {result.triggers.insurance_days_left! <= 0
                            ? `Expired ${Math.abs(result.triggers.insurance_days_left!)} days ago`
                            : `${result.triggers.insurance_days_left} days left`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0 text-xs">
                        Renew <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                  {result.triggers.loan_refinance && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-blue-200">
                      <CreditCard className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Refinance Eligible</p>
                        <p className="text-xs text-muted-foreground">Vehicle age: {result.vehicle_age_years}+ years</p>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0 text-xs">
                        Get Quote <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                  {result.triggers.puc_renewal && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-amber-200">
                      <FileText className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">PUC {result.puc_expiry && new Date(result.puc_expiry) < new Date() ? "Expired" : "Expiring"}</p>
                        <p className="text-xs text-muted-foreground">Renew to avoid ₹10,000 fine</p>
                      </div>
                    </div>
                  )}
                  {result.triggers.fitness_renewal && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-orange-200">
                      <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Fitness Certificate Due</p>
                        <p className="text-xs text-muted-foreground">Required for continued road use</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicle Details */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Registration Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Registration Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Reg. Number" value={result.registration_number} bold />
                <DetailRow label="Owner" value={result.owner_name} />
                {result.father_name && <DetailRow label="Father's Name" value={result.father_name} />}
                {result.mobile_number && <DetailRow label="Mobile" value={result.mobile_number} />}
                {result.present_address && <DetailRow label="Address" value={result.present_address} />}
                <DetailRow label="RTO" value={result.rto} />
                <DetailRow label="Reg. Date" value={result.registration_date ? format(new Date(result.registration_date), "dd MMM yyyy") : "—"} />
                <DetailRow label="Vehicle Age" value={`${result.vehicle_age_years} years`} />
                <DetailRow label="Chassis" value={result.chassis_number} mono />
                <DetailRow label="Engine" value={result.engine_number} mono />
              </CardContent>
            </Card>

            {/* Vehicle Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Vehicle Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Make & Model" value={result.maker_model} bold />
                <DetailRow label="Vehicle Class" value={result.vehicle_class} />
                <DetailRow label="Fuel Type" value={result.fuel_type} />
                <DetailRow label="Hypothecation" value={result.hypothecation || "None"} />
              </CardContent>
            </Card>

            {/* Insurance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Insurance Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Insurer" value={result.insurance_company || "Not available"} />
                <DetailRow
                  label="Expiry"
                  value={result.insurance_expiry ? format(new Date(result.insurance_expiry), "dd MMM yyyy") : "N/A"}
                  valueColor={getDaysColor(result.triggers.insurance_days_left)}
                />
                {result.triggers.insurance_days_left !== null && (
                  <DetailRow
                    label="Status"
                    value={result.triggers.insurance_days_left <= 0 ? "EXPIRED" : `${result.triggers.insurance_days_left} days remaining`}
                    valueColor={getDaysColor(result.triggers.insurance_days_left)}
                  />
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Document Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DocRow label="PUC" expiry={result.puc_expiry} />
                <DocRow label="Fitness" expiry={result.fitness_expiry} />
              </CardContent>
            </Card>
          </div>

          {/* WhatsApp placeholder */}
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              <Phone className="h-5 w-5 mx-auto mb-2 opacity-50" />
              <p className="font-medium">WhatsApp Automation — Coming Soon</p>
              <p className="text-xs mt-1">Auto-send renewal reminders and refinance offers via Meta WhatsApp Cloud API</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, bold, mono, valueColor }: {
  label: string; value: string; bold?: boolean; mono?: boolean; valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${mono ? "font-mono text-xs" : ""} ${valueColor || ""}`}>
        {value}
      </span>
    </div>
  );
}

function DocRow({ label, expiry }: { label: string; expiry: string | null }) {
  if (!expiry) {
    return (
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">{label}</span>
        <Badge variant="outline" className="text-xs">N/A</Badge>
      </div>
    );
  }
  const d = new Date(expiry);
  const days = differenceInDays(d, new Date());
  const expired = days <= 0;
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs">{format(d, "dd MMM yyyy")}</span>
        <Badge variant={expired ? "destructive" : days <= 30 ? "secondary" : "outline"} className="text-[10px]">
          {expired ? "Expired" : `${days}d left`}
        </Badge>
      </div>
    </div>
  );
}
