import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

type PremiumBreakup = {
  basicOD: number;
  odDiscount: number;
  ncbDiscount: number;
  netOD: number;
  tp: number;
  securePremium?: number;
  addonTotal: number;
  subtotal: number;
  gst: number;
  total: number;
};

type PersistQuoteHistoryInput = {
  doc: jsPDF;
  fileName: string;
  shareMethod: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  vehicleNumber?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: string | number | null;
  insuranceCompany?: string | null;
  policyType?: string | null;
  idv?: number | null;
  totalPremium?: number | null;
  premiumBreakup?: PremiumBreakup;
  addons?: string[];
  notes?: string | null;
  clientId?: string;
  quoteAmount?: number | null;
  quoteInsurer?: string | null;
  ncbPercentage?: number | null;
  previousClaim?: boolean | null;
};

const TERMINAL_STAGES = new Set(["policy_issued", "won", "converted"]);

const normalizeLower = (value?: string | null) => (value || "").trim().toLowerCase();

const uploadQuotePdf = async (doc: jsPDF, fileName: string) => {
  const pdfBlob = doc.output("blob");
  const storagePath = `quotes/${new Date().toISOString().slice(0, 10)}/${fileName}`;

  const { error } = await supabase.storage.from("quote-pdfs").upload(storagePath, pdfBlob, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    throw new Error(`PDF upload failed: ${error.message}`);
  }

  return storagePath;
};

export async function persistInsuranceQuoteHistory(input: PersistQuoteHistoryInput) {
  const pdfStoragePath = await uploadQuotePdf(input.doc, input.fileName);
  const quoteRef = `QS-${Date.now().toString(36).toUpperCase()}`;

  const { error: historyError } = await supabase.from("quote_share_history").insert({
    customer_name: input.customerName,
    customer_phone: input.customerPhone ?? null,
    customer_email: input.customerEmail ?? null,
    vehicle_number: input.vehicleNumber ?? null,
    vehicle_make: input.vehicleMake ?? null,
    vehicle_model: input.vehicleModel ?? null,
    vehicle_year: input.vehicleYear != null ? String(input.vehicleYear) : null,
    insurance_company: input.insuranceCompany ?? null,
    policy_type: input.policyType ?? null,
    idv: input.idv ?? null,
    total_premium: input.totalPremium ?? null,
    premium_breakup: input.premiumBreakup ?? null,
    addons: input.addons ?? null,
    share_method: input.shareMethod,
    pdf_storage_path: pdfStoragePath,
    quote_ref: quoteRef,
    notes: input.notes ?? null,
  });

  if (historyError) {
    throw new Error(`Quote history save failed: ${historyError.message}`);
  }

  if (input.clientId) {
    const { data: current, error: currentError } = await supabase
      .from("insurance_clients")
      .select("pipeline_stage, lead_status")
      .eq("id", input.clientId)
      .maybeSingle();

    if (currentError) {
      throw new Error(`Client fetch failed: ${currentError.message}`);
    }

    const pipelineStage = normalizeLower(current?.pipeline_stage);
    const leadStatus = normalizeLower(current?.lead_status);
    const shouldKeepTerminal = TERMINAL_STAGES.has(pipelineStage) || TERMINAL_STAGES.has(leadStatus);

    const updates: {
      pipeline_stage?: string;
      quote_amount?: number | null;
      quote_insurer?: string | null;
      ncb_percentage?: number | null;
      previous_claim?: boolean | null;
      updated_at: string;
    } = {
      quote_amount: input.quoteAmount ?? input.totalPremium ?? null,
      quote_insurer: input.quoteInsurer ?? input.insuranceCompany ?? null,
      ncb_percentage: input.ncbPercentage ?? null,
      previous_claim: input.previousClaim ?? null,
      updated_at: new Date().toISOString(),
    };

    if (!shouldKeepTerminal) {
      updates.pipeline_stage = "quote_shared";
    }

    const { error: clientUpdateError } = await supabase
      .from("insurance_clients")
      .update(updates)
      .eq("id", input.clientId);

    if (clientUpdateError) {
      throw new Error(`Client quote update failed: ${clientUpdateError.message}`);
    }
  }

  return { pdfStoragePath, quoteRef };
}