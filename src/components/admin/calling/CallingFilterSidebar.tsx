import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, CheckCircle2, XCircle, CalendarClock, PhoneOff, Clock3, BellOff, ListChecks } from "lucide-react";

export type CallingFilter =
  | "all"
  | "pending"
  | "hot"
  | "interested"
  | "callback"
  | "not_interested"
  | "no_answer"
  | "busy"
  | "wrong_number"
  | "dnd";

interface Counts {
  all: number;
  pending: number;
  hot: number;
  interested: number;
  callback: number;
  not_interested: number;
  no_answer: number;
  busy: number;
  wrong_number: number;
  dnd: number;
}

const ZERO: Counts = {
  all: 0, pending: 0, hot: 0, interested: 0, callback: 0,
  not_interested: 0, no_answer: 0, busy: 0, wrong_number: 0, dnd: 0,
};

const CHIPS: { key: CallingFilter; label: string; icon: any; tone: string }[] = [
  { key: "all", label: "All", icon: ListChecks, tone: "bg-slate-500/15 text-slate-700 hover:bg-slate-500/25" },
  { key: "pending", label: "Pending", icon: Clock3, tone: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25" },
  { key: "hot", label: "🔥 Hot", icon: Flame, tone: "bg-red-500/15 text-red-700 hover:bg-red-500/25" },
  { key: "interested", label: "Interested", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25" },
  { key: "callback", label: "Callback", icon: CalendarClock, tone: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25" },
  { key: "not_interested", label: "Not Int.", icon: XCircle, tone: "bg-rose-500/15 text-rose-700 hover:bg-rose-500/25" },
  { key: "no_answer", label: "No Ans", icon: PhoneOff, tone: "bg-slate-500/15 text-slate-700 hover:bg-slate-500/25" },
  { key: "busy", label: "Busy", icon: Clock3, tone: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25" },
  { key: "wrong_number", label: "Wrong #", icon: XCircle, tone: "bg-zinc-500/15 text-zinc-700 hover:bg-zinc-500/25" },
  { key: "dnd", label: "DND", icon: BellOff, tone: "bg-purple-500/15 text-purple-700 hover:bg-purple-500/25" },
];

interface Props {
  campaignId: string | null;
  verticalSlug: string;
  active: CallingFilter;
  onChange: (k: CallingFilter) => void;
}

export function CallingFilterSidebar({ campaignId, verticalSlug, active, onChange }: Props) {
  const [counts, setCounts] = useState<Counts>(ZERO);

  const load = async () => {
    let q = supabase
      .from("auto_dialer_contacts")
      .select("call_status, status_category, disposition, campaign_id, auto_dialer_campaigns!inner(vertical_slug)", { head: false });
    if (campaignId) q = q.eq("campaign_id", campaignId);
    else q = q.eq("auto_dialer_campaigns.vertical_slug", verticalSlug);
    const { data } = await q.limit(10000);
    const next = { ...ZERO };
    (data || []).forEach((r: any) => {
      next.all++;
      const cat = (r.status_category || r.disposition || (r.call_status === "pending" ? "pending" : "")) as string;
      if (cat in next) (next as any)[cat]++;
      else if (cat === "completed") next.interested++;
    });
    setCounts(next);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`calling-filter-${campaignId || verticalSlug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auto_dialer_contacts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, verticalSlug]);

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map(({ key, label, icon: Icon, tone }) => {
            const v = counts[key];
            const isActive = active === key;
            return (
              <Button
                key={key}
                size="sm"
                variant="ghost"
                className={`h-8 gap-1.5 rounded-full px-3 text-xs ${isActive ? "ring-2 ring-primary " : ""}${tone}`}
                onClick={() => onChange(key)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <Badge variant="outline" className="ml-1 px-1.5 text-[10px]">{v}</Badge>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
