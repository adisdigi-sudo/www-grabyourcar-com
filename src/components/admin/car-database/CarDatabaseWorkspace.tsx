import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import {
  Plus, Trash2, Save, X, Copy, CheckCircle2, AlertTriangle,
  Car, FileSpreadsheet, Eye, EyeOff, Gauge, ChevronDown, ChevronRight,
  Image as ImageIcon, Palette, Layers, Shield, Ruler, Sparkles,
  FileText, Tag, Star, Upload, Search, RefreshCw, Download,
  ThumbsUp, ThumbsDown, Settings2, Globe, Check, ChevronsUpDown,
  FileUp, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CarDatabaseScraper } from "./CarDatabaseScraper";

// ─── Constants ───
const BODY_TYPES = ['Hatchback','Sedan','Compact SUV','Mid-Size SUV','Full-Size SUV','MPV','MUV','Coupe','Convertible','Pickup','Electric','Luxury','Crossover'];
const FUEL_OPTIONS = ['Petrol','Diesel','Electric','Hybrid','CNG','LPG'];
const TRANSMISSION_OPTIONS = ['Manual','Automatic','AMT','CVT','DCT','iMT'];

// ─── Sub-item types ───
interface CarImage { url: string; alt_text: string; is_primary: boolean; file?: File }
interface CarColor { name: string; hex_code: string; image_url: string; file?: File }
interface CarVariant {
  name: string; price: string; price_numeric: string; fuel_type: string; transmission: string;
  ex_showroom: string; rto: string; insurance: string; tcs: string; on_road_price: string;
  features: string;
}
interface CarSpec { category: string; label: string; value: string }
interface CarOffer { title: string; description: string; discount: string; offer_type: string; valid_till: string }

interface CarRow {
  id: string;
  db_id?: string; // existing DB id for update/replace
  name: string; brand: string; slug: string; body_type: string;
  price_range: string; price_numeric: string; original_price: string; discount: string;
  tagline: string; overview: string; availability: boolean; launch_date: string;
  fuel_types: string[]; transmission_types: string[];
  engine_displacement: string; engine_power: string; engine_torque: string; engine_mileage: string;
  is_hot: boolean; is_new: boolean; is_upcoming: boolean; is_bestseller: boolean;
  images: CarImage[];
  colors: CarColor[];
  variants: CarVariant[];
  specifications: CarSpec[];
  offers: CarOffer[];
  pros: string; cons: string; key_highlights: string; competitors: string;
  brochure_url: string;
  status: 'draft' | 'saving' | 'saved' | 'error' | 'existing';
  errorMsg?: string;
}

