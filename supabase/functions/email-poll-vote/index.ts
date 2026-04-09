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
    const pollId = url.searchParams.get("poll_id");
    const optionIndex = url.searchParams.get("option");
    const email = url.searchParams.get("email");

    if (!pollId || optionIndex === null) {
      return new Response(renderPage("Invalid Vote", "This voting link is invalid."), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    // Check if already voted
    if (email) {
      const { data: existing } = await supabase
        .from("email_poll_votes")
        .select("id")
        .eq("poll_id", pollId)
        .eq("voter_email", email)
        .maybeSingle();

      if (existing) {
        return new Response(renderPage("Already Voted", "You have already voted in this poll. Thank you!"), {
          status: 200, headers: { "Content-Type": "text/html" },
        });
      }
    }

    // Get poll to validate option
    const { data: poll } = await supabase
      .from("email_polls")
      .select("*")
      .eq("id", pollId)
      .maybeSingle();

    if (!poll) {
      return new Response(renderPage("Poll Not Found", "This poll no longer exists."), {
        status: 404, headers: { "Content-Type": "text/html" },
      });
    }

    const options = typeof poll.options === "string" ? JSON.parse(poll.options) : poll.options;
    const idx = parseInt(optionIndex);
    if (isNaN(idx) || idx < 0 || idx >= options.length) {
      return new Response(renderPage("Invalid Option", "This voting option is invalid."), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    // Record vote
    await supabase.from("email_poll_votes").insert({
      poll_id: pollId,
      option_index: idx,
      option_text: options[idx],
      voter_email: email || null,
    });

    return new Response(renderPage("Vote Recorded! ✅", `You voted for: <strong>${options[idx]}</strong>. Thank you for participating!`), {
      status: 200, headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Poll vote error:", error);
    return new Response(renderPage("Error", "Something went wrong. Please try again."), {
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
