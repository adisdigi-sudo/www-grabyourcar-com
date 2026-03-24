import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Landmark, Plus, Search, Edit2, Trash2, ArrowUpRight, ArrowDownLeft,
  RefreshCw, CreditCard, Wallet, TrendingUp, TrendingDown, Eye,
  ArrowLeftRight, CheckCircle2, XCircle, Filter
} from "lucide-react";

const ACCOUNT_TYPES = ["savings", "current", "cash", "credit_card", "fixed_deposit"];
const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "NEFT", "RTGS", "IMPS"];
const TRANSACTION_CATEGORIES = [
  "Sales Revenue", "Service Income", "Commission", "Rent", "Salary",
  "Utilities", "Marketing", "Insurance Premium", "Loan EMI", "Tax Payment",
  "Vendor Payment", "Refund", "Interest", "Dividend", "Transfer", "Other"
];

const fmt = (v: number) => `Rs. ${Math.round(v || 0).toLocaleString("en-IN")}`;

export const AccountsBankingModule = () => {
  const qc = useQueryClient();
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [txForm, setTxForm] = useState<Record<string, any>>({});
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [txSearch, setTxSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("bank_accounts") as any).select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["bank-transactions", selectedAccount],
    queryFn: async () => {
      let q = (supabase.from("bank_transactions") as any).select("*").order("transaction_date", { ascending: false }).limit(200);
      if (selectedAccount !== "all") q = q.eq("bank_account_id", selectedAccount);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const upsertAccountMutation = useMutation({
    mutationFn: async (rec: any) => {
      const p = { ...rec };
      if (!editing) delete p.id;
      const { error } = await (supabase.from("bank_accounts") as any).upsert(p, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success(editing ? "Updated" : "Account added");
      setShowAccountDialog(false);
      setEditing(null);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("bank_accounts") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-accounts"] }); toast.success("Deleted"); },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (rec: any) => {
      const { error } = await (supabase.from("bank_transactions") as any).insert(rec);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-transactions"] });
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Transaction recorded");
      setShowTransactionDialog(false);
      setTxForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
  const totalCredits = transactions.filter((t: any) => t.transaction_type === "credit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const totalDebits = transactions.filter((t: any) => t.transaction_type === "debit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const filteredTx = transactions.filter((t: any) =>
    !txSearch || t.description?.toLowerCase().includes(txSearch.toLowerCase()) || t.reference_number?.toLowerCase().includes(txSearch.toLowerCase())
  );

  const getAccountName = (id: string) => accounts.find((a: any) => a.id === id)?.account_name || "—";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Total Balance</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalBalance)}</p>
            <p className="text-[10px] text-emerald-600/70 mt-1">{accounts.length} accounts connected</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Money In</p>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{fmt(totalCredits)}</p>
            <p className="text-[10px] text-blue-600/70 mt-1">{transactions.filter((t: any) => t.transaction_type === "credit").length} credits</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">Money Out</p>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{fmt(totalDebits)}</p>
            <p className="text-[10px] text-red-600/70 mt-1">{transactions.filter((t: any) => t.transaction_type === "debit").length} debits</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Reconciled</p>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{transactions.filter((t: any) => t.is_reconciled).length}</p>
            <p className="text-[10px] text-purple-600/70 mt-1">of {transactions.length} entries</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Bank Accounts</TabsTrigger>
            <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setTxForm({ transaction_date: format(new Date(), "yyyy-MM-dd"), transaction_type: "credit", source: "manual" });
              setShowTransactionDialog(true);
            }} className="gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Record Transaction
            </Button>
            <Button size="sm" onClick={() => {
              setEditing(null);
              setForm({ account_type: "savings", is_active: true, currency: "INR", current_balance: 0 });
              setShowAccountDialog(true);
            }} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Account
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc: any) => (
              <Card key={acc.id} className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                        <Landmark className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{acc.account_name}</p>
                        <p className="text-xs text-muted-foreground">{acc.bank_name || acc.account_type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(acc); setForm({ ...acc }); setShowAccountDialog(true); }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this account?")) deleteAccountMutation.mutate(acc.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Balance</p>
                      <p className={`text-xl font-bold mt-0.5 ${Number(acc.current_balance) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {fmt(acc.current_balance)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">A/C No</span><p className="font-mono font-medium">{acc.account_number ? `****${acc.account_number.slice(-4)}` : "—"}</p></div>
                      <div><span className="text-muted-foreground">IFSC</span><p className="font-mono font-medium">{acc.ifsc_code || "—"}</p></div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] capitalize">{acc.account_type?.replace("_", " ")}</Badge>
                      {acc.is_primary && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Primary</Badge>}
                      {acc.is_active ? (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 mt-1" onClick={() => { setSelectedAccount(acc.id); setActiveTab("transactions"); }}>
                      <Eye className="h-3 w-3" /> View Transactions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {accounts.length === 0 && (
              <Card className="col-span-full border-dashed">
                <CardContent className="p-12 text-center">
                  <Landmark className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">No bank accounts added yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Add your bank accounts to start tracking transactions</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4 space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search transactions..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Account</TableHead>
                    <TableHead className="text-xs font-semibold">Description</TableHead>
                    <TableHead className="text-xs font-semibold">Category</TableHead>
                    <TableHead className="text-xs font-semibold">Reference</TableHead>
                    <TableHead className="text-xs font-semibold">Mode</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Credit</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Debit</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.map((tx: any) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium">{tx.transaction_date ? format(new Date(tx.transaction_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-xs">{getAccountName(tx.bank_account_id)}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{tx.description}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{tx.category || "—"}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{tx.reference_number || "—"}</TableCell>
                      <TableCell className="text-xs">{tx.payment_mode || "—"}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-600">
                        {tx.transaction_type === "credit" ? fmt(tx.amount) : ""}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-red-600">
                        {tx.transaction_type === "debit" ? fmt(tx.amount) : ""}
                      </TableCell>
                      <TableCell className="text-center">
                        {tx.is_reconciled ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTx.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No transactions found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Account" : "Add Bank Account"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Account Name *</Label><Input value={form.account_name || ""} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} placeholder="e.g. HDFC Current A/C" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bank Name</Label><Input value={form.bank_name || ""} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></div>
              <div><Label>Account Type</Label>
                <Select value={form.account_type || "savings"} onValueChange={v => setForm(p => ({ ...p, account_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertAccountMutation.mutate(form)} disabled={!form.account_name}>{editing ? "Update" : "Add Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Bank Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Bank Account *</Label>
              <Select value={txForm.bank_account_id || ""} onValueChange={v => setTxForm(p => ({ ...p, bank_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_name} ({fmt(a.current_balance)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type *</Label>
                <Select value={txForm.transaction_type || "credit"} onValueChange={v => setTxForm(p => ({ ...p, transaction_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Money In (Credit)</SelectItem>
                    <SelectItem value="debit">Money Out (Debit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount *</Label><Input type="number" value={txForm.amount || ""} onChange={e => setTxForm(p => ({ ...p, amount: Number(e.target.value) }))} placeholder="0" /></div>
            </div>
            <div><Label>Description *</Label><Input value={txForm.description || ""} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} placeholder="Payment from client / Vendor payment" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={txForm.transaction_date || ""} onChange={e => setTxForm(p => ({ ...p, transaction_date: e.target.value }))} /></div>
              <div><Label>Category</Label>
                <Select value={txForm.category || ""} onValueChange={v => setTxForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{TRANSACTION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Payment Mode</Label>
                <Select value={txForm.payment_mode || ""} onValueChange={v => setTxForm(p => ({ ...p, payment_mode: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reference #</Label><Input value={txForm.reference_number || ""} onChange={e => setTxForm(p => ({ ...p, reference_number: e.target.value }))} placeholder="UTR / Cheque No" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={txForm.notes || ""} onChange={e => setTxForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>Cancel</Button>
            <Button onClick={() => addTransactionMutation.mutate(txForm)} disabled={!txForm.bank_account_id || !txForm.amount || !txForm.description}>
              Record Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsBankingModule;
