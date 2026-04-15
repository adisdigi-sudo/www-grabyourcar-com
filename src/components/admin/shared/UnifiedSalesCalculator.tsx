import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UnifiedSalesCalculatorProps {
  finalCarPrice: string;
  setFinalCarPrice: (v: string) => void;
  grossLoanAmount: string;
  setGrossLoanAmount: (v: string) => void;
  loanProtectionAmount: string;
  setLoanProtectionAmount: (v: string) => void;
  processingFees: string;
  setProcessingFees: (v: string) => void;
  otherCharges: string;
  setOtherCharges: (v: string) => void;
  otherChargesLabel: string;
  setOtherChargesLabel: (v: string) => void;
  bookingAmount: string;
  setBookingAmount: (v: string) => void;
  advancePaid: string;
  setAdvancePaid: (v: string) => void;
  breakdown: {
    finalCarPrice: number;
    grossLoanAmount: number;
    loanProtectionAmount: number;
    processingFees: number;
    otherCharges: number;
    bankDeductionsTotal: number;
    bankNetDisbursal: number;
    downPaymentNeeded: number;
    bookingAmount: number;
    advancePaid: number;
    totalAlreadyPaid: number;
    balancePayableByYou: number;
    totalCustomerContribution: number;
  };
}

const fmtINR = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

export function UnifiedSalesCalculator({
  finalCarPrice,
  setFinalCarPrice,
  grossLoanAmount,
  setGrossLoanAmount,
  loanProtectionAmount,
  setLoanProtectionAmount,
  processingFees,
  setProcessingFees,
  otherCharges,
  setOtherCharges,
  otherChargesLabel,
  setOtherChargesLabel,
  bookingAmount,
  setBookingAmount,
  advancePaid,
  setAdvancePaid,
  breakdown,
}: UnifiedSalesCalculatorProps) {
  return (
    <div className="space-y-3">
      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[10px]">Final Car Price (On-Road) *</Label><Input type="number" value={finalCarPrice} onChange={e => setFinalCarPrice(e.target.value)} placeholder="e.g. 1650000" /></div>
        <div><Label className="text-[10px]">Gross Loan Amount *</Label><Input type="number" value={grossLoanAmount} onChange={e => setGrossLoanAmount(e.target.value)} placeholder="e.g. 1435000" /></div>
        <div><Label className="text-[10px]">Loan Suraksha / Insurance</Label><Input type="number" value={loanProtectionAmount} onChange={e => setLoanProtectionAmount(e.target.value)} placeholder="e.g. 10112" /></div>
        <div><Label className="text-[10px]">Processing Fees</Label><Input type="number" value={processingFees} onChange={e => setProcessingFees(e.target.value)} placeholder="e.g. 3000" /></div>
        <div><Label className="text-[10px]">{otherChargesLabel || 'Other Bank Charges'}</Label><Input type="number" value={otherCharges} onChange={e => setOtherCharges(e.target.value)} placeholder="e.g. 0" /></div>
        <div><Label className="text-[10px]">Other Charge Label</Label><Input value={otherChargesLabel} onChange={e => setOtherChargesLabel(e.target.value)} placeholder="e.g. File Charges" /></div>
        <div><Label className="text-[10px]">Booking / Token Paid</Label><Input type="number" value={bookingAmount} onChange={e => setBookingAmount(e.target.value)} placeholder="e.g. 51000" /></div>
        <div><Label className="text-[10px]">Advance / Any Amount Paid</Label><Input type="number" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)} placeholder="e.g. 25000" /></div>
      </div>

      {/* Receipt-style Breakdown */}
      {(breakdown.finalCarPrice > 0 || breakdown.grossLoanAmount > 0) && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5 text-sm">
          {/* SECTION A: Car Price */}
          <p className="text-[10px] text-violet-600 font-semibold uppercase tracking-wider mb-1">
            Section A: Car Price Summary
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">On-Road / Total Car Price</span>
            <span className="font-semibold">{fmtINR(breakdown.finalCarPrice)}</span>
          </div>

          {/* SECTION B: Bank Loan Breakdown */}
          <p className="text-[10px] text-violet-600 font-semibold uppercase tracking-wider mt-3 mb-1">
            Section B: Bank Loan Breakdown
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Gross Loan Amount</span>
            <span className="font-medium">{fmtINR(breakdown.grossLoanAmount)}</span>
          </div>
          {breakdown.processingFees > 0 && (
            <div className="flex items-center justify-between gap-3 text-red-600">
              <span>Less: Processing Fees</span>
              <span>- {fmtINR(breakdown.processingFees)}</span>
            </div>
          )}
          {breakdown.loanProtectionAmount > 0 && (
            <div className="flex items-center justify-between gap-3 text-red-600">
              <span>Less: Loan Suraksha / Insurance</span>
              <span>- {fmtINR(breakdown.loanProtectionAmount)}</span>
            </div>
          )}
          {breakdown.otherCharges > 0 && (
            <div className="flex items-center justify-between gap-3 text-red-600">
              <span>Less: {otherChargesLabel || 'Other Bank Charges'}</span>
              <span>- {fmtINR(breakdown.otherCharges)}</span>
            </div>
          )}
          <div className="border-t border-border/60 pt-1.5 flex items-center justify-between gap-3 font-semibold text-violet-700">
            <span>Bank Net Disbursal</span>
            <span>{fmtINR(breakdown.bankNetDisbursal)}</span>
          </div>

          {/* SECTION C: Customer Payment */}
          <p className="text-[10px] text-violet-600 font-semibold uppercase tracking-wider mt-3 mb-1">
            Section C: Customer Payment Breakdown
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Down Payment (auto = Price − Disbursal)</span>
            <span className="font-medium">{fmtINR(breakdown.downPaymentNeeded)}</span>
          </div>
          {breakdown.bookingAmount > 0 && (
            <div className="flex items-center justify-between gap-3 text-emerald-600">
              <span>Less: Booking / Token Paid</span>
              <span>- {fmtINR(breakdown.bookingAmount)}</span>
            </div>
          )}
          {breakdown.advancePaid > 0 && (
            <div className="flex items-center justify-between gap-3 text-emerald-600">
              <span>Less: Advance Paid</span>
              <span>- {fmtINR(breakdown.advancePaid)}</span>
            </div>
          )}
          <div className="border-t-2 border-violet-500/30 pt-2 flex items-center justify-between gap-3 font-bold text-primary text-base">
            <span>💰 Final Balance Payable</span>
            <span>{fmtINR(breakdown.balancePayableByYou)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Total Customer Pocket (Booking + Advance + Balance)</span>
            <span>{fmtINR(breakdown.totalCustomerContribution)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
