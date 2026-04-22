/**
 * Branded Payment Receipt
 * Mirrors the look/feel of generateBrandedInvoice but renders a payment receipt.
 */
import { createRenderer } from "./UnifiedPdfRenderer";
import { buildPlaceholderContext } from "./placeholders";
import { format } from "date-fns";

export interface BrandedReceiptData {
  payment_number: string;
  payment_date: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  amount: number;
  payment_mode?: string | null;
  invoice_number?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  vertical_name?: string | null;
  /** "credit" = received from customer (default), "debit" = refund out */
  payment_type?: "credit" | "debit";
  /** Optional context shown alongside amount */
  invoice_total?: number | null;
  invoice_balance_after?: number | null;
}

export interface GenerateBrandedReceiptOpts {
  returnBlob?: boolean;
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

const slugFor = (v?: string | null) =>
  !v ? "general" : VERTICAL_TO_SLUG[v] || v.toLowerCase().replace(/\s+/g, "-");

const fmtDate = (d?: string | null) => {
  if (!d) return undefined;
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
};

export const generateBrandedReceipt = async (
  rec: BrandedReceiptData,
  opts: GenerateBrandedReceiptOpts = {},
): Promise<Blob | void> => {
  const slug = slugFor(rec.vertical_name);
  const isDebit = rec.payment_type === "debit";

  const renderer = await createRenderer({
    vertical: slug,
    documentType: "invoice",
    documentTitle: isDebit ? "REFUND VOUCHER" : "PAYMENT RECEIPT",
    documentSubtitle: rec.payment_mode ? `Mode: ${rec.payment_mode}` : undefined,
  });

  renderer.setPlaceholderContext(
    buildPlaceholderContext({
      doc_number: rec.payment_number,
      doc_date: rec.payment_date,
      doc_type: "Receipt",
      customer_name: rec.customer_name,
      customer_phone: rec.customer_phone || undefined,
      customer_email: rec.customer_email || undefined,
      total: rec.amount,
    }),
  );

  const docMetaExtras: Record<string, string> = {};
  if (rec.invoice_number) docMetaExtras["Against Invoice"] = rec.invoice_number;
  if (rec.reference_number) docMetaExtras["Reference"] = rec.reference_number;
  if (rec.payment_mode) docMetaExtras["Payment Mode"] = rec.payment_mode;
  docMetaExtras["Type"] = isDebit ? "DEBIT (Refund)" : "CREDIT (Received)";

  renderer.renderTemplate({
    doc_meta: {
      docNumber: rec.payment_number,
      docDate: fmtDate(rec.payment_date) || rec.payment_date,
      subtitle: isDebit ? "Refund issued to customer" : "Payment received with thanks",
      extra: docMetaExtras,
    },
    customer: {
      data: {
        name: rec.customer_name,
        phone: rec.customer_phone || undefined,
        email: rec.customer_email || undefined,
      },
      title: isDebit ? "Refund To" : "Received From",
    },
    items: {
      data: {
        rows: [
          {
            description:
              (isDebit ? "Refund" : "Payment received") +
              (rec.invoice_number ? ` against Invoice ${rec.invoice_number}` : ""),
            qty: 1,
            rate: rec.amount,
            amount: rec.amount,
          },
        ],
      },
      title: "Payment Detail",
    },
    totals: {
      data: {
        subtotal: rec.amount,
        total: rec.amount,
        // Show outstanding balance line so user sees how much is left
        ...(rec.invoice_total != null
          ? { tax: undefined, discount: undefined }
          : {}),
      },
    },
    notes: rec.notes
      ? { text: rec.notes, title: "Notes" }
      : rec.invoice_balance_after != null
        ? {
            text:
              `Invoice Total: ₹${Math.round(rec.invoice_total || 0).toLocaleString("en-IN")}\n` +
              `This Payment: ₹${Math.round(rec.amount).toLocaleString("en-IN")}\n` +
              `Balance Outstanding: ₹${Math.round(rec.invoice_balance_after || 0).toLocaleString("en-IN")}`,
            title: "Payment Summary",
          }
        : undefined,
    bank: {},
    signature: { label: "Authorised Signatory" },
  });

  const fileName = `Receipt_${rec.payment_number}.pdf`;
  if (opts.returnBlob) return await renderer.toBlob();
  await renderer.save(fileName);
};
