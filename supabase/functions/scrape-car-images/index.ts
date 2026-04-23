// Scrape car images with OEM → CarDekho → CarWale → Google Images fallback
// Usage: POST { brand, modelName, carId? } → inserts into car_images, marks images_synced
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
  maxImages?: number;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

function buildSourceUrls(brand: string, modelName: string): string[] {
  const b = brand.toLowerCase().trim();
  const slug = slugify(modelName);
  const brandSlug = slugify(brand);
  const cdBrand = brand.replace(/\s+/g, '_');
  const cdModel = modelName.replace(/\s+/g, '-');

  const sources: string[] = [];

  // OEM-specific (best quality)
  if (b === 'kia') sources.push(`https://www.kia.com/in/our-vehicles/${slug}/showroom.html`);
  else if (b === 'hyundai') sources.push(`https://www.hyundai.com/in/en/find-a-car/${slug}/highlights`);
  else if (b === 'tata' || b === 'tata motors') {
    const isEv = /\bev\b/i.test(modelName);
    const baseSlug = slug.replace(/-?ev$/i, '');
    if (isEv) sources.push(`https://ev.tatamotors.com/${baseSlug}/`);
    else sources.push(`https://cars.tatamotors.com/suv/${baseSlug}`, `https://cars.tatamotors.com/sedan/${baseSlug}`);
  }
  else if (b === 'mahindra') sources.push(`https://auto.mahindra.com/suv/${slug}.html`);
  else if (b === 'maruti suzuki' || b === 'maruti') sources.push(`https://www.marutisuzuki.com/${slug}`, `https://www.nexaexperience.com/${slug}.html`);
  else if (b === 'toyota') sources.push(`https://www.toyotabharat.com/${slug}/`);
  else if (b === 'honda') sources.push(`https://www.hondacarindia.com/${slug}`);
  else if (b === 'mg' || b.includes('morris')) sources.push(`https://www.mgmotor.co.in/vehicles/${slug}`);
  else if (b === 'skoda') sources.push(`https://www.skoda-auto.co.in/models/${slug}`);
  else if (b === 'volkswagen') sources.push(`https://www.volkswagen.co.in/en/models/${slug}.html`);
  else if (b === 'renault') sources.push(`https://www.renault.co.in/vehicles/${slug}.html`);
  else if (b === 'nissan') sources.push(`https://www.nissan.in/vehicles/new-vehicles/${slug}.html`);
  else if (b === 'jeep') sources.push(`https://www.jeep-india.com/${slug}.html`);
  else if (b === 'citroen') sources.push(`https://www.citroen.in/range/${slug}.html`);
  else if (b === 'byd') sources.push(`https://www.bydauto.co.in/${slug}`);
  else if (b === 'vinfast') sources.push(`https://vinfastauto.in/${slug}`);
  else if (b === 'volvo') sources.push(`https://www.volvocars.com/in/cars/${slug}/`);
  else if (b === 'force motors' || b === 'force') sources.push(`https://www.forcemotors.com/${slug}.php`);
  else if (b === 'isuzu') sources.push(`https://www.isuzu.in/${slug}/`);
  else if (b === 'bmw') sources.push(`https://www.bmw.in/en/all-models/${slug.replace(/-/g, '')}.html`);
  else if (b === 'mercedes-benz' || b === 'mercedes') sources.push(`https://www.mercedes-benz.co.in/passengercars/models/${slug.replace(/-/g, '')}/overview.html`);
  else if (b === 'audi') sources.push(`https://www.audi.in/in/web/en/models/${slug}.html`);
  else if (b === 'mini') sources.push(`https://www.mini.in/en_IN/home/range/${slug}.html`);
  else if (b === 'land rover') sources.push(`https://www.landrover.in/vehicles/${slug}/index.html`);
  else if (b === 'jaguar') sources.push(`https://www.jaguar.in/jaguar-range/${slug}/index.html`);
  else if (b === 'porsche') sources.push(`https://www.porsche.com/india/models/${slug}/`);
  else if (b === 'lexus') sources.push(`https://www.lexusindia.co.in/lexusone/${slug}.html`);
  else if (b === 'tesla') sources.push(`https://www.tesla.com/${slug}`);
  else if (b === 'ferrari') sources.push(`https://www.ferrari.com/en-EN/auto/${slug}`);
  else if (b === 'lamborghini') sources.push(`https://www.lamborghini.com/en-en/models/${slug}`);
  else if (b === 'bentley') sources.push(`https://www.bentleymotors.com/en/models/${slug}.html`);
  else if (b === 'rolls-royce' || b === 'rolls royce') sources.push(`https://www.rolls-roycemotorcars.com/en_GB/showroom/${slug}.html`);
  else if (b === 'aston martin') sources.push(`https://www.astonmartin.com/en/models/${slug}`);
  else if (b === 'maserati') sources.push(`https://www.maserati.com/in/en/models/${slug}`);
  else if (b === 'bugatti') sources.push(`https://www.bugatti.com/models/${slug}/`);
  else if (b === 'polestar') sources.push(`https://www.polestar.com/in/${slug}/`);
  else if (b === 'rivian') sources.push(`https://rivian.com/${slug}`);
  else if (b === 'lucid') sources.push(`https://www.lucidmotors.com/${slug}`);

  // CarDekho fallback (always)
  sources.push(`https://www.cardekho.com/${cdBrand}/${cdModel}/pictures`);
  sources.push(`https://www.cardekho.com/cars/${cdBrand}/${cdModel}.htm`);

  // CarWale fallback
  sources.push(`https://www.carwale.com/${brandSlug}-cars/${slug}/images/`);
  sources.push(`https://www.carwale.com/${brandSlug}-cars/${slug}/`);

  return sources;
}

