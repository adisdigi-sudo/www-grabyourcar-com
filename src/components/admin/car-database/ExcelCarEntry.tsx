import { useState, useRef, useCallback, KeyboardEvent, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import {
  Plus, Trash2, Save, X, Copy, CheckCircle2, AlertTriangle,
  Hash, Car, IndianRupee, Tag, Fuel, Settings2, Zap, FileSpreadsheet,
  Calendar, Eye, EyeOff, Type, Percent, Link, Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";

const BRANDS = [
  'Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Kia', 'Toyota', 'Honda', 'MG',
  'Skoda', 'Volkswagen', 'Renault', 'Nissan', 'Citroen', 'Jeep', 'Ford',
  'Mercedes-Benz', 'BMW', 'Audi', 'Volvo', 'Lexus', 'Porsche', 'Land Rover',
  'Jaguar', 'Mini', 'BYD', 'Isuzu'
];

const BODY_TYPES = ['Hatchback', 'Sedan', 'Compact SUV', 'Mid-Size SUV', 'Full-Size SUV', 'MPV', 'MUV', 'Coupe', 'Convertible', 'Pickup', 'Electric', 'Luxury', 'Crossover'];
const FUEL_OPTIONS = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'];
const TRANSMISSION_OPTIONS = ['Manual', 'Automatic', 'AMT', 'CVT', 'DCT', 'iMT'];
const ENGINE_SPECS = [
  { key: 'displacement', label: 'CC', placeholder: '1197' },
  { key: 'power', label: 'BHP', placeholder: '88.7' },
  { key: 'torque', label: 'Nm', placeholder: '113' },
  { key: 'mileage', label: 'kmpl', placeholder: '23.2' },
];

interface CarRow {
  id: string;
  name: string;
  brand: string;
  slug: string;
  body_type: string;
  price_range: string;
  price_numeric: string;
  original_price: string;
  discount: string;
  tagline: string;
  overview: string;
  availability: boolean;
  launch_date: string;
  fuel_types: string[];
  transmission_types: string[];
  engine_displacement: string;
  engine_power: string;
  engine_torque: string;
  engine_mileage: string;
  is_hot: boolean;
  is_new: boolean;
  is_upcoming: boolean;
  is_bestseller: boolean;
  status: 'draft' | 'saving' | 'saved' | 'error';
  errorMsg?: string;
}

const emptyRow = (): CarRow => ({
  id: crypto.randomUUID(),
  name: "",
  brand: "Maruti Suzuki",
  slug: "",
  body_type: "Hatchback",
  price_range: "",
  price_numeric: "",
  original_price: "",
  discount: "",
  tagline: "",
  overview: "",
  availability: true,
  launch_date: "",
  fuel_types: ["Petrol"],
  transmission_types: ["Manual"],
  engine_displacement: "",
  engine_power: "",
  engine_torque: "",
  engine_mileage: "",
  is_hot: false,
  is_new: true,
  is_upcoming: false,
  is_bestseller: false,
  status: 'draft',
});

// Auto-generate slug from brand + name
const generateSlug = (brand: string, name: string) =>
  `${brand}-${name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Column definitions - order matters for the spreadsheet
const COLUMNS = [
  { key: 'row_num', label: '#', width: 'min-w-[44px] w-[44px]' },
  { key: 'status', label: 'Status', width: 'min-w-[72px] w-[72px]' },
  { key: 'name', label: 'Car Name', width: 'min-w-[160px] w-[160px]', required: true, editable: true },
  { key: 'brand', label: 'Brand', width: 'min-w-[150px] w-[150px]', required: true },
  { key: 'slug', label: 'Slug (auto)', width: 'min-w-[180px] w-[180px]' },
  { key: 'body_type', label: 'Body Type', width: 'min-w-[130px] w-[130px]' },
  { key: 'price_range', label: 'Price Range', width: 'min-w-[140px] w-[140px]', editable: true },
  { key: 'price_numeric', label: 'Ex-Showroom ₹', width: 'min-w-[130px] w-[130px]', editable: true },
  { key: 'original_price', label: 'Original ₹', width: 'min-w-[120px] w-[120px]', editable: true },
  { key: 'discount', label: 'Discount', width: 'min-w-[110px] w-[110px]', editable: true },
  { key: 'availability', label: 'Available', width: 'min-w-[80px] w-[80px]' },
  { key: 'launch_date', label: 'Launch Date', width: 'min-w-[130px] w-[130px]', editable: true },
  { key: 'tagline', label: 'Tagline', width: 'min-w-[170px] w-[170px]', editable: true },
  { key: 'overview', label: 'Overview', width: 'min-w-[220px] w-[220px]', editable: true },
  { key: 'fuel_types', label: 'Fuel Types', width: 'min-w-[200px] w-[200px]' },
  { key: 'transmission_types', label: 'Transmission', width: 'min-w-[200px] w-[200px]' },
  { key: 'engine_displacement', label: 'Engine CC', width: 'min-w-[90px] w-[90px]', editable: true },
  { key: 'engine_power', label: 'Power BHP', width: 'min-w-[90px] w-[90px]', editable: true },
  { key: 'engine_torque', label: 'Torque Nm', width: 'min-w-[90px] w-[90px]', editable: true },
  { key: 'engine_mileage', label: 'Mileage', width: 'min-w-[90px] w-[90px]', editable: true },
  { key: 'flags', label: 'Flags', width: 'min-w-[160px] w-[160px]' },
  { key: 'actions', label: '', width: 'min-w-[100px] w-[100px]' },
];

const EDITABLE_COLS = COLUMNS.filter(c => c.editable).map(c => c.key);

export const ExcelCarEntry = ({ onClose }: { onClose?: () => void }) => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<CarRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const updateRow = useCallback((index: number, field: string, value: any) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const updated = { ...r, [field]: value, status: 'draft' as const };
      // Auto-generate slug when name or brand changes
      if (field === 'name' || field === 'brand') {
        const name = field === 'name' ? value : r.name;
        const brand = field === 'brand' ? value : r.brand;
        updated.slug = generateSlug(brand, name);
      }
      return updated;
    }));
  }, []);

  const toggleArrayValue = useCallback((index: number, field: 'fuel_types' | 'transmission_types', value: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const arr = r[field];
      return { ...r, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value], status: 'draft' };
    }));
  }, []);

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const duplicateRow = (index: number) => {
    const source = rows[index];
    setRows(prev => [
      ...prev.slice(0, index + 1),
      { ...source, id: crypto.randomUUID(), name: source.name + ' (copy)', slug: generateSlug(source.brand, source.name + ' copy'), status: 'draft' },
      ...prev.slice(index + 1),
    ]);
  };

  const handleKeyDown = (e: KeyboardEvent, rowIdx: number, colKey: string) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentIdx = EDITABLE_COLS.indexOf(colKey);
      if (currentIdx === -1) return;

      const nextCol = e.shiftKey
        ? (currentIdx > 0 ? EDITABLE_COLS[currentIdx - 1] : EDITABLE_COLS[EDITABLE_COLS.length - 1])
        : (currentIdx < EDITABLE_COLS.length - 1 ? EDITABLE_COLS[currentIdx + 1] : EDITABLE_COLS[0]);

      const nextRowIdx = !e.shiftKey && currentIdx === EDITABLE_COLS.length - 1
        ? Math.min(rowIdx + 1, rows.length - 1)
        : e.shiftKey && currentIdx === 0
          ? Math.max(rowIdx - 1, 0)
          : rowIdx;

      const refKey = `${nextRowIdx}-${nextCol}`;
      inputRefs.current[refKey]?.focus();
      setActiveCell({ row: nextRowIdx, col: nextCol });
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const nextRefKey = `${rowIdx + 1}-${colKey}`;
      if (inputRefs.current[nextRefKey]) {
        inputRefs.current[nextRefKey]?.focus();
        setActiveCell({ row: rowIdx + 1, col: colKey });
      } else {
        addRow();
        setTimeout(() => {
          inputRefs.current[`${rowIdx + 1}-${colKey}`]?.focus();
          setActiveCell({ row: rowIdx + 1, col: colKey });
        }, 50);
      }
    }
  };

  // Save single row
  const saveRowMutation = useMutation({
    mutationFn: async ({ row, index }: { row: CarRow; index: number }) => {
      if (!row.name.trim() || !row.brand.trim()) throw new Error('Name and Brand are required');
      const slug = row.slug || generateSlug(row.brand, row.name);

      // Insert car
      const { data: carData, error } = await supabase.from('cars').insert([{
        slug,
        name: row.name.trim(),
        brand: row.brand,
        body_type: row.body_type,
        price_range: row.price_range || null,
        price_numeric: row.price_numeric ? Number(row.price_numeric) : null,
        original_price: row.original_price || null,
        discount: row.discount || null,
        tagline: row.tagline || null,
        overview: row.overview || null,
        availability: row.availability ? 'Available' : 'Coming Soon',
        launch_date: row.launch_date || null,
        fuel_types: row.fuel_types.length ? row.fuel_types : null,
        transmission_types: row.transmission_types.length ? row.transmission_types : null,
        is_hot: row.is_hot,
        is_new: row.is_new,
        is_upcoming: row.is_upcoming,
        is_bestseller: row.is_bestseller,
      }]).select('id').single();
      if (error) throw error;

      // Insert engine specs if provided
      const specs: { car_id: string; category: string; label: string; value: string }[] = [];
      if (row.engine_displacement) specs.push({ car_id: carData.id, category: 'engine', label: 'Displacement', value: `${row.engine_displacement} cc` });
      if (row.engine_power) specs.push({ car_id: carData.id, category: 'engine', label: 'Max Power', value: `${row.engine_power} bhp` });
      if (row.engine_torque) specs.push({ car_id: carData.id, category: 'engine', label: 'Max Torque', value: `${row.engine_torque} Nm` });
      if (row.engine_mileage) specs.push({ car_id: carData.id, category: 'performance', label: 'Mileage', value: `${row.engine_mileage} kmpl` });

      if (specs.length > 0) {
        const { error: specError } = await supabase.from('car_specifications').insert(specs);
        if (specError) console.error('Spec insert error:', specError);
      }

      return index;
    },
    onSuccess: (index) => {
      setRows(prev => prev.map((r, i) => i === index ? { ...r, status: 'saved' } : r));
      invalidateCarQueries(queryClient);
    },
    onError: (error: Error, variables) => {
      setRows(prev => prev.map((r, i) => i === variables.index ? { ...r, status: 'error', errorMsg: error.message } : r));
    },
  });

  const saveAll = () => {
    const validRows = rows.filter((r) => r.name.trim() && r.brand.trim() && r.status !== 'saved');
    if (validRows.length === 0) {
      toast.error('No valid unsaved rows to save');
      return;
    }
    validRows.forEach(row => {
      const index = rows.findIndex(r => r.id === row.id);
      setRows(prev => prev.map((r, i) => i === index ? { ...r, status: 'saving' } : r));
      saveRowMutation.mutate({ row, index });
    });
    toast.success(`Saving ${validRows.length} car(s)...`);
  };

  const savedCount = rows.filter(r => r.status === 'saved').length;
  const draftCount = rows.filter(r => r.status === 'draft' && r.name.trim()).length;
  const errorCount = rows.filter(r => r.status === 'error').length;

  const cellClass = "h-10 border-0 rounded-none bg-transparent text-sm focus:bg-accent/40 focus:ring-1 focus:ring-primary/60 transition-colors";

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-muted/60 to-muted/30 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight leading-none">Car Data Entry</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Excel-style bulk data upload</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2 text-xs">
            {savedCount > 0 && (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3" /> {savedCount} Saved
              </Badge>
            )}
            {draftCount > 0 && (
              <Badge variant="secondary" className="gap-1 font-medium">
                <FileSpreadsheet className="h-3 w-3" /> {draftCount} Draft
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1 font-medium">
                <AlertTriangle className="h-3 w-3" /> {errorCount} Error
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground font-mono">
              {rows.length} rows
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>
          <Button
            size="sm"
            onClick={saveAll}
            disabled={draftCount === 0}
            className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Save className="h-3.5 w-3.5" /> Save All ({draftCount})
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Column Legend ─── */}
      <div className="flex items-center gap-6 px-5 py-1.5 border-b bg-muted/20 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Required</span>
        <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /> Click chips to toggle</span>
        <span className="flex items-center gap-1"><Link className="h-3 w-3" /> Slug auto-generates</span>
        <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> Engine specs saved to specifications table</span>
      </div>

      {/* ─── Spreadsheet Grid ─── */}
      <ScrollArea className="flex-1">
        <div className="min-w-[2800px]">
          {/* Header */}
          <div className="flex items-center border-b bg-muted/50 sticky top-0 z-20">
            {COLUMNS.map(col => (
              <div
                key={col.key}
                className={cn(
                  "flex items-center gap-1 px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-r border-border/40 last:border-r-0 shrink-0 select-none",
                  col.width,
                  col.key === 'row_num' && "bg-muted/70 justify-center",
                  col.key === 'status' && "justify-center",
                )}
              >
                {col.label}
                {(col as any).required && <span className="text-red-400 text-xs">•</span>}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {rows.map((row, rowIdx) => (
            <div
              key={row.id}
              className={cn(
                "flex items-stretch border-b border-border/30 transition-all group/row",
                row.status === 'saved' && "bg-emerald-50/40 dark:bg-emerald-950/10",
                row.status === 'error' && "bg-red-50/40 dark:bg-red-950/10",
                row.status === 'saving' && "bg-amber-50/40 dark:bg-amber-950/10 animate-pulse",
                activeCell?.row === rowIdx && "bg-primary/[0.03] ring-1 ring-inset ring-primary/10",
              )}
            >
              {/* # */}
              <div className="min-w-[44px] w-[44px] shrink-0 flex items-center justify-center border-r border-border/40 text-[11px] font-mono text-muted-foreground bg-muted/30 font-bold">
                {rowIdx + 1}
              </div>

              {/* Status */}
              <div className="min-w-[72px] w-[72px] shrink-0 flex items-center justify-center border-r border-border/40 px-1">
                {row.status === 'draft' && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 font-medium">Draft</Badge>}
                {row.status === 'saving' && <Badge className="text-[9px] px-1.5 py-0 h-5 bg-amber-500 font-medium animate-pulse">Saving</Badge>}
                {row.status === 'saved' && <Badge className="text-[9px] px-1.5 py-0 h-5 bg-emerald-600 text-white font-medium">✓ Saved</Badge>}
                {row.status === 'error' && (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-5 cursor-help font-medium" title={row.errorMsg}>
                    ✗ Error
                  </Badge>
                )}
              </div>

              {/* Car Name */}
              <div className="min-w-[160px] w-[160px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-name`] = el; }}
                  value={row.name}
                  onChange={e => updateRow(rowIdx, 'name', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'name' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'name')}
                  placeholder="e.g., Swift"
                  className={cn(cellClass, "font-semibold", !row.name.trim() && row.status === 'error' && "ring-1 ring-red-400")}
                />
              </div>

              {/* Brand */}
              <div className="min-w-[150px] w-[150px] shrink-0 border-r border-border/40 p-px">
                <Select value={row.brand} onValueChange={v => updateRow(rowIdx, 'brand', v)}>
                  <SelectTrigger className={cn(cellClass, "px-2")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Slug (auto) */}
              <div className="min-w-[180px] w-[180px] shrink-0 border-r border-border/40 p-px flex items-center px-2">
                <span className="text-[11px] font-mono text-muted-foreground truncate">
                  {row.slug || <span className="italic opacity-50">auto-generated</span>}
                </span>
              </div>

              {/* Body Type */}
              <div className="min-w-[130px] w-[130px] shrink-0 border-r border-border/40 p-px">
                <Select value={row.body_type} onValueChange={v => updateRow(rowIdx, 'body_type', v)}>
                  <SelectTrigger className={cn(cellClass, "px-2 text-xs")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {BODY_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="min-w-[140px] w-[140px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-price_range`] = el; }}
                  value={row.price_range}
                  onChange={e => updateRow(rowIdx, 'price_range', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'price_range' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'price_range')}
                  placeholder="₹6.5L - ₹9.8L"
                  className={cn(cellClass, "text-xs")}
                />
              </div>

              {/* Price Numeric (Ex-Showroom) */}
              <div className="min-w-[130px] w-[130px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-price_numeric`] = el; }}
                  value={row.price_numeric}
                  onChange={e => updateRow(rowIdx, 'price_numeric', e.target.value.replace(/[^0-9]/g, ''))}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'price_numeric' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'price_numeric')}
                  placeholder="650000"
                  className={cn(cellClass, "font-mono text-xs")}
                />
              </div>

              {/* Original Price */}
              <div className="min-w-[120px] w-[120px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-original_price`] = el; }}
                  value={row.original_price}
                  onChange={e => updateRow(rowIdx, 'original_price', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'original_price' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'original_price')}
                  placeholder="₹7.5 Lakh"
                  className={cn(cellClass, "text-xs")}
                />
              </div>

              {/* Discount */}
              <div className="min-w-[110px] w-[110px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-discount`] = el; }}
                  value={row.discount}
                  onChange={e => updateRow(rowIdx, 'discount', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'discount' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'discount')}
                  placeholder="₹50,000"
                  className={cn(cellClass, "text-xs")}
                />
              </div>

              {/* Availability Toggle */}
              <div className="min-w-[80px] w-[80px] shrink-0 border-r border-border/40 flex items-center justify-center">
                <button
                  onClick={() => updateRow(rowIdx, 'availability', !row.availability)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all border",
                    row.availability
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                      : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {row.availability ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {row.availability ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Launch Date */}
              <div className="min-w-[130px] w-[130px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-launch_date`] = el; }}
                  type="date"
                  value={row.launch_date}
                  onChange={e => updateRow(rowIdx, 'launch_date', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'launch_date' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'launch_date')}
                  className={cn(cellClass, "text-xs")}
                />
              </div>

              {/* Tagline */}
              <div className="min-w-[170px] w-[170px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-tagline`] = el; }}
                  value={row.tagline}
                  onChange={e => updateRow(rowIdx, 'tagline', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'tagline' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'tagline')}
                  placeholder="Bold. Beautiful."
                  className={cn(cellClass, "italic text-xs")}
                />
              </div>

              {/* Overview */}
              <div className="min-w-[220px] w-[220px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-overview`] = el; }}
                  value={row.overview}
                  onChange={e => updateRow(rowIdx, 'overview', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'overview' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'overview')}
                  placeholder="Brief car description..."
                  className={cn(cellClass, "text-xs")}
                />
              </div>

              {/* Fuel Types chips */}
              <div className="min-w-[200px] w-[200px] shrink-0 border-r border-border/40 p-1 flex flex-wrap gap-[3px] items-center content-center">
                {FUEL_OPTIONS.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleArrayValue(rowIdx, 'fuel_types', f)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all border leading-tight",
                      row.fuel_types.includes(f)
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-transparent text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Transmission chips */}
              <div className="min-w-[200px] w-[200px] shrink-0 border-r border-border/40 p-1 flex flex-wrap gap-[3px] items-center content-center">
                {TRANSMISSION_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleArrayValue(rowIdx, 'transmission_types', t)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all border leading-tight",
                      row.transmission_types.includes(t)
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-transparent text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Engine CC */}
              <div className="min-w-[90px] w-[90px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-engine_displacement`] = el; }}
                  value={row.engine_displacement}
                  onChange={e => updateRow(rowIdx, 'engine_displacement', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'engine_displacement' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'engine_displacement')}
                  placeholder="1197"
                  className={cn(cellClass, "font-mono text-xs text-center")}
                />
              </div>

              {/* Power BHP */}
              <div className="min-w-[90px] w-[90px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-engine_power`] = el; }}
                  value={row.engine_power}
                  onChange={e => updateRow(rowIdx, 'engine_power', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'engine_power' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'engine_power')}
                  placeholder="88.7"
                  className={cn(cellClass, "font-mono text-xs text-center")}
                />
              </div>

              {/* Torque Nm */}
              <div className="min-w-[90px] w-[90px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-engine_torque`] = el; }}
                  value={row.engine_torque}
                  onChange={e => updateRow(rowIdx, 'engine_torque', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'engine_torque' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'engine_torque')}
                  placeholder="113"
                  className={cn(cellClass, "font-mono text-xs text-center")}
                />
              </div>

              {/* Mileage */}
              <div className="min-w-[90px] w-[90px] shrink-0 border-r border-border/40 p-px">
                <Input
                  ref={el => { inputRefs.current[`${rowIdx}-engine_mileage`] = el; }}
                  value={row.engine_mileage}
                  onChange={e => updateRow(rowIdx, 'engine_mileage', e.target.value)}
                  onFocus={() => setActiveCell({ row: rowIdx, col: 'engine_mileage' })}
                  onKeyDown={e => handleKeyDown(e, rowIdx, 'engine_mileage')}
                  placeholder="23.2"
                  className={cn(cellClass, "font-mono text-xs text-center")}
                />
              </div>

              {/* Flags */}
              <div className="min-w-[160px] w-[160px] shrink-0 border-r border-border/40 p-1 flex gap-1 items-center justify-center">
                {[
                  { key: 'is_hot', label: '🔥', title: 'Hot Deal' },
                  { key: 'is_new', label: '✨', title: 'New' },
                  { key: 'is_upcoming', label: '🚀', title: 'Upcoming' },
                  { key: 'is_bestseller', label: '⭐', title: 'Bestseller' },
                ].map(flag => (
                  <button
                    key={flag.key}
                    onClick={() => updateRow(rowIdx, flag.key, !(row as any)[flag.key])}
                    title={flag.title}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all border",
                      (row as any)[flag.key]
                        ? "bg-primary/10 border-primary/50 shadow-sm scale-110"
                        : "bg-transparent border-transparent opacity-30 hover:opacity-60"
                    )}
                  >
                    {flag.label}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="min-w-[100px] w-[100px] shrink-0 flex items-center justify-center gap-0.5 px-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity"
                  onClick={() => duplicateRow(rowIdx)}
                  title="Duplicate"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeRow(rowIdx)}
                  disabled={rows.length <= 1}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {row.status === 'draft' && row.name.trim() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                    onClick={() => {
                      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, status: 'saving' } : r));
                      saveRowMutation.mutate({ row, index: rowIdx });
                    }}
                    title="Save row"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Add Row Footer */}
          <div
            onClick={addRow}
            className="flex items-center gap-2 px-5 py-3.5 text-sm text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors group/add"
          >
            <Plus className="h-4 w-4 group-hover/add:text-primary transition-colors" />
            <span className="group-hover/add:text-foreground transition-colors">Add new row • <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">Enter</kbd> on last row</span>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ─── Status Bar ─── */}
      <div className="flex items-center justify-between px-5 py-2 border-t bg-muted/20 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-4 font-medium">
          <span>Total: <span className="text-foreground">{rows.length}</span> rows</span>
          <span className="text-border">│</span>
          <span className="text-emerald-600">{savedCount} saved</span>
          <span className="text-border">│</span>
          <span>{draftCount} pending</span>
          {errorCount > 0 && <><span className="text-border">│</span><span className="text-destructive">{errorCount} errors</span></>}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">Tab</kbd> Next cell</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">Enter</kbd> Next row</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">⇧Tab</kbd> Prev</span>
        </div>
      </div>
    </div>
  );
};
