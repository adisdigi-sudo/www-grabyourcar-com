/**
 * Payout Calc Engine — Founder-locked formulas.
 *
 * INSURANCE
 *
 *   STANDALONE OD
 *     base   = total_premium − 18% GST   (i.e. total_premium / 1.18)
 *     payout = base × %  (default 15%)
 *
 *   THIRD PARTY (TP)
 *     base   = total_premium − 18% GST
 *     payout = base × %  (default 2.5%)
 *
 *   COMPREHENSIVE
 *     step 1: less_18_5 = total_premium − 18.5%   (total_premium / 1.185)
 *     step 2: base      = less_18_5 − tp_premium − pa_driver_premium  (if available)
 *     payout = base × %  (default 12%)
 *
 *   TDS = 5% of gross payout
 *
 * LOANS
 *   - 1.2% of net disbursement (sanction_amount or disbursement_amount fallback)
 *   - TDS = 5%
 *
 * CAR DEALS
 *   - gross_margin = deal_value − dealer_payout
 *   - tds = 5% of gross_margin
 *   - net = gross_margin − tds
 */

export type RuleRow = {
  id: string;
  vertical_name: string;
  role: string;
  rule_name: string;
  commission_type: string;
  base_amount: number | null;
  percentage: number | null;
  conditions: any;
  is_active: boolean;
};

const FALLBACK = {
  insurance: {
    standalone: 15,
    od: 15,
    tp: 2.5,
    third_party: 2.5,
    comprehensive: 12,
    default: 10,
  } as Record<string, number>,
  // Default share for mandatory TP inside a comprehensive policy when not explicitly recorded
  comprehensive_tp_share: 0.18,
  comprehensive_pa_share: 0,
  loan: 1.2,
  dealTdsPct: 5,
  gstPct: 18,            // standalone & third-party
  gstPctComprehensive: 18.5,  // founder-locked: comprehensive uses 18.5%
  tdsPct: 5,
};

const norm = (s: string | null | undefined) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

/* ---------------- INSURANCE ---------------- */

export type PolicyKind = "standalone" | "third_party" | "comprehensive" | "other";

export function classifyPolicy(policyType: string): PolicyKind {
  const t = norm(policyType);
  if (t.includes("third") || t === "tp") return "third_party";
  if (t.includes("comp")) return "comprehensive";
  if (t.includes("standalone") || t === "od" || t.includes("own_damage")) return "standalone";
  return "other";
}

export function getInsurancePayoutPct(policyType: string, rules: RuleRow[] = []): number {
  const t = norm(policyType);
  const match = rules.find((r) => {
    if (!r.is_active) return false;
    if (norm(r.vertical_name) !== "insurance") return false;
    const cond = r.conditions || {};
    const pt = norm(cond.policy_type || cond.product_type || "");
    return pt && t.includes(pt);
  });
  if (match?.percentage) return Number(match.percentage);

  const k = classifyPolicy(policyType);
  if (k === "third_party") return FALLBACK.insurance.tp;
  if (k === "comprehensive") return FALLBACK.insurance.comprehensive;
  if (k === "standalone") return FALLBACK.insurance.standalone;
  return FALLBACK.insurance.default;
}

/**
 * Returns the GST-excluded base, plus the components used for comprehensive split.
 */
export function deriveInsuranceBase(policy: any) {
  const totalPremium = Number(policy.premium_amount || 0);
  const storedNet = Number(policy.net_premium || 0);
  // baseExGst preference: stored net_premium if > 0, else strip GST
  const baseExGst = storedNet > 0 ? storedNet : totalPremium > 0 ? totalPremium / (1 + FALLBACK.gstPct / 100) : 0;

  // Optional explicit splits if recorded in metadata / addons
  const meta = (policy.metadata && typeof policy.metadata === "object" ? policy.metadata : {}) || {};
  const tpExplicit = Number(meta.tp_premium ?? policy.tp_premium ?? 0) || 0;
  const paExplicit = Number(meta.pa_premium ?? policy.pa_premium ?? 0) || 0;

  return {
    totalPremium,
    gstAmount: totalPremium - baseExGst,
    baseExGst,
    tpExplicit,
    paExplicit,
  };
}

export function computeInsurancePayout(policy: any, rules: RuleRow[] = []) {
  const kind = classifyPolicy(policy.policy_type);
  const pct = getInsurancePayoutPct(policy.policy_type, rules);
  const der = deriveInsuranceBase(policy);

  let base = 0;
  const breakup: Record<string, number> = {
    total_premium: der.totalPremium,
    gst_18pct: der.gstAmount,
    base_ex_gst: der.baseExGst,
    tp_less: 0,
    pa_less: 0,
  };

  if (kind === "comprehensive") {
    const tp = der.tpExplicit > 0
      ? der.tpExplicit
      : der.baseExGst * FALLBACK.comprehensive_tp_share;
    const pa = der.paExplicit > 0
      ? der.paExplicit
      : der.baseExGst * FALLBACK.comprehensive_pa_share;
    breakup.tp_less = tp;
    breakup.pa_less = pa;
    base = Math.max(0, der.baseExGst - tp - pa);
  } else if (kind === "third_party" || kind === "standalone") {
    base = der.baseExGst;
  } else {
    base = der.baseExGst;
  }

  const gross = (base * pct) / 100;
  const tds = gross * (FALLBACK.tdsPct / 100);
  const net = gross - tds;
  return { kind, base, pct, gross, tds, net, breakup };
}

/* ---------------- LOANS ---------------- */

export function getLoanPayoutPct(rules: RuleRow[] = []): number {
  const m = rules.find((r) => r.is_active && norm(r.vertical_name).includes("loan"));
  return Number(m?.percentage || FALLBACK.loan);
}

export function computeLoanPayout(loan: any, rules: RuleRow[] = []) {
  const base = Number(loan.disbursement_amount || loan.sanction_amount || loan.loan_amount || 0);
  const pct = getLoanPayoutPct(rules);
  const gross = (base * pct) / 100;
  const tds = gross * (FALLBACK.tdsPct / 100);
  const net = gross - tds;
  return { base, pct, gross, tds, net };
}

/* ---------------- CAR DEALS / AUTOMOTIVE ---------------- */

export function computeDealPayout(deal: any) {
  const dealValue = Number(deal.deal_value || deal.revenue || 0);
  const dealerPayout = Number(deal.dealer_payout || 0);
  const grossMargin = dealValue - dealerPayout;
  const pct = dealValue > 0 ? (grossMargin / dealValue) * 100 : 0;
  const tds = grossMargin > 0 ? grossMargin * (FALLBACK.dealTdsPct / 100) : 0;
  const net = grossMargin - tds;
  const received = Number(deal.payment_received_amount || 0);
  const pending = Math.max(0, dealValue - received);
  return { dealValue, dealerPayout, grossMargin, pct, tds, net, received, pending };
}

export const inr = (n: number) =>
  `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
