/**
 * Placeholder substitution engine for PDF templates.
 * Supports {{key}} syntax with safe fallback to empty string.
 *
 * Example:
 *   substitute("Hi {{customer_name}}, your {{vehicle_number}} is ready", { customer_name: "Rahul", vehicle_number: "PB10AA1234" })
 *   → "Hi Rahul, your PB10AA1234 is ready"
 */

import type { PdfPlaceholderContext } from "./types";

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function lookup(ctx: PdfPlaceholderContext, key: string): string {
  // Support dot-notation: customer.name → customer_name
  const flatKey = key.replace(/\./g, "_");
  const v = ctx[flatKey] ?? ctx[key];
  if (v === null || v === undefined) return "";
  return String(v);
}

export function substitute(template: string, ctx: PdfPlaceholderContext = {}): string {
  if (!template) return "";
  return template.replace(PLACEHOLDER_RE, (_, key) => lookup(ctx, key));
}

/**
 * Pull commonly used placeholders out of a payload object.
 * Used by manual generators so any PDF can be rendered with consistent context.
 */
export function buildPlaceholderContext(payload: Record<string, any> = {}): PdfPlaceholderContext {
  const ctx: PdfPlaceholderContext = {};
  const map: Record<string, string[]> = {
    customer_name: ["customer_name", "name", "client_name", "owner_name", "shipping_name"],
    customer_phone: ["customer_phone", "phone", "mobile", "shipping_phone"],
    customer_email: ["customer_email", "email", "shipping_email"],
    customer_address: ["customer_address", "address", "shipping_address"],
    customer_city: ["customer_city", "city", "shipping_city"],
    customer_state: ["customer_state", "state", "shipping_state"],
    customer_gstin: ["customer_gstin", "gstin"],
    vehicle_number: ["vehicle_number", "registration_number", "vehicle_no"],
    vehicle_make: ["vehicle_make", "make", "brand"],
    vehicle_model: ["vehicle_model", "model"],
    vehicle_variant: ["vehicle_variant", "variant"],
    vehicle_year: ["vehicle_year", "year", "manufacturing_year"],
    vehicle_fuel: ["vehicle_fuel", "fuel_type", "fuel"],
    doc_number: ["doc_number", "invoice_number", "policy_number", "agreement_number", "order_id"],
    doc_date: ["doc_date", "invoice_date", "issued_date", "booking_date"],
    doc_type: ["doc_type", "document_type"],
    amount: ["amount", "total_amount", "premium_amount"],
    total: ["total", "total_amount", "grand_total"],
    tax: ["tax", "tax_amount", "gst_amount"],
  };

  for (const [target, sources] of Object.entries(map)) {
    for (const src of sources) {
      if (payload[src] !== undefined && payload[src] !== null && payload[src] !== "") {
        ctx[target] = payload[src];
        break;
      }
    }
  }

  // Also pass through any unknown keys so custom placeholders work
  for (const [k, v] of Object.entries(payload)) {
    if (ctx[k] === undefined && (typeof v === "string" || typeof v === "number")) {
      ctx[k] = v;
    }
  }

  return ctx;
}
