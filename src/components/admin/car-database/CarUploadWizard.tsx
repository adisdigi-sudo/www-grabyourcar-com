import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import { useRoadTaxRules, calculateOnRoadPrice } from "@/hooks/useRoadTaxEngine";
import {
  Check, ChevronsUpDown, ChevronRight, ChevronLeft,
  Car, Palette, Layers, Gauge, Image as ImageIcon, FileText,
  Plus, Trash2, Upload, Save, ThumbsUp, ThumbsDown, CheckCircle2,
  AlertCircle, Loader2, ArrowRight, Sparkles, MapPin, Building2, User, FileUp, Link2, Star, Tag, Eye, Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ───
const BODY_TYPES = ['Hatchback','Sedan','Compact SUV','Mid-Size SUV','Full-Size SUV','MPV','MUV','Coupe','Convertible','Pickup','Electric','Luxury','Crossover'];
const FUEL_OPTIONS = ['Petrol','Diesel','Electric','Hybrid','CNG','LPG'];
const TRANSMISSION_OPTIONS = ['Manual','Automatic','AMT','CVT','DCT','iMT'];

const STEPS = [
  { id: 'basic', label: 'Car Info', icon: Car, desc: 'Brand & model name' },
  { id: 'variants', label: 'Variants', icon: Layers, desc: 'Pricing & variants' },
  { id: 'colors', label: 'Colors', icon: Palette, desc: 'Colors & images' },
  { id: 'specs', label: 'Specs', icon: Gauge, desc: 'Technical details' },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon, desc: 'Photos' },
  { id: 'content', label: 'Content', icon: FileText, desc: 'Details & offers' },
  { id: 'review', label: 'Save', icon: CheckCircle2, desc: 'Review & publish' },
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
  features: string; state_code: string; city: string; ownership_type: string;
}
interface CarColor { name: string; hex_code: string; image_url: string; file?: File }
interface CarImage { url: string; alt_text: string; is_primary: boolean; file?: File }
interface CarSpec { category: string; label: string; value: string }
interface CarOffer { title: string; description: string; discount: string; offer_type: string; valid_till: string }
interface CarBrochureEntry { title: string; url: string; file?: File; variant_name: string; language: string }

interface CarFormData {
  name: string; brand: string; slug: string; body_type: string;
  price_range: string; price_numeric: string; original_price: string; discount: string;
  tagline: string; overview: string; availability: string; launch_date: string;
  fuel_types: string[]; transmission_types: string[];
  is_hot: boolean; is_new: boolean; is_upcoming: boolean; is_bestseller: boolean;
  variants: CarVariant[]; colors: CarColor[]; images: CarImage[];
  specifications: CarSpec[]; offers: CarOffer[]; brochures: CarBrochureEntry[];
  pros: string; cons: string; key_highlights: string; competitors: string; brochure_url: string;
}

