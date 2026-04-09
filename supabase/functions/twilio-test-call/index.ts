import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!ACCOUNT_SID || !AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured");
    }

    const { to, from, message } = await req.json();

    const toNumber = to || "+919855924442";
    const fromNumber = from || "+15755775563";
    const twiml = `<Response><Say voice="alice" language="en-IN">${message || "Hello! This is a test call from GrabYourCar AI Voice Agent. Your car buying experience is about to get smarter. Thank you!"}</Say></Response>`;

    // Basic Auth for Twilio
    const credentials = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toNumber,
          From: fromNumber,
          Twiml: twiml,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", JSON.stringify(data));
      throw new Error(data.message || `Twilio API error: ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true, callSid: data.sid, status: data.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Call error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
