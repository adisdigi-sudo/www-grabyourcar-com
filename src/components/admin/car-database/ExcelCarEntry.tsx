import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import { 
  Plus, Trash2, Save, X, Copy, ChevronDown, ChevronUp, 
  Car, Sparkles, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Grip, Hash, Type, IndianRupee, Tag, Fuel, Settings2, Zap
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

interface CarRow {
  id: string;
  name: string;
  brand: string;
  body_type: string;
  price_range: string;
  price_numeric: string;
  tagline: string;
  overview: string;
  fuel_types: string[];
  transmission_types: string[];
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
  body_type: "Hatchback",
  price_range: "",
  price_numeric: "",
  tagline: "",
  overview: "",
  fuel_types: ["Petrol"],
  transmission_types: ["Manual"],
  is_hot: false,
  is_new: true,
  is_upcoming: false,
  is_bestseller: false,
  status: 'draft',
});

const COLUMNS = [
  { key: 'row_num', label: '#', width: 'w-10', icon: Hash },
  { key: 'status', label: 'Status', width: 'w-20', icon: CheckCircle2 },
  { key: 'name', label: 'Car Name', width: 'w-48', icon: Car, required: true },
  { key: 'brand', label: 'Brand', width: 'w-40', icon: Tag, required: true },
  { key: 'body_type', label: 'Body Type', width: 'w-36', icon: Car },
  { key: 'price_range', label: 'Price Range', width: 'w-40', icon: IndianRupee },
  { key: 'price_numeric', label: 'Base Price (₹)', width: 'w-36', icon: IndianRupee },
  { key: 'fuel_types', label: 'Fuel Types', width: 'w-44', icon: Fuel },
  { key: 'transmission_types', label: 'Transmission', width: 'w-44', icon: Settings2 },
  { key: 'tagline', label: 'Tagline', width: 'w-52', icon: Type },
  { key: 'overview', label: 'Overview', width: 'w-64', icon: FileSpreadsheet },
  { key: 'flags', label: 'Flags', width: 'w-48', icon: Zap },
  { key: 'actions', label: '', width: 'w-24', icon: Settings2 },
];

