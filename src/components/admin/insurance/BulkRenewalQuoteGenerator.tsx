import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Download, CheckCircle2, Loader2 } from "lucide-react";
import { generateInsuranceQuotePdf, InsuranceQuoteData } from "@/lib/generateInsuranceQuotePdf";

interface BulkQuoteEntry extends InsuranceQuoteData {
  id: string;
  generated?: boolean;
}

// ── Pre-loaded renewal quotes ──
const RENEWAL_QUOTES: BulkQuoteEntry[] = [
  {
    id: "1",
    customerName: "Harish Virmani",
    phone: "",
    vehicleMake: "Audi",
    vehicleModel: "A4",
    vehicleNumber: "HR26CB1100",
    vehicleYear: 2023,
    fuelType: "Petrol",
    insuranceCompany: "Oriental Insurance",
    policyType: "Comprehensive",
    idv: 2430000,
    basicOD: 83672,
    odDiscount: 71487,
    ncbDiscount: 2452,
    thirdParty: 7897,
    securePremium: 0,
    addonPremium: 23889,
    addons: ["Zero Depreciation", "24x7 Roadside Assistance", "Consumables"],
  },
  {
    id: "2",
    customerName: "Saurabh Virmani",
    phone: "",
    vehicleMake: "Toyota",
    vehicleModel: "Fortuner",
    vehicleNumber: "7100",
    vehicleYear: 2023,
    fuelType: "Diesel",
    insuranceCompany: "Oriental Insurance",
    policyType: "Comprehensive",
    idv: 1119744,
    basicOD: 42252,
    odDiscount: 36356,
    ncbDiscount: 2986,
    thirdParty: 7897,
    securePremium: 0,
    addonPremium: 75,
    addons: ["24x7 Roadside Assistance"],
  },
];

export function BulkRenewalQuoteGenerator({ onClose }: { onClose: () => void }) {
  const [quotes] = useState<BulkQuoteEntry[]>(RENEWAL_QUOTES);
  const [generatedIds, setGeneratedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = (quote: BulkQuoteEntry) => {
    setGenerating(quote.id);
    try {
      const result = generateInsuranceQuotePdf(quote);
      setGeneratedIds(prev => new Set(prev).add(quote.id));
      toast.success(`PDF generated for ${quote.customerName} — Total: Rs. ${Math.round(result.totalPremium).toLocaleString("en-IN")}`);
    } catch (err) {
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = () => {
    quotes.forEach((q, i) => {
      setTimeout(() => handleGenerate(q), i * 500);
    });
  };

  const formatINR = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Bulk Renewal Quote PDFs
        </CardTitle>
        <div className="flex gap-2">
          {quotes.length > 1 && (
            <Button size="sm" onClick={handleGenerateAll} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download All ({quotes.length})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quotes.map((q) => {
          const netOD = Math.max(0, q.basicOD - q.odDiscount - q.ncbDiscount);
          const netPremium = netOD + q.thirdParty + q.securePremium + q.addonPremium;
          const gst = Math.round(netPremium * 0.18);
          const total = netPremium + gst;
          const isGenerated = generatedIds.has(q.id);
          const isGenerating = generating === q.id;

          return (
            <div
              key={q.id}
              className={`border rounded-lg p-4 transition-all ${isGenerated ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{q.customerName}</span>
                    <Badge variant="outline" className="text-[10px]">{q.insuranceCompany}</Badge>
                    {isGenerated && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {q.vehicleMake} {q.vehicleModel} &bull; {q.vehicleNumber} &bull; {q.vehicleYear} &bull; {q.fuelType}
                  </p>

                  {/* Premium breakup summary */}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                    <div><span className="text-muted-foreground">Basic OD:</span> <span className="font-medium">{formatINR(q.basicOD)}</span></div>
                    <div><span className="text-muted-foreground">OD Disc:</span> <span className="font-medium text-red-600">-{formatINR(q.odDiscount)}</span></div>
                    <div><span className="text-muted-foreground">NCB:</span> <span className="font-medium text-red-600">-{formatINR(q.ncbDiscount)}</span></div>
                    <div><span className="text-muted-foreground">Net OD:</span> <span className="font-bold">{formatINR(netOD)}</span></div>
                    <div><span className="text-muted-foreground">TP:</span> <span className="font-medium">{formatINR(q.thirdParty)}</span></div>
                    <div><span className="text-muted-foreground">Addons:</span> <span className="font-medium">{formatINR(q.addonPremium)}</span></div>
                    <div><span className="text-muted-foreground">GST:</span> <span className="font-medium">{formatINR(gst)}</span></div>
                    <div><span className="text-muted-foreground font-bold">Total:</span> <span className="font-bold text-emerald-700">{formatINR(total)}</span></div>
                  </div>

                  {q.addons.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {q.addons.map(a => (
                        <Badge key={a} variant="secondary" className="text-[10px] px-1.5 py-0">{a}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={isGenerated ? "outline" : "default"}
                  onClick={() => handleGenerate(q)}
                  disabled={isGenerating}
                  className="shrink-0 gap-1.5"
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  {isGenerated ? "Re-download" : "Download PDF"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
