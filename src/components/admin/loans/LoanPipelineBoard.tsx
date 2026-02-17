import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Phone, User, IndianRupee, Car, GripVertical } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
  created_at: string;
  [key: string]: any;
}

interface Props {
  applications: LoanApplication[];
  stages: readonly string[];
  stageLabels: Record<string, string>;
}

const stageColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  contacted: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  documents_collected: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  bank_submitted: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  sanctioned: 'bg-green-500/10 text-green-500 border-green-500/20',
  disbursed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const priorityColors: Record<string, string> = {
  hot: 'bg-red-500/10 text-red-500',
  high: 'bg-orange-500/10 text-orange-500',
  medium: 'bg-blue-500/10 text-blue-500',
  low: 'bg-gray-500/10 text-gray-500',
};

export const LoanPipelineBoard = ({ applications, stages, stageLabels }: Props) => {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newApp, setNewApp] = useState({
    customer_name: '',
    phone: '',
    loan_amount: '',
    car_model: '',
    priority: 'medium',
    remarks: '',
  });

  const createMutation = useMutation({
    mutationFn: async (app: typeof newApp) => {
      const { error } = await supabase.from('loan_applications').insert({
        customer_name: app.customer_name,
        phone: app.phone,
        loan_amount: app.loan_amount ? Number(app.loan_amount) : null,
        car_model: app.car_model || null,
        priority: app.priority,
        remarks: app.remarks || null,
        stage: 'new',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Application created");
      setShowAddDialog(false);
      setNewApp({ customer_name: '', phone: '', loan_amount: '', car_model: '', priority: 'medium', remarks: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const moveStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from('loan_applications')
        .update({ stage, stage_updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      toast.success("Stage updated");
    },
  });

  const formatAmount = (amt: number | null) => {
    if (!amt) return '—';
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    return `₹${(amt / 1000).toFixed(0)}K`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Loan Pipeline</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Application</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Loan Application</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input value={newApp.customer_name} onChange={e => setNewApp(p => ({ ...p, customer_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input value={newApp.phone} onChange={e => setNewApp(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loan Amount</Label>
                  <Input type="number" value={newApp.loan_amount} onChange={e => setNewApp(p => ({ ...p, loan_amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Car Model</Label>
                  <Input value={newApp.car_model} onChange={e => setNewApp(p => ({ ...p, car_model: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newApp.priority} onValueChange={v => setNewApp(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea value={newApp.remarks} onChange={e => setNewApp(p => ({ ...p, remarks: e.target.value }))} />
              </div>
              <Button onClick={() => createMutation.mutate(newApp)} disabled={!newApp.customer_name || !newApp.phone || createMutation.isPending} className="w-full">
                Create Application
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {stages.map(stage => {
            const stageApps = applications.filter(a => a.stage === stage);
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className={`rounded-lg border p-3 mb-3 ${stageColors[stage] || ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{stageLabels[stage]}</span>
                    <Badge variant="secondary" className="text-xs">{stageApps.length}</Badge>
                  </div>
                </div>
                <div className="space-y-3 min-h-[200px]">
                  {stageApps.map(app => (
                    <Card key={app.id} className="border-border/50 hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm truncate max-w-[150px]">{app.customer_name}</span>
                          </div>
                          {app.priority && (
                            <Badge className={`text-[10px] ${priorityColors[app.priority] || ''}`}>
                              {app.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{app.phone}</span>
                        </div>
                        {app.loan_amount && (
                          <div className="flex items-center gap-2 text-xs">
                            <IndianRupee className="h-3 w-3 text-emerald-500" />
                            <span className="font-medium">{formatAmount(app.loan_amount)}</span>
                          </div>
                        )}
                        {app.car_model && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Car className="h-3 w-3" />
                            <span>{app.car_model}</span>
                          </div>
                        )}
                        {/* Stage move buttons */}
                        <div className="flex gap-1 pt-1">
                          {stage !== 'rejected' && stage !== 'disbursed' && (
                            <Select onValueChange={v => moveStageMutation.mutate({ id: app.id, stage: v })}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Move →" />
                              </SelectTrigger>
                              <SelectContent>
                                {stages.filter(s => s !== stage).map(s => (
                                  <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
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
    </div>
  );
};
