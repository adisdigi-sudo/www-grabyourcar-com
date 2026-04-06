import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { openInsuranceStorageFile } from "@/lib/insuranceDocumentViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Calendar, Phone, User, IndianRupee, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LoanQuoteHistoryProps {
  applicationId?: string;
  phone?: string;
}

export const LoanQuoteHistory = ({ applicationId, phone }: LoanQuoteHistoryProps) => {
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["loan-quote-history", applicationId, phone],
    queryFn: async () => {
      let query = supabase
        .from("loan_quote_share_history" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (applicationId) {
        query = query.eq("loan_application_id", applicationId);
      } else if (phone) {
        const cleanPhone = phone.replace(/\D/g, "").slice(-10);
        query = query.ilike("customer_phone", `%${cleanPhone}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(applicationId || phone),
  });

  const handleViewPdf = (storagePath: string) => {
    if (!storagePath) return;
    void openInsuranceStorageFile({
      url: supabase.storage.from("loan-documents").getPublicUrl(storagePath).data.publicUrl,
      fileName: storagePath.split("/").pop() || "loan-quote.pdf",
    }).catch(() => {
      toast.error("Could not open PDF");
    });
  };

  const formatCurrency = (amt: number) => {
    if (!amt) return "—";
    if (amt >= 100000) return `Rs. ${(amt / 100000).toFixed(1)}L`;
    return `Rs. ${amt.toLocaleString("en-IN")}`;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading quote history...</div>;
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No quotes shared yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map((q: any) => (
        <Card key={q.id} className="border border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {q.quote_ref || "Quote"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {q.share_method?.replace(/_/g, " ") || "download"}
                  </Badge>
                  <Badge variant={q.source === "website" ? "default" : "outline"} className="text-xs">
                    {q.source === "website" ? "🌐 Website" : "🏢 CRM"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{q.customer_name}</span>
                  </div>
                  {q.customer_phone && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{q.customer_phone}</span>
                    </div>
                  )}
                  {q.emi_amount && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <IndianRupee className="h-3 w-3" />
                      <span>EMI: {formatCurrency(q.emi_amount)}/mo</span>
                    </div>
                  )}
                  {q.bank_name && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{q.bank_name}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {q.created_at ? format(new Date(q.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                  {q.loan_amount && ` • Loan: ${formatCurrency(q.loan_amount)}`}
                  {q.interest_rate && ` @ ${q.interest_rate}%`}
                  {q.tenure_months && ` for ${q.tenure_months}M`}
                </div>
              </div>

              {q.pdf_storage_path && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleViewPdf(q.pdf_storage_path)}
                  className="shrink-0"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> View PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
