/**
 * Unified PDF Branding System — Shared Types
 * Used by branding resolver, renderer, and editor UI.
 */

export type PdfSectionType =
  | "header"
  | "doc_meta"
  | "customer"
  | "vehicle"
  | "items"
  | "totals"
  | "notes"
  | "terms"
  | "bank"
  | "signature"
  | "footer"
  | "custom";

export interface PdfTemplateSection {
  id: string;
  type: PdfSectionType;
  label: string;
  enabled: boolean;
  order: number;
  config?: Record<string, any>;
}

export interface PdfCustomField {
  key: string;
  label: string;
  default_value?: string;
  position?: "header" | "after_customer" | "after_items" | "footer";
}

export interface PdfSocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
}

export interface PdfGlobalBranding {
  id: string;
  company_name: string;
  company_tagline: string | null;
  logo_url: string | null;
  watermark_url: string | null;
  signature_url: string | null;
  signature_name: string | null;

  brand_primary_color: string;
  brand_accent_color: string;
  brand_text_color: string;
  brand_muted_color: string;
  font_heading: string;
  font_body: string;

  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  website: string | null;

  gstin: string | null;
  pan: string | null;
  cin: string | null;
  irdai_license: string | null;

  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  upi_id: string | null;

  footer_text: string | null;
  default_terms: string | null;
  social_links: PdfSocialLinks;

  page_size: string;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  show_watermark: boolean;
  show_qr_footer: boolean;

  is_active: boolean;
  updated_at: string;
}

export interface PdfVerticalSettings {
  id: string;
  vertical_slug: string;
  vertical_label: string;
  document_types: string[];

  override_brand_color: string | null;
  override_accent_color: string | null;
  override_logo_url: string | null;
  override_signature_url: string | null;
  override_signature_name: string | null;
  override_footer_text: string | null;
  override_terms: string | null;

  template_sections: PdfTemplateSection[];
  custom_fields: PdfCustomField[];

  is_active: boolean;
  updated_at: string;
}

/**
 * Resolved branding = global + vertical overrides merged.
 * This is what the renderer actually uses.
 */
export interface ResolvedBranding {
  vertical_slug: string;
  vertical_label: string;

  // Identity
  company_name: string;
  company_tagline: string;
  logo_url: string | null;
  watermark_url: string | null;
  signature_url: string | null;
  signature_name: string;

  // Colors / fonts (always resolved — overrides win over global)
  brand_primary_color: string;
  brand_accent_color: string;
  brand_text_color: string;
  brand_muted_color: string;
  font_heading: string;
  font_body: string;

  // Contact
  address_lines: string[];
  phone: string;
  alt_phone: string;
  email: string;
  website: string;

  // Compliance
  gstin: string;
  pan: string;
  cin: string;
  irdai_license: string;

  // Bank
  bank: {
    name: string;
    account_name: string;
    account_number: string;
    ifsc: string;
    branch: string;
    upi_id: string;
  };

  // Footer / legal
  footer_text: string;
  default_terms: string;
  social_links: PdfSocialLinks;

  // Layout
  page_size: string;
  margins: { top: number; bottom: number; left: number; right: number };
  show_watermark: boolean;
  show_qr_footer: boolean;

  // Sections (sorted by `order`, only enabled ones)
  sections: PdfTemplateSection[];
  custom_fields: PdfCustomField[];
}

export interface PdfPlaceholderContext {
  // Customer
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_gstin?: string;

  // Vehicle
  vehicle_number?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_variant?: string;
  vehicle_year?: string | number;
  vehicle_fuel?: string;

  // Document
  doc_number?: string;
  doc_date?: string;
  doc_type?: string;

  // Money
  amount?: string | number;
  total?: string | number;
  tax?: string | number;

  // Custom (anything else)
  [key: string]: string | number | undefined;
}
