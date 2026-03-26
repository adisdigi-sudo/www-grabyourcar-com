import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, leads, importId, source, fieldMapping, verticalId } = await req.json();

    // ── Webhook/API endpoint for external portals ──
    if (action === "webhook" || action === "api-push") {
      // Authenticate webhook requests via shared secret
      const WEBHOOK_SECRET = Deno.env.get("LEAD_IMPORT_WEBHOOK_SECRET");
      const providedSecret = req.headers.get("X-Webhook-Secret");
      
      if (action === "webhook") {
        if (!WEBHOOK_SECRET || providedSecret !== WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // For api-push, require valid JWT from authenticated admin
      if (action === "api-push") {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized - missing auth header" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (anonKey) {
          const anonClient = createClient(SUPABASE_URL, anonKey);
          const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
          if (authError || !caller) {
            return new Response(JSON.stringify({ error: "Unauthorized - invalid token" }), {
              status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Verify caller has admin role
          const { data: isAdminUser } = await supabase.rpc("is_admin", { _user_id: caller.id });
          if (!isAdminUser) {
            return new Response(JSON.stringify({ error: "Forbidden - admin access required" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
      if (!leads?.length) {
        return new Response(JSON.stringify({ error: "No leads provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create import record
      const { data: importRecord, error: importErr } = await supabase
        .from("lead_imports")
        .insert({
          import_type: action === "webhook" ? "webhook" : "api",
          source_name: source || "external_portal",
          total_rows: leads.length,
          status: "processing",
        })
        .select()
        .single();

      if (importErr) throw importErr;

      let imported = 0, skipped = 0, failed = 0;
      const errors: any[] = [];

      for (const lead of leads) {
        try {
          // Map external fields to our schema
          const mapped = {
            customer_name: lead.name || lead.customer_name || lead.customerName || "Unknown",
            phone: (lead.phone || lead.mobile || lead.contact || "").replace(/\D/g, "").slice(-10),
            email: lead.email || null,
            source: lead.source || source || "api_import",
            lead_type: lead.lead_type || lead.type || "car_inquiry",
            status: "new",
            car_brand: lead.car_brand || lead.brand || null,
            car_model: lead.car_model || lead.model || lead.car || null,
            city: lead.city || lead.location || null,
            buying_timeline: lead.timeline || lead.buying_timeline || null,
            budget_min: lead.budget_min || lead.budgetMin || null,
            budget_max: lead.budget_max || lead.budgetMax || null,
            notes: lead.notes || lead.remarks || null,
          };

          if (!mapped.phone || mapped.phone.length < 10) {
            skipped++;
            errors.push({ row: lead, reason: "Invalid phone number" });
            continue;
          }

          // Check duplicate by phone
          const { data: existing } = await supabase
            .from("leads")
            .select("id")
            .eq("phone", mapped.phone)
            .limit(1);

          if (existing?.length) {
            skipped++;
            errors.push({ row: lead, reason: "Duplicate phone" });
            continue;
          }

          const { data: inserted, error: insertErr } = await supabase.from("leads").insert(mapped).select("id").single();
          if (insertErr) {
            failed++;
            errors.push({ row: lead, reason: insertErr.message });
          } else {
            imported++;
            // Auto-assign via round-robin if verticalId provided
            if (verticalId && inserted?.id) {
              await supabase.rpc("auto_assign_lead_round_robin", {
                p_vertical_id: verticalId,
                p_lead_id: inserted.id,
                p_assigned_by: null,
              });
            }
          }
        } catch (e: any) {
          failed++;
          errors.push({ row: lead, reason: e.message });
        }
      }

      // Update import record
      await supabase.from("lead_imports").update({
        imported, skipped, failed,
        errors: errors.length ? errors : null,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", importRecord.id);

      return new Response(JSON.stringify({
        success: true,
        import_id: importRecord.id,
        imported, skipped, failed,
        errors: errors.slice(0, 10),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── CSV import (receives parsed rows) ──
    if (action === "csv-import") {
      if (!leads?.length) {
        return new Response(JSON.stringify({ error: "No data rows" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mapping = fieldMapping || {};

      const { data: importRecord } = await supabase
        .from("lead_imports")
        .insert({
          import_type: "csv",
          source_name: source || "csv_upload",
          total_rows: leads.length,
          field_mapping: mapping,
          status: "processing",
        })
        .select()
        .single();

      let imported = 0, skipped = 0, failed = 0;
      const errors: any[] = [];

      for (const row of leads) {
        try {
          const getMapped = (field: string) => {
            const mappedKey = mapping[field];
            return mappedKey ? row[mappedKey] : row[field];
          };

          const phone = (getMapped("phone") || "").toString().replace(/\D/g, "").slice(-10);
          if (!phone || phone.length < 10) {
            skipped++;
            continue;
          }

          // Check duplicate
          const { data: existing } = await supabase
            .from("leads")
            .select("id")
            .eq("phone", phone)
            .limit(1);

          if (existing?.length) {
            skipped++;
            continue;
          }

          const { data: inserted, error: insertErr } = await supabase.from("leads").insert({
            customer_name: getMapped("customer_name") || getMapped("name") || "Unknown",
            phone,
            email: getMapped("email") || null,
            source: getMapped("source") || source || "csv_import",
            lead_type: getMapped("lead_type") || "car_inquiry",
            status: "new",
            car_brand: getMapped("car_brand") || getMapped("brand") || null,
            car_model: getMapped("car_model") || getMapped("model") || null,
            city: getMapped("city") || null,
            notes: getMapped("notes") || getMapped("remarks") || null,
          }).select("id").single();

          if (insertErr) {
            failed++;
            errors.push({ phone, reason: insertErr.message });
          } else {
            imported++;
            if (verticalId && inserted?.id) {
              await supabase.rpc("auto_assign_lead_round_robin", {
                p_vertical_id: verticalId,
                p_lead_id: inserted.id,
                p_assigned_by: null,
              });
            }
          }
        } catch (e: any) {
          failed++;
        }
      }

      if (importRecord) {
        await supabase.from("lead_imports").update({
          imported, skipped, failed,
          errors: errors.length ? errors : null,
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", importRecord.id);
      }

      return new Response(JSON.stringify({
        success: true,
        imported, skipped, failed,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-import error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
