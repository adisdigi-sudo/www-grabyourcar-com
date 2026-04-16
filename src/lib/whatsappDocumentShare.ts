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
          .select("invoice_number, total_amount, vertical_name")
          .eq("invoice_number", id)
          .maybeSingle();
        // Invoices don't have a direct PDF URL column — they are generated on-the-fly
        // Return null so the caller can generate and share
        if (data) {
          return {
            url: "", // Caller must provide generated PDF URL
            fileName: `Invoice-${data.invoice_number}.pdf`,
            caption: `Invoice ${data.invoice_number} — ₹${data.total_amount?.toLocaleString("en-IN")} (${data.vertical_name || "Service"})`,
          };
        }
        break;
      }
      case "quote": {
        const { data } = await supabase
          .from("quote_share_history")
          .select("pdf_storage_path, vehicle_make, vehicle_model, insurance_company")
          .eq("id", id)
          .maybeSingle();
        if (data?.pdf_storage_path) {
          const { data: urlData } = supabase.storage
            .from("quote-pdfs")
            .getPublicUrl(data.pdf_storage_path);
          if (urlData?.publicUrl) {
            const carName = `${data.vehicle_make || ""} ${data.vehicle_model || ""}`.trim() || "Vehicle";
            return {
              url: urlData.publicUrl,
              fileName: `Quote-${carName}.pdf`,
              caption: `Insurance Quote — ${carName} (${data.insurance_company || "Quote"})`,
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
          .select("id, customer_name, car_model, disbursement_letter_url")
          .eq("id", id)
          .maybeSingle();
        if (data?.disbursement_letter_url) {
          return {
            url: data.disbursement_letter_url,
            fileName: `Loan-${data.car_model || "Document"}.pdf`,
            caption: `Loan document for ${data.car_model || "your vehicle"}`,
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
