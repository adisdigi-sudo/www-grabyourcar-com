/**
 * Unified PDF system — public API.
 * Import from "@/lib/pdf" everywhere.
 */

export {
  UnifiedPdfRenderer,
  createRenderer,
  type RendererOptions,
  type CustomerBlock,
  type VehicleBlock,
  type ItemRow,
  type ItemsBlock,
  type TotalsBlock,
  type SectionPayload,
} from "./UnifiedPdfRenderer";
export { resolveBranding, clearBrandingCache } from "./brandingResolver";
export { substitute, buildPlaceholderContext } from "./placeholders";
export { hexToRgb, lighten, type RGB } from "./colorUtils";
export type {
  ResolvedBranding,
  PdfGlobalBranding,
  PdfVerticalSettings,
  PdfTemplateSection,
  PdfSectionType,
  PdfCustomField,
  PdfPlaceholderContext,
  PdfSocialLinks,
} from "./types";