export const ExcelCarEntry = ({ onClose }: { onClose?: () => void }) => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<CarRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const updateRow = useCallback((index: number, field: string, value: any) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value, status: 'draft' } : r));
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
      { ...source, id: crypto.randomUUID(), name: source.name + ' (copy)', status: 'draft' },
      ...prev.slice(index + 1),
    ]);
  };

  const handleKeyDown = (e: KeyboardEvent, rowIdx: number, colKey: string) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const editableCols = ['name', 'price_range', 'price_numeric', 'tagline'];
      const currentIdx = editableCols.indexOf(colKey);
      if (currentIdx === -1) return;
      
      const nextCol = e.shiftKey 
        ? (currentIdx > 0 ? editableCols[currentIdx - 1] : editableCols[editableCols.length - 1])
        : (currentIdx < editableCols.length - 1 ? editableCols[currentIdx + 1] : editableCols[0]);
      
      const nextRowIdx = !e.shiftKey && currentIdx === editableCols.length - 1 
        ? Math.min(rowIdx + 1, rows.length - 1) 
        : e.shiftKey && currentIdx === 0 
          ? Math.max(rowIdx - 1, 0) 
          : rowIdx;

      const refKey = `${nextRowIdx}-${nextCol}`;
      inputRefs.current[refKey]?.focus();
      setActiveCell({ row: nextRowIdx, col: nextCol });
    }
    if (e.key === 'Enter' && !e.shiftKey && colKey !== 'overview') {
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
      const slug = `${row.brand}-${row.name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { error } = await supabase.from('cars').insert([{
        slug,
        name: row.name.trim(),
        brand: row.brand,
        body_type: row.body_type,
        price_range: row.price_range || null,
        price_numeric: row.price_numeric ? Number(row.price_numeric) : null,
        tagline: row.tagline || null,
        overview: row.overview || null,
        fuel_types: row.fuel_types.length ? row.fuel_types : null,
        transmission_types: row.transmission_types.length ? row.transmission_types : null,
        is_hot: row.is_hot,
        is_new: row.is_new,
        is_upcoming: row.is_upcoming,
        is_bestseller: row.is_bestseller,
      }]);
      if (error) throw error;
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

  // Save all valid rows
  const saveAll = () => {
    const validRows = rows.filter((r, i) => r.name.trim() && r.brand.trim() && r.status !== 'saved');
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Car Data Entry</h2>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-xs">
            {savedCount > 0 && (
              <Badge variant="default" className="bg-green-600 text-white gap-1">
                <CheckCircle2 className="h-3 w-3" /> {savedCount} Saved
              </Badge>
            )}
            {draftCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <FileSpreadsheet className="h-3 w-3" /> {draftCount} Draft
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {errorCount} Error
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              {rows.length} Row{rows.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
          <Button size="sm" onClick={saveAll} disabled={draftCount === 0} className="bg-green-600 hover:bg-green-700 text-white">
            <Save className="h-4 w-4 mr-1" /> Save All ({draftCount})
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Excel-like Grid */}
      <ScrollArea className="flex-1">
        <div className="min-w-[1400px]">
          {/* Header Row */}
          <div className="flex items-center border-b bg-muted/50 sticky top-0 z-10">
            {COLUMNS.map(col => (
              <div
                key={col.key}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r last:border-r-0 shrink-0",
                  col.width
                )}
              >
                <col.icon className="h-3.5 w-3.5" />
                {col.label}
                {col.required && <span className="text-red-500">*</span>}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {rows.map((row, rowIdx) => (
            <div key={row.id}>
              <div
                className={cn(
                  "flex items-stretch border-b transition-colors group",
                  row.status === 'saved' && "bg-green-50/50 dark:bg-green-950/20",
                  row.status === 'error' && "bg-red-50/50 dark:bg-red-950/20",
                  row.status === 'saving' && "bg-yellow-50/50 dark:bg-yellow-950/20 animate-pulse",
                  activeCell?.row === rowIdx && "bg-primary/5",
                )}
              >
                {/* Row Number */}
                <div className="w-10 shrink-0 flex items-center justify-center border-r text-xs font-mono text-muted-foreground bg-muted/20">
                  {rowIdx + 1}
                </div>

                {/* Status */}
                <div className="w-20 shrink-0 flex items-center justify-center border-r px-1">
                  {row.status === 'draft' && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Draft</Badge>}
                  {row.status === 'saving' && <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500">Saving</Badge>}
                  {row.status === 'saved' && <Badge className="text-[10px] px-1.5 py-0 bg-green-600 text-white">Saved</Badge>}
                  {row.status === 'error' && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 cursor-help" title={row.errorMsg}>
                      Error
                    </Badge>
                  )}
                </div>

                {/* Car Name */}
                <div className="w-48 shrink-0 border-r p-0.5">
                  <Input
                    ref={el => { inputRefs.current[`${rowIdx}-name`] = el; }}
                    value={row.name}
                    onChange={e => updateRow(rowIdx, 'name', e.target.value)}
                    onFocus={() => setActiveCell({ row: rowIdx, col: 'name' })}
                    onKeyDown={e => handleKeyDown(e, rowIdx, 'name')}
                    placeholder="e.g., Swift"
                    className={cn(
                      "h-9 border-0 rounded-none bg-transparent focus:bg-primary/5 focus:ring-1 focus:ring-primary text-sm font-medium",
                      !row.name.trim() && row.status === 'error' && "ring-1 ring-red-500"
                    )}
                  />
                </div>

                {/* Brand */}
                <div className="w-40 shrink-0 border-r p-0.5">
                  <Select value={row.brand} onValueChange={v => updateRow(rowIdx, 'brand', v)}>
                    <SelectTrigger className="h-9 border-0 rounded-none bg-transparent focus:bg-primary/5 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Body Type */}
                <div className="w-36 shrink-0 border-r p-0.5">
                  <Select value={row.body_type} onValueChange={v => updateRow(rowIdx, 'body_type', v)}>
                    <SelectTrigger className="h-9 border-0 rounded-none bg-transparent text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_TYPES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="w-40 shrink-0 border-r p-0.5">
                  <Input
                    ref={el => { inputRefs.current[`${rowIdx}-price_range`] = el; }}
                    value={row.price_range}
                    onChange={e => updateRow(rowIdx, 'price_range', e.target.value)}
                    onFocus={() => setActiveCell({ row: rowIdx, col: 'price_range' })}
                    onKeyDown={e => handleKeyDown(e, rowIdx, 'price_range')}
                    placeholder="₹6.5L - ₹9.8L"
                    className="h-9 border-0 rounded-none bg-transparent focus:bg-primary/5 focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>

                {/* Price Numeric */}
                <div className="w-36 shrink-0 border-r p-0.5">
                  <Input
                    ref={el => { inputRefs.current[`${rowIdx}-price_numeric`] = el; }}
                    value={row.price_numeric}
                    onChange={e => updateRow(rowIdx, 'price_numeric', e.target.value.replace(/[^0-9]/g, ''))}
                    onFocus={() => setActiveCell({ row: rowIdx, col: 'price_numeric' })}
                    onKeyDown={e => handleKeyDown(e, rowIdx, 'price_numeric')}
                    placeholder="650000"
                    className="h-9 border-0 rounded-none bg-transparent focus:bg-primary/5 focus:ring-1 focus:ring-primary text-sm font-mono"
                  />
                </div>

                {/* Fuel Types - Multi-select chips */}
                <div className="w-44 shrink-0 border-r p-1 flex flex-wrap gap-0.5 items-center">
                  {FUEL_OPTIONS.map(f => (
                    <button
                      key={f}
                      onClick={() => toggleArrayValue(rowIdx, 'fuel_types', f)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all border",
                        row.fuel_types.includes(f)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-muted-foreground border-muted hover:border-primary/50"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Transmission Types - Multi-select chips */}
                <div className="w-44 shrink-0 border-r p-1 flex flex-wrap gap-0.5 items-center">
                  {TRANSMISSION_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleArrayValue(rowIdx, 'transmission_types', t)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all border",
                        row.transmission_types.includes(t)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-muted-foreground border-muted hover:border-primary/50"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Tagline */}
                <div className="w-52 shrink-0 border-r p-0.5">
                  <Input
                    ref={el => { inputRefs.current[`${rowIdx}-tagline`] = el; }}
                    value={row.tagline}
                    onChange={e => updateRow(rowIdx, 'tagline', e.target.value)}
                    onFocus={() => setActiveCell({ row: rowIdx, col: 'tagline' })}
                    onKeyDown={e => handleKeyDown(e, rowIdx, 'tagline')}
                    placeholder="Bold. Beautiful."
                    className="h-9 border-0 rounded-none bg-transparent focus:bg-primary/5 focus:ring-1 focus:ring-primary text-sm italic"
                  />
                </div>

                {/* Overview - expandable */}
                <div className="w-64 shrink-0 border-r p-0.5">
                  {expandedRow === rowIdx ? (
                    <Textarea
                      value={row.overview}
                      onChange={e => updateRow(rowIdx, 'overview', e.target.value)}
                      placeholder="Brief description..."
                      rows={3}
                      className="border-0 rounded-none bg-transparent focus:bg-primary/5 focus:ring-1 focus:ring-primary text-xs resize-none"
                      onBlur={() => setExpandedRow(null)}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setExpandedRow(rowIdx)}
                      className="h-9 flex items-center px-3 text-xs text-muted-foreground cursor-text hover:bg-primary/5 truncate"
                    >
                      {row.overview || <span className="italic">Click to add overview...</span>}
                    </div>
                  )}
                </div>

                {/* Flags */}
                <div className="w-48 shrink-0 border-r p-1 flex flex-wrap gap-1 items-center">
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
                        "w-8 h-8 rounded flex items-center justify-center text-sm transition-all border",
                        (row as any)[flag.key]
                          ? "bg-primary/10 border-primary shadow-sm scale-110"
                          : "bg-transparent border-transparent opacity-40 hover:opacity-70"
                      )}
                    >
                      {flag.label}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="w-24 shrink-0 flex items-center justify-center gap-1 px-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => duplicateRow(rowIdx)}
                    title="Duplicate row"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => removeRow(rowIdx)}
                    title="Delete row"
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  {row.status === 'draft' && row.name.trim() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                      onClick={() => {
                        setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, status: 'saving' } : r));
                        saveRowMutation.mutate({ row, index: rowIdx });
                      }}
                      title="Save this row"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Row Footer */}
          <div
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-3 border-b text-sm text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors group"
          >
            <Plus className="h-4 w-4 group-hover:text-primary transition-colors" />
            <span className="group-hover:text-foreground transition-colors">Click to add a new row or press Enter on last row</span>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Total: {rows.length} rows</span>
          <span>•</span>
          <span className="text-green-600">{savedCount} saved</span>
          <span>•</span>
          <span>{draftCount} pending</span>
          {errorCount > 0 && <><span>•</span><span className="text-red-500">{errorCount} errors</span></>}
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Tab</kbd>
          <span>Next cell</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] ml-2">Enter</kbd>
          <span>Next row</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] ml-2">Shift+Tab</kbd>
          <span>Previous cell</span>
        </div>
      </div>
    </div>
  );
};
