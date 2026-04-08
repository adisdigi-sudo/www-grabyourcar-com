import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, prompt, tone, audience, brand_name, from_name, subject_hint, existing_content } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Action: generate_email — full email from prompt
    if (action === "generate_email") {
      const systemPrompt = `You are a professional email marketing copywriter for ${brand_name || "GrabYourCar"}, an automotive services company in India.
Create a complete, beautiful HTML email that is mobile-responsive and professional.

Rules:
- Use inline CSS (no external stylesheets)
- Max width 600px, centered
- Professional gradient header with brand name
- Clean body with clear CTAs
- Footer with company info and unsubscribe placeholder
- Use {customer_name} for personalization
- Use {email} for recipient email
- Tone: ${tone || "professional and friendly"}
- Target audience: ${audience || "general customers"}
- From: ${from_name || "GrabYourCar Team"}
- Do NOT include subject line in the HTML — only return the email body HTML
- Make it visually stunning with proper spacing, colors, and typography
- Use emojis sparingly for engagement
- Include a clear call-to-action button

Return ONLY the HTML content, nothing else. No markdown, no explanation.`;

      const response = await fetch("https://ai.lovable.dev/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt || "Create a marketing email about our latest car offers and services" },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      let htmlContent = data.choices?.[0]?.message?.content || "";
      
      // Clean markdown wrappers if present
      htmlContent = htmlContent.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

      return new Response(
        JSON.stringify({ success: true, html_content: htmlContent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: generate_subject — AI subject line suggestions
    if (action === "generate_subject") {
      const response = await fetch("https://ai.lovable.dev/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an email marketing expert. Generate 5 compelling email subject lines for ${brand_name || "GrabYourCar"} (automotive company).
Return ONLY a JSON array of 5 strings. No markdown, no explanation. Example: ["Subject 1", "Subject 2", ...]`,
            },
            { role: "user", content: subject_hint || prompt || "Marketing email about car offers" },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "[]";
      content = content.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
      
      let subjects: string[] = [];
      try {
        subjects = JSON.parse(content);
      } catch {
        subjects = [content];
      }

      return new Response(
        JSON.stringify({ success: true, subjects }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: improve_email — enhance existing content
    if (action === "improve_email") {
      const response = await fetch("https://ai.lovable.dev/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a professional email marketing optimizer. Improve the given HTML email content.
Make it more engaging, visually appealing, and conversion-focused.
Keep the same structure but enhance the copy, design, and CTAs.
Return ONLY the improved HTML content, nothing else.`,
            },
            { role: "user", content: `Improve this email:\n\n${existing_content}` },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      let htmlContent = data.choices?.[0]?.message?.content || "";
      htmlContent = htmlContent.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

      return new Response(
        JSON.stringify({ success: true, html_content: htmlContent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (err: any) {
    console.error("ai-email-writer error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
