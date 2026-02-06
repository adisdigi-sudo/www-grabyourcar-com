import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Eye, Trash2, Car, RefreshCw, Database, FileCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ParsedCar {
  brand: string;
  name: string;
  slug: string;
  bodyType: string;
  tagline: string;
  price: string;
  priceNumeric: number;
  originalPrice: string;
  discount: string;
  fuelTypes: string[];
  transmission: string[];
  availability: string;
  isHot: boolean;
  isLimited: boolean;
  isNew: boolean;
  isUpcoming: boolean;
  isBestseller: boolean;
  launchDate?: string;
  overview: string;
  keyHighlights: string[];
  pros: string[];
  cons: string[];
  competitors: string[];
  brochureUrl?: string;
  officialUrl?: string;
  variants: {
    name: string;
    price: string;
    priceNumeric: number;
    fuelType: string;
    transmission: string;
    features: string[];
    exShowroom: number;
    rto: number;
    insurance: number;
    registration: number;
    handling: number;
    tcs: number;
    fastag: number;
  }[];
  colors: { name: string; hex: string; imageUrl?: string }[];
  specifications: {
    engine: { label: string; value: string }[];
    dimensions: { label: string; value: string }[];
    performance: { label: string; value: string }[];
    features: { label: string; value: string }[];
    safety: { label: string; value: string }[];
  };
  image: string;
  gallery: string[];
  errors?: string[];
  selected?: boolean;
}

// Extended CSV template with up to 10 variants and 15 colors
const CSV_TEMPLATE_HEADERS = [
  // Basic car info
  "brand", "name", "slug", "body_type", "tagline", "price_display", "price_numeric",
  "original_price", "discount", "fuel_types", "transmission_types", "availability",
  "is_hot", "is_limited", "is_new", "is_upcoming", "is_bestseller", "launch_date", 
  "overview", "key_highlights", "pros", "cons", "competitors", 
  "image_url", "gallery_urls", "brochure_url", "official_url",
  // Variants (up to 10)
  ...Array.from({ length: 10 }, (_, i) => [
    `variant_${i + 1}_name`, `variant_${i + 1}_price`, `variant_${i + 1}_price_numeric`,
    `variant_${i + 1}_fuel_type`, `variant_${i + 1}_transmission`, `variant_${i + 1}_features`,
    `variant_${i + 1}_ex_showroom`, `variant_${i + 1}_rto`, `variant_${i + 1}_insurance`,
    `variant_${i + 1}_registration`, `variant_${i + 1}_handling`, `variant_${i + 1}_tcs`, `variant_${i + 1}_fastag`
  ]).flat(),
  // Colors (up to 15)
  ...Array.from({ length: 15 }, (_, i) => [
    `color_${i + 1}_name`, `color_${i + 1}_hex`, `color_${i + 1}_image_url`
  ]).flat(),
  // Specifications
  "spec_engine_displacement", "spec_engine_max_power", "spec_engine_max_torque", 
  "spec_engine_cylinders", "spec_engine_fuel_tank", "spec_engine_emission",
  "spec_dim_length", "spec_dim_width", "spec_dim_height", "spec_dim_wheelbase", 
  "spec_dim_ground_clearance", "spec_dim_boot_space", "spec_dim_kerb_weight",
  "spec_perf_top_speed", "spec_perf_0_100", "spec_perf_mileage_city", "spec_perf_mileage_highway",
  "spec_feat_infotainment", "spec_feat_ac", "spec_feat_seats", "spec_feat_sunroof",
  "spec_feat_keyless", "spec_feat_cruise_control", "spec_feat_parking_sensors",
  "spec_safety_airbags", "spec_safety_abs", "spec_safety_esc", "spec_safety_ncap",
  "spec_safety_isofix", "spec_safety_tpms", "spec_safety_hill_assist"
];

