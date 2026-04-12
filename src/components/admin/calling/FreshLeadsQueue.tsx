import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CallDispositionModal } from "./CallDispositionModal";
import {
  Phone, MessageCircle, Search, Inbox, Clock, User,
  MapPin, Car, Filter, ArrowUpRight, Flame, Globe, MessageSquare,
  UserCheck, Users, Zap, CheckSquare
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { LeadAssignmentPanel } from "../shared/LeadAssignmentPanel";
import { Checkbox } from "@/components/ui/checkbox";

const VERTICAL_SERVICE_MAP: Record<string, string[]> = {
  sales: ["car_inquiry", "general", "test_drive"],
  insurance: ["insurance"],
  loans: ["finance", "car_loan"],
  rental: ["rental", "self_drive"],
  hsrp: ["hsrp"],
  accessories: ["accessories"],
  corporate: ["corporate"],
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  website: Globe,
  whatsapp: MessageSquare,
  google_ads: ArrowUpRight,
  meta_ads: ArrowUpRight,
  walk_in: User,
  referral: User,
};

export function FreshLeadsQueue() {
  const { user } = useAuth();
  const { activeVertical, isManagerInVertical } = useVerticalAccess();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    phone: string; name: string; leadId?: string; leadType: string; method: "phone" | "whatsapp";
  } | null>(null);

  const slug = activeVertical?.slug || "sales";
  const serviceCategories = VERTICAL_SERVICE_MAP[slug] || ["general"];

  // Check if user is admin/manager or just employee
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles-queue", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return data?.map(d => d.role) || [];
    },
    enabled: !!user?.id,
  });
  const isAdmin = userRoles.includes("super_admin") || userRoles.includes("admin");
  const canSeeAll = isAdmin || isManagerInVertical;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["fresh-leads", slug, activeVertical?.id, canSeeAll, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, name, customer_name, phone, email, city, source, service_category, priority, status, car_brand, car_model, notes, created_at, vertical_id, lead_type, assigned_to")
        .in("status", ["new", "pending", "fresh", "contacted"])
        .order("created_at", { ascending: false })
        .limit(200);

      if (activeVertical?.id) {
        query = query.eq("vertical_id", activeVertical.id);
      } else {
        query = query.in("service_category", serviceCategories);
      }

      // Employee: only see their assigned leads
      if (!canSeeAll && user?.id) {
        query = query.eq("assigned_to", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterSource !== "all") result = result.filter(l => l.source === filterSource);
    if (filterPriority !== "all") result = result.filter(l => l.priority === filterPriority);
    if (filterAssignee === "unassigned") result = result.filter(l => !l.assigned_to);
    else if (filterAssignee === "mine") result = result.filter(l => l.assigned_to === user?.id);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.name || l.customer_name || "").toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, filterSource, filterPriority, filterAssignee, search, user?.id]);

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) setSelectedLeads([]);
    else setSelectedLeads(filteredLeads.map(l => l.id));
  };

  const handleCall = (phone: string, name: string, method: "phone" | "whatsapp", leadId?: string, leadType?: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    if (method === "phone") {
      window.open(`tel:+${fullPhone}`, "_self");
    } else {
      Promise.all([
        import("@/lib/sendWhatsApp"),
        import("@/lib/crmMessageTemplates"),
      ]).then(async ([{ sendWhatsApp }, { getCrmMessage }]) => {
        const msg = await getCrmMessage("fresh_lead_greeting", { customer_name: name });
        sendWhatsApp({ phone, message: msg, name, logEvent: "fresh_lead_call" });
      });
    }

    setActiveCall({ phone, name, leadId, leadType: leadType || slug, method });
    setTimeout(() => setDispositionOpen(true), 1500);
  };

  const priorityBadge = (p: string | null) => {
    if (p === "hot") return <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">🔥 HOT</Badge>;
    if (p === "high") return <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">⚡ HIGH</Badge>;
    return null;
  };

  const sourceBadge = (source: string | null) => {
    if (!source) return null;
    const SourceIcon = SOURCE_ICONS[source] || Globe;
    const labels: Record<string, string> = {
      website: "Website", whatsapp: "WhatsApp", google_ads: "Google", meta_ads: "Meta",
      walk_in: "Walk-in", referral: "Referral",
    };
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        <SourceIcon className="h-2.5 w-2.5" /> {labels[source] || source}
      </Badge>
    );
  };

  const uniqueSources = useMemo(() => {
    const sources = new Set(leads.map(l => l.source).filter(Boolean));
    return Array.from(sources);
  }, [leads]);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Fresh Leads", value: leads.filter(l => l.status === "new" || l.status === "fresh").length, icon: Inbox, color: "text-blue-600" },
          { label: "Hot Leads", value: leads.filter(l => l.priority === "hot").length, icon: Flame, color: "text-orange-600" },
          { label: "Today's Leads", value: leads.filter(l => {
            const d = new Date(l.created_at);
            return d.toDateString() === new Date().toDateString();
          }).length, icon: Clock, color: "text-emerald-600" },
          { label: "Total Queue", value: filteredLeads.length, icon: Phone, color: "text-primary" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="h-4 w-4" /></div>
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Actions */}
      {canSeeAll && selectedLeads.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Badge>{selectedLeads.length} selected</Badge>
            <Button size="sm" variant="secondary" onClick={() => setShowAssignPanel(!showAssignPanel)}>
              <UserCheck className="h-3 w-3 mr-1" /> Assign Selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedLeads([])}>Clear</Button>
          </CardContent>
        </Card>
      )}

      {showAssignPanel && selectedLeads.length > 0 && (
        <LeadAssignmentPanel
          leadIds={selectedLeads}
          verticalId={activeVertical?.id}
          mode="bulk"
          onAssigned={() => { setSelectedLeads([]); setShowAssignPanel(false); }}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, city..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {uniqueSources.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="hot">🔥 Hot</SelectItem>
            <SelectItem value="high">⚡ High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
        {canSeeAll && (
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="mine">My Leads</SelectItem>
            </SelectContent>
          </Select>
        )}
        {canSeeAll && filteredLeads.length > 0 && (
          <Button size="sm" variant="outline" onClick={toggleSelectAll}>
            <CheckSquare className="h-3 w-3 mr-1" />
            {selectedLeads.length === filteredLeads.length ? "Deselect All" : "Select All"}
          </Button>
        )}
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No Fresh Leads</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {isLoading ? "Loading leads..." : "No new leads in this vertical right now."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="space-y-2">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className={`border-border/50 transition-all hover:shadow-md ${
                lead.priority === "hot" ? "border-l-4 border-l-orange-500" :
                lead.priority === "high" ? "border-l-4 border-l-amber-500" : ""
              }`}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  {canSeeAll && (
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => toggleSelectLead(lead.id)}
                      className="shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold truncate">{lead.name || lead.customer_name || "Unknown"}</span>
                      {priorityBadge(lead.priority)}
                      {sourceBadge(lead.source)}
                      <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{lead.phone}</span>
                      {lead.city && <><span>•</span><span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{lead.city}</span></>}
                      {lead.car_brand && <><span>•</span><span className="flex items-center gap-0.5"><Car className="h-3 w-3" />{lead.car_brand} {lead.car_model || ""}</span></>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      {lead.notes && <span className="ml-2">💬 {lead.notes.slice(0, 60)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      onClick={() => handleCall(lead.phone, lead.name || lead.customer_name || "", "whatsapp", lead.id, lead.lead_type || slug)}>
                      <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                    </Button>
                    <Button size="sm" className="shadow-sm"
                      onClick={() => handleCall(lead.phone, lead.name || lead.customer_name || "", "phone", lead.id, lead.lead_type || slug)}>
                      <Phone className="h-4 w-4 mr-1" /> Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Disposition Modal */}
      {activeCall && (
        <CallDispositionModal
          open={dispositionOpen}
          onClose={() => { setDispositionOpen(false); setActiveCall(null); }}
          leadPhone={activeCall.phone}
          leadName={activeCall.name}
          leadId={activeCall.leadId}
          leadType={activeCall.leadType}
          verticalId={activeVertical?.id}
          callMethod={activeCall.method}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["fresh-leads"] })}
        />
      )}
    </div>
  );
}
