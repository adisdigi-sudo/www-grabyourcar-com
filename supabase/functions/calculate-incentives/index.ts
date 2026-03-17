import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { month_year, vertical_name } = await req.json();
    const targetMonth = month_year || new Date().toISOString().slice(0, 7);

    // Get active rules
    const { data: rules } = await supabase
      .from("incentive_rules")
      .select("*")
      .eq("is_active", true)
      .match(vertical_name ? { vertical_name } : {});

    if (!rules?.length) {
      return new Response(JSON.stringify({ message: "No active rules found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all team members
    const { data: members } = await supabase.from("team_members").select("*").eq("is_active", true);

    // Get deal data per vertical
    const results: any[] = [];

    for (const member of members || []) {
      const verticals = vertical_name ? [vertical_name] : ["car_sales", "insurance", "car_loans"];

      for (const vert of verticals) {
        let deals: any[] = [];
        let totalValue = 0;

        // Fetch completed deals for this member in this month
        if (vert === "car_sales") {
          const { data } = await supabase.from("sales_pipeline")
            .select("*")
            .eq("assigned_to", member.user_id)
            .eq("current_stage", "after_sales")
            .gte("created_at", `${targetMonth}-01`)
            .lt("created_at", `${targetMonth}-31T23:59:59`);
          deals = data || [];
          totalValue = deals.reduce((s: number, d: any) => s + Number(d.deal_value || 0), 0);
        } else if (vert === "insurance") {
          const { data } = await supabase.from("insurance_clients")
            .select("*")
            .eq("assigned_to", member.user_id)
            .in("status", ["policy_done", "renewed"])
            .gte("created_at", `${targetMonth}-01`)
            .lt("created_at", `${targetMonth}-31T23:59:59`);
          deals = data || [];
          totalValue = deals.reduce((s: number, d: any) => s + Number(d.premium_amount || 0), 0);
        } else if (vert === "car_loans") {
          const { data } = await supabase.from("car_loan_leads")
            .select("*")
            .eq("assigned_to", member.user_id)
            .eq("status", "disbursed")
            .gte("created_at", `${targetMonth}-01`)
            .lt("created_at", `${targetMonth}-31T23:59:59`);
          deals = data || [];
          totalValue = deals.reduce((s: number, d: any) => s + Number(d.loan_amount_requested || 0), 0);
        }

        if (deals.length === 0) continue;

        const vertRules = (rules || []).filter((r: any) => r.vertical_name === vert && r.role_applicable !== "manager");
        let baseIncentive = 0;
        let slabBonus = 0;
        const calcDetails: any[] = [];

        for (const rule of vertRules) {
          if (rule.rule_type === "fixed") {
            const amt = deals.length * Number(rule.fixed_amount);
            baseIncentive += amt;
            calcDetails.push({ rule: rule.rule_name, type: "fixed", deals: deals.length, per_deal: rule.fixed_amount, total: amt });
          } else if (rule.rule_type === "slab") {
            const slabs = rule.slab_config || [];
            const condType = rule.conditions?.type;
            const checkVal = condType === "target_achievement_pct" ? 0 : deals.length;
            for (const slab of slabs) {
              if (checkVal >= slab.min && checkVal <= slab.max) {
                const amt = condType ? Number(slab.amount) : deals.length * Number(slab.amount);
                slabBonus += amt;
                calcDetails.push({ rule: rule.rule_name, type: "slab", slab, count: deals.length, total: amt });
                break;
              }
            }
          } else if (rule.rule_type === "bank_wise") {
            const bankConfig = rule.bank_wise_config || [];
            for (const deal of deals) {
              const bank = deal.bank_name || deal.source || "Other";
              const cfg = bankConfig.find((b: any) => b.bank.toLowerCase() === bank.toLowerCase()) || bankConfig.find((b: any) => b.bank === "Other");
              if (cfg) {
                baseIncentive += Number(cfg.amount);
                calcDetails.push({ rule: rule.rule_name, type: "bank_wise", bank, amount: cfg.amount });
              }
            }
          } else if (rule.rule_type === "percentage") {
            const amt = totalValue * Number(rule.percentage) / 100;
            baseIncentive += amt;
            calcDetails.push({ rule: rule.rule_name, type: "percentage", pct: rule.percentage, value: totalValue, total: amt });
          }
        }

        // Create individual entries
        for (const deal of deals) {
          const perDealAmt = (baseIncentive + slabBonus) / deals.length;
          await supabase.from("incentive_entries").upsert({
            user_id: member.user_id,
            employee_name: member.full_name,
            vertical_name: vert,
            month_year: targetMonth,
            deal_reference: deal.id,
            deal_description: deal.customer_name || deal.name || "Deal",
            deal_value: Number(deal.deal_value || deal.premium_amount || deal.loan_amount_requested || 0),
            incentive_amount: Math.round(perDealAmt),
            status: "pending",
            calculation_details: calcDetails,
          }, { onConflict: "id" });
        }

        // Upsert monthly summary
        await supabase.from("incentive_monthly_summary").upsert({
          user_id: member.user_id,
          employee_name: member.full_name,
          role: member.role || "employee",
          vertical_name: vert,
          month_year: targetMonth,
          total_deals: deals.length,
          total_deal_value: totalValue,
          base_incentive: Math.round(baseIncentive),
          slab_bonus: Math.round(slabBonus),
          total_incentive: Math.round(baseIncentive + slabBonus),
          status: "calculated",
        }, { onConflict: "user_id,vertical_name,month_year" });

        results.push({ member: member.full_name, vertical: vert, deals: deals.length, incentive: Math.round(baseIncentive + slabBonus) });
      }
    }

    // Manager bonuses
    const managerRules = (rules || []).filter((r: any) => r.role_applicable === "manager");
    for (const rule of managerRules) {
      const managers = (members || []).filter((m: any) => m.role === "manager");
      for (const mgr of managers) {
        const { data: teamSummaries } = await supabase
          .from("incentive_monthly_summary")
          .select("*")
          .eq("vertical_name", rule.vertical_name)
          .eq("month_year", targetMonth)
          .neq("user_id", mgr.user_id);

        const teamDeals = (teamSummaries || []).reduce((s: number, t: any) => s + Number(t.total_deals || 0), 0);
        const teamValue = (teamSummaries || []).reduce((s: number, t: any) => s + Number(t.total_deal_value || 0), 0);

        // Get team target
        const { data: target } = await supabase.from("incentive_targets")
          .select("*").eq("user_id", mgr.user_id).eq("vertical_name", rule.vertical_name).eq("month_year", targetMonth).single();
        
        const teamTarget = target?.target_count || 20;
        const achievementPct = teamTarget > 0 ? Math.round((teamDeals / teamTarget) * 100) : 0;
        
        let bonusAmount = 0;
        const slabs = rule.slab_config || [];
        for (const slab of slabs) {
          if (achievementPct >= slab.min && achievementPct <= slab.max) {
            bonusAmount = Number(slab.amount);
            break;
          }
        }

        if (bonusAmount > 0) {
          await supabase.from("manager_bonus_tracking").upsert({
            manager_user_id: mgr.user_id,
            manager_name: mgr.full_name,
            vertical_name: rule.vertical_name,
            month_year: targetMonth,
            team_total_deals: teamDeals,
            team_total_value: teamValue,
            team_target: teamTarget,
            team_achievement_pct: achievementPct,
            bonus_amount: bonusAmount,
            bonus_config: rule.slab_config,
            status: "calculated",
          }, { onConflict: "manager_user_id,vertical_name,month_year" });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, calculated: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
