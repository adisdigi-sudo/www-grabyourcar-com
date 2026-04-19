import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeDealerPhone(phone: string | null | undefined) {
  const digits = String(phone || "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2);
  return digits;
}

function toWebhookIso(timestamp?: string) {
  return timestamp
    ? new Date(parseInt(timestamp, 10) * 1000).toISOString()
    : new Date().toISOString();
}

function mergeJsonObject(base: unknown, patch: Record<string, unknown>) {
  return {
    ...(base && typeof base === "object" ? base as Record<string, unknown> : {}),
    ...patch,
  };
}

async function syncDealerInquiryCampaignCounts(supabase: any, campaignId: string) {
  const { data: recipients } = await supabase
    .from("dealer_inquiry_recipients")
    .select("send_status, replied_at")
    .eq("campaign_id", campaignId);

  if (!recipients) return;

  const sentCount = recipients.filter((row: any) => ["submitted", "sent", "delivered", "read"].includes(row.send_status || "")).length;
  const failedCount = recipients.filter((row: any) => ["failed", "invalid"].includes(row.send_status || "")).length;
  const repliedCount = recipients.filter((row: any) => Boolean(row.replied_at)).length;
  const awaitingMetaStatus = recipients.some((row: any) => ["submitted", "sent"].includes(row.send_status || ""));

  await supabase.from("dealer_inquiry_campaigns").update({
    sent_count: sentCount,
    failed_count: failedCount,
    replied_count: repliedCount,
    status: awaitingMetaStatus ? "sending" : sentCount > 0 ? "completed" : failedCount > 0 ? "failed" : "sending",
  }).eq("id", campaignId);
}

async function syncDealerRecipientStatus(supabase: any, statusUpdate: any) {
  const shortPhone = normalizeDealerPhone(statusUpdate.recipient_id);
  if (!shortPhone) return;

  const { data: recentRecipients } = await supabase
    .from("dealer_inquiry_recipients")
    .select("id, campaign_id, send_status, sent_at, qualification_data")
    .eq("phone", shortPhone)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!recentRecipients?.length) return;

  const matchedRecipient = recentRecipients.find((row: any) => {
    const tracking = row.qualification_data || {};
    return tracking.provider_message_id === statusUpdate.id
      || tracking.text_provider_message_id === statusUpdate.id
      || tracking.template_provider_message_id === statusUpdate.id;
  }) || recentRecipients.find((row: any) => [null, "submitted", "sent"].includes(row.send_status));

  if (!matchedRecipient) return;

  const errorInfo = statusUpdate.errors?.[0];
  const statusTime = toWebhookIso(statusUpdate.timestamp);
  const updates: Record<string, unknown> = {
    qualification_data: mergeJsonObject(matchedRecipient.qualification_data, {
      provider_status: statusUpdate.status,
      provider_status_at: statusTime,
      last_error: errorInfo?.message || errorInfo?.title || null,
      error_code: errorInfo?.code ? String(errorInfo.code) : null,
    }),
  };

  if (statusUpdate.status === "sent") {
    updates.send_status = "sent";
    updates.sent_at = matchedRecipient.sent_at || statusTime;
  } else if (statusUpdate.status === "delivered") {
    updates.send_status = "delivered";
    updates.delivered_at = statusTime;
  } else if (statusUpdate.status === "read") {
    updates.send_status = "read";
    updates.delivered_at = statusTime;
  } else if (statusUpdate.status === "failed") {
    updates.send_status = "failed";
  }

  await supabase.from("dealer_inquiry_recipients").update(updates).eq("id", matchedRecipient.id);
  await syncDealerInquiryCampaignCounts(supabase, matchedRecipient.campaign_id);
}

