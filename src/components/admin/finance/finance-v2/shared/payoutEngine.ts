/**
 * Payout Calc Engine — pulls from commission_rules table when available,
 * falls back to industry-standard slabs.
 *
 * INSURANCE
 *  - standalone OD     : 15% of net_premium
 *  - third party (TP)  : 2.5% of net_premium
 *  - comprehensive     : 12% of net_premium
 *  - default           : 10% of net_premium
 *
 * LOANS
 *  - 1.2% of net disbursement (sanction_amount or disbursement_amount fallback)
 *
 * CAR DEALS
 *  - gross_margin = revenue (or deal_value) - dealer_payout
 *  - tds          = 5% of gross_margin
 *  - net_payout   = gross_margin - tds
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
  loan: 1.2,
  dealTdsPct: 5,
};

const norm = (s: string | null | undefined) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

/* ---------------- INSURANCE ---------------- */

export function getInsurancePayoutPct(policyType: string, rules: RuleRow[] = []): number {
  const t = norm(policyType);
  // Try DB rule first (vertical_name=insurance, conditions.policy_type matches)
  const match = rules.find((r) => {
    if (!r.is_active) return false;
    if (norm(r.vertical_name) !== "insurance") return false;
    const cond = r.conditions || {};
    const pt = norm(cond.policy_type || cond.product_type || "");
    return pt && t.includes(pt);
  });
  if (match?.percentage) return Number(match.percentage);

  if (t.includes("third") || t === "tp") return FALLBACK.insurance.tp;
  if (t.includes("comp")) return FALLBACK.insurance.comprehensive;
  if (t.includes("standalone") || t === "od" || t.includes("own_damage")) return FALLBACK.insurance.standalone;
  return FALLBACK.insurance.default;
}

export function computeInsurancePayout(policy: any, rules: RuleRow[] = []) {
  const base = Number(policy.net_premium || policy.premium_amount || 0);
  const pct = getInsurancePayoutPct(policy.policy_type, rules);
  const gross = (base * pct) / 100;
  const tds = gross * 0.05;
  const net = gross - tds;
  return { base, pct, gross, tds, net };
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
  const tds = gross * 0.05;
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
