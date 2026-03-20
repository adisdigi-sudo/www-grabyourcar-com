import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Banknote, Plus, Phone, IndianRupee, Car, GripVertical, Calculator,
  Share2, PhoneCall, MessageCircle, CheckCircle2, XCircle, Building2,
  FileText, AlertTriangle, Clock, TrendingUp, Users, Download, FileSpreadsheet,
  BookOpen, HeartHandshake, Wrench
} from "lucide-react";
import jsPDF from "jspdf";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner, buildLoanNotifications } from "../shared/StageNotificationBanner";
import {
  LOAN_STAGES, STAGE_LABELS, STAGE_COLORS, LEAD_SOURCES, PRIORITY_OPTIONS,
  CALL_STATUSES, LOST_REASONS, normalizeStage, LOAN_TYPES, EMPLOYMENT_TYPES,
  type LoanStage
} from "./LoanStageConfig";
import { LoanDisbursementBook } from "./LoanDisbursementBook";
import { LoanAfterSales } from "./LoanAfterSales";
import { cn } from "@/lib/utils";

// ─── EMI Calculator ───
const EMICalculator = () => {
  const [amount, setAmount] = useState(800000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(60);

  const monthlyRate = rate / 12 / 100;
  const emi = monthlyRate > 0
    ? (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1)
    : amount / tenure;
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - amount;
  const principalPct = amount > 0 ? (amount / totalPayable) * 100 : 0;

  const fmt = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
  const fmtShort = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${Math.round(v)}`;
  };

  // Amortization preview (first 3 + last 3 months)
  const amortizationPreview = useMemo(() => {
    const rows: { month: number; emiAmt: number; principal: number; interest: number; balance: number }[] = [];
    let bal = amount;
    for (let m = 1; m <= tenure; m++) {
      const intPart = bal * monthlyRate;
      const prinPart = emi - intPart;
      bal = Math.max(bal - prinPart, 0);
      if (m <= 3 || m > tenure - 3) {
        rows.push({ month: m, emiAmt: emi, principal: prinPart, interest: intPart, balance: bal });
      }
    }
    return rows;
  }, [amount, monthlyRate, emi, tenure]);

  const handleShareWhatsApp = async () => {
    const msg = `*Car Loan EMI Plan*\n\nLoan Amount: ${fmt(amount)}\nInterest Rate: ${rate}%\nTenure: ${tenure} months\n\n*Monthly EMI: ${fmt(emi)}*\nTotal Interest: ${fmt(totalInterest)}\nTotal Payable: ${fmt(totalPayable)}\n\n_Powered by GrabYourCar_\nwww.grabyourcar.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const boxX = 16;
    const boxW = w - 32;
    const formatRs = (value: number) => `Rs. ${Math.round(value).toLocaleString("en-IN")}`;

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, w, 26, "F");
    doc.setFillColor(5, 150, 105);
    doc.rect(0, 26, w, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text("Car Loan EMI Plan", boxX, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Professional estimate for customer discussion", boxX, 20);
    doc.text("GrabYourCar | www.grabyourcar.com", w - boxX, 20, { align: "right" });

    let y = 38;

    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(boxX, y, boxW, 28, 4, 4, "FD");
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(formatRs(emi), w / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text("Estimated Monthly EMI", w / 2, y + 22, { align: "center" });
    y += 38;

    const rows = [
      ["Loan Amount", formatRs(amount)],
      ["Interest Rate (per annum)", `${rate}%`],
      ["Tenure", `${tenure} months (${(tenure / 12).toFixed(1)} years)`],
      ["Estimated Monthly EMI", formatRs(emi)],
      ["Total Interest Payable", formatRs(totalInterest)],
      ["Total Amount Payable", formatRs(totalPayable)],
    ];

    doc.setFontSize(9);
    rows.forEach(([label, value], i) => {
      const rowY = y + i * 11;
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(boxX, rowY - 4, boxW, 10, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.text(label, boxX + 6, rowY + 2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(value, boxX + boxW - 6, rowY + 2, { align: "right" });
    });

    y += rows.length * 11 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("Documents Required", boxX, y);
    y += 4;

    const columnGap = 8;
    const columnW = (boxW - columnGap) / 2;
    const leftX = boxX;
    const rightX = boxX + columnW + columnGap;
    const listTop = y;

    const drawChecklistCard = (x: number, title: string, items: string[]) => {
      const cardH = 8 + items.length * 5 + 4;
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(x, listTop, columnW, cardH, 3, 3, "FD");
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(x, listTop, columnW, 7, 3, 3, "F");
      doc.rect(x, listTop + 4, columnW, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(title, x + 4, listTop + 5);
      doc.setTextColor(55, 65, 81);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      items.forEach((item, index) => {
        const itemY = listTop + 12 + index * 5;
        doc.circle(x + 4, itemY - 1, 0.8, "S");
        doc.text(item, x + 8, itemY);
      });
      return cardH;
    };

    const individualDocs = [
      "PAN Card",
      "Aadhaar Card",
      "Driving Licence or Passport",
      "3 months bank statement",
      "3 salary slips or ITR",
      "Recent passport-size photo",
    ];
    const corporateDocs = [
      "Company PAN",
      "GST Certificate or Incorporation proof",
      "Authorized signatory KYC",
      "6 months company bank statement",
      "Latest ITR and financials",
      "Address proof of company",
    ];

    const leftH = drawChecklistCard(leftX, "Individual Applicant", individualDocs);
    const rightH = drawChecklistCard(rightX, "Corporate Applicant", corporateDocs);
    y = listTop + Math.max(leftH, rightH) + 8;

    // Terms & Conditions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.text("Terms and Conditions", boxX, y);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.line(boxX, y + 1.5, boxX + 38, y + 1.5);
    doc.setLineWidth(0.2);
    y += 6;

    const terms = [
      "This is an indicative EMI estimate only. Actual EMI, interest rate, and loan amount may vary based on lender policies, applicant credit profile, and prevailing market rates.",
      "Loan approval is subject to verification of documents, credit score assessment, and the lending institution's internal policies.",
      "Processing fees, documentation charges, stamp duty, and GST are applicable as per the respective bank or NBFC norms and are not included in this estimate.",
      "Pre-payment or foreclosure charges may apply as per the lending institution's terms. Borrowers are advised to check the same before availing the loan.",
      "The interest rate quoted is indicative and may change based on RBI guidelines, lender discretion, or applicant risk profile at the time of disbursement.",
      "Insurance (vehicle insurance and/or loan protection plan) may be mandatory as per lender requirements and is not included in the EMI calculation above.",
      "GrabYourCar acts as a loan facilitator and does not directly sanction or disburse loans. All loan decisions are made solely by the partner bank or NBFC.",
      "This estimate is valid for 7 days from the date of generation. Rates and offers are subject to change without prior notice.",
      "By proceeding with the loan application, the applicant consents to credit bureau checks and sharing of personal information with the lending partner.",
      "In case of any dispute, the jurisdiction shall be Gurugram, Haryana, India.",
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);

    terms.forEach((term, i) => {
      const prefix = `${i + 1}. `;
      const lines = doc.splitTextToSize(prefix + term, boxW - 4);
      if (y + lines.length * 3.2 > h - 18) return; // prevent overflow
      doc.text(lines, boxX + 2, y);
      y += lines.length * 3.2 + 1;
    });

    // Footer
    y = h - 14;
    doc.setDrawColor(209, 213, 219);
    doc.line(boxX, y, boxX + boxW, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")} | GrabYourCar | www.grabyourcar.com | +91 98559 24442`, w / 2, y, { align: "center" });
    doc.text("Confidential - For customer discussion purposes only", w / 2, y + 3.5, { align: "center" });

    doc.save(`EMI_Plan_Rs${Math.round(amount / 100000)}L_${tenure}m.pdf`);
    toast.success("EMI plan PDF downloaded!");
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border bg-card">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/8 via-teal-500/5 to-cyan-500/8" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-xl tracking-tight">Car Loan EMI Calculator</h2>
              <p className="text-xs text-muted-foreground">Type values or use sliders • Detailed breakdown below</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10" onClick={handleShareWhatsApp}>
              <Share2 className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
        </div>

        {/* Inputs Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Loan Amount (₹)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value) || 0)}
              className="font-semibold text-base bg-background/60 h-11" placeholder="e.g. 800000" />
            <input type="range" min={100000} max={10000000} step={50000} value={amount}
              onChange={e => setAmount(Number(e.target.value))} className="w-full mt-1.5 accent-emerald-500 h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>₹1L</span><span>₹1Cr</span></div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Interest Rate (% p.a.)</Label>
            <Input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value) || 0)}
              className="font-semibold text-base bg-background/60 h-11" placeholder="e.g. 8.5" />
            <input type="range" min={5} max={20} step={0.1} value={rate}
              onChange={e => setRate(Number(e.target.value))} className="w-full mt-1.5 accent-emerald-500 h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>5%</span><span>20%</span></div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Tenure (Months)</Label>
            <Input type="number" value={tenure} onChange={e => setTenure(Number(e.target.value) || 12)}
              className="font-semibold text-base bg-background/60 h-11" placeholder="e.g. 60" />
            <input type="range" min={12} max={84} step={1} value={tenure}
              onChange={e => setTenure(Number(e.target.value))} className="w-full mt-1.5 accent-emerald-500 h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>12m (1Y)</span><span>84m (7Y)</span></div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Summary Cards */}
          <div className="space-y-4">
            <motion.div key={Math.round(emi)} initial={{ scale: 0.97, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-xl p-5 text-center border border-emerald-500/15">
              <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
              <div className="flex items-center justify-center gap-1">
                <IndianRupee className="h-6 w-6 text-emerald-600" />
                <span className="text-3xl md:text-4xl font-extrabold text-foreground">{Math.round(emi).toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">per month for {tenure} months ({(tenure / 12).toFixed(1)} years)</p>
            </motion.div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="text-center p-3 bg-muted/40 rounded-lg border border-border/40">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Principal</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{fmtShort(amount)}</p>
              </div>
              <div className="text-center p-3 bg-orange-500/5 rounded-lg border border-orange-500/15">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Interest</p>
                <p className="text-sm font-bold text-orange-600 mt-0.5">{fmtShort(totalInterest)}</p>
              </div>
              <div className="text-center p-3 bg-muted/40 rounded-lg border border-border/40">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Payable</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{fmtShort(totalPayable)}</p>
              </div>
            </div>

            {/* Visual bar */}
            <div>
              <div className="h-3.5 rounded-full overflow-hidden bg-muted flex">
                <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${principalPct}%` }} />
                <div className="bg-orange-400 rounded-r-full transition-all" style={{ width: `${100 - principalPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Principal ({principalPct.toFixed(0)}%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Interest ({(100 - principalPct).toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* Right: Amortization Preview Table */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 border-b border-border/40">
              <p className="text-xs font-semibold text-foreground">Amortization Schedule (Preview)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Month</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">EMI</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Principal</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Interest</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {amortizationPreview.map((row, idx) => (
                    <React.Fragment key={row.month}>
                      {idx === 3 && tenure > 6 && (
                        <tr className="border-b border-border/20">
                          <td colSpan={5} className="text-center py-1.5 text-muted-foreground/50 text-xs">⋮ months {4} – {tenure - 3} ⋮</td>
                        </tr>
                      )}
                      <tr className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 font-medium">{row.month}</td>
                        <td className="px-3 py-1.5 text-right">{fmt(row.emiAmt)}</td>
                        <td className="px-3 py-1.5 text-right text-emerald-600">{fmt(row.principal)}</td>
                        <td className="px-3 py-1.5 text-right text-orange-500">{fmt(row.interest)}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{fmt(row.balance)}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Source color map ───
const SOURCE_COLORS: Record<string, string> = {
  meta: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'google ads': 'bg-red-500/10 text-red-600 border-red-500/20',
  referral: 'bg-green-500/10 text-green-600 border-green-500/20',
  'walk-in': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'whatsapp broadcast': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  website: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  manual: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  partner: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'social media': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'csv import': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

// ─── Main Workspace ───
export const LoanWorkspace = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<"pipeline" | "disbursement" | "after_sales" | "bulk_tools">("pipeline");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingApp, setDraggingApp] = useState<any>(null);
  const [newApp, setNewApp] = useState({
    customer_name: '', phone: '', email: '', loan_amount: '', car_model: '',
    down_payment: '', employment_type: '', monthly_income: '', city: '',
    priority: 'medium', source: 'Manual', loan_type: 'new_car_loan', remarks: '',
  });
  const [showImport, setShowImport] = useState(false);

  // Fetch data
  const { data: rawApplications = [] } = useQuery({
    queryKey: ['loan-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: dbBankPartners = [] } = useQuery({
    queryKey: ['loan-bank-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_bank_partners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) {
        console.warn('loan_bank_partners fetch error:', error.message);
        return [];
      }
      return data || [];
    },
  });

  const bankPartners = useMemo(() => {
    if (dbBankPartners.length > 0) return dbBankPartners;
    // Fallback: hardcoded list of major Indian banks & NBFCs
    const defaults = [
      { name: "State Bank of India (SBI)", interest_rate_min: 8.5, interest_rate_max: 10.5 },
      { name: "HDFC Bank", interest_rate_min: 8.5, interest_rate_max: 10.75 },
      { name: "ICICI Bank", interest_rate_min: 8.7, interest_rate_max: 11.0 },
      { name: "Axis Bank", interest_rate_min: 8.75, interest_rate_max: 11.25 },
      { name: "Kotak Mahindra Bank", interest_rate_min: 8.5, interest_rate_max: 10.99 },
      { name: "Bank of Baroda", interest_rate_min: 8.45, interest_rate_max: 10.6 },
      { name: "Punjab National Bank (PNB)", interest_rate_min: 8.65, interest_rate_max: 10.45 },
      { name: "Union Bank of India", interest_rate_min: 8.7, interest_rate_max: 10.9 },
      { name: "Canara Bank", interest_rate_min: 8.65, interest_rate_max: 10.45 },
      { name: "IDFC First Bank", interest_rate_min: 8.75, interest_rate_max: 12.0 },
      { name: "Yes Bank", interest_rate_min: 9.0, interest_rate_max: 12.5 },
      { name: "IndusInd Bank", interest_rate_min: 9.0, interest_rate_max: 13.0 },
      { name: "Federal Bank", interest_rate_min: 9.0, interest_rate_max: 12.0 },
      { name: "Bajaj Finance", interest_rate_min: 9.0, interest_rate_max: 14.0 },
      { name: "Tata Capital", interest_rate_min: 9.25, interest_rate_max: 13.0 },
      { name: "Mahindra Finance", interest_rate_min: 9.5, interest_rate_max: 16.0 },
      { name: "Hero FinCorp", interest_rate_min: 9.5, interest_rate_max: 18.0 },
      { name: "Sundaram Finance", interest_rate_min: 9.0, interest_rate_max: 14.0 },
      { name: "Cholamandalam Finance", interest_rate_min: 9.25, interest_rate_max: 15.0 },
      { name: "HDB Financial Services", interest_rate_min: 10.0, interest_rate_max: 18.0 },
      { name: "Shriram Finance", interest_rate_min: 10.0, interest_rate_max: 18.0 },
      { name: "AU Small Finance Bank", interest_rate_min: 9.5, interest_rate_max: 14.0 },
      { name: "L&T Finance", interest_rate_min: 9.5, interest_rate_max: 14.0 },
    ];
    return defaults.map((b, i) => ({ ...b, id: `default_${i}`, is_active: true, sort_order: i }));
  }, [dbBankPartners]);

  const applications = useMemo(() =>
    rawApplications.map((a: any) => ({ ...a, stage: normalizeStage(a.stage) })),
    [rawApplications]
  );

  const totalApps = applications.length;
  const inPipeline = applications.filter((a: any) => !['disbursed', 'lost'].includes(a.stage)).length;
  const disbursed = applications.filter((a: any) => a.stage === 'disbursed').length;
  const lost = applications.filter((a: any) => a.stage === 'lost').length;
  const totalValue = applications
    .filter((a: any) => a.stage === 'disbursed')
    .reduce((s: number, a: any) => s + (Number(a.disbursement_amount) || Number(a.loan_amount) || 0), 0);

  const loanNotifications = useMemo(() => buildLoanNotifications(applications), [applications]);

  const formatAmount = (amt: number | null) => {
    if (!amt) return '-';
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    return `₹${(amt / 1000).toFixed(0)}K`;
  };

  // Create lead
  const createMutation = useMutation({
    mutationFn: async (app: typeof newApp) => {
      const { error } = await supabase.from('loan_applications').insert({
        customer_name: app.customer_name,
        phone: app.phone.replace(/\D/g, ''),
        loan_amount: app.loan_amount ? Number(app.loan_amount) : null,
        car_model: app.car_model || null,
        priority: app.priority,
        source: app.source,
        loan_type: app.loan_type,
        lead_source_tag: app.source.toLowerCase().replace(/\s/g, '_'),
        remarks: [
          app.remarks,
          app.email ? `Email: ${app.email}` : '',
          app.down_payment ? `Down Payment: ₹${app.down_payment}` : '',
          app.employment_type ? `Employment: ${EMPLOYMENT_TYPES.find(e => e.value === app.employment_type)?.label || app.employment_type}` : '',
          app.monthly_income ? `Income: ₹${app.monthly_income}` : '',
          app.city ? `City: ${app.city}` : '',
        ].filter(Boolean).join(' | ') || null,
        stage: 'new_lead',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Lead added");
      setShowAddDialog(false);
      setNewApp({ customer_name: '', phone: '', email: '', loan_amount: '', car_model: '', down_payment: '', employment_type: '', monthly_income: '', city: '', priority: 'medium', source: 'Manual', loan_type: 'new_car_loan', remarks: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Stage mutations
  const quickMoveMutation = useMutation({
    mutationFn: async ({ appId, fromStage, toStage }: { appId: string; fromStage: string; toStage: string }) => {
      const { error } = await supabase.from('loan_applications')
        .update({ stage: toStage, stage_updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
        .eq('id', appId);
      if (error) throw error;
      await supabase.from('loan_stage_history').insert({
        application_id: appId, from_stage: fromStage, to_stage: toStage,
        remarks: 'Moved via drag & drop',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Stage updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Drag & Drop
  const handleDragStart = useCallback((e: React.DragEvent, app: any) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ id: app.id, stage: app.stage }));
    setDraggingApp(app);
  }, []);
  const handleDragEnd = useCallback(() => { setDraggingApp(null); setDragOverStage(null); }, []);
  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStage(stage);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent, targetStage: LoanStage) => {
    e.preventDefault(); setDragOverStage(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.stage === targetStage) return;
      const app = applications.find((a: any) => a.id === data.id);
      if (!app) return;
      if (['lost', 'disbursed', 'loan_application'].includes(targetStage)) {
        setSelectedApp({ ...app, _targetStage: targetStage });
        setShowStageModal(true);
        return;
      }
      quickMoveMutation.mutate({ appId: app.id, fromStage: app.stage, toStage: targetStage });
    } catch {}
    setDraggingApp(null);
  }, [applications, quickMoveMutation]);

  const handleCardClick = (app: any) => { setSelectedApp(app); setShowStageModal(true); };
  const handleWhatsApp = async (phone: string, name: string) => {
    const msg = `Hi ${name}, this is from GrabYourCar regarding your car loan inquiry. How can I help you today?`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone, message: msg, name, logEvent: "loan_inquiry" });
  };

  const pipelineStages = LOAN_STAGES.filter(s => s !== 'lost');

  const TABS = [
    { key: "pipeline" as const, label: "Lead Pipeline", icon: Banknote, count: totalApps },
    { key: "disbursement" as const, label: "Disbursement Book", icon: BookOpen, count: disbursed },
    { key: "after_sales" as const, label: "After Sales", icon: HeartHandshake, count: 0 },
    { key: "bulk_tools" as const, label: "Bulk Tools", icon: Wrench, count: 0 },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 p-5 sm:p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Banknote className="h-5 w-5" />
              </div>
              Car Loan Workspace
            </h2>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setShowImport(true)} className="gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20">
                <FileSpreadsheet className="h-4 w-4" /> Import
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/20">
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total Leads", value: totalApps, icon: Users, bgc: "bg-blue-500/20" },
              { label: "In Pipeline", value: inPipeline, icon: TrendingUp, bgc: "bg-orange-400/20" },
              { label: "Disbursed", value: disbursed, icon: CheckCircle2, bgc: "bg-emerald-400/20" },
              { label: "Lost", value: lost, icon: XCircle, bgc: "bg-red-400/20" },
              { label: "Total Value", value: formatAmount(totalValue), icon: IndianRupee, bgc: "bg-cyan-400/20" },
            ].map(kpi => (
              <div key={kpi.label} className={`${kpi.bgc} backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10`}>
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="h-4 w-4 text-white/70" />
                  <span className="text-[10px] uppercase tracking-wider text-white/70">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 View Tabs */}
      <div className="flex gap-2 bg-muted/50 p-1 rounded-xl border">
        {TABS.map(tab => (
          <Button key={tab.key} variant={activeView === tab.key ? "default" : "ghost"} size="sm"
            className={cn("flex-1 gap-1.5 text-xs", activeView === tab.key && "shadow-sm")}
            onClick={() => setActiveView(tab.key)}>
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count > 0 && <Badge variant={activeView === tab.key ? "secondary" : "outline"} className="text-[9px] h-4 px-1">{tab.count}</Badge>}
          </Button>
        ))}
      </div>

      {loanNotifications.length > 0 && <StageNotificationBanner items={loanNotifications} />}

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" /> New Car Loan Lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Loan Type *</Label>
              <Select value={newApp.loan_type} onValueChange={v => setNewApp(p => ({ ...p, loan_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOAN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name *</Label><Input value={newApp.customer_name} onChange={e => setNewApp(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Phone *</Label><Input value={newApp.phone} onChange={e => setNewApp(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" value={newApp.email} onChange={e => setNewApp(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label className="text-xs">City</Label><Input value={newApp.city} onChange={e => setNewApp(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Loan Amount</Label><Input type="number" value={newApp.loan_amount} onChange={e => setNewApp(p => ({ ...p, loan_amount: e.target.value }))} /></div>
              <div><Label className="text-xs">Car Model</Label><Input value={newApp.car_model} onChange={e => setNewApp(p => ({ ...p, car_model: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Down Payment</Label><Input type="number" value={newApp.down_payment} onChange={e => setNewApp(p => ({ ...p, down_payment: e.target.value }))} /></div>
              <div><Label className="text-xs">Monthly Income</Label><Input type="number" value={newApp.monthly_income} onChange={e => setNewApp(p => ({ ...p, monthly_income: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Employment Type</Label>
                <Select value={newApp.employment_type} onValueChange={v => setNewApp(p => ({ ...p, employment_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={newApp.priority} onValueChange={v => setNewApp(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Lead Source</Label>
              <Select value={newApp.source} onValueChange={v => setNewApp(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Remarks</Label><Textarea value={newApp.remarks} onChange={e => setNewApp(p => ({ ...p, remarks: e.target.value }))} rows={2} /></div>
            <Button onClick={() => createMutation.mutate(newApp)} disabled={!newApp.customer_name || !newApp.phone || createMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Create Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <LeadImportDialog
        open={showImport} onOpenChange={setShowImport} title="Import Loan Leads"
        templateColumns={["name", "phone", "loan_amount", "car_model", "source"]}
        onImport={async (leads) => {
          const rows = leads.map(l => ({
            customer_name: l.name || l.customer_name || "Unknown",
            phone: (l.phone || l.mobile || "").replace(/\D/g, ""),
            loan_amount: l.loan_amount ? Number(l.loan_amount) : null,
            car_model: l.car_model || null,
            source: l.source || "CSV Import",
            lead_source_tag: "csv_import",
            stage: "new_lead" as const,
            priority: "medium",
          }));
          const { error } = await supabase.from("loan_applications").insert(rows);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["loan-applications"] });
        }}
      />

      {/* Tab Content */}
      {activeView === "pipeline" && (
        <>
          <EMICalculator />

          {/* Drag hint */}
          {draggingApp && (
            <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
              Drop on a stage to move <strong>{draggingApp.customer_name}</strong>
            </div>
          )}

          {/* Kanban Board */}
          <ScrollArea className="w-full">
            <div className="flex min-w-max">
              {pipelineStages.map((stage, colIdx) => {
                const stageApps = applications.filter((a: any) => a.stage === stage);
                const stageValue = stageApps.reduce((s: number, a: any) => s + (Number(a.loan_amount) || 0), 0);
                const isDragOver = dragOverStage === stage;
                const showDropIndicator = draggingApp && isDragOver;

                return (
                  <div key={stage}
                    className={`w-[280px] shrink-0 flex flex-col ${colIdx > 0 ? 'border-l border-border/40' : ''}`}
                    onDragOver={e => handleDragOver(e, stage)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, stage)}>
                    <div className={`mx-1.5 rounded-lg border p-2.5 mb-2 transition-all ${STAGE_COLORS[stage]} ${showDropIndicator ? 'ring-2 ring-primary scale-[1.02] shadow-lg' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-xs">{STAGE_LABELS[stage]}</span>
                        <Badge variant="secondary" className="text-[10px] h-5">{stageApps.length}</Badge>
                      </div>
                      {stageValue > 0 && <p className="text-[10px] mt-1 opacity-70">₹{(stageValue / 100000).toFixed(1)}L</p>}
                    </div>
                    <div className={`flex-1 px-1.5 pb-2 min-h-[120px] transition-all ${showDropIndicator ? 'bg-primary/5' : ''}`}>
                      {stageApps.length === 0 && !showDropIndicator && (
                        <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 py-8">No leads</div>
                      )}
                      {showDropIndicator && stageApps.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[11px] text-primary/60 py-8 font-medium">Drop here ✓</div>
                      )}
                      {stageApps.map((app: any, cardIdx: number) => (
                        <div key={app.id} className={cardIdx > 0 ? 'border-t border-border/30 pt-2 mt-2' : ''}>
                          <LoanCard app={app} stage={stage}
                            onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                            onClick={handleCardClick} onWhatsApp={handleWhatsApp}
                            isDragging={draggingApp?.id === app.id} formatAmount={formatAmount} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Lost Column */}
              <div className="w-[280px] shrink-0 flex flex-col border-l border-border/40"
                onDragOver={e => handleDragOver(e, 'lost')}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, 'lost')}>
                <div className={`mx-1.5 rounded-lg border p-2.5 mb-2 transition-all ${STAGE_COLORS['lost']} ${dragOverStage === 'lost' && draggingApp ? 'ring-2 ring-red-500 scale-[1.02] shadow-lg' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs">Lost</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{lost}</Badge>
                  </div>
                </div>
                <div className={`flex-1 px-1.5 pb-2 min-h-[120px] transition-all ${dragOverStage === 'lost' && draggingApp ? 'bg-red-500/5' : ''}`}>
                  {applications.filter((a: any) => a.stage === 'lost').slice(0, 5).map((app: any, i: number) => (
                    <div key={app.id} className={i > 0 ? 'border-t border-border/30 pt-2 mt-2' : ''}>
                      <LoanCard app={app} stage="lost"
                        onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                        onClick={handleCardClick} onWhatsApp={handleWhatsApp}
                        isDragging={draggingApp?.id === app.id} formatAmount={formatAmount} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </>
      )}

      {activeView === "disbursement" && <LoanDisbursementBook applications={applications} />}
      {activeView === "after_sales" && <LoanAfterSales applications={applications} />}
      {activeView === "bulk_tools" && (
        <div className="text-center py-12">
          <Wrench className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Use the Import button above to bulk import leads via CSV</p>
        </div>
      )}

      {/* Stage Detail Modal */}
      {selectedApp && (
        <LoanStageDetailModal
          open={showStageModal} onOpenChange={setShowStageModal}
          application={selectedApp} bankPartners={bankPartners}
        />
      )}
    </div>
  );
};

// ─── Lead Card ───
const LoanCard = ({ app, stage, onDragStart, onDragEnd, onClick, onWhatsApp, isDragging, formatAmount }: any) => {
  const loanTypeInfo = LOAN_TYPES.find(t => t.value === app.loan_type);

  return (
    <Card draggable onDragStart={(e: React.DragEvent) => onDragStart(e, app)} onDragEnd={onDragEnd}
      className={`border-border/40 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isDragging ? 'opacity-30 scale-95' : ''}`}
      onClick={() => onClick(app)}>
      <CardContent className="p-2.5 space-y-1.5">
        {/* Name + Priority */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0" />
            <span className="font-medium text-xs truncate max-w-[150px]">{app.customer_name}</span>
          </div>
          {app.priority && (
            <Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${PRIORITY_OPTIONS.find((o: any) => o.value === app.priority)?.color || ''}`}>
              {app.priority === 'hot' ? '🔥' : ''} {app.priority}
            </Badge>
          )}
        </div>

        {/* Loan Type Badge */}
        {loanTypeInfo && (
          <Badge className={`text-[8px] px-1.5 py-0 ${loanTypeInfo.color}`}>{loanTypeInfo.label}</Badge>
        )}

        {/* Phone + Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-2.5 w-2.5" />{app.phone}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e: React.MouseEvent) => { e.stopPropagation(); window.open(`tel:+91${app.phone.replace(/\D/g, '').slice(-10)}`, '_self'); }}>
              <PhoneCall className="h-3 w-3 text-emerald-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onWhatsApp(app.phone, app.customer_name); }}>
              <MessageCircle className="h-3 w-3 text-green-600" />
            </Button>
          </div>
        </div>

        {/* Amount + Car */}
        <div className="flex items-center gap-3">
          {app.loan_amount && (
            <div className="flex items-center gap-1 text-[11px]">
              <IndianRupee className="h-2.5 w-2.5 text-emerald-500" />
              <span className="font-semibold">{formatAmount(app.loan_amount)}</span>
            </div>
          )}
          {app.car_model && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Car className="h-2.5 w-2.5" />{app.car_model}
            </div>
          )}
        </div>

        {/* Source badge */}
        {app.source && (
          <Badge variant="outline" className={`text-[8px] px-1.5 py-0 ${SOURCE_COLORS[app.source.toLowerCase()] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
            {app.source}
          </Badge>
        )}

        {/* Stage-specific info */}
        {stage === 'smart_calling' && app.call_status && (
          <Badge variant="outline" className="text-[9px]">{app.call_status}</Badge>
        )}
        {stage === 'offer_shared' && app.lender_name && (
          <div className="text-[10px] text-violet-600 flex items-center gap-1">
            <Building2 className="h-2.5 w-2.5" /> {app.lender_name}
          </div>
        )}
        {stage === 'loan_application' && (
          <Badge variant="outline" className={`text-[9px] ${app.sanction_amount ? 'border-green-500/30 text-green-600' : 'border-amber-500/30 text-amber-600'}`}>
            {app.sanction_amount ? `Approved ₹${(app.sanction_amount / 100000).toFixed(1)}L` : 'Pending'}
          </Badge>
        )}
        {stage === 'disbursed' && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
            <CheckCircle2 className="h-2.5 w-2.5" />
            {app.disbursement_amount ? formatAmount(app.disbursement_amount) : 'Disbursed'}
            {app.incentive_eligible && <Badge className="text-[8px] bg-green-500/10 text-green-600 ml-1">Incentive ✓</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Stage Detail Modal ───
const LoanStageDetailModal = ({ open, onOpenChange, application, bankPartners }: any) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [targetStage, setTargetStage] = useState<string>(application?._targetStage || '');
  const [remarks, setRemarks] = useState('');
  const [callStatus, setCallStatus] = useState(application?.call_status || '');
  const [callRemarks, setCallRemarks] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [lostRemarks, setLostRemarks] = useState('');
  const [selectedBank, setSelectedBank] = useState(application?.bank_partner_id || '');
  const [customBankName, setCustomBankName] = useState('');
  const [interestRate, setInterestRate] = useState(application?.interest_rate?.toString() || '');
  const [tenureMonths, setTenureMonths] = useState(application?.tenure_months?.toString() || '');
  const [emiAmount, setEmiAmount] = useState(application?.emi_amount?.toString() || '');
  const [sanctionAmount, setSanctionAmount] = useState(application?.sanction_amount?.toString() || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loanStatus, setLoanStatus] = useState<string>(application?.sanction_amount ? 'approved' : '');
  const [disbAmount, setDisbAmount] = useState(application?.disbursement_amount?.toString() || '');
  const [disbDate, setDisbDate] = useState(application?.disbursement_date || '');
  const [disbBank, setDisbBank] = useState(application?.lender_name || '');

  const currentStage = application?.stage || 'new_lead';
  const loanTypeInfo = LOAN_TYPES.find(t => t.value === application?.loan_type);

  const formatAmount = (amt: number | null) => {
    if (!amt) return '-';
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    return `₹${(amt / 1000).toFixed(0)}K`;
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from('loan_applications')
        .update({ ...updates, last_activity_at: new Date().toISOString(), stage_updated_at: new Date().toISOString() })
        .eq('id', application.id);
      if (error) throw error;
      if (updates.stage && updates.stage !== currentStage) {
        await supabase.from('loan_stage_history').insert({
          application_id: application.id, from_stage: currentStage, to_stage: updates.stage,
          changed_by: user?.id, remarks: updates.remarks || remarks || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Updated successfully");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSmartCallingSave = () => {
    if (!callStatus) { toast.error("Select a call status"); return; }
    if (!callRemarks.trim()) { toast.error("Remarks are mandatory"); return; }
    const nextStage = callStatus === 'Interested' ? 'interested' : callStatus === 'Not Interested' ? 'lost' : currentStage;
    const updates: any = { call_status: callStatus, call_remarks: callRemarks, remarks: callRemarks, stage: nextStage };
    if (nextStage === 'lost') { updates.lost_reason = 'Customer not responding'; updates.lost_remarks = callRemarks; }
    updateMutation.mutate(updates);
  };

  const handleOfferSave = () => {
    const isCustom = selectedBank === '__custom__';
    if (!selectedBank) { toast.error("Select a bank partner"); return; }
    if (isCustom && !customBankName.trim()) { toast.error("Enter custom bank/NBFC name"); return; }
    const bankName = isCustom ? customBankName.trim() : (bankPartners.find((b: any) => b.id === selectedBank)?.name || '');
    updateMutation.mutate({
      bank_partner_id: isCustom ? null : selectedBank,
      lender_name: bankName,
      interest_rate: interestRate ? Number(interestRate) : null,
      tenure_months: tenureMonths ? Number(tenureMonths) : null,
      emi_amount: emiAmount ? Number(emiAmount) : null,
      stage: 'offer_shared',
      remarks: remarks || `Offer shared: ${bankName}`,
    });
  };

  const handleLoanAppSave = () => {
    if (!loanStatus) { toast.error("Select loan status"); return; }
    if (loanStatus === 'rejected' && !rejectionReason.trim()) { toast.error("Rejection reason required"); return; }
    if (loanStatus === 'approved' && !sanctionAmount) { toast.error("Sanction amount required"); return; }
    const updates: any = {
      stage: loanStatus === 'approved' ? 'loan_application' : 'lost',
      remarks: remarks || (loanStatus === 'approved' ? `Approved: ₹${sanctionAmount}` : `Rejected: ${rejectionReason}`),
    };
    if (loanStatus === 'approved') { updates.sanction_amount = Number(sanctionAmount); updates.sanction_date = new Date().toISOString(); }
    else { updates.rejection_reason = rejectionReason; updates.lost_reason = 'Loan not approved'; updates.lost_remarks = rejectionReason; }
    updateMutation.mutate(updates);
  };

  const handleDisbursedSave = () => {
    if (!disbAmount || !disbDate || !disbBank) { toast.error("All disbursement details required"); return; }
    updateMutation.mutate({
      stage: 'disbursed', disbursement_amount: Number(disbAmount), disbursement_date: disbDate,
      lender_name: disbBank, incentive_eligible: true, converted_at: new Date().toISOString(),
      remarks: `Disbursed: ₹${disbAmount} via ${disbBank}`,
    });
  };

  const handleLostSave = () => {
    if (!lostReason) { toast.error("Select lost reason"); return; }
    if (!lostRemarks.trim()) { toast.error("Remarks required"); return; }
    updateMutation.mutate({ stage: 'lost', lost_reason: lostReason, lost_remarks: lostRemarks });
  };

  const handleMoveStage = (stage: string) => {
    updateMutation.mutate({ stage, remarks: remarks || `Moved to ${STAGE_LABELS[stage as LoanStage]}` });
  };

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${STAGE_COLORS[currentStage as LoanStage] || ''}`}>
              <Banknote className="h-4 w-4" />
            </div>
            {application.customer_name}
            <Badge className={`text-[10px] ${STAGE_COLORS[currentStage as LoanStage] || ''}`}>
              {STAGE_LABELS[currentStage as LoanStage] || currentStage}
            </Badge>
            {loanTypeInfo && <Badge className={`text-[9px] ${loanTypeInfo.color}`}>{loanTypeInfo.label}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Info Card */}
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground">Client ID</p>
                  <p className="font-mono text-xs font-semibold">{application.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Phone</p>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-xs">{application.phone}</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => window.open(`tel:+91${application.phone.replace(/\D/g, '').slice(-10)}`)}>
                      <PhoneCall className="h-3 w-3 text-emerald-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={async () => {
                      const msg = `Hi ${application.customer_name}, this is from GrabYourCar regarding your car loan. How can I help?`;
                      const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
                      await sendWhatsApp({ phone: application.phone, message: msg, name: application.customer_name, logEvent: "loan_followup" });
                    }}>
                      <MessageCircle className="h-3 w-3 text-green-600" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Loan Amount</p>
                  <p className="font-semibold text-xs">{formatAmount(application.loan_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Car</p>
                  <p className="text-xs">{application.car_model || '—'}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {application.source && <Badge variant="outline" className="text-[9px]">Source: {application.source}</Badge>}
                {loanTypeInfo && <Badge variant="outline" className={`text-[9px] ${loanTypeInfo.color}`}>{loanTypeInfo.label}</Badge>}
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          {application.remarks && (
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Remarks History</p>
              <div className="bg-muted/30 rounded p-2 text-xs whitespace-pre-wrap max-h-24 overflow-y-auto">{application.remarks}</div>
            </div>
          )}

          {/* SMART CALLING — only for new_lead & smart_calling */}
          {(currentStage === 'new_lead' || currentStage === 'smart_calling') && (
            <div className="space-y-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium"><PhoneCall className="h-4 w-4" /> Smart Calling</div>
              <div>
                <Label>Call Status *</Label>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>{CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Remarks *</Label><Textarea value={callRemarks} onChange={e => setCallRemarks(e.target.value)} placeholder="Call notes..." rows={2} /></div>
              <Button onClick={handleSmartCallingSave} disabled={updateMutation.isPending} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                {updateMutation.isPending ? "Saving..." : "Save & Update Status"}
              </Button>
            </div>
          )}

          {/* OFFER SHARED — only for interested & offer_shared */}
          {(currentStage === 'interested' || currentStage === 'offer_shared') && (
            <div className="space-y-3 p-4 rounded-lg border border-violet-500/20 bg-violet-500/5">
              <div className="flex items-center gap-2 text-violet-700 text-sm font-medium"><Building2 className="h-4 w-4" /> Share Offer — Bank Partners</div>
              <div>
                <Label>Select Bank/NBFC *</Label>
                <Select value={selectedBank} onValueChange={(v) => { setSelectedBank(v); if (v !== '__custom__') setCustomBankName(''); }}>
                  <SelectTrigger><SelectValue placeholder="Choose bank partner" /></SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {bankPartners.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} {b.interest_rate_min ? `(${b.interest_rate_min}%-${b.interest_rate_max}%)` : ''}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Add Custom Bank/NBFC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedBank === '__custom__' && (
                <div>
                  <Label>Custom Bank/NBFC Name *</Label>
                  <Input placeholder="Enter bank or NBFC name" value={customBankName} onChange={e => setCustomBankName(e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Interest %</Label><Input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} /></div>
                <div><Label>Tenure (months)</Label><Input type="number" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} /></div>
                <div><Label>EMI Amount</Label><Input type="number" value={emiAmount} onChange={e => setEmiAmount(e.target.value)} /></div>
              </div>
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Offer details..." rows={2} /></div>
              <Button onClick={handleOfferSave} disabled={updateMutation.isPending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                {updateMutation.isPending ? "Saving..." : "Save Offer Details"}
              </Button>
            </div>
          )}

          {/* LOAN APPLICATION — only for loan_application stage */}
          {(currentStage === 'loan_application' || application._targetStage === 'loan_application') && (
            <div className="space-y-3 p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-center gap-2 text-indigo-700 text-sm font-medium"><FileText className="h-4 w-4" /> Loan Application Status</div>
              <div>
                <Label>Loan Status *</Label>
                <Select value={loanStatus} onValueChange={setLoanStatus}>
                  <SelectTrigger><SelectValue placeholder="Approved or Rejected?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">✅ Approved</SelectItem>
                    <SelectItem value="rejected">❌ Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loanStatus === 'approved' && <div><Label>Sanction Amount *</Label><Input type="number" value={sanctionAmount} onChange={e => setSanctionAmount(e.target.value)} placeholder="e.g. 750000" /></div>}
              {loanStatus === 'rejected' && <div><Label>Rejection Reason *</Label><Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Why was loan rejected?" rows={2} /></div>}
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} /></div>
              <Button onClick={handleLoanAppSave} disabled={!loanStatus || updateMutation.isPending}
                className={`w-full ${loanStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}>
                {updateMutation.isPending ? "Saving..." : loanStatus === 'rejected' ? 'Mark as Rejected (Lost)' : 'Save Approval'}
              </Button>
            </div>
          )}

          {/* DISBURSED — only for disbursed stage or when explicitly targeting it */}
          {(currentStage === 'disbursed' || application._targetStage === 'disbursed') && (
            <div className="space-y-3 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium"><CheckCircle2 className="h-4 w-4" /> Disbursement Details</div>
              {currentStage === 'disbursed' && application.incentive_eligible && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✅ Incentive Eligible</Badge>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Disbursement Amount *</Label><Input type="number" value={disbAmount} onChange={e => setDisbAmount(e.target.value)} /></div>
                <div><Label>Disbursement Date *</Label><Input type="date" value={disbDate} onChange={e => setDisbDate(e.target.value)} /></div>
              </div>
              <div><Label>Bank Name *</Label><Input value={disbBank} onChange={e => setDisbBank(e.target.value)} placeholder="e.g. HDFC Bank" /></div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded bg-background border"><p className="text-muted-foreground">Car</p><p className="font-medium">{application.car_model || '—'}</p></div>
                <div className="p-2 rounded bg-background border"><p className="text-muted-foreground">Sanction Amount</p><p className="font-medium">{application.sanction_amount ? `₹${(application.sanction_amount / 100000).toFixed(1)}L` : '-'}</p></div>
              </div>
              <div><Label>Remarks</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} /></div>
              {currentStage !== 'disbursed' && (
                <Button onClick={handleDisbursedSave} disabled={updateMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  {updateMutation.isPending ? "Saving..." : "Complete Disbursement & Enable Incentive"}
                </Button>
              )}
            </div>
          )}

          {/* LOST */}
          {(application._targetStage === 'lost' || currentStage === 'lost') && currentStage !== 'lost' && (
            <div className="space-y-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium"><AlertTriangle className="h-4 w-4" /> Mark as Lost</div>
              <div>
                <Label>Lost Reason *</Label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>{LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Detailed Remarks *</Label><Textarea value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} placeholder="Why was this lead lost?" rows={3} /></div>
              <Button onClick={handleLostSave} disabled={updateMutation.isPending} variant="destructive" className="w-full">
                {updateMutation.isPending ? "Saving..." : "Mark as Lost"}
              </Button>
            </div>
          )}

          {/* Quick Move Buttons */}
          {!application._targetStage && currentStage !== 'disbursed' && currentStage !== 'lost' && (
            <div className="border-t pt-3">
              <p className="text-[10px] text-muted-foreground mb-2">Quick Move to Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {LOAN_STAGES.filter(s => s !== currentStage).map(s => (
                  <Button key={s} variant="outline" size="sm" className={`text-[10px] h-7 ${STAGE_COLORS[s]}`}
                    onClick={() => {
                      if (s === 'lost' || s === 'disbursed' || s === 'loan_application') setTargetStage(s);
                      else handleMoveStage(s);
                    }}>
                    {STAGE_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
