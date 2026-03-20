import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Lead Intake Engine — Grabyourcar Native Backend Automation
 * 
 * Flow: Webhook → Normalize → Classify Vertical → Dedup by Phone → Store → 
 *       Notify Executive (WhatsApp + Email) → Schedule 30-min Follow-up Check
 * 
 * Accepts POST from: Website forms, Quick Enquiry, WhatsApp, Manual entry
 */

// Order matters: more specific keywords first to avoid false matches (e.g. "car insurance" → Insurance, not Car Sales)
const VERTICALS = [
  { keyword: "car insurance", tag: "Insurance" },
  { keyword: "insurance", tag: "Insurance" },
  { keyword: "car loan", tag: "Loan" },
  { keyword: "loan", tag: "Loan" },
  { keyword: "self drive", tag: "Self Drive" },
  { keyword: "rental", tag: "Self Drive" },
  { keyword: "hsrp", tag: "HSRP" },
  { keyword: "fastag", tag: "HSRP" },
  { keyword: "accessories", tag: "Accessories" },
  { keyword: "corporate", tag: "Corporate" },
  { keyword: "fleet", tag: "Corporate" },
  { keyword: "new car", tag: "Car Sales" },
  { keyword: "car", tag: "Car Sales" },
];

function classifyVertical(input: string): string {
  const lower = (input || "").toLowerCase();
  for (const v of VERTICALS) {
    if (lower.includes(v.keyword)) return v.tag;
  }
  return "General Enquiry";
}

function cleanPhone(phone: string): string {
  return (phone || "").replace(/\D/g, "").replace(/^91/, "");
}

