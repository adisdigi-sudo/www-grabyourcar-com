import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Phone, IndianRupee, Filter, Eye } from "lucide-react";
import { format } from "date-fns";
import { STAGE_LABELS, STAGE_COLORS, LOAN_STAGES, PRIORITY_OPTIONS, type LoanStage } from "./LoanStageConfig";
import { LoanStageChangeModal } from "./LoanStageChangeModal";

export const LoanLeadsList = () => {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showStageModal, setShowStageModal] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['loan-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = applications.filter(app => {
    const matchSearch = !search ||
      app.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.phone?.includes(search) ||
      app.car_model?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || app.stage === stageFilter;
    const matchPriority = priorityFilter === 'all' || app.priority === priorityFilter;
    return matchSearch && matchStage && matchPriority;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, car..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[170px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {LOAN_STAGES.map(s => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITY_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {applications.length} applications
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Car</TableHead>
                <TableHead>Loan Amt</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(app => (
                <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedApp(app); setShowStageModal(true); }}>
                  <TableCell className="font-medium">{app.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">{app.phone}</TableCell>
                  <TableCell>{app.car_model || '—'}</TableCell>
                  <TableCell>
                    {app.loan_amount ? (
                      <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{(Number(app.loan_amount) / 100000).toFixed(1)}L</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${STAGE_COLORS[app.stage as LoanStage] || ''}`}>
                      {STAGE_LABELS[app.stage as LoanStage] || app.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {app.priority ? (
                      <Badge className={`text-[10px] ${PRIORITY_OPTIONS.find(o => o.value === app.priority)?.color || ''}`}>
                        {app.priority}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{app.source || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(app.created_at), 'dd MMM yy')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); setSelectedApp(app); setShowStageModal(true); }}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No applications found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LoanStageChangeModal
        open={showStageModal}
        onOpenChange={setShowStageModal}
        application={selectedApp}
      />
    </div>
  );
};
