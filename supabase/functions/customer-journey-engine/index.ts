import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Customer Journey Intelligence Engine
 * 
 * Actions:
 * - sync: Sync all verticals into unified_customers table
 * - analyze: Detect cross-sell opportunities and create journey triggers
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { action = "sync" } = await req.json().catch(() => ({}));
    const results: any = { synced: 0, triggers_created: 0 };

    if (action === "sync" || action === "all") {
      // 1. Sync from leads table
      const { data: leads } = await supabase
        .from("leads")
        .select("id, phone, name, email, city, car_model, source, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);

      for (const lead of leads || []) {
        const phone = (lead.phone || "").replace(/\D/g, "").replace(/^91/, "");
        if (!phone || phone.length < 10) continue;

        const { data: existing } = await supabase
          .from("unified_customers")
          .select("id, total_interactions, has_car_inquiry")
          .eq("phone", phone)
          .limit(1);

        if (existing && existing.length > 0) {
          if (!existing[0].has_car_inquiry) {
            await supabase.from("unified_customers").update({
              has_car_inquiry: true,
              customer_name: lead.name || undefined,
              email: lead.email || undefined,
              city: lead.city || undefined,
              total_interactions: (existing[0].total_interactions || 0) + 1,
              latest_source: lead.source || undefined,
              last_activity_type: "car_inquiry",
              last_activity_at: lead.created_at,
            }).eq("id", existing[0].id);
          }
        } else {
          await supabase.from("unified_customers").insert({
            phone,
            customer_name: lead.name || null,
            email: lead.email || null,
            city: lead.city || null,
            has_car_inquiry: true,
            first_source: lead.source || "website",
            latest_source: lead.source || "website",
            last_activity_type: "car_inquiry",
            last_activity_at: lead.created_at,
            total_interactions: 1,
          });
          results.synced++;
        }
      }

      // 2. Sync from insurance_clients
      const { data: insClients } = await supabase
        .from("insurance_clients")
        .select("id, phone, customer_name, email, city, lead_source, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);

      for (const ic of insClients || []) {
        const phone = (ic.phone || "").replace(/\D/g, "").replace(/^91/, "");
        if (!phone || phone.length < 10) continue;

        const { data: existing } = await supabase
          .from("unified_customers")
          .select("id, has_insurance")
          .eq("phone", phone)
          .limit(1);

        if (existing && existing.length > 0) {
          if (!existing[0].has_insurance) {
            await supabase.from("unified_customers").update({
              has_insurance: true,
              customer_name: ic.customer_name || undefined,
              email: ic.email || undefined,
              latest_source: ic.lead_source || undefined,
              last_activity_type: "insurance_inquiry",
            }).eq("id", existing[0].id);
          }
        } else {
          await supabase.from("unified_customers").insert({
            phone,
            customer_name: ic.customer_name || null,
            email: ic.email || null,
            city: ic.city || null,
            has_insurance: true,
            first_source: ic.lead_source || "insurance",
            latest_source: ic.lead_source || "insurance",
            last_activity_type: "insurance_inquiry",
            total_interactions: 1,
          });
          results.synced++;
        }
      }

      // 3. Sync from car_loan_leads
      const { data: loanLeads } = await supabase
        .from("car_loan_leads")
        .select("id, phone, name, city, source, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);

      for (const ll of loanLeads || []) {
        const phone = (ll.phone || "").replace(/\D/g, "").replace(/^91/, "");
        if (!phone || phone.length < 10) continue;

        const { data: existing } = await supabase
          .from("unified_customers")
          .select("id, has_loan_inquiry")
          .eq("phone", phone)
          .limit(1);

        if (existing && existing.length > 0) {
          if (!existing[0].has_loan_inquiry) {
            await supabase.from("unified_customers").update({
              has_loan_inquiry: true,
              customer_name: ll.name || undefined,
              latest_source: ll.source || undefined,
              last_activity_type: "loan_inquiry",
            }).eq("id", existing[0].id);
          }
        } else {
          await supabase.from("unified_customers").insert({
            phone,
            customer_name: ll.name || null,
            city: ll.city || null,
            has_loan_inquiry: true,
            first_source: ll.source || "loan",
            latest_source: ll.source || "loan",
            last_activity_type: "loan_inquiry",
            total_interactions: 1,
          });
          results.synced++;
        }
      }
    }

    if (action === "analyze" || action === "all") {
      // Behavioral cross-sell triggers
      const { data: customers } = await supabase
        .from("unified_customers")
        .select("*")
        .order("last_activity_at", { ascending: false })
        .limit(1000);

      for (const c of customers || []) {
        // Rule: Has car inquiry but no insurance → recommend insurance
        if (c.has_car_inquiry && !c.has_insurance) {
          const { data: exists } = await supabase
            .from("customer_journey_triggers")
            .select("id")
            .eq("customer_id", c.id)
            .eq("trigger_type", "car_to_insurance")
            .eq("status", "pending")
            .limit(1);

          if (!exists || exists.length === 0) {
            await supabase.from("customer_journey_triggers").insert({
              customer_id: c.id,
              trigger_type: "car_to_insurance",
              trigger_event: "car_inquiry_no_insurance",
              recommendation: "Recommend comprehensive car insurance with the vehicle purchase",
              metadata: { phone: c.phone, name: c.customer_name },
            });
            results.triggers_created++;
          }
        }

        // Rule: Has loan inquiry → recommend cars
        if (c.has_loan_inquiry && !c.has_car_inquiry) {
          const { data: exists } = await supabase
            .from("customer_journey_triggers")
            .select("id")
            .eq("customer_id", c.id)
            .eq("trigger_type", "loan_to_car")
            .eq("status", "pending")
            .limit(1);

          if (!exists || exists.length === 0) {
            await supabase.from("customer_journey_triggers").insert({
              customer_id: c.id,
              trigger_type: "loan_to_car",
              trigger_event: "loan_approved_no_car",
              recommendation: "Help customer find their dream car with pre-approved financing",
              metadata: { phone: c.phone, name: c.customer_name },
            });
            results.triggers_created++;
          }
        }

        // Rule: Has insurance but no accessories → recommend accessories
        if (c.has_insurance && !c.has_accessory_order) {
          const { data: exists } = await supabase
            .from("customer_journey_triggers")
            .select("id")
            .eq("customer_id", c.id)
            .eq("trigger_type", "insurance_to_accessories")
            .eq("status", "pending")
            .limit(1);

          if (!exists || exists.length === 0) {
            await supabase.from("customer_journey_triggers").insert({
              customer_id: c.id,
              trigger_type: "insurance_to_accessories",
              trigger_event: "insured_no_accessories",
              recommendation: "Offer premium car accessories and protection packages",
              metadata: { phone: c.phone, name: c.customer_name },
            });
            results.triggers_created++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Journey intelligence error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
