// Scrape brochure PDF URL for a given car model from OEM/CarDekho pages
// Supports: Kia, Hyundai, Tata, Mahindra, Maruti Suzuki, Toyota, Honda, MG, Skoda,
// Renault, Nissan, Volkswagen, Jeep, Citroen, BYD, VinFast, Volvo, Force, Isuzu,
// BMW, Mercedes-Benz, Audi, Mini, Land Rover, Jaguar, Porsche, Lexus, Tesla
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
  sourceUrls?: string[];
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const slugFlat = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

function buildCardekhoBrochureUrl(brand: string, modelName: string) {
  const b = brand.replace(/\s+/g, '_');
  const m = modelName.replace(/\s+/g, '-');
  return `https://www.cardekho.com/brochures/${b}/${m}`;
}

/** Returns OEM brochure-source URLs by brand. Each brand returns 1-3 candidate pages. */
function buildOemSources(brand: string, modelName: string): string[] {
  const b = brand.toLowerCase().trim();
  const slug = slugify(modelName);
  const flat = slugFlat(modelName);

  if (b === 'kia') return [`https://www.kia.com/in/our-vehicles/${slug}/showroom.html`];

  if (b === 'hyundai')
    return [`https://www.hyundai.com/in/en/find-a-car/${slug}/highlights`];

  if (b === 'tata' || b === 'tata motors') {
    const isEv = /\bev\b/i.test(modelName);
    const baseSlug = slug.replace(/-?ev$/i, '');
    if (isEv)
      return [
        'https://ev.tatamotors.com/support/brochures.html',
        `https://ev.tatamotors.com/${baseSlug}/`,
      ];
    return [
      `https://cars.tatamotors.com/suv/${baseSlug}`,
      `https://cars.tatamotors.com/sedan/${baseSlug}`,
      `https://cars.tatamotors.com/hatchback/${baseSlug}`,
    ];
  }

  if (b === 'mahindra')
    return [
      `https://auto.mahindra.com/suv/${slug}.html`,
      `https://auto.mahindra.com/suv/${slug}/downloads.html`,
      `https://auto.mahindra.com/suv/${slug}/brochure.html`,
      `https://www.mahindraelectricsuv.com/${slug}/`,
    ];

  if (b === 'maruti suzuki' || b === 'maruti' || b === 'suzuki')
    return [
      `https://www.marutisuzuki.com/corporate/media/brochure`,
      `https://www.marutisuzuki.com/${slug}`,
      `https://www.nexaexperience.com/${slug}.html`,
      `https://www.marutisuzukiarena.com/cars/${slug}`,
    ];

  if (b === 'toyota')
    return [
      `https://www.toyotabharat.com/${slug}/`,
      `https://www.toyotabharat.com/showroom/${slug}/`,
      `https://www.toyotabharat.com/brochure/`,
    ];

  if (b === 'honda')
    return [
      `https://www.hondacarindia.com/${slug}`,
      `https://www.hondacarindia.com/Brochures`,
    ];

  if (b === 'mg' || b === 'mg (morris garages)' || b === 'morris garages')
    return [
      `https://www.mgmotor.co.in/vehicles/${slug}`,
      `https://www.mgmotor.co.in/brochures`,
    ];

  if (b === 'skoda')
    return [
      `https://www.skoda-auto.co.in/models/${slug}`,
      `https://www.skoda-auto.co.in/owners/brochures`,
    ];

  if (b === 'volkswagen' || b === 'vw')
    return [
      `https://www.volkswagen.co.in/en/models/${slug}.html`,
      `https://www.volkswagen.co.in/en/owners-and-services/brochures.html`,
    ];

  if (b === 'renault')
    return [
      `https://www.renault.co.in/vehicles/${slug}.html`,
      `https://www.renault.co.in/brochure-download.html`,
    ];

  if (b === 'nissan')
    return [
      `https://www.nissan.in/vehicles/new-vehicles/${slug}.html`,
      `https://www.nissan.in/vehicles/new-vehicles/${slug}/download-brochure.html`,
    ];

  if (b === 'jeep')
    return [
      `https://www.jeep-india.com/${slug}.html`,
      `https://www.jeep-india.com/brochure.html`,
    ];

  if (b === 'citroen')
    return [
      `https://www.citroen.in/range/${slug}.html`,
      `https://www.citroen.in/owners/manuals-brochures.html`,
    ];

  if (b === 'byd')
    return [
      `https://www.bydauto.co.in/${slug}`,
      `https://www.bydauto.co.in/downloads`,
    ];

  if (b === 'vinfast')
    return [
      `https://vinfastauto.in/${slug}`,
      `https://vinfastauto.in/brochure`,
    ];

  if (b === 'volvo')
    return [
      `https://www.volvocars.com/in/cars/${slug.replace(/[^a-z0-9]/g, '-')}/`,
      `https://www.volvocars.com/in/support/manuals/`,
    ];

  if (b === 'force motors' || b === 'force')
    return [
      `https://www.forcemotors.com/${slug}.php`,
      `https://www.forcemotors.com/brochure.php`,
    ];

  if (b === 'isuzu')
    return [
      `https://www.isuzu.in/${slug}/`,
      `https://www.isuzu.in/downloads/`,
    ];

  if (b === 'bmw')
    return [
      `https://www.bmw.in/en/all-models/${flat}.html`,
      `https://www.bmw.in/en/all-models.html`,
    ];

  if (b === 'mercedes-benz' || b === 'mercedes' || b === 'merc')
    return [
      `https://www.mercedes-benz.co.in/passengercars/models/${flat}/overview.html`,
      `https://www.mercedes-benz.co.in/passengercars/services/brochures.html`,
    ];

  if (b === 'audi')
    return [
      `https://www.audi.in/in/web/en/models/${slug}.html`,
      `https://www.audi.in/in/web/en/tools/navigation/audi-brochures.html`,
    ];

  if (b === 'mini')
    return [
      `https://www.mini.in/en_IN/home/range/${slug}.html`,
      `https://www.mini.in/en_IN/home.html`,
    ];

  if (b === 'land rover')
    return [
      `https://www.landrover.in/vehicles/${slug}/index.html`,
      `https://www.landrover.in/owners/manuals-and-guides.html`,
    ];

  if (b === 'jaguar')
    return [
      `https://www.jaguar.in/jaguar-range/${slug}/index.html`,
      `https://www.jaguar.in/owners/manuals-and-guides.html`,
    ];

  if (b === 'porsche')
    return [
      `https://www.porsche.com/india/models/${slug}/`,
      `https://www.porsche.com/india/`,
    ];

  if (b === 'lexus')
    return [
      `https://www.lexusindia.co.in/lexusone/${slug}.html`,
      `https://www.lexusindia.co.in/`,
    ];

  if (b === 'tesla')
    return [`https://www.tesla.com/${slug}`];

  if (b === 'mg' || b === 'mg motor') {
    return [`https://www.mgmotor.co.in/vehicles/${slug}`, 'https://www.mgmotor.co.in/brochures'];
  }

  return [];
}

