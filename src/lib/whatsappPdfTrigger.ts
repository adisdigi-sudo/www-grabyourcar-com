import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget trigger that auto-sends a branded PDF over WhatsApp
 * based on configured rules in wa_pdf_automation_rules.
 *
 * - Provide either `pdfUrl` (already uploaded) or `pdfBase64` (will be
 *   uploaded to wa-media bucket by the edge function).
 * - All deliveries are logged in `wa_pdf_delivery_logs`.
 */
export interface WhatsAppPdfTriggerPayload {
  vertical: string;       // e.g. "sales", "insurance", "hsrp", "self-drive", "loans", "accessories", "fastag"
  event: string;          // e.g. "deal_won", "policy_issued", "order_confirmed"
  phone: string;
  name?: string;
  recordId?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  fileName?: string;
  variables?: Record<string, string>;
  pdfTypeFilter?: string; // restrict to a single pdf_type (invoice/quote/policy/...)
}

export function triggerWhatsAppPdf(payload: WhatsAppPdfTriggerPayload) {
  supabase.functions
    .invoke("wa-pdf-dispatcher", { body: payload })
    .then(({ error, data }) => {
      if (error) console.error("WA PDF trigger error:", error);
      else if (data?.dispatched) console.log("WA PDF dispatched:", data);
    })
    .catch((err) => console.error("WA PDF trigger failed:", err));
}

/** Awaitable variant — returns dispatch result. */
export async function triggerWhatsAppPdfAwait(payload: WhatsAppPdfTriggerPayload) {
  const { data, error } = await supabase.functions.invoke("wa-pdf-dispatcher", {
    body: payload,
  });
  if (error) throw error;
  return data as { success: boolean; dispatched: number; results: unknown[] };
}
