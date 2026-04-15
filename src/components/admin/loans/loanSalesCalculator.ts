type LoanSalesCalculatorSource = {
  offer_details?: unknown;
  down_payment?: number | null;
  loan_amount?: number | null;
  sanction_amount?: number | null;
  processing_fee?: number | null;
};

type LoanSalesCalculatorInput = {
  finalCarPrice?: number | string | null;
  bookingAmount?: number | string | null;
  grossLoanAmount?: number | string | null;
  loanProtectionAmount?: number | string | null;
  processingFees?: number | string | null;
  otherCharges?: number | string | null;
};

const toMoney = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    return Math.max(fallback, 0);
  }

  return Math.max(Number(parsed), 0);
};

const getSalesCalculatorObject = (source: LoanSalesCalculatorSource) => {
  const offerDetails = source?.offer_details;

  if (!offerDetails || typeof offerDetails !== "object" || Array.isArray(offerDetails)) {
    return {} as Record<string, unknown>;
  }

  const salesCalculator = (offerDetails as Record<string, unknown>).sales_calculator;

  if (!salesCalculator || typeof salesCalculator !== "object" || Array.isArray(salesCalculator)) {
    return {} as Record<string, unknown>;
  }

  return salesCalculator as Record<string, unknown>;
};

export const getLoanSalesCalculatorDefaults = (source: LoanSalesCalculatorSource) => {
  const salesCalculator = getSalesCalculatorObject(source);

  const finalCarPrice = toMoney(
    salesCalculator.final_car_price as number | string | null | undefined,
    toMoney(source.loan_amount) + toMoney(source.down_payment),
  );

  const bookingAmount = toMoney(
    salesCalculator.booking_amount as number | string | null | undefined,
    toMoney(source.down_payment),
  );

  const grossLoanAmount = toMoney(
    salesCalculator.gross_loan_amount as number | string | null | undefined,
    toMoney(source.sanction_amount) || toMoney(source.loan_amount),
  );

  const loanProtectionAmount = toMoney(salesCalculator.loan_protection_amount as number | string | null | undefined);
  const processingFees = toMoney(
    salesCalculator.processing_fees as number | string | null | undefined,
    toMoney(source.processing_fee),
  );
  const otherCharges = toMoney(salesCalculator.other_charges_amount as number | string | null | undefined);
  const otherChargesLabel =
    typeof salesCalculator.other_charges_label === "string" && salesCalculator.other_charges_label.trim()
      ? salesCalculator.other_charges_label
      : "Other Bank Charges";

  return {
    finalCarPrice,
    bookingAmount,
    grossLoanAmount,
    loanProtectionAmount,
    processingFees,
    otherCharges,
    otherChargesLabel,
  };
};

export const calculateLoanSalesBreakdown = (input: LoanSalesCalculatorInput) => {
  const finalCarPrice = toMoney(input.finalCarPrice);
  const bookingAmount = toMoney(input.bookingAmount);
  const grossLoanAmount = toMoney(input.grossLoanAmount);
  const loanProtectionAmount = toMoney(input.loanProtectionAmount);
  const processingFees = toMoney(input.processingFees);
  const otherCharges = toMoney(input.otherCharges);

  const bankDeductionsTotal = loanProtectionAmount + processingFees + otherCharges;
  const bankNetDisbursal = Math.max(grossLoanAmount - bankDeductionsTotal, 0);
  const balancePayableByYou = Math.max(finalCarPrice - bookingAmount - bankNetDisbursal, 0);
  const totalCustomerContribution = bookingAmount + balancePayableByYou;

  return {
    finalCarPrice,
    bookingAmount,
    grossLoanAmount,
    loanProtectionAmount,
    processingFees,
    otherCharges,
    bankDeductionsTotal,
    bankNetDisbursal,
    balancePayableByYou,
    totalCustomerContribution,
  };
};