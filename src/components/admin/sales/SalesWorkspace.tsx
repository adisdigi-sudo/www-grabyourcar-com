import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  UserPlus, PhoneCall, Tag, BarChart3, CheckCircle2, Star,
  FileText, Handshake, Plus, FileSpreadsheet, Users,
  TrendingUp, XCircle, Flame,
} from "lucide-react";
import { differenceInHours } from "date-fns";
import { SalesLeadCard } from "./SalesLeadCard";
import { SalesLeadDetailModal } from "./SalesLeadDetailModal";
import { SalesAddLeadModal } from "./SalesAddLeadModal";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner } from "../shared/StageNotificationBanner";

// ─── 8-Stage Pipeline ─────────────────────────────────────
const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", icon: UserPlus, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "contacted", label: "Contacted", icon: PhoneCall, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "requirement_understood", label: "Req. Understood", icon: Tag, color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  { value: "quote_shared", label: "Quote Shared", icon: FileText, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { value: "follow_up", label: "Follow-Up", icon: BarChart3, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  { value: "negotiation", label: "Negotiation", icon: Handshake, color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  { value: "won", label: "Won", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "lost", label: "Lost", icon: XCircle, color: "bg-red-500/10 text-red-600 border-red-500/20" },
];

const STAGE_MAP: Record<string, string> = {
  new_lead: "new_lead", new: "new_lead",
  contacted: "contacted", smart_calling: "contacted",
  requirement_understood: "requirement_understood", interested: "requirement_understood", qualified: "requirement_understood",
  quote_shared: "quote_shared", running_offer: "quote_shared", quoted: "quote_shared", offer_shared: "quote_shared",
  follow_up: "follow_up",
  negotiation: "negotiation", booking: "negotiation", booked: "negotiation",
  won: "won", delivery: "won", delivered: "won", after_sales: "won", converted: "won",
  lost: "lost",
  status: "follow_up",
};

const normalizeStage = (s: string | null, outcome?: string | null): string => {
  if (outcome === "won") return "won";
  if (outcome === "lost") return "lost";
  return STAGE_MAP[s || "new_lead"] || "new_lead";
};

