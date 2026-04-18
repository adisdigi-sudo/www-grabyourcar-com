/**
 * Color helpers for jsPDF (which expects RGB tuples).
 * Branding stores hex strings; renderer needs [r,g,b].
 */

export type RGB = [number, number, number];

export function hexToRgb(hex: string | null | undefined, fallback: RGB = [15, 23, 42]): RGB {
  if (!hex) return fallback;
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if ([r, g, b].some(Number.isNaN)) return fallback;
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return fallback;
    return [r, g, b];
  }
  return fallback;
}

export function lighten([r, g, b]: RGB, amount = 0.85): RGB {
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ];
}
