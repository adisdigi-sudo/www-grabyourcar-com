import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Phone, User, IndianRupee, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";

export const LoanLeadsList = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['car-loan-leads-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('car_loan_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const filtered = leads.filter(lead => {
    const matchSearch = !search || 
      lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      lead.preferred_car?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || lead.lead_priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const priorityColor: Record<string, string> = {
    Hot: 'bg-red-500/10 text-red-500',
    Warm: 'bg-amber-500/10 text-amber-500',
    Cold: 'bg-blue-500/10 text-blue-500',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, car..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="Hot">🔥 Hot</SelectItem>
            <SelectItem value="Warm">Warm</SelectItem>
            <SelectItem value="Cold">Cold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {leads.length} leads
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Preferred Car</TableHead>
                <TableHead>Loan Amount</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Credit Score</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(lead => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name || '—'}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{lead.preferred_car || '—'}</TableCell>
                  <TableCell>
                    {lead.loan_amount_requested 
                      ? `₹${(Number(lead.loan_amount_requested) / 100000).toFixed(1)}L` 
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {lead.monthly_income 
                      ? `₹${(Number(lead.monthly_income) / 1000).toFixed(0)}K` 
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {lead.credit_score ? (
                      <Badge className={lead.credit_score >= 700 ? 'bg-green-500/10 text-green-500' : lead.credit_score >= 600 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}>
                        {lead.credit_score}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {lead.lead_priority ? (
                      <Badge className={priorityColor[lead.lead_priority] || ''}>{lead.lead_priority}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.status || 'new'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(lead.created_at), 'dd MMM yyyy')}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No loan leads found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
