import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Lead Intake Engine — Grabyourcar Native Backend Automation
 * 
 * Flow: Webhook → Normalize → Classify Vertical → Dedup by Phone → Store → 
 *       Notify Executive (WhatsApp + Email) → Schedule 30-min Follow-up Check
 * 
 * Accepts POST from: Website forms, Quick Enquiry, WhatsApp, Manual entry,
 *                     Meta Lead Ads, Google Ads, any ad platform webhook
 */

const VERTICALS = [
  { keyword: "car insurance", tag: "Insurance" },
  { keyword: "motor insurance", tag: "Insurance" },
  { keyword: "insurance renewal", tag: "Insurance" },
  { keyword: "policy renewal", tag: "Insurance" },
  { keyword: "car-insurance", tag: "Insurance" },
  { keyword: "motor-insurance", tag: "Insurance" },
  { keyword: "vehicle-insurance", tag: "Insurance" },
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

function inferLeadSourceType(source: string): string {
  const normalized = (source || "").toLowerCase();
  if (normalized.includes("whatsapp")) return "WhatsApp";
  if (normalized.includes("walk")) return "Walk-in";
  if (normalized.includes("google")) return "Google";
  if (normalized.includes("meta") || normalized.includes("facebook") || normalized.includes("instagram")) return "Meta";
  if (normalized.includes("referral")) return "Referral";
  if (normalized.includes("website") || normalized.includes("hero") || normalized.includes("form")) return "Website";
  if (normalized.includes("manual")) return "Manual";
  return "Organic";
}

function buildVerticalInput(body: Record<string, any>, source: string, message: string): string {
  return [
    body.vertical, body.serviceCategory, body.service_category, body.type,
    body.body?.vertical, body.body?.interest, body.body?.serviceCategory,
    body.body?.service_category, body.body?.type, source, message,
  ].filter(Boolean).join(" ");
}

function cleanPhone(phone: string): string {
  return (phone || "").replace(/\D/g, "").replace(/^91/, "");
}

function getPhoneCandidates(phone: string): string[] {
  const cleaned = cleanPhone(phone);
  if (!cleaned) return [];
  return Array.from(new Set([cleaned, `91${cleaned}`, `0${cleaned}`]));
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
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
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
    const message = body.message_text || body.body?.message || body.message?.text?.body || body.body?.details || "";
    const source = body.source || body.body?.source || (body.message ? "WhatsApp" : "Website");
    const serviceCategory = String(
      body.serviceCategory || body.service_category || body.body?.serviceCategory || body.body?.service_category || "",
    ).toLowerCase();
    const requestedVertical = String(body.vertical || body.body?.vertical || "").toLowerCase();
    const verticalInput = buildVerticalInput(body, source, message) || "General Enquiry";
    const leadSourceType = body.lead_source_type || body.body?.lead_source_type || body.utm_source || inferLeadSourceType(source);

    // Vehicle fields
    const vehicleNumber = body.vehicleNumber || body.vehicle_number || body.registrationNumber || body.registration_number || body.body?.vehicleNumber || body.body?.vehicle_number || body.body?.registrationNumber || body.body?.registration_number || "";
    const vehicleMake = body.vehicleMake || body.vehicle_make || body.body?.vehicleMake || body.body?.vehicle_make || body.carBrand || body.body?.carBrand || "";
    const vehicleModel = body.vehicleModel || body.vehicle_model || body.body?.vehicleModel || body.body?.vehicle_model || body.carInterest || body.body?.carInterest || "";
    const policyType = body.policyType || body.policy_type || body.body?.policyType || body.body?.policy_type || "";

    // === UTM & Ad Attribution Fields ===
    const utmSource = body.utm_source || body.body?.utm_source || null;
    const utmMedium = body.utm_medium || body.body?.utm_medium || null;
    const utmCampaign = body.utm_campaign || body.body?.utm_campaign || null;
    const utmTerm = body.utm_term || body.body?.utm_term || null;
    const utmContent = body.utm_content || body.body?.utm_content || null;
    const adPlatform = body.ad_platform || body.body?.ad_platform || null;
    const adCampaignId = body.ad_campaign_id || body.body?.ad_campaign_id || null;
    const adSetId = body.ad_set_id || body.body?.ad_set_id || null;
    const adId = body.ad_id || body.body?.ad_id || null;
    const gclid = body.gclid || body.body?.gclid || null;
    const fbclid = body.fbclid || body.body?.fbclid || null;

    if (!phone || phone.length < 10) {
      return new Response(JSON.stringify({ error: "Valid phone number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === STEP 2: Classify Vertical ===
    const verticalTag =
      serviceCategory.includes("insurance") || requestedVertical.includes("insurance")
        ? "Insurance"
        : classifyVertical(verticalInput);

    // === STEP 3: Dedup by Phone in automation_lead_tracking ===
    const phoneCandidates = getPhoneCandidates(phone);

    const { data: existing } = await supabase
      .from("automation_lead_tracking")
      .select("id, multi_vertical_tags, message, status, contacted")
      .in("phone", phoneCandidates)
      .limit(1);

    let leadId: string;
    let isNewLead = true;

    if (existing && existing.length > 0) {
      isNewLead = false;
      const record = existing[0];
      const existingTags: string[] = record.multi_vertical_tags || [];
      const updatedTags = existingTags.includes(verticalTag) ? existingTags : [...existingTags, verticalTag];
      const updatedMessage = record.message ? `${record.message} | NEW: ${message}` : message;

      await supabase.from("automation_lead_tracking").update({
        vertical: verticalTag,
        multi_vertical_tags: updatedTags,
        message: updatedMessage,
        name: name !== "Unknown" ? name : undefined,
        email: email || undefined,
        city: city || undefined,
        source: source || undefined,
        lead_source_type: leadSourceType,
        raw_data: body,
        status: "New Lead",
        contacted: false,
        executive_notified: false,
        follow_up_alert_sent: false,
        manager_alerted: false,
        follow_up_due: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        last_updated: new Date().toISOString(),
        // UTM fields
        utm_source: utmSource || undefined,
        utm_medium: utmMedium || undefined,
        utm_campaign: utmCampaign || undefined,
        ad_platform: adPlatform || undefined,
        ad_campaign_id: adCampaignId || undefined,
        gclid: gclid || undefined,
        fbclid: fbclid || undefined,
      }).eq("id", record.id);

      leadId = record.id;
    } else {
      const newLeadId = `${new Date().toISOString()}-${phone}`;
      const followUpDue = new Date(Date.now() + 30 * 60 * 1000).toISOString();

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
        // UTM fields
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        ad_platform: adPlatform,
        ad_campaign_id: adCampaignId,
        gclid: gclid,
        fbclid: fbclid,
      }).select("id").single();

      if (insertErr) throw insertErr;
      leadId = inserted!.id;
    }

    // === STEP 4: Route to vertical-specific tables ===
    let routingError: string | null = null;
    try {
      await routeToVerticalTable(supabase, verticalTag, {
        name, phone, email, city, source, message,
        vehicleNumber, vehicleMake, vehicleModel, policyType, leadSourceType,
        utmSource, utmMedium, utmCampaign, adPlatform,
        adCampaignId, adSetId, adId, gclid, fbclid,
        utmTerm, utmContent,
      });
    } catch (routeErr) {
      routingError = String(routeErr);
      console.error("ROUTING ERROR for", verticalTag, ":", routeErr);
    }

    if (routingError) {
      throw new Error(`Vertical routing failed for ${verticalTag}: ${routingError}`);
    }

    // === STEP 5: Notify Executive via WhatsApp ===
    const executivePhone = "+919855924442";
    const executiveEmail = "hello@grabyourcar.com";

    if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      try {
        await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: executivePhone,
            type: "text",
            text: { body: `🚨 *New Lead Assigned*\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Email:* ${email}\n*City:* ${city}\n*Vertical:* ${verticalTag}\n*Source:* ${source} (${leadSourceType})${adPlatform ? `\n*Ad Platform:* ${adPlatform}` : ""}${utmCampaign ? `\n*Campaign:* ${utmCampaign}` : ""}\n*Message:* ${message}\n\n⏰ Please contact within 30 minutes!` },
          }),
        });
      } catch (e) {
        console.error("WhatsApp notify failed:", e);
      }
    }

    // === STEP 6: Notify via Email ===
    if (RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "hello@grabyourcar.com",
            to: [executiveEmail],
            subject: `New Lead - ${verticalTag}${adPlatform ? ` (${adPlatform})` : ""}`,
            html: `<h2>🚨 New Lead Assigned</h2>
              <p><strong>Name:</strong> ${name}<br>
              <strong>Phone:</strong> ${phone}<br>
              <strong>Email:</strong> ${email}<br>
              <strong>City:</strong> ${city}<br>
              <strong>Vertical:</strong> ${verticalTag}<br>
              <strong>Source:</strong> ${source} (${leadSourceType})<br>
              ${adPlatform ? `<strong>Ad Platform:</strong> ${adPlatform}<br>` : ""}
              ${utmCampaign ? `<strong>Campaign:</strong> ${utmCampaign}<br>` : ""}
              ${gclid ? `<strong>GCLID:</strong> ${gclid}<br>` : ""}
              <strong>Message:</strong> ${message}</p>
              <p style="color: red;">⏰ <strong>Please contact within 30 minutes!</strong></p>`,
          }),
        });
      } catch (e) {
        console.error("Email notify failed:", e);
      }
    }

    await supabase.from("automation_lead_tracking")
      .update({ executive_notified: true })
      .eq("id", leadId);

    return new Response(JSON.stringify({
      success: true,
      lead_id: leadId,
      is_new: isNewLead,
      vertical: verticalTag,
      ad_platform: adPlatform || null,
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
 * Route lead into the appropriate vertical-specific table with UTM attribution.
 */
async function routeToVerticalTable(
  supabase: any,
  vertical: string,
  data: {
    name: string; phone: string; email: string; city: string;
    source: string; message: string;
    vehicleNumber?: string; vehicleMake?: string; vehicleModel?: string;
    policyType?: string; leadSourceType?: string;
    utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null;
    adPlatform?: string | null; adCampaignId?: string | null;
    adSetId?: string | null; adId?: string | null;
    gclid?: string | null; fbclid?: string | null;
    utmTerm?: string | null; utmContent?: string | null;
  }
) {
  const cleanedPhone = cleanPhone(data.phone);
  const phoneCandidates = getPhoneCandidates(cleanedPhone);
  const safeEmail = data.email?.trim() || null;
  const safeCity = data.city?.trim() || null;
  const safeName = (data.name && data.name !== "Unknown") ? data.name : null;
  const requiredName = safeName || `${vertical} Lead`;
  const safeMessage = data.message?.trim() || null;
  const now = new Date().toISOString();

  // Common UTM fields for all tables
  const utmFields: Record<string, unknown> = {};
  if (data.utmSource) utmFields.utm_source = data.utmSource;
  if (data.utmMedium) utmFields.utm_medium = data.utmMedium;
  if (data.utmCampaign) utmFields.utm_campaign = data.utmCampaign;
  if (data.adPlatform) utmFields.ad_platform = data.adPlatform;

  try {
    switch (vertical) {
      case "Car Sales": {
        // 1) leads table
        const { data: existingLead } = await supabase
          .from("leads").select("id").in("phone", phoneCandidates)
          .order("created_at", { ascending: false }).limit(1);

        const leadsUtm: Record<string, unknown> = {
          ...utmFields,
          ...(data.adCampaignId ? { ad_campaign_id: data.adCampaignId } : {}),
          ...(data.adSetId ? { ad_set_id: data.adSetId } : {}),
          ...(data.adId ? { ad_id: data.adId } : {}),
          ...(data.gclid ? { gclid: data.gclid } : {}),
          ...(data.fbclid ? { fbclid: data.fbclid } : {}),
          ...(data.utmTerm ? { utm_term: data.utmTerm } : {}),
          ...(data.utmContent ? { utm_content: data.utmContent } : {}),
          ...(data.leadSourceType ? { lead_source_type: data.leadSourceType } : {}),
        };

        if (existingLead?.length) {
          await supabase.from("leads").update({
            name: data.name !== "Unknown" ? data.name : undefined,
            customer_name: data.name !== "Unknown" ? data.name : undefined,
            email: data.email || undefined,
            city: data.city || undefined,
            source: data.source,
            notes: data.message || undefined,
            status: "new",
            car_brand: data.vehicleMake || undefined,
            car_model: data.vehicleModel || undefined,
            updated_at: now,
            ...leadsUtm,
          }).eq("id", existingLead[0].id);
        } else {
          await supabase.from("leads").insert({
            name: requiredName,
            customer_name: requiredName,
            phone: cleanedPhone,
            email: safeEmail,
            city: safeCity,
            source: data.source,
            notes: safeMessage,
            status: "new",
            priority: "medium",
            car_brand: data.vehicleMake || null,
            car_model: data.vehicleModel || null,
            service_category: "car_sales",
            ...leadsUtm,
          });
        }

        // 2) sales_pipeline
        const { data: existingSales } = await supabase
          .from("sales_pipeline").select("id, pipeline_stage")
          .in("phone", phoneCandidates).order("created_at", { ascending: false }).limit(1);

        if (existingSales?.length) {
          const recycleStages = ["lost", "after_sales"];
          const updates: Record<string, any> = {
            customer_name: data.name !== "Unknown" ? data.name : undefined,
            email: data.email || undefined,
            city: data.city || undefined,
            source: data.source,
            inquiry_remarks: data.message || undefined,
            car_brand: data.vehicleMake || undefined,
            car_model: data.vehicleModel || undefined,
            updated_at: now,
            last_activity_at: now,
            ...utmFields,
          };
          if (recycleStages.includes(existingSales[0].pipeline_stage)) {
            updates.pipeline_stage = "new_lead";
            updates.call_status = null;
            updates.call_attempts = 0;
            updates.lost_reason = null;
            updates.lost_remarks = null;
          }
          await supabase.from("sales_pipeline").update(updates).eq("id", existingSales[0].id);
        } else {
          await supabase.from("sales_pipeline").insert({
            customer_name: requiredName,
            phone: cleanedPhone,
            email: safeEmail,
            city: safeCity,
            source: data.source,
            inquiry_remarks: safeMessage,
            pipeline_stage: "new_lead",
            car_brand: data.vehicleMake || null,
            car_model: data.vehicleModel || null,
            ...utmFields,
          });
        }
        break;
      }

      case "Insurance": {
        const normalizedVehicleNumber = normalizeVehicleNumber(data.vehicleNumber);

        const { data: candidates, error: fetchError } = await supabase
          .from("insurance_clients")
          .select("id, phone, vehicle_number")
          .eq("phone", cleanedPhone)
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;

        const existingClient = (candidates || []).find((c: { vehicle_number?: string | null }) => {
          if (!normalizedVehicleNumber) return true;
          return normalizeVehicleNumber(c.vehicle_number) === normalizedVehicleNumber;
        });

        const insurancePayload: Record<string, unknown> = {
          customer_name: data.name,
          phone: cleanedPhone,
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
          ...utmFields,
        };

        if (existingClient?.id) {
          await supabase.from("insurance_clients").update(insurancePayload).eq("id", existingClient.id);
        } else {
          await supabase.from("insurance_clients").insert({ ...insurancePayload, created_at: now });
        }
        break;
      }

      case "Loan": {
        const { data: existingLoan } = await supabase
          .from("loan_applications").select("id, stage")
          .in("phone", phoneCandidates).order("created_at", { ascending: false }).limit(1);

        if (existingLoan?.length) {
          const recycleStages = ["lost", "disbursed"];
          const updates: Record<string, any> = {
            customer_name: safeName || undefined,
            source: data.source || undefined,
            remarks: safeMessage || undefined,
            car_model: data.vehicleModel || undefined,
            lead_source_tag: data.leadSourceType || data.source || undefined,
            updated_at: now,
            last_activity_at: now,
            ...utmFields,
          };
          if (recycleStages.includes(existingLoan[0].stage)) {
            updates.stage = "new_lead";
            updates.stage_updated_at = now;
            updates.call_status = null;
            updates.lost_reason = null;
            updates.lost_remarks = null;
          }
          const { error: loanUpdateErr } = await supabase.from("loan_applications").update(updates).eq("id", existingLoan[0].id);
          if (loanUpdateErr) throw loanUpdateErr;
        } else {
          const { error: loanInsertErr } = await supabase.from("loan_applications").insert({
            customer_name: requiredName,
            phone: cleanedPhone,
            email: safeEmail,
            source: data.source,
            remarks: safeMessage,
            stage: "new_lead",
            priority: "medium",
            car_model: data.vehicleModel || null,
            lead_source_tag: data.leadSourceType || data.source || "Website",
            ...utmFields,
          });
          if (loanInsertErr) throw loanInsertErr;
        }

        // car_loan_leads sync
        try {
          const { data: existingCLL } = await supabase
            .from("car_loan_leads").select("id").in("phone", phoneCandidates).limit(1);

          if (existingCLL?.length) {
            await supabase.from("car_loan_leads").update({
              name: safeName || undefined,
              city: safeCity || undefined,
              source: data.source,
              notes: safeMessage || undefined,
              status: "new",
              preferred_car: data.vehicleModel || undefined,
              updated_at: now,
            }).eq("id", existingCLL[0].id);
          } else {
            await supabase.from("car_loan_leads").insert({
              name: safeName,
              phone: cleanedPhone,
              city: safeCity,
              source: data.source,
              notes: safeMessage,
              status: "new",
              preferred_car: data.vehicleModel || null,
            });
          }
        } catch (e) {
          console.error("car_loan_leads sync error (non-fatal):", e);
        }
        break;
      }

      case "Self Drive":
      case "HSRP":
      case "Accessories":
      case "Corporate":
      default: {
        const { data: existingLead } = await supabase
          .from("leads").select("id").in("phone", phoneCandidates)
          .order("created_at", { ascending: false }).limit(1);

        const leadsUtm: Record<string, unknown> = {
          ...utmFields,
          ...(data.adCampaignId ? { ad_campaign_id: data.adCampaignId } : {}),
          ...(data.adSetId ? { ad_set_id: data.adSetId } : {}),
          ...(data.adId ? { ad_id: data.adId } : {}),
          ...(data.gclid ? { gclid: data.gclid } : {}),
          ...(data.fbclid ? { fbclid: data.fbclid } : {}),
          ...(data.leadSourceType ? { lead_source_type: data.leadSourceType } : {}),
        };

        if (existingLead?.length) {
          await supabase.from("leads").update({
            name: data.name !== "Unknown" ? data.name : undefined,
            customer_name: data.name !== "Unknown" ? data.name : undefined,
            email: data.email || undefined,
            city: data.city || undefined,
            source: `${data.source} (${vertical})`,
            notes: data.message || undefined,
            status: "new",
            service_category: vertical.toLowerCase().replace(/\s+/g, "_"),
            updated_at: now,
            ...leadsUtm,
          }).eq("id", existingLead[0].id);
        } else {
          await supabase.from("leads").insert({
            name: requiredName,
            customer_name: requiredName,
            phone: cleanedPhone,
            email: safeEmail,
            city: safeCity,
            source: `${data.source} (${vertical})`,
            notes: safeMessage,
            status: "new",
            priority: "medium",
            service_category: vertical.toLowerCase().replace(/\s+/g, "_"),
            ...leadsUtm,
          });
        }
        break;
      }
    }
  } catch (e) {
    console.error(`Vertical routing FAILED for ${vertical}:`, JSON.stringify(e));
    throw e;
  }
}
