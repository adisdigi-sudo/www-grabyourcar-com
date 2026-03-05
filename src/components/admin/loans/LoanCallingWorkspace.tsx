import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PhoneCall, MessageCircle, Search, IndianRupee, Car, Clock,
  CheckCircle2, User, Filter, Flame, ArrowUpDown
} from "lucide-react";
import { format, isToday } from "date-fns";
import { STAGE_LABELS, STAGE_COLORS, PRIORITY_OPTIONS, type LoanStage } from "./LoanStageConfig";
import { LoanCallDispositionModal } from "./LoanCallDispositionModal";

interface Props {
  applications: any[];
}

export const LoanCallingWorkspace = ({ applications }: Props) => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDisposition, setShowDisposition] = useState(false);

  // Get today's call stats
  const { data: todayCalls = [] } = useQuery({
    queryKey: ['loan-calls-today'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('call_logs')
        .select('id, disposition, lead_type')
        .eq('lead_type', 'loan')
        .gte('created_at', today.toISOString());
      if (error) throw error;
      return data;
    },
  });

  // Filter callable applications (exclude converted/lost)
  const callableApps = useMemo(() => {
    let filtered = applications.filter(a => !['converted', 'lost'].includes(a.stage));

    if (stageFilter !== "all") filtered = filtered.filter(a => a.stage === stageFilter);
    if (priorityFilter !== "all") filtered = filtered.filter(a => a.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.customer_name?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.car_model?.toLowerCase().includes(q)
      );
    }

    // Sort: hot first, then by follow_up_at, then newest
    return filtered.sort((a, b) => {
      const pOrder: Record<string, number> = { hot: 0, high: 1, medium: 2, low: 3 };
      const pa = pOrder[a.priority || 'medium'] ?? 2;
      const pb = pOrder[b.priority || 'medium'] ?? 2;
      if (pa !== pb) return pa - pb;
      if (a.follow_up_at && !b.follow_up_at) return -1;
      if (!a.follow_up_at && b.follow_up_at) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [applications, stageFilter, priorityFilter, search]);

  const connectedToday = todayCalls.filter(c => c.disposition === 'connected').length;

  const handleDial = (app: any) => {
    setSelectedApp(app);
    setShowDisposition(true);
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const msg = `Hi ${name}, this is from GrabYourCar regarding your car loan inquiry. How can I help you today?`;
    window.open(`https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <PhoneCall className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{todayCalls.length}</p>
              <p className="text-[11px] text-muted-foreground">Calls Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{connectedToday}</p>
              <p className="text-[11px] text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {applications.filter(a => a.follow_up_at && new Date(a.follow_up_at) <= new Date() && !['converted', 'lost'].includes(a.stage)).length}
              </p>
              <p className="text-[11px] text-muted-foreground">Due Follow-ups</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Flame className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{callableApps.filter(a => a.priority === 'hot').length}</p>
              <p className="text-[11px] text-muted-foreground">Hot Leads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, car..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {(['new_lead', 'contacted', 'qualified', 'eligibility_check', 'lender_match', 'offer_shared', 'documents_requested', 'documents_received', 'approval', 'disbursement'] as LoanStage[]).map(s => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITY_OPTIONS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead Cards */}
      <div className="space-y-2">
        {callableApps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <PhoneCall className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No leads to call right now</p>
            </CardContent>
          </Card>
        ) : (
          callableApps.map(app => {
            const isOverdue = app.follow_up_at && new Date(app.follow_up_at) <= new Date();
            return (
              <Card key={app.id} className={`border-border/50 hover:shadow-md transition-shadow ${isOverdue ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-full bg-muted shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{app.customer_name}</span>
                          {app.priority === 'hot' && <Badge className="bg-red-500/10 text-red-500 border-0 text-[10px] px-1.5">🔥 Hot</Badge>}
                          {app.priority === 'high' && <Badge className="bg-orange-500/10 text-orange-500 border-0 text-[10px] px-1.5">High</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span>{app.phone}</span>
                          {app.car_model && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5"><Car className="h-3 w-3" />{app.car_model}</span>
                            </>
                          )}
                          {app.loan_amount && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />₹{(app.loan_amount / 100000).toFixed(1)}L</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${STAGE_COLORS[app.stage as LoanStage] || 'bg-muted text-muted-foreground'} text-[10px] px-1.5`}>
                            {STAGE_LABELS[app.stage as LoanStage] || app.stage}
                          </Badge>
                          {isOverdue && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px] px-1.5">
                              <Clock className="h-2.5 w-2.5 mr-0.5" /> Overdue
                            </Badge>
                          )}
                          {app.follow_up_at && !isOverdue && (
                            <span className="text-[10px] text-muted-foreground">
                              Follow-up: {format(new Date(app.follow_up_at), 'dd MMM, h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-green-600 border-green-500/30 hover:bg-green-500/10"
                        onClick={() => handleWhatsApp(app.phone, app.customer_name)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleDial(app)}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        Dial
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing {callableApps.length} of {applications.filter(a => !['converted', 'lost'].includes(a.stage)).length} active leads
      </p>

      {/* Disposition Modal */}
      {selectedApp && (
        <LoanCallDispositionModal
          open={showDisposition}
          onOpenChange={setShowDisposition}
          application={selectedApp}
        />
      )}
    </div>
  );
};
