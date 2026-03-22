import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import {
  Check, ChevronsUpDown, ChevronRight, ChevronLeft,
  Car, Palette, Layers, Gauge, Image as ImageIcon, FileText, Tag, Star,
  Plus, Trash2, Upload, Save, ThumbsUp, ThumbsDown, CheckCircle2,
  AlertCircle, Loader2, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ───
const BODY_TYPES = ['Hatchback','Sedan','Compact SUV','Mid-Size SUV','Full-Size SUV','MPV','MUV','Coupe','Convertible','Pickup','Electric','Luxury','Crossover'];
const FUEL_OPTIONS = ['Petrol','Diesel','Electric','Hybrid','CNG','LPG'];
const TRANSMISSION_OPTIONS = ['Manual','Automatic','AMT','CVT','DCT','iMT'];

const STEPS = [
  { id: 'basic', label: 'Car Identity', icon: Car, desc: 'Brand, model, body type & basic info' },
  { id: 'variants', label: 'Variants & Pricing', icon: Layers, desc: 'All variants with on-road price' },
  { id: 'colors', label: 'Colors & Images', icon: Palette, desc: 'Available colors with car images' },
  { id: 'specs', label: 'Specifications', icon: Gauge, desc: 'Engine, dimensions, features & safety' },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon, desc: 'Hero image & gallery photos' },
  { id: 'content', label: 'Content & Offers', icon: FileText, desc: 'Overview, pros/cons, offers' },
  { id: 'review', label: 'Review & Save', icon: CheckCircle2, desc: 'Verify everything and publish' },
];

const SPEC_TEMPLATES = [
  { category: 'engine', label: 'Displacement', placeholder: '1197 cc' },
  { category: 'engine', label: 'Max Power', placeholder: '88.7 bhp @ 6000 rpm' },
  { category: 'engine', label: 'Max Torque', placeholder: '113 Nm @ 4200 rpm' },
  { category: 'engine', label: 'No. of Cylinders', placeholder: '4' },
  { category: 'engine', label: 'Valve Configuration', placeholder: 'DOHC' },
  { category: 'engine', label: 'Bore x Stroke', placeholder: '73.0 x 71.5 mm' },
  { category: 'dimensions', label: 'Length', placeholder: '3995 mm' },
  { category: 'dimensions', label: 'Width', placeholder: '1735 mm' },
  { category: 'dimensions', label: 'Height', placeholder: '1515 mm' },
  { category: 'dimensions', label: 'Wheelbase', placeholder: '2520 mm' },
  { category: 'dimensions', label: 'Ground Clearance', placeholder: '163 mm' },
  { category: 'dimensions', label: 'Boot Space', placeholder: '268 L' },
  { category: 'dimensions', label: 'Kerb Weight', placeholder: '875 kg' },
  { category: 'dimensions', label: 'Fuel Tank Capacity', placeholder: '37 L' },
  { category: 'performance', label: 'Top Speed', placeholder: '180 kmph' },
  { category: 'performance', label: '0-100 kmph', placeholder: '11.5 sec' },
  { category: 'performance', label: 'Mileage (ARAI)', placeholder: '23.2 kmpl' },
  { category: 'performance', label: 'Drive Type', placeholder: 'FWD' },
  { category: 'features', label: 'Infotainment', placeholder: '9-inch Touchscreen' },
  { category: 'features', label: 'Instrument Cluster', placeholder: 'Digital' },
  { category: 'features', label: 'Sunroof', placeholder: 'Electric Sunroof' },
  { category: 'features', label: 'Steering', placeholder: 'Power (EPS)' },
  { category: 'features', label: 'Climate Control', placeholder: 'Auto AC' },
  { category: 'features', label: 'Cruise Control', placeholder: 'Yes' },
  { category: 'features', label: 'Wireless Charging', placeholder: 'Yes' },
  { category: 'features', label: 'Connected Car', placeholder: 'Yes with App' },
  { category: 'safety', label: 'Airbags', placeholder: '6 Airbags' },
  { category: 'safety', label: 'ABS with EBD', placeholder: 'Yes' },
  { category: 'safety', label: 'NCAP Rating', placeholder: '5 Star (Global)' },
  { category: 'safety', label: 'Parking Sensors', placeholder: 'Front & Rear' },
  { category: 'safety', label: 'Camera', placeholder: '360° View' },
  { category: 'safety', label: 'TPMS', placeholder: 'Yes' },
  { category: 'safety', label: 'ESC', placeholder: 'Yes' },
  { category: 'safety', label: 'Hill Assist', placeholder: 'Yes' },
];

