import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Code2, Key, BookOpen, Activity, ArrowRight, Loader2 } from "lucide-react";

interface PartnerPublic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  custom_branding: any;
  branding_enabled: boolean | null;
  is_active: boolean | null;
  allowed_services: string[] | null;
  rate_limit_per_minute: number | null;
  webhook_url: string | null;
  callback_url: string | null;
}

const PartnerLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [partner, setPartner] = useState<PartnerPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("api_partners")
        .select("id, name, slug, description, logo_url, custom_branding, branding_enabled, is_active, allowed_services, rate_limit_per_minute, webhook_url, callback_url")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!cancelled) {
        setPartner(data as PartnerPublic | null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const branding = useMemo(() => {
    const c = (partner?.custom_branding as any) || {};
    return {
      brandColor: c.brand_color || "hsl(var(--primary))",
      tagline: c.tagline || "Powered by GrabYourCar Open API",
    };
  }, [partner]);

  useEffect(() => {
    document.title = partner?.name ? `${partner.name} • API Partner` : "API Partner";
  }, [partner]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!partner) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6">
        <Globe className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Partner not found</h1>
        <p className="text-muted-foreground">No active partner exists at this URL.</p>
        <Button asChild variant="outline"><Link to="/">Back home</Link></Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Branded hero */}
      <header
        className="border-b"
        style={{ background: `linear-gradient(135deg, ${branding.brandColor}11, transparent)` }}
      >
        <div className="container mx-auto px-6 py-12 flex items-center gap-6 flex-wrap">
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt={`${partner.name} logo`}
              className="h-16 w-16 rounded-xl object-contain bg-white p-2 shadow"
              loading="lazy"
            />
          ) : (
            <div
              className="h-16 w-16 rounded-xl flex items-center justify-center font-bold text-2xl text-white"
              style={{ backgroundColor: branding.brandColor }}
            >
              {partner.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{partner.name}</h1>
            <p className="text-muted-foreground mt-1">{branding.tagline}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="gap-1">
                <Activity className="h-3 w-3" /> Live
              </Badge>
              {partner.rate_limit_per_minute ? (
                <Badge variant="outline">{partner.rate_limit_per_minute} req/min</Badge>
              ) : null}
              {(partner.allowed_services || []).slice(0, 4).map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-6 py-10 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4" /> Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pass your <code className="px-1.5 py-0.5 rounded bg-muted">Authorization: Bearer &lt;api-key&gt;</code> header on every request.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 className="h-4 w-4" /> Base URL
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-mono break-all bg-muted p-2 rounded">
            https://api.grabyourcar.com/v1
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" /> Docs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Button variant="outline" size="sm" asChild>
              <a href="/integration-control-center">
                Open API docs <ArrowRight className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {partner.description ? (
        <section className="container mx-auto px-6 pb-10">
          <Card>
            <CardContent className="prose prose-sm max-w-none p-6 whitespace-pre-wrap text-foreground">
              {partner.description}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {partner.name} • Integration partner of GrabYourCar
      </footer>
    </main>
  );
};

export default PartnerLanding;
