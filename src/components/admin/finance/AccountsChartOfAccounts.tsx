import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, Search, Edit2, Trash2, ChevronRight } from "lucide-react";

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
const NORMAL_SIDES = ["debit", "credit"];
const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const AccountsChartOfAccounts = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => { const { data, error } = await supabase.from("chart_of_accounts").select("*").order("account_code"); if (error) throw error; return data; },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) delete payload.id;
      const { error } = await (supabase.from("chart_of_accounts") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chart-of-accounts"] }); toast.success(editing ? "Updated" : "Account created"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chart-of-accounts"] }); toast.success("Deleted"); },
  });

  const filtered = accounts.filter((a: any) => {
    const matchSearch = !search || a.account_name?.toLowerCase().includes(search.toLowerCase()) || a.account_code?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.account_type === typeFilter;
    return matchSearch && matchType;
  });

  const groupedByType = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = filtered.filter((a: any) => a.account_type === type);
    return acc;
  }, {} as Record<string, any[]>);

  const totalByType = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter((a: any) => a.account_type === type).reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {ACCOUNT_TYPES.map(type => (
          <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTypeFilter(type === typeFilter ? "all" : type)}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{type}</p>
              <p className="text-xl font-bold">{fmt(totalByType[type])}</p>
              <p className="text-xs text-muted-foreground">{accounts.filter((a: any) => a.account_type === type).length} accounts</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ account_type: "Asset", normal_side: "debit", is_active: true, opening_balance: 0, current_balance: 0 }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Account</Button>
      </div>

      {typeFilter !== "all" ? (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account Name</TableHead><TableHead>Type</TableHead><TableHead>Normal Side</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.account_code}</TableCell>
                  <TableCell className="font-medium text-sm">{a.account_name}</TableCell>
                  <TableCell><Badge variant="outline">{a.account_type}</Badge></TableCell>
                  <TableCell className="text-sm capitalize">{a.normal_side}</TableCell>
                  <TableCell className="font-medium">{fmt(a.current_balance)}</TableCell>
                  <TableCell><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right"><div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setForm({ ...a }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(a.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No accounts found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {ACCOUNT_TYPES.map(type => (
            groupedByType[type].length > 0 && (
              <Card key={type}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" />{type} Accounts ({groupedByType[type].length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {groupedByType[type].map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs w-24">{a.account_code}</TableCell>
                          <TableCell className="text-sm">{a.account_name}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(a.current_balance)}</TableCell>
                          <TableCell className="w-20 text-right">
                            <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setForm({ ...a }); setShowDialog(true); }}><Edit2 className="h-3 w-3" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Account" : "New Account"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Account Code *</Label><Input value={form.account_code || ""} onChange={e => setForm(p => ({ ...p, account_code: e.target.value }))} placeholder="e.g. 1000" /></div>
              <div><Label>Account Name *</Label><Input value={form.account_name || ""} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.account_type || "Asset"} onValueChange={v => setForm(p => ({ ...p, account_type: v, normal_side: v === "Asset" || v === "Expense" ? "debit" : "credit" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Normal Side</Label><Select value={form.normal_side || "debit"} onValueChange={v => setForm(p => ({ ...p, normal_side: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{NORMAL_SIDES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Opening Balance</Label><Input type="number" value={form.opening_balance || ""} onChange={e => setForm(p => ({ ...p, opening_balance: Number(e.target.value) }))} /></div>
              <div><Label>Current Balance</Label><Input type="number" value={form.current_balance || ""} onChange={e => setForm(p => ({ ...p, current_balance: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.account_code || !form.account_name}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsChartOfAccounts;