function buildGoogleImagesUrl(brand: string, modelName: string): string {
  const q = encodeURIComponent(`${brand} ${modelName} car official`);
  return `https://www.google.com/search?q=${q}&tbm=isch&safe=active`;
}

function extractImageUrls(text: string, links: string[]): string[] {
  const urls = new Set<string>();
  // From explicit links
  for (const l of links) {
    if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(l)) urls.add(l);
  }
  // From markdown ![alt](url)
  const mdRe = /!\[[^\]]*\]\((https?:\/\/[^)\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^)\s]*)?)\)/gi;
  let m;
  while ((m = mdRe.exec(text)) !== null) urls.add(m[1]);
  // From <img src="...">
  const imgRe = /<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi;
  while ((m = imgRe.exec(text)) !== null) urls.add(m[1]);
  return [...urls];
}

function scoreImage(url: string, brand: string, modelName: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  const brandTokens = brand.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const modelTokens = modelName.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  for (const t of brandTokens) if (lower.includes(t)) score += 2;
  for (const t of modelTokens) if (lower.includes(t)) score += 4;
  // Penalize tiny / icon images
  if (/icon|logo|favicon|sprite|thumb-50|thumb-100/.test(lower)) score -= 10;
  if (/1280|1920|large|hero|banner|exterior/.test(lower)) score += 3;
  if (/cardekho|carwale/.test(lower)) score += 1;
  // Heavy penalty for clearly junk
  if (/placeholder|blank|spinner|loading/.test(lower)) score -= 20;
  return score;
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

    const maxImages = Math.min(body.maxImages || 6, 12);

    // Resolve carId
    let carId = body.carId;
    if (!carId) {
      const { data: car } = await supabase
        .from('cars').select('id').eq('brand', body.brand).eq('name', body.modelName).maybeSingle();
      carId = car?.id;
    }
    if (!carId) throw new Error(`Car not found: ${body.brand} ${body.modelName}`);

    const sources = [...buildSourceUrls(body.brand, body.modelName), buildGoogleImagesUrl(body.brand, body.modelName)];
    const candidates: { url: string; score: number; source: string }[] = [];

    for (const src of sources) {
      // Stop early if we have plenty of high-score images
      if (candidates.filter(c => c.score >= 6).length >= maxImages * 2) break;
      try {
        const fcRes = await fetch(FIRECRAWL_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: src, formats: ['markdown', 'links'], onlyMainContent: false, waitFor: 2500 }),
        });
        if (!fcRes.ok) { console.log('fc fail', src, fcRes.status); continue; }
        const fc = await fcRes.json();
        const data = fc.data || fc;
        const links: string[] = data.links || [];
        const markdown: string = data.markdown || '';
        const imgs = extractImageUrls(markdown, links);
        for (const url of imgs) {
          candidates.push({ url, score: scoreImage(url, body.brand, body.modelName), source: src });
        }
      } catch (e) {
        console.log('src err', src, (e as Error).message);
      }
    }

    // Dedupe + rank
    const seen = new Set<string>();
    const ranked = candidates
      .sort((a, b) => b.score - a.score)
      .filter(c => (seen.has(c.url) ? false : (seen.add(c.url), true)))
      .filter(c => c.score >= 0)
      .slice(0, maxImages);

    if (ranked.length === 0) {
      return new Response(JSON.stringify({
        success: false, error: 'No images found', sourcesTried: sources.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert into car_images (skip duplicates)
    const { data: existing } = await supabase
      .from('car_images').select('url').eq('car_id', carId);
    const existingUrls = new Set((existing || []).map(r => r.url));

    const toInsert = ranked
      .filter(r => !existingUrls.has(r.url))
      .map((r, i) => ({
        car_id: carId,
        url: r.url,
        is_primary: i === 0 && existingUrls.size === 0,
        sort_order: existingUrls.size + i,
        alt_text: `${body.brand} ${body.modelName}`,
      }));

    if (toInsert.length > 0) {
      await supabase.from('car_images').insert(toInsert);
    }

    await supabase.from('cars')
      .update({ images_synced: true, images_synced_at: new Date().toISOString() })
      .eq('id', carId);

    return new Response(JSON.stringify({
      success: true,
      carId,
      inserted: toInsert.length,
      totalRanked: ranked.length,
      topImages: ranked.slice(0, 3),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
