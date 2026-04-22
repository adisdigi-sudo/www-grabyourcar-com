import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, FileSpreadsheet, FileDown, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildFounderCSV, getFounderSnapshotPrintableHTML, downloadFounderCSV,
  buildFounderSnapshotWithConfig,
  type FounderSnapshotInput, type ExportColumnConfig,
} from "../shared/founderReportPDF";

const POL_COLS = [
  { k: "ref", label: "Reference" }, { k: "customer", label: "Customer" }, { k: "type", label: "Type" },
  { k: "base", label: "Base" }, { k: "pct", label: "Payout %" }, { k: "gross", label: "Gross" },
  { k: "tds", label: "TDS" }, { k: "net", label: "Net" },
];
const LOAN_COLS = [
  { k: "ref", label: "Reference" }, { k: "customer", label: "Customer" }, { k: "bank", label: "Bank" },
  { k: "stage", label: "Stage" }, { k: "base", label: "Base" }, { k: "pct", label: "Payout %" },
  { k: "gross", label: "Gross" }, { k: "tds", label: "TDS" }, { k: "net", label: "Net" },
];
const DEAL_COLS = [
  { k: "ref", label: "Reference" }, { k: "customer", label: "Customer" }, { k: "vertical", label: "Vertical" },
  { k: "value", label: "Value" }, { k: "margin", label: "Margin" }, { k: "pct", label: "Margin %" },
  { k: "net", label: "Net" }, { k: "received", label: "Received" }, { k: "pending", label: "Pending" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  snapshot: () => FounderSnapshotInput;
}

export const FounderExportDialog = ({ open, onOpenChange, snapshot }: Props) => {
  const { toast } = useToast();
  const [polCols, setPolCols] = useState<string[]>(POL_COLS.map(c => c.k));
  const [loanCols, setLoanCols] = useState<string[]>(LOAN_COLS.map(c => c.k));
  const [dealCols, setDealCols] = useState<string[]>(DEAL_COLS.map(c => c.k));
  const [includeRecon, setIncludeRecon] = useState(true);
  const [includeAudit, setIncludeAudit] = useState(true);
  const [includeKpis, setIncludeKpis] = useState(true);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);

  const cfg: ExportColumnConfig = {
    policies: polCols, loans: loanCols, deals: dealCols,
    includeReconciliation: includeRecon, includeAudit, includeKpis,
    includeCounts: includeKpis,
  };

  const toggle = (arr: string[], setter: (v: string[]) => void, k: string) => {
    setter(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k]);
  };

  const handleCSVDownload = () => {
    downloadFounderCSV(snapshot(), cfg);
    toast({ title: "CSV downloaded", description: "Includes selected columns + reconciliation/audit." });
  };

  const handlePDFDownload = () => {
    buildFounderSnapshotWithConfig(snapshot(), cfg);
  };

  const utf8ToBase64 = (str: string) => {
    const bytes = new TextEncoder().encode(str);
    let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  };

  const handleEmail = async () => {
    const emails = emailTo.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
    const valid = emails.filter(e => /.+@.+\..+/.test(e));
    if (valid.length === 0) {
      toast({ title: "Add recipients", description: "Enter at least one valid email address.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const snap = snapshot();
      const csv = buildFounderCSV(snap, cfg);
      const html = getFounderSnapshotPrintableHTML(snap, cfg);
      const csvBase64 = utf8ToBase64(csv);
      const htmlBase64 = utf8ToBase64(html);
      const slug = snap.periodLabel.replace(/\s+/g, "_");

      const { data, error } = await supabase.functions.invoke("send-founder-report-email", {
        body: {
          to: valid,
          subject: `Founder Report — ${snap.periodLabel}`,
          summary: `Period ${snap.periodStart} → ${snap.periodEnd}. KPIs, reconciliation${includeAudit ? ", audit trail" : ""} and selected tables included.`,
          csvBase64, csvFileName: `Founder-Snapshot-${slug}.csv`,
          pdfBase64: htmlBase64, pdfFileName: `Founder-Snapshot-${slug}.html`,
        },
      });
      if (error) throw error;
      toast({ title: "Sent", description: `Report emailed to ${valid.length} recipient${valid.length > 1 ? "s" : ""}.` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Email failed", description: e?.message || "Could not send report.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const ColGroup = ({ title, cols, sel, setSel }: { title: string; cols: { k: string; label: string }[]; sel: string[]; setSel: (v: string[]) => void; }) => (
    <div className="border rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-semibold uppercase text-slate-600">{title}</Label>
        <div className="flex gap-1">
          <button className="text-[10px] text-blue-600 hover:underline" onClick={() => setSel(cols.map(c => c.k))}>All</button>
          <span className="text-slate-300">·</span>
          <button className="text-[10px] text-blue-600 hover:underline" onClick={() => setSel([])}>None</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cols.map(c => (
          <label key={c.k} className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={sel.includes(c.k)} onCheckedChange={() => toggle(sel, setSel, c.k)} />
            {c.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Founder Report</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cols">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="cols" className="text-xs">Columns</TabsTrigger>
            <TabsTrigger value="extras" className="text-xs">Sections</TabsTrigger>
            <TabsTrigger value="email" className="text-xs">Email Team</TabsTrigger>
          </TabsList>

          <TabsContent value="cols" className="mt-3 space-y-3">
            <p className="text-[11px] text-slate-500">Pick which columns appear for each module in the exported CSV / PDF.</p>
            <ColGroup title="Policies" cols={POL_COLS} sel={polCols} setSel={setPolCols} />
            <ColGroup title="Loans" cols={LOAN_COLS} sel={loanCols} setSel={setLoanCols} />
            <ColGroup title="Deals" cols={DEAL_COLS} sel={dealCols} setSel={setDealCols} />
          </TabsContent>

          <TabsContent value="extras" className="mt-3 space-y-3">
            <p className="text-[11px] text-slate-500">Include the on-screen reconciliation and audit info in the export so it matches what you see.</p>
            <label className="flex items-center gap-2 text-xs"><Checkbox checked={includeKpis} onCheckedChange={v => setIncludeKpis(!!v)} /> KPIs & live counts</label>
            <label className="flex items-center gap-2 text-xs"><Checkbox checked={includeRecon} onCheckedChange={v => setIncludeRecon(!!v)} /> Auto-Reconciliation results</label>
            <label className="flex items-center gap-2 text-xs"><Checkbox checked={includeAudit} onCheckedChange={v => setIncludeAudit(!!v)} /> Audit trail (date-range queries)</label>
          </TabsContent>

          <TabsContent value="email" className="mt-3 space-y-3">
            <Label className="text-xs">Send to (comma or space separated)</Label>
            <Input
              placeholder="cfo@grabyourcar.com, accountant@grabyourcar.com"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              Sends the CSV (with selected columns + reconciliation/audit) and an HTML snapshot to your team.
            </p>
            <Button onClick={handleEmail} disabled={sending} className="gap-2 w-full">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {sending ? "Sending…" : "Email Report"}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-3 mt-3">
          <Button variant="outline" onClick={handleCSVDownload} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Download CSV
          </Button>
          <Button variant="outline" onClick={handlePDFDownload} className="gap-2">
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
