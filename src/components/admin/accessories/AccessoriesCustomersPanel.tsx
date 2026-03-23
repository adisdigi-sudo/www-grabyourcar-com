import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Users, Loader2 } from "lucide-react";

interface CustomerSummary {
  user_id: string;
  name: string;
  phone: string;
  city: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
}

export function AccessoriesCustomersPanel() {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["acc-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accessory_orders")
        .select("user_id, shipping_name, shipping_phone, shipping_city, total_amount, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const map = new Map<string, CustomerSummary>();
      for (const o of data || []) {
        const existing = map.get(o.user_id);
        if (existing) {
          existing.totalOrders++;
          existing.totalSpent += o.total_amount || 0;
        } else {
          map.set(o.user_id, {
            user_id: o.user_id,
            name: o.shipping_name,
            phone: o.shipping_phone,
            city: o.shipping_city,
            totalOrders: 1,
            totalSpent: o.total_amount || 0,
            lastOrder: o.created_at,
          });
        }
      }
      return Array.from(map.values());
    },
  });

  const filtered = (customers || []).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.name?.toLowerCase().includes(s) || c.phone?.includes(s) || c.city?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Badge variant="outline">{filtered.length} customers</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, phone, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2 opacity-40" /><p>No customers found</p></CardContent></Card>
      ) : (
        <div className="space-y-1">
          {filtered.map((c) => (
            <Card key={c.user_id}>
              <CardContent className="flex items-center gap-4 p-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {c.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.phone} · {c.city}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">₹{c.totalSpent.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-muted-foreground">{c.totalOrders} order{c.totalOrders !== 1 ? "s" : ""}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
