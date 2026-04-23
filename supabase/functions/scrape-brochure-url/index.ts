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
  sourceUrls?: string[]; // optional override list of pages to scrape
}

function buildCardekhoBrochureUrl(brand: string, modelName: string) {
  const b = brand.replace(/\s+/g, '_');
  const m = modelName.replace(/\s+/g, '-');
  return `https://www.cardekho.com/brochures/${b}/${m}`;
}

function buildKiaIndiaShowroomUrl(modelName: string) {
  const slug = modelName.toLowerCase().replace(/\s+/g, '-');
  return `https://www.kia.com/in/our-vehicles/${slug}/showroom.html`;
}

function buildHyundaiIndiaShowroomUrl(modelName: string) {
  const slug = modelName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `https://www.hyundai.com/in/en/find-a-car/${slug}/highlights`;
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

    if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured');

    // Build list of source pages to scrape: caller override > OEM showroom > CarDekho
    const sources: string[] = body.sourceUrls && body.sourceUrls.length
      ? body.sourceUrls
      : (body.brand.toLowerCase() === 'kia'
          ? [buildKiaIndiaShowroomUrl(body.modelName), buildCardekhoBrochureUrl(body.brand, body.modelName)]
          : [buildCardekhoBrochureUrl(body.brand, body.modelName)]);

    const candidates: { url: string; source: string; score: number }[] = [];
    const modelTokens = body.modelName.toLowerCase().split(/\s+/);

    for (const src of sources) {
      try {
        const fcRes = await fetch(FIRECRAWL_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: src, formats: ['markdown', 'links'], onlyMainContent: false, waitFor: 3000 }),
        });
        if (!fcRes.ok) {
          console.log('firecrawl failed', src, fcRes.status);
          continue;
        }
        const fc = await fcRes.json();
        const data = fc.data || fc;
        const links: string[] = data.links || [];
        const markdown: string = data.markdown || '';
        const all = new Set<string>([
          ...links.filter((l) => /\.pdf(\?|$)/i.test(l)),
          ...extractPdfLinks(markdown),
        ]);
        for (const url of all) {
          const lower = url.toLowerCase();
          let score = 0;
          if (lower.includes('brochure')) score += 5;
          for (const t of modelTokens) if (t.length > 2 && lower.includes(t)) score += 3;
          if (lower.includes('kia.com')) score += 2;
          candidates.push({ url, source: src, score });
        }
      } catch (e) {
        console.log('source error', src, (e as Error).message);
      }
    }

    // Sort by score desc, dedupe
    const seen = new Set<string>();
    const ranked = candidates
      .sort((a, b) => b.score - a.score)
      .filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));

    // Pick highest-scoring brochure-looking PDF (skip sandbox validation – CF blocks edge IPs)
    const chosen = ranked.find((c) => c.score >= 5) || ranked[0] || null;

    if (!chosen) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No PDF links found on source pages',
        sources,
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