function extractPdfLinks(text: string): string[] {
  const re = /(https?:\/\/[^\s"')\]]+\.pdf(?:\?[^\s"')\]]*)?)/gi;
  const out = new Set<string>();
  let m;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

function brandDomainHints(brand: string): string[] {
  const b = brand.toLowerCase();
  const map: Record<string, string[]> = {
    kia: ['kia.com'],
    hyundai: ['hyundai.com'],
    tata: ['tatamotors.com'],
    'tata motors': ['tatamotors.com'],
    mahindra: ['mahindra.com', 'mahindraelectricsuv.com'],
    'maruti suzuki': ['marutisuzuki.com', 'nexaexperience.com', 'marutisuzukiarena.com'],
    toyota: ['toyotabharat.com', 'toyota.in'],
    honda: ['hondacarindia.com'],
    mg: ['mgmotor.co.in'],
    'mg (morris garages)': ['mgmotor.co.in'],
    skoda: ['skoda-auto.co.in', 'skoda.co.in'],
    volkswagen: ['volkswagen.co.in'],
    renault: ['renault.co.in'],
    nissan: ['nissan.in'],
    jeep: ['jeep-india.com'],
    citroen: ['citroen.in'],
    byd: ['bydauto.co.in'],
    vinfast: ['vinfastauto.in'],
    volvo: ['volvocars.com'],
    'force motors': ['forcemotors.com'],
    isuzu: ['isuzu.in'],
    bmw: ['bmw.in'],
    'mercedes-benz': ['mercedes-benz.co.in'],
    audi: ['audi.in'],
    mini: ['mini.in'],
    'land rover': ['landrover.in'],
    jaguar: ['jaguar.in'],
    porsche: ['porsche.com'],
    lexus: ['lexusindia.co.in'],
    tesla: ['tesla.com'],
  };
  return map[b] || [];
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

    const oemSources = buildOemSources(body.brand, body.modelName);
    const sources: string[] = body.sourceUrls && body.sourceUrls.length
      ? body.sourceUrls
      : [...oemSources, buildCardekhoBrochureUrl(body.brand, body.modelName)];

    const candidates: { url: string; source: string; score: number }[] = [];
    const modelTokens = body.modelName.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const domainHints = brandDomainHints(body.brand);

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
          if (lower.includes('e-brochure') || lower.includes('ebrochure')) score += 5;
          if (lower.includes('catalog') || lower.includes('catalogue')) score += 3;
          if (lower.includes('spec') || lower.includes('feature')) score += 1;
          for (const t of modelTokens) if (lower.includes(t)) score += 3;
          for (const d of domainHints) if (lower.includes(d)) score += 4;
          if (lower.includes('cardekho')) score += 1;
          candidates.push({ url, source: src, score });
        }
      } catch (e) {
        console.log('source error', src, (e as Error).message);
      }
    }

    const seen = new Set<string>();
    const ranked = candidates
      .sort((a, b) => b.score - a.score)
      .filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));

    const chosen = ranked.find((c) => c.score >= 5) || ranked[0] || null;

    if (!chosen) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No PDF links found on source pages',
        sources,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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
      topCandidates: ranked.slice(0, 3),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
