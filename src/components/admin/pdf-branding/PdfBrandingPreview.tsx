/**
 * Live HTML preview that mimics the unified PDF layout.
 * Updates in real time as the editor form changes.
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
}

export function PdfBrandingPreview({ branding }: Props) {
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
              QUOTATION
            </div>
            <div className="text-[8px]" style={{ color: branding.brand_muted_color }}>
              QT-2026-001 • 18 Apr 2026
            </div>
          </div>
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

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <div className="text-[8px] font-bold uppercase" style={{ color: branding.brand_muted_color }}>
              Bill To
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
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 text-[8px] border-b">
            <div>Sample Service</div>
            <div className="text-right w-12">1</div>
            <div className="text-right w-16">₹10,000</div>
          </div>
          <div
            className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 text-[8px] font-bold"
            style={{ background: `${branding.brand_accent_color}20` }}
          >
            <div className="text-right col-span-2">Total</div>
            <div className="text-right w-16" style={{ color: branding.brand_primary_color }}>
              ₹10,000
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
              {branding.signature_name || "Authorised Signatory"}
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
