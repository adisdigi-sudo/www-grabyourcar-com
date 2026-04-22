import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, FileText, Landmark, Upload, Plus, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "../shared/SectionCard";
import { StatTile } from "../shared/StatTile";
import { fmt } from "../../corporate-budget/types";

const AccountantView = () => {
  const { data: stats } = useQuery({
    queryKey: ["accountant-today-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const [exp, inv] = await Promise.all([
        (supabase.from("expenses") as any).select("amount").gte("expense_date", today),
        (supabase.from("invoices") as any).select("total_amount").gte("created_at", today),
      ]);
      const expenseToday = (exp.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const invoiceToday = (inv.data || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
      return { expenseToday, invoiceToday };
    },
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Expenses Today" value={fmt(stats?.expenseToday || 0)} icon={Receipt} trend="neutral" />
        <StatTile label="Invoices Today" value={fmt(stats?.invoiceToday || 0)} icon={FileText} trend="up" trendLabel="Live" />
        <StatTile label="Pending Reconciliation" value="—" hint="Bank entries waiting" icon={Landmark} />
        <StatTile label="Documents to upload" value="—" hint="Bills · Receipts" icon={Upload} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          title="Daily Expense Entry"
          description="Quick-add today's expenses by category and vertical"
          icon={Receipt}
          action={
            <Button size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add Expense
            </Button>
          }
        >
          <div className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
            Quick expense form — coming next turn.
            <br />
            <span className="text-xs">Reuses existing `expenses` table.</span>
          </div>
        </SectionCard>

        <SectionCard
          title="Invoice Management"
          description="Issue, track, and send customer invoices"
          icon={FileText}
          action={
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-3.5 w-3.5" /> New Invoice
            </Button>
          }
        >
          <div className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
            Invoice list (placeholder). Will mount existing `AccountsInvoicesModule` here.
          </div>
        </SectionCard>

        <SectionCard title="Vendor Payments" description="Pay bills and track vendor balances" icon={IndianRupee}>
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-slate-500">
            Vendor payment workflow.
          </div>
        </SectionCard>

        <SectionCard title="Bank Reconciliation" description="Match bank transactions with ledger entries" icon={Landmark}>
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-slate-500">
            Reco screen (placeholder).
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default AccountantView;
