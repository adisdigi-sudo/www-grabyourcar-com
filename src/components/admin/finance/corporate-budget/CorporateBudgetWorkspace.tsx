import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Building2,
  Edit2,
} from "lucide-react";
import { BudgetEditor } from "./BudgetEditor";
import { BudgetDetailDialog } from "./BudgetDetailDialog";
import { CategoryManager } from "./CategoryManager";
import { CFODashboard } from "./CFODashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, FileText } from "lucide-react";
import { fmt, STATUS_META } from "./types";

const CorporateBudgetWorkspace = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["corp-budgets"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("corporate_budgets") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = budgets.filter((b: any) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search && !b.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    pending: budgets.filter((b: any) => b.status === "pending_approval").length,
    approved: budgets.filter((b: any) => ["approved", "active"].includes(b.status)).length,
    totalPlanned: budgets
      .filter((b: any) => ["approved", "active"].includes(b.status))
      .reduce((s: number, b: any) => s + Number(b.total_planned || 0), 0),
    totalActual: budgets
      .filter((b: any) => ["approved", "active"].includes(b.status))
      .reduce((s: number, b: any) => s + Number(b.total_actual || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Corporate Budget Engine</h2>
            <p className="text-sm text-muted-foreground">
              Plan expenses · Auto-track actuals · CFO-style live P&L
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <CategoryManager />
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> New Budget
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cfo" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:inline-grid md:grid-cols-2">
          <TabsTrigger value="cfo" className="gap-2">
            <Activity className="h-4 w-4" /> CFO Dashboard
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <FileText className="h-4 w-4" /> Budget Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cfo" className="mt-5">
          <CFODashboard />
        </TabsContent>

        <TabsContent value="plans" className="mt-5 space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Clock className="h-4 w-4" />
              <p className="text-xs font-medium">Pending Approval</p>
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-xs font-medium">Approved / Active</p>
            </div>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Wallet className="h-4 w-4" />
              <p className="text-xs font-medium">Total Planned</p>
            </div>
            <p className="text-2xl font-bold">{fmt(stats.totalPlanned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs font-medium">Actual Spent</p>
            </div>
            <p className="text-2xl font-bold">{fmt(stats.totalActual)}</p>
            {stats.totalPlanned > 0 && (
              <Progress
                value={Math.min((stats.totalActual / stats.totalPlanned) * 100, 100)}
                className="mt-1.5 h-1"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search budgets…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">No budgets found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first corporate budget to start planning
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b: any) => {
                  const meta = STATUS_META[b.status] || STATUS_META.draft;
                  return (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer"
                      onClick={() => setDetailId(b.id)}
                    >
                      <TableCell>
                        <p className="font-medium">{b.title}</p>
                        {b.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {b.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(b.period_start), "dd MMM")} →{" "}
                        {format(new Date(b.period_end), "dd MMM yy")}
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {b.period_type}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${meta.bg} ${meta.color} border-0`}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fmt(b.total_planned)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {fmt(b.total_actual)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.submitted_by_name || "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(b.status === "draft" || b.status === "rejected") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1"
                            onClick={() => {
                              setEditing(b);
                              setEditorOpen(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <BudgetEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />
      <BudgetDetailDialog budgetId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
};

export default CorporateBudgetWorkspace;
