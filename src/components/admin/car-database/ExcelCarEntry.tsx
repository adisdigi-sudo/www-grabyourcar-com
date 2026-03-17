import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import {
  Plus, Trash2, Save, X, Copy, CheckCircle2, AlertTriangle,
  Hash, Car, IndianRupee, Tag, Fuel, Settings2, FileSpreadsheet,
  Calendar, Eye, EyeOff, Gauge, ChevronDown, ChevronRight,
  Image as ImageIcon, Palette, Layers, Shield, Ruler, Sparkles,
  FileText, MapPin, ThumbsUp, ThumbsDown, Star, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ───
const BRANDS = [
  'Maruti Suzuki','Hyundai','Tata','Mahindra','Kia','Toyota','Honda','MG',
  'Skoda','Volkswagen','Renault','Nissan','Citroen','Jeep','Ford',
  'Mercedes-Benz','BMW','Audi','Volvo','Lexus','Porsche','Land Rover',
  'Jaguar','Mini','BYD','Isuzu'
];
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
  name: string; brand: string; slug: string; body_type: string;
  price_range: string; price_numeric: string; original_price: string; discount: string;
  tagline: string; overview: string; availability: boolean; launch_date: string;
  fuel_types: string[]; transmission_types: string[];
  // Engine specs inline
  engine_displacement: string; engine_power: string; engine_torque: string; engine_mileage: string;
  // Flags
  is_hot: boolean; is_new: boolean; is_upcoming: boolean; is_bestseller: boolean;
  // Sub-data
  images: CarImage[];
  colors: CarColor[];
  variants: CarVariant[];
  specifications: CarSpec[];
  offers: CarOffer[];
  pros: string; cons: string; key_highlights: string; competitors: string;
  brochure_url: string;
  // Status
  status: 'draft' | 'saving' | 'saved' | 'error';
  errorMsg?: string;
}

