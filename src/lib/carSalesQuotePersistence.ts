import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export type PersistCarSalesQuoteInput = {
  doc: jsPDF;
  fileName: string;
  shareMethod: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  carBrand?: string | null;
  carModel?: string | null;
  carVariant?: string | null;
  carColor?: string | null;
  city?: string | null;
  exShowroomPrice?: number | null;
  onRoadPrice?: number | null;
  finalPrice?: number | null;
  discountAmount?: number | null;
  discountType?: string | null;
  priceBreakup?: Record<string, any> | null;
  includeLoanOffer?: boolean;
  bankName?: string | null;
  bookingAmount?: number | null;
  processingFees?: number | null;
  otherLoanExpenses?: number | null;
  loanAmount?: number | null;
  interestRate?: number | null;
  tenureMonths?: number | null;
  emiAmount?: number | null;
  totalPayment?: number | null;
  totalInterest?: number | null;
  notes?: string | null;
  source?: string;
};

const uploadPdf = async (doc: jsPDF, fileName: string): Promise<string | null> => {
  try {
    const pdfBlob = doc.output("blob");
    const storagePath = `car-sales-quotes/${new Date().toISOString().slice(0, 10)}/${fileName}`;
    const { error } = await supabase.storage.from("quote-pdfs").upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) {
      console.warn("Car sales quote PDF upload failed:", error.message);
      return null;
    }
    return storagePath;
  } catch (err) {
    console.warn("Car sales quote PDF upload exception:", err);
    return null;
  }
};

export async function persistCarSalesQuote(input: PersistCarSalesQuoteInput) {
  const pdfStoragePath = await uploadPdf(input.doc, input.fileName);
  const quoteRef = `CQ-${Date.now().toString(36).toUpperCase()}`;

  const { error } = await supabase.from("car_sales_quote_history" as any).insert({
    customer_name: input.customerName || "Customer",
    customer_phone: (input.customerPhone || "").replace(/\D/g, "") || null,
    customer_email: input.customerEmail || null,
    car_brand: input.carBrand || null,
    car_model: input.carModel || null,
    car_variant: input.carVariant || null,
    car_color: input.carColor || null,
    city: input.city || null,
    ex_showroom_price: input.exShowroomPrice || null,
    on_road_price: input.onRoadPrice || null,
    final_price: input.finalPrice || null,
    discount_amount: input.discountAmount || null,
    discount_type: input.discountType || null,
    price_breakup: input.priceBreakup || null,
    include_loan_offer: input.includeLoanOffer || false,
    bank_name: input.bankName || null,
    booking_amount: input.bookingAmount || null,
    processing_fees: input.processingFees || null,
    other_loan_expenses: input.otherLoanExpenses || null,
    loan_amount: input.loanAmount || null,
    interest_rate: input.interestRate || null,
    tenure_months: input.tenureMonths || null,
    emi_amount: input.emiAmount || null,
    total_payment: input.totalPayment || null,
    total_interest: input.totalInterest || null,
    share_method: input.shareMethod,
    pdf_storage_path: pdfStoragePath,
    quote_ref: quoteRef,
    notes: input.notes || null,
    source: input.source || "manual_quote",
  });

  if (error) {
    console.warn("Car sales quote history save failed:", error.message);
  }

  return { pdfStoragePath, quoteRef };
}
