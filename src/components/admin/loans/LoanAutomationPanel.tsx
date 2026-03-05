import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Zap, PhoneCall, UserCheck, FileText, CheckCircle2,
  XCircle, CreditCard, Star, MessageCircle
} from "lucide-react";

const LOAN_EVENTS = [
  { event: 'loan_contacted', label: 'Lead Contacted', desc: 'When a loan lead is first contacted', icon: PhoneCall, color: 'text-blue-500' },
  { event: 'loan_qualified', label: 'Lead Qualified', desc: 'When lead passes qualification checks', icon: UserCheck, color: 'text-cyan-500' },
  { event: 'loan_offer_shared', label: 'Offer Shared', desc: 'When bank offers are shared with customer', icon: MessageCircle, color: 'text-purple-500' },
  { event: 'loan_docs_reminder', label: 'Documents Reminder', desc: 'When documents are requested from customer', icon: FileText, color: 'text-orange-500' },
  { event: 'loan_approved', label: 'Loan Approved', desc: 'When loan is approved by the bank', icon: CheckCircle2, color: 'text-green-500' },
  { event: 'loan_rejected', label: 'Loan Rejected', desc: 'When loan application is rejected', icon: XCircle, color: 'text-red-500' },
  { event: 'loan_disbursed', label: 'Loan Disbursed', desc: 'When loan amount is disbursed', icon: CreditCard, color: 'text-emerald-500' },
  { event: 'loan_converted', label: 'Loan Converted', desc: 'When loan is fully converted & client created', icon: Star, color: 'text-amber-500' },
];

export const LoanAutomationPanel = () => {
  const queryClient = useQueryClient();

  const { data: triggers = [], isLoading } = useQuery({
    queryKey: ['loan-wa-triggers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_event_triggers')
        .select('*')
        .in('event_name', LOAN_EVENTS.map(e => e.event));
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ eventName, isActive }: { eventName: string; isActive: boolean }) => {
      const existing = triggers.find(t => t.event_name === eventName);
      if (existing) {
        const { error } = await supabase
          .from('wa_event_triggers')
          .update({ is_active: isActive })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wa_event_triggers')
          .insert({
            event_name: eventName,
            is_active: isActive,
            delay_seconds: 0,
            priority: 1,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-wa-triggers'] });
      toast.success("Trigger updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const activeCount = LOAN_EVENTS.filter(e => triggers.find(t => t.event_name === e.event && t.is_active)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Loan WhatsApp Automations</h3>
            <p className="text-xs text-muted-foreground">Auto-send WhatsApp messages on loan stage changes</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {activeCount}/{LOAN_EVENTS.length} active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {LOAN_EVENTS.map(evt => {
          const trigger = triggers.find(t => t.event_name === evt.event);
          const isActive = trigger?.is_active ?? false;
          const Icon = evt.icon;

          return (
            <Card key={evt.event} className={`border-border/50 transition-all ${isActive ? 'ring-1 ring-primary/20' : 'opacity-75'}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted shrink-0`}>
                  <Icon className={`h-4 w-4 ${evt.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{evt.label}</p>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ eventName: evt.event, isActive: checked })}
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{evt.desc}</p>
                  {trigger && (
                    <Badge variant="secondary" className="mt-1.5 text-[10px]">
                      {isActive ? '🟢 Active' : '⚪ Inactive'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Triggers fire automatically when a loan application moves to the corresponding stage via the calling workspace.
      </p>
    </div>
  );
};