const SAMPLE_DATA = [
  // Basic info
  "Maruti Suzuki", "Swift 2024", "maruti-swift-2024", "Hatchback", "Drive with Passion",
  "₹6.49 - 9.64 Lakh", "649000", "₹6.99 Lakh", "₹50,000", "Petrol|CNG", "Manual|AMT",
  "Available", "TRUE", "FALSE", "TRUE", "FALSE", "TRUE", "", 
  "The all-new Maruti Swift 2024 comes with a refreshed design, improved features, and better fuel efficiency.",
  "New Z-Series Engine|Better Mileage|Feature Rich|ADAS Ready", 
  "Great mileage|Reliable|Low maintenance|Wide service network",
  "Smaller boot|Basic interiors in lower variants", "Hyundai i20|Tata Altroz|Honda Jazz",
  "https://example.com/swift.jpg", "https://example.com/swift-1.jpg|https://example.com/swift-2.jpg|https://example.com/swift-3.jpg",
  "https://example.com/swift-brochure.pdf", "https://www.marutisuzuki.com/swift",
  // Variant 1
  "LXi", "₹6.49 Lakh", "649000", "Petrol", "Manual", "AC|Power Steering|Dual Airbags|ABS with EBD",
  "649000", "51920", "22715", "1000", "15000", "0", "500",
  // Variant 2  
  "VXi", "₹7.49 Lakh", "749000", "Petrol", "Manual", "SmartPlay Studio|Rear AC Vents|Electrically Adjustable ORVMs",
  "749000", "59920", "26215", "1000", "15000", "0", "500",
  // Variant 3
  "ZXi", "₹8.49 Lakh", "849000", "Petrol", "Manual", "Push Button Start|Cruise Control|Auto Climate|LED Projector Headlamps",
  "849000", "67920", "29715", "1000", "15000", "0", "500",
  // Variant 4
  "ZXi+", "₹9.19 Lakh", "919000", "Petrol", "AMT", "Sunroof|360 Camera|6 Airbags|Wireless Charger|HUD",
  "919000", "73520", "32165", "1000", "15000", "9190", "500",
  // Variant 5
  "ZXi+ Dual Tone", "₹9.64 Lakh", "964000", "Petrol", "AMT", "Dual Tone Roof|Premium Interiors|All ZXi+ Features",
  "964000", "77120", "33740", "1000", "15000", "9640", "500",
  // Variants 6-10 (empty)
  ...Array(65).fill(""),
  // Colors (6 colors)
  "Pearl Arctic White", "#FAFAFA", "https://cdn.example.com/swift/white.jpg",
  "Solid Fire Red", "#C62828", "https://cdn.example.com/swift/red.jpg",
  "Midnight Blue", "#1A237E", "https://cdn.example.com/swift/blue.jpg",
  "Magma Grey", "#616161", "https://cdn.example.com/swift/grey.jpg",
  "Luster Blue", "#1976D2", "https://cdn.example.com/swift/luster-blue.jpg",
  "Sizzling Red with Black Roof", "#B71C1C", "https://cdn.example.com/swift/dual-tone.jpg",
  // Colors 7-15 (empty)
  ...Array(27).fill(""),
  // Engine specs
  "1197 cc", "81.06 bhp @ 6000 rpm", "112 Nm @ 4200 rpm", "4", "37 Litres", "BS6 Phase 2",
  // Dimension specs
  "3845 mm", "1735 mm", "1530 mm", "2450 mm", "163 mm", "268 Litres", "898 kg",
  // Performance specs  
  "180 kmph", "12.5 sec", "22.56 kmpl", "28.09 kmpl",
  // Feature specs
  "9-inch Smartplay Pro+", "Auto Climate Control", "5 Seater", "Electric Sunroof",
  "Smart Key with Push Button", "Yes", "Front & Rear",
  // Safety specs
  "6 Airbags", "Yes with EBD", "ESP with Hill Hold", "4 Star Global NCAP",
  "Yes", "Yes", "Yes"
];

