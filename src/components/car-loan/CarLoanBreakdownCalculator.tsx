import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import { calculateLoanSalesBreakdown } from "@/components/admin/loans/loanSalesCalculator";

const fmtINR = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export const CarLoanBreakdownCalculator = () => {
  const [finalCarPrice, setFinalCarPrice] = useState("1650000");
  const [grossLoanAmount, setGrossLoanAmount] = useState("1435000");
  const [loanProtectionAmount, setLoanProtectionAmount] = useState("10112");
  const [processingFees, setProcessingFees] = useState("3000");
  const [otherCharges, setOtherCharges] = useState("0");
  const [otherChargesLabel, setOtherChargesLabel] = useState("");
  const [bookingAmount, setBookingAmount] = useState("51000");
  const [advancePaid, setAdvancePaid] = useState("0");

  const breakdown = useMemo(
    () =>
      calculateLoanSalesBreakdown({
        finalCarPrice,
        grossLoanAmount,
        loanProtectionAmount,
        processingFees,
        otherCharges,
        bookingAmount,
        advancePaid,
      }),
    [finalCarPrice, grossLoanAmount, loanProtectionAmount, processingFees, otherCharges, bookingAmount, advancePaid],
  );

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3 border-primary/30">
            <Calculator className="w-3.5 h-3.5 mr-1.5" />
            Loan Breakdown Calculator
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            Know Your Exact Balance Payable
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enter your car price and loan details — we'll show processing fees, bank deductions, and your final out-of-pocket amount.
          </p>
        </div>

        <Card className="border-0 shadow-xl max-w-4xl mx-auto overflow-hidden">
          <CardContent className="p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-10">
              {/* Input Fields */}
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium">On-Road / Total Car Price *</Label>
                  <Input type="number" className="mt-1.5" value={finalCarPrice} onChange={e => setFinalCarPrice(e.target.value)} placeholder="e.g. 1650000" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Gross Loan Amount (Sanction) *</Label>
                  <Input type="number" className="mt-1.5" value={grossLoanAmount} onChange={e => setGrossLoanAmount(e.target.value)} placeholder="e.g. 1435000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Processing Fees</Label>
                    <Input type="number" className="mt-1" value={processingFees} onChange={e => setProcessingFees(e.target.value)} placeholder="e.g. 3000" />
                  </div>
                  <div>
                    <Label className="text-xs">Loan Suraksha / Insurance</Label>
                    <Input type="number" className="mt-1" value={loanProtectionAmount} onChange={e => setLoanProtectionAmount(e.target.value)} placeholder="e.g. 10112" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{otherChargesLabel || "Other Bank Charges"}</Label>
                    <Input type="number" className="mt-1" value={otherCharges} onChange={e => setOtherCharges(e.target.value)} placeholder="e.g. 0" />
                  </div>
                  <div>
                    <Label className="text-xs">Other Charge Label</Label>
                    <Input className="mt-1" value={otherChargesLabel} onChange={e => setOtherChargesLabel(e.target.value)} placeholder="e.g. File Charges" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Booking / Token Paid</Label>
                    <Input type="number" className="mt-1" value={bookingAmount} onChange={e => setBookingAmount(e.target.value)} placeholder="e.g. 51000" />
                  </div>
                  <div>
                    <Label className="text-xs">Advance / Any Amount Paid</Label>
                    <Input type="number" className="mt-1" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)} placeholder="e.g. 25000" />
                  </div>
                </div>
              </div>

              {/* Receipt-style Breakdown */}
              <div className="flex flex-col justify-center">
                {(breakdown.finalCarPrice > 0 || breakdown.grossLoanAmount > 0) && (
                  <motion.div
                    key={`${breakdown.balancePayableByYou}-${breakdown.bankNetDisbursal}`}
                    initial={{ opacity: 0.5, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    {/* Section A */}
                    <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">
                      Section A: Car Price Summary
                    </p>
                    <div className="flex items-center justify-between gap-3 py-1">
                      <span className="text-muted-foreground text-sm">On-Road / Total Car Price</span>
                      <span className="font-semibold text-foreground">{fmtINR(breakdown.finalCarPrice)}</span>
                    </div>

                    {/* Section B */}
                    <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-4 mb-1">
                      Section B: Bank Loan Breakdown
                    </p>
                    <div className="flex items-center justify-between gap-3 py-1">
                      <span className="text-muted-foreground text-sm">Gross Loan Amount</span>
                      <span className="font-medium text-foreground">{fmtINR(breakdown.grossLoanAmount)}</span>
                    </div>
                    {breakdown.processingFees > 0 && (
                      <div className="flex items-center justify-between gap-3 py-0.5 text-destructive text-sm">
                        <span>Less: Processing Fees</span>
                        <span>- {fmtINR(breakdown.processingFees)}</span>
                      </div>
                    )}
                    {breakdown.loanProtectionAmount > 0 && (
                      <div className="flex items-center justify-between gap-3 py-0.5 text-destructive text-sm">
                        <span>Less: Loan Suraksha / Insurance</span>
                        <span>- {fmtINR(breakdown.loanProtectionAmount)}</span>
                      </div>
                    )}
                    {breakdown.otherCharges > 0 && (
                      <div className="flex items-center justify-between gap-3 py-0.5 text-destructive text-sm">
                        <span>Less: {otherChargesLabel || "Other Bank Charges"}</span>
                        <span>- {fmtINR(breakdown.otherCharges)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex items-center justify-between gap-3 font-semibold text-primary">
                      <span>Bank Net Disbursal</span>
                      <span>{fmtINR(breakdown.bankNetDisbursal)}</span>
                    </div>

                    {/* Section C */}
                    <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-4 mb-1">
                      Section C: Customer Payment
                    </p>
                    <div className="flex items-center justify-between gap-3 py-1">
                      <span className="text-muted-foreground text-sm">Down Payment (auto = Price − Disbursal)</span>
                      <span className="font-medium text-foreground">{fmtINR(breakdown.downPaymentNeeded)}</span>
                    </div>
                    {breakdown.bookingAmount > 0 && (
                      <div className="flex items-center justify-between gap-3 py-0.5 text-emerald-600 text-sm">
                        <span>Less: Booking / Token Paid</span>
                        <span>- {fmtINR(breakdown.bookingAmount)}</span>
                      </div>
                    )}
                    {breakdown.advancePaid > 0 && (
                      <div className="flex items-center justify-between gap-3 py-0.5 text-emerald-600 text-sm">
                        <span>Less: Advance Paid</span>
                        <span>- {fmtINR(breakdown.advancePaid)}</span>
                      </div>
                    )}

                    {/* Final Balance */}
                    <div className="border-t-2 border-primary/30 pt-3 mt-2">
                      <div className="bg-primary/10 rounded-xl p-4 flex items-center justify-between border border-primary/10">
                        <div className="flex items-center gap-2">
                          <IndianRupee className="w-5 h-5 text-foreground" />
                          <span className="font-bold text-foreground">Final Balance Payable</span>
                        </div>
                        <span className="text-2xl font-extrabold text-foreground">{fmtINR(breakdown.balancePayableByYou)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Total from your pocket: {fmtINR(breakdown.totalCustomerContribution)} (Booking + Advance + Balance)
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          * This is an indicative breakup. Actual amounts may vary based on bank terms and charges.
        </p>
      </div>
    </section>
  );
};
