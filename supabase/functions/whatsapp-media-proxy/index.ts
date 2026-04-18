// WhatsApp Media Proxy
// Resolves a Meta WhatsApp media ID into a publicly viewable URL.
// Meta returns media URLs that require an Authorization header, so we cannot
// render them directly in <img>/<video>. This function downloads the media
// (using the WHATSAPP_ACCESS_TOKEN), uploads it to the public `wa-media`
// storage bucket (cached by media id), and 302-redirects to the public URL.
//
// Usage:
//   GET  /functions/v1/whatsapp-media-proxy?id=<meta_media_id>
//   GET  /functions/v1/whatsapp-media-proxy?id=<id>&download=1   -> forces download
//   GET  /functions/v1/whatsapp-media-proxy?id=<id>&filename=foo.pdf
//
// If `id` is already an http(s) URL it is returned as-is (302).

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const BUCKET = "wa-media";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function extFromMime(mime: string | null | undefined): string {
  if (!mime) return "bin";
  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("3gpp")) return "3gp";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("amr")) return "amr";
  if (m.includes("aac")) return "aac";
  if (m.includes("pdf")) return "pdf";
  if (m.includes("msword")) return "doc";
  if (m.includes("officedocument.wordprocessingml")) return "docx";
  if (m.includes("ms-excel")) return "xls";
  if (m.includes("officedocument.spreadsheetml")) return "xlsx";
  if (m.includes("plain")) return "txt";
  return "bin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const filenameParam = url.searchParams.get("filename");
    const forceDownload = url.searchParams.get("download") === "1";

    if (!id) {
      return new Response(JSON.stringify({ error: "missing id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Passthrough — if `id` already looks like an http(s) URL, just redirect.
    if (/^https?:\/\//i.test(id)) {
      return Response.redirect(id, 302);
    }

    if (!WHATSAPP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "WHATSAPP_ACCESS_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1 — ask Meta where this media lives + its mime type
    const metaInfoRes = await fetch(`https://graph.facebook.com/v20.0/${id}`, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
    });
    if (!metaInfoRes.ok) {
      const txt = await metaInfoRes.text();
      console.error("Meta media info failed", metaInfoRes.status, txt);
      return new Response(JSON.stringify({ error: "Meta media lookup failed", detail: txt }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const metaInfo = await metaInfoRes.json();
    const mimeType: string = metaInfo?.mime_type || "application/octet-stream";
    const mediaUrl: string = metaInfo?.url;
    if (!mediaUrl) {
      return new Response(JSON.stringify({ error: "Meta returned no URL", metaInfo }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = extFromMime(mimeType);
    const objectPath = `inbound/${id}.${ext}`;

    // Step 2 — check if cached already
    const { data: existing } = await supabase.storage.from(BUCKET).list("inbound", {
      search: `${id}.${ext}`,
      limit: 1,
    });
    let publicUrl = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;

    if (!existing || existing.length === 0) {
      // Step 3 — download media bytes from Meta (auth required)
      const mediaRes = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      });
      if (!mediaRes.ok) {
        const txt = await mediaRes.text();
        console.error("Meta media download failed", mediaRes.status, txt);
        return new Response(JSON.stringify({ error: "Meta media download failed", detail: txt }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const bytes = new Uint8Array(await mediaRes.arrayBuffer());
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
        contentType: mimeType,
        upsert: true,
      });
      if (upErr) {
        console.error("Storage upload failed", upErr);
        return new Response(JSON.stringify({ error: "Storage upload failed", detail: upErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      publicUrl = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    }

    // Step 4 — redirect to the cached public URL
    if (forceDownload && filenameParam) {
      const sep = publicUrl.includes("?") ? "&" : "?";
      publicUrl = `${publicUrl}${sep}download=${encodeURIComponent(filenameParam)}`;
    }
    return Response.redirect(publicUrl, 302);
  } catch (err) {
    console.error("whatsapp-media-proxy error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
