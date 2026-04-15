import { submitLeadReliably } from "@/lib/leadIntakeClient";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";

/**
 * Captures an insurance lead through the public intake engine so it is
 * immediately routed into the correct CRM vertical and tracking tables.
 */
export async function captureInsuranceLead(params: {
  phone: string;
  customerName?: string;
  email?: string;
  vehicleNumber?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  policyType?: string;
  source: string;
  notes?: string;
}) {
  const {
    phone,
    customerName,
    email,
    vehicleNumber,
    vehicleMake,
    vehicleModel,
    policyType,
    source,
    notes,
  } = params;

  await submitLeadReliably(
    {
      name: customerName || "Insurance Lead",
      phone,
      email: email || null,
      city: null,
      vertical: "car insurance",
      source,
      lead_source_type: "Website",
      message_text: notes || "Insurance website lead",
      vehicleNumber: vehicleNumber || null,
      vehicleMake: vehicleMake || null,
      vehicleModel: vehicleModel || null,
      policyType: policyType || "comprehensive",
      serviceCategory: "car-insurance",
      body: {
        name: customerName || "Insurance Lead",
        phone,
        email: email || null,
        city: null,
        vertical: "car insurance",
        source,
        lead_source_type: "Website",
        message: notes || "Insurance website lead",
        details: notes || "Insurance website lead",
        vehicleNumber: vehicleNumber || null,
        vehicleMake: vehicleMake || null,
        vehicleModel: vehicleModel || null,
        policyType: policyType || "comprehensive",
        serviceCategory: "car-insurance",
      },
    },
    { enableSubmitLeadFallback: true },
  );

  triggerWhatsApp({
    event: "insurance_inquiry",
    phone,
    name: customerName || "Customer",
    data: {
      source,
      policy_type: policyType || "comprehensive",
      vehicle_number: vehicleNumber || "",
      car_model: vehicleModel || vehicleMake || "",
    },
  });
}
