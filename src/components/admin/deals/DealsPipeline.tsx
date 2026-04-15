import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, IndianRupee, TrendingUp, FileText, Users } from "lucide-react";

const fmt = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  closed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  partial: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  received: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export const DealsPipeline = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const currentMonth = format(new Date(), "yyyy-MM");

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: incentiveEntries = [] } = useQuery({
    queryKey: ["deals-incentives", currentMonth],
    queryFn: async () => {
      const { data, error } = await (supabase.from("incentive_entries") as any)
        .select("*")
        .eq("month_year", currentMonth);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("user_id, name");
      if (error) throw error;
      return data;
    },
  });

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    teamMembers.forEach((m: any) => { if (m.user_id) map[m.user_id] = m.name; });
    return map;
  }, [teamMembers]);

  const incentiveMap = useMemo(() => {
    const map: Record<string, number> = {};
    incentiveEntries.forEach((e: any) => {
      if (e.deal_id) map[e.deal_id] = (map[e.deal_id] || 0) + Number(e.incentive_amount || 0);
    });
    return map;
  }, [incentiveEntries]);

  const verticals = useMemo(() => {
    const set = new Set(deals.map((d: any) => d.vertical_name).filter(Boolean));
    return Array.from(set).sort();
  }, [deals]);

  const filtered = useMemo(() => {
    return deals.filter((d: any) => {
      if (statusFilter !== "all" && d.deal_status !== statusFilter) return false;
      if (verticalFilter !== "all" && d.vertical_name !== verticalFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = memberMap[d.assigned_to] || "";
        if (!d.deal_number?.toLowerCase().includes(q) && !d.vertical_name?.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [deals, statusFilter, verticalFilter, search, memberMap]);

  // Stats
  const totalValue = filtered.reduce((s: number, d: any) => s + Number(d.deal_value || 0), 0);
  const totalRevenue = filtered.reduce((s: number, d: any) => s + Number(d.revenue || 0), 0);
  const closedDeals = filtered.filter((d: any) => d.deal_status === "closed").length;
  const activeDeals = filtered.filter((d: any) => d.deal_status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deals Pipeline</h1>
        <p className="text-sm text-muted-foreground">Track all deals across verticals with incentive calculations</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" /> Total Deals</div>
            <p className="text-3xl font-bold mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><IndianRupee className="h-4 w-4" /> Deal Value</div>
            <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" /> Revenue</div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Active / Closed</div>
            <p className="text-2xl font-bold mt-1">{activeDeals} / {closedDeals}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Vertical" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Verticals</SelectItem>
            {verticals.map(v => (
              <SelectItem key={v as string} value={v as string}>{(v as string).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deals Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal #</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Deal Value</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Incentive</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading deals...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No deals found</TableCell></TableRow>
              ) : (
                filtered.slice(0, 100).map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.deal_number || d.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {d.vertical_name?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{memberMap[d.assigned_to] || "Unassigned"}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(d.deal_value || 0)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(d.revenue || 0)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(d.commission_amount || 0)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-green-600">
                      {incentiveMap[d.id] ? fmt(incentiveMap[d.id]) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={PAYMENT_COLORS[d.payment_status] || "bg-muted"}>
                        {d.payment_status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[d.deal_status] || "bg-muted"}>
                        {d.deal_status || "draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.created_at ? format(new Date(d.created_at), "dd MMM yy") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealsPipeline;