const generateSlug = (brand: string, name: string) =>
  `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const emptyForm = (): CarFormData => ({
  name: '', brand: '', slug: '', body_type: 'Hatchback',
  price_range: '', price_numeric: '', original_price: '', discount: '',
  tagline: '', overview: '', availability: 'Available', launch_date: '',
  fuel_types: ['Petrol'], transmission_types: ['Manual'],
  is_hot: false, is_new: true, is_upcoming: false, is_bestseller: false,
  variants: [], colors: [], images: [],
  specifications: SPEC_TEMPLATES.map(t => ({ category: t.category, label: t.label, value: '' })),
  offers: [], brochures: [], pros: '', cons: '', key_highlights: '', competitors: '', brochure_url: '',
});

const formatINR = (num: number) => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

// ─── Searchable Combobox with Custom Input ───
const SearchCombobox = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const isCustom = value && !options.includes(value);

  if (customMode || isCustom) {
    return (
      <div className="flex gap-1.5">
        <Input value={isCustom && !customMode ? value : customVal} onChange={e => setCustomVal(e.target.value)} placeholder="Type custom value..." className="h-11 text-sm flex-1" autoFocus />
        <Button size="sm" variant="default" className="h-11 px-3" onClick={() => { if (customVal.trim()) { onChange(customVal.trim()); setCustomMode(false); setCustomVal(''); } }}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" className="h-11 px-3" onClick={() => { setCustomMode(false); setCustomVal(''); if (isCustom) onChange(''); }}>✕</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="flex-1 justify-between h-11 font-normal text-sm">
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." className="h-9" />
            <CommandList>
              <CommandEmpty>
                <button className="w-full text-left px-2 py-1.5 text-xs text-primary hover:underline" onClick={() => { setOpen(false); setCustomMode(true); }}>
                  + Add custom value
                </button>
              </CommandEmpty>
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
      <Button size="sm" variant="ghost" className="h-11 px-2 text-[10px] text-muted-foreground shrink-0" onClick={() => setCustomMode(true)} title="Add custom">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

// ─── Select with Custom "Other" option ───
const SelectWithCustom = ({ value, onChange, options, placeholder, className: cls }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; className?: string }) => {
  const [customMode, setCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const isCustom = value && !options.includes(value) && value !== '_none';

  if (customMode || isCustom) {
    return (
      <div className="flex gap-1">
        <Input value={isCustom && !customMode ? value : customVal} onChange={e => setCustomVal(e.target.value)} placeholder="Custom..." className={cn("text-xs flex-1", cls || 'h-9')} autoFocus />
        <Button size="icon" variant="default" className={cn("shrink-0", cls || 'h-9 w-9')} onClick={() => { if (customVal.trim()) { onChange(customVal.trim()); setCustomMode(false); setCustomVal(''); } }}><Check className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className={cn("shrink-0", cls || 'h-9 w-9')} onClick={() => { setCustomMode(false); setCustomVal(''); if (isCustom) onChange(options[0] || ''); }}>✕</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <Select value={options.includes(value) ? value : '__other'} onValueChange={v => { if (v === '__other') { setCustomMode(true); } else { onChange(v); } }}>
        <SelectTrigger className={cn(cls || 'h-9')}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          <SelectItem value="__other" className="text-primary font-medium">+ Custom</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// ═══════════════════════════════════════════════
// ─── Main Wizard Component ───
// ═══════════════════════════════════════════════
export const CarUploadWizard = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);
  const [form, setForm] = useState<CarFormData>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
  const [generatingField, setGeneratingField] = useState<string | null>(null);



  const runAutoFill = useCallback(async () => {
    if (!form.brand || !form.name) return;
    setIsAutoFilling(true);
    setAutoFillError(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-car-autofill', {
        body: { brand: form.brand, model: form.name },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'AI returned no data');

      const ai = data.data;
      setForm(prev => ({
        ...prev,
        body_type: ai.body_type || prev.body_type,
        tagline: ai.tagline || prev.tagline,
        overview: ai.overview || prev.overview,
        fuel_types: ai.fuel_types?.length ? ai.fuel_types : prev.fuel_types,
        transmission_types: ai.transmission_types?.length ? ai.transmission_types : prev.transmission_types,
        is_hot: ai.is_hot ?? prev.is_hot,
        is_new: ai.is_new ?? prev.is_new,
        is_upcoming: ai.is_upcoming ?? prev.is_upcoming,
        is_bestseller: ai.is_bestseller ?? prev.is_bestseller,
        pros: ai.pros || prev.pros,
        cons: ai.cons || prev.cons,
        key_highlights: ai.key_highlights || prev.key_highlights,
        variants: ai.variants?.map((v: any) => ({
          name: v.name || '', price: '', price_numeric: String(v.ex_showroom || ''),
          fuel_type: v.fuel_type || 'Petrol', transmission: v.transmission || 'Manual',
          ex_showroom: String(v.ex_showroom || ''), rto: '', insurance: '', tcs: '', on_road_price: '',
          features: v.features || '', state_code: 'DL', city: '', ownership_type: 'individual',
        })) || prev.variants,
        colors: ai.colors?.map((c: any) => ({
          name: c.name || '', hex_code: c.hex_code || '#000000', image_url: '',
        })) || prev.colors,
        specifications: ai.specifications?.length
          ? ai.specifications.map((s: any) => ({ category: s.category, label: s.label, value: s.value }))
          : prev.specifications,
      }));
      toast.success(`🎉 AI filled ${ai.variants?.length || 0} variants, ${ai.colors?.length || 0} colors, ${ai.specifications?.length || 0} specs!`);
    } catch (err: any) {
      setAutoFillError(err.message || 'Failed to auto-fill');
      toast.error('AI auto-fill failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAutoFilling(false);
    }
  }, [form.brand, form.name]);

  const { data: roadTaxRules } = useRoadTaxRules();

  const availableStates = useMemo(() => {
    if (!roadTaxRules) return [];
    const stateMap = new Map<string, string>();
    roadTaxRules.forEach(r => stateMap.set(r.state_code, r.state_name));
    return Array.from(stateMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [roadTaxRules]);

  const getCitiesForState = useCallback((stateCode: string) => {
    if (!roadTaxRules) return [];
    return [...new Set(roadTaxRules.filter(r => r.state_code === stateCode && r.city).map(r => r.city!))].sort();
  }, [roadTaxRules]);

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

  const generateField = useCallback(async (field: string) => {
    if (!form.brand || !form.name) { toast.error('Enter brand and car name first'); return; }
    setGeneratingField(field);
    try {
      const { data, error } = await supabase.functions.invoke('ai-car-content', {
        body: {
          brand: form.brand, model: form.name, body_type: form.body_type,
          fuel_types: form.fuel_types, transmission_types: form.transmission_types,
          variants: form.variants.map(v => ({ name: v.name, ex_showroom: v.ex_showroom })),
          specifications: form.specifications.filter(s => s.value),
          field,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'AI returned no data');

      const content = data.content;
      switch (field) {
        case 'overview': update('overview', content); break;
        case 'tagline': update('tagline', content); break;
        case 'pros': update('pros', content); break;
        case 'cons': update('cons', content); break;
        case 'key_highlights': update('key_highlights', content); break;
        case 'competitors': update('competitors', content); break;
        case 'specifications':
          if (Array.isArray(content)) {
            setForm(prev => ({
              ...prev,
              specifications: SPEC_TEMPLATES.map(t => {
                const aiSpec = content.find((s: any) => s.category === t.category && s.label === t.label);
                const existing = prev.specifications.find(s => s.category === t.category && s.label === t.label);
                return { category: t.category, label: t.label, value: existing?.value || aiSpec?.value || '' };
              }),
            }));
          }
          break;
      }
      toast.success(`✨ ${field.replace(/_/g, ' ')} generated!`);
    } catch (err: any) {
      toast.error(`AI generation failed: ${err.message}`);
    } finally {
      setGeneratingField(null);
    }
  }, [form.brand, form.name, form.body_type, form.fuel_types, form.transmission_types, form.variants, form.specifications, update]);


  const toggleArrayValue = (field: 'fuel_types' | 'transmission_types', val: string) => {
    setForm(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const recalcVariant = useCallback((variant: CarVariant): CarVariant => {
    const ex = Number(variant.ex_showroom) || 0;
    if (ex === 0 || !roadTaxRules?.length) return variant;
    const breakup = calculateOnRoadPrice(roadTaxRules, ex, variant.state_code || 'DL', variant.fuel_type?.toLowerCase() || 'petrol', variant.ownership_type || 'individual', variant.city || undefined);
    return { ...variant, price_numeric: String(ex), rto: String(breakup.roadTax), insurance: String(breakup.insurance), tcs: String(breakup.tcs), on_road_price: String(breakup.onRoadPrice) };
  }, [roadTaxRules]);

  // Auto-derive price range from variants
  const autoPriceRange = useMemo(() => {
    const prices = form.variants.map(v => Number(v.ex_showroom)).filter(p => p > 0).sort((a, b) => a - b);
    if (prices.length === 0) return '';
    if (prices.length === 1) return formatINR(prices[0]);
    return `${formatINR(prices[0])} - ${formatINR(prices[prices.length - 1])}`;
  }, [form.variants]);

  // ─── Validation ───
  const validateStep = useCallback((stepIdx: number): string[] => {
    const errors: string[] = [];
    switch (stepIdx) {
      case 0:
        if (!form.brand.trim()) errors.push('Select a brand');
        if (!form.name.trim()) errors.push('Enter car name');
        break;
      case 1:
        if (form.variants.length === 0) errors.push('Add at least 1 variant');
        form.variants.forEach((v, i) => {
          if (!v.name.trim()) errors.push(`Variant ${i + 1}: Name required`);
          if (!v.ex_showroom) errors.push(`Variant ${i + 1}: Ex-showroom price required`);
        });
        break;
      case 2:
        if (form.colors.length === 0) errors.push('Add at least 1 color');
        break;
      // Steps 3-5 are optional
    }
    return errors;
  }, [form]);

  const currentErrors = useMemo(() => validateStep(step), [validateStep, step]);
  const canProceed = currentErrors.length === 0;

  const stepStatus = useMemo(() => {
    return STEPS.map((_, i) => {
      if (i > highestStep) return 'locked' as const;
      const errs = validateStep(i);
      if (errs.length === 0) return 'complete' as const;
      if (i === step) return 'current' as const;
      return 'incomplete' as const;
    });
  }, [validateStep, step, highestStep]);

  const overallProgress = useMemo(() => {
    const completed = stepStatus.filter(s => s === 'complete').length;
    return Math.round((completed / STEPS.length) * 100);
  }, [stepStatus]);

  const goNext = () => {
    if (!canProceed) { toast.error(currentErrors[0]); return; }
    // Auto-fill price range from variants when leaving step 1
    if (step === 1 && autoPriceRange && !form.price_range) {
      const lowestPrice = form.variants.map(v => Number(v.ex_showroom)).filter(p => p > 0).sort((a, b) => a - b)[0];
      setForm(prev => ({ ...prev, price_range: autoPriceRange, price_numeric: lowestPrice ? String(lowestPrice) : prev.price_numeric }));
    }
    const next = step + 1;
    setStep(next);
    setHighestStep(prev => Math.max(prev, next));
  };
  const goBack = () => setStep(Math.max(0, step - 1));
  const goToStep = (idx: number) => { if (idx <= highestStep) setStep(idx); };

  // ─── Upload helper ───
  const uploadFile = async (file: File, carSlug: string, prefix: string, bucket = 'car-images'): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${carSlug}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!form.name.trim() || !form.brand.trim()) { toast.error('Car name and brand are required'); return; }
    setIsSaving(true);
    try {
      const slug = form.slug || generateSlug(form.brand, form.name);
      const { data: existing } = await supabase.from('cars').select('id').eq('slug', slug).maybeSingle();
      let carId: string;

      const carPayload = {
        slug, name: form.name.trim(), brand: form.brand, body_type: form.body_type,
        price_range: form.price_range || autoPriceRange || null,
        price_numeric: form.price_numeric ? Number(form.price_numeric) : null,
        original_price: form.original_price || null, discount: form.discount || null,
        tagline: form.tagline || null, overview: form.overview || null,
        availability: form.availability || 'Available', launch_date: form.launch_date || null,
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
        await Promise.all([
          supabase.from('car_images').delete().eq('car_id', existing.id),
          supabase.from('car_colors').delete().eq('car_id', existing.id),
          supabase.from('car_variants').delete().eq('car_id', existing.id),
          supabase.from('car_specifications').delete().eq('car_id', existing.id),
          supabase.from('car_offers').delete().eq('car_id', existing.id),
          supabase.from('car_brochures').delete().eq('car_id', existing.id),
        ]);
        const { error } = await supabase.from('cars').update(carPayload).eq('id', existing.id);
        if (error) throw error;
        carId = existing.id;
      } else {
        const { data: carData, error } = await supabase.from('cars').insert([carPayload]).select('id').single();
        if (error) throw error;
        carId = carData.id;
      }

      // Save images
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

      // Save colors
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

      // Save variants
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

      // Save specs
      const allSpecs = form.specifications.filter(s => s.value.trim()).map((s, i) => ({
        car_id: carId, category: s.category, label: s.label, value: s.value, sort_order: i + 1,
      }));
      if (allSpecs.length) await supabase.from('car_specifications').insert(allSpecs);

      // Save offers
      if (form.offers.length > 0) {
        const offs = form.offers.filter(o => o.title.trim()).map((o, i) => ({
          car_id: carId, title: o.title, description: o.description || null,
          discount: o.discount, offer_type: o.offer_type, valid_till: o.valid_till || null,
          is_active: true, sort_order: i + 1,
        }));
        if (offs.length) await supabase.from('car_offers').insert(offs);
      }

      // Save brochures
      for (const b of form.brochures) {
        let url = b.url;
        if (b.file) url = await uploadFile(b.file, slug, `brochure-${b.title.replace(/\s+/g, '-').toLowerCase()}`, 'brochures');
        if (url) {
          await supabase.from('car_brochures').insert({
            car_id: carId, title: b.title || `${form.name} Brochure`, url,
            variant_name: b.variant_name || null, language: b.language || 'English',
          });
        }
      }

      invalidateCarQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin-all-cars'] });
      toast.success(`🎉 ${form.name} saved successfully!`);
      setForm(emptyForm());
      setStep(0);
      setHighestStep(0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Quick add variant ───
  const addVariant = () => update('variants', [...form.variants, {
    name: '', price: '', price_numeric: '', fuel_type: form.fuel_types[0] || 'Petrol',
    transmission: form.transmission_types[0] || 'Manual',
    ex_showroom: '', rto: '', insurance: '', tcs: '', on_road_price: '', features: '',
    state_code: 'DL', city: '', ownership_type: 'individual',
  }]);

  const duplicateVariant = (vi: number) => {
    const src = form.variants[vi];
    update('variants', [...form.variants, { ...src, name: src.name + ' (Copy)' }]);
    toast.success('Variant duplicated');
  };

  // ═══ RENDER ═══
  return (
    <div className="flex flex-col h-full bg-background">
      {/* ─── Compact Progress Header ─── */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {form.name ? `${form.brand} ${form.name}` : 'Add New Car'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Step {step + 1}/{STEPS.length}</span>
            <Badge variant={overallProgress === 100 ? "default" : "outline"} className="text-[10px] font-bold">{overallProgress}%</Badge>
          </div>
        </div>
        <Progress value={overallProgress} className="h-1.5 mb-2" />

        {/* Minimal step dots */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const status = stepStatus[i];
            return (
              <button
                key={s.id}
                onClick={() => goToStep(i)}
                disabled={status === 'locked'}
                className={cn(
                  "flex-1 h-8 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1",
                  step === i && "bg-primary text-primary-foreground shadow-sm",
                  step !== i && status === 'complete' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                  step !== i && status !== 'complete' && status !== 'locked' && "bg-muted/50 text-muted-foreground",
                  status === 'locked' && "bg-muted/20 text-muted-foreground/30 cursor-not-allowed",
                )}
              >
                {status === 'complete' && step !== i ? <CheckCircle2 className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                <span className="hidden md:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Step Content ─── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* ════ STEP 0: Just Brand + Name + Body Type ════ */}
        {step === 0 && (
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Which car are you adding?</h3>
              <p className="text-xs text-muted-foreground mt-1">Just 3 fields to start — everything else comes later</p>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block">Brand <span className="text-destructive">*</span></label>
              <SearchCombobox value={form.brand} onChange={v => update('brand', v)} options={dbBrands || []} placeholder="Select brand..." />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block">Car Name <span className="text-destructive">*</span></label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Swift, Creta, Nexon, Fortuner" className="h-11 text-base" autoFocus />
            </div>

            {/* ═══ AI AUTO-FILL BUTTON ═══ */}
            {form.brand && form.name && (
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 bg-primary/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">AI Auto-Fill</span>
                  <Badge variant="secondary" className="text-[9px] h-4">Beta</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Let AI fetch all variants, specs, colors & pricing for <strong>{form.brand} {form.name}</strong> automatically
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 w-full"
                  disabled={isAutoFilling}
                  onClick={() => runAutoFill()}
                >
                  {isAutoFilling ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Fetching data from AI...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" />Auto-Fill Everything with AI</>
                  )}
                </Button>
                {autoFillError && (
                  <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{autoFillError}</p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold mb-1.5 block">Body Type</label>
              <div className="flex flex-wrap gap-1.5">
                {BODY_TYPES.map(bt => (
                  <button key={bt} onClick={() => update('body_type', bt)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      form.body_type === bt ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-accent"
                    )}>{bt}</button>
                ))}
              </div>
            </div>

            {/* Fuel & Transmission chips */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Fuel Types</label>
                <div className="flex flex-wrap gap-1.5">
                  {FUEL_OPTIONS.map(f => (
                    <button key={f} onClick={() => toggleArrayValue('fuel_types', f)}
                      className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                        form.fuel_types.includes(f) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-accent"
                      )}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Transmission</label>
                <div className="flex flex-wrap gap-1.5">
                  {TRANSMISSION_OPTIONS.map(t => (
                    <button key={t} onClick={() => toggleArrayValue('transmission_types', t)}
                      className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                        form.transmission_types.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-accent"
                      )}>{t}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'is_hot', label: '🔥 Hot', active: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                  { key: 'is_new', label: '✨ New', active: 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                  { key: 'is_upcoming', label: '🚀 Upcoming', active: 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                  { key: 'is_bestseller', label: '⭐ Bestseller', active: 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
                ].map(flag => (
                  <button key={flag.key} onClick={() => update(flag.key as any, !form[flag.key as keyof CarFormData])}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      form[flag.key as keyof CarFormData] ? flag.active : "bg-muted/30 text-muted-foreground border-border"
                    )}>{flag.label}</button>
                ))}
              </div>
            </div>

            {/* Optional advanced — collapsed by default */}
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-primary font-medium hover:underline">
              {showAdvanced ? '▲ Hide' : '▼ Show'} optional details (tagline, slug, pricing)
            </button>
            {showAdvanced && (
              <div className="space-y-3 p-3 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/20">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Slug (auto)</label>
                    <Input value={form.slug} onChange={e => update('slug', e.target.value)} className="h-9 font-mono text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Availability</label>
                    <SelectWithCustom value={form.availability} onChange={v => update('availability', v)} options={['Available', 'Coming Soon', 'Discontinued']} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Tagline</label>
                      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] gap-1 text-primary" onClick={() => generateField('tagline')} disabled={generatingField === 'tagline'}>
                        {generatingField === 'tagline' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}AI
                      </Button>
                    </div>
                    <Input value={form.tagline} onChange={e => update('tagline', e.target.value)} placeholder="Play Bold. Drive Smart." className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Launch Date</label>
                    <Input type="date" value={form.launch_date} onChange={e => update('launch_date', e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Price Range</label>
                    <Input value={form.price_range} onChange={e => update('price_range', e.target.value)} placeholder="Auto-filled from variants" className="h-9 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Original Price</label>
                    <Input value={form.original_price} onChange={e => update('original_price', e.target.value)} placeholder="₹7.00L" className="h-9 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Discount</label>
                    <Input value={form.discount} onChange={e => update('discount', e.target.value)} placeholder="₹25,000" className="h-9 text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 1: Variants ════ */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-lg font-bold">Add Variants for {form.brand} {form.name}</h3>
              <p className="text-xs text-muted-foreground">Enter ex-showroom price → RTO, Insurance, TCS auto-calculate</p>
            </div>

            {/* Bulk Variant Template */}
            <div className="border rounded-xl bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Quick Add Variant Templates</span>
              </div>
              <p className="text-xs text-muted-foreground">Select a fuel type to auto-generate common Indian variant names</p>
              
              <div className="flex flex-wrap gap-2">
                {(form.fuel_types.length > 0 ? form.fuel_types : FUEL_OPTIONS.slice(0, 3)).map(fuel => {
                  // Brand-aware Indian variant name templates
                  const brandTemplates: Record<string, string[]> = {
                    'Maruti Suzuki': ['LXi', 'VXi', 'ZXi', 'ZXi+', 'Alpha'],
                    'Tata': ['Smart', 'Pure', 'Adventure', 'Accomplished', 'Creative', 'Fearless'],
                    'Hyundai': ['E', 'EX', 'S', 'SX', 'SX(O)', 'Asta'],
                    'Mahindra': ['MX', 'AX3', 'AX5', 'AX7', 'AX7L'],
                    'Kia': ['HTE', 'HTK', 'HTK+', 'HTX', 'HTX+', 'GTX+'],
                    'Toyota': ['E', 'G', 'S', 'V', 'VX', 'ZX'],
                    'Honda': ['E', 'S', 'V', 'VX', 'ZX'],
                  };
                  const defaultNames = ['LX', 'VX', 'ZX', 'ZX+', 'Top'];
                  const variantNames = brandTemplates[form.brand] || defaultNames;

                  return (
                    <Button key={fuel} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                      const newVariants = variantNames.map(n => ({
                        name: `${n} ${fuel}`, price: '', price_numeric: '', fuel_type: fuel,
                        transmission: form.transmission_types[0] || 'Manual',
                        ex_showroom: '', rto: '', insurance: '', tcs: '', on_road_price: '', features: '',
                        state_code: 'DL', city: '', ownership_type: 'individual',
                      }));
                      update('variants', [...form.variants, ...newVariants]);
                      toast.success(`Added ${variantNames.length} ${fuel} variants (${variantNames.join(', ')})`);
                    }}>
                      <Plus className="h-3 w-3" />{fuel} ({(brandTemplates[form.brand] || defaultNames).length} variants)
                    </Button>
                  );
                })}
              </div>

              {form.brand && (
                <p className="text-[10px] text-muted-foreground">
                  Template: {form.brand} → {(() => {
                    const bt: Record<string, string[]> = {
                      'Maruti Suzuki': ['LXi', 'VXi', 'ZXi', 'ZXi+', 'Alpha'],
                      'Tata': ['Smart', 'Pure', 'Adventure', 'Accomplished', 'Creative', 'Fearless'],
                      'Hyundai': ['E', 'EX', 'S', 'SX', 'SX(O)', 'Asta'],
                      'Mahindra': ['MX', 'AX3', 'AX5', 'AX7', 'AX7L'],
                      'Kia': ['HTE', 'HTK', 'HTK+', 'HTX', 'HTX+', 'GTX+'],
                      'Toyota': ['E', 'G', 'S', 'V', 'VX', 'ZX'],
                      'Honda': ['E', 'S', 'V', 'VX', 'ZX'],
                    };
                    return (bt[form.brand] || ['LX', 'VX', 'ZX', 'ZX+', 'Top']).join(', ');
                  })()}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button onClick={addVariant} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />Add Single Variant
              </Button>
              {form.variants.length > 0 && (
                <span className="text-xs text-muted-foreground">{form.variants.length} variant{form.variants.length > 1 ? 's' : ''} added</span>
              )}
            </div>

            {form.variants.length === 0 && (
              <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center bg-primary/5">
                <Layers className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                <p className="text-sm font-semibold">No variants yet</p>
                <p className="text-xs text-muted-foreground mt-1">Use templates above or add manually</p>
                <Button onClick={addVariant} size="sm" className="mt-3 gap-1.5"><Plus className="h-4 w-4" />Add First Variant</Button>
              </div>
            )}

            {/* Group variants by fuel type visually */}
            {(() => {
              const fuelGroups = new Map<string, number[]>();
              form.variants.forEach((v, i) => {
                const fuel = v.fuel_type || 'Other';
                if (!fuelGroups.has(fuel)) fuelGroups.set(fuel, []);
                fuelGroups.get(fuel)!.push(i);
              });
              const groups = Array.from(fuelGroups.entries());
              const showHeaders = groups.length > 1;

              return groups.map(([fuelType, indices]) => (
                <div key={fuelType} className="space-y-4">
                  {showHeaders && (
                    <div className="flex items-center gap-2 px-2 pt-2">
                      <Badge variant="outline" className="text-xs font-semibold">⛽ {fuelType} Variants</Badge>
                      <span className="text-xs text-muted-foreground">{indices.length} variant{indices.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {indices.map(vi => {
                    const v = form.variants[vi];
                    const stateCities = getCitiesForState(v.state_code);
                    return (
                      <div key={vi} className="border rounded-xl bg-card overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] font-mono">#{vi + 1}</Badge>
                            <span className="text-sm font-semibold">{v.name || 'Untitled Variant'}</span>
                            {v.on_road_price && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">{formatINR(Number(v.on_road_price))}</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateVariant(vi)} title="Duplicate"><Copy className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => update('variants', form.variants.filter((_, j) => j !== vi))}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Variant Name *</label>
                              <Input value={v.name} onChange={e => { const vs = [...form.variants]; vs[vi] = { ...vs[vi], name: e.target.value }; update('variants', vs); }} placeholder="e.g. LXi, VXi, ZXi+" className="h-10" autoFocus={vi === form.variants.length - 1} />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Ex-Showroom Price ₹ *</label>
                              <Input value={v.ex_showroom} onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                const vs = [...form.variants]; vs[vi] = recalcVariant({ ...vs[vi], ex_showroom: val }); update('variants', vs);
                              }} placeholder="649000" className="h-10 font-mono" />
                              {v.ex_showroom && <span className="text-[10px] text-primary font-medium">{formatINR(Number(v.ex_showroom))}</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Fuel Type</label>
                              <SelectWithCustom value={v.fuel_type} onChange={val => { const vs = [...form.variants]; vs[vi] = recalcVariant({ ...vs[vi], fuel_type: val }); update('variants', vs); }} options={FUEL_OPTIONS} className="h-9" />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Transmission</label>
                              <SelectWithCustom value={v.transmission} onChange={val => { const vs = [...form.variants]; vs[vi] = { ...vs[vi], transmission: val }; update('variants', vs); }} options={TRANSMISSION_OPTIONS} className="h-9" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 p-2.5 rounded-lg bg-muted/20 border border-dashed border-muted-foreground/15">
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" />State</label>
                              <Select value={v.state_code || 'DL'} onValueChange={val => { const vs = [...form.variants]; vs[vi] = recalcVariant({ ...vs[vi], state_code: val, city: '' }); update('variants', vs); }}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{availableStates.length > 0 ? availableStates.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>) : <SelectItem value="DL">Delhi</SelectItem>}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1"><Building2 className="h-3 w-3" />City</label>
                              <Select value={v.city || '_none'} onValueChange={val => { const vs = [...form.variants]; vs[vi] = recalcVariant({ ...vs[vi], city: val === '_none' ? '' : val }); update('variants', vs); }}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                                <SelectContent><SelectItem value="_none">Default</SelectItem>{stateCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1"><User className="h-3 w-3" />Ownership</label>
                              <SelectWithCustom value={v.ownership_type || 'individual'} onChange={val => { const vs = [...form.variants]; vs[vi] = recalcVariant({ ...vs[vi], ownership_type: val }); update('variants', vs); }} options={['individual', 'corporate']} className="h-8" />
                            </div>
                          </div>
                          {v.ex_showroom && Number(v.ex_showroom) > 0 && (
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label: 'RTO', val: v.rto, color: 'text-blue-600' },
                                { label: 'Insurance', val: v.insurance, color: 'text-orange-600' },
                                { label: 'TCS (1%)', val: v.tcs, color: 'text-purple-600' },
                                { label: 'On-Road', val: v.on_road_price, color: 'text-emerald-700 font-bold' },
                              ].map(item => (
                                <div key={item.label} className="rounded-lg bg-muted/30 p-2">
                                  <div className="text-[9px] text-muted-foreground">{item.label}</div>
                                  <div className={cn("text-xs font-semibold", item.color)}>{item.val ? formatINR(Number(item.val)) : '—'}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Key Features (comma separated)</label>
                            <Input value={v.features} onChange={e => { const vs = [...form.variants]; vs[vi] = { ...vs[vi], features: e.target.value }; update('variants', vs); }} placeholder="AC, ABS, 4 Airbags, Sunroof" className="h-9 text-xs" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        )}

        {/* ════ STEP 2: Colors with linked images ════ */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-lg font-bold">Colors for {form.brand} {form.name}</h3>
              <p className="text-xs text-muted-foreground">Add each color + upload car photo in that color</p>
            </div>

            <div className="flex justify-center">
              <Button onClick={() => update('colors', [...form.colors, { name: '', hex_code: '#000000', image_url: '' }])} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />Add Color
              </Button>
            </div>

            {form.colors.length === 0 && (
              <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center bg-primary/5">
                <Palette className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                <p className="text-sm font-semibold">No colors yet</p>
                <Button onClick={() => update('colors', [...form.colors, { name: '', hex_code: '#000000', image_url: '' }])} size="sm" className="mt-3 gap-1.5"><Plus className="h-4 w-4" />Add First Color</Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.colors.map((color, ci) => (
                <div key={ci} className="border rounded-xl overflow-hidden bg-card">
                  {/* Color image preview area */}
                  <div className="relative h-36 bg-muted flex items-center justify-center">
                    {(color.image_url || color.file) ? (
                      <>
                        <img src={color.file ? URL.createObjectURL(color.file) : color.image_url} className="w-full h-full object-cover" alt={color.name} />
                        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="cursor-pointer bg-white/90 text-black px-3 py-1.5 rounded-lg text-xs font-semibold">
                            Replace
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const cols = [...form.colors]; cols[ci] = { ...cols[ci], file, image_url: '' }; update('colors', cols); } }} />
                          </label>
                          <button onClick={() => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], file: undefined, image_url: '' }; update('colors', cols); }} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Remove</button>
                        </div>
                      </>
                    ) : (
                      <label className="cursor-pointer text-center p-4 w-full h-full flex flex-col items-center justify-center hover:bg-primary/5 transition-colors">
                        <Upload className="h-6 w-6 text-primary/50 mb-1" />
                        <span className="text-xs text-primary font-semibold">Upload {color.name || 'car'} image</span>
                        <span className="text-[10px] text-muted-foreground">Click to browse</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const cols = [...form.colors]; cols[ci] = { ...cols[ci], file }; update('colors', cols); } }} />
                      </label>
                    )}
                    {/* Color swatch badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-white/90 dark:bg-black/70 rounded-full px-2 py-1">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color.hex_code }} />
                      <span className="text-[10px] font-semibold">{color.name || `Color ${ci + 1}`}</span>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Input value={color.name} onChange={e => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], name: e.target.value }; update('colors', cols); }} placeholder="Color name, e.g. Napoli Black" className="h-9 text-sm" />
                      <div className="flex items-center gap-1">
                        <input type="color" value={color.hex_code} onChange={e => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], hex_code: e.target.value }; update('colors', cols); }} className="w-9 h-9 rounded-lg border cursor-pointer" />
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => update('colors', form.colors.filter((_, j) => j !== ci))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    {/* URL fallback */}
                    {!color.file && (
                      <Input value={color.image_url} onChange={e => { const cols = [...form.colors]; cols[ci] = { ...cols[ci], image_url: e.target.value }; update('colors', cols); }} placeholder="Or paste image URL" className="h-8 text-[11px]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ STEP 3: Specs (optional) ════ */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-lg font-bold">Specifications</h3>
              <p className="text-xs text-muted-foreground">Fill what you have — blank fields are skipped. <strong>This step is optional</strong>, you can click Next.</p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => generateField('specifications')} disabled={generatingField === 'specifications'}>
                {generatingField === 'specifications' ? <><Loader2 className="h-4 w-4 animate-spin" />Generating specs...</> : <><Sparkles className="h-4 w-4" />Auto-Fill All Specs with AI</>}
              </Button>
            </div>
            {['engine', 'dimensions', 'performance', 'features', 'safety'].map(cat => {
              const catSpecs = form.specifications.filter(s => s.category === cat);
              if (!catSpecs.length) return null;
              const icons: Record<string, string> = { engine: '🔧', dimensions: '📐', performance: '⚡', features: '🎯', safety: '🛡️' };
              return (
                <div key={cat} className="border rounded-xl p-3 bg-card">
                  <h5 className="text-xs font-bold mb-2 capitalize">{icons[cat]} {cat}</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {catSpecs.map(spec => {
                      const gi = form.specifications.indexOf(spec);
                      const tpl = SPEC_TEMPLATES.find(t => t.category === cat && t.label === spec.label);
                      return (
                        <div key={gi}>
                          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">{spec.label}</label>
                          <Input value={spec.value} onChange={e => { const ss = [...form.specifications]; ss[gi] = { ...ss[gi], value: e.target.value }; update('specifications', ss); }} placeholder={tpl?.placeholder || ''} className="h-8 text-xs" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════ STEP 4: Gallery ════ */}
        {step === 4 && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-lg font-bold">Gallery Photos</h3>
              <p className="text-xs text-muted-foreground">Upload hero image + additional gallery. <strong>Optional — color images already uploaded above.</strong></p>
            </div>
            <div className="flex justify-center">
              <Button onClick={() => update('images', [...form.images, { url: '', alt_text: '', is_primary: form.images.length === 0, file: undefined }])} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />Add Image
              </Button>
            </div>

            {form.images.length === 0 && (
              <div className="border-2 border-dashed border-muted-foreground/15 rounded-xl p-8 text-center bg-muted/10">
                <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No gallery images — this is optional</p>
                <p className="text-xs text-muted-foreground mt-1">Color images you added in Step 3 will show on the website</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {form.images.map((img, ii) => (
                <div key={ii} className="border rounded-xl overflow-hidden bg-card">
                  <div className="relative h-32 bg-muted flex items-center justify-center">
                    {(img.url || img.file) ? (
                      <img src={img.file ? URL.createObjectURL(img.file) : img.url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                    )}
                    {img.is_primary && <Badge className="absolute top-2 left-2 bg-primary text-[9px]">★ Hero</Badge>}
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="flex gap-1.5">
                      <label className="cursor-pointer text-center py-1 rounded border border-dashed border-primary/30 text-[10px] font-semibold text-primary hover:bg-primary/5 flex-1">
                        <Upload className="h-3 w-3 inline mr-0.5" />Upload
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const imgs = [...form.images]; imgs[ii] = { ...imgs[ii], file, url: '' }; update('images', imgs); } }} />
                      </label>
                      <Input value={img.url} onChange={e => { const imgs = [...form.images]; imgs[ii] = { ...imgs[ii], url: e.target.value, file: undefined }; update('images', imgs); }} placeholder="URL" className="h-7 text-[10px] flex-1" />
                    </div>
                    <Input value={img.alt_text} onChange={e => { const imgs = [...form.images]; imgs[ii] = { ...imgs[ii], alt_text: e.target.value }; update('images', imgs); }} placeholder="Alt text" className="h-7 text-[10px]" />
                    <div className="flex items-center justify-between">
                      <button onClick={() => { const imgs = form.images.map((im, j) => ({ ...im, is_primary: j === ii })); update('images', imgs); }}
                        className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", img.is_primary ? "bg-primary text-primary-foreground" : "text-muted-foreground border-border hover:bg-accent")}>
                        {img.is_primary ? '★ Hero' : 'Set Hero'}
                      </button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => update('images', form.images.filter((_, j) => j !== ii))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ STEP 5: Content, Brochures & Offers ════ */}
        {step === 5 && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="text-center mb-2">
              <h3 className="text-lg font-bold">Content & Offers</h3>
              <p className="text-xs text-muted-foreground">Add description, brochure, pros/cons — <strong>all optional</strong></p>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Overview / Description</label>
              <Textarea value={form.overview} onChange={e => update('overview', e.target.value)} placeholder="Describe the car in 2-3 sentences..." className="min-h-[100px] text-sm" />
            </div>

            {/* Brochure quick section */}
            <div className="border rounded-xl p-3 bg-card space-y-2">
              <h4 className="text-xs font-bold flex items-center gap-1.5"><FileUp className="h-3.5 w-3.5 text-primary" />Brochure</h4>
              <div className="flex gap-2 items-center">
                <Input value={form.brochure_url} onChange={e => update('brochure_url', e.target.value)} placeholder="Paste brochure PDF URL" className="h-9 text-sm flex-1" />
                <span className="text-[10px] text-muted-foreground">or</span>
                <Button size="sm" variant="outline" onClick={() => update('brochures', [...form.brochures, { title: `${form.name} Brochure`, url: '', variant_name: '', language: 'English' }])} className="gap-1 shrink-0">
                  <Plus className="h-3.5 w-3.5" />Upload
                </Button>
              </div>
              {form.brochures.map((b, bi) => (
                <div key={bi} className="flex items-center gap-2 bg-muted/20 rounded-lg p-2">
                  <Input value={b.title} onChange={e => { const bs = [...form.brochures]; bs[bi] = { ...bs[bi], title: e.target.value }; update('brochures', bs); }} placeholder="Title" className="h-8 text-xs flex-1" />
                  <SelectWithCustom value={b.language || 'English'} onChange={v => { const bs = [...form.brochures]; bs[bi] = { ...bs[bi], language: v }; update('brochures', bs); }} options={['English','Hindi','Tamil','Telugu','Marathi','Kannada','Bengali','Gujarati']} className="h-8" />
                  <label className="cursor-pointer px-2 py-1 rounded border border-dashed border-primary/30 text-[10px] text-primary font-semibold hover:bg-primary/5 shrink-0">
                    {b.file ? `📎 ${b.file.name.slice(0, 15)}` : '📄 Upload PDF'}
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const bs = [...form.brochures]; bs[bi] = { ...bs[bi], file, url: file.name }; update('brochures', bs); } }} />
                  </label>
                  {!b.file && <Input value={b.url} onChange={e => { const bs = [...form.brochures]; bs[bi] = { ...bs[bi], url: e.target.value }; update('brochures', bs); }} placeholder="URL" className="h-8 text-[10px] flex-1" />}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => update('brochures', form.brochures.filter((_, j) => j !== bi))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>

            {/* Pros / Cons / Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1"><ThumbsUp className="h-3 w-3 text-emerald-500" /><span className="text-xs font-semibold">Pros</span></div>
                <Textarea value={form.pros} onChange={e => update('pros', e.target.value)} placeholder={"Great mileage\nSpacious cabin"} className="min-h-[90px] text-xs" />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1"><ThumbsDown className="h-3 w-3 text-red-500" /><span className="text-xs font-semibold">Cons</span></div>
                <Textarea value={form.cons} onChange={e => update('cons', e.target.value)} placeholder={"No diesel option\nSmall boot"} className="min-h-[90px] text-xs" />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1"><Star className="h-3 w-3 text-amber-500" /><span className="text-xs font-semibold">Key Highlights</span></div>
                <Textarea value={form.key_highlights} onChange={e => update('key_highlights', e.target.value)} placeholder={"Best mileage\n6 Airbags"} className="min-h-[90px] text-xs" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Competitors (comma separated)</label>
              <Input value={form.competitors} onChange={e => update('competitors', e.target.value)} placeholder="hyundai-i20, tata-altroz" className="h-9 text-xs font-mono" />
            </div>

            {/* Offers */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold flex items-center gap-1"><Tag className="h-3.5 w-3.5" />Dealer Offers</h4>
                <Button size="sm" variant="outline" onClick={() => update('offers', [...form.offers, { title: '', description: '', discount: '', offer_type: 'cashback', valid_till: '' }])} className="gap-1 text-xs h-7">
                  <Plus className="h-3.5 w-3.5" />Add Offer
                </Button>
              </div>
              {form.offers.map((offer, oi) => (
                <div key={oi} className="flex flex-wrap items-center gap-2 bg-card rounded-lg border p-2 mb-2">
                  <Input value={offer.title} onChange={e => { const os = [...form.offers]; os[oi] = { ...os[oi], title: e.target.value }; update('offers', os); }} placeholder="Title" className="h-8 w-32 text-xs" />
                  <Input value={offer.discount} onChange={e => { const os = [...form.offers]; os[oi] = { ...os[oi], discount: e.target.value }; update('offers', os); }} placeholder="₹25,000" className="h-8 w-20 text-xs" />
                  <SelectWithCustom value={offer.offer_type} onChange={v => { const os = [...form.offers]; os[oi] = { ...os[oi], offer_type: v }; update('offers', os); }} options={['cashback','exchange','accessory','finance']} className="h-8" />
                  <Input value={offer.description} onChange={e => { const os = [...form.offers]; os[oi] = { ...os[oi], description: e.target.value }; update('offers', os); }} placeholder="Description" className="h-8 flex-1 text-xs min-w-[100px]" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => update('offers', form.offers.filter((_, j) => j !== oi))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ STEP 6: Review ════ */}
        {step === 6 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold">Ready to Save!</h3>
              <p className="text-xs text-muted-foreground">Review your data below, then hit Save</p>
            </div>

            {/* Summary card */}
            <div className="border rounded-xl p-4 bg-card">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {[
                  ['Brand', form.brand],
                  ['Car Name', form.name],
                  ['Body Type', form.body_type],
                  ['Slug', form.slug],
                  ['Fuel', form.fuel_types.join(', ')],
                  ['Transmission', form.transmission_types.join(', ')],
                  ['Price Range', form.price_range || autoPriceRange || '—'],
                  ['Availability', form.availability],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between py-0.5 border-b border-dashed border-muted/50">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="font-medium text-xs">{val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Variants', count: form.variants.length, Icon: Layers, color: 'text-blue-600' },
                { label: 'Colors', count: form.colors.length, Icon: Palette, color: 'text-purple-600' },
                { label: 'Gallery', count: form.images.length, Icon: ImageIcon, color: 'text-emerald-600' },
                { label: 'Specs', count: form.specifications.filter(s => s.value).length, Icon: Gauge, color: 'text-amber-600' },
                { label: 'Brochures', count: form.brochures.length + (form.brochure_url ? 1 : 0), Icon: FileUp, color: 'text-pink-600' },
              ].map(item => (
                <div key={item.label} className="border rounded-lg p-2 text-center bg-card">
                  <item.Icon className={cn("h-4 w-4 mx-auto mb-0.5", item.color)} />
                  <div className="text-base font-bold">{item.count}</div>
                  <div className="text-[9px] text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>

            {form.variants.length === 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />No variants added — go back to Step 2 to add pricing
              </div>
            )}

            <Button size="lg" className="w-full gap-2 h-12 text-base font-bold" onClick={handleSave} disabled={isSaving || !form.name || !form.brand}>
              {isSaving ? <><Loader2 className="h-5 w-5 animate-spin" />Saving...</> : <><Save className="h-5 w-5" />Save & Publish</>}
            </Button>
          </div>
        )}
      </div>

      {/* ─── Bottom Nav ─── */}
      <div className="border-t bg-card px-4 py-2.5 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goBack} disabled={step === 0} className="gap-1">
          <ChevronLeft className="h-4 w-4" />Back
        </Button>

        <div className="text-[11px] text-muted-foreground">
          <span className="font-bold">{step + 1}</span> of {STEPS.length} — {STEPS[step].label}
          {step >= 3 && step <= 5 && <span className="ml-1.5 text-primary font-medium">(optional)</span>}
        </div>

        {step < STEPS.length - 1 ? (
          <Button onClick={goNext} size="sm" className="gap-1 min-w-[120px]">
            {canProceed ? 'Next' : 'Complete to proceed'}<ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-1 min-w-[120px]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save
          </Button>
        )}
      </div>
    </div>
  );
};