async function syncDealerReply(supabase: any, phone: string, messageText: string) {
  const shortPhone = normalizeDealerPhone(phone);
  if (!shortPhone || !messageText) return;

  const { data: recentRecipients } = await supabase
    .from("dealer_inquiry_recipients")
    .select("id, campaign_id, replied_at")
    .eq("phone", shortPhone)
    .order("created_at", { ascending: false })
    .limit(5);

  const matchedRecipient = recentRecipients?.find((row: any) => !row.replied_at) || recentRecipients?.[0];
  if (!matchedRecipient) return;

  await supabase.from("dealer_inquiry_recipients").update({
    replied_at: new Date().toISOString(),
    reply_message: messageText,
  }).eq("id", matchedRecipient.id);

  await syncDealerInquiryCampaignCounts(supabase, matchedRecipient.campaign_id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "grabyourcar_webhook_verify";

  // GET — Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }

    return new Response(JSON.stringify({ status: "Webhook endpoint active" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST — incoming messages + delivery status updates
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Meta webhook payload:", JSON.stringify(body).slice(0, 500));

      if (body.action === "health_check") {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return new Response(JSON.stringify({ success: true, status: "acknowledged" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- Handle delivery status updates ---
      if (value.statuses?.length > 0) {
        for (const statusUpdate of value.statuses) {
          const updates: Record<string, any> = { status: statusUpdate.status };
          const timestamp = toWebhookIso(statusUpdate.timestamp);

          if (statusUpdate.status === "sent") updates.sent_at = timestamp;
          else if (statusUpdate.status === "delivered") { updates.delivered_at = timestamp; updates.status_updated_at = timestamp; }
          else if (statusUpdate.status === "read") { updates.read_at = timestamp; updates.status_updated_at = timestamp; }
          else if (statusUpdate.status === "failed") {
            updates.error_message = statusUpdate.errors?.[0]?.title || "Delivery failed";
            updates.error_code = statusUpdate.errors?.[0]?.code?.toString() || null;
            updates.failed_at = timestamp;
            updates.status_updated_at = timestamp;
          }

          await supabase.from("wa_message_logs").update(updates).eq("provider_message_id", statusUpdate.id);
          await supabase.from("wa_inbox_messages").update(updates).eq("wa_message_id", statusUpdate.id);
          await syncDealerRecipientStatus(supabase, statusUpdate);
        }
        return new Response(JSON.stringify({ success: true, processed: "statuses" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- Handle incoming messages ---
      if (value.messages?.length > 0) {
        for (const msg of value.messages) {
          const from = msg.from;
          const messageText = msg.text?.body || msg.caption || "";
          const contactName = value.contacts?.[0]?.profile?.name || "Customer";
          const messageType = msg.type || "text";
          const waMessageId = msg.id || null;

          console.log(`Incoming from ${contactName} (${from}): [${messageType}] ${messageText}`);

          // ── Upsert wa_conversations (new inbox) ──
          const windowExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          const { data: inboxConvo } = await supabase
            .from("wa_conversations")
            .select("id, unread_count, human_takeover, human_takeover_at")
            .eq("phone", from)
            .maybeSingle();

          // ── Auto-reset human takeover after 2 hours of inactivity ──
          if (inboxConvo?.human_takeover && inboxConvo?.human_takeover_at) {
            const takeoverAge = Date.now() - new Date(inboxConvo.human_takeover_at).getTime();
            const TWO_HOURS = 2 * 60 * 60 * 1000;
            if (takeoverAge > TWO_HOURS) {
              console.log(`Auto-resetting human takeover for ${from} (${Math.round(takeoverAge / 60000)}min old)`);
              await supabase.from("wa_conversations").update({
                human_takeover: false,
                human_takeover_at: null,
              }).eq("id", inboxConvo.id);
              inboxConvo.human_takeover = false;
            }
          }

          const isNewInboxConversation = !inboxConvo;

          let inboxConvoId: string;

          if (inboxConvo) {
            inboxConvoId = inboxConvo.id;
            await supabase.from("wa_conversations").update({
              customer_name: contactName,
              last_message: messageText.slice(0, 200) || `[${messageType}]`,
              last_message_at: new Date().toISOString(),
              last_customer_message_at: new Date().toISOString(),
              window_expires_at: windowExpiry,
              unread_count: (inboxConvo.unread_count || 0) + 1,
              status: "active",
            }).eq("id", inboxConvoId);
          } else {
            const { data: newConvo } = await supabase.from("wa_conversations").insert({
              phone: from,
              customer_name: contactName,
              last_message: messageText.slice(0, 200) || `[${messageType}]`,
              last_message_at: new Date().toISOString(),
              last_customer_message_at: new Date().toISOString(),
              window_expires_at: windowExpiry,
              unread_count: 1,
              status: "active",
            }).select("id").single();
            inboxConvoId = newConvo?.id;
          }

          // ── Store inbound in wa_inbox_messages ──
          let mediaUrl: string | null = null;
          let mediaMime: string | null = null;
          let mediaFilename: string | null = null;

          if (messageType === "image" && msg.image) { mediaUrl = msg.image.id; mediaMime = msg.image.mime_type; }
          else if (messageType === "document" && msg.document) { mediaUrl = msg.document.id; mediaMime = msg.document.mime_type; mediaFilename = msg.document.filename; }
          else if (messageType === "audio" && msg.audio) { mediaUrl = msg.audio.id; mediaMime = msg.audio.mime_type; }
          else if (messageType === "video" && msg.video) { mediaUrl = msg.video.id; mediaMime = msg.video.mime_type; }

          if (inboxConvoId) {
            await supabase.from("wa_inbox_messages").insert({
              conversation_id: inboxConvoId,
              direction: "inbound",
              message_type: messageType,
              content: messageText || null,
              media_url: mediaUrl,
              media_mime_type: mediaMime,
              media_filename: mediaFilename,
              wa_message_id: waMessageId,
              status: "received",
              status_updated_at: new Date().toISOString(),
            });
          }

          // ── Upsert wa_contacts ──
          const cleanPhone = from.replace(/^91/, "");
          await syncDealerReply(supabase, from, messageText);

          const { data: existingContact } = await supabase
            .from("wa_contacts")
            .select("id")
            .eq("phone", from)
            .maybeSingle();

          if (!existingContact) {
            await supabase.from("wa_contacts").insert({
              phone: from,
              name: contactName,
              tags: ["auto-captured"],
              last_message_at: new Date().toISOString(),
            }).select().maybeSingle();
          } else {
            await supabase.from("wa_contacts").update({
              name: contactName,
              last_message_at: new Date().toISOString(),
            }).eq("id", existingContact.id);
          }

          // ══════════════════════════════════════════════════════════
          // SALES ENGINE ROUTER — handle active engine sessions FIRST
          // (highest priority, before chatbot rules / AI brain)
          // ══════════════════════════════════════════════════════════
          let engineHandled = false;
          if (!inboxConvo?.human_takeover) {
            try {
              const engineResp = await fetch(`${SUPABASE_URL}/functions/v1/sales-engine-router`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
                body: JSON.stringify({ phone: from, message_text: messageText, customer_name: contactName }),
              });
              const engineData = await engineResp.json();
              if (engineData?.handled) {
                console.log(`Sales engine handled reply for ${from}: action=${engineData.action}, status=${engineData.status}`);
                engineHandled = true;
              } else if (engineData?.reason === "no_active_session") {
                // ─── AUTO-START engine session if lead vertical matches ───
                try {
                  let leadVertical: string | null = null;
                  // Detect vertical from existing lead tables
                  const phoneVariants = [from, from.replace(/^91/, ""), `91${from.replace(/^91/, "")}`];
                  const checks: Array<[string, string]> = [
                    ["insurance_clients", "insurance"],
                    ["loan_leads", "loans"],
                    ["hsrp_bookings", "hsrp"],
                    ["rental_bookings", "rentals"],
                  ];
                  for (const [tbl, vert] of checks) {
                    const { data: hit } = await supabase.from(tbl).select("id").or(phoneVariants.map(p => `phone.eq.${p}`).join(",")).limit(1).maybeSingle();
                    if (hit) { leadVertical = vert; break; }
                  }
                  // Fallback: check generic leads table for service_category
                  if (!leadVertical) {
                    const { data: anyLead } = await supabase.from("leads").select("service_category").or(phoneVariants.map(p => `phone.eq.${p}`).join(",")).limit(1).maybeSingle();
                    if (anyLead?.service_category) leadVertical = String(anyLead.service_category).toLowerCase();
                  }

                  if (leadVertical) {
                    const { data: matchEngine } = await supabase
                      .from("sales_engines")
                      .select("id, name")
                      .eq("is_active", true)
                      .eq("vertical", leadVertical)
                      .order("created_at", { ascending: false })
                      .limit(1)
                      .maybeSingle();

                    if (matchEngine) {
                      // Create a session at the first step so router can take over from next message
                      const { data: firstStep } = await supabase
                        .from("sales_engine_steps")
                        .select("step_key")
                        .eq("engine_id", matchEngine.id)
                        .order("order_index", { ascending: true })
                        .limit(1)
                        .maybeSingle();

                      if (firstStep) {
                        await supabase.from("sales_engine_sessions").insert({
                          engine_id: matchEngine.id,
                          phone: from,
                          customer_name: contactName,
                          current_step_key: firstStep.step_key,
                          status: "active",
                          last_reply_at: new Date().toISOString(),
                        });
                        console.log(`Auto-started engine "${matchEngine.name}" for ${from} (vertical=${leadVertical})`);

                        // Re-route this same message through the new session
                        const reroute = await fetch(`${SUPABASE_URL}/functions/v1/sales-engine-router`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
                          body: JSON.stringify({ phone: from, message_text: messageText, customer_name: contactName }),
                        });
                        const rerouteData = await reroute.json();
                        if (rerouteData?.handled) engineHandled = true;
                      }
                    }
                  }
                } catch (autoErr) {
                  console.error("auto-start engine failed:", autoErr);
                }
              }
            } catch (e) {
              console.error("sales-engine-router call failed:", e);
            }
          }

          // ══════════════════════════════════════════════════════════
          // REPLY AGENT FALLBACK — if no engine handled it, try AI agent
          // ══════════════════════════════════════════════════════════
          if (!engineHandled && !inboxConvo?.human_takeover) {
            try {
              const { data: agent } = await supabase
                .from("reply_agents")
                .select("id, name")
                .eq("is_active", true)
                .eq("channel", "whatsapp")
                .order("priority", { ascending: false })
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (agent) {
                const agentResp = await fetch(`${SUPABASE_URL}/functions/v1/reply-agent-runner`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
                  body: JSON.stringify({
                    agent_id: agent.id,
                    inbound_message: messageText,
                    customer_phone: from,
                    customer_name: contactName,
                  }),
                });
                const agentData = await agentResp.json();
                if (agentData?.reply && agentData?.auto_sent !== false) {
                  // Send via WhatsApp
                  const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
                  const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
                  if (WA_TOKEN && WA_PHONE_ID) {
                    const waResp = await fetch(`https://graph.facebook.com/v22.0/${WA_PHONE_ID}/messages`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
                      body: JSON.stringify({ messaging_product: "whatsapp", to: from, type: "text", text: { body: agentData.reply } }),
                    });
                    const waData = await waResp.json();
                    if (inboxConvo?.id) {
                      await supabase.from("wa_inbox_messages").insert({
                        conversation_id: inboxConvo.id,
                        direction: "outbound",
                        message_type: "text",
                        content: agentData.reply,
                        wa_message_id: waData?.messages?.[0]?.id || null,
                        status: waData?.messages?.[0]?.id ? "sent" : "failed",
                        sent_by_name: `Reply Agent: ${agent.name}`,
                      });
                    }
                    console.log(`Reply agent "${agent.name}" auto-replied to ${from}`);
                    engineHandled = true;
                  }
                }
              }
            } catch (e) {
              console.error("reply-agent fallback failed:", e);
            }
          }

          if (engineHandled) continue; // skip chatbot rules + AI brain

          // ── Check new inbox human_takeover flag ──
          if (inboxConvo?.human_takeover) {
            console.log(`Human takeover active (wa_conversations) for ${from}, skipping AI`);

            // Check if customer has sent multiple messages without any agent reply
            // If 3+ unanswered inbound messages, send a fallback support message
            const { data: recentMsgs } = await supabase
              .from("wa_inbox_messages")
              .select("direction")
              .eq("conversation_id", inboxConvo.id)
              .order("created_at", { ascending: false })
              .limit(10);

            // Count consecutive inbound messages (no outbound in between)
            let unansweredCount = 0;
            if (recentMsgs) {
              for (const m of recentMsgs) {
                if (m.direction === "inbound") unansweredCount++;
                else break; // stop at first outbound
              }
            }

            // On 3rd unanswered message, send a polite fallback
            if (unansweredCount >= 2) { // current msg is the 3rd (not yet stored)
              const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
              const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

              if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
                // Only send once — check if we already sent a fallback recently (within last 30 min)
                const { data: recentFallback } = await supabase
                  .from("wa_inbox_messages")
                  .select("id")
                  .eq("conversation_id", inboxConvo.id)
                  .eq("direction", "outbound")
                  .eq("template_name", "_system_no_agent")
                  .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
                  .limit(1);

                if (!recentFallback || recentFallback.length === 0) {
                  const fallbackText = `Thank you for your patience! Our support team is currently unavailable. Please contact us directly:\n\n📞 *+91 95772 00023*\n📧 support@grabyourcar.com\n\nWe'll get back to you as soon as possible. 🙏`;

                  const toNum = from.startsWith("91") ? from : `91${from.replace(/\D/g, "")}`;
                  const fallbackResp = await fetch(`https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
                    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: toNum, type: "text", text: { body: fallbackText } }),
                  });
                  const fallbackResult = await fallbackResp.json();
                  const fallbackWaId = fallbackResult.messages?.[0]?.id || null;

                  // Store fallback message in inbox
                  await supabase.from("wa_inbox_messages").insert({
                    conversation_id: inboxConvo.id,
                    direction: "outbound",
                    message_type: "text",
                    content: fallbackText,
                    template_name: "_system_no_agent",
                    wa_message_id: fallbackWaId,
                    status: fallbackResp.ok ? "sent" : "failed",
                    sent_by_name: "System",
                  });

                  console.log(`Sent no-agent fallback to ${from}, wa_id: ${fallbackWaId}`);

                  // ── AUTO-RESUME AI after fallback ──
                  // Turn off human_takeover so AI resumes for next messages
                  const { error: resetErr1 } = await supabase.from("wa_conversations").update({
                    human_takeover: false,
                    human_takeover_at: null,
                  }).eq("id", inboxConvo.id);
                  if (resetErr1) console.error("Failed to reset wa_conversations human_takeover:", resetErr1);

                  const { error: resetErr2 } = await supabase.from("whatsapp_conversations").update({
                    human_takeover: false,
                    status: "active",
                  }).eq("phone_number", from);
                  if (resetErr2) console.error("Failed to reset whatsapp_conversations human_takeover:", resetErr2);
                  else console.log(`Reset human_takeover for ${from} in both tables`);

                  // Send AI resume message
                  const resumeText = `Meanwhile, I'm your AI assistant and I'm available right now! 🤖\n\nIs there anything I can help you with? I can assist with:\n• Insurance queries & quotes\n• Policy details & renewals\n• Car booking information\n• Any other questions\n\nJust type your question and I'll do my best to help! 😊`;

                  const resumeResp = await fetch(`https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
                    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: toNum, type: "text", text: { body: resumeText } }),
                  });
                  const resumeResult = await resumeResp.json();
                  const resumeWaId = resumeResult.messages?.[0]?.id || null;

                  await supabase.from("wa_inbox_messages").insert({
                    conversation_id: inboxConvo.id,
                    direction: "outbound",
                    message_type: "text",
                    content: resumeText,
                    template_name: "_system_ai_resume",
                    wa_message_id: resumeWaId,
                    status: resumeResp.ok ? "sent" : "failed",
                    sent_by_name: "AI Assistant",
                  });

                  console.log(`AI auto-resumed for ${from} after no-agent fallback`);
                }
              }
            }

            // Still store in legacy but skip AI reply
            const { data: existingConvoLegacy } = await supabase
              .from("whatsapp_conversations")
              .select("id, messages")
              .eq("phone_number", from)
              .single();
            if (existingConvoLegacy) {
              const history = [...((existingConvoLegacy.messages as any[]) || []), { role: "user", content: messageText }];
              await supabase.from("whatsapp_conversations").update({
                messages: history.slice(-20),
                last_message_at: new Date().toISOString(),
                customer_name: contactName,
              }).eq("id", existingConvoLegacy.id);
            }
            continue;
          }

          // ── Legacy: whatsapp_conversations ──
          const { data: existingConvo } = await supabase
            .from("whatsapp_conversations")
            .select("*")
            .eq("phone_number", from)
            .single();

          let conversationHistory: Array<{ role: string; content: string }> = [];
          let conversationId: string;

          if (existingConvo) {
            conversationId = existingConvo.id;
            conversationHistory = (existingConvo.messages as any[]) || [];

            if (existingConvo.human_takeover) {
              console.log(`Human takeover active for ${from}, skipping AI`);

              // ── Fallback: if 3+ unanswered inbound msgs, send support contact ──
              if (inboxConvo?.id) {
                const { data: recentMsgsLegacy } = await supabase
                  .from("wa_inbox_messages")
                  .select("direction")
                  .eq("conversation_id", inboxConvo.id)
                  .order("created_at", { ascending: false })
                  .limit(10);

                let unansweredLegacy = 0;
                if (recentMsgsLegacy) {
                  for (const m of recentMsgsLegacy) {
                    if (m.direction === "inbound") unansweredLegacy++;
                    else break;
                  }
                }

                if (unansweredLegacy >= 2) {
                  const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
                  const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
                  if (WA_TOKEN && WA_PHONE_ID) {
                    const { data: recentFb } = await supabase
                      .from("wa_inbox_messages")
                      .select("id")
                      .eq("conversation_id", inboxConvo.id)
                      .eq("direction", "outbound")
                      .eq("template_name", "_system_no_agent")
                      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
                      .limit(1);

                    if (!recentFb || recentFb.length === 0) {
                      const fbText = `Thank you for your patience! Our support team is currently unavailable. Please contact us directly:\n\n📞 *+91 95772 00023*\n📧 support@grabyourcar.com\n\nWe'll get back to you as soon as possible. 🙏`;
                      const toNum = from.startsWith("91") ? from : `91${from.replace(/\D/g, "")}`;
                      const fbResp = await fetch(`https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
                        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: toNum, type: "text", text: { body: fbText } }),
                      });
                      const fbResult = await fbResp.json();
                      const fbWaId = fbResult.messages?.[0]?.id || null;
                      await supabase.from("wa_inbox_messages").insert({
                        conversation_id: inboxConvo.id,
                        direction: "outbound",
                        message_type: "text",
                        content: fbText,
                        template_name: "_system_no_agent",
                        wa_message_id: fbWaId,
                        status: fbResp.ok ? "sent" : "failed",
                        sent_by_name: "System",
                      });
                      console.log(`Sent no-agent fallback (legacy path) to ${from}, wa_id: ${fbWaId}`);

                      // ── AUTO-RESUME AI after fallback (legacy path) ──
                      const { error: lgResetErr1 } = await supabase.from("wa_conversations").update({
                        human_takeover: false,
                        human_takeover_at: null,
                      }).eq("id", inboxConvo.id);
                      if (lgResetErr1) console.error("Legacy reset wa_conversations failed:", lgResetErr1);

                      const { error: lgResetErr2 } = await supabase.from("whatsapp_conversations").update({
                        human_takeover: false,
                        status: "active",
                      }).eq("id", conversationId);
                      if (lgResetErr2) console.error("Legacy reset whatsapp_conversations failed:", lgResetErr2);
                      else console.log(`Legacy path: reset human_takeover for ${from}`);

                      const resumeText = `Meanwhile, I'm your AI assistant and I'm available right now! 🤖\n\nIs there anything I can help you with? I can assist with:\n• Insurance queries & quotes\n• Policy details & renewals\n• Car booking information\n• Any other questions\n\nJust type your question and I'll do my best to help! 😊`;

                      const resumeResp = await fetch(`https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${WA_TOKEN}` },
                        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: toNum, type: "text", text: { body: resumeText } }),
                      });
                      const resumeResult = await resumeResp.json();
                      const resumeWaId = resumeResult.messages?.[0]?.id || null;

                      await supabase.from("wa_inbox_messages").insert({
                        conversation_id: inboxConvo.id,
                        direction: "outbound",
                        message_type: "text",
                        content: resumeText,
                        template_name: "_system_ai_resume",
                        wa_message_id: resumeWaId,
                        status: resumeResp.ok ? "sent" : "failed",
                        sent_by_name: "AI Assistant",
                      });

                      console.log(`AI auto-resumed (legacy) for ${from} after no-agent fallback`);
                    }
                  }
                }
              }

              conversationHistory.push({ role: "user", content: messageText });
              await supabase.from("whatsapp_conversations").update({
                messages: conversationHistory.slice(-20),
                last_message_at: new Date().toISOString(),
                customer_name: contactName,
              }).eq("id", conversationId);
              continue;
            }
          } else {
            const { data: newConvo } = await supabase
              .from("whatsapp_conversations")
              .insert({ phone_number: from, customer_name: contactName, messages: [], status: "active", ai_enabled: true })
              .select()
              .single();
            conversationId = newConvo?.id;
          }

          conversationHistory.push({ role: "user", content: messageText });

          const lowerMessageText = messageText.toLowerCase();
          const lastAssistantMessage = [...conversationHistory]
            .reverse()
            .find((entry: any) => entry?.role === "assistant" && typeof entry?.content === "string")?.content?.toLowerCase() || "";
          const hasPendingStrictInsurancePrompt = lastAssistantMessage.includes("for security, please reply in this exact format:")
            || lastAssistantMessage.includes("your documents are not available here")
            || lastAssistantMessage.includes("reply yes to connect to our insurance expert");
          const isStrictSelfServiceRequest = hasPendingStrictInsurancePrompt || [
            "policy",
            "policy pdf",
            "policy copy",
            "document",
            "insurance",
            "quote",
            "premium",
            "renewal",
            "invoice",
            "bill",
            "receipt",
            "loan status",
            "emi",
            "hsrp",
            "payment history",
            "payment receipt",
            "my car",
            "meri gaadi",
          ].some((keyword) => lowerMessageText.includes(keyword));

          // ══════════════════════════════════════════════════════════
          // STEP 1: Check wa_chatbot_rules (Chatbot Builder rules)
          // ══════════════════════════════════════════════════════════
          let aiResponse: string | null = null;
          let intentDetected = "general";
          let leadCaptured = false;
          let respondedBy = "hybrid_router";
          let documentShare: { type?: "document" | "image"; url: string; fileName?: string; caption?: string } | null = null;
          let humanHandover: { vertical?: string; reason?: string } | null = null;

          const { data: chatbotRules } = isStrictSelfServiceRequest
            ? { data: [] as any[] }
            : await supabase
                .from("wa_chatbot_rules")
                .select("*")
                .eq("is_active", true)
                .order("priority", { ascending: true });

          if (chatbotRules && chatbotRules.length > 0) {
            const msgLower = lowerMessageText;

            for (const rule of chatbotRules) {
              const allKeywords = (rule.intent_keywords || [])
                .flatMap((kw: string) => kw.split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean));

              const matched = allKeywords.some((kw: string) => msgLower.includes(kw));

              if (matched) {
                console.log(`Chatbot rule matched: ${rule.name} (${rule.response_type})`);

                await supabase.from("wa_chatbot_rules").update({
                  match_count: (rule.match_count || 0) + 1,
                  last_matched_at: new Date().toISOString(),
                }).eq("id", rule.id);

                if (rule.response_type === "text" && rule.response_content) {
                  aiResponse = rule.response_content
                    .replace(/\{\{customer_name\}\}/gi, contactName)
                    .replace(/\{\{phone\}\}/gi, from);
                  respondedBy = `chatbot_rule:${rule.name}`;
                  intentDetected = rule.name;
                } else if (rule.response_type === "ai_generated" && rule.ai_prompt) {
                  try {
                    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
                    if (LOVABLE_API_KEY) {
                      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${LOVABLE_API_KEY}`,
                        },
                        body: JSON.stringify({
                          model: "google/gemini-3-flash-preview",
                          messages: [
                            { role: "system", content: rule.ai_prompt },
                            ...conversationHistory.slice(-8),
                          ],
                        }),
                      });

                      if (aiResp.ok) {
                        const aiData = await aiResp.json();
                        aiResponse = aiData.choices?.[0]?.message?.content || null;
                        respondedBy = `chatbot_ai:${rule.name}`;
                        intentDetected = rule.name;
                      }
                    }
                  } catch (e) {
                    console.error("Chatbot AI generation failed:", e);
                  }
                } else if (rule.response_type === "template" && rule.template_name) {
                  try {
                    await fetch(`${SUPABASE_URL}/functions/v1/messaging-service`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                      },
                      body: JSON.stringify({
                        action: "send_template",
                        phone: from,
                        template_name: rule.template_name,
                        variables: { name: contactName },
                        customer_name: contactName,
                      }),
                    });
                    respondedBy = `chatbot_template:${rule.template_name}`;
                    intentDetected = rule.name;
                  } catch (e) {
                    console.error("Template send failed:", e);
                  }
                }

                break;
              }
            }
          }

          // ══════════════════════════════════════════════════════════
          // STEP 2: HYBRID ROUTER
          // 1) Rule engine for deterministic workflows (policy/invoice/sanction/account/car DB)
          // 2) AI fallback for open-ended advice (budget, recommendations, comparisons)
          // ══════════════════════════════════════════════════════════
          let handledByFlowEngine = false;
          if (!aiResponse) {
            try {
              const flowVertical = detectVerticalHint(lowerMessageText);
              const flowResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-flow-engine`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  customer_phone: from,
                  message_text: messageText,
                  customer_name: contactName,
                  vertical_slug: flowVertical,
                }),
              });

              if (flowResponse.ok) {
                const flowData = await flowResponse.json();
                handledByFlowEngine = flowData.action && flowData.action !== "no_match_fallback";

                if (handledByFlowEngine) {
                  aiResponse = flowData.outbound || null;
                  intentDetected = flowData.matched || flowData.action || "flow_engine";
                  respondedBy = `flow_engine:${flowData.action || "matched"}`;
                  if (flowData.attachments?.length > 0) {
                    documentShare = flowData.attachments[0];
                  }
                }
              } else {
                console.error("Flow engine error:", flowResponse.status);
              }
            } catch (e) {
              console.error("Flow engine call failed:", e);
            }
          }

          if (!aiResponse) {
            try {
              const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
              if (LOVABLE_API_KEY) {
                const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: "google/gemini-3-flash-preview",
                    messages: [
                      {
                        role: "system",
                        content: `You are GrabYourCar's WhatsApp sales and support assistant.

Rules:
- If user asks for policy/invoice/receipt/sanction letter/account details/payment details/HSRP status, answer briefly and ask for the exact identifier needed if missing.
- For car advice, budget guidance, recommendations, comparisons, features, and buying help, give a practical helpful answer.
- Speak naturally in English, Hindi, or Hinglish based on the user's tone.
- Be concise, useful, and sales-aware.
- Mention GrabYourCar strengths naturally when relevant: 500+ cars delivered, pan-India support, loans, insurance, HSRP, accessories.
- Never say you are limited to keywords.
- If unsure, ask 1 clarifying question instead of saying you didn't understand.`,
                      },
                      ...conversationHistory.slice(-12),
                      { role: "user", content: messageText },
                    ],
                    tools: [
                      {
                        type: "function",
                        function: {
                          name: "classify_reply",
                          description: "Classify whether the user needs a deterministic document/status flow or a normal conversational answer.",
                          parameters: {
                            type: "object",
                            properties: {
                              route: { type: "string", enum: ["document_help", "sales_advice", "general_info", "handoff"] },
                              reply: { type: "string" },
                            },
                            required: ["route", "reply"],
                            additionalProperties: false,
                          },
                        },
                      },
                    ],
                    tool_choice: { type: "function", function: { name: "classify_reply" } },
                  }),
                });

                if (aiResp.status === 429 || aiResp.status === 402) {
                  const errText = await aiResp.text();
                  console.error("AI gateway limit/billing error:", aiResp.status, errText);
                } else if (aiResp.ok) {
                  const aiData = await aiResp.json();
                  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
                  const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : null;
                  aiResponse = parsed?.reply || aiData.choices?.[0]?.message?.content || null;
                  intentDetected = parsed?.route || "ai_fallback";
                  respondedBy = `ai_fallback:${intentDetected}`;
                } else {
                  console.error("AI fallback error:", aiResp.status, await aiResp.text());
                }
              }
            } catch (e) {
              console.error("AI fallback failed:", e);
            }
          }

          const finalAiResponse = aiResponse || getFallbackResponse(lowerMessageText);
          conversationHistory.push({ role: "assistant", content: finalAiResponse });

          await supabase.from("whatsapp_conversations").update({
            messages: conversationHistory.slice(-20),
            last_message_at: new Date().toISOString(),
            customer_name: contactName,
            intent_detected: intentDetected,
            human_takeover: humanHandover ? true : undefined,
            status: humanHandover ? "needs_human" : undefined,
          }).eq("id", conversationId);

          if (humanHandover && inboxConvoId) {
            await supabase.from("wa_conversations").update({
              assigned_vertical: "insurance",
              status: "needs_human",
            }).eq("id", inboxConvoId);
          }

          // ── Send reply via gateway first, fallback to direct Meta API ──
          const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
          const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

          if (finalAiResponse) {
            let gatewaySent = false;

            try {
              const gatewayResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  to: from,
                  message: finalAiResponse,
                  name: contactName,
                  logEvent: respondedBy,
                  messageType: "text",
                }),
              });

              const gatewayData = await gatewayResponse.json();
              gatewaySent = gatewayResponse.ok && gatewayData?.success === true;

              if (!gatewaySent) {
                console.error("AI gateway send failed:", gatewayData?.error || gatewayData);
              }
            } catch (gatewayError) {
              console.error("AI gateway send exception:", gatewayError);
            }

            if (!gatewaySent && WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
              const sendResult = await fetch(`https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: from,
                  type: "text",
                  text: { body: finalAiResponse },
                }),
              });

              const sendData = await sendResult.json();
              const providerMessageId = sendData.messages?.[0]?.id || null;

              await supabase.from("wa_message_logs").insert({
                phone: from,
                customer_name: contactName,
                message_type: "text",
                message_content: finalAiResponse,
                trigger_event: respondedBy,
                status: sendResult.ok ? "sent" : "failed",
                provider: "meta",
                provider_message_id: providerMessageId,
                sent_at: sendResult.ok ? new Date().toISOString() : null,
                failed_at: sendResult.ok ? null : new Date().toISOString(),
                error_message: sendResult.ok ? null : (sendData.error?.message || "AI reply send failed"),
              });

              if (inboxConvoId) {
                await supabase.from("wa_inbox_messages").insert({
                  conversation_id: inboxConvoId,
                  direction: "outbound",
                  message_type: "text",
                  content: finalAiResponse,
                  wa_message_id: providerMessageId,
                  status: sendResult.ok ? "sent" : "failed",
                  sent_by_name: respondedBy.startsWith("chatbot") ? "Chatbot" : "AI Bot",
                });
              }
            }

            if (gatewaySent && documentShare?.url) {
              try {
                const mediaType = documentShare.type === "image" ? "image" : "document";
                const documentResponse = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    to: from,
                    messageType: mediaType,
                    mediaUrl: documentShare.url,
                    mediaFileName: documentShare.fileName || (mediaType === "image" ? "image.jpg" : "document.pdf"),
                    message: documentShare.caption || (mediaType === "image" ? "Requested car image" : "Requested document"),
                    name: contactName,
                    logEvent: `${respondedBy}:${mediaType}_share`,
                  }),
                });

                const documentData = await documentResponse.json().catch(() => null);
                if (!documentResponse.ok || documentData?.success !== true) {
                  console.error("Attachment send failed:", documentData?.error || documentData);
                }
              } catch (documentError) {
                console.error("Attachment send exception:", documentError);
              }
            }
          }

          // ── Legacy wa_flows execution disabled for inbound WhatsApp ──
          // Hybrid router above is now the single reply source:
          // 1) deterministic flow-engine for docs/status/payments/car DB
          // 2) AI fallback for open-ended sales/support queries
        }

        return new Response(JSON.stringify({ success: true, processed: "messages" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, status: "no_action" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

function getFallbackResponse(message: string): string {
  if (message.includes("policy") || message.includes("insurance")) {
    return `Please share your *vehicle number* or *policy number* and I’ll help fetch your insurance details. 📄`;
  }
  if (message.includes("invoice") || message.includes("receipt") || message.includes("bill")) {
    return `Please share your *booking/order number* or *registered phone number* so I can help with your invoice/receipt. 🧾`;
  }
  if (message.includes("loan") || message.includes("sanction") || message.includes("emi") || message.includes("finance")) {
    return `Please share your *registered phone number* or *loan/application reference* and I’ll help with your loan details. 💰`;
  }
  if (message.includes("budget") || message.includes("range") || message.includes("recommend") || message.includes("suggest")) {
    return `Sure 👍 Tell me your *budget*, *fuel preference*, and *city*, and I’ll suggest the best cars for you.`;
  }
  if (message.includes("hi") || message.includes("hello") || message.includes("namaste")) {
    return `🚗 Welcome to GrabYourCar!\n\nI can help with car suggestions, prices, EMI, insurance, loan docs, invoices, HSRP, and payment details.\n\nWhat would you like help with today?`;
  }
  return `I can help with *cars, budget advice, policy copy, sanction letter, invoice, HSRP status,* or *payment details*. Just tell me what you need.`;
}

function detectVerticalHint(message: string): string | undefined {
  if (["policy", "insurance", "premium", "renewal", "claim", "bima"].some((keyword) => message.includes(keyword))) {
    return "insurance";
  }
  if (["loan", "emi", "finance", "sanction", "approval"].some((keyword) => message.includes(keyword))) {
    return "loans";
  }
  if (["hsrp", "plate", "number plate"].some((keyword) => message.includes(keyword))) {
    return "hsrp";
  }
  if (["rent", "rental", "booking"].some((keyword) => message.includes(keyword))) {
    return "self-drive";
  }
  if (["accessory", "accessories", "order", "helmet", "seat cover"].some((keyword) => message.includes(keyword))) {
    return "accessories";
  }
  return undefined;
}

function normalizeFlowKeywords(keywords: unknown): string[] {
  if (!Array.isArray(keywords)) return [];
  return keywords
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);
}

function interpolateFlowText(content: string, customerName: string, phone: string): string {
  return content
    .replace(/\{\{customer_name\}\}/gi, customerName)
    .replace(/\{\{name\}\}/gi, customerName)
    .replace(/\{\{phone\}\}/gi, phone);
}

function getFlowDelaySeconds(config: Record<string, any>): number {
  const duration = Number(config.seconds ?? config.duration ?? 0) || 0;
  const unit = String(config.unit || "seconds").toLowerCase();

  if (unit === "days") return duration * 86400;
  if (unit === "hours") return duration * 3600;
  if (unit === "minutes") return duration * 60;
  return duration;
}
