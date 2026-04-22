import { format } from "date-fns";

/**
 * Standardized export filename builder for the Finance Office v2 module.
 *
 * Pattern: gyc_<module>_<scope>_<period>_<YYYYMMDD-HHmmss>.<ext>
 *
 * Examples:
 *  - gyc_utilization-insights_by-vertical_last-6-months_20260422-153045.csv
 *  - gyc_team-targets_2026-04_20260422-153045.png
 *  - gyc_founder-approval_AcmeQ2_audit-trail_20260422-153045.pdf
 */
export function buildExportFilename(opts: {
  module: string;            // e.g. "utilization-insights"
  scope?: string;            // e.g. "by-vertical", "trend", "audit-trail"
  period?: string;           // e.g. "last-6-months" / "2026-04"
  ext: "csv" | "png" | "pdf" | "xlsx";
  at?: Date;
}): string {
  const at = opts.at ?? new Date();
  const stamp = format(at, "yyyyMMdd-HHmmss");
  const parts = [
    "gyc",
    sanitize(opts.module),
    opts.scope ? sanitize(opts.scope) : null,
    opts.period ? sanitize(opts.period) : null,
    stamp,
  ].filter(Boolean);
  return `${parts.join("_")}.${opts.ext}`;
}

function sanitize(s: string): string {
  return s
    .toString()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}
