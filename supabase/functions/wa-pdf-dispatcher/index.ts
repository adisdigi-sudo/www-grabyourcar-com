import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * WA PDF Dispatcher
 * ------------------
 * Receives an event + record context, looks up matching wa_pdf_automation_rules,
 * accepts a pre-generated PDF (URL or base64) OR a public URL, and sends it
 * over WhatsApp via the messaging-service as a document message.
 *
 * Logs every attempt in wa_pdf_delivery_logs.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DispatchPayload {
  vertical: string;
  event: string;
  phone: string;
  name?: string;
  recordId?: string;
  pdfUrl?: string;       // already-uploaded public URL
  pdfBase64?: string;    // raw PDF base64 (no data: prefix)
  fileName?: string;
  variables?: Record<string, string>;
  pdfTypeFilter?: string; // optional: only dispatch this pdf type
}

function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (clean.startsWith("91") && clean.length === 12) return clean;
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

async function uploadBase64Pdf(
  supabase: ReturnType<typeof createClient>,
  base64: string,
  fileName: string,
): Promise<{ url: string; path: string }> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `auto-pdf/${Date.now()}-${fileName}`;
  const { error } = await supabase.storage
    .from("wa-media")
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("wa-media").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Missing config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const payload: DispatchPayload = await req.json();
    if (!payload.vertical || !payload.event || !payload.phone) {
      return new Response(
        JSON.stringify({ error: "vertical, event, phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const phone = normalizePhone(payload.phone);
    const customerName = payload.name || "Customer";
    const vars = { name: customerName, phone, ...(payload.variables || {}) };

    // Opt-out check
    const cleanPhone = phone.replace(/^91/, "");
    const { data: optOut } = await supabase
      .from("wa_opt_outs")
      .select("id")
      .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone}`)
      .limit(1);
    if (optOut && optOut.length > 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "User opted out" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Find matching rules
    let rulesQuery = supabase
      .from("wa_pdf_automation_rules")
      .select("*")
      .eq("vertical", payload.vertical)
      .eq("event_name", payload.event)
      .eq("is_active", true);
    if (payload.pdfTypeFilter) rulesQuery = rulesQuery.eq("pdf_type", payload.pdfTypeFilter);

    const { data: rules, error: rulesError } = await rulesQuery;
    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ dispatched: 0, message: "No active rules matched" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve PDF source once (only if provided base64)
    let resolvedUrl = payload.pdfUrl || "";
    let resolvedPath: string | undefined;
    if (!resolvedUrl && payload.pdfBase64) {
      const fileName = payload.fileName || `${payload.event}-${Date.now()}.pdf`;
      const uploaded = await uploadBase64Pdf(supabase, payload.pdfBase64, fileName);
      resolvedUrl = uploaded.url;
      resolvedPath = uploaded.path;
    }

    if (!resolvedUrl) {
      return new Response(
        JSON.stringify({ error: "Provide pdfUrl or pdfBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let dispatched = 0;
    const results: unknown[] = [];

    for (const rule of rules) {
      // Cooldown / max sends per record
      if (payload.recordId) {
        const cutoff = new Date(
          Date.now() - (rule.cooldown_hours || 24) * 3600000,
        ).toISOString();
        const { data: recent } = await supabase
          .from("wa_pdf_delivery_logs")
          .select("id", { count: "exact", head: false })
          .eq("rule_id", rule.id)
          .eq("record_id", payload.recordId)
          .in("status", ["sent", "queued"])
          .gte("created_at", cutoff);
        if (recent && recent.length > 0) {
          results.push({ rule: rule.id, skipped: "cooldown" });
          continue;
        }

        if ((rule.max_sends_per_record ?? 1) > 0) {
          const { count } = await supabase
            .from("wa_pdf_delivery_logs")
            .select("id", { count: "exact", head: true })
            .eq("rule_id", rule.id)
            .eq("record_id", payload.recordId)
            .in("status", ["sent"]);
          if ((count || 0) >= (rule.max_sends_per_record ?? 1)) {
            results.push({ rule: rule.id, skipped: "max_sends_reached" });
            continue;
          }
        }
      }

      const caption = rule.caption_template
        ? applyVars(rule.caption_template, vars)
        : `Hi ${customerName}, your document is attached.`;

      // Insert pending log
      const { data: logRow } = await supabase
        .from("wa_pdf_delivery_logs")
        .insert({
          rule_id: rule.id,
          vertical: rule.vertical,
          event_name: rule.event_name,
          pdf_type: rule.pdf_type,
          record_id: payload.recordId || null,
          phone,
          customer_name: customerName,
          pdf_url: resolvedUrl,
          pdf_storage_path: resolvedPath || null,
          caption,
          template_name: rule.template_name || null,
          status: "pending",
          meta: { variables: vars },
        })
        .select()
        .single();

      // Dispatch via messaging-service (document)
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/messaging-service`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            action: "send_message",
            phone,
            message: caption,
            messageType: "document",
            mediaUrl: resolvedUrl,
            mediaFileName: payload.fileName || `${rule.pdf_type}.pdf`,
            customer_name: customerName,
            message_context: `wa_pdf_auto:${rule.vertical}:${rule.event_name}:${rule.pdf_type}`,
            vertical: rule.vertical,
            intent: rule.pdf_type === "policy" ? "policy_document"
                  : rule.pdf_type === "quote" ? "quote_share"
                  : rule.pdf_type === "renewal" ? "renewal_reminder"
                  : "policy_document",
            intent_meta: { rule_id: rule.id, event: rule.event_name, pdf_type: rule.pdf_type },
            lead_id: payload.recordId || null,
          }),
        });
        const result = await resp.json();
        const ok = resp.ok && (result?.success ?? true);

        await supabase
          .from("wa_pdf_delivery_logs")
          .update({
            status: ok ? "sent" : "failed",
            message_id: result?.messageId || result?.message_id || null,
            error_message: ok ? null : JSON.stringify(result).slice(0, 500),
            sent_at: ok ? new Date().toISOString() : null,
          })
          .eq("id", logRow?.id);

        if (ok) {
          await supabase
            .from("wa_pdf_automation_rules")
            .update({
              total_sent: (rule.total_sent || 0) + 1,
              last_triggered_at: new Date().toISOString(),
            })
            .eq("id", rule.id);
          dispatched++;
        }
        results.push({ rule: rule.id, pdf_type: rule.pdf_type, ok, logId: logRow?.id });
      } catch (err) {
        await supabase
          .from("wa_pdf_delivery_logs")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : String(err),
          })
          .eq("id", logRow?.id);
        results.push({ rule: rule.id, ok: false, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, dispatched, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("wa-pdf-dispatcher error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
