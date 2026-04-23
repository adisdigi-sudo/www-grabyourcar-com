/**
 * Meta WhatsApp UTILITY Compliance Validator
 *
 * Scores a message body (template body or plain text) against rules that Meta
 * applies when classifying templates as UTILITY (~₹0.12) vs MARKETING (~₹0.78).
 *
 * Used pre-send and pre-submit so agents/admins know whether a message is
 * likely to be classified as marketing — and how to fix it.
 *
 * Source of rules: Meta WhatsApp Business Solution category guidelines (April 2025
 * reclassification) + observed approval/rejection patterns on this account.
 */

export type Severity = "block" | "warn" | "info";

export interface ValidationIssue {
  rule: string;
  severity: Severity;
  message: string;
  suggestion?: string;
  matched?: string;
}

export interface ValidationResult {
  /** 0–100. >= 80 = utility-safe, 50–79 = risky, < 50 = will be marketing */
  score: number;
  verdict: "utility_safe" | "utility_risky" | "marketing_likely";
  issues: ValidationIssue[];
  estimatedCategory: "utility" | "marketing" | "authentication";
  cleaned?: string;
  emojiCount: number;
  promotionalPhraseCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule sets
// ─────────────────────────────────────────────────────────────────────────────

// Promotional phrases (case-insensitive) — Meta reclassifies these as MARKETING
const PROMO_PHRASES: Array<{ pattern: RegExp; label: string; suggestion: string }> = [
  { pattern: /\bhip\s*hip\s*hooray\b/i, label: '"Hip Hip Hooray"', suggestion: "Remove celebratory phrase" },
  { pattern: /\bcongratulations?\b/i, label: '"Congratulations"', suggestion: 'Use "Confirmed" or "Completed"' },
  { pattern: /\bwelcome\s+to\s+(the\s+)?\w+\s+family\b/i, label: '"Welcome to family"', suggestion: "Remove brand-warmth phrasing" },
  { pattern: /\bthank\s+you\s+(for\s+)?(choosing|trusting|preferring)\b/i, label: '"Thank you for choosing"', suggestion: "Drop emotional language" },
  { pattern: /\b(we\s+(truly\s+)?appreciate|we'?re?\s+thrilled|we'?re?\s+delighted)\b/i, label: 'Appreciative tone', suggestion: "Use neutral transactional voice" },
  { pattern: /\b(amazing|awesome|fantastic|wonderful|excellent\s+choice)\b/i, label: 'Hype adjective', suggestion: "Remove superlative" },
  { pattern: /\b(don'?t\s+miss|limited\s+time|hurry|book\s+now|grab\s+(your|the)\s+offer)\b/i, label: 'Marketing CTA', suggestion: "Remove urgency/promo CTA" },
  { pattern: /\b(special\s+offer|exclusive\s+deal|discount|cashback|free\s+gift)\b/i, label: 'Promotional offer', suggestion: "Remove offer language" },
  { pattern: /\b(rate\s+us|leave\s+a\s+review|share\s+your\s+experience)\b/i, label: 'Review solicitation', suggestion: "Use 'Reply with feedback' instead" },
  { pattern: /\brate\s+(us\s+)?(from\s+)?[0-5]\s*(to|-)\s*[0-5]\b/i, label: '"Rate 0 to 5" prompt', suggestion: "Drop rating scale; use single 'Share feedback' button" },
  { pattern: /\bhappy\s+(miles|journey|driving|days?)\b/i, label: 'Sentimental wish', suggestion: "Remove well-wishing language" },
  { pattern: /\bteam\s+grabyourcar\b/i, label: '"Team Grabyourcar" signoff', suggestion: 'Move to FOOTER as "Grabyourcar [Vertical] Services"' },
  { pattern: /\b(we'?re?\s+always\s+(here|with\s+you))\b/i, label: 'Relationship-building phrase', suggestion: "Remove" },
  { pattern: /\b(stay\s+tuned|follow\s+us|like\s+(our|the)\s+page)\b/i, label: 'Social CTA', suggestion: "Remove" },
];

// Branding signoff patterns (lines that shouldn't be in BODY for utility)
const BRAND_SIGNOFF_LINES: RegExp[] = [
  /^\s*\*?team\s+\w+\*?\s*$/im,
  /^\s*best\s+regards?,?\s*$/im,
  /^\s*warm\s+regards?,?\s*$/im,
];

// Currency without context (utility allows but should be plain "Rs" not ₹)
const RUPEE_SYMBOL = /₹/g;

// Emoji detection (broad unicode ranges)
const EMOJI_RE =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}\u{FE0F}\u{20E3}]/gu;

// Excessive formatting (utility allows minimal *bold*)
const BOLD_BLOCKS_RE = /\*[^\*\n]+\*/g;

// ─────────────────────────────────────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validateUtilityCompliance(input: {
  body: string;
  category?: "utility" | "marketing" | "authentication";
  /** If submitting a template: include footer/buttons text so we score the whole package */
  footer?: string;
  buttonTexts?: string[];
}): ValidationResult {
  const body = String(input.body || "");
  const issues: ValidationIssue[] = [];

  // ─── Emoji check ───
  const emojiMatches = body.match(EMOJI_RE) || [];
  const emojiCount = emojiMatches.length;
  if (emojiCount > 0) {
    issues.push({
      rule: "no_emojis",
      severity: emojiCount > 2 ? "block" : "warn",
      message: `${emojiCount} emoji${emojiCount > 1 ? "s" : ""} detected (${emojiMatches.slice(0, 5).join(" ")})`,
      suggestion: "Remove ALL emojis for utility category",
      matched: emojiMatches.slice(0, 8).join(" "),
    });
  }

  // ─── Promotional phrases ───
  let promotionalPhraseCount = 0;
  for (const p of PROMO_PHRASES) {
    const m = body.match(p.pattern);
    if (m) {
      promotionalPhraseCount++;
      issues.push({
        rule: "promotional_phrase",
        severity: "block",
        message: `Marketing phrase: ${p.label}`,
        suggestion: p.suggestion,
        matched: m[0],
      });
    }
  }

  // ─── Brand signoff ───
  for (const re of BRAND_SIGNOFF_LINES) {
    const m = body.match(re);
    if (m) {
      issues.push({
        rule: "brand_signoff_in_body",
        severity: "warn",
        message: `Branded signoff in body: "${m[0].trim()}"`,
        suggestion: "Move to FOOTER component instead",
        matched: m[0].trim(),
      });
    }
  }

  // ─── Rupee symbol (warn only) ───
  if (RUPEE_SYMBOL.test(body)) {
    issues.push({
      rule: "rupee_symbol",
      severity: "info",
      message: "Currency symbol ₹ detected",
      suggestion: 'Use "Rs " (with space) for broader compatibility',
    });
  }

  // ─── Excessive formatting ───
  const boldMatches = body.match(BOLD_BLOCKS_RE) || [];
  if (boldMatches.length > 3) {
    issues.push({
      rule: "excessive_bold",
      severity: "warn",
      message: `${boldMatches.length} bold blocks (>3 looks promotional)`,
      suggestion: "Limit to 1–2 bold sections (key facts only)",
    });
  }

  // ─── Length / paragraph density ───
  const paragraphCount = body.split(/\n\s*\n/).length;
  if (paragraphCount > 5) {
    issues.push({
      rule: "too_many_paragraphs",
      severity: "warn",
      message: `${paragraphCount} paragraphs — utility messages are typically 2–4`,
      suggestion: "Condense to essential facts only",
    });
  }

  // ─── Button text check ───
  for (const btn of input.buttonTexts || []) {
    if (EMOJI_RE.test(btn)) {
      issues.push({
        rule: "emoji_in_button",
        severity: "block",
        message: `Emoji in button: "${btn}"`,
        suggestion: "Plain text buttons only",
      });
    }
    if (/^rate\s+\d/i.test(btn)) {
      issues.push({
        rule: "rating_button",
        severity: "warn",
        message: `Rating button: "${btn}"`,
        suggestion: 'Use a single "Share feedback" QUICK_REPLY',
      });
    }
  }

  // ─── Score calculation ───
  let score = 100;
  for (const i of issues) {
    if (i.severity === "block") score -= 25;
    else if (i.severity === "warn") score -= 10;
    else score -= 3;
  }
  score = Math.max(0, Math.min(100, score));

  const verdict: ValidationResult["verdict"] =
    score >= 80 ? "utility_safe" : score >= 50 ? "utility_risky" : "marketing_likely";

  const estimatedCategory: ValidationResult["estimatedCategory"] =
    input.category === "authentication"
      ? "authentication"
      : verdict === "marketing_likely"
        ? "marketing"
        : "utility";

  return {
    score,
    verdict,
    issues,
    estimatedCategory,
    cleaned: autoClean(body),
    emojiCount,
    promotionalPhraseCount,
  };
}

/** Strip emojis + most common promo phrases. Best-effort suggestion, NOT a final fix. */
export function autoClean(body: string): string {
  let out = String(body || "");
  out = out.replace(EMOJI_RE, "");
  for (const p of PROMO_PHRASES) {
    out = out.replace(p.pattern, "");
  }
  for (const re of BRAND_SIGNOFF_LINES) {
    out = out.replace(re, "");
  }
  // collapse multiple blank lines
  out = out.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n");
  return out.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost estimation (Meta India pricing as of April 2025)
// ─────────────────────────────────────────────────────────────────────────────

export const META_PRICE_INR = {
  marketing: 0.78,
  utility: 0.12,
  authentication: 0.12,
  service: 0, // free 24h window text
} as const;

export type CostTier = keyof typeof META_PRICE_INR;

export function estimateMessageCost(opts: {
  category?: string | null;
  messageType?: string | null;
  windowOpen?: boolean;
}): { tier: CostTier; cost: number } {
  const cat = String(opts.category || "").toLowerCase();
  const mt = String(opts.messageType || "").toLowerCase();

  // Plain text / interactive while window is open = free service
  if (mt !== "template" && opts.windowOpen) {
    return { tier: "service", cost: 0 };
  }
  if (cat === "marketing") return { tier: "marketing", cost: META_PRICE_INR.marketing };
  if (cat === "authentication") return { tier: "authentication", cost: META_PRICE_INR.authentication };
  if (cat === "utility") return { tier: "utility", cost: META_PRICE_INR.utility };
  // unknown template = assume utility (conservative)
  if (mt === "template") return { tier: "utility", cost: META_PRICE_INR.utility };
  // plain text outside window (will fail anyway, but log as service attempt)
  return { tier: "service", cost: 0 };
}
