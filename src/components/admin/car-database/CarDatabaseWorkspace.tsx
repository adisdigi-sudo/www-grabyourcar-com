import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import {
  Trash2, Eye, Search, RefreshCw, Database, Globe, Plus, Car
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CarDatabaseScraper } from "./CarDatabaseScraper";
import { CarUploadWizard } from "./CarUploadWizard";
import { BulkCSVUpload } from "./BulkCSVUpload";
import { AdminLivePreview, PreviewToggleButton } from "../shared/AdminLivePreview";

export const CarDatabaseWorkspace = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upload' | 'bulk' | 'manage' | 'scraper'>('upload');
  const [searchFilter, setSearchFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("All");
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: dbBrands } = useQuery({
    queryKey: ['car-brands-names'],
    queryFn: async () => {
      const { data } = await supabase.from('car_brands').select('name').eq('is_active', true).order('sort_order');
      return data?.map(b => b.name) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: existingCars, isLoading: loadingCars, refetch: refetchCars } = useQuery({
    queryKey: ['admin-all-cars', brandFilter],
    queryFn: async () => {
      let q = supabase.from('cars').select('id, slug, name, brand, body_type, price_range, price_numeric, is_hot, is_new, is_upcoming, is_bestseller, is_discontinued, updated_at').order('brand').order('name');
      if (brandFilter !== 'All') q = q.eq('brand', brandFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cars').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-cars'] });
      invalidateCarQueries(queryClient);
      toast.success('Car deleted');
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const filteredExisting = existingCars?.filter(c =>
    !searchFilter || c.name.toLowerCase().includes(searchFilter.toLowerCase()) || c.slug.toLowerCase().includes(searchFilter.toLowerCase()) || c.brand.toLowerCase().includes(searchFilter.toLowerCase())
  ) || [];

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)]">
      <div className={cn("flex-1 flex flex-col bg-background", previewOpen ? "max-w-[55%]" : "w-full")}>
      {/* Top Nav */}
      <div className="border-b bg-muted/30 px-4 py-2 flex items-center gap-2">
        {[
          { id: 'upload' as const, label: 'Upload Car', icon: Plus },
          { id: 'bulk' as const, label: 'Bulk CSV/Excel', icon: Car },
          { id: 'manage' as const, label: 'Manage Cars', icon: Database },
          { id: 'scraper' as const, label: 'URL Scraper', icon: Globe },
        ].map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent"
            )}>
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
        {activeTab === 'manage' && (
          <Badge variant="outline" className="ml-auto text-[10px] h-5">{filteredExisting.length} cars in database</Badge>
        )}
        <div className="ml-auto">
          <PreviewToggleButton isOpen={previewOpen} onToggle={() => setPreviewOpen(!previewOpen)} />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'upload' && <CarUploadWizard />}

      {activeTab === 'bulk' && <BulkCSVUpload />}

      {activeTab === 'scraper' && (
        <div className="flex-1 overflow-auto p-4"><CarDatabaseScraper /></div>
      )}

      {activeTab === 'manage' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Search by name, brand, or slug..." className="pl-9 h-9" />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All Brands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Brands</SelectItem>
                {(dbBrands || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9" onClick={() => refetchCars()}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b sticky top-0">
                  <th className="text-left px-4 py-2 font-medium text-xs">#</th>
                  <th className="text-left px-4 py-2 font-medium text-xs">Car Name</th>
                  <th className="text-left px-4 py-2 font-medium text-xs">Brand</th>
                  <th className="text-left px-4 py-2 font-medium text-xs">Body Type</th>
                  <th className="text-left px-4 py-2 font-medium text-xs">Price Range</th>
                  <th className="text-left px-4 py-2 font-medium text-xs">Flags</th>
                  <th className="text-left px-4 py-2 font-medium text-xs">Slug</th>
                  <th className="text-right px-4 py-2 font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingCars ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading cars...</td></tr>
                ) : filteredExisting.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No cars found. Use "Upload Car" to add one.</td></tr>
                ) : filteredExisting.map((car, i) => (
                  <tr key={car.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-semibold">{car.name}</td>
                    <td className="px-4 py-2.5">{car.brand}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{car.body_type}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{car.price_range || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {car.is_hot && <span title="Hot">🔥</span>}
                        {car.is_new && <span title="New">✨</span>}
                        {car.is_upcoming && <span title="Upcoming">🚀</span>}
                        {car.is_bestseller && <span title="Bestseller">⭐</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{car.slug}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`/cars/${car.slug}`, '_blank')}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm(`Delete ${car.name}? This will remove all variants, images, colors & specs.`)) deleteMutation.mutate(car.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
