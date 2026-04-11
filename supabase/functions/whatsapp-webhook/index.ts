import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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
          const timestamp = statusUpdate.timestamp
            ? new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString()
            : new Date().toISOString();

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
            .select("id, unread_count")
            .eq("phone", from)
            .maybeSingle();

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

          // ══════════════════════════════════════════════════════════
          // STEP 1: Check wa_chatbot_rules (Chatbot Builder rules)
          // ══════════════════════════════════════════════════════════
          let aiResponse: string | null = null;
          let intentDetected = "general";
          let leadCaptured = false;
          let respondedBy = "ai_brain";

          const { data: chatbotRules } = await supabase
            .from("wa_chatbot_rules")
            .select("*")
            .eq("is_active", true)
            .order("priority", { ascending: true });

          if (chatbotRules && chatbotRules.length > 0) {
            const msgLower = messageText.toLowerCase();

            for (const rule of chatbotRules) {
              // Split comma-separated keywords and match
              const allKeywords = (rule.intent_keywords || [])
                .flatMap((kw: string) => kw.split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean));

              const matched = allKeywords.some((kw: string) => msgLower.includes(kw));

              if (matched) {
                console.log(`Chatbot rule matched: ${rule.name} (${rule.response_type})`);

                // Update match count
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
                  // Use Lovable AI Gateway for AI-generated responses
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
                  // Send template via messaging-service
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

                break; // First matched rule wins
              }
            }
          }

          // ══════════════════════════════════════════════════════════
          // STEP 2: Fallback to AI Brain if no chatbot rule matched
          // ══════════════════════════════════════════════════════════
          if (!aiResponse) {
            aiResponse = getFallbackResponse(messageText.toLowerCase());

            try {
              const brainResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-brain`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  messages: conversationHistory.slice(-12),
                  channel: "whatsapp",
                  customer_name: contactName,
                  customer_phone: from,
                }),
              });

              if (brainResponse.ok) {
                const brainData = await brainResponse.json();
                aiResponse = brainData.response || aiResponse;
                intentDetected = brainData.intent || "general";
                leadCaptured = brainData.lead_captured || false;
              } else {
                console.error("AI Brain error:", brainResponse.status);
              }
            } catch (e) {
              console.error("AI Brain call failed, using fallback:", e);
            }
          }

          conversationHistory.push({ role: "assistant", content: aiResponse });

          await supabase.from("whatsapp_conversations").update({
            messages: conversationHistory.slice(-20),
            last_message_at: new Date().toISOString(),
            customer_name: contactName,
            intent_detected: intentDetected,
          }).eq("id", conversationId);

          // ── Send reply via Meta API ──
          const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
          const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

          if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID && aiResponse) {
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
                text: { body: aiResponse },
              }),
            });

            const sendData = await sendResult.json();
            const providerMessageId = sendData.messages?.[0]?.id || null;

            await supabase.from("wa_message_logs").insert({
              phone: from,
              customer_name: contactName,
              message_type: "text",
              message_content: aiResponse,
              trigger_event: respondedBy,
              status: sendResult.ok ? "sent" : "failed",
              provider: "meta",
              provider_message_id: providerMessageId,
              sent_at: new Date().toISOString(),
            });

            if (inboxConvoId) {
              await supabase.from("wa_inbox_messages").insert({
                conversation_id: inboxConvoId,
                direction: "outbound",
                message_type: "text",
                content: aiResponse,
                wa_message_id: providerMessageId,
                status: sendResult.ok ? "sent" : "failed",
                sent_by_name: respondedBy.startsWith("chatbot") ? "Chatbot" : "AI Bot",
              });
            }
          }

          // ── Trigger wa_flows if applicable ──
          try {
            const { data: activeFlows } = await supabase
              .from("wa_flows")
              .select("*")
              .eq("is_active", true);

            if (activeFlows && activeFlows.length > 0) {
              for (const flow of activeFlows) {
                const triggerConfig = flow.trigger_config as any;
                let shouldTrigger = false;

                if (flow.trigger_type === "keyword" && triggerConfig?.keywords) {
                  const keywords = (triggerConfig.keywords as string[]).flatMap(
                    (kw: string) => kw.split(",").map((k: string) => k.trim().toLowerCase()).filter(Boolean)
                  );
                  shouldTrigger = keywords.some((kw: string) => messageText.toLowerCase().includes(kw));
                } else if (flow.trigger_type === "all_messages") {
                  shouldTrigger = true;
                } else if (flow.trigger_type === "first_message") {
                  shouldTrigger = !existingConvo;
                }

                if (shouldTrigger) {
                  console.log(`Flow triggered: ${flow.name}`);
                  await supabase.from("wa_flows").update({
                    total_runs: (flow.total_runs || 0) + 1,
                    last_run_at: new Date().toISOString(),
                  }).eq("id", flow.id);

                  // Process flow nodes sequentially
                  const nodes = (flow.nodes as any[]) || [];
                  const edges = (flow.edges as any[]) || [];

                  const processNode = async (nodeId: string) => {
                    const node = nodes.find((n: any) => n.id === nodeId);
                    if (!node) return;

                    if (node.type === "send_message" && node.config?.message) {
                      const flowMsg = node.config.message
                        .replace(/\{\{name\}\}/gi, contactName)
                        .replace(/\{\{phone\}\}/gi, from);

                      if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
                        await fetch(`https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                          },
                          body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: from,
                            type: "text",
                            text: { body: flowMsg },
                          }),
                        });
                      }
                    } else if (node.type === "delay" && node.config?.seconds) {
                      // In webhook context, we skip delays (queue for later in production)
                      console.log(`Flow delay: ${node.config.seconds}s (skipped in webhook)`);
                    }

                    // Follow edges to next node
                    const nextEdge = edges.find((e: any) => e.source === nodeId);
                    if (nextEdge) {
                      await processNode(nextEdge.target);
                    }
                  };

                  // Start from trigger node
                  const triggerNode = nodes.find((n: any) => n.type === "trigger");
                  if (triggerNode) {
                    const firstEdge = edges.find((e: any) => e.source === triggerNode.id);
                    if (firstEdge) {
                      await processNode(firstEdge.target);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("Flow execution error:", e);
          }
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
  if (message.includes("price") || message.includes("cost") || message.includes("kitna")) {
    return `🚗 For the best on-road price, our expert will call you within 5 minutes!\n\nBrowse cars: www.grabyourcar.com/cars`;
  }
  if (message.includes("loan") || message.includes("emi") || message.includes("finance")) {
    return `💰 Car Finance: Interest from 8.5%, up to 100% funding!\n\nCalculate EMI: www.grabyourcar.com/car-loans`;
  }
  if (message.includes("insurance") || message.includes("bima")) {
    return `🛡️ Car Insurance with up to 70% discount!\n\nGet quote: www.grabyourcar.com/car-insurance`;
  }
  if (message.includes("hi") || message.includes("hello") || message.includes("namaste")) {
    return `👋 Welcome to GrabYourCar!\n\nI'm your AI car assistant. I can help with:\n\n1️⃣ Find the perfect car\n2️⃣ Check prices & offers\n3️⃣ Calculate EMI\n4️⃣ Get Insurance Quote\n5️⃣ Book Test Drive\n\nJust ask me anything! 🚗`;
  }
  return `Thank you for your message! Our car expert will connect with you shortly.\n\nMeanwhile, explore: www.grabyourcar.com`;
}