export function SalesWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddLead, setShowAddLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingLead, setDraggingLead] = useState<any>(null);

  // Fetch pipeline data
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["sales-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_pipeline" as any)
        .select("*")
        .eq("is_legacy", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((l: any) => ({
        ...l,
        pipeline_stage: normalizeStage(l.pipeline_stage, l.status_outcome),
      }));
    },
  });

  // Activity log
  const { data: activities = [] } = useQuery({
    queryKey: ["sales-activity", selectedLead?.id],
    enabled: !!selectedLead,
    queryFn: async () => {
      const { data } = await supabase
        .from("sales_activity_log" as any)
        .select("*")
        .eq("pipeline_id", selectedLead.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // KPI calculations
  const totalLeads = leads.length;
  const won = leads.filter((l: any) => l.pipeline_stage === "won").length;
  const lost = leads.filter((l: any) => l.pipeline_stage === "lost").length;
  const active = totalLeads - won - lost;
  const conversion = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : "0";
  const hotLeads = leads.filter(
    (l: any) => l.buying_intent === "Immediate (This Week)" || l.is_hot
  ).length;

  // Notifications
  const notifications = useMemo(() => {
    const items: any[] = [];
    const now = new Date();
    leads.forEach((l: any) => {
      if (l.follow_up_date) {
        const fuDate = new Date(l.follow_up_date);
        const hours = differenceInHours(fuDate, now);
        if (hours <= 24 && hours >= -48) {
          items.push({
            id: `followup-${l.id}`,
            type: hours < 0 ? "overdue" : "followup",
            title: `${l.customer_name || "Lead"} - follow-up ${hours < 0 ? "overdue" : "today"}`,
            subtitle: l.phone,
          });
        }
      }
      if (l.last_activity_at) {
        const hours = differenceInHours(now, new Date(l.last_activity_at));
        if (hours > 48 && !["won", "lost"].includes(l.pipeline_stage)) {
          items.push({
            id: `stale-${l.id}`,
            type: "followup",
            title: `${l.customer_name || "Lead"} - no activity ${Math.floor(hours / 24)}d`,
            subtitle: l.phone,
          });
        }
      }
    });
    return items.sort((a, b) => {
      const p: Record<string, number> = { overdue: 0, urgent: 1, followup: 2 };
      return (p[a.type] || 3) - (p[b.type] || 3);
    });
  }, [leads]);

  // Mutations
  const addLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("sales_pipeline" as any).insert({
        ...data,
        pipeline_stage: "new_lead",
        client_id: `SC-${Date.now().toString(36).toUpperCase()}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-pipeline"] });
      toast.success("Lead added successfully");
      setShowAddLead(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates, logAction, logRemarks }: any) => {
      const { error } = await supabase
        .from("sales_pipeline" as any)
        .update({ ...updates, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (logAction) {
        await supabase.from("sales_activity_log" as any).insert({
          pipeline_id: id,
          action: logAction,
          remarks: logRemarks || null,
          performed_by: user?.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["sales-activity"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Drag & Drop
  const handleDragStart = useCallback((e: React.DragEvent, lead: any) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ id: lead.id, stage: lead.pipeline_stage }));
    setDraggingLead(lead);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingLead(null);
    setDragOverStage(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStage: string) => {
      e.preventDefault();
      setDragOverStage(null);
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        if (data.stage === targetStage) return;
        const lead = leads.find((l: any) => l.id === data.id);
        if (!lead) return;

        // Won/Lost require modal
        if (targetStage === "won" || targetStage === "lost") {
          setSelectedLead({ ...lead, _targetStage: targetStage });
          setShowDetailModal(true);
          return;
        }

        const updates: any = { pipeline_stage: targetStage };
        // Clear outcome if moving back from won/lost
        if (["won", "lost"].includes(data.stage)) {
          updates.status_outcome = null;
        }

        updateLeadMutation.mutate({
          id: data.id,
          updates,
          logAction: "stage_change",
          logRemarks: `Moved from ${data.stage} to ${targetStage}`,
        });
        toast.success(`Moved to ${PIPELINE_STAGES.find((s) => s.value === targetStage)?.label}`);
      } catch {}
      setDraggingLead(null);
    },
    [leads, updateLeadMutation]
  );

  const handleCardClick = (lead: any) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 w-[280px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: totalLeads, icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
          { label: "Active", value: active, icon: TrendingUp, color: "text-cyan-600", bg: "from-cyan-500/10" },
          { label: "Won", value: won, icon: CheckCircle2, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Lost", value: lost, icon: XCircle, color: "text-red-600", bg: "from-red-500/10" },
          { label: "Conversion", value: `${conversion}%`, icon: BarChart3, color: "text-violet-600", bg: "from-violet-500/10" },
          { label: "Hot", value: hotLeads, icon: Flame, color: "text-orange-600", bg: "from-orange-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border overflow-hidden">
            <CardContent className="p-3 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} to-transparent opacity-50`} />
              <div className="relative flex items-center gap-2">
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                <div>
                  <p className="text-lg font-bold leading-none">{kpi.value}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && <StageNotificationBanner items={notifications} />}

      {/* Import Dialog */}
      <LeadImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import Sales Leads"
        templateColumns={["name", "phone", "city", "car_brand", "car_model", "source"]}
        onImport={async (imported) => {
          const rows = imported.map((l) => ({
            customer_name: l.name || l.customer_name || "Unknown",
            phone: (l.phone || l.mobile || "").replace(/\D/g, ""),
            city: l.city || null,
            car_brand: l.car_brand || null,
            car_model: l.car_model || null,
            source: l.source || "CSV Import",
            pipeline_stage: "new_lead",
            client_id: `SC-${Date.now().toString(36).toUpperCase()}`,
          }));
          const { error } = await supabase.from("sales_pipeline" as any).insert(rows);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["sales-pipeline"] });
        }}
      />

      {/* Pipeline Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Sales Pipeline</h2>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            {won} Won
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            {lost} Lost
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import
          </Button>
          <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Drag hint */}
      {draggingLead && (
        <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
          Drop on a stage to move <strong>{draggingLead.customer_name}</strong>
        </div>
      )}

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leads.filter((l: any) => l.pipeline_stage === stage.value);
            const isDragOver = dragOverStage === stage.value;
            const showDrop = draggingLead && isDragOver;
            const Icon = stage.icon;

            return (
              <div
                key={stage.value}
                className="w-[260px] shrink-0 flex flex-col"
                onDragOver={(e) => handleDragOver(e, stage.value)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.value)}
              >
                {/* Column Header */}
                <div
                  className={`rounded-lg border p-2.5 mb-2 transition-all ${stage.color} ${
                    showDrop ? "ring-2 ring-primary scale-[1.02] shadow-lg" : ""
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="font-semibold text-xs">{stage.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {stageLeads.length}
                    </Badge>
                  </div>
                </div>

                {/* Cards */}
                <div
                  className={`space-y-2 min-h-[120px] flex-1 rounded-lg transition-all p-1 ${
                    showDrop ? "bg-primary/5 border-2 border-dashed border-primary/30" : ""
                  }`}
                >
                  {stageLeads.length === 0 && !showDrop && (
                    <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 py-8">
                      No leads
                    </div>
                  )}
                  {showDrop && stageLeads.length === 0 && (
                    <div className="h-full flex items-center justify-center text-[11px] text-primary/60 py-8 font-medium">
                      Drop here
                    </div>
                  )}
                  {stageLeads.map((lead: any) => (
                    <SalesLeadCard
                      key={lead.id}
                      lead={lead}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={handleCardClick}
                      isDragging={draggingLead?.id === lead.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Add Lead Modal */}
      <SalesAddLeadModal
        open={showAddLead}
        onOpenChange={setShowAddLead}
        onSubmit={(d: any) => addLeadMutation.mutate(d)}
        isPending={addLeadMutation.isPending}
      />

      {/* Lead Detail Modal */}
      {selectedLead && (
        <SalesLeadDetailModal
          open={showDetailModal}
          onOpenChange={(v) => {
            setShowDetailModal(v);
            if (!v) setSelectedLead(null);
          }}
          lead={selectedLead}
          activities={activities}
          stages={PIPELINE_STAGES}
          onUpdate={(updates: any, logAction?: string, logRemarks?: string) => {
            updateLeadMutation.mutate({ id: selectedLead.id, updates, logAction, logRemarks });
            setSelectedLead((prev: any) => (prev ? { ...prev, ...updates } : null));
          }}
        />
      )}
    </div>
  );
}
