import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * AI Voice Agent - Makes outbound calls with human-like AI voice
 * 
 * Architecture:
 * 1. Twilio makes the call and streams audio
 * 2. ElevenLabs handles TTS (Text-to-Speech) with human voice
 * 3. Lovable AI generates intelligent sales responses
 * 
 * Endpoints:
 * - POST /ai-voice-agent (action: "call") → Initiate outbound call
 * - POST /ai-voice-agent (action: "webhook") → Handle Twilio webhook for call flow
 * - POST /ai-voice-agent (action: "gather") → Handle speech input from customer
 * - POST /ai-voice-agent (action: "status") → Check call status
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: "Twilio credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Twilio webhook sends form data
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
      body.action = new URL(req.url).searchParams.get("action") || "webhook";
    } else {
      body = await req.json();
    }

    const { action } = body;

    switch (action) {
      case "call":
        return await initiateCall(body, ACCOUNT_SID, AUTH_TOKEN);
      case "webhook":
        return await handleCallWebhook(body, ELEVENLABS_API_KEY);
      case "gather":
        return await handleGatherResponse(body, ELEVENLABS_API_KEY, LOVABLE_API_KEY);
      case "status":
        return await getCallStatus(body, ACCOUNT_SID, AUTH_TOKEN);
      case "bulk_call":
        return await initiateBulkCalls(body, ACCOUNT_SID, AUTH_TOKEN);
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Voice agent error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Initiate an outbound call
 */
async function initiateCall(
  body: any,
  accountSid: string,
  authToken: string
) {
  const { to, from, customerName, carInterest, campaignId, script } = body;
  const fromNumber = from || "+15755775563";

  if (!to) {
    return new Response(JSON.stringify({ error: "Missing 'to' phone number" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build webhook URL with context
  const webhookParams = new URLSearchParams({
    action: "webhook",
    customerName: customerName || "Sir",
    carInterest: carInterest || "",
    campaignId: campaignId || "",
    script: script || "sales",
  });

  const webhookUrl = `${SUPABASE_URL}/functions/v1/ai-voice-agent?${webhookParams}`;
  const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/ai-voice-agent?action=status`;

  const credentials = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Url: webhookUrl,
        StatusCallback: statusCallbackUrl,
        StatusCallbackEvent: "initiated ringing answered completed",
        MachineDetection: "Enable",
        Record: "true",
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Twilio call error:", JSON.stringify(data));
    throw new Error(data.message || `Failed to initiate call: ${response.status}`);
  }

  return new Response(JSON.stringify({
    success: true,
    callSid: data.sid,
    status: data.status,
    to: data.to,
    from: data.from,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Handle initial call webhook - Greet with AI voice
 */
async function handleCallWebhook(body: any, elevenLabsKey: string | undefined) {
  const customerName = body.customerName || new URL(`http://x?${body}`).searchParams?.get("customerName") || "Sir";
  const carInterest = body.carInterest || "";
  const script = body.script || "sales";

  // Generate greeting based on script type
  let greeting = "";
  switch (script) {
    case "sales":
      greeting = carInterest
        ? `Namaste ${customerName} ji! Main GrabYourCar se bol rahi hoon. Aapne ${carInterest} me interest dikhaya tha. Kya main aapko best deal aur current offers ke baare me bata sakti hoon?`
        : `Namaste ${customerName} ji! Main GrabYourCar se bol rahi hoon. Kya aap nayi car lene ka soch rahe hain? Main aapki help kar sakti hoon best price aur offers dilaane me!`;
      break;
    case "followup":
      greeting = `Namaste ${customerName} ji! Main GrabYourCar se bol rahi hoon. Aapne humse pehle baat ki thi. Kya aapne car ke baare me koi decision liya?`;
      break;
    case "insurance":
      greeting = `Namaste ${customerName} ji! Main GrabYourCar Insurance se bol rahi hoon. Aapki car insurance renewal aa rahi hai. Kya main aapko best quotes share karoon?`;
      break;
    default:
      greeting = `Namaste ${customerName} ji! Main GrabYourCar se bol rahi hoon. Kaise madad kar sakti hoon aapki?`;
  }

  // Generate ElevenLabs audio for greeting
  let audioUrl = "";
  if (elevenLabsKey) {
    try {
      audioUrl = await generateElevenLabsAudio(greeting, elevenLabsKey);
    } catch (e) {
      console.error("ElevenLabs TTS error:", e);
    }
  }

  // Build TwiML response
  const gatherUrl = `${SUPABASE_URL}/functions/v1/ai-voice-agent?action=gather&customerName=${encodeURIComponent(customerName)}&carInterest=${encodeURIComponent(carInterest)}&script=${script}&turn=1`;

  let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>`;

  if (audioUrl) {
    twiml += `
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${gatherUrl}" method="POST" language="hi-IN">
    <Play>${audioUrl}</Play>
  </Gather>`;
  } else {
    twiml += `
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${gatherUrl}" method="POST" language="hi-IN">
    <Say voice="Polly.Aditi" language="hi-IN">${greeting}</Say>
  </Gather>`;
  }

  // Fallback if no speech detected
  twiml += `
  <Say voice="Polly.Aditi" language="hi-IN">Lagta hai aap busy hain. Main baad me call karungi. Dhanyavaad!</Say>
</Response>`;

  return new Response(twiml, {
    headers: { ...corsHeaders, "Content-Type": "application/xml" },
  });
}

/**
 * Handle speech input and generate AI response
 */
async function handleGatherResponse(
  body: any,
  elevenLabsKey: string | undefined,
  lovableKey: string | undefined
) {
  const speechResult = body.SpeechResult || "";
  const customerName = new URL(`http://x?${new URL(body._url || `http://x`).search}`).searchParams?.get("customerName") || 
    body.customerName || "Sir";
  const carInterest = body.carInterest || "";
  const script = body.script || "sales";
  const turn = parseInt(body.turn || "1");

  console.log(`[Voice Agent] Customer said: "${speechResult}" (Turn ${turn})`);

  // Generate AI response using Lovable AI
  let aiResponse = "";
  if (lovableKey && speechResult) {
    try {
      aiResponse = await generateAIResponse(speechResult, customerName, carInterest, script, turn, lovableKey);
    } catch (e) {
      console.error("AI response error:", e);
      aiResponse = getDefaultResponse(speechResult, customerName, carInterest, turn);
    }
  } else {
    aiResponse = getDefaultResponse(speechResult, customerName, carInterest, turn);
  }

  // Generate ElevenLabs audio
  let audioUrl = "";
  if (elevenLabsKey) {
    try {
      audioUrl = await generateElevenLabsAudio(aiResponse, elevenLabsKey);
    } catch (e) {
      console.error("ElevenLabs TTS error:", e);
    }
  }

  // Max 5 turns then graceful end
  const nextTurn = turn + 1;
  const shouldEnd = nextTurn > 5;

  const gatherUrl = `${SUPABASE_URL}/functions/v1/ai-voice-agent?action=gather&customerName=${encodeURIComponent(customerName)}&carInterest=${encodeURIComponent(carInterest)}&script=${script}&turn=${nextTurn}`;

  let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>`;

  if (shouldEnd) {
    // End call gracefully
    const endMessage = `${customerName} ji, bahut accha raha aapse baat karke! Main aapko WhatsApp pe saari details bhej deti hoon. Koi bhi sawaal ho toh call kariyega. Dhanyavaad aur shubh din!`;
    if (audioUrl) {
      twiml += `<Play>${audioUrl}</Play>`;
    } else {
      twiml += `<Say voice="Polly.Aditi" language="hi-IN">${endMessage}</Say>`;
    }
  } else {
    if (audioUrl) {
      twiml += `
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${gatherUrl}" method="POST" language="hi-IN">
    <Play>${audioUrl}</Play>
  </Gather>`;
    } else {
      twiml += `
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${gatherUrl}" method="POST" language="hi-IN">
    <Say voice="Polly.Aditi" language="hi-IN">${aiResponse}</Say>
  </Gather>`;
    }
    twiml += `
  <Say voice="Polly.Aditi" language="hi-IN">${customerName} ji, kya aap sun rahe hain?</Say>`;
  }

  twiml += `
</Response>`;

  return new Response(twiml, {
    headers: { ...corsHeaders, "Content-Type": "application/xml" },
  });
}

/**
 * Generate human-like audio using ElevenLabs
 */
async function generateElevenLabsAudio(text: string, apiKey: string): Promise<string> {
  // Use a natural Indian female voice - Sarah (or customize later)
  const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Sarah - warm, natural

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
          speed: 0.95,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error: ${response.status} - ${err}`);
  }

  const audioBuffer = await response.arrayBuffer();
  
  // Upload to Supabase storage for Twilio to access
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.89.0");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const fileName = `voice-agent/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
  
  const { error: uploadError } = await supabase.storage
    .from("car-assets")
    .upload(fileName, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("car-assets")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Generate intelligent AI response using Lovable AI
 */
async function generateAIResponse(
  customerSpeech: string,
  customerName: string,
  carInterest: string,
  script: string,
  turn: number,
  apiKey: string
): Promise<string> {
  const systemPrompt = `You are Priya, a friendly and professional car sales executive at GrabYourCar, India's trusted car buying platform.

CRITICAL RULES:
- Speak in natural Hinglish (Hindi + English mix) like a real Indian salesperson
- Keep responses SHORT (2-3 sentences max) - this is a phone call, not an essay
- Be warm, friendly, use "ji", "bilkul", "zaroor" naturally
- NEVER sound robotic or scripted
- Focus on: best prices, current offers, test drives, financing options
- If customer shows interest → push for showroom visit or WhatsApp details sharing
- If customer says not interested → politely ask reason and offer alternatives
- If customer asks price → give a range and say exact price on WhatsApp with full breakup
- Handle objections naturally like a real salesperson

Customer name: ${customerName}
Car interest: ${carInterest || "Not specified"}
Script type: ${script}
Conversation turn: ${turn}
Customer's latest response: "${customerSpeech}"

Respond as Priya would on a real phone call. Keep it natural and conversational.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: customerSpeech },
      ],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("AI response error:", response.status, err);
    throw new Error(`AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || getDefaultResponse(customerSpeech, customerName, carInterest, turn);
}

/**
 * Fallback responses when AI is unavailable
 */
function getDefaultResponse(speech: string, name: string, car: string, turn: number): string {
  const lowerSpeech = speech.toLowerCase();

  if (lowerSpeech.includes("price") || lowerSpeech.includes("kitna") || lowerSpeech.includes("keemat")) {
    return `${name} ji, ${car || "is car"} ka on-road price aapke city ke hisaab se hota hai. Main aapko WhatsApp pe complete price breakup bhej deti hoon with current offers. Aapka WhatsApp number yahi hai na?`;
  }

  if (lowerSpeech.includes("nahi") || lowerSpeech.includes("no") || lowerSpeech.includes("interest nahi")) {
    return `Koi baat nahi ${name} ji! Kya main future ke liye aapka number save kar loon? Jab bhi zaroorat ho, hum best deal dilayenge. Dhanyavaad!`;
  }

  if (lowerSpeech.includes("haan") || lowerSpeech.includes("yes") || lowerSpeech.includes("batao")) {
    return `Bahut accha ${name} ji! ${car ? `${car} me abhi` : "Abhi"} amazing offers chal rahe hain - cash discount, exchange bonus, aur low interest financing. Main aapko sab details WhatsApp pe bhej deti hoon. Chalega?`;
  }

  if (lowerSpeech.includes("test drive") || lowerSpeech.includes("dekhna")) {
    return `Bilkul ${name} ji! Test drive bilkul free hai. Aap nearest showroom aa sakte hain ya hum ghar pe bhi demo de sakte hain. Kab convenient hoga aapke liye?`;
  }

  // Generic response based on turn
  if (turn <= 2) {
    return `${name} ji, samajh gayi. Kya main aapko ${car || "car"} ke baare me kuch aur bata sakti hoon? Current offers bahut acche hain!`;
  }

  return `${name} ji, main aapko saari details WhatsApp pe bhej deti hoon with best price. Koi bhi sawaal ho toh call kariyega!`;
}

/**
 * Get call status
 */
async function getCallStatus(body: any, accountSid: string, authToken: string) {
  const { callSid } = body;

  if (callSid) {
    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`,
      {
        headers: { Authorization: `Basic ${credentials}` },
      }
    );
    const data = await response.json();
    return new Response(JSON.stringify({
      callSid: data.sid,
      status: data.status,
      duration: data.duration,
      direction: data.direction,
      startTime: data.start_time,
      endTime: data.end_time,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Twilio status callback webhook
  console.log("[Voice Agent] Call status update:", JSON.stringify(body));
  return new Response("<Response/>", {
    headers: { ...corsHeaders, "Content-Type": "application/xml" },
  });
}

/**
 * Bulk call - initiate calls to multiple numbers
 */
async function initiateBulkCalls(body: any, accountSid: string, authToken: string) {
  const { contacts, from, script, delayMs } = body;

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return new Response(JSON.stringify({ error: "No contacts provided" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = [];
  const delay = delayMs || 3000; // 3 second gap between calls

  for (const contact of contacts) {
    try {
      const callBody = {
        action: "call",
        to: contact.phone,
        from: from || "+15755775563",
        customerName: contact.name || "Sir",
        carInterest: contact.carInterest || "",
        script: script || "sales",
      };

      const res = await initiateCall(callBody, accountSid, authToken);
      const data = await res.json();
      results.push({ phone: contact.phone, ...data });

      // Wait between calls
      if (delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (e) {
      results.push({ phone: contact.phone, error: e.message });
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
