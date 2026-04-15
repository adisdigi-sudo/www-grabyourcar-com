import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Building2, Car, TrendingUp, History, MessageCircle } from "lucide-react";
import { format } from "date-fns";

export default function DealerSearchHub() {
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState("dealers");

  const { data: dealers = [] } = useQuery({
    queryKey: ["dealer-search", keyword, "dealers"],
    queryFn: async () => {
      if (!keyword.trim()) {
        const { data } = await supabase.from("dealer_companies").select("*").order("priority_level", { ascending: false }).limit(50);
        return data || [];
      }
      const q = `%${keyword.trim()}%`;
      const { data } = await supabase.from("dealer_companies").select("*")
        .or(`company_name.ilike.${q},brand_name.ilike.${q},city.ilike.${q},state.ilike.${q},region.ilike.${q},notes.ilike.${q}`)
        .order("priority_level", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["dealer-search", keyword, "inventory"],
    queryFn: async () => {
      if (!keyword.trim()) {
        const { data } = await supabase.from("dealer_inventory").select("*, dealer_companies:dealer_rep_id(dealer_company_id)").order("created_at", { ascending: false }).limit(50);
        return data || [];
      }
      const q = `%${keyword.trim()}%`;
      const { data } = await supabase.from("dealer_inventory").select("*")
        .or(`brand.ilike.${q},model.ilike.${q},car_name.ilike.${q},variant.ilike.${q},color.ilike.${q},fuel_type.ilike.${q}`)
        .order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: activeTab === "inventory",
  });

  const { data: discounts = [] } = useQuery({
    queryKey: ["dealer-search", keyword, "discounts"],
    queryFn: async () => {
      if (!keyword.trim()) {
        const { data } = await supabase.from("dealer_live_discounts").select("*, dealer_companies(company_name)").eq("is_active", true).order("created_at", { ascending: false }).limit(50);
        return data || [];
      }
      const q = `%${keyword.trim()}%`;
      const { data } = await supabase.from("dealer_live_discounts").select("*, dealer_companies(company_name)")
        .or(`brand.ilike.${q},model.ilike.${q},variant.ilike.${q},offer_details.ilike.${q}`)
        .eq("is_active", true).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: activeTab === "discounts",
  });

  const { data: outreachLogs = [] } = useQuery({
    queryKey: ["dealer-search", keyword, "outreach"],
    queryFn: async () => {
      const { data } = await supabase.from("dealer_automation_logs")
        .select("*, dealer_companies(company_name), dealer_representatives(name)")
        .order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: activeTab === "outreach",
  });

  const { data: chatHistory = [] } = useQuery({
    queryKey: ["dealer-search", keyword, "chats"],
    queryFn: async () => {
      const { data } = await supabase.from("dealer_chat_history")
        .select("*, dealer_companies(company_name), dealer_representatives(name)")
        .order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: activeTab === "chats",
  });

  const filteredOutreach = keyword.trim()
    ? outreachLogs.filter((l: any) =>
        (l.dealer_companies?.company_name || "").toLowerCase().includes(keyword.toLowerCase()) ||
        (l.dealer_representatives?.name || "").toLowerCase().includes(keyword.toLowerCase()) ||
        (l.message_template || "").toLowerCase().includes(keyword.toLowerCase())
      )
    : outreachLogs;

  const filteredChats = keyword.trim()
    ? chatHistory.filter((c: any) =>
        (c.dealer_companies?.company_name || "").toLowerCase().includes(keyword.toLowerCase()) ||
        (c.message || "").toLowerCase().includes(keyword.toLowerCase()) ||
        (c.sender_name || "").toLowerCase().includes(keyword.toLowerCase())
      )
    : chatHistory;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by car name, brand, dealer, city, model, variant, keyword..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="pl-11 h-11 text-base"
            />
          </div>
          {keyword && (
            <p className="text-xs text-muted-foreground mt-2">
              Searching across dealers, inventory, discounts, outreach & chats for "<strong>{keyword}</strong>"
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="dealers" className="gap-1"><Building2 className="h-3.5 w-3.5" /> Dealers ({dealers.length})</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1"><Car className="h-3.5 w-3.5" /> Inventory</TabsTrigger>
          <TabsTrigger value="discounts" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Discounts</TabsTrigger>
          <TabsTrigger value="outreach" className="gap-1"><History className="h-3.5 w-3.5" /> Outreach</TabsTrigger>
          <TabsTrigger value="chats" className="gap-1"><MessageCircle className="h-3.5 w-3.5" /> Chats</TabsTrigger>
        </TabsList>

        {/* Dealers */}
        <TabsContent value="dealers" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead><TableHead>Brand</TableHead><TableHead>City</TableHead>
                    <TableHead>Region</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealers.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.company_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{d.brand_name || "—"}</Badge></TableCell>
                      <TableCell className="text-sm">{d.city || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{d.region || "—"}</Badge></TableCell>
                      <TableCell className="text-xs">{d.contact_phone || "—"}</TableCell>
                      <TableCell><Badge variant={d.is_active ? "default" : "secondary"} className="text-[10px]">{d.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {dealers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No dealers found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Car</TableHead><TableHead>Brand</TableHead><TableHead>Variant</TableHead>
                    <TableHead>Fuel</TableHead><TableHead>Color</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.car_name || i.model}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{i.brand}</Badge></TableCell>
                      <TableCell className="text-sm">{i.variant || "—"}</TableCell>
                      <TableCell className="text-xs">{i.fuel_type || "—"}</TableCell>
                      <TableCell className="text-xs">{i.color || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">₹{Number(i.ex_showroom_price || 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell><Badge variant={i.stock_status === "available" ? "default" : "secondary"} className="text-[10px]">{i.stock_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {inventory.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inventory found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discounts */}
        <TabsContent value="discounts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead><TableHead>Brand / Model</TableHead><TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Details</TableHead><TableHead>Valid Till</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">{d.dealer_companies?.company_name || "—"}</TableCell>
                      <TableCell className="font-medium">{d.brand} {d.model}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{d.discount_type}</Badge></TableCell>
                      <TableCell className="font-mono text-green-600 font-semibold">₹{Number(d.discount_amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{d.offer_details || "—"}</TableCell>
                      <TableCell className="text-xs">{d.valid_till ? format(new Date(d.valid_till), "dd MMM yyyy") : "Open"}</TableCell>
                    </TableRow>
                  ))}
                  {discounts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No discounts found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outreach History */}
        <TabsContent value="outreach" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">📋 Outreach Send History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Dealer</TableHead><TableHead>Rep</TableHead>
                    <TableHead>Channel</TableHead><TableHead>Message Preview</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutreach.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.created_at), "dd MMM, hh:mm a")}</TableCell>
                      <TableCell className="text-sm font-medium">{log.dealer_companies?.company_name || "—"}</TableCell>
                      <TableCell className="text-sm">{log.dealer_representatives?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-[10px] capitalize">
                          {log.channel === "whatsapp" && "💬"}{log.channel === "email" && "📧"}{log.channel === "ai_call" && "🤖"}{log.channel === "manual" && "📋"} {log.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate text-muted-foreground">{log.message_template || "—"}</TableCell>
                      <TableCell><Badge variant={log.status === "sent" ? "default" : "secondary"} className="text-[10px]">{log.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {filteredOutreach.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No outreach history</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat History */}
        <TabsContent value="chats" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">💬 Dealer Chat History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Dealer</TableHead><TableHead>Sender</TableHead>
                    <TableHead>Direction</TableHead><TableHead>Message</TableHead><TableHead>Channel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChats.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(c.created_at), "dd MMM, hh:mm a")}</TableCell>
                      <TableCell className="text-sm font-medium">{c.dealer_companies?.company_name || "—"}</TableCell>
                      <TableCell className="text-sm">{c.sender_name || c.dealer_representatives?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.direction === "inbound" ? "secondary" : "default"} className="text-[10px]">
                          {c.direction === "inbound" ? "⬅ Received" : "➡ Sent"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{c.message}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{c.channel}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {filteredChats.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No chat history yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
