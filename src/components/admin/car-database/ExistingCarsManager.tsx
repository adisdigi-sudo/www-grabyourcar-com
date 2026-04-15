import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Trash2, Edit, Eye, RefreshCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export const ExistingCarsManager = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("All");

  const { data: cars, isLoading } = useQuery({
    queryKey: ['admin-cars-list', brandFilter],
    queryFn: async () => {
      let q = supabase.from('cars').select('id, slug, name, brand, body_type, price_range, price_numeric, is_hot, is_new, is_upcoming, is_bestseller, updated_at').order('brand').order('name');
      if (brandFilter !== 'All') q = q.eq('brand', brandFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
  });

  const { data: brands } = useQuery({
    queryKey: ['car-brands-list'],
    queryFn: async () => {
      const { data } = await supabase.from('cars').select('brand').order('brand');
      return [...new Set(data?.map(c => c.brand) || [])];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cars').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cars-list'] });
      toast.success('Car deleted');
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const filtered = cars?.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Name', 'Brand', 'Body Type', 'Price Range', 'Price Numeric', 'Hot', 'New', 'Upcoming', 'Bestseller', 'Slug'];
    const rows = filtered.map(c => [c.name, c.brand, c.body_type, c.price_range, c.price_numeric, c.is_hot, c.is_new, c.is_upcoming, c.is_bestseller, c.slug]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cars-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cars..." className="pl-9 h-9" />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Filter brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Brands</SelectItem>
            {brands?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-cars-list'] })}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
        <Badge variant="secondary">{filtered.length} cars</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading cars...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-medium text-xs">#</th>
                <th className="text-left px-3 py-2 font-medium text-xs">Car Name</th>
                <th className="text-left px-3 py-2 font-medium text-xs">Brand</th>
                <th className="text-left px-3 py-2 font-medium text-xs">Type</th>
                <th className="text-left px-3 py-2 font-medium text-xs">Price</th>
                <th className="text-left px-3 py-2 font-medium text-xs">Flags</th>
                <th className="text-left px-3 py-2 font-medium text-xs">Slug</th>
                <th className="text-right px-3 py-2 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((car, i) => (
                <tr key={car.id} className="border-b hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-xs">{car.name}</td>
                  <td className="px-3 py-2 text-xs">{car.brand}</td>
                  <td className="px-3 py-2 text-xs">{car.body_type}</td>
                  <td className="px-3 py-2 text-xs font-mono">{car.price_range || '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex gap-0.5">
                      {car.is_hot && <span title="Hot">🔥</span>}
                      {car.is_new && <span title="New">✨</span>}
                      {car.is_upcoming && <span title="Upcoming">🚀</span>}
                      {car.is_bestseller && <span title="Bestseller">⭐</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{car.slug}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`/cars/${car.slug}`, '_blank')}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm(`Delete ${car.name}?`)) deleteMutation.mutate(car.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No cars found</div>}
        </div>
      )}
    </div>
  );
};
