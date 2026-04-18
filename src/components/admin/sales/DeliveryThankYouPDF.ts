import jsPDF from "jspdf";

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

export async function generateDeliveryThankYouPDF(
  params: DeliveryThankYouParams
): Promise<{ doc: jsPDF; fileName: string }> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15; // page margin

  // ───── Brand colors ─────
  const BRAND = [16, 132, 92] as const; // emerald
  const NAVY = [30, 41, 59] as const;
  const SLATE = [71, 85, 105] as const;
  const SOFT = [241, 245, 249] as const;
  const GOLD = [217, 165, 50] as const;

  const fullCarName = [params.carBrand, params.carModel, params.carVariant].filter(Boolean).join(" ").trim();

  // ───── Header band ─────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 38, "F");
  // Gold accent stripe
  doc.setFillColor(...GOLD);
  doc.rect(0, 38, W, 1.4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("THANK YOU FOR CHOOSING US", M, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("Grabyourcar  |  www.grabyourcar.com  |  +91 98559 24442", M, 26);
  doc.text("A delivery memento for our valued customer", M, 32);

  // Date on right
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Delivery Date`, W - M, 20, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(formatDate(params.deliveryDate), W - M, 27, { align: "right" });

  let y = 50;

  // ───── Salutation ─────
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Dear ${params.customerName || "Valued Customer"},`, M, y);
  y += 8;

  // ───── Letter body ─────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...SLATE);

  const body = [
    `Congratulations on the proud ownership of your brand new ${fullCarName || "car"}!`,
    ``,
    `It was an absolute pleasure assisting you through this journey — from the very first inquiry to the moment you drove home in your dream car. We sincerely thank you for placing your trust in Grabyourcar and giving us the opportunity to be part of this special milestone in your life.`,
    ``,
    `Your happiness is our biggest reward. We hope every drive brings you joy, comfort, and unforgettable memories with your loved ones. Wishing you many safe and happy miles ahead!`,
  ];
  body.forEach((line) => {
    if (line === "") {
      y += 3;
      return;
    }
    const wrapped = doc.splitTextToSize(line, W - 2 * M);
    doc.text(wrapped, M, y);
    y += wrapped.length * 5.2;
  });

  y += 4;

  // ───── Customer & Car Card ─────
  const cardH = 32;
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, y, W - 2 * M, cardH, 2, 2, "F");
  // Left border accent
  doc.setFillColor(...BRAND);
  doc.rect(M, y, 1.6, cardH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND);
  doc.text("CUSTOMER & VEHICLE DETAILS", M + 5, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);

  const colLeft = M + 5;
  const colRight = W / 2 + 2;

  const labelVal = (label: string, val: string, x: number, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(val || "—", x + 28, yy);
  };

  labelVal("Customer:", params.customerName || "—", colLeft, y + 13);
  labelVal("Phone:", params.phone || "—", colLeft, y + 19);
  labelVal("City:", params.city || "—", colLeft, y + 25);

  labelVal("Vehicle:", fullCarName || "—", colRight, y + 13);
  labelVal("Color:", params.carColor || "—", colRight, y + 19);
  labelVal("Dealership:", params.dealership || "Grabyourcar Network", colRight, y + 25);

  y += cardH + 8;

  // ───── Delivery Photos ─────
  const images = (params.deliveryImages || []).filter(Boolean).slice(0, 6);
  if (images.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("📸  Delivery Moments", M, y);
    y += 5;

    const loaded = await Promise.all(images.map((u) => loadImageAsDataUrl(u)));
    const valid = loaded.filter(Boolean) as Array<{ dataUrl: string; w: number; h: number; format: string }>;

    if (valid.length > 0) {
      // Grid 2 columns
      const cols = 2;
      const gap = 4;
      const cellW = (W - 2 * M - gap * (cols - 1)) / cols;
      const cellH = 55;

      for (let i = 0; i < valid.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = M + col * (cellW + gap);
        const yy = y + row * (cellH + gap);

        // page-break check
        if (yy + cellH > H - 30) {
          doc.addPage();
          y = M;
          // recompute placement on new page
          const newRow = Math.floor((i - (Math.floor(i / cols) * cols)) / cols);
          const newY = y + newRow * (cellH + gap);
          drawImageInBox(doc, valid[i], x, newY, cellW, cellH);
          continue;
        }

        drawImageInBox(doc, valid[i], x, yy, cellW, cellH);
      }
      const totalRows = Math.ceil(valid.length / cols);
      y += totalRows * (cellH + gap) + 4;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...SLATE);
      doc.text("(Photos could not be embedded — please refer to the message attachment.)", M, y);
      y += 6;
    }
  }

  // ───── Footer Band (always at bottom of last page) ─────
  if (y > H - 45) {
    doc.addPage();
    y = M;
  }

  const footerY = H - 38;
  doc.setFillColor(...NAVY);
  doc.rect(0, footerY, W, 38, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, footerY, W, 1.2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("We truly enjoyed serving you. ❤️", M, footerY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  const closing = doc.splitTextToSize(
    "If you loved your experience, we would be grateful if you could share a quick review. For any future car-buying, insurance, accessories, or service needs — we are just a call away.",
    W - 2 * M
  );
  doc.text(closing, M, footerY + 17);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("— Team Grabyourcar", W - M, footerY + 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text("www.grabyourcar.com  •  +91 98559 24442", M, footerY + 32);

  const safeName = (params.customerName || "Customer").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  const safeCar = (params.carModel || "Car").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
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
