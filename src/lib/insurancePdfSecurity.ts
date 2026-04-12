import jsPDF from "jspdf";

/**
 * Add diagonal watermark across all pages of the PDF
 */
export function addWatermark(doc: jsPDF, text = "GRABYOURCAR") {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    doc.saveGraphicsState();
    // @ts-ignore — jsPDF GState for opacity
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    doc.setTextColor(100, 100, 100);

    const positions = [
      { x: pw * 0.5, y: ph * 0.35 },
      { x: pw * 0.5, y: ph * 0.65 },
    ];
    positions.forEach(({ x, y }) => {
      doc.text(text, x, y, { align: "center", angle: 45 });
    });

    doc.restoreGraphicsState();
  }
}

/**
 * Encryption options for jsPDF constructor — locks PDF, allows only print.
 */
export const PDF_ENCRYPTION = {
  userPassword: "",
  ownerPassword: "GYC_Secure_2025!",
  userPermissions: ["print"] as string[],
};
