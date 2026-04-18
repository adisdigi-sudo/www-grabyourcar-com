/**
 * Live HTML preview that mimics the unified PDF layout.
 * Updates in real time as the editor form changes — and now reflects the
 * currently-selected document type (Quote, Policy, Invoice, etc.) so users see
 * the exact template they're configuring.
 */

import { Image as ImageIcon } from "lucide-react";

interface Props {
  branding: {
    company_name: string;
    company_tagline: string;
    logo_url: string;
    signature_url: string;
    signature_name: string;
    brand_primary_color: string;
    brand_accent_color: string;
    brand_text_color: string;
    brand_muted_color: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    website: string;
    gstin: string;
    footer_text: string;
  };
  /** Currently-selected document type from the editor (e.g. "policy", "quote"). */
  documentType?: string;
}

type DocSample = {
  title: string;
  ref: string;
  billToLabel: string;
  signatureFallback: string;
  rows: { description: string; qty: string; amount: string }[];
  totalLabel: string;
  totalValue: string;
  badge?: string;
};

const SAMPLES: Record<string, DocSample> = {
  quote: {
    title: "QUOTATION",
    ref: "QT-2026-001",
    billToLabel: "Bill To",
    signatureFallback: "Authorised Signatory",
    rows: [{ description: "Comprehensive Insurance — 1 Year", qty: "1", amount: "₹12,500" }],
    totalLabel: "Total Premium",
    totalValue: "₹12,500",
  },
  policy: {
    title: "INSURANCE POLICY",
    ref: "POL/2026/000123",
    billToLabel: "Insured",
    signatureFallback: "For Insurance Manager",
    rows: [
      { description: "Own Damage Cover", qty: "—", amount: "₹8,200" },
      { description: "Third Party Liability", qty: "—", amount: "₹4,300" },
    ],
    totalLabel: "Net Premium",
    totalValue: "₹12,500",
    badge: "ACTIVE",
  },
  renewal_reminder: {
    title: "RENEWAL REMINDER",
    ref: "REN/2026/000044",
    billToLabel: "Customer",
    signatureFallback: "Renewals Team",
    rows: [{ description: "Policy renewal — due in 14 days", qty: "1", amount: "₹13,100" }],
    totalLabel: "Estimated Renewal",
    totalValue: "₹13,100",
    badge: "ACTION NEEDED",
  },
  renewal_notice: {
    title: "RENEWAL NOTICE",
    ref: "RN/2026/000044",
    billToLabel: "Customer",
    signatureFallback: "Renewals Team",
    rows: [{ description: "Annual policy renewal notice", qty: "1", amount: "₹13,100" }],
    totalLabel: "Renewal Amount",
    totalValue: "₹13,100",
  },
  claim_acknowledgement: {
    title: "CLAIM ACKNOWLEDGEMENT",
    ref: "CLM/ACK/2026/0098",
    billToLabel: "Claimant",
    signatureFallback: "Claims Officer",
    rows: [{ description: "Motor own-damage claim received & registered", qty: "—", amount: "—" }],
    totalLabel: "Status",
    totalValue: "Under Review",
    badge: "RECEIVED",
  },
  claim_intimation: {
    title: "CLAIM INTIMATION",
    ref: "CLM/INT/2026/0098",
    billToLabel: "Insured",
    signatureFallback: "Surveyor",
    rows: [{ description: "Loss intimation for vehicle damage", qty: "—", amount: "—" }],
    totalLabel: "Estimated Loss",
    totalValue: "₹45,000",
    badge: "INITIATED",
  },
  endorsement: {
    title: "POLICY ENDORSEMENT",
    ref: "END/2026/0044",
    billToLabel: "Insured",
    signatureFallback: "For Insurance Manager",
    rows: [{ description: "Add-on cover added: Zero Depreciation", qty: "1", amount: "₹2,400" }],
    totalLabel: "Differential Premium",
    totalValue: "₹2,400",
  },
  policy_schedule: {
    title: "POLICY SCHEDULE",
    ref: "PS/2026/000123",
    billToLabel: "Insured",
    signatureFallback: "For Insurance Manager",
    rows: [
      { description: "IDV Coverage", qty: "—", amount: "₹6,80,000" },
      { description: "NCB Discount", qty: "20%", amount: "−₹1,640" },
    ],
    totalLabel: "Sum Insured",
    totalValue: "₹6,80,000",
  },
  proforma_invoice: {
    title: "PROFORMA INVOICE",
    ref: "PI-2026-001",
    billToLabel: "Bill To",
    signatureFallback: "Authorised Signatory",
    rows: [{ description: "Vehicle booking — on-road price", qty: "1", amount: "₹8,45,000" }],
    totalLabel: "Total",
    totalValue: "₹8,45,000",
  },
  booking_confirmation: {
    title: "BOOKING CONFIRMATION",
    ref: "BK-2026-0044",
    billToLabel: "Customer",
    signatureFallback: "Sales Manager",
    rows: [{ description: "Booking amount received", qty: "1", amount: "₹25,000" }],
    totalLabel: "Booking Paid",
    totalValue: "₹25,000",
    badge: "CONFIRMED",
  },
  delivery_note: {
    title: "DELIVERY NOTE",
    ref: "DN-2026-0044",
    billToLabel: "Customer",
    signatureFallback: "Delivery Executive",
    rows: [{ description: "Vehicle handover & inspection complete", qty: "1", amount: "—" }],
    totalLabel: "Status",
    totalValue: "Delivered",
    badge: "DELIVERED",
  },
  tax_invoice: {
    title: "TAX INVOICE",
    ref: "INV-2026-0044",
    billToLabel: "Bill To",
    signatureFallback: "Authorised Signatory",
    rows: [
      { description: "Vehicle / Service", qty: "1", amount: "₹10,000" },
      { description: "GST @ 18%", qty: "—", amount: "₹1,800" },
    ],
    totalLabel: "Grand Total",
    totalValue: "₹11,800",
  },
  invoice: {
    title: "INVOICE",
    ref: "INV-2026-0044",
    billToLabel: "Bill To",
    signatureFallback: "Authorised Signatory",
    rows: [{ description: "Service charges", qty: "1", amount: "₹10,000" }],
    totalLabel: "Total",
    totalValue: "₹10,000",
  },
  loan_quote: {
    title: "LOAN QUOTATION",
    ref: "LQ-2026-0044",
    billToLabel: "Applicant",
    signatureFallback: "Loan Officer",
    rows: [
      { description: "Loan amount", qty: "—", amount: "₹6,00,000" },
      { description: "Tenure / Rate", qty: "60m", amount: "8.75%" },
    ],
    totalLabel: "EMI",
    totalValue: "₹12,387",
  },
  comparison_sheet: {
    title: "BANK COMPARISON",
    ref: "CMP-2026-0044",
    billToLabel: "Applicant",
    signatureFallback: "Loan Advisor",
    rows: [
      { description: "HDFC Bank — 8.65%", qty: "60m", amount: "₹12,340" },
      { description: "ICICI Bank — 8.85%", qty: "60m", amount: "₹12,420" },
      { description: "SBI — 8.75%", qty: "60m", amount: "₹12,380" },
    ],
    totalLabel: "Best EMI",
    totalValue: "₹12,340",
    badge: "3-WAY",
  },
  sanction_letter: {
    title: "LOAN SANCTION LETTER",
    ref: "SL-2026-0044",
    billToLabel: "Applicant",
    signatureFallback: "Authorised by Lender",
    rows: [{ description: "Sanctioned loan amount", qty: "1", amount: "₹6,00,000" }],
    totalLabel: "Sanctioned",
    totalValue: "₹6,00,000",
    badge: "APPROVED",
  },
  disbursal_voucher: {
    title: "DISBURSAL VOUCHER",
    ref: "DV-2026-0044",
    billToLabel: "Beneficiary",
    signatureFallback: "Finance Officer",
    rows: [{ description: "Disbursed to dealer", qty: "1", amount: "₹6,00,000" }],
    totalLabel: "Disbursed",
    totalValue: "₹6,00,000",
    badge: "PAID",
  },
  booking_receipt: {
    title: "HSRP BOOKING RECEIPT",
    ref: "HSRP-2026-0044",
    billToLabel: "Customer",
    signatureFallback: "HSRP Operator",
    rows: [{ description: "HSRP plate booking — 4-wheeler", qty: "1", amount: "₹1,500" }],
    totalLabel: "Paid",
    totalValue: "₹1,500",
    badge: "BOOKED",
  },
  service_invoice: {
    title: "SERVICE INVOICE",
    ref: "SVC-2026-0044",
    billToLabel: "Customer",
    signatureFallback: "Service Manager",
    rows: [{ description: "HSRP fitment service", qty: "1", amount: "₹1,500" }],
    totalLabel: "Total",
    totalValue: "₹1,500",
  },
  fitment_certificate: {
    title: "FITMENT CERTIFICATE",
    ref: "FIT-2026-0044",
    billToLabel: "Vehicle Owner",
    signatureFallback: "Fitment Engineer",
    rows: [{ description: "HSRP successfully affixed & verified", qty: "1", amount: "—" }],
    totalLabel: "Status",
    totalValue: "Certified",
    badge: "CERTIFIED",
  },
  rental_quote: {
    title: "RENTAL QUOTE",
    ref: "RQ-2026-0044",
    billToLabel: "Renter",
    signatureFallback: "Rental Manager",
    rows: [{ description: "Self-drive rental — 3 days", qty: "3", amount: "₹6,000" }],
    totalLabel: "Estimated Total",
    totalValue: "₹6,000",
  },
  agreement: {
    title: "RENTAL AGREEMENT",
    ref: "AGR-2026-0044",
    billToLabel: "Renter",
    signatureFallback: "Renter & Operator",
    rows: [{ description: "14-section legal rental agreement", qty: "—", amount: "—" }],
    totalLabel: "Status",
    totalValue: "Signed",
    badge: "LEGAL",
  },
  damage_report: {
    title: "DAMAGE REPORT",
    ref: "DMG-2026-0044",
    billToLabel: "Renter",
    signatureFallback: "Inspection Officer",
    rows: [{ description: "Pre-/Post-trip vehicle inspection", qty: "—", amount: "—" }],
    totalLabel: "Damage Cost",
    totalValue: "₹0",
  },
  shipping_label: {
    title: "SHIPPING LABEL",
    ref: "SHIP-2026-0044",
    billToLabel: "Ship To",
    signatureFallback: "Dispatch",
    rows: [{ description: "1 carton — Accessories order", qty: "1", amount: "—" }],
    totalLabel: "Mode",
    totalValue: "Courier",
    badge: "DISPATCHED",
  },
  warranty_card: {
    title: "WARRANTY CARD",
    ref: "WAR-2026-0044",
    billToLabel: "Customer",
    signatureFallback: "Warranty Desk",
    rows: [{ description: "Manufacturer warranty — 12 months", qty: "1", amount: "—" }],
    totalLabel: "Validity",
    totalValue: "12 Months",
  },
  proposal: {
    title: "PROPOSAL",
    ref: "PRO-2026-0044",
    billToLabel: "Client",
    signatureFallback: "Account Manager",
    rows: [{ description: "Marketing services proposal", qty: "1", amount: "₹50,000" }],
    totalLabel: "Total",
    totalValue: "₹50,000",
  },
  report: {
    title: "REPORT",
    ref: "RPT-2026-0044",
    billToLabel: "Recipient",
    signatureFallback: "Reporting Lead",
    rows: [{ description: "Performance summary", qty: "—", amount: "—" }],
    totalLabel: "Period",
    totalValue: "Apr 2026",
  },
  spec_sheet: {
    title: "SPEC SHEET",
    ref: "SPEC-2026-0044",
    billToLabel: "Prepared For",
    signatureFallback: "Product Desk",
    rows: [{ description: "Vehicle specifications & features", qty: "—", amount: "—" }],
    totalLabel: "Variant",
    totalValue: "Top",
  },
  comparison: {
    title: "VEHICLE COMPARISON",
    ref: "VC-2026-0044",
    billToLabel: "Prepared For",
    signatureFallback: "Product Desk",
    rows: [
      { description: "Car A — On-road", qty: "—", amount: "₹9,20,000" },
      { description: "Car B — On-road", qty: "—", amount: "₹9,75,000" },
    ],
    totalLabel: "Recommended",
    totalValue: "Car A",
  },
  partner_invoice: {
    title: "PARTNER INVOICE",
    ref: "PI-2026-0044",
    billToLabel: "Dealer",
    signatureFallback: "Accounts",
    rows: [{ description: "Lead share — April", qty: "1", amount: "₹25,000" }],
    totalLabel: "Total",
    totalValue: "₹25,000",
  },
  commission_statement: {
    title: "COMMISSION STATEMENT",
    ref: "CS-2026-0044",
    billToLabel: "Partner",
    signatureFallback: "Accounts",
    rows: [{ description: "12 deals × ₹2,000", qty: "12", amount: "₹24,000" }],
    totalLabel: "Payable",
    totalValue: "₹24,000",
  },
  receipt: {
    title: "PAYMENT RECEIPT",
    ref: "RCT-2026-0044",
    billToLabel: "Received From",
    signatureFallback: "Cashier",
    rows: [{ description: "Payment received", qty: "1", amount: "₹10,000" }],
    totalLabel: "Received",
    totalValue: "₹10,000",
    badge: "PAID",
  },
  credit_note: {
    title: "CREDIT NOTE",
    ref: "CN-2026-0044",
    billToLabel: "Customer",
    signatureFallback: "Accounts",
    rows: [{ description: "Refund — partial", qty: "1", amount: "−₹2,000" }],
    totalLabel: "Credit",
    totalValue: "₹2,000",
  },
  debit_note: {
    title: "DEBIT NOTE",
    ref: "DN-2026-0044",
    billToLabel: "Customer",
    signatureFallback: "Accounts",
    rows: [{ description: "Additional charge", qty: "1", amount: "₹2,000" }],
    totalLabel: "Debit",
    totalValue: "₹2,000",
  },
  offer_letter: {
    title: "OFFER LETTER",
    ref: "OL-2026-0044",
    billToLabel: "Candidate",
    signatureFallback: "HR Manager",
    rows: [{ description: "Position: Senior Executive", qty: "—", amount: "—" }],
    totalLabel: "CTC",
    totalValue: "₹6,00,000 / yr",
  },
  salary_slip: {
    title: "SALARY SLIP",
    ref: "SAL-2026-04",
    billToLabel: "Employee",
    signatureFallback: "Payroll",
    rows: [
      { description: "Basic + HRA + Allowances", qty: "—", amount: "₹50,000" },
      { description: "Deductions (PF + Tax)", qty: "—", amount: "−₹6,500" },
    ],
    totalLabel: "Net Pay",
    totalValue: "₹43,500",
  },
  experience_letter: {
    title: "EXPERIENCE LETTER",
    ref: "EXP-2026-0044",
    billToLabel: "Employee",
    signatureFallback: "HR Manager",
    rows: [{ description: "Service confirmation & tenure", qty: "—", amount: "—" }],
    totalLabel: "Tenure",
    totalValue: "2 Years",
  },
  appointment_letter: {
    title: "APPOINTMENT LETTER",
    ref: "APP-2026-0044",
    billToLabel: "Appointee",
    signatureFallback: "HR Manager",
    rows: [{ description: "Confirmation of appointment", qty: "—", amount: "—" }],
    totalLabel: "Joining",
    totalValue: "01 May 2026",
  },
};

