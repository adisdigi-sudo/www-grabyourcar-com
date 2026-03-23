import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Landmark, Plus, Search, Edit2, Trash2 } from "lucide-react";

const ACCOUNT_TYPES = ["savings", "current", "cash", "credit_card", "fixed_deposit"];
const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const AccountsBankingModule = () => {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => { const { data, error } = await (supabase.from("bank_accounts") as any).select("*").order("created_at"); if (error) throw error; return data; },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => { const p = { ...rec }; if (!editing) delete p.id; const { error } = await (supabase.from("bank_accounts") as any).upsert(p, { onConflict: "id" }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-accounts"] }); toast.success(editing ? "Updated" : "Account added"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("bank_accounts") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-accounts"] }); toast.success("Deleted"); },
  });

  const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bank Balance</p><p className="text-2xl font-bold text-green-600">{fmt(totalBalance)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Bank Accounts</p><p className="text-2xl font-bold">{accounts.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold">{accounts.filter((a: any) => a.is_active).length}</p></CardContent></Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bank & Cash Accounts</h3>
        <Button onClick={() => { setEditing(null); setForm({ account_type: "savings", is_active: true, currency: "INR", current_balance: 0 }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Account</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc: any) => (
          <Card key={acc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Landmark className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="font-semibold">{acc.account_name}</p>
                    <p className="text-xs text-muted-foreground">{acc.bank_name || acc.account_type}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(acc); setForm({ ...acc }); setShowDialog(true); }}><Edit2 className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(acc.id); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Current Balance</span><span className="font-bold text-lg">{fmt(acc.current_balance)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">A/C Number</span><span className="text-sm">{acc.account_number ? `****${acc.account_number.slice(-4)}` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">IFSC</span><span className="text-sm">{acc.ifsc_code || "—"}</span></div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{acc.account_type}</Badge>
                  {acc.is_primary && <Badge className="text-xs">Primary</Badge>}
                  {!acc.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && <Card className="col-span-full"><CardContent className="p-12 text-center text-muted-foreground">No bank accounts added yet</CardContent></Card>}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Account" : "Add Bank Account"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Account Name *</Label><Input value={form.account_name || ""} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} placeholder="e.g. HDFC Current A/C" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bank Name</Label><Input value={form.bank_name || ""} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></div>
              <div><Label>Account Type</Label><Select value={form.account_type || "savings"} onValueChange={v => setForm(p => ({ ...p, account_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Account Number</Label><Input value={form.account_number || ""} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} /></div>
              <div><Label>IFSC Code</Label><Input value={form.ifsc_code || ""} onChange={e => setForm(p => ({ ...p, ifsc_code: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Opening Balance</Label><Input type="number" value={form.opening_balance || ""} onChange={e => setForm(p => ({ ...p, opening_balance: Number(e.target.value) }))} /></div>
              <div><Label>Current Balance</Label><Input type="number" value={form.current_balance || ""} onChange={e => setForm(p => ({ ...p, current_balance: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.account_name}>{editing ? "Update" : "Add Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsBankingModule;
