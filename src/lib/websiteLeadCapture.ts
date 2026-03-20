import { supabase } from "@/integrations/supabase/client";

interface WebsiteLeadCaptureInput {
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  carInterest?: string | null;
  carBrand?: string | null;
  vertical?: string;
  serviceCategory?: string | null;
  source: string;
  type?: string;
  priority?: "low" | "medium" | "high" | "warm" | "hot" | "normal";
  message?: string | null;
  leadSourceType?: string;
}

export async function captureWebsiteLead(input: WebsiteLeadCaptureInput) {
  const payload = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    city: input.city?.trim() || null,
    carInterest: input.carInterest?.trim() || null,
    carBrand: input.carBrand?.trim() || null,
    vertical: input.vertical || "car",
    source: input.source,
    type: input.type || "website_lead",
    priority: input.priority || "medium",
    message_text: input.message?.trim() || null,
    lead_source_type: input.leadSourceType || "Website",
    serviceCategory: input.serviceCategory?.trim() || null,
    body: {
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      city: input.city?.trim() || null,
      carInterest: input.carInterest?.trim() || null,
      carBrand: input.carBrand?.trim() || null,
      vertical: input.vertical || "car",
      source: input.source,
      type: input.type || "website_lead",
      message: input.message?.trim() || null,
      details: input.message?.trim() || null,
      lead_source_type: input.leadSourceType || "Website",
      serviceCategory: input.serviceCategory?.trim() || null,
    },
  };

  const { data, error } = await supabase.functions.invoke("lead-intake-engine", {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return data;
}
