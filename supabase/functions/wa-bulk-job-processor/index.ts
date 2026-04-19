// WhatsApp Bulk Job Processor
// Processes a `wa_bulk_jobs` row at Meta-safe pace (default 80/min),
// honours cancel_requested, and updates per-recipient status in real time.
//
// Invoke with: { job_id: string }
// Designed to be re-entrant — if it gets killed mid-run, calling again
// will resume from `pending` recipients.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(p: string) {
  const d = String(p || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) return `91${d}`;
  return d;
}

async function sendOne(opts: {
  token: string;
  phoneId: string;
  to: string;
  job: any;
  variables: any[];
}) {
  const { token, phoneId, to, job, variables } = opts;
  let payload: Record<string, unknown>;

  if (job.message_type === "template" && job.template_name) {
    const components: any[] = [];
    if (Array.isArray(variables) && variables.length) {
      components.push({
        type: "body",
        parameters: variables.map((v) => ({ type: "text", text: String(v ?? "") })),
      });
    }
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: job.template_name,
        language: { code: "en" },
        ...(components.length ? { components } : {}),
      },
    };
  } else if (job.media_url && ["image", "document", "video", "audio"].includes(job.message_type)) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: job.message_type,
      [job.message_type]: {
        link: job.media_url,
        ...(job.message_type !== "audio" && job.message_text ? { caption: job.message_text } : {}),
      },
    };
  } else {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: job.message_text || "" },
    };
  }

  const resp = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const result = await resp.json();
  return {
    ok: resp.ok,
    wa_id: result.messages?.[0]?.id || null,
    error: result.error?.error_user_msg || result.error?.message || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ ok: false, error: "job_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (!TOKEN || !PHONE_ID) {
      return new Response(JSON.stringify({ ok: false, error: "WhatsApp creds missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job } = await supabase.from("wa_bulk_jobs").select("*").eq("id", job_id).single();
    if (!job) {
      return new Response(JSON.stringify({ ok: false, error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.status === "completed" || job.status === "cancelled") {
      return new Response(JSON.stringify({ ok: true, status: job.status, info: "already finished" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("wa_bulk_jobs").update({
      status: "running",
      started_at: job.started_at || new Date().toISOString(),
    }).eq("id", job_id);

    const ratePerMinute = Math.max(10, Math.min(120, job.rate_per_minute || 80));
    const delayMs = Math.ceil(60_000 / ratePerMinute); // ~750ms @ 80/min

    let sent = job.sent || 0;
    let failed = job.failed || 0;
    let processedThisBatch = 0;
    const batchLimit = 500; // safety: max recipients per invocation

    while (processedThisBatch < batchLimit) {
      // re-check cancel + grab next pending
      const { data: refreshed } = await supabase
        .from("wa_bulk_jobs").select("cancel_requested,status").eq("id", job_id).single();
      if (refreshed?.cancel_requested) {
        await supabase.from("wa_bulk_jobs").update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
        }).eq("id", job_id);
        return new Response(JSON.stringify({ ok: true, cancelled: true, sent, failed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: nextRow } = await supabase
        .from("wa_bulk_job_recipients")
        .select("*")
        .eq("job_id", job_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!nextRow) break;

      const phone = normalizePhone(nextRow.phone);
      if (phone.length < 11) {
        await supabase.from("wa_bulk_job_recipients").update({
          status: "failed", error_message: "invalid phone",
        }).eq("id", nextRow.id);
        failed++;
        processedThisBatch++;
        continue;
      }

      try {
        const variables = Array.isArray(nextRow.variables)
          ? nextRow.variables
          : Array.isArray(job.template_variables)
            ? job.template_variables
            : [];
        const res = await sendOne({ token: TOKEN, phoneId: PHONE_ID, to: phone, job, variables });
        if (res.ok) {
          await supabase.from("wa_bulk_job_recipients").update({
            status: "sent",
            wa_message_id: res.wa_id,
            sent_at: new Date().toISOString(),
          }).eq("id", nextRow.id);
          sent++;
        } else {
          await supabase.from("wa_bulk_job_recipients").update({
            status: "failed",
            error_message: res.error || "send failed",
          }).eq("id", nextRow.id);
          failed++;
        }
      } catch (e) {
        await supabase.from("wa_bulk_job_recipients").update({
          status: "failed", error_message: String(e),
        }).eq("id", nextRow.id);
        failed++;
      }

      processedThisBatch++;
      // progress every 10 sends
      if (processedThisBatch % 10 === 0) {
        await supabase.from("wa_bulk_jobs").update({ sent, failed }).eq("id", job_id);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // any pending left?
    const { count: pendingLeft } = await supabase
      .from("wa_bulk_job_recipients")
      .select("id", { head: true, count: "exact" })
      .eq("job_id", job_id)
      .eq("status", "pending");

    const finalStatus = (pendingLeft || 0) > 0 ? "running" : "completed";
    await supabase.from("wa_bulk_jobs").update({
      sent,
      failed,
      status: finalStatus,
      completed_at: finalStatus === "completed" ? new Date().toISOString() : null,
    }).eq("id", job_id);

    // self-recurse if more left
    if (finalStatus === "running" && (pendingLeft || 0) > 0) {
      // Fire-and-forget continuation
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/wa-bulk-job-processor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ job_id }),
      }).catch(() => undefined);
    }

    return new Response(JSON.stringify({
      ok: true, sent, failed, processed: processedThisBatch, status: finalStatus,
      pending_left: pendingLeft || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("wa-bulk-job-processor error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
