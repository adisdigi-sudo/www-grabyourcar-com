import jsPDF from "jspdf";
import brandLogoUrl from "@/assets/logo-grabyourcar-transparent.png";

export interface DeliveryThankYouParams {
  customerName: string;
  phone?: string;
  email?: string;
  city?: string;
  carBrand?: string;
  carModel: string;
  carVariant?: string;
  carColor?: string;
  dealership?: string;
  deliveryDate?: string; // ISO yyyy-mm-dd
  dealValue?: number;
  feedbackRating?: number;
  feedbackText?: string;
  deliveryImages?: string[]; // public URLs
  salesPerson?: string;
}

const formatINR = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

const formatDate = (iso?: string) => {
  if (!iso) return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
};

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number; format: string } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 800, h: 600 });
      img.src = dataUrl;
    });
    const format = blob.type.includes("png") ? "PNG" : "JPEG";
    return { dataUrl, w: dims.w, h: dims.h, format };
  } catch {
    return null;
  }
}

async function loadLocalImage(url: string): Promise<{ dataUrl: string; w: number; h: number; format: string } | null> {
  // Same as loadImageAsDataUrl but tolerates same-origin asset URLs (no CORS mode).
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 600, h: 200 });
      img.src = dataUrl;
    });
    const format = blob.type.includes("png") ? "PNG" : "JPEG";
    return { dataUrl, w: dims.w, h: dims.h, format };
  } catch {
    return null;
  }
}

