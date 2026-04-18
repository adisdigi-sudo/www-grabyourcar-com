/**
 * Premium Invoice Generator
 * Uses the Unified PDF Renderer + Resolved Branding to produce
 * fully branded invoices for ANY vertical.
 *
 * Maps the legacy `invoices` table row -> Renderer payloads.
 */

import { createRenderer } from "./UnifiedPdfRenderer";
import { buildPlaceholderContext } from "./placeholders";
import { format } from "date-fns";

export interface BrandedInvoiceItem {
  description: string;
  hsn?: string;
  quantity?: number | string;
  rate?: number | string;
  amount?: number | string;
  gst_rate?: number | string;
}

export interface BrandedInvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  client_address?: string | null;
  gstin?: string | null;
  vertical_name?: string | null;
  invoice_type?: string | null;
  status?: string | null;

  items?: BrandedInvoiceItem[];
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  amount_paid?: number;
  balance_due?: number;

  notes?: string | null;
  terms?: string | null;
  description?: string | null;
}

const VERTICAL_TO_SLUG: Record<string, string> = {
  "Car Sales": "sales",
  Sales: "sales",
  Insurance: "insurance",
  "Car Loans": "loans",
  Loans: "loans",
  HSRP: "hsrp",
  Rental: "self-drive",
  "Self Drive": "self-drive",
  Accessories: "accessories",
  Service: "service",
};

const slugFor = (vertical?: string | null): string => {
  if (!vertical) return "general";
  return VERTICAL_TO_SLUG[vertical] || vertical.toLowerCase().replace(/\s+/g, "-");
};

export interface GenerateBrandedInvoiceOpts {
  /** When true, returns the Blob instead of triggering a download. */
  returnBlob?: boolean;
}

export const generateBrandedInvoice = async (
  inv: BrandedInvoiceData,
  opts: GenerateBrandedInvoiceOpts = {},
): Promise<Blob | void> => {
  const slug = slugFor(inv.vertical_name);

  const renderer = await createRenderer({
    vertical: slug,
    documentType: "invoice",
    documentTitle: "TAX INVOICE",
    documentSubtitle: inv.invoice_type ? inv.invoice_type.toUpperCase() : undefined,
  });

  // Placeholder context for footer/terms substitution
  renderer.setPlaceholderContext(
    buildPlaceholderContext({
      doc_number: inv.invoice_number,
      doc_date: inv.invoice_date,
      doc_type: "Invoice",
      customer_name: inv.client_name,
      customer_phone: inv.client_phone || undefined,
      customer_email: inv.client_email || undefined,
      customer_address: inv.client_address || undefined,
      customer_gstin: inv.gstin || undefined,
      total: inv.total_amount,
    }),
  );

  // ---- Items normalisation
  const rawItems: BrandedInvoiceItem[] =
    Array.isArray(inv.items) && inv.items.length
      ? inv.items
      : [
          {
            description: inv.description || "Service",
            quantity: 1,
            rate: inv.subtotal || inv.total_amount,
            amount: inv.subtotal || inv.total_amount,
          },
        ];

  const itemRows = rawItems.map((it) => {
    const qty = Number(it.quantity ?? 1);
    const rate = Number(it.rate ?? 0);
    const amount = Number(it.amount ?? qty * rate);
    return {
      description: String(it.description || "Item"),
      hsn: it.hsn || "",
      qty,
      rate,
      amount,
    };
  });

  // ---- Totals
  const subtotal = Number(inv.subtotal ?? itemRows.reduce((s, r) => s + Number(r.amount || 0), 0));
  const tax = Number(inv.tax_amount ?? 0);
  const discount = Number(inv.discount_amount ?? 0);
  const total = Number(inv.total_amount ?? subtotal + tax - discount);

  const fmtDate = (d?: string | null) => {
    if (!d) return undefined;
    try {
      return format(new Date(d), "dd MMM yyyy");
    } catch {
      return d;
    }
  };

  const docMetaExtras: Record<string, string> = {};
  if (inv.due_date) docMetaExtras["Due Date"] = fmtDate(inv.due_date) || inv.due_date;
  if (inv.vertical_name) docMetaExtras["Vertical"] = inv.vertical_name;
  if (inv.status) docMetaExtras["Status"] = inv.status.toUpperCase();

  // ---- Render through the unified pipeline
  renderer.renderTemplate({
    doc_meta: {
      docNumber: inv.invoice_number,
      docDate: fmtDate(inv.invoice_date) || inv.invoice_date,
      subtitle: inv.invoice_type ? `Type: ${inv.invoice_type}` : undefined,
      extra: docMetaExtras,
    },
    customer: {
      data: {
        name: inv.client_name,
        phone: inv.client_phone || undefined,
        email: inv.client_email || undefined,
        address: inv.client_address || undefined,
        gstin: inv.gstin || undefined,
      },
      title: "Bill To",
    },
    items: {
      data: {
        rows: itemRows,
      },
      title: "Items",
    },
    totals: {
      data: {
        subtotal,
        discount: discount || undefined,
        tax: tax || undefined,
        total,
      },
    },
    notes: inv.notes ? { text: inv.notes, title: "Notes" } : undefined,
    terms: inv.terms ? { text: inv.terms, title: "Terms & Conditions" } : undefined,
    bank: {},
    signature: { label: "Authorised Signatory" },
  });

  const fileName = `Invoice_${inv.invoice_number}.pdf`;

  if (opts.returnBlob) {
    return await renderer.toBlob();
  }
  await renderer.save(fileName);
};
