import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Rep = {
  id: string;
  name: string | null;
  brand: string | null;
  phone: string | null;
  whatsapp_number: string | null;
};

export default function DealerPhoneManager() {
  const [rows, setRows] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { phone: string; whatsapp_number: string }>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dealer_representatives")
      .select("id,name,brand,phone,whatsapp_number")
      .order("name", { ascending: true })
      .limit(2000);
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startEdit = (r: Rep) => {
    setEditing((prev) => ({ ...prev, [r.id]: { phone: r.phone || "", whatsapp_number: r.whatsapp_number || "" } }));
  };
  const cancelEdit = (id: string) => {
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };
  const save = async (id: string) => {
    const e = editing[id];
    if (!e) return;
    const { error } = await supabase
      .from("dealer_representatives")
      .update({ phone: e.phone, whatsapp_number: e.whatsapp_number })
      .eq("id", id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    cancelEdit(id);
    load();
  };

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📱 Dealer Phone Manager</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>WhatsApp Number</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isEditing = !!editing[r.id];
                const hasWa = !!(r.whatsapp_number && r.whatsapp_number.trim());
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name || "—"}</TableCell>
                    <TableCell>{r.brand || "—"}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input value={editing[r.id].phone}
                          onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], phone: e.target.value } }))}
                        />
                      ) : (r.phone || "—")}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input value={editing[r.id].whatsapp_number}
                          onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], whatsapp_number: e.target.value } }))}
                        />
                      ) : (r.whatsapp_number || "—")}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span className={`inline-block w-2 h-2 rounded-full ${hasWa ? "bg-green-500" : "bg-red-500"}`} />
                        {hasWa ? "WA Ready" : "No WA"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => save(r.id)}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelEdit(r.id)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                          <Pencil className="w-4 h-4 mr-1" />Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No representatives</TableCell></TableRow>}
            </TableBody>
          </Table>)}
        </CardContent>
      </Card>
    </div>
  );
}