const fallbackSample = (docType: string): DocSample => ({
  title: docType.replace(/_/g, " ").toUpperCase(),
  ref: `${docType.slice(0, 3).toUpperCase()}-2026-0044`,
  billToLabel: "Recipient",
  signatureFallback: "Authorised Signatory",
  rows: [{ description: "Sample line item", qty: "1", amount: "₹10,000" }],
  totalLabel: "Total",
  totalValue: "₹10,000",
});

export function PdfBrandingPreview({ branding, documentType = "quote" }: Props) {
  const sample = SAMPLES[documentType] ?? fallbackSample(documentType);

  const addressLines = [
    branding.address_line1,
    branding.address_line2,
    [branding.city, branding.state, branding.pincode].filter(Boolean).join(", "),
  ].filter(Boolean);

  return (
    <div
      className="relative rounded-md border bg-white shadow-lg overflow-hidden flex flex-col"
      style={{ aspectRatio: "1 / 1.414", color: branding.brand_text_color }}
    >
      {/* Header band */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: branding.brand_primary_color, color: "#fff" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt="logo"
              className="h-8 w-auto object-contain bg-white rounded px-1"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[11px] font-bold leading-tight truncate">
              {branding.company_name || "Company"}
            </div>
            <div className="text-[8px] opacity-80 truncate">
              {branding.company_tagline || "Tagline"}
            </div>
          </div>
        </div>
        <div className="text-right text-[8px] leading-tight opacity-90">
          {branding.website && <div>{branding.website}</div>}
          {branding.phone && <div>{branding.phone}</div>}
        </div>
      </div>

      {/* Accent stripe */}
      <div className="h-1" style={{ background: branding.brand_accent_color }} />

      {/* Body */}
      <div className="p-4 space-y-3 text-[9px] flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-[14px] font-bold"
              style={{ color: branding.brand_primary_color }}
            >
              {sample.title}
            </div>
            <div className="text-[8px]" style={{ color: branding.brand_muted_color }}>
              {sample.ref} • 18 Apr 2026
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {sample.badge && (
              <div
                className="text-[8px] font-bold px-2 py-0.5 rounded"
                style={{
                  background: branding.brand_accent_color,
                  color: "#fff",
                }}
              >
                {sample.badge}
              </div>
            )}
            {branding.gstin && (
              <div
                className="text-[8px] px-2 py-1 rounded"
                style={{
                  background: `${branding.brand_accent_color}20`,
                  color: branding.brand_primary_color,
                }}
              >
                GSTIN: {branding.gstin}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <div className="text-[8px] font-bold uppercase" style={{ color: branding.brand_muted_color }}>
              {sample.billToLabel}
            </div>
            <div className="font-semibold">Sample Customer</div>
            <div style={{ color: branding.brand_muted_color }}>+91 98765 43210</div>
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-[8px] font-bold uppercase" style={{ color: branding.brand_muted_color }}>
              From
            </div>
            {addressLines.map((line, i) => (
              <div key={i} style={{ color: branding.brand_muted_color }}>
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Items table */}
        <div className="border rounded overflow-hidden">
          <div
            className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 text-[8px] font-bold text-white"
            style={{ background: branding.brand_primary_color }}
          >
            <div>Description</div>
            <div className="text-right w-12">Qty</div>
            <div className="text-right w-16">Amount</div>
          </div>
          {sample.rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 text-[8px] border-b"
            >
              <div>{row.description}</div>
              <div className="text-right w-12">{row.qty}</div>
              <div className="text-right w-16">{row.amount}</div>
            </div>
          ))}
          <div
            className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 text-[8px] font-bold"
            style={{ background: `${branding.brand_accent_color}20` }}
          >
            <div className="text-right col-span-2">{sample.totalLabel}</div>
            <div className="text-right w-16" style={{ color: branding.brand_primary_color }}>
              {sample.totalValue}
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="flex justify-end pt-2">
          <div className="text-right">
            {branding.signature_url && (
              <img src={branding.signature_url} alt="signature" className="h-8 ml-auto object-contain" />
            )}
            <div
              className="border-t pt-0.5 text-[8px] font-medium"
              style={{ borderColor: branding.brand_muted_color }}
            >
              {branding.signature_name || sample.signatureFallback}
            </div>
          </div>
        </div>
      </div>

      {/* Footer band */}
      <div
        className="px-4 py-2 text-[7px] text-center mt-auto"
        style={{
          background: `${branding.brand_primary_color}10`,
          color: branding.brand_muted_color,
          borderTop: `1px solid ${branding.brand_accent_color}`,
        }}
      >
        {branding.footer_text || "Footer text"}
        {branding.email && <span> · {branding.email}</span>}
      </div>
    </div>
  );
}
