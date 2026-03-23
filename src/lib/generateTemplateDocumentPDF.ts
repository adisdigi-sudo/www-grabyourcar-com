import jsPDF from "jspdf";

export type TemplateVariableMap = Record<string, string | number | null | undefined>;

export const mergeTemplateVariables = (content: string, variables: TemplateVariableMap) => {
  return content.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = variables[key];
    return value === null || value === undefined || value === "" ? "__________" : String(value);
  });
};

export const generateTemplateDocumentPDF = ({
  title,
  content,
  variables,
  fileName,
}: {
  title: string;
  content: string;
  variables: TemplateVariableMap;
  fileName?: string;
}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const lineHeight = 18;
  const merged = mergeTemplateVariables(content, variables);
  const lines = doc.splitTextToSize(merged, pageWidth - margin * 2);
  const safeName = (fileName || title || "document").replace(/[^a-z0-9_-]+/gi, "_");

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 72, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, margin, 44);

  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  let y = 110;
  lines.forEach((line: string) => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  doc.save(`${safeName}.pdf`);
};