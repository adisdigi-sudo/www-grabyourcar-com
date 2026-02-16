import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search, Mail, MessageSquare, Download, User, Phone, Car, FileText,
  Shield, Hash, Calendar, IndianRupee, Building2, X,
} from "lucide-react";
import jsPDF from "jspdf";

interface ClientResult {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  vehicle_number: string | null;
  chassis_number: string | null;
  car_brand: string | null;
  car_model: string | null;
  city: string | null;
  policies: PolicyResult[];
}

interface PolicyResult {
  id: string;
  policy_number: string | null;
  insurance_company: string | null;
  insurance_type: string | null;
  premium_amount: number | null;
  net_premium: number | null;
  expiry_date: string | null;
  status: string | null;
  idv_amount: number | null;
}

export function InsuranceClientSearch() {
  const [searchType, setSearchType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [showShareEmail, setShowShareEmail] = useState(false);
  const [showShareWA, setShowShareWA] = useState(false);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["ins-client-search", activeQuery, searchType],
    queryFn: async () => {
      if (!activeQuery || activeQuery.length < 2) return [];
      const q = activeQuery.toLowerCase().trim();

      // Fetch clients
      let clientQuery = supabase.from("insurance_clients").select("*");

      if (searchType === "policy_number") {
        // We'll search policies first, then match clients
        const { data: policies } = await supabase
          .from("insurance_policies")
          .select("*, insurance_clients(*)")
          .ilike("policy_number", `%${q}%`)
          .limit(20);

        if (!policies?.length) return [];

        const clientMap = new Map<string, ClientResult>();
        for (const p of policies) {
          const c = (p as any).insurance_clients;
          if (!c) continue;
          if (!clientMap.has(c.id)) {
            clientMap.set(c.id, {
              id: c.id,
              customer_name: c.customer_name,
              phone: c.phone,
              email: c.email,
              vehicle_number: c.vehicle_number,
              chassis_number: c.chassis_number,
              car_brand: c.car_brand,
              car_model: c.car_model,
              city: c.city,
              policies: [],
            });
          }
          clientMap.get(c.id)!.policies.push({
            id: p.id,
            policy_number: p.policy_number,
            insurance_company: p.insurer,
            insurance_type: p.policy_type,
            premium_amount: p.premium_amount,
            net_premium: p.net_premium,
            expiry_date: p.expiry_date,
            status: p.status,
            idv_amount: p.idv,
          });
        }
        return Array.from(clientMap.values());
      }

      // Generic search across multiple fields
      if (searchType === "all") {
        clientQuery = clientQuery.or(
          `customer_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,vehicle_number.ilike.%${q}%,chassis_number.ilike.%${q}%`
        );
      } else if (searchType === "name") {
        clientQuery = clientQuery.ilike("customer_name", `%${q}%`);
      } else if (searchType === "phone") {
        clientQuery = clientQuery.ilike("phone", `%${q}%`);
      } else if (searchType === "email") {
        clientQuery = clientQuery.ilike("email", `%${q}%`);
      } else if (searchType === "vehicle") {
        clientQuery = clientQuery.ilike("vehicle_number", `%${q}%`);
      } else if (searchType === "chassis") {
        clientQuery = clientQuery.ilike("chassis_number", `%${q}%`);
      }

      const { data: clients, error } = await clientQuery.limit(20);
      if (error) throw error;
      if (!clients?.length) return [];

      // Fetch policies for these clients
      const clientIds = clients.map((c: any) => c.id);
      const { data: policies } = await supabase
        .from("insurance_policies")
        .select("*")
        .in("client_id", clientIds);

      return clients.map((c: any) => ({
        id: c.id,
        customer_name: c.customer_name,
        phone: c.phone,
        email: c.email,
        vehicle_number: c.vehicle_number,
        chassis_number: c.chassis_number,
        car_brand: c.car_brand,
        car_model: c.car_model,
        city: c.city,
        policies: (policies || [])
          .filter((p: any) => p.client_id === c.id)
          .map((p: any) => ({
            id: p.id,
            policy_number: p.policy_number,
            insurance_company: p.insurance_company,
            insurance_type: p.insurance_type,
            premium_amount: p.premium_amount,
            net_premium: p.net_premium,
            expiry_date: p.expiry_date,
            status: p.status,
            idv_amount: p.idv_amount,
          })),
      })) as ClientResult[];
    },
    enabled: activeQuery.length >= 2,
  });

  const handleSearch = () => setActiveQuery(searchQuery);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  // ─── Download PDF ───
  const downloadPDF = (client: ClientResult) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Insurance Client Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setFontSize(12);
    doc.text("Client Details", 14, 42);
    doc.setFontSize(10);
    const details = [
      `Name: ${client.customer_name}`,
      `Phone: ${client.phone}`,
      `Email: ${client.email || "N/A"}`,
      `Vehicle: ${client.vehicle_number || "N/A"}`,
      `Chassis: ${client.chassis_number || "N/A"}`,
      `Car: ${[client.car_brand, client.car_model].filter(Boolean).join(" ") || "N/A"}`,
      `City: ${client.city || "N/A"}`,
    ];
    details.forEach((d, i) => doc.text(d, 14, 52 + i * 7));

    if (client.policies.length > 0) {
      doc.setFontSize(12);
      doc.text("Policies", 14, 105);
      doc.setFontSize(9);
      client.policies.forEach((p, i) => {
        const y = 115 + i * 28;
        if (y > 270) { doc.addPage(); }
        const py = y > 270 ? 20 : y;
        doc.text(`Policy #${p.policy_number || "N/A"} — ${p.insurance_company || "N/A"}`, 14, py);
        doc.text(`Type: ${p.insurance_type || "N/A"} | Premium: ₹${p.premium_amount || 0} | IDV: ₹${p.idv_amount || 0}`, 14, py + 6);
        doc.text(`Expiry: ${p.expiry_date || "N/A"} | Status: ${p.status || "N/A"}`, 14, py + 12);
      });
    }

    doc.save(`${client.customer_name.replace(/\s+/g, "_")}_insurance.pdf`);
    toast.success("PDF downloaded");
  };

  // ─── Share via Email ───
  const shareViaEmail = async (client: ClientResult) => {
    const subject = `Insurance Details — ${client.customer_name}`;
    const policyRows = client.policies
      .map(
        (p) =>
          `<tr><td style="padding:8px;border:1px solid #e5e7eb">${p.policy_number || "—"}</td><td style="padding:8px;border:1px solid #e5e7eb">${p.insurance_company || "—"}</td><td style="padding:8px;border:1px solid #e5e7eb">${p.insurance_type || "—"}</td><td style="padding:8px;border:1px solid #e5e7eb">₹${p.premium_amount || 0}</td><td style="padding:8px;border:1px solid #e5e7eb">${p.expiry_date || "—"}</td><td style="padding:8px;border:1px solid #e5e7eb">${p.status || "—"}</td></tr>`
      )
      .join("");

    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px;border-radius:12px 12px 0 0;color:white">
        <h1 style="margin:0;font-size:22px">🛡️ Insurance Summary</h1>
        <p style="margin:4px 0 0;opacity:0.9">GrabYourCar Insurance Services</p>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb">
        <h2 style="font-size:16px;color:#1e40af;margin:0 0 12px">Client Information</h2>
        <table style="width:100%;font-size:13px">
          <tr><td style="padding:4px 0;color:#6b7280">Name</td><td style="padding:4px 0;font-weight:600">${client.customer_name}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Phone</td><td style="padding:4px 0">${client.phone}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Email</td><td style="padding:4px 0">${client.email || "—"}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Vehicle</td><td style="padding:4px 0">${client.vehicle_number || "—"}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Chassis</td><td style="padding:4px 0">${client.chassis_number || "—"}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Car</td><td style="padding:4px 0">${[client.car_brand, client.car_model].filter(Boolean).join(" ") || "—"}</td></tr>
        </table>
        ${client.policies.length > 0 ? `
          <h2 style="font-size:16px;color:#1e40af;margin:20px 0 12px">Policies</h2>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:#f3f4f6">
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Policy #</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Company</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Type</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Premium</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Expiry</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Status</th>
            </tr></thead>
            <tbody>${policyRows}</tbody>
          </table>
        ` : ""}
      </div>
      <div style="background:#f3f4f6;padding:16px;border-radius:0 0 12px 12px;text-align:center;font-size:11px;color:#6b7280">
        GrabYourCar Insurance Services • Powered by GrabYourCar.com
      </div>
    </div>`;

    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: client.email,
          subject,
          html,
        },
      });
      if (error) throw error;
      toast.success("Email sent successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to send email");
    }
  };

  // ─── Share via WhatsApp ───
  const shareViaWhatsApp = async (client: ClientResult) => {
    const policyInfo = client.policies
      .map((p) => `📋 ${p.policy_number || "N/A"} — ${p.insurance_company || "N/A"} (${p.insurance_type || "N/A"}) | Premium: ₹${p.premium_amount || 0} | Expiry: ${p.expiry_date || "N/A"}`)
      .join("\n");

    const message = `🛡️ *Insurance Summary*\n\n👤 *${client.customer_name}*\n📱 ${client.phone}\n🚗 ${client.vehicle_number || "N/A"}\n\n${policyInfo || "No policies found"}\n\n— GrabYourCar Insurance`;

    try {
      const { error } = await supabase.functions.invoke("whatsapp-send", {
        body: { to: client.phone, message },
      });
      if (error) throw error;
      toast.success("WhatsApp message sent");
    } catch (e: any) {
      toast.error(e.message || "Failed to send WhatsApp");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" /> Client & Policy Search
        </h3>
        <p className="text-xs text-muted-foreground">
          Search by policy number, name, phone, email, vehicle/chassis number — then share or download
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-3">
            <div className="w-40">
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="policy_number">Policy Number</SelectItem>
                  <SelectItem value="name">Customer Name</SelectItem>
                  <SelectItem value="phone">Mobile Number</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="vehicle">Vehicle Number</SelectItem>
                  <SelectItem value="chassis">Chassis Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter search term..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={searchQuery.length < 2} className="gap-1.5">
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Searching...</p>}

      {!isLoading && activeQuery && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No results found for "{activeQuery}"</p>
      )}

      <div className="grid grid-cols-1 gap-3">
        {results.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-all">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {client.customer_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{client.customer_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>
                        {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {client.vehicle_number && (
                      <Badge variant="outline" className="gap-1"><Car className="h-3 w-3" />{client.vehicle_number}</Badge>
                    )}
                    {client.chassis_number && (
                      <Badge variant="secondary" className="gap-1"><Hash className="h-3 w-3" />{client.chassis_number}</Badge>
                    )}
                    {client.car_brand && (
                      <Badge variant="secondary" className="gap-1">{client.car_brand} {client.car_model}</Badge>
                    )}
                    {client.city && <Badge variant="outline">{client.city}</Badge>}
                  </div>

                  {/* Policies */}
                  {client.policies.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Policies ({client.policies.length})</p>
                      {client.policies.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded-lg">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium">{p.policy_number || "—"}</span>
                          <span className="text-muted-foreground">|</span>
                          <span>{p.insurance_company || "—"}</span>
                          <Badge variant="outline" className="text-[9px]">{p.insurance_type || "—"}</Badge>
                          <span className="ml-auto font-medium">₹{(p.premium_amount || 0).toLocaleString()}</span>
                          <Badge
                            variant={p.status === "active" ? "default" : p.status === "expired" ? "destructive" : "secondary"}
                            className="text-[9px]"
                          >
                            {p.status || "—"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-1.5 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => {
                      if (client.email) shareViaEmail(client);
                      else toast.error("No email address on file");
                    }}
                  >
                    <Mail className="h-3 w-3" /> Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => shareViaWhatsApp(client)}
                  >
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => downloadPDF(client)}
                  >
                    <Download className="h-3 w-3" /> Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