function normalizeVehicleNumber(vehicleNumber?: string | null): string | null {
  const normalized = (vehicleNumber || "").toUpperCase().replace(/\s+/g, "").trim();
  return normalized || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FINBITE_API_KEY = Deno.env.get("FINBITE_API_KEY");
  const FINBITE_BEARER_TOKEN = Deno.env.get("FINBITE_BEARER_TOKEN");
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();

    // === STEP 1: Normalize Lead Data ===
    const name = body.name || body.body?.name || body.message?.from?.name || "Unknown";
    const rawPhone = body.phone || body.body?.phone || body.message?.from?.phone || "";
    const phone = cleanPhone(rawPhone);
    const email = body.email || body.body?.email || "";
    const city = body.city || body.body?.city || "";
    const verticalInput = body.vertical || body.body?.vertical || body.body?.interest || "General Enquiry";
    const message = body.message_text || body.body?.message || body.message?.text?.body || body.body?.details || "";
    const source = body.source || body.body?.source || (body.message ? "WhatsApp" : "Website");
    const leadSourceType = body.lead_source_type || body.body?.lead_source_type || body.utm_source || "Organic";
    const vehicleNumber = body.vehicleNumber || body.vehicle_number || body.registrationNumber || body.registration_number || body.body?.vehicleNumber || body.body?.vehicle_number || body.body?.registrationNumber || body.body?.registration_number || "";
    const vehicleMake = body.vehicleMake || body.vehicle_make || body.body?.vehicleMake || body.body?.vehicle_make || body.carBrand || body.body?.carBrand || "";
    const vehicleModel = body.vehicleModel || body.vehicle_model || body.body?.vehicleModel || body.body?.vehicle_model || body.carInterest || body.body?.carInterest || "";
    const policyType = body.policyType || body.policy_type || body.body?.policyType || body.body?.policy_type || "";

    if (!phone || phone.length < 10) {
      return new Response(JSON.stringify({ error: "Valid phone number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === STEP 2: Classify Vertical ===
    const verticalTag = classifyVertical(verticalInput);

    // === STEP 3: Dedup by Phone ===
    const { data: existing } = await supabase
      .from("automation_lead_tracking")
      .select("id, multi_vertical_tags, message, status, contacted")
      .eq("phone", phone)
      .limit(1);

    let leadId: string;
    let isNewLead = true;

    if (existing && existing.length > 0) {
      // Update existing lead — append vertical tag
      isNewLead = false;
      const record = existing[0];
      const existingTags: string[] = record.multi_vertical_tags || [];
      const updatedTags = existingTags.includes(verticalTag) ? existingTags : [...existingTags, verticalTag];
      const updatedMessage = record.message ? `${record.message} | NEW: ${message}` : message;

      await supabase.from("automation_lead_tracking").update({
        multi_vertical_tags: updatedTags,
        message: updatedMessage,
        name: name !== "Unknown" ? name : undefined,
        email: email || undefined,
        city: city || undefined,
        lead_source_type: leadSourceType,
        last_updated: new Date().toISOString(),
      }).eq("id", record.id);

      leadId = record.id;
    } else {
      // Insert new lead
      const newLeadId = `${new Date().toISOString()}-${phone}`;
      const followUpDue = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

      const { data: inserted, error: insertErr } = await supabase.from("automation_lead_tracking").insert({
        lead_id: newLeadId,
        phone,
        name,
        email: email || null,
        city: city || null,
        vertical: verticalTag,
        multi_vertical_tags: [verticalTag],
        source,
        lead_source_type: leadSourceType,
        message: message || null,
        status: "New Lead",
        contacted: false,
        follow_up_due: followUpDue,
        raw_data: body,
      }).select("id").single();

      if (insertErr) throw insertErr;
      leadId = inserted!.id;
    }

    // === STEP 4: Also insert into vertical-specific tables ===
    await routeToVerticalTable(supabase, verticalTag, {
      name,
      phone,
      email,
      city,
      source,
      message,
      vehicleNumber,
      vehicleMake,
      vehicleModel,
      policyType,
    });

    // === STEP 5: Notify Executive via WhatsApp (Finbite) ===
    const executivePhone = "+919855924442";
    const executiveEmail = "hello@grabyourcar.com";

    if (FINBITE_BEARER_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      try {
        await fetch("https://app.finbite.in/api/v2/whatsapp-business/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FINBITE_BEARER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: executivePhone,
            phoneNoId: WHATSAPP_PHONE_NUMBER_ID,
            type: "text",
            text: `🚨 *New Lead Assigned*\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Email:* ${email}\n*City:* ${city}\n*Vertical:* ${verticalTag}\n*Source:* ${source} (${leadSourceType})\n*Message:* ${message}\n\n⏰ Please contact within 30 minutes!`,
          }),
        });
        console.log("Executive WhatsApp sent");
      } catch (e) {
        console.error("WhatsApp notify failed:", e);
      }
    }

    // === STEP 6: Notify Executive via Email (Resend) ===
    if (RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "hello@grabyourcar.com",
            to: [executiveEmail],
            subject: `New Lead Assigned - ${verticalTag}`,
            html: `<h2>🚨 New Lead Assigned to You</h2>
              <p><strong>Name:</strong> ${name}<br>
              <strong>Phone:</strong> ${phone}<br>
              <strong>Email:</strong> ${email}<br>
              <strong>City:</strong> ${city}<br>
              <strong>Vertical:</strong> ${verticalTag}<br>
              <strong>Source:</strong> ${source} (${leadSourceType})<br>
              <strong>Message:</strong> ${message}</p>
              <p style="color: red;">⏰ <strong>Please contact within 30 minutes!</strong></p>`,
          }),
        });
        console.log("Executive email sent");
      } catch (e) {
        console.error("Email notify failed:", e);
      }
    }

    // Mark as notified
    await supabase.from("automation_lead_tracking")
      .update({ executive_notified: true })
      .eq("id", leadId);

    // === STEP 7: Schedule follow-up check (trigger the checker function after 30 min) ===
    // The follow-up-checker runs on a cron and picks up leads with follow_up_due < now()

    return new Response(JSON.stringify({
      success: true,
      lead_id: leadId,
      is_new: isNewLead,
      vertical: verticalTag,
      follow_up_due: isNewLead ? "30 minutes" : "existing lead updated",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Lead intake error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Route lead into the appropriate vertical-specific table
 */
async function routeToVerticalTable(
  supabase: any,
  vertical: string,
  data: {
    name: string;
    phone: string;
    email: string;
    city: string;
    source: string;
    message: string;
    vehicleNumber?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    policyType?: string;
  }
) {
  try {
    switch (vertical) {
      case "Car Sales":
        await supabase.from("leads").insert({
          customer_name: data.name,
          phone: data.phone,
          email: data.email || null,
          city: data.city || null,
          source: data.source,
          notes: data.message || null,
          status: "new",
          priority: "medium",
        });
        break;
      case "Insurance": {
        const normalizedPhone = cleanPhone(data.phone);
        const normalizedVehicleNumber = normalizeVehicleNumber(data.vehicleNumber);
        const now = new Date().toISOString();

        const { data: candidates, error: fetchError } = await supabase
          .from("insurance_clients")
          .select("id, phone, vehicle_number")
          .eq("phone", normalizedPhone)
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;

        const existingClient = (candidates || []).find((candidate: { vehicle_number?: string | null }) => {
          if (!normalizedVehicleNumber) return true;
          return normalizeVehicleNumber(candidate.vehicle_number) === normalizedVehicleNumber;
        });

        const insurancePayload = {
          customer_name: data.name,
          phone: normalizedPhone,
          email: data.email || null,
          city: data.city || null,
          lead_source: data.source,
          notes: data.message || null,
          vehicle_number: normalizedVehicleNumber,
          vehicle_make: data.vehicleMake || null,
          vehicle_model: data.vehicleModel || null,
          current_policy_type: data.policyType || null,
          pipeline_stage: "new_lead",
          lead_status: "new",
          priority: "medium",
          picked_up_by: null,
          picked_up_at: null,
          journey_last_event: "lead_received",
          journey_last_event_at: now,
          updated_at: now,
        };

        if (existingClient?.id) {
          await supabase
            .from("insurance_clients")
            .update(insurancePayload)
            .eq("id", existingClient.id);
        } else {
          await supabase.from("insurance_clients").insert({
            ...insurancePayload,
            created_at: now,
          });
        }
        break;
      }
      case "Loan":
        await supabase.from("car_loan_leads").insert({
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          city: data.city || null,
          source: data.source,
          notes: data.message || null,
          status: "new",
        });
        break;
      default:
        await supabase.from("leads").insert({
          customer_name: data.name,
          phone: data.phone,
          email: data.email || null,
          city: data.city || null,
          source: `${data.source} (${vertical})`,
          notes: data.message || null,
          status: "new",
          priority: "medium",
        });
        break;
    }
  } catch (e) {
    console.error(`Vertical routing failed for ${vertical}:`, e);
  }
}
