import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, FileText, Shield, Car, Phone, Send, Download,
  MessageCircle, Mail, Copy, Zap, User, Filter
} from "lucide-react";
import { toast } from "sonner";
import InsuranceQuoteModal from "./InsuranceQuoteModal";
import { SharePdfDialog } from "./SharePdfDialog";
import { generateInsuranceQuotePdf } from "@/lib/generateInsuranceQuotePdf";
import { generateRenewalReminderPdf } from "@/lib/generateRenewalReminderPdf";
import { InsuranceBulkQuoteImport } from "./InsuranceBulkQuoteImport";
import { motion, AnimatePresence } from "framer-motion";

interface ClientRow {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  vehicle_year: number | null;
  current_insurer: string | null;
  current_policy_type: string | null;
  ncb_percentage: number | null;
  current_premium: number | null;
  lead_status: string | null;
  lead_source: string | null;
}

export function InsuranceQuoteHub() {
  const [search, setSearch] = useState("");
  const [quoteClient, setQuoteClient] = useState<ClientRow | null>(null);
  const [shareClient, setShareClient] = useState<ClientRow | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: clients = [] } = useQuery({
    queryKey: ["ins-quote-hub-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, city, vehicle_make, vehicle_model, vehicle_number, vehicle_year, current_insurer, current_policy_type, ncb_percentage, current_premium, lead_status, lead_source")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as ClientRow[];
    },
  });

  const filtered = useMemo(() => {
    let result = clients;
    if (sourceFilter !== "all") {
      result = result.filter(c => c.lead_source?.toLowerCase().includes(sourceFilter.toLowerCase()));
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s) ||
        c.vehicle_make?.toLowerCase().includes(s) ||
        c.vehicle_model?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [clients, search, sourceFilter]);

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

  const stats = useMemo(() => ({
    total: clients.length,
    withVehicle: clients.filter(c => c.vehicle_number || c.vehicle_make).length,
    withInsurer: clients.filter(c => c.current_insurer).length,
  }), [clients]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => { if (c.lead_source) set.add(c.lead_source); });
    return Array.from(set).sort();
  }, [clients]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" /> Quote Hub
          </h2>
          <p className="text-sm text-muted-foreground">Prepare & share insurance quote PDFs for any client</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <InsuranceBulkQuoteImport />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Clients", value: stats.total, icon: User, color: "text-blue-600", bg: "from-blue-500/10 to-blue-600/5" },
          { label: "With Vehicle Info", value: stats.withVehicle, icon: Car, color: "text-emerald-600", bg: "from-emerald-500/10 to-emerald-600/5" },
          { label: "With Insurer", value: stats.withInsurer, icon: Shield, color: "text-primary", bg: "from-primary/10 to-primary/5" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border bg-gradient-to-br ${s.bg} p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</span>
            </div>
            <p className="text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, vehicle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={sourceFilter === "all" ? "default" : "outline"}
            onClick={() => setSourceFilter("all")}
            className="h-8 text-xs"
          >
            All
          </Button>
          {sources.slice(0, 6).map(s => (
            <Button
              key={s}
              size="sm"
              variant={sourceFilter === s ? "default" : "outline"}
              onClick={() => setSourceFilter(sourceFilter === s ? "all" : s)}
              className="h-8 text-xs"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Client List */}
      <AnimatePresence mode="popLayout">
        <div className="grid gap-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No clients found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
              </CardContent>
            </Card>
          ) : filtered.slice(0, 50).map((client, idx) => {
            const phone = displayPhone(client.phone);
            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ delay: idx * 0.015 }}
              >
                <Card className="hover:shadow-md transition-all border hover:border-emerald-300 dark:hover:border-emerald-700 group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      {/* Client Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm truncate">{client.customer_name}</p>
                            {client.lead_source && (
                              <Badge variant="outline" className="text-[10px] h-4">{client.lead_source}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</span>}
                            {client.vehicle_number && <span className="flex items-center gap-1 font-mono"><Car className="h-3 w-3" /> {client.vehicle_number}</span>}
                            {client.vehicle_make && client.vehicle_model && (
                              <span className="text-[10px]">{client.vehicle_make} {client.vehicle_model}</span>
                            )}
                            {client.current_insurer && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {client.current_insurer}</span>}
                            {client.current_premium && (
                              <Badge variant="secondary" className="text-[10px] h-4">₹{client.current_premium.toLocaleString("en-IN")}</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          onClick={() => setQuoteClient(client)}
                        >
                          <FileText className="h-3.5 w-3.5" /> Prepare Quote
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                          onClick={() => setShareClient(client)}
                        >
                          <Send className="h-3.5 w-3.5" /> Share
                        </Button>
                        {phone && (
                          <a href={`https://wa.me/91${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950/30">
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {filtered.length > 50 && (
            <p className="text-center text-xs text-muted-foreground py-3">
              Showing 50 of {filtered.length} clients. Use search to narrow down.
            </p>
          )}
        </div>
      </AnimatePresence>

      {/* Quote Modal */}
      {quoteClient && (
        <InsuranceQuoteModal
          open={!!quoteClient}
          onOpenChange={() => setQuoteClient(null)}
          client={quoteClient}
        />
      )}

      {/* Share Dialog */}
      {shareClient && (
        <SharePdfDialog
          open={!!shareClient}
          onOpenChange={() => setShareClient(null)}
          title="Insurance Quote"
          defaultPhone={displayPhone(shareClient.phone) || ""}
          defaultEmail={shareClient.email || ""}
          customerName={shareClient.customer_name}
          shareMessage={`Hi ${shareClient.customer_name}! Here is your insurance quote for your ${shareClient.vehicle_make || ""} ${shareClient.vehicle_model || ""}.\n\nVehicle: ${shareClient.vehicle_number || "N/A"}\nInsurer: ${shareClient.current_insurer || "Best Available"}\n\nPlease review and let us know if you'd like to proceed.\n\nPhone: +91 98559 24442\nwww.grabyourcar.com\n- Grabyourcar Insurance`}
          generatePdf={() => generateInsuranceQuotePdf({
            customerName: shareClient.customer_name || "Customer",
            phone: shareClient.phone,
            email: shareClient.email || undefined,
            city: shareClient.city || undefined,
            vehicleMake: shareClient.vehicle_make || "N/A",
            vehicleModel: shareClient.vehicle_model || "N/A",
            vehicleNumber: shareClient.vehicle_number || "N/A",
            vehicleYear: shareClient.vehicle_year || new Date().getFullYear(),
            fuelType: "Petrol",
            insuranceCompany: shareClient.current_insurer || "Best Available",
            policyType: shareClient.current_policy_type || "Comprehensive",
            idv: 500000,
            basicOD: 8000,
            odDiscount: 1500,
            ncbDiscount: (shareClient.ncb_percentage || 0) * 80,
            thirdParty: 6521,
            securePremium: 500,
            addonPremium: 3500,
            addons: ["Zero Depreciation", "Engine Protection", "Roadside Assistance (RSA)"],
          })}
        />
      )}
    </div>
  );
}