const generateSlug = (brand: string, name: string) =>
  `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const emptyRow = (): CarRow => ({
  id: crypto.randomUUID(), name: "", brand: "", slug: "", body_type: "Hatchback",
  price_range: "", price_numeric: "", original_price: "", discount: "",
  tagline: "", overview: "", availability: true, launch_date: "",
  fuel_types: ["Petrol"], transmission_types: ["Manual"],
  engine_displacement: "", engine_power: "", engine_torque: "", engine_mileage: "",
  is_hot: false, is_new: true, is_upcoming: false, is_bestseller: false,
  images: [], colors: [], variants: [], specifications: [], offers: [],
  pros: "", cons: "", key_highlights: "", competitors: "", brochure_url: "",
  status: 'draft',
});

const autoCalcOnRoad = (exShowroom: string) => {
  const ex = Number(exShowroom) || 0;
  if (ex === 0) return { rto: '', insurance: '', tcs: '', on_road_price: '' };
  const rto = Math.round(ex * 0.08);
  const insurance = Math.round(ex * 0.035);
  const tcs = ex > 1000000 ? Math.round(ex * 0.01) : 0;
  const onRoad = ex + rto + insurance + tcs + 500 + 1000 + 15000;
  return { rto: String(rto), insurance: String(insurance), tcs: String(tcs), on_road_price: String(onRoad) };
};

const emptyVariant = (): CarVariant => ({
  name: "", price: "", price_numeric: "", fuel_type: "Petrol", transmission: "Manual",
  ex_showroom: "", rto: "", insurance: "", tcs: "", on_road_price: "", features: "",
});
const emptyColor = (): CarColor => ({ name: "", hex_code: "#000000", image_url: "" });
const emptyImage = (): CarImage => ({ url: "", alt_text: "", is_primary: false });
const emptyOffer = (): CarOffer => ({ title: "", description: "", discount: "", offer_type: "cashback", valid_till: "" });

const SPEC_TEMPLATES: { category: string; label: string; placeholder: string }[] = [
  { category: 'engine', label: 'Displacement', placeholder: '1197 cc' },
  { category: 'engine', label: 'Max Power', placeholder: '88.7 bhp' },
  { category: 'engine', label: 'Max Torque', placeholder: '113 Nm' },
  { category: 'engine', label: 'No. of Cylinders', placeholder: '4' },
  { category: 'dimensions', label: 'Length', placeholder: '3995 mm' },
  { category: 'dimensions', label: 'Width', placeholder: '1735 mm' },
  { category: 'dimensions', label: 'Height', placeholder: '1515 mm' },
  { category: 'dimensions', label: 'Wheelbase', placeholder: '2520 mm' },
  { category: 'dimensions', label: 'Ground Clearance', placeholder: '163 mm' },
  { category: 'dimensions', label: 'Boot Space', placeholder: '268 L' },
  { category: 'dimensions', label: 'Kerb Weight', placeholder: '875 kg' },
  { category: 'performance', label: 'Top Speed', placeholder: '180 kmph' },
  { category: 'performance', label: '0-100 kmph', placeholder: '11.5 sec' },
  { category: 'performance', label: 'Mileage (ARAI)', placeholder: '23.2 kmpl' },
  { category: 'performance', label: 'Fuel Tank', placeholder: '37 L' },
  { category: 'features', label: 'Infotainment', placeholder: '9-inch Touchscreen' },
  { category: 'features', label: 'Sunroof', placeholder: 'Electric Sunroof' },
  { category: 'features', label: 'Steering', placeholder: 'Power (EPS)' },
  { category: 'features', label: 'Climate Control', placeholder: 'Auto AC' },
  { category: 'features', label: 'Cruise Control', placeholder: 'Yes' },
  { category: 'safety', label: 'Airbags', placeholder: '6 Airbags' },
  { category: 'safety', label: 'ABS', placeholder: 'Yes with EBD' },
  { category: 'safety', label: 'NCAP Rating', placeholder: '5 Star' },
  { category: 'safety', label: 'Parking Sensors', placeholder: 'Front & Rear' },
  { category: 'safety', label: 'Camera', placeholder: '360° View' },
];

const SUB_SECTIONS = [
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'variants', label: 'Variants & Pricing', icon: Layers },
  { id: 'specs', label: 'Specifications', icon: Gauge },
  { id: 'offers', label: 'Offers', icon: Tag },
  { id: 'content', label: 'Pros/Cons/Highlights', icon: Star },
  { id: 'overview', label: 'Overview & Brochure', icon: FileText },
];

const cellBase = "h-9 border-0 rounded-none bg-transparent text-xs focus:bg-accent/40 focus:ring-1 focus:ring-primary/60 transition-colors";

// ─── Searchable Brand Combobox ───
const BrandCombobox = ({ value, onChange, brands }: { value: string; onChange: (v: string) => void; brands: string[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn(cellBase, "w-full justify-between px-2 font-normal")}>
          <span className="truncate">{value || "Select brand..."}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search brand..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>No brand found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {brands.map(b => (
                <CommandItem key={b} value={b} onSelect={() => { onChange(b); setOpen(false); }} className="text-xs">
                  <Check className={cn("mr-2 h-3 w-3", value === b ? "opacity-100" : "opacity-0")} />
                  {b}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ─── Searchable Select for Body Type ───
const SearchableSelect = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn(cellBase, "w-full justify-between px-2 font-normal")}>
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search...`} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>Not found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {options.map(o => (
                <CommandItem key={o} value={o} onSelect={() => { onChange(o); setOpen(false); }} className="text-xs">
                  <Check className={cn("mr-2 h-3 w-3", value === o ? "opacity-100" : "opacity-0")} />
                  {o}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ═══════════════════════════════════════════════
// ─── Main Component ───
// ═══════════════════════════════════════════════
export const CarDatabaseWorkspace = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'manage' | 'scraper'>('manage');
  const [rows, setRows] = useState<CarRow[]>([emptyRow()]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Record<number, string>>({});
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("All");
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  // Fetch brands from DB for searchable dropdown
  const { data: dbBrands } = useQuery({
    queryKey: ['car-brands-names'],
    queryFn: async () => {
      const { data } = await supabase.from('car_brands').select('name').eq('is_active', true).order('sort_order');
      return data?.map(b => b.name) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const brandOptions = dbBrands || [];

  // Fetch existing cars
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

  const filteredExisting = existingCars?.filter(c =>
    !searchFilter || c.name.toLowerCase().includes(searchFilter.toLowerCase()) || c.slug.toLowerCase().includes(searchFilter.toLowerCase()) || c.brand.toLowerCase().includes(searchFilter.toLowerCase())
  ) || [];

  // ─── Row helpers ───
  const updateRow = useCallback((idx: number, field: string, value: any) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value, status: (r.status === 'existing' ? 'draft' : r.status === 'saved' ? 'draft' : r.status) as any };
      if (field === 'name' || field === 'brand') {
        updated.slug = generateSlug(field === 'brand' ? value : r.brand, field === 'name' ? value : r.name);
      }
      return updated;
    }));
  }, []);

  const toggleArrayValue = useCallback((idx: number, field: 'fuel_types' | 'transmission_types', val: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const arr = r[field];
      return { ...r, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val], status: 'draft' as any };
    }));
  }, []);

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx: number) => { if (rows.length > 1) setRows(prev => prev.filter((_, i) => i !== idx)); };
  const duplicateRow = (idx: number) => {
    const s = rows[idx];
    setRows(prev => [...prev.slice(0, idx + 1), { ...s, id: crypto.randomUUID(), db_id: undefined, name: s.name + ' (copy)', slug: generateSlug(s.brand, s.name + ' copy'), status: 'draft' }, ...prev.slice(idx + 1)]);
  };

  const toggleExpand = (idx: number) => {
    setExpandedRows(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else { s.add(idx); if (!expandedSections[idx]) setExpandedSections(p => ({ ...p, [idx]: 'variants' })); }
      return s;
    });
  };

  const updateSubArray = <T,>(rowIdx: number, field: keyof CarRow, items: T[]) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [field]: items, status: 'draft' as any } : r));
  };

  // ─── Upload helper ───
  const uploadFile = async (file: File, carSlug: string, prefix: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${carSlug}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('car-images').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('car-images').getPublicUrl(path);
    return publicUrl;
  };

  // ─── Delete existing car ───
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

  // ─── Save (insert or upsert/replace) ───
  const saveRowMutation = useMutation({
    mutationFn: async ({ row, index }: { row: CarRow; index: number }) => {
      if (!row.name.trim() || !row.brand.trim()) throw new Error('Name and Brand are required');
      const slug = row.slug || generateSlug(row.brand, row.name);

      // If db_id exists, delete old data first (replace mode)
      if (row.db_id) {
        await Promise.all([
          supabase.from('car_images').delete().eq('car_id', row.db_id),
          supabase.from('car_colors').delete().eq('car_id', row.db_id),
          supabase.from('car_variants').delete().eq('car_id', row.db_id),
          supabase.from('car_specifications').delete().eq('car_id', row.db_id),
          supabase.from('car_offers').delete().eq('car_id', row.db_id),
        ]);
        // Update main car record
        const { error } = await supabase.from('cars').update({
          slug, name: row.name.trim(), brand: row.brand, body_type: row.body_type,
          price_range: row.price_range || null, price_numeric: row.price_numeric ? Number(row.price_numeric) : null,
          original_price: row.original_price || null, discount: row.discount || null,
          tagline: row.tagline || null, overview: row.overview || null,
          availability: row.availability ? 'Available' : 'Coming Soon',
          launch_date: row.launch_date || null,
          fuel_types: row.fuel_types.length ? row.fuel_types : null,
          transmission_types: row.transmission_types.length ? row.transmission_types : null,
          is_hot: row.is_hot, is_new: row.is_new, is_upcoming: row.is_upcoming, is_bestseller: row.is_bestseller,
          key_highlights: row.key_highlights ? row.key_highlights.split('\n').filter(Boolean) : null,
          pros: row.pros ? row.pros.split('\n').filter(Boolean) : null,
          cons: row.cons ? row.cons.split('\n').filter(Boolean) : null,
          competitors: row.competitors ? row.competitors.split(',').map(s => s.trim()).filter(Boolean) : null,
          brochure_url: row.brochure_url || null,
        }).eq('id', row.db_id);
        if (error) throw error;
        var carId = row.db_id;
      } else {
        // Check if slug already exists - replace
        const { data: existing } = await supabase.from('cars').select('id').eq('slug', slug).maybeSingle();
        if (existing) {
          await Promise.all([
            supabase.from('car_images').delete().eq('car_id', existing.id),
            supabase.from('car_colors').delete().eq('car_id', existing.id),
            supabase.from('car_variants').delete().eq('car_id', existing.id),
            supabase.from('car_specifications').delete().eq('car_id', existing.id),
            supabase.from('car_offers').delete().eq('car_id', existing.id),
          ]);
          const { error } = await supabase.from('cars').update({
            name: row.name.trim(), brand: row.brand, body_type: row.body_type,
            price_range: row.price_range || null, price_numeric: row.price_numeric ? Number(row.price_numeric) : null,
            original_price: row.original_price || null, discount: row.discount || null,
            tagline: row.tagline || null, overview: row.overview || null,
            availability: row.availability ? 'Available' : 'Coming Soon',
            launch_date: row.launch_date || null,
            fuel_types: row.fuel_types.length ? row.fuel_types : null,
            transmission_types: row.transmission_types.length ? row.transmission_types : null,
            is_hot: row.is_hot, is_new: row.is_new, is_upcoming: row.is_upcoming, is_bestseller: row.is_bestseller,
            key_highlights: row.key_highlights ? row.key_highlights.split('\n').filter(Boolean) : null,
            pros: row.pros ? row.pros.split('\n').filter(Boolean) : null,
            cons: row.cons ? row.cons.split('\n').filter(Boolean) : null,
            competitors: row.competitors ? row.competitors.split(',').map(s => s.trim()).filter(Boolean) : null,
            brochure_url: row.brochure_url || null,
          }).eq('id', existing.id);
          if (error) throw error;
          var carId = existing.id;
        } else {
          const { data: carData, error } = await supabase.from('cars').insert([{
            slug, name: row.name.trim(), brand: row.brand, body_type: row.body_type,
            price_range: row.price_range || null, price_numeric: row.price_numeric ? Number(row.price_numeric) : null,
            original_price: row.original_price || null, discount: row.discount || null,
            tagline: row.tagline || null, overview: row.overview || null,
            availability: row.availability ? 'Available' : 'Coming Soon',
            launch_date: row.launch_date || null,
            fuel_types: row.fuel_types.length ? row.fuel_types : null,
            transmission_types: row.transmission_types.length ? row.transmission_types : null,
            is_hot: row.is_hot, is_new: row.is_new, is_upcoming: row.is_upcoming, is_bestseller: row.is_bestseller,
            key_highlights: row.key_highlights ? row.key_highlights.split('\n').filter(Boolean) : null,
            pros: row.pros ? row.pros.split('\n').filter(Boolean) : null,
            cons: row.cons ? row.cons.split('\n').filter(Boolean) : null,
            competitors: row.competitors ? row.competitors.split(',').map(s => s.trim()).filter(Boolean) : null,
            brochure_url: row.brochure_url || null,
          }]).select('id').single();
          if (error) throw error;
          var carId = carData.id;
        }
      }

      // Insert sub-data
      if (row.images.length > 0) {
        const imgs = [];
        for (let idx = 0; idx < row.images.length; idx++) {
          const img = row.images[idx];
          let finalUrl = img.url.trim();
          if (img.file) finalUrl = await uploadFile(img.file, slug, `gallery-${idx}`);
          if (finalUrl) imgs.push({ car_id: carId, url: finalUrl, alt_text: img.alt_text || row.name, is_primary: img.is_primary, sort_order: idx + 1 });
        }
        if (imgs.length) await supabase.from('car_images').insert(imgs);
      }

      if (row.colors.length > 0) {
        const cols = [];
        for (let idx = 0; idx < row.colors.length; idx++) {
          const c = row.colors[idx];
          let imgUrl = c.image_url || '';
          if (c.file) imgUrl = await uploadFile(c.file, slug, `color-${c.name.replace(/\s+/g, '-').toLowerCase()}`);
          if (c.name.trim()) cols.push({ car_id: carId, name: c.name, hex_code: c.hex_code, image_url: imgUrl || null, sort_order: idx + 1 });
        }
        if (cols.length) await supabase.from('car_colors').insert(cols);
      }

      if (row.variants.length > 0) {
        const vars = row.variants.filter(v => v.name.trim()).map((v, idx) => ({
          car_id: carId, name: v.name, price: v.price || v.ex_showroom,
          price_numeric: v.price_numeric ? Number(v.price_numeric) : (v.ex_showroom ? Number(v.ex_showroom) : null),
          fuel_type: v.fuel_type || null, transmission: v.transmission || null,
          ex_showroom: v.ex_showroom ? Number(v.ex_showroom) : null,
          rto: v.rto ? Number(v.rto) : null, insurance: v.insurance ? Number(v.insurance) : null,
          tcs: v.tcs ? Number(v.tcs) : null, on_road_price: v.on_road_price ? Number(v.on_road_price) : null,
          features: v.features ? v.features.split(',').map(s => s.trim()).filter(Boolean) : null,
          sort_order: idx + 1,
        }));
        if (vars.length) await supabase.from('car_variants').insert(vars);
      }

      const allSpecs: { car_id: string; category: string; label: string; value: string; sort_order: number }[] = [];
      if (row.engine_displacement) allSpecs.push({ car_id: carId, category: 'engine', label: 'Displacement', value: `${row.engine_displacement} cc`, sort_order: 1 });
      if (row.engine_power) allSpecs.push({ car_id: carId, category: 'engine', label: 'Max Power', value: `${row.engine_power} bhp`, sort_order: 2 });
      if (row.engine_torque) allSpecs.push({ car_id: carId, category: 'engine', label: 'Max Torque', value: `${row.engine_torque} Nm`, sort_order: 3 });
      if (row.engine_mileage) allSpecs.push({ car_id: carId, category: 'performance', label: 'Mileage', value: `${row.engine_mileage} kmpl`, sort_order: 1 });
      row.specifications.filter(s => s.value.trim()).forEach((s, idx) => {
        allSpecs.push({ car_id: carId, category: s.category, label: s.label, value: s.value, sort_order: idx + 10 });
      });
      if (allSpecs.length) await supabase.from('car_specifications').insert(allSpecs);

      if (row.offers.length > 0) {
        const offs = row.offers.filter(o => o.title.trim()).map((o, idx) => ({
          car_id: carId, title: o.title, description: o.description || null,
          discount: o.discount, offer_type: o.offer_type, valid_till: o.valid_till || null,
          is_active: true, sort_order: idx + 1,
        }));
        if (offs.length) await supabase.from('car_offers').insert(offs);
      }

      return index;
    },
    onSuccess: (index) => {
      setRows(prev => prev.map((r, i) => i === index ? { ...r, status: 'saved' } : r));
      invalidateCarQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin-all-cars'] });
      toast.success('Car saved successfully!');
    },
    onError: (error: Error, variables) => {
      setRows(prev => prev.map((r, i) => i === variables.index ? { ...r, status: 'error', errorMsg: error.message } : r));
      toast.error(error.message);
    },
  });

  const saveAll = () => {
    const valid = rows.filter(r => r.name.trim() && r.brand.trim() && r.status === 'draft');
    if (!valid.length) { toast.error('No valid unsaved rows'); return; }
    valid.forEach(row => {
      const idx = rows.findIndex(r => r.id === row.id);
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, status: 'saving' } : r));
      saveRowMutation.mutate({ row, index: idx });
    });
  };

  // ─── CSV Export ───
  const exportCSV = () => {
    if (!filteredExisting.length) return;
    const headers = ['Name','Brand','Body Type','Price Range','Price Numeric','Hot','New','Upcoming','Bestseller','Slug'];
    const csvRows = filteredExisting.map(c => [c.name, c.brand, c.body_type, c.price_range, c.price_numeric, c.is_hot, c.is_new, c.is_upcoming, c.is_bestseller, c.slug]);
    const csv = [headers.join(','), ...csvRows.map(r => r.map(v => `"${v ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cars-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Sample CSV download ───
  const downloadSampleCSV = () => {
    const headers = ['name','brand','body_type','price_range','price_numeric','original_price','discount','tagline','fuel_types','transmission_types','engine_cc','engine_bhp','engine_nm','mileage','is_hot','is_new','is_upcoming','is_bestseller'];
    const sample1 = ['Swift','Maruti Suzuki','Hatchback','₹6.49L-₹9.64L','649000','','','Play Bold','Petrol','Manual|AMT','1197','88.7','113','23.2','true','true','false','true'];
    const sample2 = ['Creta','Hyundai','Mid-Size SUV','₹11L-₹20.15L','1099900','','₹25000','The Ultimate SUV','Petrol|Diesel|Electric','Manual|Automatic|DCT','1497','113','144','17.4','true','false','false','true'];
    const csv = [headers.join(','), sample1.map(v => `"${v}"`).join(','), sample2.map(v => `"${v}"`).join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'car-data-sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── CSV Upload & Parse ───
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error('CSV must have header + data rows'); return; }
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const newRows: CarRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
        const get = (key: string) => vals[headers.indexOf(key)] || '';
        const row = emptyRow();
        row.name = get('name');
        row.brand = get('brand');
        row.slug = generateSlug(row.brand, row.name);
        row.body_type = get('body_type') || 'Hatchback';
        row.price_range = get('price_range');
        row.price_numeric = get('price_numeric');
        row.original_price = get('original_price');
        row.discount = get('discount');
        row.tagline = get('tagline');
        row.fuel_types = get('fuel_types') ? get('fuel_types').split('|') : ['Petrol'];
        row.transmission_types = get('transmission_types') ? get('transmission_types').split('|') : ['Manual'];
        row.engine_displacement = get('engine_cc');
        row.engine_power = get('engine_bhp');
        row.engine_torque = get('engine_nm');
        row.engine_mileage = get('mileage');
        row.is_hot = get('is_hot') === 'true';
        row.is_new = get('is_new') === 'true';
        row.is_upcoming = get('is_upcoming') === 'true';
        row.is_bestseller = get('is_bestseller') === 'true';
        if (row.name) newRows.push(row);
      }
      if (newRows.length) {
        setRows(prev => [...prev.filter(r => r.name.trim()), ...newRows]);
        toast.success(`Imported ${newRows.length} cars from CSV`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const savedCount = rows.filter(r => r.status === 'saved').length;
  const draftCount = rows.filter(r => r.status === 'draft' && r.name.trim()).length;

  const subDataCount = (row: CarRow) => row.images.length + row.colors.length + row.variants.length + row.specifications.length + row.offers.length;

  // ═══ RENDER ═══
  return (
    <div className="flex flex-col h-full bg-background">
      {/* ═══ Top Nav ═══ */}
      <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setActiveTab('manage')} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all", activeTab === 'manage' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent")}>
            <Database className="h-3.5 w-3.5" />Add / Manage Cars
          </button>
          <button type="button" onClick={() => setActiveTab('scraper')} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all", activeTab === 'scraper' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent")}>
            <Globe className="h-3.5 w-3.5" />URL Scraper
          </button>
        </div>
        {activeTab === 'manage' && (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7" onClick={downloadSampleCSV}><Download className="h-3 w-3" />Sample CSV</Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7 pointer-events-none"><FileUp className="h-3 w-3" />Upload CSV</Button>
              <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
            </label>
            <Button variant="outline" size="sm" className="gap-1 text-[11px] h-7" onClick={exportCSV}><Download className="h-3 w-3" />Export</Button>
          </div>
        )}
      </div>

      {activeTab === 'scraper' ? (
        <div className="flex-1 overflow-auto p-4"><CarDatabaseScraper /></div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ═══ Entry Toolbar ═══ */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-gradient-to-r from-muted/60 to-muted/30">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Car Data Entry</span>
              <div className="h-5 w-px bg-border" />
              {savedCount > 0 && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] h-5"><CheckCircle2 className="h-2.5 w-2.5" />{savedCount}</Badge>}
              {draftCount > 0 && <Badge variant="secondary" className="gap-1 text-[10px] h-5">{draftCount} pending</Badge>}
              <Badge variant="outline" className="text-muted-foreground font-mono text-[10px] h-5">{rows.length} rows</Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={addRow} className="gap-1 text-[11px] h-7"><Plus className="h-3 w-3" />Row</Button>
              <Button size="sm" onClick={saveAll} disabled={draftCount === 0} className="gap-1 text-[11px] h-7 bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="h-3 w-3" />Save All ({draftCount})</Button>
            </div>
          </div>

          {/* ═══ Entry Grid ═══ */}
          <ScrollArea className="flex-1">
            <div className="min-w-[2200px]">
              {/* Header */}
              <div className="flex items-center border-b bg-muted/50 sticky top-0 z-20 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                <div className="w-10 text-center px-1 py-1.5 border-r border-border/40">#</div>
                <div className="w-9 border-r border-border/40" />
                <div className="w-16 px-1 py-1.5 border-r border-border/40">Status</div>
                <div className="w-40 px-1 py-1.5 border-r border-border/40">Car Name <span className="text-red-400">•</span></div>
                <div className="w-40 px-1 py-1.5 border-r border-border/40">Brand <span className="text-red-400">•</span></div>
                <div className="w-36 px-1 py-1.5 border-r border-border/40">Body Type</div>
                <div className="w-32 px-1 py-1.5 border-r border-border/40">Price Range</div>
                <div className="w-28 px-1 py-1.5 border-r border-border/40">Ex-Show ₹</div>
                <div className="w-24 px-1 py-1.5 border-r border-border/40">Discount</div>
                <div className="w-16 px-1 py-1.5 border-r border-border/40">Avail.</div>
                <div className="w-28 px-1 py-1.5 border-r border-border/40">Launch</div>
                <div className="w-40 px-1 py-1.5 border-r border-border/40">Tagline</div>
                <div className="w-44 px-1 py-1.5 border-r border-border/40">Fuel</div>
                <div className="w-44 px-1 py-1.5 border-r border-border/40">Transmission</div>
                <div className="w-20 px-1 py-1.5 border-r border-border/40">CC</div>
                <div className="w-20 px-1 py-1.5 border-r border-border/40">BHP</div>
                <div className="w-20 px-1 py-1.5 border-r border-border/40">Nm</div>
                <div className="w-20 px-1 py-1.5 border-r border-border/40">kmpl</div>
                <div className="w-32 px-1 py-1.5 border-r border-border/40">Flags</div>
                <div className="w-20 px-1 py-1.5 border-r border-border/40">Data</div>
                <div className="w-24 px-1 py-1.5">Actions</div>
              </div>

              {/* Rows */}
              {rows.map((row, ri) => {
                const isExpanded = expandedRows.has(ri);
                const activeSection = expandedSections[ri] || 'variants';
                return (
                  <div key={row.id} className="border-b border-border/30">
                    <div className={cn(
                      "flex items-stretch transition-all group/row",
                      row.status === 'saved' && "bg-emerald-50/30 dark:bg-emerald-950/10",
                      row.status === 'error' && "bg-red-50/30 dark:bg-red-950/10",
                      row.status === 'saving' && "bg-amber-50/30 animate-pulse",
                    )}>
                      <div className="w-10 shrink-0 flex items-center justify-center border-r border-border/40 text-[10px] font-mono text-muted-foreground bg-muted/30">{ri + 1}</div>
                      <div className="w-9 shrink-0 flex items-center justify-center border-r border-border/40">
                        <button type="button" onClick={() => toggleExpand(ri)} className="p-1 rounded hover:bg-accent">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                      <div className="w-16 shrink-0 flex items-center justify-center border-r border-border/40">
                        {row.status === 'draft' && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">Draft</Badge>}
                        {row.status === 'saving' && <Badge className="text-[8px] px-1 py-0 h-4 bg-amber-500">...</Badge>}
                        {row.status === 'saved' && <Badge className="text-[8px] px-1 py-0 h-4 bg-emerald-600 text-white">✓</Badge>}
                        {row.status === 'error' && <Badge variant="destructive" className="text-[8px] px-1 py-0 h-4" title={row.errorMsg}>✗</Badge>}
                      </div>
                      <div className="w-40 shrink-0 border-r border-border/40 p-px">
                        <Input value={row.name} onChange={e => updateRow(ri, 'name', e.target.value)} placeholder="Swift" className={cn(cellBase, "font-semibold")} />
                      </div>
                      <div className="w-40 shrink-0 border-r border-border/40 p-px">
                        <BrandCombobox value={row.brand} onChange={v => updateRow(ri, 'brand', v)} brands={brandOptions} />
                      </div>
                      <div className="w-36 shrink-0 border-r border-border/40 p-px">
                        <SearchableSelect value={row.body_type} onChange={v => updateRow(ri, 'body_type', v)} options={BODY_TYPES} placeholder="Body type" />
                      </div>
                      <div className="w-32 shrink-0 border-r border-border/40 p-px">
                        <Input value={row.price_range} onChange={e => updateRow(ri, 'price_range', e.target.value)} placeholder="₹6.5L-₹9.8L" className={cellBase} />
                      </div>
                      <div className="w-28 shrink-0 border-r border-border/40 p-px">
                        <Input value={row.price_numeric} onChange={e => updateRow(ri, 'price_numeric', e.target.value.replace(/[^0-9]/g, ''))} placeholder="650000" className={cn(cellBase, "font-mono")} />
                      </div>
                      <div className="w-24 shrink-0 border-r border-border/40 p-px">
                        <Input value={row.discount} onChange={e => updateRow(ri, 'discount', e.target.value)} placeholder="₹50K" className={cellBase} />
                      </div>
                      <div className="w-16 shrink-0 border-r border-border/40 flex items-center justify-center">
                        <button type="button" onClick={() => updateRow(ri, 'availability', !row.availability)} className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border", row.availability ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" : "bg-muted text-muted-foreground border-border")}>
                          {row.availability ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div className="w-28 shrink-0 border-r border-border/40 p-px">
                        <Input type="date" value={row.launch_date} onChange={e => updateRow(ri, 'launch_date', e.target.value)} className={cellBase} />
                      </div>
                      <div className="w-40 shrink-0 border-r border-border/40 p-px">
                        <Input value={row.tagline} onChange={e => updateRow(ri, 'tagline', e.target.value)} placeholder="Bold. Beautiful." className={cn(cellBase, "italic")} />
                      </div>
                      <div className="w-44 shrink-0 border-r border-border/40 p-0.5 flex flex-wrap gap-[2px] items-center">
                        {FUEL_OPTIONS.map(f => (
                          <button type="button" key={f} onClick={() => toggleArrayValue(ri, 'fuel_types', f)} className={cn("px-1.5 py-px rounded-full text-[8px] font-bold border", row.fuel_types.includes(f) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border/60")}>{f}</button>
                        ))}
                      </div>
                      <div className="w-44 shrink-0 border-r border-border/40 p-0.5 flex flex-wrap gap-[2px] items-center">
                        {TRANSMISSION_OPTIONS.map(t => (
                          <button type="button" key={t} onClick={() => toggleArrayValue(ri, 'transmission_types', t)} className={cn("px-1.5 py-px rounded-full text-[8px] font-bold border", row.transmission_types.includes(t) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border/60")}>{t}</button>
                        ))}
                      </div>
                      <div className="w-20 shrink-0 border-r border-border/40 p-px"><Input value={row.engine_displacement} onChange={e => updateRow(ri, 'engine_displacement', e.target.value)} placeholder="1197" className={cn(cellBase, "font-mono text-center")} /></div>
                      <div className="w-20 shrink-0 border-r border-border/40 p-px"><Input value={row.engine_power} onChange={e => updateRow(ri, 'engine_power', e.target.value)} placeholder="88.7" className={cn(cellBase, "font-mono text-center")} /></div>
                      <div className="w-20 shrink-0 border-r border-border/40 p-px"><Input value={row.engine_torque} onChange={e => updateRow(ri, 'engine_torque', e.target.value)} placeholder="113" className={cn(cellBase, "font-mono text-center")} /></div>
                      <div className="w-20 shrink-0 border-r border-border/40 p-px"><Input value={row.engine_mileage} onChange={e => updateRow(ri, 'engine_mileage', e.target.value)} placeholder="23.2" className={cn(cellBase, "font-mono text-center")} /></div>
                      <div className="w-32 shrink-0 border-r border-border/40 p-0.5 flex gap-0.5 items-center justify-center">
                        {[{ key: 'is_hot', l: '🔥' },{ key: 'is_new', l: '✨' },{ key: 'is_upcoming', l: '🚀' },{ key: 'is_bestseller', l: '⭐' }].map(f => (
                          <button type="button" key={f.key} onClick={() => updateRow(ri, f.key, !(row as any)[f.key])} className={cn("w-6 h-6 rounded flex items-center justify-center text-sm border", (row as any)[f.key] ? "bg-primary/10 border-primary/50" : "border-transparent opacity-30 hover:opacity-60")}>{f.l}</button>
                        ))}
                      </div>
                      <div className="w-20 shrink-0 border-r border-border/40 flex items-center justify-center">
                        {subDataCount(row) > 0 ? <Badge variant="secondary" className="text-[9px] h-4 cursor-pointer" onClick={() => toggleExpand(ri)}>{subDataCount(row)}</Badge> : <span className="text-[9px] text-muted-foreground">—</span>}
                      </div>
                      <div className="w-24 shrink-0 flex items-center justify-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/row:opacity-100" onClick={() => duplicateRow(ri)}><Copy className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/row:opacity-100 text-destructive" onClick={() => removeRow(ri)} disabled={rows.length <= 1}><Trash2 className="h-3 w-3" /></Button>
                        {row.status === 'draft' && row.name.trim() && row.brand.trim() && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" onClick={() => { setRows(prev => prev.map((r, i) => i === ri ? { ...r, status: 'saving' } : r)); saveRowMutation.mutate({ row, index: ri }); }}><Save className="h-3 w-3" /></Button>
                        )}
                      </div>
                    </div>

                    {/* ═══ Expanded Sub-Sections ═══ */}
                    {isExpanded && (
                      <div className="bg-muted/20 border-t border-dashed border-border/50">
                        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border/30 bg-muted/30 overflow-x-auto">
                          {SUB_SECTIONS.map(sec => (
                            <button type="button" key={sec.id} onClick={() => setExpandedSections(p => ({ ...p, [ri]: sec.id }))} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap border", activeSection === sec.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "text-muted-foreground border-transparent hover:bg-accent")}>
                              <sec.icon className="h-3 w-3" />{sec.label}
                              {sec.id === 'variants' && row.variants.length > 0 && <Badge variant="secondary" className="h-3.5 text-[8px] px-1 ml-0.5">{row.variants.length}</Badge>}
                              {sec.id === 'colors' && row.colors.length > 0 && <Badge variant="secondary" className="h-3.5 text-[8px] px-1 ml-0.5">{row.colors.length}</Badge>}
                              {sec.id === 'images' && row.images.length > 0 && <Badge variant="secondary" className="h-3.5 text-[8px] px-1 ml-0.5">{row.images.length}</Badge>}
                            </button>
                          ))}
                        </div>
                        <div className="p-3 max-h-[400px] overflow-y-auto">
                          {/* VARIANTS */}
                          {activeSection === 'variants' && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold">Variants with On-Road Price Breakup</span>
                                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSubArray(ri, 'variants', [...row.variants, emptyVariant()])}><Plus className="h-2.5 w-2.5 mr-1" />Add Variant</Button>
                              </div>
                              {row.variants.length === 0 && <p className="text-[11px] text-muted-foreground italic">No variants. Click "Add Variant" — enter ex-showroom price to auto-calculate RTO, insurance, TCS, on-road price.</p>}
                              {row.variants.length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[10px] border-collapse">
                                    <thead><tr className="bg-muted/50">
                                      {['Variant','Price Label','Ex-Showroom ₹','RTO','Insurance','TCS','On-Road ₹','Fuel','Trans.','Features',''].map(h => <th key={h} className="px-1.5 py-1 text-left font-bold text-muted-foreground border border-border/40 whitespace-nowrap">{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                      {row.variants.map((v, vi) => (
                                        <tr key={vi} className="hover:bg-accent/30">
                                          <td className="border border-border/40 p-px"><Input value={v.name} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], name: e.target.value }; updateSubArray(ri, 'variants', vs); }} placeholder="LXi" className="h-6 text-[10px] border-0" /></td>
                                          <td className="border border-border/40 p-px"><Input value={v.price} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], price: e.target.value }; updateSubArray(ri, 'variants', vs); }} placeholder="₹6.49L" className="h-6 text-[10px] border-0" /></td>
                                          <td className="border border-border/40 p-px"><Input value={v.ex_showroom} onChange={e => { const val = e.target.value.replace(/\D/g,''); const calc = autoCalcOnRoad(val); const vs = [...row.variants]; vs[vi] = { ...vs[vi], ex_showroom: val, price_numeric: val, ...calc }; updateSubArray(ri, 'variants', vs); }} placeholder="649000" className="h-6 text-[10px] border-0 font-mono" /></td>
                                          <td className="border border-border/40 p-px"><Input value={v.rto} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], rto: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} className="h-6 text-[10px] border-0 font-mono" /></td>
                                          <td className="border border-border/40 p-px"><Input value={v.insurance} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], insurance: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} className="h-6 text-[10px] border-0 font-mono" /></td>
                                          <td className="border border-border/40 p-px"><Input value={v.tcs} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], tcs: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} className="h-6 text-[10px] border-0 font-mono" /></td>
                                          <td className="border border-border/40 p-px"><Input value={v.on_road_price} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], on_road_price: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} className="h-6 text-[10px] border-0 font-mono font-bold" /></td>
                                          <td className="border border-border/40 p-px">
                                            <Select value={v.fuel_type} onValueChange={val => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], fuel_type: val }; updateSubArray(ri, 'variants', vs); }}>
                                              <SelectTrigger className="h-6 text-[10px] border-0"><SelectValue /></SelectTrigger>
                                              <SelectContent>{FUEL_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                            </Select>
                                          </td>
                                          <td className="border border-border/40 p-px">
                                            <Select value={v.transmission} onValueChange={val => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], transmission: val }; updateSubArray(ri, 'variants', vs); }}>
                                              <SelectTrigger className="h-6 text-[10px] border-0"><SelectValue /></SelectTrigger>
                                              <SelectContent>{TRANSMISSION_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                            </Select>
                                          </td>
                                          <td className="border border-border/40 p-px"><Input value={v.features} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], features: e.target.value }; updateSubArray(ri, 'variants', vs); }} placeholder="AC, ABS, Airbags" className="h-6 text-[10px] border-0" /></td>
                                          <td className="border border-border/40 p-px text-center"><Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => updateSubArray(ri, 'variants', row.variants.filter((_, j) => j !== vi))}><Trash2 className="h-2.5 w-2.5" /></Button></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                          {/* COLORS */}
                          {activeSection === 'colors' && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold">Colors (Hex + Color-wise Car Image)</span>
                                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSubArray(ri, 'colors', [...row.colors, emptyColor()])}><Plus className="h-2.5 w-2.5 mr-1" />Add Color</Button>
                              </div>
                              {row.colors.length === 0 && <p className="text-[11px] text-muted-foreground italic">No colors. Add each available color with its hex code and a car image in that color.</p>}
                              <div className="grid grid-cols-1 gap-1.5">
                                {row.colors.map((color, ci) => (
                                  <div key={ci} className="flex items-center gap-2 bg-background rounded-md border p-1.5">
                                    <input type="color" value={color.hex_code} onChange={e => { const cols = [...row.colors]; cols[ci] = { ...cols[ci], hex_code: e.target.value }; updateSubArray(ri, 'colors', cols); }} className="w-8 h-7 rounded border cursor-pointer shrink-0" />
                                    <Input value={color.name} onChange={e => { const cols = [...row.colors]; cols[ci] = { ...cols[ci], name: e.target.value }; updateSubArray(ri, 'colors', cols); }} placeholder="Napoli Black" className="h-7 text-[10px] w-36" />
                                    <Input value={color.hex_code} onChange={e => { const cols = [...row.colors]; cols[ci] = { ...cols[ci], hex_code: e.target.value }; updateSubArray(ri, 'colors', cols); }} placeholder="#000000" className="h-7 text-[10px] w-24 font-mono" />
                                    {(color.image_url || color.file) && <div className="w-10 h-7 rounded border bg-muted overflow-hidden shrink-0"><img src={color.file ? URL.createObjectURL(color.file) : color.image_url} className="w-full h-full object-cover" alt="" /></div>}
                                    <Input value={color.image_url} onChange={e => { const cols = [...row.colors]; cols[ci] = { ...cols[ci], image_url: e.target.value, file: undefined }; updateSubArray(ri, 'colors', cols); }} placeholder="Image URL or upload →" className="h-7 text-[10px] flex-1" />
                                    <label className="cursor-pointer text-[9px] font-bold px-2 py-1 rounded border border-dashed border-primary/50 text-primary hover:bg-primary/10 whitespace-nowrap flex items-center gap-1">
                                      <Upload className="h-3 w-3" />Upload
                                      <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const cols = [...row.colors]; cols[ci] = { ...cols[ci], file, image_url: '' }; updateSubArray(ri, 'colors', cols); } }} />
                                    </label>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateSubArray(ri, 'colors', row.colors.filter((_, j) => j !== ci))}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* IMAGES */}
                          {activeSection === 'images' && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold">Gallery Images</span>
                                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSubArray(ri, 'images', [...row.images, emptyImage()])}><Plus className="h-2.5 w-2.5 mr-1" />Add Image</Button>
                              </div>
                              {row.images.length === 0 && <p className="text-[11px] text-muted-foreground italic">No images. Add gallery/hero images for the car.</p>}
                              <div className="grid grid-cols-1 gap-1.5">
                                {row.images.map((img, ii) => (
                                  <div key={ii} className="flex items-center gap-2 bg-background rounded-md border p-1.5">
                                    <div className="w-12 h-9 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                      {(img.url || img.file) ? <img src={img.file ? URL.createObjectURL(img.file) : img.url} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </div>
                                    <Input value={img.url} onChange={e => { const imgs = [...row.images]; imgs[ii] = { ...imgs[ii], url: e.target.value, file: undefined }; updateSubArray(ri, 'images', imgs); }} placeholder="URL or upload →" className="h-7 text-[10px] flex-1" />
                                    <label className="cursor-pointer text-[9px] font-bold px-2 py-1 rounded border border-dashed border-primary/50 text-primary hover:bg-primary/10 whitespace-nowrap flex items-center gap-1">
                                      <Upload className="h-3 w-3" />Upload
                                      <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const imgs = [...row.images]; imgs[ii] = { ...imgs[ii], file, url: '' }; updateSubArray(ri, 'images', imgs); } }} />
                                    </label>
                                    <Input value={img.alt_text} onChange={e => { const imgs = [...row.images]; imgs[ii] = { ...imgs[ii], alt_text: e.target.value }; updateSubArray(ri, 'images', imgs); }} placeholder="Alt text" className="h-7 text-[10px] w-28" />
                                    <button type="button" onClick={() => { const imgs = [...row.images]; imgs[ii] = { ...imgs[ii], is_primary: !imgs[ii].is_primary }; updateSubArray(ri, 'images', imgs); }} className={cn("text-[9px] font-bold px-2 py-0.5 rounded border whitespace-nowrap", img.is_primary ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border")}>{img.is_primary ? '★ Hero' : 'Set Hero'}</button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateSubArray(ri, 'images', row.images.filter((_, j) => j !== ii))}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* SPECS */}
                          {activeSection === 'specs' && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold">Full Specifications</span>
                                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                                  const toAdd = SPEC_TEMPLATES.filter(t => !row.specifications.some(s => s.category === t.category && s.label === t.label)).map(t => ({ category: t.category, label: t.label, value: '' }));
                                  if (toAdd.length) updateSubArray(ri, 'specifications', [...row.specifications, ...toAdd]);
                                  else toast.info('All templates already added');
                                }}><Plus className="h-2.5 w-2.5 mr-1" />Add All Templates</Button>
                              </div>
                              {row.specifications.length === 0 && <p className="text-[11px] text-muted-foreground italic">Click "Add All Templates" to load 25 spec fields.</p>}
                              {['engine','dimensions','performance','features','safety'].map(cat => {
                                const catSpecs = row.specifications.filter(s => s.category === cat);
                                if (!catSpecs.length) return null;
                                return (
                                  <div key={cat} className="mb-2">
                                    <span className="text-[10px] font-bold uppercase text-primary">{cat}</span>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 mt-1">
                                      {catSpecs.map((spec, si) => {
                                        const gi = row.specifications.indexOf(spec);
                                        const tpl = SPEC_TEMPLATES.find(t => t.category === cat && t.label === spec.label);
                                        return (
                                          <div key={si} className="flex items-center gap-1 bg-background rounded border p-1">
                                            <span className="text-[9px] text-muted-foreground w-20 shrink-0 font-medium truncate">{spec.label}</span>
                                            <Input value={spec.value} onChange={e => { const ss = [...row.specifications]; ss[gi] = { ...ss[gi], value: e.target.value }; updateSubArray(ri, 'specifications', ss); }} placeholder={tpl?.placeholder || ''} className="h-6 text-[10px] border-0 bg-muted/30 rounded" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* OFFERS */}
                          {activeSection === 'offers' && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold">Dealer Offers</span>
                                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSubArray(ri, 'offers', [...row.offers, emptyOffer()])}><Plus className="h-2.5 w-2.5 mr-1" />Add Offer</Button>
                              </div>
                              {row.offers.map((offer, oi) => (
                                <div key={oi} className="flex items-center gap-2 bg-background rounded border p-1.5 mb-1">
                                  <Input value={offer.title} onChange={e => { const os = [...row.offers]; os[oi] = { ...os[oi], title: e.target.value }; updateSubArray(ri, 'offers', os); }} placeholder="Offer Title" className="h-6 text-[10px] w-32" />
                                  <Input value={offer.discount} onChange={e => { const os = [...row.offers]; os[oi] = { ...os[oi], discount: e.target.value }; updateSubArray(ri, 'offers', os); }} placeholder="₹25K" className="h-6 text-[10px] w-20" />
                                  <Select value={offer.offer_type} onValueChange={v => { const os = [...row.offers]; os[oi] = { ...os[oi], offer_type: v }; updateSubArray(ri, 'offers', os); }}>
                                    <SelectTrigger className="h-6 text-[10px] w-28"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cashback">Cash Discount</SelectItem>
                                      <SelectItem value="exchange">Exchange Bonus</SelectItem>
                                      <SelectItem value="accessory">Accessories</SelectItem>
                                      <SelectItem value="finance">Finance</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input value={offer.description} onChange={e => { const os = [...row.offers]; os[oi] = { ...os[oi], description: e.target.value }; updateSubArray(ri, 'offers', os); }} placeholder="Description" className="h-6 text-[10px] flex-1" />
                                  <Input type="date" value={offer.valid_till} onChange={e => { const os = [...row.offers]; os[oi] = { ...os[oi], valid_till: e.target.value }; updateSubArray(ri, 'offers', os); }} className="h-6 text-[10px] w-32" />
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => updateSubArray(ri, 'offers', row.offers.filter((_, j) => j !== oi))}><Trash2 className="h-2.5 w-2.5" /></Button>
                                </div>
                              ))}
                              {row.offers.length === 0 && <p className="text-[11px] text-muted-foreground italic">No offers.</p>}
                            </div>
                          )}
                          {/* CONTENT */}
                          {activeSection === 'content' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <div className="flex items-center gap-1 mb-1"><ThumbsUp className="h-3 w-3 text-emerald-500" /><span className="text-[10px] font-bold">Pros (one per line)</span></div>
                                <Textarea value={row.pros} onChange={e => updateRow(ri, 'pros', e.target.value)} placeholder={"Great mileage\nSpacious cabin"} className="text-[10px] min-h-[100px] resize-none" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1 mb-1"><ThumbsDown className="h-3 w-3 text-red-500" /><span className="text-[10px] font-bold">Cons (one per line)</span></div>
                                <Textarea value={row.cons} onChange={e => updateRow(ri, 'cons', e.target.value)} placeholder={"No diesel\nBasic interior"} className="text-[10px] min-h-[100px] resize-none" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1 mb-1"><Star className="h-3 w-3 text-amber-500" /><span className="text-[10px] font-bold">Key Highlights (one per line)</span></div>
                                <Textarea value={row.key_highlights} onChange={e => updateRow(ri, 'key_highlights', e.target.value)} placeholder={"Best mileage\n6 Airbags"} className="text-[10px] min-h-[100px] resize-none" />
                              </div>
                            </div>
                          )}
                          {/* OVERVIEW */}
                          {activeSection === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <span className="text-[10px] font-bold mb-1 block">Overview / Description</span>
                                <Textarea value={row.overview} onChange={e => updateRow(ri, 'overview', e.target.value)} placeholder="The all-new car offers..." className="text-[10px] min-h-[120px] resize-none" />
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <span className="text-[10px] font-bold mb-1 block">Brochure URL</span>
                                  <Input value={row.brochure_url} onChange={e => updateRow(ri, 'brochure_url', e.target.value)} placeholder="https://oem.com/brochure.pdf" className="h-7 text-[10px]" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold mb-1 block">Competitors (comma separated)</span>
                                  <Input value={row.competitors} onChange={e => updateRow(ri, 'competitors', e.target.value)} placeholder="hyundai-i20, tata-altroz" className="h-7 text-[10px] font-mono" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div onClick={addRow} className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer">
                <Plus className="h-3.5 w-3.5" /><span>Add new row</span>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* ═══ Existing Cars Section ═══ */}
          <div className="border-t">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">Existing Cars in Database</span>
                <Badge variant="outline" className="text-[10px] h-5">{filteredExisting.length} cars</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Search cars..." className="pl-8 h-7 text-xs w-48" />
                </div>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="All Brands" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Brands</SelectItem>
                    {brandOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => refetchCars()}><RefreshCw className="h-3 w-3" /></Button>
              </div>
            </div>
            <ScrollArea className="max-h-[250px]">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-1.5 font-medium text-[10px]">#</th>
                  <th className="text-left px-3 py-1.5 font-medium text-[10px]">Name</th>
                  <th className="text-left px-3 py-1.5 font-medium text-[10px]">Brand</th>
                  <th className="text-left px-3 py-1.5 font-medium text-[10px]">Type</th>
                  <th className="text-left px-3 py-1.5 font-medium text-[10px]">Price</th>
                  <th className="text-left px-3 py-1.5 font-medium text-[10px]">Flags</th>
                  <th className="text-right px-3 py-1.5 font-medium text-[10px]">Actions</th>
                </tr></thead>
                <tbody>
                  {loadingCars ? (
                    <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">Loading...</td></tr>
                  ) : filteredExisting.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">No cars found</td></tr>
                  ) : filteredExisting.map((car, i) => (
                    <tr key={car.id} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium">{car.name}</td>
                      <td className="px-3 py-1.5">{car.brand}</td>
                      <td className="px-3 py-1.5">{car.body_type}</td>
                      <td className="px-3 py-1.5 font-mono">{car.price_range || '—'}</td>
                      <td className="px-3 py-1.5">
                        {car.is_hot && <span>🔥</span>}{car.is_new && <span>✨</span>}{car.is_upcoming && <span>🚀</span>}{car.is_bestseller && <span>⭐</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { window.open(`/cars/${car.slug}`, '_blank'); }}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm(`Delete ${car.name}?`)) deleteMutation.mutate(car.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t bg-muted/20 text-[10px] text-muted-foreground">
            <span>{rows.length} entry rows • {savedCount} saved • {draftCount} pending</span>
            <span>Existing slug auto-replaces on save • CSV import replaces by slug</span>
          </div>
        </div>
      )}
    </div>
  );
};
