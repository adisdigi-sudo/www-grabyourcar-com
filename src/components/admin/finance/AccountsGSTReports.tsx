import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") };
});

const AccountsGSTReports = () => {
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [tab, setTab] = useState("gstr1");

  const startDate = format(startOfMonth(new Date(period + "-01")), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(period + "-01")), "yyyy-MM-dd");

  const { data: invoices = [] } = useQuery({
    queryKey: ["gst-invoices", period],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*")
        .gte("invoice_date", startDate).lte("invoice_date", endDate)
        .not("status", "eq", "cancelled");
      return data || [];
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["gst-bills", period],
    queryFn: async () => {
      const { data } = await (supabase.from("bills") as any).select("*")
        .gte("bill_date", startDate).lte("bill_date", endDate)
        .not("status", "eq", "cancelled");
      return data || [];
    },
  });

  const { data: creditNotes = [] } = useQuery({
    queryKey: ["gst-credit-notes", period],
    queryFn: async () => {
      const { data } = await (supabase.from("credit_notes") as any).select("*")
        .gte("date", startDate).lte("date", endDate);
      return data || [];
    },
  });

  // GSTR-1 Data (Sales)
  const b2bInvoices = invoices.filter((i: any) => i.gstin);
  const b2cInvoices = invoices.filter((i: any) => !i.gstin);
  const totalSalesGST = invoices.reduce((s: number, i: any) => s + Number(i.tax_amount || 0), 0);
  const totalSalesValue = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);

  // GSTR-3B Data
  const totalOutputGST = totalSalesGST;
  const totalInputGST = bills.reduce((s: number, b: any) => s + Number(b.tax_amount || 0), 0);
  const netGSTPayable = totalOutputGST - totalInputGST;
  const totalPurchaseValue = bills.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
  const cnAmount = creditNotes.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  const exportJSON = (type: string) => {
    let data: any;
    if (type === "gstr1") {
      data = {
        gstin: "09XXXXX1234Z5XX",
        fp: period.replace("-", ""),
        b2b: b2bInvoices.map((i: any) => ({
          ctin: i.gstin, inv: [{
            inum: i.invoice_number, idt: i.invoice_date,
            val: Number(i.total_amount), pos: "09",
            itms: [{ num: 1, itm_det: { txval: Number(i.subtotal), camt: Number(i.tax_amount) / 2, samt: Number(i.tax_amount) / 2, rt: 18 } }]
          }]
        })),
        b2cs: b2cInvoices.map((i: any) => ({
          pos: "09", typ: "OE", txval: Number(i.subtotal),
          camt: Number(i.tax_amount) / 2, samt: Number(i.tax_amount) / 2, rt: 18
        })),
        cdnr: creditNotes.filter((c: any) => c.invoice_number).map((c: any) => ({
          nt: [{ ntty: "C", nt_num: c.credit_note_number, nt_dt: c.date, val: Number(c.amount), itms: [{ num: 1, itm_det: { txval: Number(c.amount) / 1.18, camt: (Number(c.amount) - Number(c.amount) / 1.18) / 2, samt: (Number(c.amount) - Number(c.amount) / 1.18) / 2, rt: 18 } }] }]
        }))
      };
    } else {
      data = {
        gstin: "09XXXXX1234Z5XX", ret_period: period.replace("-", ""),
        sup_details: { osup_det: { txval: invoices.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0), camt: totalOutputGST / 2, samt: totalOutputGST / 2 } },
        itc_elg: { itc_avl: [{ ty: "IMPG", txval: bills.reduce((s: number, b: any) => s + Number(b.subtotal || 0), 0), camt: totalInputGST / 2, samt: totalInputGST / 2 }] },
        intr_ltfee: { intr_det: { iamt: 0, camt: 0, samt: 0 } },
        tax_pmt: { net_tax: { camt: Math.max(netGSTPayable / 2, 0), samt: Math.max(netGSTPayable / 2, 0) } }
      };
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${type.toUpperCase()}_${period}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${type.toUpperCase()} JSON exported`);
  };

  const exportCSV = (type: string) => {
    let csv = "";
    if (type === "gstr1") {
      csv = "Invoice No,Date,Customer,GSTIN,Taxable Value,CGST,SGST,Total\n";
      invoices.forEach((i: any) => {
        csv += `${i.invoice_number},${i.invoice_date},${i.client_name || ""},${i.gstin || ""},${i.subtotal || 0},${(i.tax_amount || 0) / 2},${(i.tax_amount || 0) / 2},${i.total_amount || 0}\n`;
      });
    } else {
      csv = "Description,Taxable Value,CGST,SGST,Total Tax\n";
      csv += `Outward Supplies,${invoices.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0)},${totalOutputGST / 2},${totalOutputGST / 2},${totalOutputGST}\n`;
      csv += `Input Tax Credit,${bills.reduce((s: number, b: any) => s + Number(b.subtotal || 0), 0)},${totalInputGST / 2},${totalInputGST / 2},${totalInputGST}\n`;
      csv += `Net Payable,,,${netGSTPayable}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${type.toUpperCase()}_${period}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${type.toUpperCase()} CSV exported`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> GST Reports</h2>
          <p className="text-sm text-muted-foreground">GSTR-1 & GSTR-3B ready data for GST portal upload</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-lg font-bold">{fmt(totalSalesValue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Output GST</p><p className="text-lg font-bold text-red-600">{fmt(totalOutputGST)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Purchases</p><p className="text-lg font-bold">{fmt(totalPurchaseValue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Input GST (ITC)</p><p className="text-lg font-bold text-green-600">{fmt(totalInputGST)}</p></CardContent></Card>
        <Card className={netGSTPayable > 0 ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : "border-green-200 bg-green-50/50 dark:bg-green-950/20"}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Net GST Payable</p>
            <p className={`text-lg font-bold ${netGSTPayable > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(Math.abs(netGSTPayable))}</p>
            <Badge variant="outline" className="text-[10px] mt-1">{netGSTPayable > 0 ? "Pay to Govt" : "ITC Excess"}</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="gstr1">GSTR-1 (Sales)</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B (Summary)</TabsTrigger>
          <TabsTrigger value="hsn">HSN Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="gstr1" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => exportJSON("gstr1")} className="gap-1"><Download className="h-3.5 w-3.5" /> JSON (Portal Upload)</Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV("gstr1")} className="gap-1"><Download className="h-3.5 w-3.5" /> CSV</Button>
          </div>

          {/* B2B */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">B2B Invoices (with GSTIN) — {b2bInvoices.length}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Invoice #</TableHead><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Customer</TableHead><TableHead className="text-xs">GSTIN</TableHead><TableHead className="text-xs text-right">Taxable</TableHead><TableHead className="text-xs text-right">CGST</TableHead><TableHead className="text-xs text-right">SGST</TableHead><TableHead className="text-xs text-right">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {b2bInvoices.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                      <TableCell className="text-xs">{i.invoice_date ? format(new Date(i.invoice_date), "dd/MM/yyyy") : ""}</TableCell>
                      <TableCell className="text-xs">{i.client_name}</TableCell>
                      <TableCell className="font-mono text-xs">{i.gstin}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(i.subtotal)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt((i.tax_amount || 0) / 2)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt((i.tax_amount || 0) / 2)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{fmt(i.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                  {b2bInvoices.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-xs">No B2B invoices</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* B2C */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">B2C Invoices (without GSTIN) — {b2cInvoices.length}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Invoice #</TableHead><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Customer</TableHead><TableHead className="text-xs text-right">Taxable</TableHead><TableHead className="text-xs text-right">GST</TableHead><TableHead className="text-xs text-right">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {b2cInvoices.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                      <TableCell className="text-xs">{i.invoice_date ? format(new Date(i.invoice_date), "dd/MM/yyyy") : ""}</TableCell>
                      <TableCell className="text-xs">{i.client_name}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(i.subtotal)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(i.tax_amount)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{fmt(i.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                  {b2cInvoices.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">No B2C invoices</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Credit Notes */}
          {creditNotes.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Credit/Debit Notes — {creditNotes.length}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">CN #</TableHead><TableHead className="text-xs">Customer</TableHead><TableHead className="text-xs">Invoice Ref</TableHead><TableHead className="text-xs text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {creditNotes.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.credit_note_number}</TableCell>
                        <TableCell className="text-xs">{c.customer_name}</TableCell>
                        <TableCell className="text-xs">{c.invoice_number || "—"}</TableCell>
                        <TableCell className="text-xs text-right text-red-600">{fmt(c.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gstr3b" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => exportJSON("gstr3b")} className="gap-1"><Download className="h-3.5 w-3.5" /> JSON</Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV("gstr3b")} className="gap-1"><Download className="h-3.5 w-3.5" /> CSV</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4" /> GSTR-3B Summary — {MONTHS.find(m => m.value === period)?.label}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Description</TableHead><TableHead className="text-right">Taxable Value</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Total Tax</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                    <TableCell className="font-medium">3.1 Outward Supplies (Sales)</TableCell>
                    <TableCell className="text-right">{fmt(invoices.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0))}</TableCell>
                    <TableCell className="text-right">{fmt(totalOutputGST / 2)}</TableCell>
                    <TableCell className="text-right">{fmt(totalOutputGST / 2)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(totalOutputGST)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50/50 dark:bg-green-950/20">
                    <TableCell className="font-medium">4. Input Tax Credit (Purchases)</TableCell>
                    <TableCell className="text-right">{fmt(bills.reduce((s: number, b: any) => s + Number(b.subtotal || 0), 0))}</TableCell>
                    <TableCell className="text-right">{fmt(totalInputGST / 2)}</TableCell>
                    <TableCell className="text-right">{fmt(totalInputGST / 2)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{fmt(totalInputGST)}</TableCell>
                  </TableRow>
                  {cnAmount > 0 && (
                    <TableRow className="bg-orange-50/50 dark:bg-orange-950/20">
                      <TableCell className="font-medium">Credit Notes Adjustment</TableCell>
                      <TableCell className="text-right">{fmt(cnAmount / 1.18)}</TableCell>
                      <TableCell className="text-right">{fmt((cnAmount - cnAmount / 1.18) / 2)}</TableCell>
                      <TableCell className="text-right">{fmt((cnAmount - cnAmount / 1.18) / 2)}</TableCell>
                      <TableCell className="text-right font-bold text-orange-600">-{fmt(cnAmount - cnAmount / 1.18)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow className={netGSTPayable > 0 ? "bg-red-50 dark:bg-red-950/30 font-bold" : "bg-green-50 dark:bg-green-950/30 font-bold"}>
                    <TableCell className="font-bold text-base">6. Net GST Payable</TableCell>
                    <TableCell></TableCell><TableCell className="text-right">{fmt(Math.abs(netGSTPayable) / 2)}</TableCell>
                    <TableCell className="text-right">{fmt(Math.abs(netGSTPayable) / 2)}</TableCell>
                    <TableCell className={`text-right text-lg ${netGSTPayable > 0 ? "text-red-600" : "text-green-600"}`}>{netGSTPayable > 0 ? "" : "(Refund) "}{fmt(Math.abs(netGSTPayable))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hsn" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">HSN/SAC Summary</CardTitle></CardHeader>
            <CardContent>
              {(() => {
                const hsnMap: Record<string, { qty: number; taxable: number; tax: number }> = {};
                invoices.forEach((inv: any) => {
                  const items = Array.isArray(inv.items) ? inv.items : [];
                  items.forEach((item: any) => {
                    const hsn = item.hsn || item.hsn_code || "N/A";
                    if (!hsnMap[hsn]) hsnMap[hsn] = { qty: 0, taxable: 0, tax: 0 };
                    hsnMap[hsn].qty += Number(item.quantity || 1);
                    const amt = Number(item.amount || item.quantity * item.rate || 0);
                    hsnMap[hsn].taxable += amt;
                    hsnMap[hsn].tax += Math.round(amt * 0.18);
                  });
                });
                const entries = Object.entries(hsnMap);
                return (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>HSN/SAC</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Taxable Value</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Total Tax</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {entries.map(([hsn, d]) => (
                        <TableRow key={hsn}>
                          <TableCell className="font-mono">{hsn}</TableCell>
                          <TableCell className="text-right">{d.qty}</TableCell>
                          <TableCell className="text-right">{fmt(d.taxable)}</TableCell>
                          <TableCell className="text-right">{fmt(d.tax / 2)}</TableCell>
                          <TableCell className="text-right">{fmt(d.tax / 2)}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(d.tax)}</TableCell>
                        </TableRow>
                      ))}
                      {entries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No HSN data — add HSN codes to invoice items</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountsGSTReports;
