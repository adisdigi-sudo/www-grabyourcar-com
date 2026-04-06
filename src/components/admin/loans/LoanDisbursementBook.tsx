import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, BookOpen, User, PhoneCall, MessageCircle, CalendarIcon,
  Send, IndianRupee, Building2, FileText, Eye, Percent, Clock,
  CheckCircle2, Car
} from "lucide-react";
import { toast } from "sonner";
import { LOAN_TYPES } from "./LoanStageConfig";

interface LoanDisbursementBookProps {
  applications: any[];
}

const formatAmount = (amt: number | null) => {
  if (!amt) return "—";
  if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
  if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
  return `₹${(amt / 1000).toFixed(0)}K`;
};

const formatFullAmount = (amt: number | null) => {
  if (!amt) return "—";
  return `₹${Number(amt).toLocaleString("en-IN")}`;
};

export function LoanDisbursementBook({ applications }: LoanDisbursementBookProps) {
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailApp, setDetailApp] = useState<any>(null);

  const disbursed = useMemo(() =>
    applications.filter((a: any) => a.stage === "disbursed"),
    [applications]
  );

  const banks = useMemo(() => {
    const set = new Set(disbursed.map((a: any) => a.lender_name).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [disbursed]);

  const filtered = useMemo(() => {
    let result = disbursed;
    if (bankFilter !== "all") result = result.filter((a: any) => a.lender_name === bankFilter);

    if (dateFrom || dateTo) {
      result = result.filter((a: any) => {
        const d = a.disbursement_date ? new Date(a.disbursement_date) : null;
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter((a: any) =>
        a.customer_name?.toLowerCase().includes(s) ||
        a.phone?.includes(s) ||
        a.car_model?.toLowerCase().includes(s) ||
        a.lender_name?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [disbursed, bankFilter, search, dateFrom, dateTo]);

  const totalDisbursed = filtered.reduce((s: number, a: any) => s + (Number(a.disbursement_amount) || Number(a.loan_amount) || 0), 0);
  const avgEmi = filtered.length > 0
    ? filtered.reduce((s: number, a: any) => s + (Number(a.emi_amount) || 0), 0) / filtered.filter((a: any) => a.emi_amount).length
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{filtered.length}</p><p className="text-[10px] text-muted-foreground">Total Disbursed</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><IndianRupee className="h-4 w-4 text-primary" /></div>
          <div><p className="text-lg font-bold">{formatAmount(totalDisbursed)}</p><p className="text-[10px] text-muted-foreground">Total Value</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center"><Clock className="h-4 w-4 text-violet-600" /></div>
          <div><p className="text-lg font-bold">{avgEmi ? formatFullAmount(Math.round(avgEmi)) : '—'}</p><p className="text-[10px] text-muted-foreground">Avg EMI</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{banks.length}</p><p className="text-[10px] text-muted-foreground">Banks</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, car, bank..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-sm" />
        </div>
        <Select value={bankFilter} onValueChange={setBankFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="All Banks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Banks</SelectItem>
            {banks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 text-xs gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "dd MMM") : "From"} – {dateTo ? format(dateTo, "dd MMM") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 space-y-2">
            <p className="text-xs font-medium">Disbursement Date Range</p>
            <div className="flex gap-3">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">From</p>
                <SmartDatePicker date={dateFrom} onSelect={setDateFrom} placeholder="Start" yearRange={[new Date().getFullYear() - 3, new Date().getFullYear()]} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">To</p>
                <SmartDatePicker date={dateTo} onSelect={setDateTo} placeholder="End" yearRange={[new Date().getFullYear() - 3, new Date().getFullYear()]} />
              </div>
            </div>
            {(dateFrom || dateTo) && <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Clear</Button>}
          </PopoverContent>
        </Popover>

        {selectedIds.size > 0 && (
          <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={() => {
            const sel = filtered.filter((a: any) => selectedIds.has(a.id));
            sel.forEach((a: any, i: number) => {
              const clean = (a.phone || "").replace(/\D/g, "");
              if (clean) {
                setTimeout(() => window.open(`https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}?text=${encodeURIComponent(`Hi ${a.customer_name}, congratulations on your car loan! Let us know if you need any assistance.`)}`, "_blank"), i * 500);
              }
            });
            toast.success(`Opening WhatsApp for ${sel.length} clients`);
          }}><Send className="h-3.5 w-3.5" /> Bulk Send ({selectedIds.size})</Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-8"><input type="checkbox" className="rounded" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={() => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map((a: any) => a.id)))} /></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase w-8">#</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Phone</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Car</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Bank</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Disbursed Amt</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">EMI</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Rate</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Tenure</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Docs</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No disbursed loans found</p>
                  </TableCell></TableRow>
                ) : filtered.map((app: any, idx: number) => {
                  const docCount = [app.sanction_letter_url, app.disbursement_letter_url].filter(Boolean).length;
                  return (
                    <TableRow key={app.id} className="text-xs hover:bg-muted/30 cursor-pointer" onClick={() => setDetailApp(app)}>
                      <TableCell onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded" checked={selectedIds.has(app.id)} onChange={() => { const n = new Set(selectedIds); n.has(app.id) ? n.delete(app.id) : n.add(app.id); setSelectedIds(n); }} /></TableCell>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-white" />
                          </div>
                          <span className="font-semibold text-xs">{app.customer_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{app.phone || "—"}</span>
                          {app.phone && (
                            <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                              <a href={`tel:${app.phone}`}><Button variant="ghost" size="icon" className="h-5 w-5"><PhoneCall className="h-2.5 w-2.5 text-primary" /></Button></a>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                                const clean = app.phone.replace(/\D/g, "");
                                window.open(`https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`, "_blank");
                              }}><MessageCircle className="h-2.5 w-2.5 text-green-600" /></Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{app.car_model || "—"}</TableCell>
                      <TableCell>
                        {app.lender_name ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {app.lender_name}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-emerald-600">{formatAmount(app.disbursement_amount)}</TableCell>
                      <TableCell className="font-semibold text-xs text-primary">{app.emi_amount ? `₹${Math.round(app.emi_amount).toLocaleString("en-IN")}` : "—"}</TableCell>
                      <TableCell className="text-xs">{app.interest_rate ? `${app.interest_rate}%` : "—"}</TableCell>
                      <TableCell className="text-xs">{app.tenure_months ? `${app.tenure_months}m` : "—"}</TableCell>
                      <TableCell className="text-xs">{app.disbursement_date ? format(new Date(app.disbursement_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        {docCount > 0 ? (
                          <Badge variant="outline" className="text-[9px] bg-green-50 text-green-600 border-green-200">{docCount} doc{docCount > 1 ? 's' : ''}</Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setDetailApp(app); }}>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailApp} onOpenChange={() => setDetailApp(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  {detailApp.customer_name}
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">🔒 Disbursed</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Client Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
                    <p className="font-semibold">{detailApp.phone || '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Car</p>
                    <p className="font-semibold flex items-center gap-1"><Car className="h-3 w-3" />{detailApp.car_model || '—'}</p>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Financial Details</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg border bg-emerald-50 dark:bg-emerald-500/5">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Disbursed Amount</p>
                      <p className="font-bold text-emerald-600 text-sm">{formatFullAmount(detailApp.disbursement_amount)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Loan Amount</p>
                      <p className="font-semibold">{formatFullAmount(detailApp.loan_amount)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Sanction Amount</p>
                      <p className="font-semibold">{formatFullAmount(detailApp.sanction_amount)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-primary/5">
                      <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><IndianRupee className="h-2.5 w-2.5" /> Monthly EMI</p>
                      <p className="font-bold text-primary text-sm">{detailApp.emi_amount ? formatFullAmount(Math.round(detailApp.emi_amount)) : '—'}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border">
                      <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Percent className="h-2.5 w-2.5" /> Interest Rate</p>
                      <p className="font-semibold">{detailApp.interest_rate ? `${detailApp.interest_rate}% p.a.` : '—'}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border">
                      <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Tenure</p>
                      <p className="font-semibold">{detailApp.tenure_months ? `${detailApp.tenure_months} months` : '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Bank & Dates */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Bank / Lender</p>
                    <p className="font-semibold flex items-center gap-1"><Building2 className="h-3 w-3" />{detailApp.lender_name || '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Disbursement Date</p>
                    <p className="font-semibold">{detailApp.disbursement_date ? format(new Date(detailApp.disbursement_date), "dd MMM yyyy") : '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Source</p>
                    <p className="font-semibold">{detailApp.source || '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Loan Type</p>
                    <p className="font-semibold">{LOAN_TYPES.find(t => t.value === detailApp.loan_type)?.label || detailApp.loan_type || '—'}</p>
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {detailApp.sanction_letter_url && (
                      <Button variant="outline" size="sm" className="text-[10px] h-8 gap-1.5" onClick={() => window.open(detailApp.sanction_letter_url, '_blank')}>
                        <FileText className="h-3.5 w-3.5 text-indigo-500" /> Sanction / Approval Letter
                      </Button>
                    )}
                    {detailApp.disbursement_letter_url && (
                      <Button variant="outline" size="sm" className="text-[10px] h-8 gap-1.5" onClick={() => window.open(detailApp.disbursement_letter_url, '_blank')}>
                        <FileText className="h-3.5 w-3.5 text-emerald-500" /> Disbursement Proof
                      </Button>
                    )}
                    {!detailApp.sanction_letter_url && !detailApp.disbursement_letter_url && (
                      <p className="text-xs text-muted-foreground">No documents uploaded</p>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                {detailApp.remarks && (
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">Remarks / Offer History</p>
                    <div className="text-xs whitespace-pre-wrap bg-muted/30 rounded p-2 max-h-32 overflow-y-auto">{detailApp.remarks}</div>
                  </div>
                )}

                {detailApp.incentive_eligible && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✅ Incentive Eligible</Badge>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
