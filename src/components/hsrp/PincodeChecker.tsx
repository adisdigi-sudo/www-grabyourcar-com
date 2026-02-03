import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MapPin, Home, Loader2 } from "lucide-react";

interface PincodeCheckerProps {
  pincode: string;
  onPincodeChange: (pincode: string) => void;
  onServiceabilityChange: (serviceable: boolean, fee: number) => void;
}

// Serviceable pincodes for Delhi NCR region
const serviceablePincodes: Record<string, { area: string; fee: number }> = {
  // Delhi
  "110001": { area: "Connaught Place, Delhi", fee: 200 },
  "110002": { area: "Darya Ganj, Delhi", fee: 200 },
  "110003": { area: "Civil Lines, Delhi", fee: 200 },
  "110006": { area: "Karol Bagh, Delhi", fee: 200 },
  "110016": { area: "Hauz Khas, Delhi", fee: 200 },
  "110017": { area: "Malviya Nagar, Delhi", fee: 200 },
  "110019": { area: "Lajpat Nagar, Delhi", fee: 200 },
  "110024": { area: "Defence Colony, Delhi", fee: 200 },
  "110025": { area: "Okhla, Delhi", fee: 200 },
  "110030": { area: "Mehrauli, Delhi", fee: 250 },
  "110044": { area: "Ashram, Delhi", fee: 200 },
  "110048": { area: "Greater Kailash, Delhi", fee: 200 },
  "110049": { area: "Vasant Kunj, Delhi", fee: 250 },
  "110051": { area: "Krishna Nagar, Delhi", fee: 200 },
  "110052": { area: "Shahdara, Delhi", fee: 200 },
  "110053": { area: "Preet Vihar, Delhi", fee: 200 },
  "110054": { area: "Chandni Chowk, Delhi", fee: 200 },
  "110055": { area: "Paharganj, Delhi", fee: 200 },
  "110085": { area: "Rohini, Delhi", fee: 250 },
  "110091": { area: "Mayur Vihar, Delhi", fee: 200 },
  "110092": { area: "Patparganj, Delhi", fee: 200 },
  // Noida
  "201301": { area: "Sector 1-30, Noida", fee: 250 },
  "201303": { area: "Sector 31-50, Noida", fee: 250 },
  "201304": { area: "Sector 51-80, Noida", fee: 300 },
  "201305": { area: "Sector 81-120, Noida", fee: 300 },
  "201306": { area: "Sector 121-150, Noida", fee: 350 },
  "201307": { area: "Sector 150+, Noida", fee: 350 },
  "201310": { area: "Noida Extension", fee: 400 },
  // Greater Noida
  "201308": { area: "Greater Noida West", fee: 400 },
  "201009": { area: "Greater Noida", fee: 400 },
  "203207": { area: "Pari Chowk, Greater Noida", fee: 400 },
  // Gurugram
  "122001": { area: "Old Gurgaon", fee: 300 },
  "122002": { area: "DLF Phase 1-2, Gurugram", fee: 300 },
  "122003": { area: "Sushant Lok, Gurugram", fee: 300 },
  "122004": { area: "DLF Phase 3-4, Gurugram", fee: 300 },
  "122008": { area: "Sector 45-57, Gurugram", fee: 350 },
  "122009": { area: "Sector 58-70, Gurugram", fee: 350 },
  "122010": { area: "Sector 71-85, Gurugram", fee: 400 },
  "122011": { area: "Golf Course Road, Gurugram", fee: 300 },
  "122015": { area: "Udyog Vihar, Gurugram", fee: 350 },
  "122016": { area: "MG Road, Gurugram", fee: 300 },
  "122017": { area: "Cyber City, Gurugram", fee: 300 },
  "122018": { area: "Sector 40-44, Gurugram", fee: 350 },
  // Ghaziabad
  "201001": { area: "Kaushambi, Ghaziabad", fee: 300 },
  "201002": { area: "Vaishali, Ghaziabad", fee: 300 },
  "201005": { area: "Raj Nagar, Ghaziabad", fee: 350 },
  "201010": { area: "Indirapuram, Ghaziabad", fee: 300 },
  "201012": { area: "Vasundhara, Ghaziabad", fee: 300 },
  "201014": { area: "Crossing Republik, Ghaziabad", fee: 400 },
  // Faridabad
  "121001": { area: "Old Faridabad", fee: 400 },
  "121002": { area: "NIT Faridabad", fee: 400 },
  "121003": { area: "Sector 14-16, Faridabad", fee: 400 },
  "121004": { area: "Ballabhgarh, Faridabad", fee: 450 },
  "121005": { area: "Sector 31-37, Faridabad", fee: 400 },
};

export const PincodeChecker = ({
  pincode,
  onPincodeChange,
  onServiceabilityChange,
}: PincodeCheckerProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    checked: boolean;
    serviceable: boolean;
    area?: string;
    fee?: number;
  } | null>(null);

  const handleCheck = async () => {
    if (pincode.length !== 6) {
      setCheckResult({ checked: true, serviceable: false });
      onServiceabilityChange(false, 0);
      return;
    }

    setIsChecking(true);
    
    // Simulate API check delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const result = serviceablePincodes[pincode];
    
    if (result) {
      setCheckResult({
        checked: true,
        serviceable: true,
        area: result.area,
        fee: result.fee,
      });
      onServiceabilityChange(true, result.fee);
    } else {
      setCheckResult({ checked: true, serviceable: false });
      onServiceabilityChange(false, 0);
    }

    setIsChecking(false);
  };

  const handlePincodeInput = (value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    onPincodeChange(numericValue);
    
    // Reset check result when pincode changes
    if (checkResult) {
      setCheckResult(null);
      onServiceabilityChange(false, 0);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="pincode-check">Check Home Installation Availability</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="pincode-check"
            placeholder="Enter 6-digit pincode"
            value={pincode}
            onChange={(e) => handlePincodeInput(e.target.value)}
            className="pl-9"
            maxLength={6}
          />
        </div>
        <Button
          onClick={handleCheck}
          disabled={pincode.length !== 6 || isChecking}
          variant="outline"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            "Check"
          )}
        </Button>
      </div>

      {checkResult && (
        <Card className={`border-2 ${checkResult.serviceable ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}`}>
          <CardContent className="p-4">
            {checkResult.serviceable ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      Home Installation Available!
                    </span>
                    <Badge variant="secondary" className="gap-1">
                      <Home className="h-3 w-3" />
                      Doorstep Service
                    </Badge>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    {checkResult.area}
                  </p>
                  <p className="text-sm font-medium mt-2">
                    Home Installation Fee: <span className="text-green-700 dark:text-green-400">₹{checkResult.fee}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-red-700 dark:text-red-400">
                    Home Installation Not Available
                  </span>
                  <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                    Sorry, home installation is not available in your area. Please visit a nearby dealer for HSRP fitting.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    We currently service Delhi NCR region (Delhi, Noida, Greater Noida, Gurugram, Ghaziabad, Faridabad).
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
