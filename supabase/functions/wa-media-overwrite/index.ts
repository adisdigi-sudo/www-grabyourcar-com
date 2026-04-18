// Overwrites a file in the wa-template-media bucket with a fresh upload.
// Used to replace already-uploaded WhatsApp template videos with WhatsApp-safe
// re-encoded versions without changing the public URL (so existing approved
// templates keep working).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ct = req.headers.get("content-type") || "";

    let bucket = "wa-template-media";
    let path = "";
    let contentType = "video/mp4";
    let buf: Uint8Array;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      bucket = (form.get("bucket") as string) || bucket;
      path = (form.get("path") as string) || "";
      const file = form.get("file") as File | null;
      if (!file) throw new Error("file field missing");
      contentType = file.type || contentType;
      buf = new Uint8Array(await file.arrayBuffer());
    } else {
      // JSON body with base64 content (fallback for shell/curl)
      const body = await req.json();
      bucket = body.bucket || bucket;
      path = body.path || "";
      contentType = body.content_type || contentType;
      const b64 = body.base64 || "";
      const binary = atob(b64);
      buf = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    }

    if (!path) throw new Error("path required");

    const { error } = await supabase.storage.from(bucket).upload(path, buf, {
      upsert: true,
      contentType,
      cacheControl: "0",
    });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return new Response(JSON.stringify({ success: true, public_url: data.publicUrl, bytes: buf.byteLength }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
