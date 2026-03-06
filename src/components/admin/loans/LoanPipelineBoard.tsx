import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Phone, User, IndianRupee, Car, ArrowRight, Calendar, GripVertical, Flame, MessageCircle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { LOAN_STAGES, STAGE_LABELS, STAGE_COLORS, LEAD_SOURCES, PRIORITY_OPTIONS, ALLOWED_TRANSITIONS, type LoanStage } from "./LoanStageConfig";
import { LoanStageChangeModal } from "./LoanStageChangeModal";

interface LoanApplication {
  id: string;
  customer_name: string;
  phone: string;
  loan_amount: number | null;
  stage: string;
  car_model: string | null;
  priority: string | null;
  assigned_to: string | null;
  sanction_amount: number | null;
  disbursement_amount: number | null;
  source: string | null;
  follow_up_at: string | null;
  created_at: string;
  [key: string]: any;
}

interface Props {
  applications: LoanApplication[];
}

export const LoanPipelineBoard = ({ applications }: Props) => {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingApp, setDraggingApp] = useState<LoanApplication | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ app: LoanApplication; targetStage: LoanStage } | null>(null);
  const [newApp, setNewApp] = useState({
    customer_name: '', phone: '', loan_amount: '',
    car_model: '', priority: 'medium', source: 'Manual', remarks: '',
  });

  const createMutation = useMutation({
    mutationFn: async (app: typeof newApp) => {
      const { error } = await supabase.from('loan_applications').insert({
        customer_name: app.customer_name,
        phone: app.phone.replace(/\D/g, ''),
        loan_amount: app.loan_amount ? Number(app.loan_amount) : null,
        car_model: app.car_model || null,
        priority: app.priority,
        source: app.source,
        lead_source_tag: app.source.toLowerCase().replace(/\s/g, '_'),
        remarks: app.remarks || null,
        stage: 'new_lead',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Application created");
      setShowAddDialog(false);
      setNewApp({ customer_name: '', phone: '', loan_amount: '', car_model: '', priority: 'medium', source: 'Manual', remarks: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const formatAmount = (amt: number | null) => {
    if (!amt) return '—';
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    return `₹${(amt / 1000).toFixed(0)}K`;
  };

  const handleCardClick = (app: LoanApplication) => {
    setSelectedApp(app);
    setShowStageModal(true);
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = useCallback((e: React.DragEvent, app: LoanApplication) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ id: app.id, stage: app.stage }));
    setDraggingApp(app);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingApp(null);
    setDragOverStage(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStage: LoanStage) => {
    e.preventDefault();
    setDragOverStage(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.stage === targetStage) return; // Same stage, no-op

      const app = applications.find(a => a.id === data.id);
      if (!app) return;

      const currentStage = app.stage as LoanStage;
      const allowed = ALLOWED_TRANSITIONS[currentStage] || [];

      if (!allowed.includes(targetStage)) {
        toast.error(`Cannot move from "${STAGE_LABELS[currentStage]}" to "${STAGE_LABELS[targetStage]}"`);
        return;
      }

      // For lost/converted or stages needing docs, open the modal
      if (targetStage === 'lost' || targetStage === 'converted' || targetStage === 'documents_received') {
        setSelectedApp(app);
        setShowStageModal(true);
        return;
      }

      // Direct move for simple transitions
      setPendingDrop({ app, targetStage });
    } catch {
      // Invalid drag data
    }
    setDraggingApp(null);
  }, [applications]);

  // Quick stage move mutation (for simple drag-drop without modal)
  const quickMoveMutation = useMutation({
    mutationFn: async ({ appId, fromStage, toStage }: { appId: string; fromStage: string; toStage: string }) => {
      const { error } = await supabase
        .from('loan_applications')
        .update({
          stage: toStage,
          stage_updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', appId);
      if (error) throw error;

      await supabase.from('loan_stage_history').insert({
        application_id: appId,
        from_stage: fromStage,
        to_stage: toStage,
        remarks: 'Moved via drag & drop',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Stage updated");
      setPendingDrop(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
      setPendingDrop(null);
    },
  });

  // Auto-execute pending drop
  useEffect(() => {
    if (!pendingDrop || quickMoveMutation.isPending) return;
    const { app, targetStage } = pendingDrop;
    quickMoveMutation.mutate({
      appId: app.id,
      fromStage: app.stage,
      toStage: targetStage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDrop]);

  const isDropAllowed = (targetStage: LoanStage) => {
    if (!draggingApp) return false;
    const currentStage = draggingApp.stage as LoanStage;
    if (currentStage === targetStage) return false;
    return (ALLOWED_TRANSITIONS[currentStage] || []).includes(targetStage);
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const msg = `Hi ${name}, this is from GrabYourCar regarding your car loan inquiry. How can I help you today?`;
    window.open(`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const pipelineStages = LOAN_STAGES.filter(s => s !== 'converted' && s !== 'lost');
  const convertedCount = applications.filter(a => a.stage === 'converted').length;
  const lostCount = applications.filter(a => a.stage === 'lost').length;
  const totalValue = applications
    .filter(a => !['converted', 'lost'].includes(a.stage))
    .reduce((s, a) => s + (Number(a.loan_amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">Pipeline</h2>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{convertedCount} Won</Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">{lostCount} Lost</Badge>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <IndianRupee className="h-3 w-3 mr-0.5" />₹{(totalValue / 100000).toFixed(1)}L pipeline
          </Badge>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Application</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Loan Application</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Customer Name *</Label><Input value={newApp.customer_name} onChange={e => setNewApp(p => ({ ...p, customer_name: e.target.value }))} /></div>
                <div><Label>Phone *</Label><Input value={newApp.phone} onChange={e => setNewApp(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit number" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Loan Amount</Label><Input type="number" value={newApp.loan_amount} onChange={e => setNewApp(p => ({ ...p, loan_amount: e.target.value }))} /></div>
                <div><Label>Car Model</Label><Input value={newApp.car_model} onChange={e => setNewApp(p => ({ ...p, car_model: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={newApp.priority} onValueChange={v => setNewApp(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Select value={newApp.source} onValueChange={v => setNewApp(p => ({ ...p, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Remarks</Label><Textarea value={newApp.remarks} onChange={e => setNewApp(p => ({ ...p, remarks: e.target.value }))} /></div>
              <Button onClick={() => createMutation.mutate(newApp)} disabled={!newApp.customer_name || !newApp.phone || createMutation.isPending} className="w-full">
                Create Application
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Drag hint */}
      {draggingApp && (
        <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
          Drop on a valid stage to move <strong>{draggingApp.customer_name}</strong>
        </div>
      )}

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {pipelineStages.map(stage => {
            const stageApps = applications.filter(a => a.stage === stage);
            const stageValue = stageApps.reduce((s, a) => s + (Number(a.loan_amount) || 0), 0);
            const isDragOver = dragOverStage === stage;
            const dropAllowed = isDropAllowed(stage);
            const showDropIndicator = draggingApp && isDragOver;

            return (
              <div
                key={stage}
                className="w-[260px] shrink-0 flex flex-col"
                onDragOver={e => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, stage)}
              >
                {/* Column Header */}
                <div className={`rounded-lg border p-2.5 mb-2 transition-all ${STAGE_COLORS[stage]} ${
                  showDropIndicator && dropAllowed ? 'ring-2 ring-primary scale-[1.02] shadow-lg' : ''
                } ${showDropIndicator && !dropAllowed ? 'ring-2 ring-red-500/50 opacity-60' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs">{STAGE_LABELS[stage]}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{stageApps.length}</Badge>
                  </div>
                  {/* Value bar */}
                  {stageValue > 0 && (
                    <div className="mt-1.5">
                      <div className="h-1 rounded-full bg-current/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-current/40 transition-all"
                          style={{ width: `${Math.min((stageValue / Math.max(totalValue, 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] mt-0.5 opacity-70">₹{(stageValue / 100000).toFixed(1)}L</p>
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className={`space-y-2 min-h-[120px] flex-1 rounded-lg transition-all p-1 ${
                  showDropIndicator && dropAllowed ? 'bg-primary/5 border-2 border-dashed border-primary/30' : ''
                } ${showDropIndicator && !dropAllowed ? 'bg-red-500/5 border-2 border-dashed border-red-500/20' : ''}`}>
                  {stageApps.length === 0 && !showDropIndicator && (
                    <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 py-8">
                      No leads
                    </div>
                  )}
                  {showDropIndicator && dropAllowed && stageApps.length === 0 && (
                    <div className="h-full flex items-center justify-center text-[11px] text-primary/60 py-8 font-medium">
                      Drop here ✓
                    </div>
                  )}
                  {stageApps.map(app => {
                    const isDragging = draggingApp?.id === app.id;
                    return (
                      <Card
                        key={app.id}
                        draggable
                        onDragStart={e => handleDragStart(e, app)}
                        onDragEnd={handleDragEnd}
                        className={`border-border/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
                          isDragging ? 'opacity-30 scale-95 rotate-1' : ''
                        }`}
                        onClick={() => handleCardClick(app)}
                      >
                        <CardContent className="p-2.5 space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 transition-colors" />
                              <span className="font-medium text-xs truncate max-w-[140px]">{app.customer_name}</span>
                            </div>
                            {app.priority && (
                              <Badge className={`text-[9px] px-1.5 py-0 shrink-0 ${PRIORITY_OPTIONS.find(o => o.value === app.priority)?.color || ''}`}>
                                {app.priority === 'hot' ? '🔥' : ''} {app.priority}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" />{app.phone}
                          </div>

                          <div className="flex items-center gap-3">
                            {app.loan_amount && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <IndianRupee className="h-2.5 w-2.5 text-emerald-500" />
                                <span className="font-semibold">{formatAmount(app.loan_amount)}</span>
                              </div>
                            )}
                            {app.car_model && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Car className="h-2.5 w-2.5" />{app.car_model}
                              </div>
                            )}
                          </div>

                          {app.follow_up_at && (
                            <div className={`flex items-center gap-1 text-[10px] ${new Date(app.follow_up_at) <= new Date() ? 'text-red-500 font-medium' : 'text-amber-600'}`}>
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(app.follow_up_at) <= new Date() ? 'Overdue: ' : 'Follow-up: '}
                              {format(new Date(app.follow_up_at), 'dd MMM, h:mm a')}
                            </div>
                          )}

                          {app.source && (
                            <div className="text-[9px] text-muted-foreground/60">
                              via {app.source}
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] flex-1 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                              onClick={e => { e.stopPropagation(); handleWhatsApp(app.phone, app.customer_name); }}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] flex-1"
                              onClick={e => { e.stopPropagation(); handleCardClick(app); }}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" /> Move
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <p className="text-xs text-muted-foreground text-center">
        Drag cards between stages or click to move • {applications.filter(a => !['converted', 'lost'].includes(a.stage)).length} active leads
      </p>

      {/* Stage Change Modal */}
      <LoanStageChangeModal
        open={showStageModal}
        onOpenChange={setShowStageModal}
        application={selectedApp}
      />
    </div>
  );
};
