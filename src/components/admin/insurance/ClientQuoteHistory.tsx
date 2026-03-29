import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, IndianRupee, Clock, MessageCircle, Mail, Copy, Shield } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  clientId: string;
  clientPhone?: string;
  vehicleNumber?: string;
}

const METHOD_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  whatsapp_api: { label: "WA API", icon: MessageCircle, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  email: { label: "Email", icon: Mail, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  pdf_download: { label: "PDF", icon: Download, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  save_quote: { label: "Saved", icon: FileText, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400" },
  copy_quote: { label: "Copied", icon: Copy, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const fmt = (n: number | null | undefined) => n != null ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—";

export function ClientQuoteHistory({ clientId, clientPhone, vehicleNumber }: Props) {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ["client-quote-history", clientId],
    queryFn: async () => {
      // Match by client phone or vehicle number
      const conditions: string[] = [];
      const cleanPhone = (clientPhone || "").replace(/\D/g, "").slice(-10);
      const cleanVehicle = (vehicleNumber || "").replace(/\s+/g, "").toUpperCase();

      let query = supabase
        .from("quote_share_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      // Build OR filter
      if (cleanPhone && cleanVehicle) {
        query = query.or(`customer_phone.ilike.%${cleanPhone},vehicle_number.ilike.%${cleanVehicle}`);
      } else if (cleanPhone) {
        query = query.ilike("customer_phone", `%${cleanPhone}`);
      } else if (cleanVehicle) {
        query = query.ilike("vehicle_number", `%${cleanVehicle}`);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(clientPhone || vehicleNumber),
  });

  const openPdf = async (path: string) => {
    const { data } = supabase.storage.from("quote-pdfs").getPublicUrl(path);
    if (data?.publicUrl) {
      window.open(data.publicUrl, "_blank");
    } else {
      toast.error("Could not open PDF");
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground text-center py-4">Loading quote history...</p>;
  }

  if (!quotes?.length) {
    return (
      <div className="text-center py-6 space-y-2">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No quotes shared yet</p>
        <p className="text-[10px] text-muted-foreground">Use the Quote Calculator to generate and share quotes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> {quotes.length} Quote{quotes.length !== 1 ? "s" : ""} Shared
      </p>
      {quotes.map((q: any) => {
        const method = METHOD_LABELS[q.share_method] || METHOD_LABELS.save_quote;
        const MethodIcon = method.icon;
        const breakup = q.premium_breakup as any;

        return (
          <Card key={q.id} className="border hover:shadow-sm transition-shadow">
            <CardContent className="p-3 space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] gap-1 ${method.color}`}>
                    <MethodIcon className="h-2.5 w-2.5" /> {method.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{q.quote_ref}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(q.created_at), "dd MMM yyyy, hh:mm a")}
                </span>
              </div>

              {/* Quote Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Insurer</p>
                  <p className="text-[10px] font-semibold truncate">{q.insurance_company || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">IDV</p>
                  <p className="text-[10px] font-semibold">{fmt(q.idv)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Total Premium</p>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{fmt(q.total_premium)}</p>
                </div>
              </div>

              {/* Breakup (collapsible) */}
              {breakup && (
                <div className="grid grid-cols-4 gap-1 text-[9px]">
                  {breakup.basicOD != null && (
                    <div className="bg-muted/30 rounded px-1.5 py-1">
                      <span className="text-muted-foreground">OD:</span> {fmt(breakup.basicOD)}
                    </div>
                  )}
                  {breakup.ncbDiscount > 0 && (
                    <div className="bg-muted/30 rounded px-1.5 py-1">
                      <span className="text-muted-foreground">NCB:</span> -{fmt(breakup.ncbDiscount)}
                    </div>
                  )}
                  {breakup.tp != null && (
                    <div className="bg-muted/30 rounded px-1.5 py-1">
                      <span className="text-muted-foreground">TP:</span> {fmt(breakup.tp)}
                    </div>
                  )}
                  {breakup.gst != null && (
                    <div className="bg-muted/30 rounded px-1.5 py-1">
                      <span className="text-muted-foreground">GST:</span> {fmt(breakup.gst)}
                    </div>
                  )}
                </div>
              )}

              {/* Addons */}
              {q.addons?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {q.addons.map((a: string) => (
                    <Badge key={a} variant="outline" className="text-[8px] px-1.5 py-0">
                      <Shield className="h-2 w-2 mr-0.5" /> {a}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-1.5">
                {q.pdf_storage_path && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={() => openPdf(q.pdf_storage_path)}>
                    <ExternalLink className="h-2.5 w-2.5" /> View PDF
                  </Button>
                )}
                {q.policy_type && (
                  <Badge variant="secondary" className="text-[9px] capitalize">{q.policy_type}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
