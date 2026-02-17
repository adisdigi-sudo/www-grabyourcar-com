import { useState } from "react";
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
import { Plus, Phone, User, IndianRupee, Car, ArrowRight, Calendar } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { LOAN_STAGES, STAGE_LABELS, STAGE_COLORS, LEAD_SOURCES, PRIORITY_OPTIONS, type LoanStage } from "./LoanStageConfig";
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

  // Only show active pipeline stages (exclude converted/lost from kanban — they go to separate views)
  const pipelineStages = LOAN_STAGES.filter(s => s !== 'converted' && s !== 'lost');
  const convertedCount = applications.filter(a => a.stage === 'converted').length;
  const lostCount = applications.filter(a => a.stage === 'lost').length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">12-Stage Pipeline</h2>
          <Badge variant="outline" className="bg-green-500/10 text-green-600">{convertedCount} Converted</Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600">{lostCount} Lost</Badge>
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

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {pipelineStages.map(stage => {
            const stageApps = applications.filter(a => a.stage === stage);
            return (
              <div key={stage} className="w-64 shrink-0">
                <div className={`rounded-lg border p-2.5 mb-2 ${STAGE_COLORS[stage]}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs">{STAGE_LABELS[stage]}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{stageApps.length}</Badge>
                  </div>
                </div>
                <div className="space-y-2 min-h-[150px]">
                  {stageApps.map(app => (
                    <Card
                      key={app.id}
                      className="border-border/50 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleCardClick(app)}
                    >
                      <CardContent className="p-2.5 space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-xs truncate max-w-[130px]">{app.customer_name}</span>
                          </div>
                          {app.priority && (
                            <Badge className={`text-[9px] px-1.5 py-0 ${PRIORITY_OPTIONS.find(o => o.value === app.priority)?.color || ''}`}>
                              {app.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Phone className="h-2.5 w-2.5" />{app.phone}
                        </div>
                        {app.loan_amount && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <IndianRupee className="h-2.5 w-2.5 text-emerald-500" />
                            <span className="font-medium">{formatAmount(app.loan_amount)}</span>
                          </div>
                        )}
                        {app.car_model && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Car className="h-2.5 w-2.5" />{app.car_model}
                          </div>
                        )}
                        {app.follow_up_at && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
                            <Calendar className="h-2.5 w-2.5" />Follow-up: {format(new Date(app.follow_up_at), 'dd MMM')}
                          </div>
                        )}
                        <div className="pt-1">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={e => { e.stopPropagation(); handleCardClick(app); }}>
                            <ArrowRight className="h-3 w-3 mr-1" /> Move Stage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Stage Change Modal */}
      <LoanStageChangeModal
        open={showStageModal}
        onOpenChange={setShowStageModal}
        application={selectedApp}
      />
    </div>
  );
};
