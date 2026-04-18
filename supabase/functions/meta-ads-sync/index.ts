import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API_VERSION = "v20.0";

interface InsightRow {
  date_start: string;
  date_stop: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

function pickLeads(actions: InsightRow["actions"]): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    if (
      a.action_type === "lead" ||
      a.action_type === "onsite_conversion.lead_grouped" ||
      a.action_type.endsWith(".lead")
    ) {
      total += Number(a.value || 0);
    }
  }
  return total;
}

async function fetchInsights(
  adAccountId: string,
  token: string,
  level: "campaign" | "adset" | "ad",
  since: string,
  until: string,
): Promise<InsightRow[]> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "impressions",
    "reach",
    "clicks",
    "spend",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "date_start",
    "date_stop",
  ].join(",");
  const url = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`}/insights`,
  );
  url.searchParams.set("level", level);
  url.searchParams.set("fields", fields);
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("limit", "500");
  url.searchParams.set("access_token", token);

  const rows: InsightRow[] = [];
  let next: string | null = url.toString();
  while (next) {
    const resp = await fetch(next);
    const json = await resp.json();
    if (!resp.ok) {
      const err = json?.error?.message || resp.statusText;
      throw new Error(`Meta insights ${level} failed: ${err}`);
    }
    if (Array.isArray(json.data)) rows.push(...json.data);
    next = json?.paging?.next ?? null;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const days = Math.max(1, Math.min(90, Number(body?.days ?? 14)));
    const accountIdFilter: string | undefined = body?.ad_account_id;

    const { data: configs, error: cfgError } = await supabase
      .from("meta_ads_config")
      .select("*")
      .eq("is_active", true);

    if (cfgError) throw cfgError;
    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, message: "No active Meta Ads config. Add ad account & token first." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const today = new Date();
    const until = today.toISOString().slice(0, 10);
    const sinceDate = new Date(today);
    sinceDate.setDate(today.getDate() - days);
    const since = sinceDate.toISOString().slice(0, 10);

    const summary: any[] = [];

    for (const cfg of configs) {
      if (accountIdFilter && cfg.ad_account_id !== accountIdFilter) continue;
      const token: string | null = cfg.access_token || Deno.env.get("META_ACCESS_TOKEN") || null;
      if (!token) {
        await supabase
          .from("meta_ads_config")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "failed",
            last_sync_error: "Missing access token",
          })
          .eq("id", cfg.id);
        summary.push({ ad_account_id: cfg.ad_account_id, ok: false, error: "Missing access token" });
        continue;
      }

      try {
        let inserted = 0;
        for (const level of ["campaign", "adset", "ad"] as const) {
          const rows = await fetchInsights(cfg.ad_account_id, token, level, since, until);
          if (rows.length === 0) continue;
          const payload = rows.map((r) => ({
            ad_account_id: cfg.ad_account_id,
            campaign_id: r.campaign_id ?? null,
            campaign_name: r.campaign_name ?? null,
            ad_set_id: r.adset_id ?? null,
            ad_set_name: r.adset_name ?? null,
            ad_id: r.ad_id ?? null,
            ad_name: r.ad_name ?? null,
            level,
            metric_date: r.date_start,
            impressions: Number(r.impressions ?? 0),
            reach: Number(r.reach ?? 0),
            clicks: Number(r.clicks ?? 0),
            spend: Number(r.spend ?? 0),
            leads: pickLeads(r.actions),
            ctr: r.ctr ? Number(r.ctr) : null,
            cpc: r.cpc ? Number(r.cpc) : null,
            cpm: r.cpm ? Number(r.cpm) : null,
            raw: r as any,
            fetched_at: new Date().toISOString(),
          }));

          const { error: upErr } = await supabase
            .from("meta_ads_daily_metrics")
            .upsert(payload, {
              onConflict: "ad_account_id,level,ad_id,ad_set_id,campaign_id,metric_date",
              ignoreDuplicates: false,
            });
          if (upErr) throw upErr;
          inserted += payload.length;
        }

        await supabase
          .from("meta_ads_config")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "ok",
            last_sync_error: null,
          })
          .eq("id", cfg.id);
        summary.push({ ad_account_id: cfg.ad_account_id, ok: true, rows: inserted });
      } catch (err: any) {
        await supabase
          .from("meta_ads_config")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "failed",
            last_sync_error: err?.message || String(err),
          })
          .eq("id", cfg.id);
        summary.push({ ad_account_id: cfg.ad_account_id, ok: false, error: err?.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, days, summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[meta-ads-sync] fatal", err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});