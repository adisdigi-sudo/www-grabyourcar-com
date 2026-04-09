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

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(renderPage("Invalid Link", "This unsubscribe link is invalid or expired."), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    // Look up token
    const { data: tokenData, error } = await supabase
      .from("email_unsubscribe_tokens")
      .select("subscriber_id")
      .eq("token", token)
      .maybeSingle();

    if (error || !tokenData) {
      return new Response(renderPage("Invalid Link", "This unsubscribe link is invalid or expired."), {
        status: 404, headers: { "Content-Type": "text/html" },
      });
    }

    // Unsubscribe
    await supabase.from("email_subscribers").update({
      subscribed: false,
      unsubscribed_at: new Date().toISOString(),
    }).eq("id", tokenData.subscriber_id);

    // Delete token
    await supabase.from("email_unsubscribe_tokens").delete().eq("token", token);

    return new Response(renderPage("Unsubscribed", "You have been successfully unsubscribed from our mailing list. You will no longer receive marketing emails from GrabYourCar."), {
      status: 200, headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new Response(renderPage("Error", "Something went wrong. Please try again later."), {
      status: 500, headers: { "Content-Type": "text/html" },
    });
  }
});

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — GrabYourCar</title>
<style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa}
.card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:480px;text-align:center}
h1{color:#1a1a1a;margin-bottom:12px}p{color:#666;line-height:1.6}
.logo{font-size:24px;font-weight:bold;color:#e53e3e;margin-bottom:24px}</style>
</head>
<body><div class="card"><div class="logo">GrabYourCar</div><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
