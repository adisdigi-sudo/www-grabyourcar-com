import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";

export const LeaseVsBuyCalculator = () => {
  const [vehiclePrice, setVehiclePrice] = useState(1200000);
  const [tenure, setTenure] = useState(3);
  const [quantity, setQuantity] = useState(5);

  // Buy calculations
  const downPayment = vehiclePrice * 0.2;
  const loanAmount = vehiclePrice - downPayment;
  const interestRate = 0.085;
  const emiMonths = tenure * 12;
  const monthlyRate = interestRate / 12;
  const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, emiMonths)) / (Math.pow(1 + monthlyRate, emiMonths) - 1);
  const totalLoanCost = emi * emiMonths;
  const depreciationRate = tenure === 3 ? 0.45 : tenure === 5 ? 0.60 : 0.35;
  const residualValue = vehiclePrice * (1 - depreciationRate);
  const insuranceCost = vehiclePrice * 0.03 * tenure;
  const maintenanceCost = vehiclePrice * 0.02 * tenure;
  const totalBuyCost = downPayment + totalLoanCost + insuranceCost + maintenanceCost;
  const buyCostPerMonth = totalBuyCost / emiMonths;
  const netBuyCost = totalBuyCost - residualValue;

  // Lease calculations
  const leaseMonthly = vehiclePrice * 0.022; // ~2.2% of vehicle price per month
  const totalLeaseCost = leaseMonthly * emiMonths * quantity;
  const leaseCostPerVehicle = leaseMonthly * emiMonths;

  // Subscription calculations
  const subscriptionMonthly = vehiclePrice * 0.028;
  const totalSubCost = subscriptionMonthly * emiMonths * quantity;

  const formatCurrency = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Lease vs Buy vs Subscribe — TCO Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Vehicle Price (Ex-Showroom)</label>
            <Input
              type="number"
              value={vehiclePrice}
              onChange={(e) => setVehiclePrice(parseInt(e.target.value) || 0)}
              className="bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Tenure (Years)</label>
            <div className="flex gap-2">
              {[3, 5].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setTenure(y)}
                  className={`flex-1 h-9 rounded-md text-sm font-medium border transition-colors ${
                    tenure === y ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {y} Years
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Number of Vehicles</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="bg-background"
            />
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Buy */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">Buy (Loan)</h4>
                <Badge variant="outline" className="text-xs">Ownership</Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Down Payment</span><span className="font-medium">{formatCurrency(downPayment)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">EMI/month</span><span className="font-medium">{formatCurrency(emi)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Insurance ({tenure}yr)</span><span className="font-medium">{formatCurrency(insuranceCost)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Maintenance ({tenure}yr)</span><span className="font-medium">{formatCurrency(maintenanceCost)}</span></div>
                <div className="border-t border-border pt-1.5 flex justify-between">
                  <span className="text-muted-foreground">Total Cost</span><span className="font-bold">{formatCurrency(totalBuyCost)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Resale Value</span><span>-{formatCurrency(residualValue)}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground border-t border-border pt-1.5">
                  <span>Net Cost/Vehicle</span><span>{formatCurrency(netBuyCost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lease */}
          <Card className="border-primary/30 bg-primary/5 ring-2 ring-primary/20">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">Lease</h4>
                <Badge className="bg-primary text-primary-foreground text-xs">Recommended</Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Down Payment</span><span className="font-medium">₹0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly/vehicle</span><span className="font-medium">{formatCurrency(leaseMonthly)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Insurance</span><span className="font-medium text-green-600">Included</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Maintenance</span><span className="font-medium text-green-600">Included</span></div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground">
                  <span>Total ({quantity} vehicles)</span><span>{formatCurrency(totalLeaseCost)}</span>
                </div>
                <div className="flex justify-between text-primary font-medium">
                  <span>Cost/Vehicle</span><span>{formatCurrency(leaseCostPerVehicle)}</span>
                </div>
                {leaseCostPerVehicle < netBuyCost && (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-medium pt-1">
                    <TrendingDown className="h-3 w-3" />
                    Save {formatCurrency(netBuyCost - leaseCostPerVehicle)}/vehicle vs Buy
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">Subscription</h4>
                <Badge variant="outline" className="text-xs">Flexible</Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Down Payment</span><span className="font-medium">₹0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly/vehicle</span><span className="font-medium">{formatCurrency(subscriptionMonthly)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Insurance</span><span className="font-medium text-green-600">Included</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Maintenance</span><span className="font-medium text-green-600">Included</span></div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground">
                  <span>Total ({quantity} vehicles)</span><span>{formatCurrency(totalSubCost)}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-600 text-xs font-medium pt-1">
                  <ArrowRight className="h-3 w-3" />
                  Cancel anytime, swap vehicles
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          * Estimates based on standard rates. Actual pricing may vary. Contact our corporate team for custom quotes.
        </p>
      </CardContent>
    </Card>
  );
};