const generateSlug = (brand: string, name: string) =>
  `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const emptyRow = (): CarRow => ({
  id: crypto.randomUUID(), name: "", brand: "Maruti Suzuki", slug: "", body_type: "Hatchback",
  price_range: "", price_numeric: "", original_price: "", discount: "",
  tagline: "", overview: "", availability: true, launch_date: "",
  fuel_types: ["Petrol"], transmission_types: ["Manual"],
  engine_displacement: "", engine_power: "", engine_torque: "", engine_mileage: "",
  is_hot: false, is_new: true, is_upcoming: false, is_bestseller: false,
  images: [], colors: [], variants: [], specifications: [], offers: [],
  pros: "", cons: "", key_highlights: "", competitors: "", brochure_url: "",
  status: 'draft',
});

const autoCalcOnRoad = (exShowroom: string): { rto: string; insurance: string; tcs: string; on_road_price: string } => {
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

// ─── Main columns for the spreadsheet header ───
const MAIN_COLUMNS = [
  { key: 'row_num', label: '#', w: 'w-[44px]' },
  { key: 'expand', label: '', w: 'w-[36px]' },
  { key: 'status', label: 'Status', w: 'w-[72px]' },
  { key: 'name', label: 'Car Name', w: 'w-[160px]', required: true, editable: true },
  { key: 'brand', label: 'Brand', w: 'w-[150px]', required: true },
  { key: 'slug', label: 'Slug', w: 'w-[170px]' },
  { key: 'body_type', label: 'Body Type', w: 'w-[130px]' },
  { key: 'price_range', label: 'Price Range', w: 'w-[140px]', editable: true },
  { key: 'price_numeric', label: 'Ex-Showroom ₹', w: 'w-[130px]', editable: true },
  { key: 'original_price', label: 'Original ₹', w: 'w-[110px]', editable: true },
  { key: 'discount', label: 'Discount', w: 'w-[100px]', editable: true },
  { key: 'availability', label: 'Avail.', w: 'w-[70px]' },
  { key: 'launch_date', label: 'Launch', w: 'w-[120px]', editable: true },
  { key: 'tagline', label: 'Tagline', w: 'w-[160px]', editable: true },
  { key: 'fuel_types', label: 'Fuel', w: 'w-[180px]' },
  { key: 'transmission', label: 'Trans.', w: 'w-[170px]' },
  { key: 'engine_cc', label: 'CC', w: 'w-[80px]', editable: true },
  { key: 'engine_bhp', label: 'BHP', w: 'w-[80px]', editable: true },
  { key: 'engine_nm', label: 'Nm', w: 'w-[80px]', editable: true },
  { key: 'mileage', label: 'kmpl', w: 'w-[80px]', editable: true },
  { key: 'flags', label: 'Flags', w: 'w-[150px]' },
  { key: 'sub_count', label: 'Data', w: 'w-[100px]' },
  { key: 'actions', label: '', w: 'w-[90px]' },
];

const EDITABLE_COLS = ['name','price_range','price_numeric','original_price','discount','launch_date','tagline','engine_cc','engine_bhp','engine_nm','mileage'];

const cellBase = "h-9 border-0 rounded-none bg-transparent text-xs focus:bg-accent/40 focus:ring-1 focus:ring-primary/60 transition-colors";

// ─── Component ───
export const ExcelCarEntry = ({ onClose }: { onClose?: () => void }) => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<CarRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Record<number, string>>({}); // rowIdx -> active section
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const updateRow = useCallback((idx: number, field: string, value: any) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value, status: 'draft' as const };
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
      return { ...r, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val], status: 'draft' };
    }));
  }, []);

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx: number) => { if (rows.length > 1) setRows(prev => prev.filter((_, i) => i !== idx)); };
  const duplicateRow = (idx: number) => {
    const s = rows[idx];
    setRows(prev => [...prev.slice(0, idx + 1), { ...s, id: crypto.randomUUID(), name: s.name + ' (copy)', slug: generateSlug(s.brand, s.name + ' copy'), status: 'draft' }, ...prev.slice(idx + 1)]);
  };

  const toggleExpand = (idx: number) => {
    setExpandedRows(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else { s.add(idx); if (!expandedSections[idx]) setExpandedSections(p => ({ ...p, [idx]: 'images' })); }
      return s;
    });
  };

  // Sub-data helpers
  const updateSubArray = <T,>(rowIdx: number, field: keyof CarRow, items: T[]) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [field]: items, status: 'draft' } : r));
  };

  const handleKeyDown = (e: KeyboardEvent, rowIdx: number, colKey: string) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ci = EDITABLE_COLS.indexOf(colKey);
      if (ci === -1) return;
      const nc = e.shiftKey ? (ci > 0 ? EDITABLE_COLS[ci - 1] : EDITABLE_COLS[EDITABLE_COLS.length - 1]) : (ci < EDITABLE_COLS.length - 1 ? EDITABLE_COLS[ci + 1] : EDITABLE_COLS[0]);
      const nr = !e.shiftKey && ci === EDITABLE_COLS.length - 1 ? Math.min(rowIdx + 1, rows.length - 1) : e.shiftKey && ci === 0 ? Math.max(rowIdx - 1, 0) : rowIdx;
      inputRefs.current[`${nr}-${nc}`]?.focus();
      setActiveCell({ row: nr, col: nc });
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const nk = `${rowIdx + 1}-${colKey}`;
      if (inputRefs.current[nk]) { inputRefs.current[nk]?.focus(); setActiveCell({ row: rowIdx + 1, col: colKey }); }
      else { addRow(); setTimeout(() => { inputRefs.current[`${rowIdx + 1}-${colKey}`]?.focus(); setActiveCell({ row: rowIdx + 1, col: colKey }); }, 50); }
    }
  };

  // ─── Image upload helper ───
  const uploadFile = async (file: File, carSlug: string, prefix: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${carSlug}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('car-images').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('car-images').getPublicUrl(path);
    return publicUrl;
  };

  // ─── Save ───
  const saveRowMutation = useMutation({
    mutationFn: async ({ row, index }: { row: CarRow; index: number }) => {
      if (!row.name.trim() || !row.brand.trim()) throw new Error('Name and Brand are required');
      const slug = row.slug || generateSlug(row.brand, row.name);

      // 1) Insert car
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
      const carId = carData.id;

      // 2) Upload images if files present, then insert
      if (row.images.length > 0) {
        const imgs = [];
        for (let idx = 0; idx < row.images.length; idx++) {
          const img = row.images[idx];
          let finalUrl = img.url.trim();
          if (img.file) {
            finalUrl = await uploadFile(img.file, slug, `gallery-${idx}`);
          }
          if (finalUrl) {
            imgs.push({ car_id: carId, url: finalUrl, alt_text: img.alt_text || row.name, is_primary: img.is_primary, sort_order: idx + 1 });
          }
        }
        if (imgs.length) await supabase.from('car_images').insert(imgs);
      }

      // 3) Upload color images if files present, then insert
      if (row.colors.length > 0) {
        const cols = [];
        for (let idx = 0; idx < row.colors.length; idx++) {
          const c = row.colors[idx];
          let imgUrl = c.image_url || '';
          if (c.file) {
            imgUrl = await uploadFile(c.file, slug, `color-${c.name.replace(/\s+/g, '-').toLowerCase()}`);
          }
          if (c.name.trim()) {
            cols.push({ car_id: carId, name: c.name, hex_code: c.hex_code, image_url: imgUrl || null, sort_order: idx + 1 });
          }
        }
        if (cols.length) await supabase.from('car_colors').insert(cols);
      }

      // 4) Variants with on-road pricing
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

      // 5) Specifications (inline engine + expanded specs)
      const allSpecs: { car_id: string; category: string; label: string; value: string; sort_order: number }[] = [];
      if (row.engine_displacement) allSpecs.push({ car_id: carId, category: 'engine', label: 'Displacement', value: `${row.engine_displacement} cc`, sort_order: 1 });
      if (row.engine_power) allSpecs.push({ car_id: carId, category: 'engine', label: 'Max Power', value: `${row.engine_power} bhp`, sort_order: 2 });
      if (row.engine_torque) allSpecs.push({ car_id: carId, category: 'engine', label: 'Max Torque', value: `${row.engine_torque} Nm`, sort_order: 3 });
      if (row.engine_mileage) allSpecs.push({ car_id: carId, category: 'performance', label: 'Mileage', value: `${row.engine_mileage} kmpl`, sort_order: 1 });
      row.specifications.filter(s => s.value.trim()).forEach((s, idx) => {
        allSpecs.push({ car_id: carId, category: s.category, label: s.label, value: s.value, sort_order: idx + 10 });
      });
      if (allSpecs.length) await supabase.from('car_specifications').insert(allSpecs);

      // 6) Offers
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
      toast.success('Car saved with all data!');
    },
    onError: (error: Error, variables) => {
      setRows(prev => prev.map((r, i) => i === variables.index ? { ...r, status: 'error', errorMsg: error.message } : r));
      toast.error(error.message);
    },
  });

  const saveAll = () => {
    const valid = rows.filter(r => r.name.trim() && r.brand.trim() && r.status !== 'saved');
    if (!valid.length) { toast.error('No valid unsaved rows'); return; }
    valid.forEach(row => {
      const idx = rows.findIndex(r => r.id === row.id);
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, status: 'saving' } : r));
      saveRowMutation.mutate({ row, index: idx });
    });
  };

  const savedCount = rows.filter(r => r.status === 'saved').length;
  const draftCount = rows.filter(r => r.status === 'draft' && r.name.trim()).length;
  const errorCount = rows.filter(r => r.status === 'error').length;

  const subDataCount = (row: CarRow) => row.images.length + row.colors.length + row.variants.length + row.specifications.length + row.offers.length;

  // ─── Sub-section tabs ───
  const SUB_SECTIONS = [
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'variants', label: 'Variants & Pricing', icon: Layers },
    { id: 'specs', label: 'Full Specifications', icon: Gauge },
    { id: 'offers', label: 'Offers', icon: Tag },
    { id: 'content', label: 'Pros/Cons/Highlights', icon: Star },
    { id: 'overview', label: 'Overview & Brochure', icon: FileText },
  ];

  // ─── Render ───
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gradient-to-r from-muted/60 to-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-none">Complete Car Data Entry</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">All fields • Images • Colors • Variants • Specs • Pricing</p>
          </div>
          <div className="h-6 w-px bg-border ml-1" />
          <div className="flex items-center gap-1.5">
            {savedCount > 0 && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] h-5"><CheckCircle2 className="h-2.5 w-2.5" />{savedCount}</Badge>}
            {draftCount > 0 && <Badge variant="secondary" className="gap-1 text-[10px] h-5"><FileSpreadsheet className="h-2.5 w-2.5" />{draftCount}</Badge>}
            {errorCount > 0 && <Badge variant="destructive" className="gap-1 text-[10px] h-5"><AlertTriangle className="h-2.5 w-2.5" />{errorCount}</Badge>}
            <Badge variant="outline" className="text-muted-foreground font-mono text-[10px] h-5">{rows.length} rows</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1 text-[11px] h-7"><Plus className="h-3 w-3" />Row</Button>
          <Button size="sm" onClick={saveAll} disabled={draftCount === 0} className="gap-1 text-[11px] h-7 bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="h-3 w-3" />Save All ({draftCount})</Button>
          {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="h-3.5 w-3.5" /></Button>}
        </div>
      </div>

      {/* ═══ Grid ═══ */}
      <ScrollArea className="flex-1">
        <div className="min-w-[2400px]">
          {/* Header */}
          <div className="flex items-center border-b bg-muted/50 sticky top-0 z-20">
            {MAIN_COLUMNS.map(col => (
              <div key={col.key} className={cn("flex items-center gap-1 px-1.5 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border/40 last:border-r-0 shrink-0", col.w, col.key === 'row_num' && "justify-center bg-muted/70")}>
                {col.label}{(col as any).required && <span className="text-red-400">•</span>}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row, ri) => {
            const isExpanded = expandedRows.has(ri);
            const activeSection = expandedSections[ri] || 'images';
            return (
              <div key={row.id} className="border-b border-border/30">
                {/* ─── Main Row ─── */}
                <div className={cn(
                  "flex items-stretch transition-all group/row",
                  row.status === 'saved' && "bg-emerald-50/30 dark:bg-emerald-950/10",
                  row.status === 'error' && "bg-red-50/30 dark:bg-red-950/10",
                  row.status === 'saving' && "bg-amber-50/30 animate-pulse",
                  activeCell?.row === ri && "bg-primary/[0.03]",
                )}>
                  {/* # */}
                  <div className="w-[44px] shrink-0 flex items-center justify-center border-r border-border/40 text-[10px] font-mono text-muted-foreground bg-muted/30 font-bold">{ri + 1}</div>
                  {/* Expand */}
                  <div className="w-[36px] shrink-0 flex items-center justify-center border-r border-border/40">
                    <button onClick={() => toggleExpand(ri)} className="p-1 rounded hover:bg-accent transition-colors">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                  {/* Status */}
                  <div className="w-[72px] shrink-0 flex items-center justify-center border-r border-border/40">
                    {row.status === 'draft' && <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">Draft</Badge>}
                    {row.status === 'saving' && <Badge className="text-[8px] px-1 py-0 h-4 bg-amber-500">Saving</Badge>}
                    {row.status === 'saved' && <Badge className="text-[8px] px-1 py-0 h-4 bg-emerald-600 text-white">✓ Saved</Badge>}
                    {row.status === 'error' && <Badge variant="destructive" className="text-[8px] px-1 py-0 h-4 cursor-help" title={row.errorMsg}>✗ Error</Badge>}
                  </div>
                  {/* Name */}
                  <div className="w-[160px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-name`] = el; }} value={row.name} onChange={e => updateRow(ri, 'name', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'name' })} onKeyDown={e => handleKeyDown(e, ri, 'name')} placeholder="Swift" className={cn(cellBase, "font-semibold")} />
                  </div>
                  {/* Brand */}
                  <div className="w-[150px] shrink-0 border-r border-border/40 p-px">
                    <Select value={row.brand} onValueChange={v => updateRow(ri, 'brand', v)}>
                      <SelectTrigger className={cn(cellBase, "px-2")}><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {/* Slug */}
                  <div className="w-[170px] shrink-0 border-r border-border/40 flex items-center px-2">
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{row.slug || '—'}</span>
                  </div>
                  {/* Body Type */}
                  <div className="w-[130px] shrink-0 border-r border-border/40 p-px">
                    <Select value={row.body_type} onValueChange={v => updateRow(ri, 'body_type', v)}>
                      <SelectTrigger className={cn(cellBase, "px-2")}><SelectValue /></SelectTrigger>
                      <SelectContent>{BODY_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {/* Price Range */}
                  <div className="w-[140px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-price_range`] = el; }} value={row.price_range} onChange={e => updateRow(ri, 'price_range', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'price_range' })} onKeyDown={e => handleKeyDown(e, ri, 'price_range')} placeholder="₹6.5L-₹9.8L" className={cn(cellBase)} />
                  </div>
                  {/* Price Numeric */}
                  <div className="w-[130px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-price_numeric`] = el; }} value={row.price_numeric} onChange={e => updateRow(ri, 'price_numeric', e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setActiveCell({ row: ri, col: 'price_numeric' })} onKeyDown={e => handleKeyDown(e, ri, 'price_numeric')} placeholder="650000" className={cn(cellBase, "font-mono")} />
                  </div>
                  {/* Original Price */}
                  <div className="w-[110px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-original_price`] = el; }} value={row.original_price} onChange={e => updateRow(ri, 'original_price', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'original_price' })} onKeyDown={e => handleKeyDown(e, ri, 'original_price')} placeholder="₹7.5L" className={cn(cellBase)} />
                  </div>
                  {/* Discount */}
                  <div className="w-[100px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-discount`] = el; }} value={row.discount} onChange={e => updateRow(ri, 'discount', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'discount' })} onKeyDown={e => handleKeyDown(e, ri, 'discount')} placeholder="₹50K" className={cn(cellBase)} />
                  </div>
                  {/* Availability */}
                  <div className="w-[70px] shrink-0 border-r border-border/40 flex items-center justify-center">
                    <button onClick={() => updateRow(ri, 'availability', !row.availability)} className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border transition-all", row.availability ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40" : "bg-muted text-muted-foreground border-border")}>
                      {row.availability ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                      {row.availability ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {/* Launch Date */}
                  <div className="w-[120px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-launch_date`] = el; }} type="date" value={row.launch_date} onChange={e => updateRow(ri, 'launch_date', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'launch_date' })} onKeyDown={e => handleKeyDown(e, ri, 'launch_date')} className={cn(cellBase)} />
                  </div>
                  {/* Tagline */}
                  <div className="w-[160px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-tagline`] = el; }} value={row.tagline} onChange={e => updateRow(ri, 'tagline', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'tagline' })} onKeyDown={e => handleKeyDown(e, ri, 'tagline')} placeholder="Bold. Beautiful." className={cn(cellBase, "italic")} />
                  </div>
                  {/* Fuel chips */}
                  <div className="w-[180px] shrink-0 border-r border-border/40 p-0.5 flex flex-wrap gap-[2px] items-center content-center">
                    {FUEL_OPTIONS.map(f => (
                      <button key={f} onClick={() => toggleArrayValue(ri, 'fuel_types', f)} className={cn("px-1.5 py-px rounded-full text-[8px] font-bold border transition-all", row.fuel_types.includes(f) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border/60 hover:border-primary/40")}>{f}</button>
                    ))}
                  </div>
                  {/* Transmission chips */}
                  <div className="w-[170px] shrink-0 border-r border-border/40 p-0.5 flex flex-wrap gap-[2px] items-center content-center">
                    {TRANSMISSION_OPTIONS.map(t => (
                      <button key={t} onClick={() => toggleArrayValue(ri, 'transmission_types', t)} className={cn("px-1.5 py-px rounded-full text-[8px] font-bold border transition-all", row.transmission_types.includes(t) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border/60 hover:border-primary/40")}>{t}</button>
                    ))}
                  </div>
                  {/* Engine CC */}
                  <div className="w-[80px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-engine_cc`] = el; }} value={row.engine_displacement} onChange={e => updateRow(ri, 'engine_displacement', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'engine_cc' })} onKeyDown={e => handleKeyDown(e, ri, 'engine_cc')} placeholder="1197" className={cn(cellBase, "font-mono text-center")} />
                  </div>
                  {/* BHP */}
                  <div className="w-[80px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-engine_bhp`] = el; }} value={row.engine_power} onChange={e => updateRow(ri, 'engine_power', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'engine_bhp' })} onKeyDown={e => handleKeyDown(e, ri, 'engine_bhp')} placeholder="88.7" className={cn(cellBase, "font-mono text-center")} />
                  </div>
                  {/* Nm */}
                  <div className="w-[80px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-engine_nm`] = el; }} value={row.engine_torque} onChange={e => updateRow(ri, 'engine_torque', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'engine_nm' })} onKeyDown={e => handleKeyDown(e, ri, 'engine_nm')} placeholder="113" className={cn(cellBase, "font-mono text-center")} />
                  </div>
                  {/* Mileage */}
                  <div className="w-[80px] shrink-0 border-r border-border/40 p-px">
                    <Input ref={el => { inputRefs.current[`${ri}-mileage`] = el; }} value={row.engine_mileage} onChange={e => updateRow(ri, 'engine_mileage', e.target.value)} onFocus={() => setActiveCell({ row: ri, col: 'mileage' })} onKeyDown={e => handleKeyDown(e, ri, 'mileage')} placeholder="23.2" className={cn(cellBase, "font-mono text-center")} />
                  </div>
                  {/* Flags */}
                  <div className="w-[150px] shrink-0 border-r border-border/40 p-0.5 flex gap-0.5 items-center justify-center">
                    {[{ key: 'is_hot', l: '🔥' },{ key: 'is_new', l: '✨' },{ key: 'is_upcoming', l: '🚀' },{ key: 'is_bestseller', l: '⭐' }].map(f => (
                      <button key={f.key} onClick={() => updateRow(ri, f.key, !(row as any)[f.key])} className={cn("w-7 h-7 rounded-md flex items-center justify-center text-sm border transition-all", (row as any)[f.key] ? "bg-primary/10 border-primary/50 scale-110" : "border-transparent opacity-30 hover:opacity-60")}>{f.l}</button>
                    ))}
                  </div>
                  {/* Sub Data Count */}
                  <div className="w-[100px] shrink-0 border-r border-border/40 flex items-center justify-center gap-1">
                    {subDataCount(row) > 0 ? (
                      <Badge variant="secondary" className="text-[9px] h-4 gap-0.5 cursor-pointer" onClick={() => toggleExpand(ri)}>
                        {subDataCount(row)} items
                      </Badge>
                    ) : (
                      <span className="text-[9px] text-muted-foreground italic">No data</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="w-[90px] shrink-0 flex items-center justify-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/row:opacity-100" onClick={() => duplicateRow(ri)}><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/row:opacity-100 text-destructive hover:bg-destructive/10" onClick={() => removeRow(ri)} disabled={rows.length <= 1}><Trash2 className="h-3 w-3" /></Button>
                    {row.status === 'draft' && row.name.trim() && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-500/10" onClick={() => { setRows(prev => prev.map((r, i) => i === ri ? { ...r, status: 'saving' } : r)); saveRowMutation.mutate({ row, index: ri }); }}><Save className="h-3 w-3" /></Button>
                    )}
                  </div>
                </div>

                {/* ═══ Expanded Sub-Sections ═══ */}
                {isExpanded && (
                  <div className="bg-muted/20 border-t border-dashed border-border/50">
                    {/* Section Tabs */}
                    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border/30 bg-muted/30 overflow-x-auto">
                      {SUB_SECTIONS.map(sec => (
                        <button key={sec.id} onClick={() => setExpandedSections(p => ({ ...p, [ri]: sec.id }))} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap border", activeSection === sec.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "text-muted-foreground border-transparent hover:bg-accent hover:text-foreground")}>
                          <sec.icon className="h-3 w-3" />{sec.label}
                          {sec.id === 'images' && row.images.length > 0 && <Badge variant="secondary" className="h-3.5 text-[8px] px-1 ml-0.5">{row.images.length}</Badge>}
                          {sec.id === 'colors' && row.colors.length > 0 && <Badge variant="secondary" className="h-3.5 text-[8px] px-1 ml-0.5">{row.colors.length}</Badge>}
                          {sec.id === 'variants' && row.variants.length > 0 && <Badge variant="secondary" className="h-3.5 text-[8px] px-1 ml-0.5">{row.variants.length}</Badge>}
                          {sec.id === 'specs' && row.specifications.length > 0 && <Badge variant="secondary" className="h-3.5 text-[8px] px-1 ml-0.5">{row.specifications.length}</Badge>}
                          {sec.id === 'offers' && row.offers.length > 0 && <Badge variant="secondary" className="h-3.5 text-[8px] px-1 ml-0.5">{row.offers.length}</Badge>}
                        </button>
                      ))}
                    </div>

                    {/* Section Content */}
                    <div className="p-3 max-h-[400px] overflow-y-auto">
                      {/* ─── IMAGES ─── */}
                      {activeSection === 'images' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">Car Images (Gallery & Hero)</span>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSubArray(ri, 'images', [...row.images, emptyImage()])}><Plus className="h-2.5 w-2.5 mr-1" />Add Image</Button>
                          </div>
                          {row.images.length === 0 && <p className="text-[11px] text-muted-foreground italic">No images added. Click "Add Image" to start.</p>}
                          <div className="grid grid-cols-1 gap-1.5">
                            {row.images.map((img, ii) => (
                              <div key={ii} className="flex items-center gap-2 bg-background rounded-md border p-1.5">
                                <div className="w-12 h-9 rounded border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                  {(img.url || img.file) ? <img src={img.file ? URL.createObjectURL(img.file) : img.url} className="w-full h-full object-cover" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                                </div>
                                <Input value={img.url} onChange={e => { const imgs = [...row.images]; imgs[ii] = { ...imgs[ii], url: e.target.value, file: undefined }; updateSubArray(ri, 'images', imgs); }} placeholder="Image URL or upload →" className="h-7 text-[10px] flex-1" />
                                <label className="cursor-pointer text-[9px] font-bold px-2 py-1 rounded border border-dashed border-primary/50 text-primary hover:bg-primary/10 whitespace-nowrap flex items-center gap-1">
                                  <Upload className="h-3 w-3" />Upload
                                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) { const imgs = [...row.images]; imgs[ii] = { ...imgs[ii], file, url: '' }; updateSubArray(ri, 'images', imgs); }
                                  }} />
                                </label>
                                <Input value={img.alt_text} onChange={e => { const imgs = [...row.images]; imgs[ii] = { ...imgs[ii], alt_text: e.target.value }; updateSubArray(ri, 'images', imgs); }} placeholder="Alt text" className="h-7 text-[10px] w-28" />
                                <button onClick={() => { const imgs = [...row.images]; imgs[ii] = { ...imgs[ii], is_primary: !imgs[ii].is_primary }; updateSubArray(ri, 'images', imgs); }} className={cn("text-[9px] font-bold px-2 py-0.5 rounded border whitespace-nowrap", img.is_primary ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border")}>
                                  {img.is_primary ? '★ Hero' : 'Set Hero'}
                                </button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateSubArray(ri, 'images', row.images.filter((_, j) => j !== ii))}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ─── COLORS ─── */}
                      {activeSection === 'colors' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">Colors (Hex + Color-wise Images)</span>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSubArray(ri, 'colors', [...row.colors, emptyColor()])}><Plus className="h-2.5 w-2.5 mr-1" />Add Color</Button>
                          </div>
                          {row.colors.length === 0 && <p className="text-[11px] text-muted-foreground italic">No colors added.</p>}
                          <div className="grid grid-cols-1 gap-1.5">
                            {row.colors.map((color, ci) => (
                              <div key={ci} className="flex items-center gap-2 bg-background rounded-md border p-1.5">
                                <input type="color" value={color.hex_code} onChange={e => { const cols = [...row.colors]; cols[ci] = { ...cols[ci], hex_code: e.target.value }; updateSubArray(ri, 'colors', cols); }} className="w-8 h-7 rounded border cursor-pointer shrink-0" />
                                <Input value={color.name} onChange={e => { const cols = [...row.colors]; cols[ci] = { ...cols[ci], name: e.target.value }; updateSubArray(ri, 'colors', cols); }} placeholder="Color Name (e.g., Napoli Black)" className="h-7 text-[10px] w-40" />
                                <Input value={color.hex_code} onChange={e => { const cols = [...row.colors]; cols[ci] = { ...cols[ci], hex_code: e.target.value }; updateSubArray(ri, 'colors', cols); }} placeholder="#000000" className="h-7 text-[10px] w-24 font-mono" />
                                <Input value={color.image_url} onChange={e => { const cols = [...row.colors]; cols[ci] = { ...cols[ci], image_url: e.target.value }; updateSubArray(ri, 'colors', cols); }} placeholder="Color-specific car image URL" className="h-7 text-[10px] flex-1" />
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateSubArray(ri, 'colors', row.colors.filter((_, j) => j !== ci))}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ─── VARIANTS & ON-ROAD PRICING ─── */}
                      {activeSection === 'variants' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">Variants with On-Road Price Breakup</span>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSubArray(ri, 'variants', [...row.variants, emptyVariant()])}><Plus className="h-2.5 w-2.5 mr-1" />Add Variant</Button>
                          </div>
                          {row.variants.length === 0 && <p className="text-[11px] text-muted-foreground italic">No variants added.</p>}
                          {row.variants.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-[10px] border-collapse">
                                <thead>
                                  <tr className="bg-muted/50">
                                    {['Variant Name','Price Label','Ex-Showroom ₹','RTO','Insurance','TCS','On-Road ₹','Fuel','Trans.','Features (comma sep.)',''].map(h => (
                                      <th key={h} className="px-1.5 py-1 text-left font-bold text-muted-foreground border border-border/40 whitespace-nowrap">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.variants.map((v, vi) => (
                                    <tr key={vi} className="hover:bg-accent/30">
                                      <td className="border border-border/40 p-px"><Input value={v.name} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], name: e.target.value }; updateSubArray(ri, 'variants', vs); }} placeholder="LXi" className="h-6 text-[10px] border-0" /></td>
                                      <td className="border border-border/40 p-px"><Input value={v.price} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], price: e.target.value }; updateSubArray(ri, 'variants', vs); }} placeholder="₹6.49L" className="h-6 text-[10px] border-0" /></td>
                                      <td className="border border-border/40 p-px"><Input value={v.ex_showroom} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], ex_showroom: e.target.value.replace(/\D/g,''), price_numeric: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} placeholder="649000" className="h-6 text-[10px] border-0 font-mono" /></td>
                                      <td className="border border-border/40 p-px"><Input value={v.rto} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], rto: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} placeholder="51920" className="h-6 text-[10px] border-0 font-mono" /></td>
                                      <td className="border border-border/40 p-px"><Input value={v.insurance} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], insurance: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} placeholder="22715" className="h-6 text-[10px] border-0 font-mono" /></td>
                                      <td className="border border-border/40 p-px"><Input value={v.tcs} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], tcs: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} placeholder="0" className="h-6 text-[10px] border-0 font-mono" /></td>
                                      <td className="border border-border/40 p-px"><Input value={v.on_road_price} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], on_road_price: e.target.value.replace(/\D/g,'') }; updateSubArray(ri, 'variants', vs); }} placeholder="740135" className="h-6 text-[10px] border-0 font-mono font-bold" /></td>
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
                                      <td className="border border-border/40 p-px"><Input value={v.features} onChange={e => { const vs = [...row.variants]; vs[vi] = { ...vs[vi], features: e.target.value }; updateSubArray(ri, 'variants', vs); }} placeholder="AC, Power Steering, ABS" className="h-6 text-[10px] border-0" /></td>
                                      <td className="border border-border/40 p-px text-center"><Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => updateSubArray(ri, 'variants', row.variants.filter((_, j) => j !== vi))}><Trash2 className="h-2.5 w-2.5" /></Button></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ─── FULL SPECIFICATIONS ─── */}
                      {activeSection === 'specs' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">Full Specifications (Engine, Dimensions, Performance, Features, Safety)</span>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                              const toAdd = SPEC_TEMPLATES.filter(t => !row.specifications.some(s => s.category === t.category && s.label === t.label))
                                .map(t => ({ category: t.category, label: t.label, value: '' }));
                              if (toAdd.length) updateSubArray(ri, 'specifications', [...row.specifications, ...toAdd]);
                              else toast.info('All spec templates already added');
                            }}><Plus className="h-2.5 w-2.5 mr-1" />Add All Templates</Button>
                          </div>
                          {row.specifications.length === 0 && <p className="text-[11px] text-muted-foreground italic">Click "Add All Templates" to load 25 specification fields across all categories.</p>}
                          {['engine','dimensions','performance','features','safety'].map(cat => {
                            const catSpecs = row.specifications.filter(s => s.category === cat);
                            if (catSpecs.length === 0) return null;
                            return (
                              <div key={cat} className="mb-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {cat === 'engine' && <Gauge className="h-3 w-3 text-primary" />}
                                  {cat === 'dimensions' && <Ruler className="h-3 w-3 text-primary" />}
                                  {cat === 'performance' && <Sparkles className="h-3 w-3 text-primary" />}
                                  {cat === 'features' && <Settings2 className="h-3 w-3 text-primary" />}
                                  {cat === 'safety' && <Shield className="h-3 w-3 text-primary" />}
                                  <span className="text-[10px] font-bold uppercase text-primary">{cat}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                                  {catSpecs.map((spec, si) => {
                                    const globalIdx = row.specifications.indexOf(spec);
                                    const template = SPEC_TEMPLATES.find(t => t.category === cat && t.label === spec.label);
                                    return (
                                      <div key={si} className="flex items-center gap-1 bg-background rounded border p-1">
                                        <span className="text-[9px] text-muted-foreground w-20 shrink-0 font-medium truncate" title={spec.label}>{spec.label}</span>
                                        <Input value={spec.value} onChange={e => { const ss = [...row.specifications]; ss[globalIdx] = { ...ss[globalIdx], value: e.target.value }; updateSubArray(ri, 'specifications', ss); }} placeholder={template?.placeholder || 'Value'} className="h-6 text-[10px] border-0 bg-muted/30 rounded" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ─── OFFERS ─── */}
                      {activeSection === 'offers' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">Dealer Offers & Promotions</span>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateSubArray(ri, 'offers', [...row.offers, emptyOffer()])}><Plus className="h-2.5 w-2.5 mr-1" />Add Offer</Button>
                          </div>
                          {row.offers.length === 0 && <p className="text-[11px] text-muted-foreground italic">No offers added.</p>}
                          {row.offers.map((offer, oi) => (
                            <div key={oi} className="flex items-center gap-2 bg-background rounded border p-1.5 mb-1">
                              <Input value={offer.title} onChange={e => { const os = [...row.offers]; os[oi] = { ...os[oi], title: e.target.value }; updateSubArray(ri, 'offers', os); }} placeholder="Offer Title" className="h-6 text-[10px] w-32" />
                              <Input value={offer.discount} onChange={e => { const os = [...row.offers]; os[oi] = { ...os[oi], discount: e.target.value }; updateSubArray(ri, 'offers', os); }} placeholder="₹25,000" className="h-6 text-[10px] w-24" />
                              <Select value={offer.offer_type} onValueChange={v => { const os = [...row.offers]; os[oi] = { ...os[oi], offer_type: v }; updateSubArray(ri, 'offers', os); }}>
                                <SelectTrigger className="h-6 text-[10px] w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cashback">Cash Discount</SelectItem>
                                  <SelectItem value="exchange">Exchange Bonus</SelectItem>
                                  <SelectItem value="accessory">Free Accessories</SelectItem>
                                  <SelectItem value="finance">Finance Offer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input value={offer.description} onChange={e => { const os = [...row.offers]; os[oi] = { ...os[oi], description: e.target.value }; updateSubArray(ri, 'offers', os); }} placeholder="Description" className="h-6 text-[10px] flex-1" />
                              <Input type="date" value={offer.valid_till} onChange={e => { const os = [...row.offers]; os[oi] = { ...os[oi], valid_till: e.target.value }; updateSubArray(ri, 'offers', os); }} className="h-6 text-[10px] w-32" />
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => updateSubArray(ri, 'offers', row.offers.filter((_, j) => j !== oi))}><Trash2 className="h-2.5 w-2.5" /></Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ─── PROS/CONS/HIGHLIGHTS ─── */}
                      {activeSection === 'content' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <div className="flex items-center gap-1 mb-1"><ThumbsUp className="h-3 w-3 text-emerald-500" /><span className="text-[10px] font-bold">Pros (one per line)</span></div>
                            <Textarea value={row.pros} onChange={e => updateRow(ri, 'pros', e.target.value)} placeholder={"Great mileage\nSpacious cabin\nValue for money"} className="text-[10px] min-h-[100px] resize-none" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1"><ThumbsDown className="h-3 w-3 text-red-500" /><span className="text-[10px] font-bold">Cons (one per line)</span></div>
                            <Textarea value={row.cons} onChange={e => updateRow(ri, 'cons', e.target.value)} placeholder={"No diesel option\nBasic interior\nWeak AC in rear"} className="text-[10px] min-h-[100px] resize-none" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1"><Star className="h-3 w-3 text-amber-500" /><span className="text-[10px] font-bold">Key Highlights (one per line)</span></div>
                            <Textarea value={row.key_highlights} onChange={e => updateRow(ri, 'key_highlights', e.target.value)} placeholder={"Best-in-class mileage\n6 Airbags standard\nConnected car tech"} className="text-[10px] min-h-[100px] resize-none" />
                          </div>
                        </div>
                      )}

                      {/* ─── OVERVIEW & BROCHURE ─── */}
                      {activeSection === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-bold mb-1 block">Full Overview / Description</span>
                            <Textarea value={row.overview} onChange={e => updateRow(ri, 'overview', e.target.value)} placeholder="The all-new car offers premium features, advanced safety, and outstanding performance..." className="text-[10px] min-h-[120px] resize-none" />
                          </div>
                          <div className="space-y-3">
                            <div>
                              <span className="text-[10px] font-bold mb-1 block">Brochure URL</span>
                              <Input value={row.brochure_url} onChange={e => updateRow(ri, 'brochure_url', e.target.value)} placeholder="https://oem-site.com/brochure.pdf" className="h-7 text-[10px]" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold mb-1 block">Competitors (comma separated slugs)</span>
                              <Input value={row.competitors} onChange={e => updateRow(ri, 'competitors', e.target.value)} placeholder="hyundai-i20, tata-altroz, toyota-glanza" className="h-7 text-[10px] font-mono" />
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

          {/* Add Row */}
          <div onClick={addRow} className="flex items-center gap-2 px-5 py-3 text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer group/add">
            <Plus className="h-3.5 w-3.5 group-hover/add:text-primary" />
            <span className="group-hover/add:text-foreground">Add new row • <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] font-mono">Enter</kbd></span>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ═══ Status Bar ═══ */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t bg-muted/20 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3 font-medium">
          <span>{rows.length} rows</span>
          <span className="text-border">│</span>
          <span className="text-emerald-600">{savedCount} saved</span>
          <span className="text-border">│</span>
          <span>{draftCount} pending</span>
          {errorCount > 0 && <><span className="text-border">│</span><span className="text-destructive">{errorCount} errors</span></>}
        </div>
        <div className="flex items-center gap-2">
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] font-mono">Tab</kbd> cell</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] font-mono">Enter</kbd> row</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px] font-mono">▶</kbd> expand details</span>
        </div>
      </div>
    </div>
  );
};
