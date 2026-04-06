import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export type PersistLoanQuoteInput = {
  doc: jsPDF;
  fileName: string;
  shareMethod: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  carModel?: string | null;
  carVariant?: string | null;
  loanAmount?: number | null;
  downPayment?: number | null;
  interestRate?: number | null;
  tenureMonths?: number | null;
  emiAmount?: number | null;
  totalPayment?: number | null;
  totalInterest?: number | null;
  bankName?: string | null;
  bankComparison?: any | null;
  notes?: string | null;
  loanApplicationId?: string | null;
  source?: string;
};

const normalizePhoneDigits = (value?: string | null) => (value || "").replace(/\D/g, "");

const uploadLoanQuotePdf = async (doc: jsPDF, fileName: string): Promise<string | null> => {
  try {
    const pdfBlob = doc.output("blob");
    const storagePath = `loan-quotes/${new Date().toISOString().slice(0, 10)}/${fileName}`;

    const { error } = await supabase.storage.from("loan-documents").upload(storagePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (error) {
      console.warn("Loan PDF upload failed (non-blocking):", error.message);
      return null;
    }

    return storagePath;
  } catch (err) {
    console.warn("Loan PDF upload exception (non-blocking):", err);
    return null;
  }
};

export async function persistLoanQuoteHistory(input: PersistLoanQuoteInput) {
  const pdfStoragePath = await uploadLoanQuotePdf(input.doc, input.fileName);
  const quoteRef = `LQ-${Date.now().toString(36).toUpperCase()}`;
  const cleanPhone = normalizePhoneDigits(input.customerPhone);

  // 1. Try to find existing loan application by phone
  let resolvedAppId = input.loanApplicationId || null;

  if (!resolvedAppId && cleanPhone && cleanPhone.length >= 10) {
    const phoneSuffix = cleanPhone.slice(-10);
    const { data: matchedApp } = await supabase
      .from("loan_applications")
      .select("id, stage")
      .or(`phone.ilike.%${phoneSuffix}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchedApp) {
      resolvedAppId = matchedApp.id;
    }
  }

  // 2. If no existing application, create a new one as "new_lead"
  if (!resolvedAppId && cleanPhone && cleanPhone.length >= 10) {
    const { data: newApp, error: createError } = await supabase
      .from("loan_applications")
      .insert({
        customer_name: input.customerName,
        phone: cleanPhone,
        email: input.customerEmail ?? null,
        car_model: input.carModel ?? null,
        car_variant: input.carVariant ?? null,
        loan_amount: input.loanAmount ?? null,
        down_payment: input.downPayment ?? null,
        interest_rate: input.interestRate ?? null,
        tenure_months: input.tenureMonths ?? null,
        emi_amount: input.emiAmount ?? null,
        stage: "new_lead",
        source: input.source === "backend" ? "CRM EMI Calculator" : "Website EMI Calculator",
        lead_source_tag: input.source === "backend" ? "crm_emi_calc" : "website_emi_calc",
        is_legacy: false,
        remarks: `Auto-created from EMI quote share (${input.shareMethod})`,
        offer_details: {
          quote_ref: quoteRef,
          share_method: input.shareMethod,
          loan_amount: input.loanAmount,
          down_payment: input.downPayment,
          interest_rate: input.interestRate,
          tenure_months: input.tenureMonths,
          emi_amount: input.emiAmount,
          total_payment: input.totalPayment,
          total_interest: input.totalInterest,
          bank_name: input.bankName,
          bank_comparison: input.bankComparison,
          pdf_path: pdfStoragePath,
          shared_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    if (createError) {
      console.warn("Loan application auto-create failed:", createError.message);
    } else if (newApp) {
      resolvedAppId = newApp.id;
    }
  }

  // 3. If existing app found, update offer_details with latest quote
  if (resolvedAppId && input.loanApplicationId !== resolvedAppId) {
    // Only update if we found an existing one (not just created)
    const offerUpdate = {
      quote_ref: quoteRef,
      share_method: input.shareMethod,
      loan_amount: input.loanAmount,
      down_payment: input.downPayment,
      interest_rate: input.interestRate,
      tenure_months: input.tenureMonths,
      emi_amount: input.emiAmount,
      total_payment: input.totalPayment,
      total_interest: input.totalInterest,
      bank_name: input.bankName,
      bank_comparison: input.bankComparison,
      pdf_path: pdfStoragePath,
      shared_at: new Date().toISOString(),
    };

    await supabase
      .from("loan_applications")
      .update({
        offer_details: offerUpdate as any,
        car_model: input.carModel ?? undefined,
        car_variant: input.carVariant ?? undefined,
        loan_amount: input.loanAmount ?? undefined,
        down_payment: input.downPayment ?? undefined,
        interest_rate: input.interestRate ?? undefined,
        tenure_months: input.tenureMonths ?? undefined,
        emi_amount: input.emiAmount ?? undefined,
      })
      .eq("id", resolvedAppId);
  }

  // 4. Save to loan_quote_share_history
  const { error: historyError } = await supabase.from("loan_quote_share_history" as any).insert({
    customer_name: input.customerName,
    customer_phone: cleanPhone || null,
    customer_email: input.customerEmail ?? null,
    car_model: input.carModel ?? null,
    car_variant: input.carVariant ?? null,
    loan_amount: input.loanAmount ?? null,
    down_payment: input.downPayment ?? null,
    interest_rate: input.interestRate ?? null,
    tenure_months: input.tenureMonths ?? null,
    emi_amount: input.emiAmount ?? null,
    total_payment: input.totalPayment ?? null,
    total_interest: input.totalInterest ?? null,
    bank_name: input.bankName ?? null,
    bank_comparison: input.bankComparison ?? null,
    share_method: input.shareMethod,
    pdf_storage_path: pdfStoragePath,
    quote_ref: quoteRef,
    notes: input.notes ?? null,
    loan_application_id: resolvedAppId,
    source: input.source ?? "website",
  });

  if (historyError) {
    console.warn("Loan quote history save failed:", historyError.message);
  }

  return { pdfStoragePath, quoteRef, loanApplicationId: resolvedAppId };
}
