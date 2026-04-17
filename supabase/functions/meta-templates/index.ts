import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return new Response(JSON.stringify({ error: "WhatsApp credentials not configured" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ─── Resumable Upload: convert public media URL to Meta header_handle (h:...) ───
  // Meta REQUIRES an uploaded handle for VIDEO/IMAGE/DOCUMENT template headers, not a raw URL.
  const uploadMediaToMeta = async (mediaUrl: string, mimeHint?: string): Promise<{ handle?: string; error?: string }> => {
    try {
      // 1) Download the media
      const mediaResp = await fetch(mediaUrl);
      if (!mediaResp.ok) return { error: `Could not download media (${mediaResp.status})` };
      const buf = new Uint8Array(await mediaResp.arrayBuffer());
      const fileLength = buf.byteLength;
      const fileType = mimeHint || mediaResp.headers.get("content-type") || "application/octet-stream";

      // 2) Get the App ID that owns the WhatsApp token
      const appResp = await fetch(
        `https://graph.facebook.com/v25.0/debug_token?input_token=${WHATSAPP_ACCESS_TOKEN}&access_token=${WHATSAPP_ACCESS_TOKEN}`,
      );
      const appJson = await appResp.json();
      const appId = appJson?.data?.app_id;
      if (!appId) return { error: "Could not determine Meta App ID for upload" };

      // 3) Create an upload session
      const sessionResp = await fetch(
        `https://graph.facebook.com/v25.0/${appId}/uploads?file_length=${fileLength}&file_type=${encodeURIComponent(fileType)}&access_token=${WHATSAPP_ACCESS_TOKEN}`,
        { method: "POST" },
      );
      const sessionJson = await sessionResp.json();
      const uploadId = sessionJson?.id;
      if (!uploadId) return { error: `Upload session failed: ${sessionJson?.error?.message || "unknown"}` };

      // 4) Upload the bytes
      const uploadResp = await fetch(`https://graph.facebook.com/v25.0/${uploadId}`, {
        method: "POST",
        headers: {
          Authorization: `OAuth ${WHATSAPP_ACCESS_TOKEN}`,
          file_offset: "0",
          "Content-Type": fileType,
        },
        body: buf,
      });
      const uploadJson = await uploadResp.json();
      const handle = uploadJson?.h;
      if (!handle) return { error: `Upload bytes failed: ${uploadJson?.error?.message || JSON.stringify(uploadJson)}` };
      return { handle };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  try {
    const body = await req.json();
    const action = body.action;

    // ─── Get WABA ID from phone number ───
    const getWabaId = async (): Promise<string> => {
      // Approach 0: Use the env secret directly
      const envWaba = Deno.env.get("WHATSAPP_WABA_ID");
      if (envWaba) return envWaba;

      // Approach 1: Direct field on phone number
      const resp1 = await fetch(
        `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=whatsapp_business_account`,
        { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
      );
      const data1 = await resp1.json();
      console.log("WABA lookup approach 1:", JSON.stringify(data1));
      if (data1?.whatsapp_business_account?.id) return data1.whatsapp_business_account.id;

      // Approach 2: Use the app's WABA listing
      const resp2 = await fetch(
        `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=owner`,
        { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
      );
      const data2 = await resp2.json();
      console.log("WABA lookup approach 2:", JSON.stringify(data2));
      if (data2?.owner?.id) return data2.owner.id;

      // Approach 3: Check stored WABA ID in admin_settings
      const { data: setting } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "waba_id")
        .maybeSingle();
      if (setting?.setting_value) return String(setting.setting_value);

      return "";
    };

    // ═══════════════════════════════════════════════
    // ACTION: Get account & number status
    // ═══════════════════════════════════════════════
    if (action === "get_status") {
      const phoneResp = await fetch(
        `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=id,verified_name,quality_rating,status,display_phone_number,code_verification_status,name_status,messaging_limit_tier`,
        { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
      );
      const phoneData = await phoneResp.json();

      if (phoneData.error) {
        return new Response(JSON.stringify({ error: phoneData.error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get WABA info
      const wabaResp = await fetch(
        `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=whatsapp_business_account`,
        { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
      );
      const wabaData = await wabaResp.json();
      const wabaId = wabaData?.whatsapp_business_account?.id;

      let wabaInfo = null;
      if (wabaId) {
        const wabaInfoResp = await fetch(
          `https://graph.facebook.com/v25.0/${wabaId}?fields=id,name,account_review_status,business_verification_status,messaging_limit_tier`,
          { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
        );
        wabaInfo = await wabaInfoResp.json();
      }

      return new Response(JSON.stringify({
        phone: {
          id: phoneData.id,
          display_phone_number: phoneData.display_phone_number,
          verified_name: phoneData.verified_name,
          quality_rating: phoneData.quality_rating,
          status: phoneData.status,
          name_status: phoneData.name_status,
          messaging_limit_tier: phoneData.messaging_limit_tier,
          code_verification_status: phoneData.code_verification_status,
        },
        waba: wabaInfo ? {
          id: wabaInfo.id,
          name: wabaInfo.name,
          account_review_status: wabaInfo.account_review_status,
          business_verification_status: wabaInfo.business_verification_status,
        } : null,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // ACTION: Sync templates FROM Meta
    // ═══════════════════════════════════════════════
    if (action === "sync_templates") {
      const wabaId = await getWabaId();
      if (!wabaId) {
        return new Response(JSON.stringify({ error: "Could not find WABA ID" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(
        `https://graph.facebook.com/v25.0/${wabaId}/message_templates?limit=250`,
        { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
      );
      const data = await resp.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const metaTemplates = data.data || [];
      let synced = 0;

      for (const mt of metaTemplates) {
        const bodyComp = mt.components?.find((c: any) => c.type === "BODY");
        const headerComp = mt.components?.find((c: any) => c.type === "HEADER");
        const footerComp = mt.components?.find((c: any) => c.type === "FOOTER");
        const buttonsComp = mt.components?.filter((c: any) => c.type === "BUTTONS");

        const templateBody = bodyComp?.text || "";
        const headerType = headerComp?.format?.toLowerCase() || (headerComp?.text ? "text" : null);
        const headerContent = headerComp?.text || null;
        const footer = footerComp?.text || null;

        // Extract variables from body
        const varMatches = templateBody.match(/\{\{(\d+)\}\}/g) || [];
        const variables = varMatches.map((_: string, i: number) => `var_${i + 1}`);

        // Map Meta status
        const statusMap: Record<string, string> = {
          APPROVED: "approved",
          PENDING: "pending",
          REJECTED: "rejected",
          PAUSED: "paused",
          DISABLED: "disabled",
        };

        const payload = {
          name: mt.name,
          display_name: mt.name.replace(/_/g, " "),
          category: mt.category?.toLowerCase() || "utility",
          language: mt.language || "en",
          body: templateBody,
          header_type: headerType,
          header_content: headerContent,
          footer: footer,
          variables: variables,
          buttons: buttonsComp?.[0]?.buttons || [],
          status: statusMap[mt.status] || mt.status?.toLowerCase() || "draft",
          meta_template_id: mt.id,
          meta_rejection_reason: mt.rejected_reason || null,
          meta_quality_score: mt.quality_score?.score || null,
        };

        // Upsert by meta_template_id OR name
        const { data: existing } = await supabase
          .from("wa_templates")
          .select("id")
          .or(`meta_template_id.eq.${mt.id},name.eq.${mt.name}`)
          .maybeSingle();

        if (existing) {
          await supabase.from("wa_templates").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("wa_templates").insert(payload);
        }
        synced++;
      }

      return new Response(JSON.stringify({ success: true, synced, total_from_meta: metaTemplates.length }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // ACTION: Submit template TO Meta for approval
    // ═══════════════════════════════════════════════
    if (action === "submit_template") {
      const { template_id } = body;
      if (!template_id) {
        return new Response(JSON.stringify({ error: "template_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: template } = await supabase
        .from("wa_templates")
        .select("*")
        .eq("id", template_id)
        .single();

      if (!template) {
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const wabaId = await getWabaId();
      if (!wabaId) {
        return new Response(JSON.stringify({ error: "Could not find WABA ID" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build Meta template components
      const components: any[] = [];

      if (template.header_type && template.header_type !== "none") {
        if (template.header_type === "text" && template.header_content) {
          // Strip emojis, newlines, asterisks from header (Meta requirement)
          const cleanHeader = (template.header_content as string)
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{2702}-\u{27B0}]/gu, "")
            .replace(/[*\n\r]/g, "")
            .trim();
          if (cleanHeader) {
            const headerComp: any = { type: "HEADER", format: "TEXT", text: cleanHeader };
            // If header has variables like {{1}}, Meta requires example.header_text
            const headerVars = cleanHeader.match(/\{\{(\d+)\}\}/g) || [];
            if (headerVars.length > 0) {
              headerComp.example = { header_text: headerVars.map((_, i) => `Sample${i + 1}`) };
            }
            components.push(headerComp);
          }
        } else if (["image", "video", "document"].includes(template.header_type)) {
          // Meta REQUIRES example.header_handle (public URL) for media headers
          const mediaUrl = template.header_content as string | null;
          if (!mediaUrl) {
            const fmt = template.header_type.toUpperCase();
            await supabase.from("wa_templates").update({
              status: "rejected",
              meta_rejection_reason: `${fmt} header needs a sample file URL. Upload a sample ${template.header_type} (≤16 MB) and resubmit.`,
            }).eq("id", template_id);
            return new Response(JSON.stringify({
              success: false,
              error: `${fmt} header missing sample file. Upload a sample ${template.header_type} in the template editor, then resubmit.`,
              fix_hint: `Use the upload button next to the ${template.header_type} header field to attach a small sample.`,
              validation_failed: true,
            }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          components.push({
            type: "HEADER",
            format: template.header_type.toUpperCase(),
            example: { header_handle: [mediaUrl] },
          });
        }
      }

      // Convert ALL {{...}} variables (named, spaced, or positional) to clean positional {{1}}, {{2}}, etc.
      let metaBody = template.body as string;
      
      // Match ANY {{...}} pattern including spaces inside: {{name}}, {{Car Details}}, {{Insurance price }}, {{1}}
      const allVarMatches = metaBody.match(/\{\{([^}]+)\}\}/g) || [];
      const uniqueVarTexts: string[] = [];
      for (const m of allVarMatches) {
        const inner = m.replace(/^\{\{|\}\}$/g, "").trim();
        if (!uniqueVarTexts.includes(inner) && !/^\d+$/.test(inner)) {
          uniqueVarTexts.push(inner);
        }
      }
      
      // Replace each unique named/spaced var with positional — handle spaces in regex
      if (uniqueVarTexts.length > 0) {
        uniqueVarTexts.forEach((varText, i) => {
          const escaped = varText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          metaBody = metaBody.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g"), `{{${i + 1}}}`);
        });
      }

      // Generate sample values for Meta approval
      const sampleMap: Record<string, string> = {
        customer_name: "Rahul Sharma", name: "Rahul Sharma", phone: "9876543210",
        vehicle_number: "DL 01 AB 1234", vehicle: "Hyundai Creta", insurer: "HDFC ERGO",
        premium: "₹12,500", expiry_date: "15 Mar 2026", policy_number: "POL-2025-001",
        order_id: "ORD-12345", amount: "₹25,000", date: "11 Apr 2026",
        booking_id: "BK-001", txn_id: "TXN-78901", car_model: "Hyundai Creta", otp: "123456",
      };

      // Normalize var keys for sample lookup
      const normKey = (v: string) => v.trim().toLowerCase().replace(/\s+/g, "_");

      // Count final positional vars in metaBody
      const finalPositional = metaBody.match(/\{\{(\d+)\}\}/g) || [];
      const numVars = finalPositional.length;

      // Build sample values matching positional count
      const sampleValues: string[] = [];
      for (let i = 0; i < numVars; i++) {
        const origName = uniqueVarTexts[i] || `var_${i + 1}`;
        const key = normKey(origName);
        sampleValues.push(sampleMap[key] || `Sample ${origName}`);
      }

      // ── Meta Policy: Variable-to-word ratio validation ──
      // Meta requires enough non-variable words relative to variable count
      const plainWords = metaBody.replace(/\{\{\d+\}\}/g, "").replace(/[^\w\s]/g, "").trim().split(/\s+/).filter(Boolean);
      const wordCount = plainWords.length;
      // Meta's approximate rule: need at least ~3 words per variable
      if (numVars > 0 && wordCount < numVars * 3) {
        const suggestion = `Body has ${wordCount} words and ${numVars} variables. Meta requires at least ~${numVars * 3} words. Add more descriptive text or reduce variables.`;
        await supabase.from("wa_templates").update({
          status: "rejected",
          meta_rejection_reason: suggestion,
        }).eq("id", template_id);

        return new Response(JSON.stringify({ 
          success: false,
          error: suggestion,
          fix_hint: "Increase message body length or reduce number of variables",
          validation_failed: true,
        }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bodyComponent: any = { type: "BODY", text: metaBody };
      if (sampleValues.length > 0) {
        bodyComponent.example = { body_text: [sampleValues] };
      }
      components.push(bodyComponent);

      if (template.footer) {
        components.push({ type: "FOOTER", text: template.footer });
      }

      if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
        components.push({ type: "BUTTONS", buttons: template.buttons });
      }

      const metaPayload = {
        name: template.name,
        language: template.language || "en",
        category: (template.category || "UTILITY").toUpperCase(),
        components,
      };

      console.log("Submitting to Meta:", JSON.stringify(metaPayload));

      const resp = await fetch(
        `https://graph.facebook.com/v25.0/${wabaId}/message_templates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(metaPayload),
        }
      );

      const result = await resp.json();

      if (result.error) {
        const metaErrMsg = result.error.error_user_msg || result.error.message || "Meta rejected this template";
        await supabase.from("wa_templates").update({
          status: "rejected",
          meta_rejection_reason: metaErrMsg,
        }).eq("id", template_id);

        return new Response(JSON.stringify({ success: false, error: metaErrMsg, details: result.error, meta_rejected: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Success - update with Meta template ID
      await supabase.from("wa_templates").update({
        status: "pending",
        meta_template_id: result.id,
        meta_rejection_reason: null,
      }).eq("id", template_id);

      return new Response(JSON.stringify({ success: true, meta_template_id: result.id, status: result.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // ACTION: Delete template from Meta
    // ═══════════════════════════════════════════════
    if (action === "delete_template") {
      const { template_name } = body;
      const wabaId = await getWabaId();
      if (!wabaId || !template_name) {
        return new Response(JSON.stringify({ error: "WABA ID or template_name missing" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(
        `https://graph.facebook.com/v25.0/${wabaId}/message_templates?name=${template_name}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
        }
      );
      const result = await resp.json();

      return new Response(JSON.stringify(result), {
        status: resp.ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // ACTION: Send broadcast
    // ═══════════════════════════════════════════════
    if (action === "send_broadcast") {
      const { broadcast_id } = body;
      if (!broadcast_id) {
        return new Response(JSON.stringify({ error: "broadcast_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: broadcast } = await supabase
        .from("wa_broadcasts")
        .select("*, wa_templates(*)")
        .eq("id", broadcast_id)
        .single();

      if (!broadcast || !broadcast.wa_templates) {
        return new Response(JSON.stringify({ error: "Broadcast or template not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const template = broadcast.wa_templates;
      if (template.status !== "approved") {
        return new Response(JSON.stringify({ error: "Template must be approved by Meta before broadcasting" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get recipients from wa_contacts based on segment filter
      let contactsQuery = supabase.from("wa_contacts").select("id, phone, name");
      const segmentFilter = broadcast.segment_filter as any;
      if (segmentFilter?.tags?.length > 0) {
        contactsQuery = contactsQuery.overlaps("tags", segmentFilter.tags);
      }
      const { data: contacts } = await contactsQuery;

      if (!contacts || contacts.length === 0) {
        return new Response(JSON.stringify({ error: "No contacts match the segment" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update broadcast status
      await supabase.from("wa_broadcasts").update({
        status: "sending",
        started_at: new Date().toISOString(),
        total_recipients: contacts.length,
      }).eq("id", broadcast_id);

      let sentCount = 0;
      let failedCount = 0;

      for (const contact of contacts) {
        try {
          // Build template message components
          const components: any[] = [];
          const vars = broadcast.variables as any;
          
          if (vars?.body?.length > 0) {
            components.push({
              type: "body",
              parameters: vars.body.map((v: string) => ({
                type: "text",
                text: v.replace(/\{\{name\}\}/gi, contact.name || "Customer"),
              })),
            });
          }

          const sendResp = await fetch(
            `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: contact.phone,
                type: "template",
                template: {
                  name: template.name,
                  language: { code: template.language || "en" },
                  components: components.length > 0 ? components : undefined,
                },
              }),
            }
          );

          const sendData = await sendResp.json();

          if (sendResp.ok && sendData.messages?.[0]?.id) {
            sentCount++;
            // Log in broadcast recipients
            await supabase.from("broadcast_recipients").insert({
              broadcast_id: broadcast_id,
              phone: contact.phone,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
          } else {
            failedCount++;
            await supabase.from("broadcast_recipients").insert({
              broadcast_id: broadcast_id,
              phone: contact.phone,
              status: "failed",
              error_message: sendData.error?.message || "Send failed",
            });
          }

          // Rate limit: 80 msgs/sec Meta limit
          if (sentCount % 50 === 0) await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          failedCount++;
          await supabase.from("broadcast_recipients").insert({
            broadcast_id: broadcast_id,
            phone: contact.phone,
            status: "failed",
            error_message: String(e),
          });
        }
      }

      await supabase.from("wa_broadcasts").update({
        status: "completed",
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      }).eq("id", broadcast_id);

      return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failedCount }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("meta-templates error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
