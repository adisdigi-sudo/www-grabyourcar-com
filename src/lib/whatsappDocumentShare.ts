import { supabase } from "@/integrations/supabase/client";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { toast } from "sonner";

type DocumentType = "invoice" | "quote" | "policy" | "loan_document";

interface ShareDocumentParams {
  phone: string;
  name?: string;
  documentType: DocumentType;
  documentUrl?: string;
  documentId?: string;
  caption?: string;
  fileName?: string;
}

/**
 * Share a document (PDF) via WhatsApp.
 * Resolves document URL from storage if not provided directly.
 */
export async function shareDocumentViaWhatsApp({
  phone,
  name,
  documentType,
  documentUrl,
  documentId,
  caption,
  fileName,
}: ShareDocumentParams): Promise<boolean> {
  let url = documentUrl;
  let file = fileName || "document.pdf";
  let cap = caption || "Your document from GrabYourCar";

  try {
    // If no direct URL, try to resolve from storage
    if (!url && documentId) {
      const resolved = await resolveDocumentUrl(documentType, documentId);
      if (resolved) {
        url = resolved.url;
        file = resolved.fileName || file;
        cap = resolved.caption || cap;
      }
    }

    if (!url) {
      toast.error("Document not found — cannot share via WhatsApp");
      return false;
    }

    const result = await sendWhatsApp({
      phone,
      message: cap,
      name,
      messageType: "document",
      mediaUrl: url,
      mediaFileName: file,
      logEvent: `share_${documentType}`,
      messageContext: documentType,
      silent: false,
    });

    return result.success;
  } catch (err) {
    console.error("Document share error:", err);
    toast.error("Failed to share document via WhatsApp");
    return false;
  }
}

async function resolveDocumentUrl(
  type: DocumentType,
  id: string
): Promise<{ url: string; fileName?: string; caption?: string } | null> {
  try {
    switch (type) {
      case "invoice": {
        const { data } = await supabase
          .from("invoices")
          .select("invoice_number, total_amount, vertical_name, pdf_url")
          .eq("invoice_number", id)
          .maybeSingle();
        if (data?.pdf_url) {
          return {
            url: data.pdf_url,
            fileName: `Invoice-${data.invoice_number}.pdf`,
            caption: `Invoice ${data.invoice_number} — ₹${data.total_amount?.toLocaleString("en-IN")} (${data.vertical_name || "Service"})`,
          };
        }
        break;
      }
      case "quote": {
        const { data } = await supabase
          .from("quote_share_history")
          .select("pdf_storage_path, car_name, variant_name")
          .eq("id", id)
          .maybeSingle();
        if (data?.pdf_storage_path) {
          const { data: urlData } = supabase.storage
            .from("quote-pdfs")
            .getPublicUrl(data.pdf_storage_path);
          if (urlData?.publicUrl) {
            return {
              url: urlData.publicUrl,
              fileName: `Quote-${data.car_name}.pdf`,
              caption: `Price Quote — ${data.car_name} ${data.variant_name || ""}`.trim(),
            };
          }
        }
        break;
      }
      case "policy": {
        const { data } = await supabase
          .from("insurance_policies")
          .select("policy_number, policy_document_url, document_file_name, insurer")
          .eq("policy_number", id)
          .eq("status", "active")
          .maybeSingle();
        if (data?.policy_document_url) {
          return {
            url: data.policy_document_url,
            fileName: data.document_file_name || `Policy-${data.policy_number}.pdf`,
            caption: `Insurance Policy: ${data.policy_number} (${data.insurer})`,
          };
        }
        break;
      }
      case "loan_document": {
        const { data } = await supabase
          .from("loan_applications")
          .select("id, vehicle_name, document_url")
          .eq("id", id)
          .maybeSingle();
        if (data?.document_url) {
          return {
            url: data.document_url,
            fileName: `Loan-${data.vehicle_name || "Document"}.pdf`,
            caption: `Loan document for ${data.vehicle_name || "your vehicle"}`,
          };
        }
        break;
      }
    }
  } catch (e) {
    console.error("Document URL resolution error:", e);
  }
  return null;
}
