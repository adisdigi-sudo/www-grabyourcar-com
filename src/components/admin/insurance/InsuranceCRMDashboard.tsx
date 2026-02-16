import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, FileText, AlertTriangle, Clock, Search,
  Download, ChevronLeft, ChevronRight, Gift, Heart,
  Car, Eye, Phone, Mail
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, addDays, differenceInDays, differenceInYears, isAfter, isBefore } from "date-fns";

type RenewalFilter = "7" | "15" | "30" | "60" | "expired";

export function InsuranceCRMDashboard() {
  const [clientSearch, setClientSearch] = useState("");
  const [renewalFilter, setRenewalFilter] = useState<RenewalFilter>("7");
  const [renewalPage, setRenewalPage] = useState(0);
  const [birthdayPage, setBirthdayPage] = useState(0);
  const [anniversaryPage, setAnniversaryPage] = useState(0);
  const pageSize = 10;

  const { data: clients } = useQuery({
    queryKey: ["ins-dashboard-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["ins-dashboard-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();

  // Stats
  const stats = useMemo(() => {
    const totalClients = clients?.length || 0;
    const totalPolicies = policies?.length || 0;
    const expiredPolicies = policies?.filter(p => p.expiry_date && isBefore(new Date(p.expiry_date), now) && p.status === "active").length || 0;
    const duePolicies = policies?.filter(p => {
      if (!p.expiry_date) return false;
      const exp = new Date(p.expiry_date);
      return isAfter(exp, now) && isBefore(exp, addDays(now, 30)) && p.status === "active";
    }).length || 0;
    return { totalClients, totalPolicies, expiredPolicies, duePolicies };
  }, [clients, policies]);

  // Upcoming Renewals
  const renewals = useMemo(() => {
    if (!policies || !clients) return [];
    const clientMap = new Map(clients.map(c => [c.id, c]));
    
    return policies
      .filter(p => {
        if (!p.expiry_date || p.status !== "active") return false;
        const exp = new Date(p.expiry_date);
        if (renewalFilter === "expired") return isBefore(exp, now);
        const days = parseInt(renewalFilter);
        return isAfter(exp, now) && isBefore(exp, addDays(now, days));
      })
      .map(p => ({
        ...p,
        client: clientMap.get(p.client_id || ""),
      }));
  }, [policies, clients, renewalFilter]);

  // Birthdays (upcoming in next 30 days)
  const birthdays = useMemo(() => {
    if (!clients) return [];
    const today = now;
    return clients
      .filter(c => c.date_of_birth)
      .map(c => {
        const dob = new Date(c.date_of_birth!);
        const nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (isBefore(nextBday, today)) nextBday.setFullYear(nextBday.getFullYear() + 1);
        const daysUntil = differenceInDays(nextBday, today);
        const age = differenceInYears(today, dob);
        return { ...c, nextBday, daysUntil, age };
      })
      .filter(c => c.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [clients]);

  // Anniversaries (upcoming in next 30 days)
  const anniversaries = useMemo(() => {
    if (!clients) return [];
    const today = now;
    return clients
      .filter(c => (c as any).anniversary_date)
      .map(c => {
        const ann = new Date((c as any).anniversary_date);
        const nextAnn = new Date(today.getFullYear(), ann.getMonth(), ann.getDate());
        if (isBefore(nextAnn, today)) nextAnn.setFullYear(nextAnn.getFullYear() + 1);
        const daysUntil = differenceInDays(nextAnn, today);
        return { ...c, nextAnn, daysUntil };
      })
      .filter(c => c.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [clients]);

  // Vehicle Document Validity
  const vehicleDocs = useMemo(() => {
    if (!clients) return [];
    return clients.filter(c => c.vehicle_number);
  }, [clients]);

  // Filtered client search
  const searchedClient = useMemo(() => {
    if (!clientSearch.trim() || !clients) return null;
    return clients.find(c =>
      c.id.includes(clientSearch) ||
      c.customer_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone?.includes(clientSearch) ||
      c.vehicle_number?.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clientSearch, clients]);

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map(r => headers.map(h => `"${r[h] || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: "Total Client", value: stats.totalClients, icon: Users, color: "text-chart-2", bg: "bg-chart-2/10" },
    { label: "Total Policy", value: stats.totalPolicies, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Expired Policy", value: stats.expiredPolicies, icon: AlertTriangle, color: "text-chart-5", bg: "bg-chart-5/10" },
    { label: "Due Policy", value: stats.duePolicies, icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  const getDocStatus = (date: string | null) => {
    if (!date) return { label: "N/A", variant: "secondary" as const };
    const exp = new Date(date);
    if (isBefore(exp, now)) return { label: "Expired", variant: "destructive" as const };
    if (isBefore(exp, addDays(now, 30))) return { label: format(exp, "dd/MM/yy"), variant: "outline" as const };
    return { label: format(exp, "dd/MM/yy"), variant: "secondary" as const };
  };

  return (
    <div className="space-y-6">
      {/* Top: Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <h2 className="text-xl font-bold">Insurance CRM Dashboard</h2>
        <div className="flex-1" />
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Client ID, Name, Phone, Vehicle..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Client Search Result */}
      {searchedClient && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <p className="font-semibold text-lg">{searchedClient.customer_name}</p>
                <p className="text-sm text-muted-foreground">{searchedClient.phone} • {searchedClient.email || "No email"}</p>
              </div>
              <Badge>{searchedClient.lead_status}</Badge>
              <div className="text-sm">
                <span className="text-muted-foreground">Vehicle: </span>
                <span className="font-medium">{searchedClient.vehicle_number || "N/A"}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Policy Expiry: </span>
                <span className="font-medium">{searchedClient.policy_expiry_date ? format(new Date(searchedClient.policy_expiry_date), "dd MMM yyyy") : "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Renewal & Due Premium */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-4">
          <div className="flex-1">
            <CardTitle className="text-lg">Upcoming Renewal & Due Premium</CardTitle>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={renewalFilter} onValueChange={(v) => { setRenewalFilter(v as RenewalFilter); setRenewalPage(0); }}>
              <SelectTrigger className="w-[140px] h-9 bg-primary text-primary-foreground border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 Days</SelectItem>
                <SelectItem value="15">Next 15 Days</SelectItem>
                <SelectItem value="30">Next 30 Days</SelectItem>
                <SelectItem value="60">Next 60 Days</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => downloadCSV(renewals.map(r => ({
              ID: r.id?.slice(0, 8),
              PolicyName: r.plan_name,
              PolicyHolder: r.client?.customer_name,
              InsuranceCompany: r.insurer,
              PolicyNumber: r.policy_number,
              PremiumDate: r.start_date,
              LastPremium: r.premium_amount,
              DueRenewal: r.expiry_date,
            })), "renewals")}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Policy Holder</TableHead>
                  <TableHead>Insurance Company</TableHead>
                  <TableHead>Policy Number</TableHead>
                  <TableHead>Premium Date</TableHead>
                  <TableHead>Last Premium</TableHead>
                  <TableHead>Premium Due/Renewal</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No data available in table
                    </TableCell>
                  </TableRow>
                ) : (
                  renewals.slice(renewalPage * pageSize, (renewalPage + 1) * pageSize).map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{renewalPage * pageSize + i + 1}</TableCell>
                      <TableCell className="font-medium">{r.plan_name || r.policy_type || "—"}</TableCell>
                      <TableCell>{r.client?.customer_name || "—"}</TableCell>
                      <TableCell>{r.insurer || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{r.policy_number || "—"}</TableCell>
                      <TableCell>{r.start_date ? format(new Date(r.start_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="font-semibold">₹{r.premium_amount?.toLocaleString() || "0"}</TableCell>
                      <TableCell>
                        {r.expiry_date && (
                          <Badge variant={isBefore(new Date(r.expiry_date), now) ? "destructive" : "outline"}>
                            {format(new Date(r.expiry_date), "dd/MM/yyyy")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>Showing {renewals.length === 0 ? 0 : renewalPage * pageSize + 1} to {Math.min((renewalPage + 1) * pageSize, renewals.length)} of {renewals.length} entries</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={renewalPage === 0} onClick={() => setRenewalPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" disabled={(renewalPage + 1) * pageSize >= renewals.length} onClick={() => setRenewalPage(p => p + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Birthdays & Anniversary - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Birthdays */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-chart-1" /> Birthdays
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="default" size="sm" className="bg-chart-2 hover:bg-chart-2/90 text-white" onClick={() => downloadCSV(birthdays.map(b => ({
                ID: b.id?.slice(0, 8),
                Name: b.customer_name,
                Relationship: (b as any).relationship || "Client",
                Birthdate: b.date_of_birth,
                Age: b.age,
              })), "birthdays")}>
                <Download className="h-3.5 w-3.5 mr-1" /> Excel Download
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Birthdate</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {birthdays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No data available in table
                    </TableCell>
                  </TableRow>
                ) : (
                  birthdays.slice(birthdayPage * 5, (birthdayPage + 1) * 5).map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell>{birthdayPage * 5 + i + 1}</TableCell>
                      <TableCell className="font-medium">{b.customer_name}</TableCell>
                      <TableCell>{(b as any).relationship || "Client"}</TableCell>
                      <TableCell>{b.date_of_birth ? format(new Date(b.date_of_birth), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{b.age}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Send Wish">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
              <span>Showing {birthdays.length === 0 ? 0 : birthdayPage * 5 + 1} to {Math.min((birthdayPage + 1) * 5, birthdays.length)} of {birthdays.length}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={birthdayPage === 0} onClick={() => setBirthdayPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={(birthdayPage + 1) * 5 >= birthdays.length} onClick={() => setBirthdayPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anniversary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" /> Anniversary
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="default" size="sm" className="bg-chart-2 hover:bg-chart-2/90 text-white" onClick={() => downloadCSV(anniversaries.map(a => ({
                ID: a.id?.slice(0, 8),
                Name: a.customer_name,
                AnniversaryDate: (a as any).anniversary_date,
              })), "anniversaries")}>
                <Download className="h-3.5 w-3.5 mr-1" /> Excel Download
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Anniversary Date</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anniversaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No data available in table
                    </TableCell>
                  </TableRow>
                ) : (
                  anniversaries.slice(anniversaryPage * 5, (anniversaryPage + 1) * 5).map((a, i) => (
                    <TableRow key={a.id}>
                      <TableCell>{anniversaryPage * 5 + i + 1}</TableCell>
                      <TableCell className="font-medium">{a.customer_name}</TableCell>
                      <TableCell>{(a as any).anniversary_date ? format(new Date((a as any).anniversary_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Send Wish">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
              <span>Showing {anniversaries.length === 0 ? 0 : anniversaryPage * 5 + 1} to {Math.min((anniversaryPage + 1) * 5, anniversaries.length)} of {anniversaries.length}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={anniversaryPage === 0} onClick={() => setAnniversaryPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={(anniversaryPage + 1) * 5 >= anniversaries.length} onClick={() => setAnniversaryPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Documents Validity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" /> Vehicle Documents Validity
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(vehicleDocs.map(v => ({
            ClientName: v.customer_name,
            Registration: v.vehicle_number,
            StatePermit: (v as any).state_permit_expiry || "N/A",
            NationalPermit: (v as any).national_permit_expiry || "N/A",
            Fitness: (v as any).fitness_expiry || "N/A",
            PUC: (v as any).puc_expiry || "N/A",
            RC: (v as any).rc_expiry || "N/A",
            RTOTax: (v as any).rto_tax_expiry || "N/A",
          })), "vehicle-documents")}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Registration Number</TableHead>
                  <TableHead>State Permit</TableHead>
                  <TableHead>National Permit</TableHead>
                  <TableHead>Fitness</TableHead>
                  <TableHead>PUC</TableHead>
                  <TableHead>RC</TableHead>
                  <TableHead>RTO Tax</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No data available in table
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicleDocs.slice(0, 10).map((v, i) => {
                    const sp = getDocStatus((v as any).state_permit_expiry);
                    const np = getDocStatus((v as any).national_permit_expiry);
                    const fit = getDocStatus((v as any).fitness_expiry);
                    const puc = getDocStatus((v as any).puc_expiry);
                    const rc = getDocStatus((v as any).rc_expiry);
                    const rto = getDocStatus((v as any).rto_tax_expiry);
                    return (
                      <TableRow key={v.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{v.customer_name}</TableCell>
                        <TableCell className="font-mono">{v.vehicle_number}</TableCell>
                        <TableCell><Badge variant={sp.variant}>{sp.label}</Badge></TableCell>
                        <TableCell><Badge variant={np.variant}>{np.label}</Badge></TableCell>
                        <TableCell><Badge variant={fit.variant}>{fit.label}</Badge></TableCell>
                        <TableCell><Badge variant={puc.variant}>{puc.label}</Badge></TableCell>
                        <TableCell><Badge variant={rc.variant}>{rc.label}</Badge></TableCell>
                        <TableCell><Badge variant={rto.variant}>{rto.label}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
