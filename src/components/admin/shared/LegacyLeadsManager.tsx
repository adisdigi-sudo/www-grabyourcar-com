import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Send, Archive, Users, Phone, Filter } from "lucide-react";
import { LeadForwardDialog } from "./LeadForwardDialog";

interface LegacyLead {
  id: string;
  name: string;
  customer_name: string;
  phone: string;
  email: string | null;
  service_category: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

export function LegacyLeadsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forwardLead, setForwardLead] = useState<LegacyLead | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["legacy-leads", categoryFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .eq("is_legacy", true)
        .order("created_at", { ascending: false })
        .limit(500);

      if (categoryFilter !== "all") query = query.eq("service_category", categoryFilter);
      if (search) query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,name.ilike.%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as LegacyLead[];
    },
  });

  // Legacy insurance clients
  const { data: legacyInsClients = [] } = useQuery({
    queryKey: ["legacy-insurance-clients", search],
    queryFn: async () => {
      let query = supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, lead_source, lead_status, pipeline_stage, created_at")
        .eq("is_legacy", true)
        .order("created_at", { ascending: false })
        .limit(500);

      if (search) query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: verticals = [] } = useQuery({
    queryKey: ["forward-verticals"],
    queryFn: async () => {
      const { data } = await supabase.from("business_verticals").select("id, name, slug").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-100 text-blue-800", hot: "bg-red-100 text-red-800",
      warm: "bg-orange-100 text-orange-800", cold: "bg-gray-100 text-gray-800",
      converted: "bg-green-100 text-green-800", lost: "bg-red-100 text-red-800",
    };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Legacy Leads ({leads.length + legacyInsClients.length})
          </CardTitle>
          <CardDescription>Historical data before fresh start. Assign to team members or forward to verticals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, phone..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="car_inquiry">Car Inquiry</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="finance">Car Loan</SelectItem>
                <SelectItem value="hsrp">HSRP</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* General Leads Table */}
          <div>
            <h3 className="text-sm font-semibold mb-2">General Leads ({leads.length})</h3>
            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox checked={selectedIds.size === leads.length && leads.length > 0} onCheckedChange={selectAll} />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{lead.customer_name || lead.name}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{lead.service_category || "—"}</Badge></TableCell>
                      <TableCell><Badge className={`text-[10px] ${statusColor(lead.status)}`}>{lead.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{lead.source || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(lead.created_at), "dd MMM yy")}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setForwardLead(lead)}>
                          <Send className="h-3 w-3" /> Forward
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {leads.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No legacy leads found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Legacy Insurance Clients */}
          {legacyInsClients.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Legacy Insurance Clients ({legacyInsClients.length})</h3>
              <div className="border rounded-lg overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legacyInsClients.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.customer_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.lead_status || "—"}</Badge></TableCell>
                        <TableCell className="text-xs">{c.pipeline_stage || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd MMM yy")}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => setForwardLead({ id: c.id, name: c.customer_name || "", customer_name: c.customer_name || "", phone: c.phone, email: c.email, service_category: "insurance", status: c.lead_status || "new", source: c.lead_source, created_at: c.created_at })}>
                            <Send className="h-3 w-3" /> Forward
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {forwardLead && (
        <LeadForwardDialog
          open={!!forwardLead}
          onOpenChange={(open) => !open && setForwardLead(null)}
          leadId={forwardLead.id}
          leadTable={forwardLead.service_category === "insurance" ? "insurance_clients" : "leads"}
          leadName={forwardLead.customer_name || forwardLead.name}
          leadPhone={forwardLead.phone}
        />
      )}
    </div>
  );
}
