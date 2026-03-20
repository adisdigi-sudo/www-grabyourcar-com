import { supabase } from "@/integrations/supabase/client";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";

/**
 * Captures an insurance lead into BOTH legacy insurance_leads AND the new insurance_clients CRM table.
 * Also fires WhatsApp automation trigger.
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
    phone, customerName, email, vehicleNumber,
    vehicleMake, vehicleModel, policyType, source, notes,
  } = params;

  // 1. Insert into legacy insurance_leads (backward compatible)
  try {
    const { error: legacyErr } = await supabase.from("insurance_leads").insert({
      phone,
      customer_name: customerName || null,
      email: email || null,
      vehicle_number: vehicleNumber || null,
      vehicle_make: vehicleMake || null,
      vehicle_model: vehicleModel || null,
      policy_type: policyType || "comprehensive",
      source,
      notes: notes || null,
    });
    if (legacyErr) console.error("Legacy insurance_leads insert error:", legacyErr);
  } catch (e) {
    console.error("Legacy insurance_leads insert failed:", e);
  }

  // 2. Upsert into new insurance_clients CRM table (dedupe by phone)
  try {
    // Check if client already exists
    const { data: existing, error: selectErr } = await supabase
      .from("insurance_clients")
      .select("id")
      .eq("phone", phone)
      .limit(1);

    if (selectErr) {
      console.error("insurance_clients select error:", selectErr);
    }

    if (existing && existing.length > 0) {
      // Update existing client with latest data
      const { error: updateErr } = await supabase.from("insurance_clients")
        .update({
          customer_name: customerName || undefined,
          vehicle_number: vehicleNumber || undefined,
          vehicle_make: vehicleMake || undefined,
          vehicle_model: vehicleModel || undefined,
          current_policy_type: policyType || undefined,
          notes: notes ? `${notes} (updated from ${source})` : undefined,
        })
        .eq("id", existing[0].id);
      if (updateErr) console.error("insurance_clients update error:", updateErr);

      // Log activity
      const { error: actErr } = await supabase.from("insurance_activity_log").insert({
        client_id: existing[0].id,
        activity_type: "lead_created",
        title: `Repeat inquiry from ${source}`,
        description: `Customer submitted another inquiry via ${source}`,
        metadata: { source, policyType, vehicleNumber },
      });
      if (actErr) console.error("insurance_activity_log insert error:", actErr);
    } else {
      // Create new client
      const { data: newClient, error: insertErr } = await supabase.from("insurance_clients").insert({
        phone,
        customer_name: customerName || null,
        email: email || null,
        vehicle_number: vehicleNumber || null,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        current_policy_type: policyType || null,
        lead_source: source,
        notes: notes || null,
        pipeline_stage: "new_lead",
        lead_status: "new",
        priority: "medium",
      }).select("id").single();

      if (insertErr) {
        console.error("insurance_clients insert error:", insertErr);
      } else if (newClient) {
        const { error: actErr2 } = await supabase.from("insurance_activity_log").insert({
          client_id: newClient.id,
          activity_type: "lead_created",
          title: "New insurance inquiry",
          description: `Lead captured from ${source}`,
          metadata: { source, policyType, vehicleNumber },
        });
        if (actErr2) console.error("insurance_activity_log insert error:", actErr2);
      }
    }
  } catch (e) {
    console.error("insurance_clients upsert failed:", e);
  }

  // 3. Fire WhatsApp welcome automation
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
