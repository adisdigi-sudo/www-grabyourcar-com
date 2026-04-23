// Scrape brochure PDF URL for a given car model from CarDekho /brochures/ page
// Falls back to direct OEM (Kia.com) URL pattern when CarDekho doesn't expose PDF
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/scrape';

interface Req {
  carId?: string;
  brand: string;
  modelName: string;
  cardekhoBrochureUrl?: string; // optional override
}

function buildCardekhoBrochureUrl(brand: string, modelName: string) {
  const b = brand.replace(/\s+/g, '_');
  const m = modelName.replace(/\s+/g, '-');
  return `https://www.cardekho.com/brochures/${b}/${m}`;
}

// OEM fallback patterns (Kia uses a deterministic dam URL)
function buildKiaOemBrochureUrl(modelName: string) {
  const slug = modelName.toLowerCase().replace(/\s+/g, '-');
  const titleCase = modelName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  return `https://www.kia.com/content/dam/kia2/in/en/our-vehicles/${slug}/${titleCase}_Brochure.pdf`;
}

function extractPdfLinks(text: string): string[] {
  const re = /(https?:\/\/[^\s"')\]]+\.pdf(?:\?[^\s"')\]]*)?)/gi;
  const out = new Set<string>();
  let m;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

async function checkPdf(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
        'Range': 'bytes=0-512',
      },
    });
    if (!res.ok && res.status !== 206) return false;
    const ct = res.headers.get('content-type') || '';
    const buf = new Uint8Array(await res.arrayBuffer());
    const head = new TextDecoder().decode(buf.slice(0, 5));
    return head.startsWith('%PDF') || ct.includes('pdf');
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

  try {
    const body = (await req.json()) as Req;
    if (!body.brand || !body.modelName) {
      return new Response(JSON.stringify({ success: false, error: 'brand and modelName required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cardekhoUrl = body.cardekhoBrochureUrl || buildCardekhoBrochureUrl(body.brand, body.modelName);
    const candidates: { url: string; source: string }[] = [];

    // 1) Firecrawl the CarDekho brochure page
    if (firecrawlKey) {
      try {
        const fcRes = await fetch(FIRECRAWL_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cardekhoUrl,
            formats: ['markdown', 'links'],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });
        if (fcRes.ok) {
          const fc = await fcRes.json();
          const data = fc.data || fc;
          const links: string[] = data.links || [];
          const markdown: string = data.markdown || '';
          const fromLinks = links.filter((l) => /\.pdf(\?|$)/i.test(l));
          const fromMd = extractPdfLinks(markdown);
          [...new Set([...fromLinks, ...fromMd])].forEach((u) =>
            candidates.push({ url: u, source: 'cardekho_firecrawl' })
          );
        } else {
          console.log('firecrawl failed', fcRes.status, await fcRes.text());
        }
      } catch (e) {
        console.log('firecrawl error', (e as Error).message);
      }
    }

    // 2) OEM fallback for Kia
    if (body.brand.toLowerCase() === 'kia') {
      candidates.push({ url: buildKiaOemBrochureUrl(body.modelName), source: 'kia_oem_pattern' });
    }

    // Validate candidates in order, pick first working PDF
    let chosen: { url: string; source: string } | null = null;
    for (const c of candidates) {
      const ok = await checkPdf(c.url);
      if (ok) { chosen = c; break; }
    }

    if (!chosen) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No working brochure PDF found',
        candidates,
        cardekhoUrl,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update car if carId or matching by brand+name
    let carId = body.carId;
    if (!carId) {
      const { data: car } = await supabase
        .from('cars').select('id').eq('brand', body.brand).eq('name', body.modelName).maybeSingle();
      carId = car?.id;
    }

    if (carId) {
      await supabase.from('cars').update({ brochure_url: chosen.url }).eq('id', carId);
    }

    return new Response(JSON.stringify({
      success: true,
      brochureUrl: chosen.url,
      source: chosen.source,
      carId,
      candidatesTried: candidates.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
