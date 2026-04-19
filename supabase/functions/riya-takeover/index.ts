// Riya Live-Chat Takeover — agent claims a session, posts a human reply,
// or releases control back to the AI. Used by the admin LiveChats dashboard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json();
    const { action, session_id, agent_id, agent_name, message } = body;

    if (!session_id || !action) {
      return new Response(JSON.stringify({ ok: false, error: "session_id + action required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "takeover") {
      await supabase.from("riya_chat_sessions").update({
        takeover_state: "human",
        assigned_agent_id: agent_id || null,
        assigned_agent_name: agent_name || "Agent",
        human_taken_over_at: new Date().toISOString(),
      }).eq("id", session_id);

      await supabase.from("riya_chat_messages").insert({
        session_id,
        role: "system",
        content: `🧑‍💼 ${agent_name || "Agent"} joined the conversation. AI is paused.`,
        sender_name: agent_name || "Agent",
        sender_id: agent_id || null,
      });
    } else if (action === "release") {
      await supabase.from("riya_chat_sessions").update({
        takeover_state: "ai",
        assigned_agent_id: null,
        assigned_agent_name: null,
      }).eq("id", session_id);

      await supabase.from("riya_chat_messages").insert({
        session_id,
        role: "system",
        content: `🤖 ${agent_name || "Agent"} handed the chat back to Riya AI.`,
        sender_name: agent_name || "Agent",
        sender_id: agent_id || null,
      });
    } else if (action === "reply") {
      if (!message || !String(message).trim()) {
        return new Response(JSON.stringify({ ok: false, error: "message required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("riya_chat_messages").insert({
        session_id,
        role: "assistant",
        content: String(message),
        sender_name: agent_name || "Agent",
        sender_id: agent_id || null,
      });
      await supabase.from("riya_chat_sessions").update({
        last_message_preview: String(message).slice(0, 200),
        last_message_at: new Date().toISOString(),
      }).eq("id", session_id);
    } else {
      return new Response(JSON.stringify({ ok: false, error: "unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("riya-takeover error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
