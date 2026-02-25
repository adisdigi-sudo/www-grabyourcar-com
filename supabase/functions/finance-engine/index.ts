import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAuthenticatedUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");
  const client = createClient(supabaseUrl, anonKey);
  const { data: { user } } = await client.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function resolveTenantId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from("crm_users")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.tenant_id) throw new Error("No tenant assigned to this user");
  return data.tenant_id;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const user = await getAuthenticatedUser(req, supabaseUrl, anonKey);
    const tenantId = await resolveTenantId(supabase, user.id);

    const body = await req.json();
    const { action, ...payload } = body;

    // Role check
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id)
      .in("role", ["super_admin", "admin"]).maybeSingle();
    const isAdmin = !!roleRow;

    switch (action) {
      // ─── STEP 7: CREATE DEAL ───
      case "create_deal": {
        const {
          customer_id, vertical_name, deal_value, assigned_to, notes, metadata,
          payout_rule_id, commission_rule_id
        } = payload;

        if (!customer_id || !vertical_name || !deal_value) {
          throw new Error("customer_id, vertical_name, and deal_value are required");
        }

        // Fetch payout rule
        let dealer_payout = 0;
        let payout_type_used = "manual";
        let payout_value_used = 0;
        let resolvedPayoutRuleId = payout_rule_id || null;

        if (payout_rule_id) {
          const { data: rule } = await supabase
            .from("dealer_payout_rules")
            .select("*")
            .eq("id", payout_rule_id)
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .maybeSingle();

          if (rule) {
            payout_type_used = rule.payout_type;
            if (rule.payout_type === "fixed_amount") {
              dealer_payout = rule.base_amount || 0;
              payout_value_used = dealer_payout;
            } else if (rule.payout_type === "percentage") {
              dealer_payout = Math.round((deal_value * (rule.percentage || 0)) / 100);
              payout_value_used = rule.percentage || 0;
            } else if (rule.payout_type === "slab") {
              const slabs = (rule.slab_config as any[]) || [];
              for (const slab of slabs) {
                if (deal_value >= (slab.min || 0) && deal_value <= (slab.max || Infinity)) {
                  if (slab.type === "percentage") {
                    dealer_payout = Math.round((deal_value * slab.value) / 100);
                  } else {
                    dealer_payout = slab.value;
                  }
                  payout_value_used = slab.value;
                  break;
                }
              }
            }
          }
        } else {
          // Auto-find active rule for vertical
          const { data: autoRule } = await supabase
            .from("dealer_payout_rules")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("vertical_name", vertical_name)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (autoRule) {
            resolvedPayoutRuleId = autoRule.id;
            payout_type_used = autoRule.payout_type;
            if (autoRule.payout_type === "fixed_amount") {
              dealer_payout = autoRule.base_amount || 0;
              payout_value_used = dealer_payout;
            } else if (autoRule.payout_type === "percentage") {
              dealer_payout = Math.round((deal_value * (autoRule.percentage || 0)) / 100);
              payout_value_used = autoRule.percentage || 0;
            } else if (autoRule.payout_type === "slab") {
              const slabs = (autoRule.slab_config as any[]) || [];
              for (const slab of slabs) {
                if (deal_value >= (slab.min || 0) && deal_value <= (slab.max || Infinity)) {
                  if (slab.type === "percentage") {
                    dealer_payout = Math.round((deal_value * slab.value) / 100);
                  } else {
                    dealer_payout = slab.value;
                  }
                  payout_value_used = slab.value;
                  break;
                }
              }
            }
          }
        }

        // Fetch commission rule
        let commission_amount = 0;
        let commission_type_used = "percentage";
        let commission_value_used = 0;
        let resolvedCommRuleId = commission_rule_id || null;

        if (commission_rule_id) {
          const { data: cRule } = await supabase
            .from("commission_rules")
            .select("*")
            .eq("id", commission_rule_id)
            .eq("tenant_id", tenantId)
            .eq("is_active", true)
            .maybeSingle();

          if (cRule) {
            commission_type_used = cRule.commission_type;
            if (cRule.commission_type === "fixed_amount") {
              commission_amount = cRule.base_amount || 0;
              commission_value_used = commission_amount;
            } else if (cRule.commission_type === "percentage") {
              commission_amount = Math.round((deal_value * (cRule.percentage || 0)) / 100);
              commission_value_used = cRule.percentage || 0;
            } else if (cRule.commission_type === "slab") {
              const slabs = (cRule.slab_config as any[]) || [];
              for (const slab of slabs) {
                if (deal_value >= (slab.min || 0) && deal_value <= (slab.max || Infinity)) {
                  if (slab.type === "percentage") {
                    commission_amount = Math.round((deal_value * slab.value) / 100);
                  } else {
                    commission_amount = slab.value;
                  }
                  commission_value_used = slab.value;
                  break;
                }
              }
            }
          }
        } else {
          const { data: autoComm } = await supabase
            .from("commission_rules")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("vertical_name", vertical_name)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (autoComm) {
            resolvedCommRuleId = autoComm.id;
            commission_type_used = autoComm.commission_type;
            if (autoComm.commission_type === "fixed_amount") {
              commission_amount = autoComm.base_amount || 0;
              commission_value_used = commission_amount;
            } else if (autoComm.commission_type === "percentage") {
              commission_amount = Math.round((deal_value * (autoComm.percentage || 0)) / 100);
              commission_value_used = autoComm.percentage || 0;
            } else if (autoComm.commission_type === "slab") {
              const slabs = (autoComm.slab_config as any[]) || [];
              for (const slab of slabs) {
                if (deal_value >= (slab.min || 0) && deal_value <= (slab.max || Infinity)) {
                  if (slab.type === "percentage") {
                    commission_amount = Math.round((deal_value * slab.value) / 100);
                  } else {
                    commission_amount = slab.value;
                  }
                  commission_value_used = slab.value;
                  break;
                }
              }
            }
          }
        }

        const revenue_margin = deal_value - dealer_payout;

        const { data: deal, error: dealErr } = await supabase
          .from("deals")
          .insert({
            tenant_id: tenantId,
            customer_id,
            vertical_name,
            deal_value,
            dealer_payout,
            revenue_margin,
            commission_amount,
            payout_type_used,
            payout_value_used,
            commission_type_used,
            commission_value_used,
            payout_rule_id: resolvedPayoutRuleId,
            commission_rule_id: resolvedCommRuleId,
            assigned_to: assigned_to || null,
            notes: notes || null,
            metadata: metadata || null,
            deal_status: "active",
            payment_status: "pending",
            payment_received_amount: 0,
            created_by: user.id,
          })
          .select()
          .single();

        if (dealErr) throw dealErr;

        return new Response(JSON.stringify({ success: true, deal }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── STEP 8: UPDATE PAYMENT ───
      case "update_payment": {
        const { deal_id, amount } = payload;
        if (!deal_id || amount === undefined) throw new Error("deal_id and amount required");

        const { data: existing } = await supabase
          .from("deals")
          .select("payment_received_amount, deal_value")
          .eq("id", deal_id)
          .eq("tenant_id", tenantId)
          .single();

        if (!existing) throw new Error("Deal not found");

        const newAmount = (existing.payment_received_amount || 0) + amount;

        const { data: updated, error: upErr } = await supabase
          .from("deals")
          .update({ payment_received_amount: newAmount })
          .eq("id", deal_id)
          .eq("tenant_id", tenantId)
          .select()
          .single();

        if (upErr) throw upErr;

        return new Response(JSON.stringify({ success: true, deal: updated }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── STEP 9: CREATE EXPENSE ───
      case "create_expense": {
        const { vertical_name, category, description, amount, expense_date } = payload;
        if (!vertical_name || !category || !amount) {
          throw new Error("vertical_name, category, and amount are required");
        }

        const { data: expense, error: expErr } = await supabase
          .from("expenses")
          .insert({
            tenant_id: tenantId,
            vertical_name,
            category,
            description: description || null,
            amount,
            expense_date: expense_date || new Date().toISOString().split("T")[0],
            created_by: user.id,
          })
          .select()
          .single();

        if (expErr) throw expErr;

        return new Response(JSON.stringify({ success: true, expense }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── STEP 10: FINANCIAL DASHBOARD ───
      case "get_financial_dashboard": {
        const { vertical_name, month_year } = payload;

        // Deals query
        let dealsQuery = supabase
          .from("deals")
          .select("*")
          .eq("tenant_id", tenantId)
          .neq("deal_status", "cancelled");

        if (vertical_name) dealsQuery = dealsQuery.eq("vertical_name", vertical_name);
        if (month_year) {
          const [year, month] = month_year.split("-");
          const startDate = `${year}-${month}-01`;
          const endMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
          const endYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
          const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
          dealsQuery = dealsQuery.gte("created_at", startDate).lt("created_at", endDate);
        }

        const { data: deals } = await dealsQuery;

        // Expenses query
        let expQuery = supabase
          .from("expenses")
          .select("*")
          .eq("tenant_id", tenantId);

        if (vertical_name) expQuery = expQuery.eq("vertical_name", vertical_name);
        if (month_year) expQuery = expQuery.eq("month_year", month_year);

        const { data: expenses } = await expQuery;

        // Aggregate per vertical
        const verticals: Record<string, any> = {};
        for (const d of (deals || [])) {
          if (!verticals[d.vertical_name]) {
            verticals[d.vertical_name] = {
              total_deal_value: 0,
              total_dealer_payout: 0,
              total_revenue_margin: 0,
              total_commission: 0,
              total_expenses: 0,
              net_profit: 0,
              deal_count: 0,
              payment_received: 0,
              payment_pending: 0,
            };
          }
          const v = verticals[d.vertical_name];
          v.total_deal_value += d.deal_value || 0;
          v.total_dealer_payout += d.dealer_payout || 0;
          v.total_revenue_margin += d.revenue_margin || 0;
          v.total_commission += d.commission_amount || 0;
          v.deal_count++;
          v.payment_received += d.payment_received_amount || 0;
          v.payment_pending += (d.deal_value || 0) - (d.payment_received_amount || 0);
        }

        for (const e of (expenses || [])) {
          if (!verticals[e.vertical_name]) {
            verticals[e.vertical_name] = {
              total_deal_value: 0, total_dealer_payout: 0, total_revenue_margin: 0,
              total_commission: 0, total_expenses: 0, net_profit: 0, deal_count: 0,
              payment_received: 0, payment_pending: 0,
            };
          }
          verticals[e.vertical_name].total_expenses += e.amount || 0;
        }

        // Calculate net profit
        for (const v of Object.values(verticals)) {
          v.net_profit = v.total_revenue_margin - v.total_commission - v.total_expenses;
        }

        // Grand totals
        const grand = {
          total_deal_value: 0, total_dealer_payout: 0, total_revenue_margin: 0,
          total_commission: 0, total_expenses: 0, net_profit: 0, deal_count: 0,
          payment_received: 0, payment_pending: 0,
        };
        for (const v of Object.values(verticals)) {
          grand.total_deal_value += v.total_deal_value;
          grand.total_dealer_payout += v.total_dealer_payout;
          grand.total_revenue_margin += v.total_revenue_margin;
          grand.total_commission += v.total_commission;
          grand.total_expenses += v.total_expenses;
          grand.net_profit += v.net_profit;
          grand.deal_count += v.deal_count;
          grand.payment_received += v.payment_received;
          grand.payment_pending += v.payment_pending;
        }

        return new Response(JSON.stringify({
          success: true,
          per_vertical: verticals,
          grand_totals: grand,
          deals: deals || [],
          expenses: expenses || [],
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ─── STEP 11: DEAL AGING / OVERDUE PAYMENTS ───
      case "get_deal_aging": {
        let query = supabase
          .from("deals")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("deal_status", "active");

        const { vertical_name: vn } = payload;
        if (vn) query = query.eq("vertical_name", vn);

        const { data: activeDeals } = await query;
        const now = new Date();

        const overdue: any[] = [];
        const pendingPayments: any[] = [];
        const receivedPayments: any[] = [];
        const agingBuckets = { "0-7 days": 0, "8-15 days": 0, "16-30 days": 0, "30+ days": 0 };

        for (const d of (activeDeals || [])) {
          const age = daysBetween(d.created_at, now.toISOString());

          if (age <= 7) agingBuckets["0-7 days"]++;
          else if (age <= 15) agingBuckets["8-15 days"]++;
          else if (age <= 30) agingBuckets["16-30 days"]++;
          else agingBuckets["30+ days"]++;

          if (d.payment_status === "pending") {
            pendingPayments.push({ ...d, age_days: Math.round(age) });
            if (age > 15) overdue.push({ ...d, age_days: Math.round(age) });
          } else if (d.payment_status === "partial") {
            pendingPayments.push({ ...d, age_days: Math.round(age) });
            if (age > 30) overdue.push({ ...d, age_days: Math.round(age) });
          } else {
            receivedPayments.push(d);
          }
        }

        // Executive commission report
        const execCommissions: Record<string, any> = {};
        const { data: allClosedDeals } = await supabase
          .from("deals")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("deal_status", "closed");

        for (const d of (allClosedDeals || [])) {
          const execId = d.assigned_to || "unassigned";
          if (!execCommissions[execId]) {
            execCommissions[execId] = { deals_closed: 0, total_commission: 0, total_deal_value: 0 };
          }
          execCommissions[execId].deals_closed++;
          execCommissions[execId].total_commission += d.commission_amount || 0;
          execCommissions[execId].total_deal_value += d.deal_value || 0;
        }

        return new Response(JSON.stringify({
          success: true,
          aging_buckets: agingBuckets,
          overdue_payments: overdue,
          pending_payments: pendingPayments,
          received_payments: receivedPayments,
          executive_commission_report: execCommissions,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    const status = error.message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
