import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Loader2, Trash2, Save, Download, Eye, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCSV, downloadCSVFile } from "@/lib/spreadsheetUtils";

interface ParsedCar {
  id: string;
  name: string;
  brand: string;
  body_type: string;
  price_range: string;
  fuel_types: string[];
  transmission_types: string[];
  is_hot: boolean;
  is_new: boolean;
  is_upcoming: boolean;
  is_bestseller: boolean;
  tagline: string;
  overview: string;
  discount: string;
  variants: { name: string; fuel_type: string; transmission: string; ex_showroom: number; features: string }[];
  colors: { name: string; hex_code: string }[];
  specs: { category: string; label: string; value: string }[];
  status: 'pending' | 'saving' | 'saved' | 'error';
  errorMsg?: string;
}

const TEMPLATE_HEADERS = [
  'Brand*', 'Car Name*', 'Body Type', 'Fuel Types (comma-sep)', 'Transmission (comma-sep)',
  'Tagline', 'Overview', 'Discount', 'Is Hot', 'Is New', 'Is Upcoming', 'Is Bestseller',
  'Variant Name', 'Variant Fuel', 'Variant Transmission', 'Ex-Showroom ₹', 'Variant Features',
  'Color Name', 'Color Hex',
  'Spec Category', 'Spec Label', 'Spec Value',
];

