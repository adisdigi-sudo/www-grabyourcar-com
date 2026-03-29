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

const normalizeLower = (value?: string | null) => (value || "").trim().toLowerCase();
const normalizePhoneDigits = (value?: string | null) => (value || "").replace(/\D/g, "");
const normalizeVehicleNumber = (value?: string | null) => (value || "").replace(/\s+/g, "").toUpperCase();

const createQuoteStageLog = async ({
  clientId,
  quoteRef,
  shareMethod,
  totalPremium,
}: {
  clientId: string;
  quoteRef: string;
  shareMethod: string;
  totalPremium?: number | null;
}) => {
  const { error } = await supabase.from("insurance_activity_log").insert({
    client_id: clientId,
    activity_type: "stage_change",
    title: "Pipeline → Quote Shared",
    description: `Quote ${quoteRef} saved via ${shareMethod}${totalPremium ? ` • Rs. ${Math.round(totalPremium).toLocaleString("en-IN")}` : ""}`,
    metadata: {
      new_stage: "quote_shared",
      quote_ref: quoteRef,
      share_method: shareMethod,
      total_premium: totalPremium ?? null,
    },
  });

  if (error) {
    console.warn("Quote activity log insert failed:", error.message);
  }
};

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

  // Resolve clientId — use provided ID or fall back to phone-based lookup
  let resolvedClientId = input.clientId || null;
  const cleanPhone = normalizePhoneDigits(input.customerPhone);
  const normalizedVehicle = normalizeVehicleNumber(input.vehicleNumber);
  const nowIso = new Date().toISOString();

  if (!resolvedClientId && cleanPhone) {
    if (cleanPhone.length >= 10) {
      const phoneSuffix = cleanPhone.slice(-10);
      const { data: matchedClient } = await supabase
        .from("insurance_clients")
        .select("id")
        .ilike("phone", `%${phoneSuffix}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (matchedClient) {
        resolvedClientId = matchedClient.id;
      }
    }
  }

  if (!resolvedClientId && normalizedVehicle) {
    const { data: matchedByVehicle } = await supabase
      .from("insurance_clients")
      .select("id")
      .ilike("vehicle_number", input.vehicleNumber?.trim() || normalizedVehicle)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchedByVehicle) {
      resolvedClientId = matchedByVehicle.id;
    }
  }

  if (!resolvedClientId && cleanPhone.length >= 10) {
    const { data: authData } = await supabase.auth.getUser();
    const { data: createdClient, error: createClientError } = await supabase
      .from("insurance_clients")
      .insert({
        phone: cleanPhone,
        customer_name: input.customerName,
        email: input.customerEmail ?? null,
        vehicle_number: input.vehicleNumber ?? null,
        vehicle_make: input.vehicleMake ?? null,
        vehicle_model: input.vehicleModel ?? null,
        vehicle_year: input.vehicleYear != null ? Number(input.vehicleYear) : null,
        current_insurer: input.insuranceCompany ?? input.quoteInsurer ?? null,
        current_policy_type: input.policyType ?? null,
        current_premium: input.totalPremium ?? input.quoteAmount ?? null,
        ncb_percentage: input.ncbPercentage ?? null,
        previous_claim: input.previousClaim ?? null,
        lead_source: "Manual Quote Calculator",
        lead_status: "quote_shared",
        pipeline_stage: "quote_shared",
        assigned_advisor_id: authData.user?.id ?? null,
        advisor_name: authData.user?.email ?? null,
        priority: "medium",
        quote_amount: input.quoteAmount ?? input.totalPremium ?? null,
        quote_insurer: input.quoteInsurer ?? input.insuranceCompany ?? null,
        notes: input.notes ?? null,
        is_legacy: false,
        duplicate_count: 0,
        is_duplicate: false,
        journey_last_event: "quote_shared",
        journey_last_event_at: nowIso,
      })
      .select("id")
      .single();

    if (createClientError) {
      throw new Error(`Client create failed: ${createClientError.message}`);
    }

    resolvedClientId = createdClient.id;
  }

  if (resolvedClientId) {
    const { data: current, error: currentError } = await supabase
      .from("insurance_clients")
      .select("pipeline_stage, lead_status")
      .eq("id", resolvedClientId)
      .maybeSingle();

    if (currentError) {
      throw new Error(`Client fetch failed: ${currentError.message}`);
    }

    const updates: {
      customer_name?: string;
      email?: string | null;
      vehicle_number?: string | null;
      vehicle_make?: string | null;
      vehicle_model?: string | null;
      vehicle_year?: number | null;
      current_insurer?: string | null;
      current_policy_type?: string | null;
      current_premium?: number | null;
      pipeline_stage?: string;
      lead_status?: string;
      quote_amount?: number | null;
      quote_insurer?: string | null;
      ncb_percentage?: number | null;
      previous_claim?: boolean | null;
      notes?: string | null;
      journey_last_event?: string;
      journey_last_event_at?: string;
      updated_at: string;
    } = {
      customer_name: input.customerName,
      email: input.customerEmail ?? null,
      vehicle_number: input.vehicleNumber ?? null,
      vehicle_make: input.vehicleMake ?? null,
      vehicle_model: input.vehicleModel ?? null,
      vehicle_year: input.vehicleYear != null ? Number(input.vehicleYear) : null,
      current_insurer: input.insuranceCompany ?? input.quoteInsurer ?? null,
      current_policy_type: input.policyType ?? null,
      current_premium: input.totalPremium ?? input.quoteAmount ?? null,
      quote_amount: input.quoteAmount ?? input.totalPremium ?? null,
      quote_insurer: input.quoteInsurer ?? input.insuranceCompany ?? null,
      ncb_percentage: input.ncbPercentage ?? null,
      previous_claim: input.previousClaim ?? null,
      notes: input.notes ?? null,
      updated_at: nowIso,
    };

    // Only promote to quote_shared if the lead is in an earlier stage
    const currentStage = (current?.pipeline_stage || "").toLowerCase();
    const currentStatus = (current?.lead_status || "").toLowerCase();
    const protectedStages = ["follow_up", "negotiation", "payment_pending", "won", "policy_issued", "lost", "converted", "closed", "quote_shared"];
    const stageChanged = !protectedStages.includes(currentStage);
    if (stageChanged) {
      updates.pipeline_stage = "quote_shared";
      updates.journey_last_event = "quote_shared";
      updates.journey_last_event_at = nowIso;
    }
    if (!protectedStages.includes(currentStatus)) {
      updates.lead_status = "quote_shared";
    }

    const { error: clientUpdateError } = await supabase
      .from("insurance_clients")
      .update(updates)
      .eq("id", resolvedClientId);

    if (clientUpdateError) {
      throw new Error(`Client quote update failed: ${clientUpdateError.message}`);
    }

    // Only log stage change if it actually changed
    if (stageChanged) {
      await createQuoteStageLog({
        clientId: resolvedClientId,
        quoteRef,
        shareMethod: input.shareMethod,
        totalPremium: input.totalPremium ?? input.quoteAmount ?? null,
      });
    }
  }

  return { pdfStoragePath, quoteRef, clientId: resolvedClientId };
}