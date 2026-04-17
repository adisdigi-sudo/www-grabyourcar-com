import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Search, Send, Sparkles, Star, MessageSquare, Mail } from "lucide-react";

const VERTICALS = [
  { value: "all", label: "All Verticals" },
  { value: "sales", label: "🚗 Sales" },
  { value: "loans", label: "💰 Loans" },
  { value: "insurance", label: "🛡️ Insurance" },
  { value: "hsrp", label: "🪪 HSRP" },
  { value: "rental", label: "🚙 Self-Drive" },
  { value: "cross_sell", label: "🔁 Cross-sell" },
  { value: "general", label: "General" },
];

interface Tpl {
  id: string;
  slug: string;
  vertical: string | null;
  category: string;
  label: string;
  channel: string;
  purpose: string | null;
  body_text: string;
  subject: string | null;
  email_html: string | null;
  variables: string[] | null;
  is_active: boolean;
  is_default_followup: boolean;
  updated_at: string;
}

export function TemplatesHub() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [vertical, setVertical] = useState("all");
  const [channel, setChannel] = useState<"all" | "whatsapp" | "email" | "both">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates-hub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_message_templates")
        .select("*")
        .order("vertical")
        .order("is_default_followup", { ascending: false })
        .order("label");
      if (error) throw error;
      return data as Tpl[];
    },
  });

  const filtered = useMemo(() => {
    return (templates || []).filter((t) => {
      if (vertical !== "all" && t.vertical !== vertical) return false;
      if (channel !== "all" && t.channel !== channel && t.channel !== "both") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.label.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q) && !t.body_text.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [templates, vertical, channel, search]);

  const saveMutation = useMutation({
    mutationFn: async (t: Tpl) => {
      const { error } = await supabase
        .from("crm_message_templates")
        .update({
          label: t.label,
          body_text: t.body_text,
          subject: t.subject,
          email_html: t.email_html,
          channel: t.channel,
          purpose: t.purpose,
          is_active: t.is_active,
          is_default_followup: t.is_default_followup,
        })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates-hub"] });
      setEditing(null);
      toast({ title: "Template saved ✓" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (t: Tpl) => {
      // Clear other defaults in same vertical
      if (t.vertical) {
        await supabase
          .from("crm_message_templates")
          .update({ is_default_followup: false })
          .eq("vertical", t.vertical);
      }
      const { error } = await supabase
        .from("crm_message_templates")
        .update({ is_default_followup: true })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates-hub"] });
      toast({ title: "Default follow-up updated ✓" });
    },
  });

  const sendTest = async (t: Tpl) => {
    try {
      const sampleVars: Record<string, string> = {
        customer_name: "Test User",
        owner_name: "Test User",
        agent_name: "Anshdeep",
        car_model: "Maruti Brezza",
        car_name: "Hyundai Creta",
        vehicle_number: "PB10AB1234",
        registration_number: "PB10AB1234",
        current_insurer: "ICICI Lombard",
        expiry_note: "expires in 7 days",
        order_status: "scheduled",
        pickup_date: "20 Apr 2026",
      };

      // WhatsApp
      if ((t.channel === "whatsapp" || t.channel === "both") && testPhone) {
        let body = t.body_text;
        Object.entries(sampleVars).forEach(([k, v]) => (body = body.replace(new RegExp(`{{${k}}}`, "g"), v)));
        await supabase.functions.invoke("whatsapp-send", {
          body: {
            to: testPhone,
            message: body,
            messageType: "text",
            message_context: "template_test",
            name: "Test",
          },
        });
      }

      // Email
      if ((t.channel === "email" || t.channel === "both") && testEmail) {
        let html = t.email_html || `<pre>${t.body_text}</pre>`;
        let subject = t.subject || t.label;
        Object.entries(sampleVars).forEach(([k, v]) => {
          html = html.replace(new RegExp(`{{${k}}}`, "g"), v);
          subject = subject.replace(new RegExp(`{{${k}}}`, "g"), v);
        });
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "raw-html",
            recipientEmail: testEmail,
            idempotencyKey: `test-${t.id}-${Date.now()}`,
            templateData: { subject, html },
          },
        });
      }
      toast({ title: "Test sent ✓", description: `${testPhone ? "WhatsApp " : ""}${testEmail ? "Email" : ""}` });
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Templates Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralised follow-up & messaging templates across all 11 verticals — auto-sent when scheduled time arrives.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Star className="h-3 w-3" /> Auto-engine runs every 1 minute
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search slug, label or body…" className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={vertical} onValueChange={setVertical}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VERTICALS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Tabs value={channel} onValueChange={(v) => setChannel(v as any)}>
            <TabsList className="h-9">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="whatsapp"><MessageSquare className="h-3.5 w-3.5 mr-1" />WhatsApp</TabsTrigger>
              <TabsTrigger value="email"><Mail className="h-3.5 w-3.5 mr-1" />Email</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 ml-auto">
            <Input placeholder="Test phone (91…)" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="h-9 w-36" />
            <Input placeholder="Test email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="h-9 w-44" />
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Showing <b>{filtered.length}</b> of {templates?.length || 0} templates
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => {
            const isEditing = editing?.id === t.id;
            const cur = isEditing ? editing! : t;
            return (
              <Card key={t.id} className={!t.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <Input value={cur.label} onChange={(e) => setEditing({ ...cur, label: e.target.value })} className="h-8 max-w-xs font-medium" />
                        ) : (
                          <span className="font-semibold text-sm">{t.label}</span>
                        )}
                        <Badge variant="outline" className="text-[10px]">{t.vertical || "—"}</Badge>
                        <Badge variant="outline" className="text-[10px]">{t.channel}</Badge>
                        {t.purpose && <Badge variant="secondary" className="text-[10px]">{t.purpose}</Badge>}
                        {t.is_default_followup && <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30"><Star className="h-3 w-3 mr-1" />Default Follow-up</Badge>}
                        <code className="text-[10px] text-muted-foreground">{t.slug}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={t.is_active} onCheckedChange={(v) => saveMutation.mutate({ ...t, is_active: v })} />
                      {!t.is_default_followup && t.purpose === "follow_up" && (
                        <Button variant="outline" size="sm" onClick={() => setDefaultMutation.mutate(t)}>
                          <Star className="h-3.5 w-3.5 mr-1" /> Set as Default
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => sendTest(t)} disabled={!testPhone && !testEmail}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Test
                      </Button>
                      {isEditing ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => saveMutation.mutate(cur)} disabled={saveMutation.isPending}>
                            <Save className="h-3.5 w-3.5 mr-1" /> Save
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setEditing(t)}>Edit</Button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium flex items-center gap-1 mb-1"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp body</label>
                        <Textarea
                          value={cur.body_text}
                          onChange={(e) => setEditing({ ...cur, body_text: e.target.value })}
                          rows={8}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium flex items-center gap-1 mb-1"><Mail className="h-3.5 w-3.5" /> Email subject</label>
                          <Input value={cur.subject || ""} onChange={(e) => setEditing({ ...cur, subject: e.target.value })} className="h-8 text-xs" />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Email HTML</label>
                          <Textarea
                            value={cur.email_html || ""}
                            onChange={(e) => setEditing({ ...cur, email_html: e.target.value })}
                            rows={6}
                            className="font-mono text-[11px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Select value={cur.channel} onValueChange={(v) => setEditing({ ...cur, channel: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp only</SelectItem>
                              <SelectItem value="email">Email only</SelectItem>
                              <SelectItem value="both">WhatsApp + Email</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input value={cur.purpose || ""} onChange={(e) => setEditing({ ...cur, purpose: e.target.value })} placeholder="purpose (e.g. follow_up)" className="h-8 text-xs" />
                        </div>
                      </div>
                      {(cur.variables?.length || 0) > 0 && (
                        <div className="md:col-span-2 flex flex-wrap gap-1 text-xs text-muted-foreground items-center">
                          <span>Variables:</span>
                          {cur.variables!.map((v) => (
                            <Badge key={v} variant="outline" className="text-[10px] cursor-pointer" onClick={() => setEditing({ ...cur, body_text: cur.body_text + `{{${v}}}` })}>
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed line-clamp-4 bg-muted/40 rounded p-2">
                      {t.body_text}
                    </pre>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">No templates match the filters.</div>}
        </div>
      )}
    </div>
  );
}

export default TemplatesHub;
