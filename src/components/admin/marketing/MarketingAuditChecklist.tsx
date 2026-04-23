/**
 * MarketingAuditChecklist — interactive checklist so the founder can quickly
 * confirm what needs cleaning across the public marketing surface.
 *
 * Items cover: tabs, CTAs, lead forms, banners, and filters.
 * State is persisted to localStorage so progress survives page refresh.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ListChecks, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditItem {
  id: string;
  label: string;
  hint?: string;
}

interface AuditSection {
  id: string;
  title: string;
  items: AuditItem[];
}

const SECTIONS: AuditSection[] = [
  {
    id: "tabs",
    title: "Tabs & Navigation",
    items: [
      { id: "tabs-1", label: "Marketing sidebar has only 1 'Marketing Hub' entry (no duplicates)" },
      { id: "tabs-2", label: "WhatsApp/Email/Templates accessible only via Hub tabs (no top-level dupes)" },
      { id: "tabs-3", label: "Legacy modules (Holi Share, Employee Performance) removed from Marketing" },
    ],
  },
  {
    id: "ctas",
    title: "Public CTAs",
    items: [
      { id: "cta-1", label: "Homepage hero has only 1 primary CTA (Get Best Price)" },
      { id: "cta-2", label: "Each public page section has only 1 primary CTA (Call OR WhatsApp OR Form)" },
      { id: "cta-3", label: "All call/WA/form CTAs fire trackConversion() (verifiable in dashboard)" },
      { id: "cta-4", label: "Phone number is consistent across pages (+91 98559 24442)" },
    ],
  },
  {
    id: "forms",
    title: "Lead Forms",
    items: [
      { id: "form-1", label: "Each vertical lead form posts to the correct table (insurance/hsrp/loan/rental/sales)" },
      { id: "form-2", label: "Form submit fires trackConversion('form_submit', ...)" },
      { id: "form-3", label: "Thank-you redirect or success state shown after submit" },
      { id: "form-4", label: "Required fields validated (name, phone, vehicle/RC where applicable)" },
    ],
  },
  {
    id: "banners",
    title: "Promotional Banners",
    items: [
      { id: "banner-1", label: "PromoBanner shows on Home, Insurance, HSRP scoped pages" },
      { id: "banner-2", label: "Banner color theme matches offer type (red=mega, green=insurance, blue=hsrp)" },
      { id: "banner-3", label: "Countdown timer renders correctly and expires automatically" },
      { id: "banner-4", label: "At least one active banner exists in admin → Marketing Hub → Banners" },
    ],
  },
  {
    id: "filters",
    title: "Lead Filters (per vertical)",
    items: [
      { id: "filter-1", label: "Insurance pipeline filters by status (New/Won/Policy Issued)" },
      { id: "filter-2", label: "Insurance pipeline filters by source (Meta/Google/Manual/Rollover)" },
      { id: "filter-3", label: "HSRP / Loans / Self-Drive pipelines filter by status & source" },
      { id: "filter-4", label: "Vehicle category filter present where vehicle data is collected" },
    ],
  },
];

const STORAGE_KEY = "gyc_marketing_audit_v1";

export function MarketingAuditChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
      return next;
    });
  };

  const reset = () => {
    setChecked(new Set());
    persist(new Set());
  };

  const totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  const doneItems = SECTIONS.reduce(
    (sum, s) => sum + s.items.filter((i) => checked.has(i.id)).length,
    0,
  );
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Marketing Vertical Audit</h3>
              <p className="text-xs text-muted-foreground">
                Tick each item as you confirm. Progress is saved locally.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={pct === 100 ? "default" : "secondary"} className="text-sm">
              {doneItems} / {totalItems} ({pct}%)
            </Badge>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((section) => {
          const sectionDone = section.items.filter((i) => checked.has(i.id)).length;
          const sectionPct = Math.round((sectionDone / section.items.length) * 100);
          return (
            <Card key={section.id}>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <Badge variant={sectionPct === 100 ? "default" : "outline"}>
                  {sectionDone}/{section.items.length}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => {
                  const isDone = checked.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 cursor-pointer rounded-md border border-border p-2 hover:bg-muted/50 transition",
                        isDone && "bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={() => toggle(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className={cn("text-sm", isDone && "line-through text-muted-foreground")}>
                          {item.label}
                        </p>
                        {item.hint && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
                        )}
                      </div>
                      {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default MarketingAuditChecklist;
