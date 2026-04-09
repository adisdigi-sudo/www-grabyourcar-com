import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { form_id, email, name, phone, source } = await req.json();

    if (!form_id || !email) {
      return new Response(JSON.stringify({ error: "form_id and email are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate form exists and is active
    const { data: form } = await supabase
      .from("popup_forms")
      .select("*")
      .eq("id", form_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!form) {
      return new Response(JSON.stringify({ error: "Form not found or inactive" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert subscriber
    const { data: existing } = await supabase
      .from("email_subscribers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      await supabase.from("email_subscribers").update({
        name: name || undefined,
        phone: phone || undefined,
        subscribed: true,
        unsubscribed_at: null,
        source: source || `popup_${form.name}`,
      }).eq("id", existing.id);
    } else {
      await supabase.from("email_subscribers").insert({
        email,
        name: name || null,
        phone: phone || null,
        subscribed: true,
        source: source || `popup_${form.name}`,
        list_id: form.target_list_id || null,
      });
    }

    // Increment form submissions count
    await supabase.from("popup_forms").update({
      submissions: (form.submissions || 0) + 1,
    }).eq("id", form_id);

    // Auto-enroll in drip sequences if configured
    if (form.auto_sequence_id) {
      const subData = existing || (await supabase.from("email_subscribers").select("id").eq("email", email).maybeSingle()).data;
      if (subData) {
        await supabase.from("drip_enrollments").upsert({
          sequence_id: form.auto_sequence_id,
          subscriber_id: subData.id,
          status: "active",
          next_send_at: new Date().toISOString(),
        }, { onConflict: "sequence_id,subscriber_id" });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Subscribed successfully" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Popup form submit error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