const generateSlug = (brand: string, name: string) =>
  `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export const BulkCSVUpload = ({ onClose }: { onClose?: () => void }) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedCars, setParsedCars] = useState<ParsedCar[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);

  const downloadTemplate = () => {
    const sampleData = [
      TEMPLATE_HEADERS,
      ['Maruti Suzuki', 'Swift', 'Hatchback', 'Petrol', 'Manual, AMT', 'Play Bold', 'The all-new Swift...', '₹25,000', '', 'TRUE', '', '',
        'LXi', 'Petrol', 'Manual', '599000', 'AC, Power Steering',
        'Arctic White', '#FFFFFF',
        'engine', 'Displacement', '1197 cc'],
      ['', '', '', '', '', '', '', '', '', '', '', '',
        'VXi', 'Petrol', 'Manual', '699000', 'Touchscreen, Alloys',
        'Midnight Black', '#1A1A1A',
        'engine', 'Max Power', '88.7 bhp'],
      ['', '', '', '', '', '', '', '', '', '', '', '',
        'ZXi', 'Petrol', 'AMT', '799000', 'Sunroof, LED DRLs',
        'Pearl Red', '#CC0000',
        'dimensions', 'Length', '3995 mm'],
      ['Tata', 'Nexon', 'Compact SUV', 'Petrol, Diesel', 'Manual, AMT', 'Drive Dark', 'Bold SUV...', '', 'TRUE', 'TRUE', '', '',
        'Smart', 'Petrol', 'Manual', '799000', 'Dual Airbags',
        'Flame Red', '#FF2200',
        'engine', 'Displacement', '1199 cc'],
    ];
    downloadCSVFile(sampleData, 'car-bulk-upload-template.csv');
    toast.success('Template downloaded!');
  };

  const parseFile = useCallback(async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const text = await file.text();
      const rows: string[][] = parseCSV(text);

      if (rows.length < 2) throw new Error('File has no data rows');

      const cars: ParsedCar[] = [];
      let currentCar: ParsedCar | null = null;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((c: any) => !c && c !== 0)) continue;

        const brand = String(row[0] || '').trim();
        const name = String(row[1] || '').trim();

        if (brand && name) {
          if (currentCar) cars.push(currentCar);
          currentCar = {
            id: crypto.randomUUID(),
            brand, name,
            body_type: String(row[2] || 'Hatchback').trim(),
            fuel_types: String(row[3] || 'Petrol').split(',').map(s => s.trim()).filter(Boolean),
            transmission_types: String(row[4] || 'Manual').split(',').map(s => s.trim()).filter(Boolean),
            tagline: String(row[5] || ''),
            overview: String(row[6] || ''),
            discount: String(row[7] || ''),
            is_hot: String(row[8]).toUpperCase() === 'TRUE',
            is_new: String(row[9]).toUpperCase() === 'TRUE',
            is_upcoming: String(row[10]).toUpperCase() === 'TRUE',
            is_bestseller: String(row[11]).toUpperCase() === 'TRUE',
            price_range: '',
            variants: [],
            colors: [],
            specs: [],
            status: 'pending',
          };
        }

        if (!currentCar) continue;

        const variantName = String(row[12] || '').trim();
        if (variantName) {
          currentCar.variants.push({
            name: variantName,
            fuel_type: String(row[13] || 'Petrol').trim(),
            transmission: String(row[14] || 'Manual').trim(),
            ex_showroom: Number(row[15]) || 0,
            features: String(row[16] || ''),
          });
        }

        const colorName = String(row[17] || '').trim();
        if (colorName) {
          currentCar.colors.push({
            name: colorName,
            hex_code: String(row[18] || '#000000').trim(),
          });
        }

        const specCat = String(row[19] || '').trim();
        const specLabel = String(row[20] || '').trim();
        const specValue = String(row[21] || '').trim();
        if (specCat && specLabel && specValue) {
          currentCar.specs.push({ category: specCat, label: specLabel, value: specValue });
        }
      }

      if (currentCar) cars.push(currentCar);

      // Auto-calc price range
      cars.forEach(car => {
        const prices = car.variants.map(v => v.ex_showroom).filter(p => p > 0).sort((a, b) => a - b);
        if (prices.length > 0) {
          const fmt = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`;
          car.price_range = prices.length === 1 ? fmt(prices[0]) : `${fmt(prices[0])} - ${fmt(prices[prices.length - 1])}`;
        }
      });

      setParsedCars(cars);
      toast.success(`Parsed ${cars.length} car(s) from ${file.name}`);
    } catch (err: any) {
      toast.error('Parse error: ' + (err.message || 'Invalid file'));
    } finally {
      setParsing(false);
    }
  }, []);

  const removeCar = (id: string) => setParsedCars(prev => prev.filter(c => c.id !== id));

  const saveSingle = async (car: ParsedCar) => {
    const slug = generateSlug(car.brand, car.name);
    const { data: existing } = await supabase.from('cars').select('id').eq('slug', slug).maybeSingle();
    let carId: string;

    const payload = {
      slug, name: car.name, brand: car.brand, body_type: car.body_type,
      price_range: car.price_range || null,
      price_numeric: car.variants[0]?.ex_showroom || null,
      discount: car.discount || null,
      tagline: car.tagline || null,
      overview: car.overview || null,
      availability: 'Available',
      fuel_types: car.fuel_types.length ? car.fuel_types : null,
      transmission_types: car.transmission_types.length ? car.transmission_types : null,
      is_hot: car.is_hot, is_new: car.is_new, is_upcoming: car.is_upcoming, is_bestseller: car.is_bestseller,
    };

    if (existing) {
      await Promise.all([
        supabase.from('car_variants').delete().eq('car_id', existing.id),
        supabase.from('car_colors').delete().eq('car_id', existing.id),
        supabase.from('car_specifications').delete().eq('car_id', existing.id),
      ]);
      const { error } = await supabase.from('cars').update(payload).eq('id', existing.id);
      if (error) throw error;
      carId = existing.id;
    } else {
      const { data, error } = await supabase.from('cars').insert([payload]).select('id').single();
      if (error) throw error;
      carId = data.id;
    }

    if (car.variants.length > 0) {
      const vars = car.variants.filter(v => v.name).map((v, i) => {
        const ex = v.ex_showroom;
        const rto = Math.round(ex * 0.08);
        const ins = Math.round(ex * 0.035);
        const tcs = ex > 1000000 ? Math.round(ex * 0.01) : 0;
        return {
          car_id: carId, name: v.name, price: String(ex), price_numeric: ex || null,
          fuel_type: v.fuel_type, transmission: v.transmission,
          ex_showroom: ex || null, rto, insurance: ins, tcs, on_road_price: ex + rto + ins + tcs + 16500,
          features: v.features ? v.features.split(',').map(s => s.trim()).filter(Boolean) : null,
          sort_order: i + 1,
        };
      });
      await supabase.from('car_variants').insert(vars);
    }

    if (car.colors.length > 0) {
      const cols = car.colors.filter(c => c.name).map((c, i) => ({
        car_id: carId, name: c.name, hex_code: c.hex_code, sort_order: i + 1,
      }));
      await supabase.from('car_colors').insert(cols);
    }

    if (car.specs.length > 0) {
      const specs = car.specs.filter(s => s.value).map((s, i) => ({
        car_id: carId, category: s.category, label: s.label, value: s.value, sort_order: i + 1,
      }));
      await supabase.from('car_specifications').insert(specs);
    }
  };

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const pending = parsedCars.filter(c => c.status === 'pending');
      for (let i = 0; i < pending.length; i++) {
        const car = pending[i];
        setParsedCars(prev => prev.map(c => c.id === car.id ? { ...c, status: 'saving' } : c));
        try {
          await saveSingle(car);
          setParsedCars(prev => prev.map(c => c.id === car.id ? { ...c, status: 'saved' } : c));
        } catch (err: any) {
          setParsedCars(prev => prev.map(c => c.id === car.id ? { ...c, status: 'error', errorMsg: err.message } : c));
        }
      }
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin-all-cars'] });
      toast.success('Bulk import complete!');
    },
  });

  const pendingCount = parsedCars.filter(c => c.status === 'pending').length;
  const savedCount = parsedCars.filter(c => c.status === 'saved').length;
  const errorCount = parsedCars.filter(c => c.status === 'error').length;

  return (
    <div className="flex flex-col h-full">
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => {
        const f = e.target.files?.[0];
        if (f) parseFile(f);
        e.target.value = '';
      }} />

      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold">Bulk CSV/Excel Upload</h2>
          {fileName && <Badge variant="outline" className="text-[10px]">{fileName}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" />Download Template
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
          )}
        </div>
      </div>

      {parsedCars.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Upload Car Data Spreadsheet</h3>
            <p className="text-sm text-muted-foreground">
              Upload an Excel (.xlsx) or CSV file with car data. Each row with Brand + Car Name starts a new car.
              Additional rows without Brand/Name add more variants, colors, and specs to the same car.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => fileRef.current?.click()} disabled={parsing} className="gap-2">
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {parsing ? 'Parsing...' : 'Upload File'}
              </Button>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />Template
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="px-4 py-2 border-b bg-muted/20 flex items-center gap-3">
            <Badge variant="outline" className="gap-1"><FileSpreadsheet className="h-3 w-3" />{parsedCars.length} cars</Badge>
            {savedCount > 0 && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1"><CheckCircle2 className="h-3 w-3" />{savedCount} saved</Badge>}
            {errorCount > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{errorCount} errors</Badge>}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />Upload Another
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={() => saveAllMutation.mutate()} disabled={pendingCount === 0 || saveAllMutation.isPending}>
                {saveAllMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save All ({pendingCount})
              </Button>
            </div>
          </div>

          {/* Car list */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {parsedCars.map(car => (
                <div key={car.id} className={cn(
                  "border rounded-xl p-4 transition-all",
                  car.status === 'saved' && "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20",
                  car.status === 'error' && "border-destructive/50 bg-destructive/5",
                  car.status === 'saving' && "border-primary/50 bg-primary/5 animate-pulse",
                )}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{car.brand} {car.name}</span>
                        <Badge variant="outline" className="text-[9px]">{car.body_type}</Badge>
                        {car.status === 'saved' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        {car.status === 'error' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        {car.status === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      </div>
                      {car.price_range && <span className="text-xs text-muted-foreground font-mono">{car.price_range}</span>}
                      {car.errorMsg && <p className="text-xs text-destructive mt-1">{car.errorMsg}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {car.status === 'pending' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCar(car.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2 flex-wrap">
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                      {car.variants.length} variants
                    </span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                      {car.colors.length} colors
                    </span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                      {car.specs.length} specs
                    </span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                      {car.fuel_types.join(', ')}
                    </span>
                  </div>

                  {car.variants.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                      {car.variants.slice(0, 8).map((v, i) => (
                        <div key={i} className="text-[10px] bg-card border rounded px-2 py-1 flex justify-between">
                          <span className="font-medium truncate">{v.name}</span>
                          <span className="text-muted-foreground font-mono ml-1">
                            {v.ex_showroom > 0 ? `₹${(v.ex_showroom / 100000).toFixed(1)}L` : '—'}
                          </span>
                        </div>
                      ))}
                      {car.variants.length > 8 && (
                        <div className="text-[10px] text-muted-foreground flex items-center justify-center">
                          +{car.variants.length - 8} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
};