// ─── Types ───
interface CarVariant {
  name: string; price: string; price_numeric: string; fuel_type: string; transmission: string;
  ex_showroom: string; rto: string; insurance: string; tcs: string; on_road_price: string;
  features: string;
}
interface CarColor { name: string; hex_code: string; image_url: string; file?: File }
interface CarImage { url: string; alt_text: string; is_primary: boolean; file?: File }
interface CarSpec { category: string; label: string; value: string }
interface CarOffer { title: string; description: string; discount: string; offer_type: string; valid_till: string }

interface CarFormData {
  name: string; brand: string; slug: string; body_type: string;
  price_range: string; price_numeric: string; original_price: string; discount: string;
  tagline: string; overview: string; availability: string; launch_date: string;
  fuel_types: string[]; transmission_types: string[];
  is_hot: boolean; is_new: boolean; is_upcoming: boolean; is_bestseller: boolean;
  variants: CarVariant[];
  colors: CarColor[];
  images: CarImage[];
  specifications: CarSpec[];
  offers: CarOffer[];
  pros: string; cons: string; key_highlights: string; competitors: string;
  brochure_url: string;
  db_id?: string;
}

const generateSlug = (brand: string, name: string) =>
  `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const autoCalcOnRoad = (exShowroom: string) => {
  const ex = Number(exShowroom) || 0;
  if (ex === 0) return { rto: '', insurance: '', tcs: '', on_road_price: '' };
  const rto = Math.round(ex * 0.08);
  const insurance = Math.round(ex * 0.035);
  const tcs = ex > 1000000 ? Math.round(ex * 0.01) : 0;
  const onRoad = ex + rto + insurance + tcs + 500 + 1000 + 15000;
  return { rto: String(rto), insurance: String(insurance), tcs: String(tcs), on_road_price: String(onRoad) };
};

const emptyForm = (): CarFormData => ({
  name: '', brand: '', slug: '', body_type: 'Hatchback',
  price_range: '', price_numeric: '', original_price: '', discount: '',
  tagline: '', overview: '', availability: 'Available', launch_date: '',
  fuel_types: ['Petrol'], transmission_types: ['Manual'],
  is_hot: false, is_new: true, is_upcoming: false, is_bestseller: false,
  variants: [], colors: [], images: [], specifications: [],
  offers: [], pros: '', cons: '', key_highlights: '', competitors: '', brochure_url: '',
});

const formatINR = (num: number) => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

// ─── Searchable Combobox ───
const SearchCombobox = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between h-10 font-normal">
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search...`} className="h-9" />
          <CommandList>
            <CommandEmpty>Not found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {options.map(o => (
                <CommandItem key={o} value={o} onSelect={() => { onChange(o); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === o ? "opacity-100" : "opacity-0")} />
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
// ─── Main Wizard Component ───
// ═══════════════════════════════════════════════
export const CarUploadWizard = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CarFormData>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch brands
  const { data: dbBrands } = useQuery({
    queryKey: ['car-brands-names'],
    queryFn: async () => {
      const { data } = await supabase.from('car_brands').select('name').eq('is_active', true).order('sort_order');
      return data?.map(b => b.name) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const update = useCallback((field: keyof CarFormData, value: any) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'name' || field === 'brand') {
        updated.slug = generateSlug(field === 'brand' ? value : prev.brand, field === 'name' ? value : prev.name);
      }
      return updated;
    });
  }, []);

  const toggleArrayValue = (field: 'fuel_types' | 'transmission_types', val: string) => {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
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

  // ─── Save ───
  const handleSave = async () => {
    if (!form.name.trim() || !form.brand.trim()) {
      toast.error('Car name and brand are required');
      setStep(0);
      return;
    }
    setIsSaving(true);
    try {
      const slug = form.slug || generateSlug(form.brand, form.name);

      // Check existing or create
      const { data: existing } = await supabase.from('cars').select('id').eq('slug', slug).maybeSingle();
      let carId: string;

      const carPayload = {
        slug, name: form.name.trim(), brand: form.brand, body_type: form.body_type,
        price_range: form.price_range || null, price_numeric: form.price_numeric ? Number(form.price_numeric) : null,
        original_price: form.original_price || null, discount: form.discount || null,
        tagline: form.tagline || null, overview: form.overview || null,
        availability: form.availability || 'Available',
        launch_date: form.launch_date || null,
        fuel_types: form.fuel_types.length ? form.fuel_types : null,
        transmission_types: form.transmission_types.length ? form.transmission_types : null,
        is_hot: form.is_hot, is_new: form.is_new, is_upcoming: form.is_upcoming, is_bestseller: form.is_bestseller,
        key_highlights: form.key_highlights ? form.key_highlights.split('\n').filter(Boolean) : null,
        pros: form.pros ? form.pros.split('\n').filter(Boolean) : null,
        cons: form.cons ? form.cons.split('\n').filter(Boolean) : null,
        competitors: form.competitors ? form.competitors.split(',').map(s => s.trim()).filter(Boolean) : null,
        brochure_url: form.brochure_url || null,
      };

      if (existing) {
        // Delete sub-records and update
        await Promise.all([
          supabase.from('car_images').delete().eq('car_id', existing.id),
          supabase.from('car_colors').delete().eq('car_id', existing.id),
          supabase.from('car_variants').delete().eq('car_id', existing.id),
          supabase.from('car_specifications').delete().eq('car_id', existing.id),
          supabase.from('car_offers').delete().eq('car_id', existing.id),
        ]);
        const { error } = await supabase.from('cars').update(carPayload).eq('id', existing.id);
        if (error) throw error;
        carId = existing.id;
      } else {
        const { data: carData, error } = await supabase.from('cars').insert([carPayload]).select('id').single();
        if (error) throw error;
        carId = carData.id;
      }

      // Insert images
      if (form.images.length > 0) {
        const imgs = [];
        for (let i = 0; i < form.images.length; i++) {
          const img = form.images[i];
          let url = img.url.trim();
          if (img.file) url = await uploadFile(img.file, slug, `gallery-${i}`);
          if (url) imgs.push({ car_id: carId, url, alt_text: img.alt_text || form.name, is_primary: img.is_primary, sort_order: i + 1 });
        }
        if (imgs.length) await supabase.from('car_images').insert(imgs);
      }

      // Insert colors
      if (form.colors.length > 0) {
        const cols = [];
        for (let i = 0; i < form.colors.length; i++) {
          const c = form.colors[i];
          let imgUrl = c.image_url || '';
          if (c.file) imgUrl = await uploadFile(c.file, slug, `color-${c.name.replace(/\s+/g, '-').toLowerCase()}`);
          if (c.name.trim()) cols.push({ car_id: carId, name: c.name, hex_code: c.hex_code, image_url: imgUrl || null, sort_order: i + 1 });
        }
        if (cols.length) await supabase.from('car_colors').insert(cols);
      }

      // Insert variants
      if (form.variants.length > 0) {
        const vars = form.variants.filter(v => v.name.trim()).map((v, i) => ({
          car_id: carId, name: v.name, price: v.price || v.ex_showroom,
          price_numeric: v.price_numeric ? Number(v.price_numeric) : (v.ex_showroom ? Number(v.ex_showroom) : null),
          fuel_type: v.fuel_type || null, transmission: v.transmission || null,
          ex_showroom: v.ex_showroom ? Number(v.ex_showroom) : null,
          rto: v.rto ? Number(v.rto) : null, insurance: v.insurance ? Number(v.insurance) : null,
          tcs: v.tcs ? Number(v.tcs) : null, on_road_price: v.on_road_price ? Number(v.on_road_price) : null,
          features: v.features ? v.features.split(',').map(s => s.trim()).filter(Boolean) : null,
          sort_order: i + 1,
        }));
        if (vars.length) await supabase.from('car_variants').insert(vars);
      }

      // Insert specs
      const allSpecs = form.specifications.filter(s => s.value.trim()).map((s, i) => ({
        car_id: carId, category: s.category, label: s.label, value: s.value, sort_order: i + 1,
      }));
      if (allSpecs.length) await supabase.from('car_specifications').insert(allSpecs);

      // Insert offers
      if (form.offers.length > 0) {
        const offs = form.offers.filter(o => o.title.trim()).map((o, i) => ({
          car_id: carId, title: o.title, description: o.description || null,
          discount: o.discount, offer_type: o.offer_type, valid_till: o.valid_till || null,
          is_active: true, sort_order: i + 1,
        }));
        if (offs.length) await supabase.from('car_offers').insert(offs);
      }

      invalidateCarQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin-all-cars'] });
      toast.success(`${form.name} saved successfully!`);
      setForm(emptyForm());
      setStep(0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return form.name.trim() && form.brand.trim();
    return true;
  };

  const stepCompleteness = () => {
    return {
      basic: !!(form.name && form.brand && form.body_type),
      variants: form.variants.length > 0,
      colors: form.colors.length > 0,
      specs: form.specifications.filter(s => s.value).length > 0,
      gallery: form.images.length > 0,
      content: !!(form.overview || form.pros || form.cons),
      review: true,
    };
  };
  const completion = stepCompleteness();

  // ═══ RENDER ═══
  return (
    <div className="flex h-full bg-background">
      {/* ─── Left Sidebar: Steps ─── */}
      <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            Car Upload Wizard
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">Step-by-step car data entry</p>
        </div>
        <div className="flex-1 p-3 space-y-1">
          {STEPS.map((s, i) => {
            const key = s.id as keyof typeof completion;
            const isComplete = completion[key];
            const isCurrent = step === i;
            return (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                  isCurrent ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-accent",
                  !isCurrent && isComplete && "text-foreground",
                  !isCurrent && !isComplete && "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                  isCurrent ? "bg-primary-foreground/20 text-primary-foreground" :
                  isComplete ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                  "bg-muted text-muted-foreground"
                )}>
                  {isComplete && !isCurrent ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{s.label}</div>
                  <div className={cn("text-[10px] truncate", isCurrent ? "text-primary-foreground/70" : "text-muted-foreground")}>{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        {form.name && (
          <div className="p-3 border-t bg-muted/30">
            <div className="text-[10px] text-muted-foreground">Editing</div>
            <div className="text-xs font-bold truncate">{form.brand} {form.name}</div>
            <div className="text-[10px] font-mono text-muted-foreground truncate">{form.slug}</div>
          </div>
        )}
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Step Header */}
        <div className="border-b bg-gradient-to-r from-muted/40 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            {(() => { const Icon = STEPS[step].icon; return <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>; })()}
            <div>
              <h3 className="text-base font-bold">Step {step + 1}: {STEPS[step].label}</h3>
              <p className="text-xs text-muted-foreground">{STEPS[step].desc}</p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 0: Basic Identity */}
          {step === 0 && (
            <div className="max-w-3xl space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Brand <span className="text-destructive">*</span></label>
                  <SearchCombobox value={form.brand} onChange={v => update('brand', v)} options={dbBrands || []} placeholder="Select Brand..." />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Car Name <span className="text-destructive">*</span></label>
                  <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Swift, Creta, Nexon" className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Body Type</label>
                  <SearchCombobox value={form.body_type} onChange={v => update('body_type', v)} options={BODY_TYPES} placeholder="Select..." />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Slug (auto-generated)</label>
                  <Input value={form.slug} onChange={e => update('slug', e.target.value)} className="h-10 font-mono text-xs" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Availability</label>
                  <Select value={form.availability} onValueChange={v => update('availability', v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Coming Soon">Coming Soon</SelectItem>
                      <SelectItem value="Discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Price Range (Display)</label>
                  <Input value={form.price_range} onChange={e => update('price_range', e.target.value)} placeholder="₹6.49L - ₹9.64L" className="h-10" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Starting Price (Numeric)</label>
                  <Input value={form.price_numeric} onChange={e => update('price_numeric', e.target.value.replace(/\D/g, ''))} placeholder="649000" className="h-10 font-mono" />
                  {form.price_numeric && <span className="text-[10px] text-muted-foreground mt-0.5 block">{formatINR(Number(form.price_numeric))}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Original Price</label>
                  <Input value={form.original_price} onChange={e => update('original_price', e.target.value)} placeholder="₹7.00L (before discount)" className="h-10" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Discount</label>
                  <Input value={form.discount} onChange={e => update('discount', e.target.value)} placeholder="₹25,000" className="h-10" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Tagline</label>
                <Input value={form.tagline} onChange={e => update('tagline', e.target.value)} placeholder="Play Bold. Drive Smart." className="h-10" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Launch Date</label>
                <Input type="date" value={form.launch_date} onChange={e => update('launch_date', e.target.value)} className="h-10 w-48" />
              </div>

              {/* Fuel & Transmission */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold mb-2 block">Fuel Types</label>
                  <div className="flex flex-wrap gap-2">
                    {FUEL_OPTIONS.map(f => (
                      <button key={f} type="button" onClick={() => toggleArrayValue('fuel_types', f)}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          form.fuel_types.includes(f) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"
                        )}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-2 block">Transmission Types</label>
                  <div className="flex flex-wrap gap-2">
                    {TRANSMISSION_OPTIONS.map(t => (
                      <button key={t} type="button" onClick={() => toggleArrayValue('transmission_types', t)}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          form.transmission_types.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"
                        )}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div>
                <label className="text-xs font-semibold mb-2 block">Tags / Flags</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'is_hot', label: '🔥 Hot', color: 'bg-red-100 border-red-300 text-red-700' },
                    { key: 'is_new', label: '✨ New', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                    { key: 'is_upcoming', label: '🚀 Upcoming', color: 'bg-purple-100 border-purple-300 text-purple-700' },
                    { key: 'is_bestseller', label: '⭐ Bestseller', color: 'bg-amber-100 border-amber-300 text-amber-700' },
                  ].map(flag => (
                    <button key={flag.key} type="button" onClick={() => update(flag.key as any, !form[flag.key as keyof CarFormData])}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        form[flag.key as keyof CarFormData] ? flag.color : "bg-muted/30 text-muted-foreground border-border"
                      )}>
                      {flag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Variants & Pricing */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Variants with On-Road Price Breakup</h4>
                  <p className="text-[11px] text-muted-foreground">Enter ex-showroom price → RTO, Insurance, TCS auto-calculate</p>
                </div>
                <Button size="sm" onClick={() => update('variants', [...form.variants, { name: '', price: '', price_numeric: '', fuel_type: 'Petrol', transmission: 'Manual', ex_showroom: '', rto: '', insurance: '', tcs: '', on_road_price: '', features: '' }])}>
                  <Plus className="h-4 w-4 mr-1" />Add Variant
                </Button>
              </div>
              {form.variants.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No variants added yet</p>
                  <p className="text-[11px] text-muted-foreground">Click "Add Variant" to add LXi, VXi, ZXi etc.</p>
                </div>
              )}
              {form.variants.map((v, vi) => (
                <div key={vi} className="border rounded-xl p-4 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px]">Variant {vi + 1}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => update('variants', form.variants.filter((_, j) => j !== vi))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Variant Name</label>
                      <Input value={v.name} onChange={e => { const vs = [...form.variants]; vs[vi] = { ...vs[vi], name: e.target.value }; update('variants', vs); }} placeholder="LXi / VXi / ZXi+" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Display Price</label>
                      <Input value={v.price} onChange={e => { const vs = [...form.variants]; vs[vi] = { ...vs[vi], price: e.target.value }; update('variants', vs); }} placeholder="₹6.49 Lakh*" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Ex-Showroom ₹ (enter to auto-calc)</label>
                      <Input value={v.ex_showroom} onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const calc = autoCalcOnRoad(val);
                        const vs = [...form.variants]; vs[vi] = { ...vs[vi], ex_showroom: val, price_numeric: val, ...calc }; update('variants', vs);
                      }} placeholder="649000" className="h-9 text-sm font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">RTO</label>
                      <Input value={v.rto} readOnly className="h-9 text-sm font-mono bg-muted/30" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Insurance</label>
                      <Input value={v.insurance} readOnly className="h-9 text-sm font-mono bg-muted/30" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">TCS</label>
                      <Input value={v.tcs} readOnly className="h-9 text-sm font-mono bg-muted/30" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">On-Road Price ₹</label>
                      <Input value={v.on_road_price} readOnly className="h-9 text-sm font-mono font-bold bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" />
                      {v.on_road_price && <span className="text-[10px] text-emerald-600 font-semibold">{formatINR(Number(v.on_road_price))}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Fuel Type</label>
                      <Select value={v.fuel_type} onValueChange={val => { const vs = [...form.variants]; vs[vi] = { ...vs[vi], fuel_type: val }; update('variants', vs); }}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{FUEL_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Transmission</label>
                      <Select value={v.transmission} onValueChange={val => { const vs = [...form.variants]; vs[vi] = { ...vs[vi], transmission: val }; update('variants', vs); }}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{TRANSMISSION_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Features (comma separated)</label>
                      <Input value={v.features} onChange={e => { const vs = [...form.variants]; vs[vi] = { ...vs[vi], features: e.target.value }; update('variants', vs); }} placeholder="AC, ABS, 4 Airbags, Touchscreen" className="h-9 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2: Colors & Images */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Available Colors</h4>
                  <p className="text-[11px] text-muted-foreground">Add each color with its hex code and upload the car image in that color</p>
                </div>
                <Button size="sm" onClick={() => update('colors', [...form.colors, { name: '', hex_code: '#000000', image_url: '' }])}>
                  <Plus className="h-4 w-4 mr-1" />Add Color
                </Button>
              </div>
              {form.colors.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Palette className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No colors added yet</p>
                  <p className="text-[11px] text-muted-foreground">Add colors like "Napoli Black", "Pearl Arctic White" etc.</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.colors.map((color, ci) => (
                  <div key={ci} className="border rounded-xl p-4 bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border-2 shadow-sm" style={{ backgroundColor: color.hex_code }} />
                        <div>
                          <span className="text-xs font-bold">{color.name || `Color ${ci + 1}`}</span>
                          <span className="text-[10px] font-mono text-muted-foreground block">{color.hex_code}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => update('colors', form.colors.filter((_, j) => j !== ci))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Color Name</label>
                        <Input value={color.name} onChange={e => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], name: e.target.value }; update('colors', cols); }} placeholder="Napoli Black" className="h-9" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Hex Code</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={color.hex_code} onChange={e => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], hex_code: e.target.value }; update('colors', cols); }} className="w-9 h-9 rounded-lg border cursor-pointer shrink-0" />
                          <Input value={color.hex_code} onChange={e => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], hex_code: e.target.value }; update('colors', cols); }} className="h-9 font-mono text-xs" />
                        </div>
                      </div>
                    </div>
                    {/* Color Image Upload */}
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block">Car Image in This Color</label>
                      {(color.image_url || color.file) ? (
                        <div className="relative group rounded-lg overflow-hidden border bg-muted h-36">
                          <img src={color.file ? URL.createObjectURL(color.file) : color.image_url} className="w-full h-full object-cover" alt={color.name} />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="cursor-pointer bg-white/90 text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white">
                              Replace
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const cols = [...form.colors]; cols[ci] = { ...cols[ci], file, image_url: '' }; update('colors', cols); } }} />
                            </label>
                            <button onClick={() => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], file: undefined, image_url: '' }; update('colors', cols); }} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Remove</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <label className="flex-1 cursor-pointer border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:bg-primary/5 transition-colors">
                            <Upload className="h-5 w-5 text-primary mx-auto mb-1" />
                            <span className="text-xs text-primary font-semibold">Upload Image</span>
                            <span className="text-[10px] text-muted-foreground block">PNG, JPG up to 5MB</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const cols = [...form.colors]; cols[ci] = { ...cols[ci], file }; update('colors', cols); } }} />
                          </label>
                          <div className="flex-1">
                            <Input value={color.image_url} onChange={e => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], image_url: e.target.value, file: undefined }; update('colors', cols); }} placeholder="Or paste image URL..." className="h-full text-xs" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Specifications */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Technical Specifications</h4>
                  <p className="text-[11px] text-muted-foreground">Fill in only what's available — blank fields won't be saved</p>
                </div>
                {form.specifications.length === 0 && (
                  <Button size="sm" onClick={() => update('specifications', SPEC_TEMPLATES.map(t => ({ category: t.category, label: t.label, value: '' })))}>
                    <Plus className="h-4 w-4 mr-1" />Load All Spec Fields
                  </Button>
                )}
              </div>
              {form.specifications.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Gauge className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click "Load All Spec Fields" to get 34 specification fields</p>
                  <p className="text-[10px] text-muted-foreground">Engine, Dimensions, Performance, Features & Safety</p>
                </div>
              ) : (
                ['engine', 'dimensions', 'performance', 'features', 'safety'].map(cat => {
                  const catSpecs = form.specifications.filter(s => s.category === cat);
                  if (!catSpecs.length) return null;
                  const catLabel = { engine: '🔧 Engine', dimensions: '📐 Dimensions', performance: '⚡ Performance', features: '🎯 Features', safety: '🛡️ Safety' }[cat];
                  return (
                    <div key={cat} className="border rounded-xl p-4 bg-card">
                      <h5 className="text-xs font-bold mb-3">{catLabel}</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {catSpecs.map(spec => {
                          const gi = form.specifications.indexOf(spec);
                          const tpl = SPEC_TEMPLATES.find(t => t.category === cat && t.label === spec.label);
                          return (
                            <div key={gi}>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">{spec.label}</label>
                              <Input value={spec.value} onChange={e => { const ss = [...form.specifications]; ss[gi] = { ...ss[gi], value: e.target.value }; update('specifications', ss); }} placeholder={tpl?.placeholder || ''} className="h-9 text-sm" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* STEP 4: Gallery */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Gallery Images</h4>
                  <p className="text-[11px] text-muted-foreground">Upload hero image (displayed on cards) and gallery photos</p>
                </div>
                <Button size="sm" onClick={() => update('images', [...form.images, { url: '', alt_text: '', is_primary: form.images.length === 0, file: undefined }])}>
                  <Plus className="h-4 w-4 mr-1" />Add Image
                </Button>
              </div>
              {form.images.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No gallery images added</p>
                  <p className="text-[11px] text-muted-foreground">First image is automatically set as hero</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {form.images.map((img, ii) => (
                  <div key={ii} className="border rounded-xl overflow-hidden bg-card">
                    <div className="relative h-40 bg-muted flex items-center justify-center">
                      {(img.url || img.file) ? (
                        <img src={img.file ? URL.createObjectURL(img.file) : img.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                      {img.is_primary && <Badge className="absolute top-2 left-2 bg-primary text-[10px]">★ Hero Image</Badge>}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer text-center py-1.5 rounded-lg border border-dashed border-primary/40 text-xs font-semibold text-primary hover:bg-primary/5">
                          <Upload className="h-3.5 w-3.5 inline mr-1" />Upload
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const imgs = [...form.images]; imgs[ii] = { ...imgs[ii], file, url: '' }; update('images', imgs); } }} />
                        </label>
                        <Input value={img.url} onChange={e => { const imgs = [...form.images]; imgs[ii] = { ...imgs[ii], url: e.target.value, file: undefined }; update('images', imgs); }} placeholder="Paste URL" className="h-8 text-xs flex-1" />
                      </div>
                      <Input value={img.alt_text} onChange={e => { const imgs = [...form.images]; imgs[ii] = { ...imgs[ii], alt_text: e.target.value }; update('images', imgs); }} placeholder="Alt text (SEO)" className="h-8 text-xs" />
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={() => { const imgs = form.images.map((im, j) => ({ ...im, is_primary: j === ii })); update('images', imgs); }}
                          className={cn("text-[10px] font-bold px-2.5 py-1 rounded-md border", img.is_primary ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:bg-accent")}>
                          {img.is_primary ? '★ Hero' : 'Set as Hero'}
                        </button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => update('images', form.images.filter((_, j) => j !== ii))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Content & Offers */}
          {step === 5 && (
            <div className="max-w-4xl space-y-6">
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Overview / Description</label>
                <Textarea value={form.overview} onChange={e => update('overview', e.target.value)} placeholder="The all-new car offers best-in-class mileage, premium interiors..." className="min-h-[120px]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5"><ThumbsUp className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-semibold">Pros (one per line)</span></div>
                  <Textarea value={form.pros} onChange={e => update('pros', e.target.value)} placeholder={"Great mileage\nSpacious cabin\n6 Airbags standard"} className="min-h-[120px] text-sm" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5"><ThumbsDown className="h-3.5 w-3.5 text-red-500" /><span className="text-xs font-semibold">Cons (one per line)</span></div>
                  <Textarea value={form.cons} onChange={e => update('cons', e.target.value)} placeholder={"No diesel option\nBasic interior quality\nSmall boot"} className="min-h-[120px] text-sm" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5"><Star className="h-3.5 w-3.5 text-amber-500" /><span className="text-xs font-semibold">Key Highlights (one per line)</span></div>
                  <Textarea value={form.key_highlights} onChange={e => update('key_highlights', e.target.value)} placeholder={"Best mileage in segment\n6 Airbags\nSunroof available"} className="min-h-[120px] text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Brochure URL</label>
                  <Input value={form.brochure_url} onChange={e => update('brochure_url', e.target.value)} placeholder="https://oem.com/brochure.pdf" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Competitors (comma separated slugs)</label>
                  <Input value={form.competitors} onChange={e => update('competitors', e.target.value)} placeholder="hyundai-i20, tata-altroz, toyota-glanza" className="font-mono text-xs" />
                </div>
              </div>

              {/* Offers */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold flex items-center gap-1.5"><Tag className="h-4 w-4" />Dealer Offers</h4>
                  <Button size="sm" variant="outline" onClick={() => update('offers', [...form.offers, { title: '', description: '', discount: '', offer_type: 'cashback', valid_till: '' }])}>
                    <Plus className="h-4 w-4 mr-1" />Add Offer
                  </Button>
                </div>
                {form.offers.map((offer, oi) => (
                  <div key={oi} className="flex items-center gap-2 bg-card rounded-lg border p-3 mb-2">
                    <Input value={offer.title} onChange={e => { const os = [...form.offers]; os[oi] = { ...os[oi], title: e.target.value }; update('offers', os); }} placeholder="Cash Discount" className="h-9 w-36" />
                    <Input value={offer.discount} onChange={e => { const os = [...form.offers]; os[oi] = { ...os[oi], discount: e.target.value }; update('offers', os); }} placeholder="₹25,000" className="h-9 w-24" />
                    <Select value={offer.offer_type} onValueChange={v => { const os = [...form.offers]; os[oi] = { ...os[oi], offer_type: v }; update('offers', os); }}>
                      <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cashback">Cash Discount</SelectItem>
                        <SelectItem value="exchange">Exchange Bonus</SelectItem>
                        <SelectItem value="accessory">Accessories</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={offer.description} onChange={e => { const os = [...form.offers]; os[oi] = { ...os[oi], description: e.target.value }; update('offers', os); }} placeholder="Description" className="h-9 flex-1" />
                    <Input type="date" value={offer.valid_till} onChange={e => { const os = [...form.offers]; os[oi] = { ...os[oi], valid_till: e.target.value }; update('offers', os); }} className="h-9 w-36" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => update('offers', form.offers.filter((_, j) => j !== oi))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: Review */}
          {step === 6 && (
            <div className="max-w-3xl space-y-4">
              <div className="border rounded-xl p-5 bg-card">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2"><Eye className="h-4 w-4" />Review Summary</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Brand</span><span className="font-semibold">{form.brand || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Car Name</span><span className="font-semibold">{form.name || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Slug</span><span className="font-mono text-xs">{form.slug || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Body Type</span><span>{form.body_type}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Price Range</span><span>{form.price_range || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Availability</span><span>{form.availability}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fuel Types</span><span>{form.fuel_types.join(', ')}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Transmission</span><span>{form.transmission_types.join(', ')}</span></div>
                </div>
              </div>

              {/* Data Counts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Variants', count: form.variants.length, icon: Layers, color: 'text-blue-600' },
                  { label: 'Colors', count: form.colors.length, icon: Palette, color: 'text-purple-600' },
                  { label: 'Gallery', count: form.images.length, icon: ImageIcon, color: 'text-emerald-600' },
                  { label: 'Specs', count: form.specifications.filter(s => s.value).length, icon: Gauge, color: 'text-amber-600' },
                ].map(item => (
                  <div key={item.label} className="border rounded-xl p-3 bg-card text-center">
                    <item.icon className={cn("h-5 w-5 mx-auto mb-1", item.color)} />
                    <div className="text-lg font-bold">{item.count}</div>
                    <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {(!form.name || !form.brand) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Car name and brand are required!
                </div>
              )}
              {form.variants.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  No variants added — visitors won't see pricing details
                </div>
              )}
              {form.images.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  No gallery images — car card will show a placeholder
                </div>
              )}

              <Button size="lg" className="w-full gap-2 h-12 text-base font-bold" onClick={handleSave} disabled={isSaving || !form.name || !form.brand}>
                {isSaving ? <><Loader2 className="h-5 w-5 animate-spin" />Saving...</> : <><Save className="h-5 w-5" />Save & Publish to Website</>}
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t bg-muted/20 px-6 py-3 flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" />Previous
          </Button>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} className={cn("w-2.5 h-2.5 rounded-full transition-all", step === i ? "bg-primary w-6" : "bg-border hover:bg-muted-foreground")} />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving || !form.name || !form.brand} className="gap-1.5">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save & Publish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
