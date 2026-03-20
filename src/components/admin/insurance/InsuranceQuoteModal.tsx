import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, MessageCircle, Mail, Copy, FileText, Shield, IndianRupee, Plus, Check, X } from "lucide-react";
import { generateInsuranceQuotePdf, InsuranceQuoteData } from "@/lib/generateInsuranceQuotePdf";
import { INSURANCE_COMPANIES, getShortName } from "@/lib/insuranceCompanies";

interface ClientData {
  customer_name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  vehicle_year: number | null;
  current_insurer: string | null;
  current_policy_type: string | null;
  ncb_percentage: number | null;
  current_premium: number | null;
}

interface PolicyData {
  insurer: string | null;
  idv: number | null;
  ncb_discount: number | null;
  addons: string[] | null;
  policy_type: string | null;
  premium_amount: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData;
  policy?: PolicyData | null;
  onQuoteSent?: () => void;
}

const ALL_ADDONS = [
  "Zero Depreciation", "Consumables Cover", "Engine Protection",
  "Tyre Protection", "Roadside Assistance (RSA)", "Key Replacement",
  "Personal Belongings Cover", "Return to Invoice", "NCB Protection",
  "Passenger Cover", "Driver Cover", "Windshield Cover",
];

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG"];

export default function InsuranceQuoteModal({ open, onOpenChange, client, policy, onQuoteSent }: Props) {
  const [showCustomInsurer, setShowCustomInsurer] = useState(false);
  const [customInsurerInput, setCustomInsurerInput] = useState("");

  const [form, setForm] = useState(() => ({
    insuranceCompany: policy?.insurer || client.current_insurer || "ICICI Lombard General Insurance Co Ltd",
    policyType: policy?.policy_type || client.current_policy_type || "comprehensive",
    idv: policy?.idv || 500000,
    fuelType: "Petrol",
    basicOD: policy?.premium_amount ? Math.round(policy.premium_amount * 0.4) : 8000,
    odDiscount: 1500,
    ncbDiscount: policy?.ncb_discount || client.ncb_percentage ? Math.round((policy?.ncb_discount || client.ncb_percentage || 0) * 80) : 2000,
    thirdParty: 6521,
    securePremium: 500,
    addonPremium: 3500,
    addons: policy?.addons?.length ? policy.addons : ["Zero Depreciation", "Engine Protection", "Roadside Assistance (RSA)"],
  }));

  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const netOD = useMemo(() => Math.max(0, form.basicOD - form.odDiscount - form.ncbDiscount), [form.basicOD, form.odDiscount, form.ncbDiscount]);
  const netPremium = useMemo(() => netOD + form.thirdParty + form.securePremium + form.addonPremium, [netOD, form.thirdParty, form.securePremium, form.addonPremium]);
  const gst = useMemo(() => Math.round(netPremium * 0.18), [netPremium]);
  const totalPremium = useMemo(() => netPremium + gst, [netPremium, gst]);

  const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  const buildQuoteData = (): InsuranceQuoteData => ({
    customerName: client.customer_name || "Customer",
    phone: client.phone,
    email: client.email || undefined,
    city: client.city || undefined,
    vehicleMake: client.vehicle_make || "N/A",
    vehicleModel: client.vehicle_model || "N/A",
    vehicleNumber: client.vehicle_number || "N/A",
    vehicleYear: client.vehicle_year || new Date().getFullYear(),
    fuelType: form.fuelType,
    insuranceCompany: form.insuranceCompany,
    policyType: form.policyType,
    idv: form.idv,
    basicOD: form.basicOD,
    odDiscount: form.odDiscount,
    ncbDiscount: form.ncbDiscount,
    thirdParty: form.thirdParty,
    securePremium: form.securePremium,
    addonPremium: form.addonPremium,
    addons: form.addons,
  });

  const handleDownload = () => {
    generateInsuranceQuotePdf(buildQuoteData());
    toast.success("📄 Insurance Quote PDF downloaded!");
    onQuoteSent?.();
  };

  const handleWhatsApp = async () => {
    generateInsuranceQuotePdf(buildQuoteData());
    const msg = `Hi ${client.customer_name || ""}! 🚗\n\nHere's your *Motor Insurance Quotation* from Grabyourcar:\n\n🏢 Insurer: ${form.insuranceCompany}\n🚘 Vehicle: ${client.vehicle_make || ""} ${client.vehicle_model || ""}\n📋 Reg: ${client.vehicle_number || "N/A"}\n💰 IDV: ${formatINR(form.idv)}\n\n📊 *Premium Breakup:*\nNet Premium: ${formatINR(netPremium)}\nGST (18%): ${formatINR(gst)}\n*Total: ${formatINR(totalPremium)}*\n\n✅ Coverage: ${form.addons.join(", ")}\n\nPlease find the detailed PDF quote attached. Let us know to proceed!\n\n— Grabyourcar Insurance Desk\n📞 +91 98559 24442`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: client.phone || "", message: msg, name: client.customer_name, logEvent: "insurance_quote" });
    onQuoteSent?.();
  };

  const handleEmail = () => {
    generateInsuranceQuotePdf(buildQuoteData());
    const subject = `Motor Insurance Quote – ${client.vehicle_make || ""} ${client.vehicle_model || ""} | Grabyourcar`;
    const body = `Dear ${client.customer_name || "Customer"},\n\nPlease find your motor insurance quotation:\n\nInsurer: ${form.insuranceCompany}\nVehicle: ${client.vehicle_make || ""} ${client.vehicle_model || ""}\nReg: ${client.vehicle_number || "N/A"}\nIDV: ${formatINR(form.idv)}\n\nTotal Premium: ${formatINR(totalPremium)}\n\nPlease find the detailed PDF attached.\n\nRegards,\nGrabyourcar Insurance Desk\n+91 98559 24442`;
    window.open(`mailto:${client.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    toast.success("📧 PDF downloaded & Email client opened – attach the PDF!");
    onQuoteSent?.();
  };

  const handleCopy = () => {
    const text = `MOTOR INSURANCE QUOTATION\n\nInsurer: ${form.insuranceCompany}\nVehicle: ${client.vehicle_make || ""} ${client.vehicle_model || ""}\nReg: ${client.vehicle_number || "N/A"}\nIDV: ${formatINR(form.idv)}\n\nBasic OD: ${formatINR(form.basicOD)}\nOD Discount: -${formatINR(form.odDiscount)}\nNCB Discount: -${formatINR(form.ncbDiscount)}\nNet OD: ${formatINR(netOD)}\nThird Party: ${formatINR(form.thirdParty)}\nAdd-ons: ${formatINR(form.addonPremium)}\nNet Premium: ${formatINR(netPremium)}\nGST (18%): ${formatINR(gst)}\nTOTAL: ${formatINR(totalPremium)}\n\nCoverage: ${form.addons.join(", ")}\n\n— Grabyourcar Insurance Desk`;
    navigator.clipboard.writeText(text);
    toast.success("📋 Quote summary copied!");
  };

  const toggleAddon = (addon: string) => {
    setForm(f => ({
      ...f,
      addons: f.addons.includes(addon) ? f.addons.filter(a => a !== addon) : [...f.addons, addon],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 bg-gradient-to-r from-emerald-500 to-green-600">
          <DialogTitle className="text-white text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" /> Insurance Quote Generator
          </DialogTitle>
          <DialogDescription className="text-emerald-100 text-xs">
            {client.customer_name || "Customer"} • {client.vehicle_make} {client.vehicle_model} • {client.vehicle_number}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="px-6 py-4 space-y-5">
            {/* Insurance Company & Policy Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Insurance Company</Label>
                <Select value={form.insuranceCompany} onValueChange={v => update("insuranceCompany", v)}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURERS.map(ins => <SelectItem key={ins} value={ins}>{ins}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Fuel Type</Label>
                <Select value={form.fuelType} onValueChange={v => update("fuelType", v)}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* IDV */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Insured Declared Value (IDV)</Label>
              <Input type="number" className="h-9 text-sm mt-1" value={form.idv} onChange={e => update("idv", Number(e.target.value))} />
            </div>

            <Separator />

            {/* Premium Breakup */}
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                <IndianRupee className="h-4 w-4 text-emerald-600" /> Premium Breakup
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Basic OD", key: "basicOD" },
                  { label: "OD Discount", key: "odDiscount" },
                  { label: "NCB Discount", key: "ncbDiscount" },
                  { label: "Third Party", key: "thirdParty" },
                  { label: "Secure Premium", key: "securePremium" },
                  { label: "Add-on Premium", key: "addonPremium" },
                ].map(field => (
                  <div key={field.key}>
                    <Label className="text-[11px] text-muted-foreground">{field.label}</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm mt-0.5"
                      value={(form as any)[field.key]}
                      onChange={e => update(field.key, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              {/* Live calculation preview */}
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Net OD Premium</span><span className="font-semibold text-foreground">{formatINR(netOD)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Net Premium</span><span className="font-semibold text-foreground">{formatINR(netPremium)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>GST (18%)</span><span className="font-semibold text-foreground">{formatINR(gst)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  <span>Total Premium Payable</span><span>{formatINR(totalPremium)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Coverage Add-ons */}
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-blue-600" /> Coverage Add-ons
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ADDONS.map(addon => (
                  <label
                    key={addon}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors text-xs"
                  >
                    <Checkbox
                      checked={form.addons.includes(addon)}
                      onCheckedChange={() => toggleAddon(addon)}
                    />
                    <span>{addon}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pb-2">
              <Button onClick={handleDownload} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button onClick={handleWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700 text-white h-11">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
              <Button onClick={handleEmail} variant="outline" className="gap-2 h-11">
                <Mail className="h-4 w-4" /> Send Email
              </Button>
              <Button onClick={handleCopy} variant="outline" className="gap-2 h-11">
                <Copy className="h-4 w-4" /> Copy Summary
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