export async function generateDeliveryThankYouPDF(
  params: DeliveryThankYouParams
): Promise<{ doc: jsPDF; fileName: string }> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14; // page margin

  // ───── Brand palette ─────
  const NAVY = [12, 28, 56] as const;        // deep premium navy
  const NAVY_SOFT = [30, 49, 84] as const;
  const GOLD = [198, 156, 73] as const;      // luxury gold
  const BRAND = [16, 132, 92] as const;      // grabyourcar green accent
  const SLATE = [71, 85, 105] as const;
  const INK = [17, 24, 39] as const;
  const SOFT = [245, 247, 250] as const;
  const HAIRLINE = [220, 226, 234] as const;

  const fullCarName = [params.carBrand, params.carModel, params.carVariant]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // ───── Watermark (logo, very faint, centered) ─────
  const logo = await loadLocalImage(brandLogoUrl);
  if (logo) {
    const wmW = 130;
    const wmH = (logo.h / logo.w) * wmW;
    const wmX = (W - wmW) / 2;
    const wmY = (H - wmH) / 2;
    const gState = (doc as unknown as {
      GState: new (opts: { opacity: number }) => unknown;
      setGState: (g: unknown) => void;
    });
    try {
      gState.setGState(new gState.GState({ opacity: 0.05 }));
      doc.addImage(logo.dataUrl, logo.format, wmX, wmY, wmW, wmH, undefined, "FAST");
      gState.setGState(new gState.GState({ opacity: 1 }));
    } catch {
      // fall through silently if GState not supported
    }
  }

  // ───── Header band ─────
  const HEADER_H = 30;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, HEADER_H, "F");
  // Subtle inner band for depth
  doc.setFillColor(...NAVY_SOFT);
  doc.rect(0, HEADER_H - 6, W, 6, "F");
  // Gold hairline
  doc.setFillColor(...GOLD);
  doc.rect(0, HEADER_H, W, 0.8, "F");

  // Logo on header (left)
  if (logo) {
    const lh = 14;
    const lw = (logo.w / logo.h) * lh;
    try {
      doc.addImage(logo.dataUrl, logo.format, M, (HEADER_H - lh) / 2, lw, lh, undefined, "FAST");
    } catch {
      // ignore
    }
  }

  // Brand wordmark / tagline beside logo
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("GRABYOURCAR", M + 22, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(198, 207, 222);
  doc.text("INDIA'S TRUSTED CAR BUYING PARTNER", M + 22, 18);

  // Right side: delivery date + memento label
  doc.setFontSize(7.5);
  doc.setTextColor(198, 207, 222);
  doc.text("DELIVERY MEMENTO", W - M, 11, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(formatDate(params.deliveryDate).toUpperCase(), W - M, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(198, 207, 222);
  doc.text("www.grabyourcar.com  |  +91 98559 24442", W - M, 23, { align: "right" });

  // ───── Title strip ─────
  let y = HEADER_H + 9;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Thank you for choosing us.", M, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  y += 6;
  doc.text(
    `A heartfelt note for ${params.customerName || "our valued customer"} on the joyful delivery of your new ${
      fullCarName || "car"
    }.`,
    M,
    y,
  );
  y += 8;

  // ───── Letter body (concise, professional, emoji-free) ─────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`Dear ${params.customerName || "Valued Customer"},`, M, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.8);
  doc.setTextColor(...SLATE);

  const lines = [
    `Heartiest congratulations on the proud ownership of your brand new ${fullCarName || "car"}. It was a true privilege to be part of your car buying journey from the very first inquiry to the moment you drove home in your dream car.`,
    `We sincerely thank you for placing your trust in Grabyourcar. Your happiness is our biggest reward, and we wish you and your family many safe, comfortable and unforgettable miles ahead.`,
  ];
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, W - 2 * M);
    doc.text(wrapped, M, y);
    y += wrapped.length * 4.6 + 2.5;
  });

  y += 1;

  // ───── Customer & Vehicle card ─────
  const cardH = 24;
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, y, W - 2 * M, cardH, 1.6, 1.6, "F");
  doc.setFillColor(...GOLD);
  doc.rect(M, y, 1.4, cardH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND);
  doc.text("CUSTOMER & VEHICLE DETAILS", M + 4, y + 5);

  const colLeft = M + 4;
  const colRight = W / 2 + 2;

  const labelVal = (label: string, val: string, x: number, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...SLATE);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(val || "—", W / 2 - 32);
    doc.text(wrapped, x + 22, yy);
  };

  labelVal("Customer", params.customerName || "—", colLeft, y + 11);
  labelVal("Phone", params.phone || "—", colLeft, y + 16);
  labelVal("City", params.city || "—", colLeft, y + 21);

  labelVal("Vehicle", fullCarName || "—", colRight, y + 11);
  labelVal("Color", params.carColor || "—", colRight, y + 16);
  labelVal("Dealership", params.dealership || "Grabyourcar Network", colRight, y + 21);

  y += cardH + 6;

  // ───── Delivery Moments (responsive, single page) ─────
  const images = (params.deliveryImages || []).filter(Boolean).slice(0, 4);

  // Reserve space for footer (approx 30mm) so we never overflow
  const FOOTER_H = 26;
  const photosTop = y;
  const photosBottom = H - FOOTER_H - 10;
  const photosAvailH = Math.max(40, photosBottom - photosTop - 8);

  if (images.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text("Delivery Moments", M, y);
    // small gold accent
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(M, y + 1.5, M + 22, y + 1.5);
    y += 5;

    const loaded = await Promise.all(images.map((u) => loadImageAsDataUrl(u)));
    const valid = loaded.filter(Boolean) as Array<{
      dataUrl: string;
      w: number;
      h: number;
      format: string;
    }>;

    if (valid.length > 0) {
      // Choose grid based on count, scaled to remaining space
      const count = valid.length;
      const cols = count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 2;
      const rows = Math.ceil(count / cols);
      const gap = 3;
      const gridAvailH = photosAvailH - 6; // header line already consumed above
      const cellW = (W - 2 * M - gap * (cols - 1)) / cols;
      const cellH = Math.min(70, (gridAvailH - gap * (rows - 1)) / rows);

      for (let i = 0; i < valid.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = M + col * (cellW + gap);
        const yy = y + row * (cellH + gap);
        drawImageInBox(doc, valid[i], x, yy, cellW, cellH);
      }
      y += rows * (cellH + gap);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...SLATE);
      doc.text(
        "Delivery photos are shared along with this memento on WhatsApp.",
        M,
        y,
      );
      y += 5;
    }
  }

  // ───── Footer band (single-page guarantee) ─────
  const footerY = H - FOOTER_H;
  doc.setFillColor(...NAVY);
  doc.rect(0, footerY, W, FOOTER_H, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, footerY, W, 0.8, "F");

  // Closing line
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("We truly enjoyed serving you.", M, footerY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(198, 207, 222);
  const closing = doc.splitTextToSize(
    "For any future car buying, insurance, accessories or service needs, our team is just a call away. We would also be grateful if you could share a quick Google review of your experience.",
    W - 2 * M,
  );
  doc.text(closing, M, footerY + 13);

  // Signature line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("Team Grabyourcar", W - M, footerY + FOOTER_H - 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(198, 207, 222);
  doc.text(
    "www.grabyourcar.com  |  +91 98559 24442  |  Sales | Insurance | Loans | Accessories",
    M,
    footerY + FOOTER_H - 4,
  );

  const safeName = (params.customerName || "Customer")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const safeCar = (params.carModel || "Car")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const fileName = `Delivery_ThankYou_${safeName}_${safeCar}_${Date.now()}.pdf`;

  return { doc, fileName };
}

// Helper: draw an image into a box maintaining aspect ratio (contain) with a soft border
function drawImageInBox(
  doc: jsPDF,
  img: { dataUrl: string; w: number; h: number; format: string },
  x: number,
  y: number,
  boxW: number,
  boxH: number
) {
  // Background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, "F");

  const ratio = img.w / img.h;
  let drawW = boxW - 2;
  let drawH = drawW / ratio;
  if (drawH > boxH - 2) {
    drawH = boxH - 2;
    drawW = drawH * ratio;
  }
  const dx = x + (boxW - drawW) / 2;
  const dy = y + (boxH - drawH) / 2;

  try {
    doc.addImage(img.dataUrl, img.format, dx, dy, drawW, drawH, undefined, "FAST");
  } catch {
    // ignore single image failure
  }

  // Border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5);
}