export default function BulkCarUploader() {
  const [parsedCars, setParsedCars] = useState<ParsedCar[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentCarIndex, setCurrentCarIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[]; duplicates: number } | null>(null);
  const [previewCar, setPreviewCar] = useState<ParsedCar | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [uploadMode, setUploadMode] = useState<'insert' | 'upsert'>('upsert');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const csvContent = [
      CSV_TEMPLATE_HEADERS.join(","),
      SAMPLE_DATA.map(val => `"${val}"`).join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "car_import_template.csv";
    link.click();
    
    toast({
      title: "Template Downloaded",
      description: "Fill in the template and upload to import cars",
    });
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentCell += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentCell.trim());
          currentCell = "";
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentRow.push(currentCell.trim());
          if (currentRow.some(cell => cell)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = "";
          if (char === '\r') i++;
        } else {
          currentCell += char;
        }
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const parseRow = (row: string[], headers: string[]): ParsedCar => {
    const getValue = (key: string) => {
      const index = headers.indexOf(key);
      return index >= 0 ? row[index] || "" : "";
    };

    const getArray = (key: string) => {
      const val = getValue(key);
      return val ? val.split("|").map(s => s.trim()).filter(Boolean) : [];
    };

    const getBool = (key: string) => {
      const val = getValue(key).toLowerCase();
      return val === "true" || val === "yes" || val === "1";
    };

    const getNumber = (key: string) => {
      const val = getValue(key).replace(/[^\d.-]/g, "");
      return parseFloat(val) || 0;
    };

    const errors: string[] = [];
    const brand = getValue("brand");
    const name = getValue("name");
    
    if (!brand) errors.push("Brand is required");
    if (!name) errors.push("Name is required");

    // Parse variants (up to 10)
    const variants = [];
    for (let i = 1; i <= 10; i++) {
      const variantName = getValue(`variant_${i}_name`);
      if (variantName) {
        variants.push({
          name: variantName,
          price: getValue(`variant_${i}_price`),
          priceNumeric: getNumber(`variant_${i}_price_numeric`),
          fuelType: getValue(`variant_${i}_fuel_type`),
          transmission: getValue(`variant_${i}_transmission`),
          features: getArray(`variant_${i}_features`),
          exShowroom: getNumber(`variant_${i}_ex_showroom`),
          rto: getNumber(`variant_${i}_rto`),
          insurance: getNumber(`variant_${i}_insurance`),
          registration: getNumber(`variant_${i}_registration`),
          handling: getNumber(`variant_${i}_handling`),
          tcs: getNumber(`variant_${i}_tcs`),
          fastag: getNumber(`variant_${i}_fastag`),
        });
      }
    }

    // Parse colors (up to 15)
    const colors = [];
    for (let i = 1; i <= 15; i++) {
      const colorName = getValue(`color_${i}_name`);
      const colorHex = getValue(`color_${i}_hex`);
      const colorImage = getValue(`color_${i}_image_url`);
      if (colorName && colorHex) {
        colors.push({ name: colorName, hex: colorHex, imageUrl: colorImage || undefined });
      }
    }

    // Parse specifications with extended fields
    const specifications = {
      engine: [
        { label: "Displacement", value: getValue("spec_engine_displacement") },
        { label: "Max Power", value: getValue("spec_engine_max_power") },
        { label: "Max Torque", value: getValue("spec_engine_max_torque") },
        { label: "Cylinders", value: getValue("spec_engine_cylinders") },
        { label: "Fuel Tank", value: getValue("spec_engine_fuel_tank") },
        { label: "Emission Standard", value: getValue("spec_engine_emission") },
      ].filter(s => s.value),
      dimensions: [
        { label: "Length", value: getValue("spec_dim_length") },
        { label: "Width", value: getValue("spec_dim_width") },
        { label: "Height", value: getValue("spec_dim_height") },
        { label: "Wheelbase", value: getValue("spec_dim_wheelbase") },
        { label: "Ground Clearance", value: getValue("spec_dim_ground_clearance") },
        { label: "Boot Space", value: getValue("spec_dim_boot_space") },
        { label: "Kerb Weight", value: getValue("spec_dim_kerb_weight") },
      ].filter(s => s.value),
      performance: [
        { label: "Top Speed", value: getValue("spec_perf_top_speed") },
        { label: "0-100 kmph", value: getValue("spec_perf_0_100") },
        { label: "Mileage (City)", value: getValue("spec_perf_mileage_city") },
        { label: "Mileage (Highway)", value: getValue("spec_perf_mileage_highway") },
      ].filter(s => s.value),
      features: [
        { label: "Infotainment", value: getValue("spec_feat_infotainment") },
        { label: "AC", value: getValue("spec_feat_ac") },
        { label: "Seating Capacity", value: getValue("spec_feat_seats") },
        { label: "Sunroof", value: getValue("spec_feat_sunroof") },
        { label: "Keyless Entry", value: getValue("spec_feat_keyless") },
        { label: "Cruise Control", value: getValue("spec_feat_cruise_control") },
        { label: "Parking Sensors", value: getValue("spec_feat_parking_sensors") },
      ].filter(s => s.value),
      safety: [
        { label: "Airbags", value: getValue("spec_safety_airbags") },
        { label: "ABS", value: getValue("spec_safety_abs") },
        { label: "ESC", value: getValue("spec_safety_esc") },
        { label: "NCAP Rating", value: getValue("spec_safety_ncap") },
        { label: "ISOFIX", value: getValue("spec_safety_isofix") },
        { label: "TPMS", value: getValue("spec_safety_tpms") },
        { label: "Hill Assist", value: getValue("spec_safety_hill_assist") },
      ].filter(s => s.value),
    };

    return {
      brand,
      name,
      slug: getValue("slug") || `${brand}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      bodyType: getValue("body_type"),
      tagline: getValue("tagline"),
      price: getValue("price_display"),
      priceNumeric: getNumber("price_numeric"),
      originalPrice: getValue("original_price"),
      discount: getValue("discount"),
      fuelTypes: getArray("fuel_types"),
      transmission: getArray("transmission_types"),
      availability: getValue("availability") || "Available",
      isHot: getBool("is_hot"),
      isLimited: getBool("is_limited"),
      isNew: getBool("is_new"),
      isUpcoming: getBool("is_upcoming"),
      isBestseller: getBool("is_bestseller"),
      launchDate: getValue("launch_date") || undefined,
      overview: getValue("overview"),
      keyHighlights: getArray("key_highlights"),
      pros: getArray("pros"),
      cons: getArray("cons"),
      competitors: getArray("competitors"),
      brochureUrl: getValue("brochure_url") || undefined,
      officialUrl: getValue("official_url") || undefined,
      variants,
      colors,
      specifications,
      image: getValue("image_url"),
      gallery: getArray("gallery_urls"),
      errors: errors.length > 0 ? errors : undefined,
      selected: true,
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        
        if (rows.length < 2) {
          setValidationErrors(["CSV file must have at least a header row and one data row"]);
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, "_"));
        const dataRows = rows.slice(1);
        
        const cars = dataRows.map(row => parseRow(row, headers));
        setParsedCars(cars);
        setValidationErrors([]);
        
        const carsWithErrors = cars.filter(c => c.errors && c.errors.length > 0);
        if (carsWithErrors.length > 0) {
          toast({
            title: "Validation Warnings",
            description: `${carsWithErrors.length} cars have validation issues`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "CSV Parsed Successfully",
            description: `${cars.length} cars ready to import`,
          });
        }
      } catch (error) {
        setValidationErrors(["Failed to parse CSV file. Please check the format."]);
        console.error("CSV parse error:", error);
      }
    };
    reader.readAsText(file);
  };

  const removeCar = (index: number) => {
    setParsedCars(prev => prev.filter((_, i) => i !== index));
  };

  const uploadCars = async () => {
    const selectedCars = parsedCars.filter(c => c.selected && (!c.errors || c.errors.length === 0));
    if (selectedCars.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentCarIndex(0);
    setUploadResults(null);

    const results = { success: 0, failed: 0, errors: [] as string[], duplicates: 0 };

    for (let i = 0; i < selectedCars.length; i++) {
      const car = selectedCars[i];
      setCurrentCarIndex(i + 1);
      
      try {
        // Check if car already exists
        const { data: existingCar } = await supabase
          .from('cars')
          .select('id')
          .eq('slug', car.slug)
          .maybeSingle();

        if (existingCar && uploadMode === 'insert') {
          results.duplicates++;
          results.errors.push(`${car.brand} ${car.name}: Already exists (skipped)`);
          setUploadProgress(Math.round(((i + 1) / selectedCars.length) * 100));
          continue;
        }

        // Insert or update the main car record
        const carPayload = {
          slug: car.slug,
          name: car.name,
          brand: car.brand,
          body_type: car.bodyType,
          tagline: car.tagline,
          price_range: car.price,
          price_numeric: car.priceNumeric,
          original_price: car.originalPrice,
          discount: car.discount,
          fuel_types: car.fuelTypes,
          transmission_types: car.transmission,
          availability: car.availability,
          is_hot: car.isHot,
          is_limited: car.isLimited,
          is_new: car.isNew,
          is_upcoming: car.isUpcoming,
          is_bestseller: car.isBestseller,
          launch_date: car.launchDate || null,
          overview: car.overview,
          key_highlights: car.keyHighlights,
          pros: car.pros,
          cons: car.cons,
          competitors: car.competitors,
          brochure_url: car.brochureUrl || null,
          official_url: car.officialUrl || null,
        };

        let carId: string;

        if (existingCar) {
          // Update existing car
          const { error: updateError } = await supabase
            .from('cars')
            .update(carPayload)
            .eq('id', existingCar.id);
          
          if (updateError) throw updateError;
          carId = existingCar.id;

          // Delete existing related data for refresh
          await Promise.all([
            supabase.from('car_variants').delete().eq('car_id', carId),
            supabase.from('car_colors').delete().eq('car_id', carId),
            supabase.from('car_specifications').delete().eq('car_id', carId),
            supabase.from('car_images').delete().eq('car_id', carId),
          ]);
        } else {
          // Insert new car
          const { data: newCar, error: insertError } = await supabase
            .from('cars')
            .insert(carPayload)
            .select('id')
            .single();
          
          if (insertError) throw insertError;
          carId = newCar.id;
        }

        // Insert variants
        if (car.variants.length > 0) {
          const variantsPayload = car.variants.map((v, idx) => ({
            car_id: carId,
            name: v.name,
            price: v.price,
            price_numeric: v.priceNumeric,
            fuel_type: v.fuelType,
            transmission: v.transmission,
            features: v.features,
            ex_showroom: v.exShowroom,
            rto: v.rto,
            insurance: v.insurance,
            registration: v.registration,
            handling: v.handling,
            tcs: v.tcs,
            fastag: v.fastag,
            on_road_price: v.exShowroom + v.rto + v.insurance + v.registration + v.handling + v.tcs + v.fastag,
            sort_order: idx,
          }));
          
          const { error: variantError } = await supabase.from('car_variants').insert(variantsPayload);
          if (variantError) console.error('Variant insert error:', variantError);
        }

        // Insert colors
        if (car.colors.length > 0) {
          const colorsPayload = car.colors.map((c, idx) => ({
            car_id: carId,
            name: c.name,
            hex_code: c.hex,
            image_url: c.imageUrl || null,
            sort_order: idx,
          }));
          
          const { error: colorError } = await supabase.from('car_colors').insert(colorsPayload);
          if (colorError) console.error('Color insert error:', colorError);
        }

        // Insert specifications
        const specsPayload: { car_id: string; category: string; label: string; value: string; sort_order: number }[] = [];
        let specOrder = 0;
        for (const [category, specs] of Object.entries(car.specifications)) {
          for (const spec of specs) {
            specsPayload.push({
              car_id: carId,
              category,
              label: spec.label,
              value: spec.value,
              sort_order: specOrder++,
            });
          }
        }
        if (specsPayload.length > 0) {
          const { error: specError } = await supabase.from('car_specifications').insert(specsPayload);
          if (specError) console.error('Spec insert error:', specError);
        }

        // Insert images
        const imagesPayload: { car_id: string; url: string; is_primary: boolean; sort_order: number; alt_text: string }[] = [];
        if (car.image) {
          imagesPayload.push({ car_id: carId, url: car.image, is_primary: true, sort_order: 0, alt_text: `${car.brand} ${car.name}` });
        }
        car.gallery.forEach((url, idx) => {
          imagesPayload.push({ car_id: carId, url, is_primary: false, sort_order: idx + 1, alt_text: `${car.brand} ${car.name} Gallery ${idx + 1}` });
        });
        if (imagesPayload.length > 0) {
          const { error: imgError } = await supabase.from('car_images').insert(imagesPayload);
          if (imgError) console.error('Image insert error:', imgError);
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${car.brand} ${car.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      setUploadProgress(Math.round(((i + 1) / selectedCars.length) * 100));
    }

    setUploadResults(results);
    setIsUploading(false);

    if (results.success > 0) {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${results.success} cars${results.duplicates > 0 ? `, ${results.duplicates} duplicates skipped` : ''}`,
      });
    }
  };

  const toggleCarSelection = (index: number) => {
    setParsedCars(prev => prev.map((car, i) => 
      i === index ? { ...car, selected: !car.selected } : car
    ));
  };

  const toggleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    setParsedCars(prev => prev.map(car => ({ ...car, selected: newValue })));
  };

  const validCars = parsedCars.filter(c => !c.errors || c.errors.length === 0);
  const invalidCars = parsedCars.filter(c => c.errors && c.errors.length > 0);
  const selectedCount = parsedCars.filter(c => c.selected && (!c.errors || c.errors.length === 0)).length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Bulk Car Import
          </h2>
          <p className="text-muted-foreground">Import 50+ cars at once from CSV/Excel templates</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {parsedCars.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{parsedCars.length}</p>
                <p className="text-sm text-muted-foreground">Total Cars</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{validCars.length}</p>
                <p className="text-sm text-muted-foreground">Valid</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invalidCars.length}</p>
                <p className="text-sm text-muted-foreground">Invalid</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedCount}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Upload a CSV file with car data. Supports up to 10 variants and 15 colors per car.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <Button onClick={() => fileInputRef.current?.click()} size="lg">
              <Upload className="h-4 w-4 mr-2" />
              Select CSV File
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Supports CSV format with up to 500 cars per file
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="outline">10 Variants/Car</Badge>
              <Badge variant="outline">15 Colors/Car</Badge>
              <Badge variant="outline">Full Specs</Badge>
              <Badge variant="outline">Price Breakup</Badge>
            </div>
          </div>

          {/* Import Mode Selection */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Import Mode:</span>
            <div className="flex gap-2">
              <Button 
                variant={uploadMode === 'upsert' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setUploadMode('upsert')}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Update Existing
              </Button>
              <Button 
                variant={uploadMode === 'insert' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setUploadMode('insert')}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Insert New Only
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              {uploadMode === 'upsert' ? 'Existing cars will be updated based on slug' : 'Duplicates will be skipped'}
            </span>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {validationErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Parsed Cars Preview */}
      {parsedCars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview ({parsedCars.length} cars)</span>
              <div className="flex gap-2">
                <Badge variant="default">{validCars.length} Valid</Badge>
                {invalidCars.length > 0 && (
                  <Badge variant="destructive">{invalidCars.length} Invalid</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="valid">
              <TabsList>
                <TabsTrigger value="valid">Valid Cars ({validCars.length})</TabsTrigger>
                {invalidCars.length > 0 && (
                  <TabsTrigger value="invalid">Invalid Cars ({invalidCars.length})</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="valid">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox 
                            checked={selectAll} 
                            onCheckedChange={() => toggleSelectAll()} 
                          />
                        </TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Body Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Variants</TableHead>
                        <TableHead>Colors</TableHead>
                        <TableHead>Specs</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validCars.map((car, index) => {
                        const originalIndex = parsedCars.indexOf(car);
                        const specCount = Object.values(car.specifications).reduce((acc, arr) => acc + arr.length, 0);
                        return (
                          <TableRow key={index} className={!car.selected ? 'opacity-50' : ''}>
                            <TableCell>
                              <Checkbox 
                                checked={car.selected} 
                                onCheckedChange={() => toggleCarSelection(originalIndex)} 
                              />
                            </TableCell>
                            <TableCell className="font-medium">{car.brand}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{car.name}</p>
                                <p className="text-xs text-muted-foreground">{car.slug}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{car.bodyType || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell>{car.price || `₹${(car.priceNumeric / 100000).toFixed(2)} Lakh`}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{car.variants.length}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{car.colors.length}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{specCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPreviewCar(car)}
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeCar(originalIndex)}
                                  title="Remove"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="invalid">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Errors</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invalidCars.map((car, index) => (
                        <TableRow key={index}>
                          <TableCell>{car.brand || "—"}</TableCell>
                          <TableCell>{car.name || "—"}</TableCell>
                          <TableCell>
                            {car.errors?.map((err, i) => (
                              <Badge key={i} variant="destructive" className="mr-1">
                                {err}
                              </Badge>
                            ))}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCar(parsedCars.indexOf(car))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4 space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Importing car {currentCarIndex} of {selectedCount}...
                  </span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
              <Alert className="mt-4" variant={uploadResults.failed > 0 ? "destructive" : "default"}>
                <div className="flex items-center gap-2">
                  {uploadResults.failed > 0 ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <strong>Import Complete:</strong> {uploadResults.success} successful, {uploadResults.failed} failed
                    {uploadResults.duplicates > 0 && `, ${uploadResults.duplicates} duplicates skipped`}
                    {uploadResults.errors.length > 0 && (
                      <ul className="mt-2 text-sm">
                        {uploadResults.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                        {uploadResults.errors.length > 5 && (
                          <li>... and {uploadResults.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectAll} 
                  onCheckedChange={() => toggleSelectAll()} 
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer">
                  Select All Valid Cars
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setParsedCars([])}>
                  Clear All
                </Button>
                <Button
                  onClick={uploadCars}
                  disabled={selectedCount === 0 || isUploading}
                  className="min-w-[160px]"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Import {selectedCount} Cars
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewCar} onOpenChange={() => setPreviewCar(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {previewCar?.brand} {previewCar?.name}
            </DialogTitle>
            <DialogDescription>{previewCar?.tagline}</DialogDescription>
          </DialogHeader>

          {previewCar && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Body Type</p>
                  <p className="font-medium">{previewCar.bodyType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">{previewCar.price || `₹${(previewCar.priceNumeric / 100000).toFixed(2)} Lakh`}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fuel Types</p>
                  <p className="font-medium">{previewCar.fuelTypes.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transmission</p>
                  <p className="font-medium">{previewCar.transmission.join(", ") || "—"}</p>
                </div>
              </div>

              {/* Variants */}
              {previewCar.variants.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Variants ({previewCar.variants.length})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Ex-Showroom</TableHead>
                        <TableHead>RTO</TableHead>
                        <TableHead>Insurance</TableHead>
                        <TableHead>On-Road</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewCar.variants.map((v, i) => {
                        const onRoad = v.exShowroom + v.rto + v.insurance + v.registration + v.handling + v.tcs + v.fastag;
                        return (
                          <TableRow key={i}>
                            <TableCell>{v.name}</TableCell>
                            <TableCell>₹{(v.exShowroom / 100000).toFixed(2)}L</TableCell>
                            <TableCell>₹{(v.rto / 1000).toFixed(0)}K</TableCell>
                            <TableCell>₹{(v.insurance / 1000).toFixed(0)}K</TableCell>
                            <TableCell className="font-medium">₹{(onRoad / 100000).toFixed(2)}L</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Colors */}
              {previewCar.colors.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Colors ({previewCar.colors.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewCar.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-sm">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specifications */}
              {Object.entries(previewCar.specifications).some(([_, specs]) => specs.length > 0) && (
                <div>
                  <h4 className="font-semibold mb-2">Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(previewCar.specifications).map(([category, specs]) => (
                      specs.length > 0 && (
                        <div key={category} className="bg-muted/50 p-3 rounded-lg">
                          <h5 className="font-medium capitalize mb-2">{category}</h5>
                          {specs.map((spec, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{spec.label}</span>
                              <span>{spec.value}</span>
                            </div>
                          ))}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
