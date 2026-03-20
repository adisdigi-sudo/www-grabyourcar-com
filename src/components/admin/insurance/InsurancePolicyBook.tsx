import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, BookOpen, User, Download, Eye, CalendarIcon, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { InsurancePolicyDocumentUploader } from "./InsurancePolicyDocumentUploader";
import { useQueryClient } from "@tanstack/react-query";

export type PolicyRecord = {
  id: string;
  client_id: string | null;
  policy_number: string | null;
  policy_type: string | null;
  insurer: string | null;
  premium_amount: number | null;
  start_date: string | null;
  expiry_date: string | null;
  status: string | null;
  is_renewal: boolean | null;
  issued_date: string | null;
  plan_name: string | null;
  idv: number | null;
  policy_document_url: string | null;
  source_label: string | null;
  renewal_count: number | null;
  created_at: string;
  insurance_clients: {
    customer_name: string;
    phone: string;
    city: string | null;
    vehicle_number: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    lead_source: string | null;
  } | null;
};

interface InsurancePolicyBookProps {
  policies: PolicyRecord[];
}

const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

export function InsurancePolicyBook({ policies }: InsurancePolicyBookProps) {
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadPolicyId, setUploadPolicyId] = useState<string | null>(null);
  const [uploadClientId, setUploadClientId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const partners = useMemo(() => {
    const set = new Set(policies.map(p => p.insurer).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [policies]);

  // Deduplicate: keep only the latest policy per client_id + vehicle_number combo
  const deduplicatedPolicies = useMemo(() => {
    const map = new Map<string, PolicyRecord>();
    // policies are already sorted by created_at desc, so first occurrence is latest
    for (const p of policies) {
      const vehicleKey = p.insurance_clients?.vehicle_number?.replace(/\s+/g, "").toUpperCase() || "no-vehicle";
      const key = `${p.client_id || "unknown"}_${vehicleKey}`;
      if (!map.has(key)) {
        map.set(key, p);
      }
    }
    return Array.from(map.values());
  }, [policies]);

  const filtered = useMemo(() => {
    let result = deduplicatedPolicies;
    if (partnerFilter !== "all") result = result.filter(p => p.insurer === partnerFilter);

    if (dateFrom || dateTo) {
      result = result.filter(p => {
        if (!p.issued_date) return false;
        const d = new Date(p.issued_date);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
        p.insurance_clients?.phone?.includes(s) ||
        p.insurance_clients?.vehicle_number?.toLowerCase().includes(s) ||
        p.insurance_clients?.vehicle_make?.toLowerCase().includes(s) ||
        p.insurance_clients?.vehicle_model?.toLowerCase().includes(s) ||
        p.policy_number?.toLowerCase().includes(s) ||
        p.insurer?.toLowerCase().includes(s) ||
        p.plan_name?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [deduplicatedPolicies, partnerFilter, search, dateFrom, dateTo]);

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const sourceLabel = (policy: PolicyRecord) => {
    // Show "Renewed" with date if the policy is a renewal
    if (policy.is_renewal || (policy.renewal_count && policy.renewal_count > 0)) {
      const renewDate = policy.issued_date ? format(new Date(policy.issued_date), "dd MMM yyyy") : "";
      return <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-200">🔄 Renewed {renewDate}</Badge>;
    }
    const sl = policy.source_label;
    if (!sl) return null;
    const colors: Record<string, string> = {
      "Won (New)": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "Won (Renewal)": "bg-blue-100 text-blue-700 border-blue-200",
      Rollover: "bg-violet-100 text-violet-700 border-violet-200",
    };
    return <Badge variant="outline" className={cn("text-[9px]", colors[sl] || "bg-muted text-muted-foreground")}>{sl}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, vehicle, policy no., insurer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-sm" />
        </div>
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="All Insurers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Insurers</SelectItem>
            {partners.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        
        {/* Date range filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 text-xs gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "dd MMM") : "From"} – {dateTo ? format(dateTo, "dd MMM") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 space-y-2">
            <p className="text-xs font-medium">Issued Date Range</p>
            <div className="flex gap-3">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">From</p>
                <SmartDatePicker date={dateFrom} onSelect={setDateFrom} placeholder="Start date" yearRange={[new Date().getFullYear() - 3, new Date().getFullYear()]} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">To</p>
                <SmartDatePicker date={dateTo} onSelect={setDateTo} placeholder="End date" yearRange={[new Date().getFullYear() - 3, new Date().getFullYear()]} />
              </div>
            </div>
            {(dateFrom || dateTo) && <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Clear</Button>}
          </PopoverContent>
        </Popover>

        {selectedIds.size > 0 && (
          <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={() => {
            const sel = filtered.filter(p => selectedIds.has(p.id));
            sel.forEach((p, i) => {
              const ph = p.insurance_clients?.phone;
              if (ph && !ph.startsWith("IB_")) {
                const clean = ph.replace(/\D/g, "");
                const wa = `https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}?text=${encodeURIComponent(`Hi ${p.insurance_clients?.customer_name || ""}, your policy ${p.policy_number || ""} details are ready.`)}`;
                setTimeout(() => window.open(wa, "_blank"), i * 500);
              }
            });
            toast.success(`Opening WhatsApp for ${sel.length} clients`);
          }}><Send className="h-3.5 w-3.5" /> Bulk Send ({selectedIds.size})</Button>
        )}
        <Badge variant="outline" className="text-xs">{filtered.length} policies</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-8"><input type="checkbox" className="rounded" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={() => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)))} /></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase w-8">#</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Phone</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Vehicle</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Insurer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Policy No.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Type</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Premium</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Issued</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Expiry</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Source</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Doc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No policies found</p>
                  </TableCell></TableRow>
                ) : filtered.map((policy, idx) => {
                  const c = policy.insurance_clients;
                  const phone = displayPhone(c?.phone || null);
                  return (
                    <TableRow key={policy.id} className="text-xs hover:bg-muted/30">
                      <TableCell onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded" checked={selectedIds.has(policy.id)} onChange={() => toggleSelect(policy.id)} /></TableCell>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-xs">{c?.customer_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{c?.city || ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{phone || "—"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono font-semibold text-xs">{c?.vehicle_number || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{[c?.vehicle_make, c?.vehicle_model].filter(Boolean).join(" ")}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{policy.insurer || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{policy.policy_number || "—"}</TableCell>
                      <TableCell className="text-xs capitalize">{policy.policy_type || "—"}</TableCell>
                      <TableCell className="font-semibold text-xs">{policy.premium_amount ? `₹${policy.premium_amount.toLocaleString("en-IN")}` : "—"}</TableCell>
                      <TableCell className="text-xs">{policy.issued_date ? format(new Date(policy.issued_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-xs">{policy.expiry_date ? format(new Date(policy.expiry_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>{sourceLabel(policy)}</TableCell>
                      <TableCell>
                        {policy.policy_document_url ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(policy.policy_document_url!, "_blank")}>
                            <Eye className="h-3 w-3 text-primary" />
                          </Button>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
