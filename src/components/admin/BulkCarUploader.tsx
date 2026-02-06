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
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Eye, Trash2, Car } from "lucide-react";
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
  launchDate?: string;
  overview: string;
  keyHighlights: string[];
  pros: string[];
  cons: string[];
  competitors: string[];
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
  colors: { name: string; hex: string }[];
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
}

const CSV_TEMPLATE_HEADERS = [
  "brand", "name", "slug", "body_type", "tagline", "price_display", "price_numeric",
  "original_price", "discount", "fuel_types", "transmission_types", "availability",
  "is_hot", "is_limited", "is_new", "is_upcoming", "launch_date", "overview",
  "key_highlights", "pros", "cons", "competitors", "image_url", "gallery_urls",
  // Variant columns (up to 5 variants)
  "variant_1_name", "variant_1_price", "variant_1_price_numeric", "variant_1_fuel_type", 
  "variant_1_transmission", "variant_1_features", "variant_1_ex_showroom", "variant_1_rto",
  "variant_1_insurance", "variant_1_registration", "variant_1_handling", "variant_1_tcs", "variant_1_fastag",
  "variant_2_name", "variant_2_price", "variant_2_price_numeric", "variant_2_fuel_type",
  "variant_2_transmission", "variant_2_features", "variant_2_ex_showroom", "variant_2_rto",
  "variant_2_insurance", "variant_2_registration", "variant_2_handling", "variant_2_tcs", "variant_2_fastag",
  "variant_3_name", "variant_3_price", "variant_3_price_numeric", "variant_3_fuel_type",
  "variant_3_transmission", "variant_3_features", "variant_3_ex_showroom", "variant_3_rto",
  "variant_3_insurance", "variant_3_registration", "variant_3_handling", "variant_3_tcs", "variant_3_fastag",
  // Color columns (up to 10 colors)
  "color_1_name", "color_1_hex", "color_2_name", "color_2_hex", "color_3_name", "color_3_hex",
  "color_4_name", "color_4_hex", "color_5_name", "color_5_hex", "color_6_name", "color_6_hex",
  "color_7_name", "color_7_hex", "color_8_name", "color_8_hex", "color_9_name", "color_9_hex",
  "color_10_name", "color_10_hex",
  // Specification columns
  "spec_engine_displacement", "spec_engine_max_power", "spec_engine_max_torque", "spec_engine_cylinders",
  "spec_dim_length", "spec_dim_width", "spec_dim_height", "spec_dim_wheelbase", "spec_dim_ground_clearance",
  "spec_perf_top_speed", "spec_perf_0_100", "spec_perf_mileage",
  "spec_feat_infotainment", "spec_feat_ac", "spec_feat_seats",
  "spec_safety_airbags", "spec_safety_abs", "spec_safety_esc", "spec_safety_ncap"
];

const SAMPLE_DATA = [
  "Maruti Suzuki", "Swift 2024", "maruti-swift-2024", "Hatchback", "Drive with Passion",
  "₹6.49 - 9.64 Lakh", "649000", "₹6.99 Lakh", "₹50,000", "Petrol|CNG", "Manual|AMT",
  "Available", "TRUE", "FALSE", "TRUE", "FALSE", "", 
  "The all-new Maruti Swift 2024 comes with a refreshed design and improved features.",
  "New Design|Better Mileage|Feature Rich", "Great mileage|Reliable|Low maintenance",
  "Smaller boot|Basic interiors", "Hyundai i20|Tata Altroz|Honda Jazz",
  "https://example.com/swift.jpg", "https://example.com/swift-1.jpg|https://example.com/swift-2.jpg",
  // Variant 1
  "LXi", "₹6.49 Lakh", "649000", "Petrol", "Manual", "AC|Power Steering|Airbags",
  "649000", "52000", "25000", "1000", "15000", "0", "500",
  // Variant 2
  "VXi", "₹7.49 Lakh", "749000", "Petrol", "Manual", "AC|Power Steering|Airbags|Touchscreen",
  "749000", "60000", "28000", "1000", "15000", "0", "500",
  // Variant 3
  "ZXi", "₹8.49 Lakh", "849000", "Petrol", "AMT", "AC|Power Steering|6 Airbags|Sunroof",
  "849000", "68000", "32000", "1000", "15000", "8490", "500",
  // Colors
  "Pearl Arctic White", "#FFFFFF", "Solid Fire Red", "#FF0000", "Midnight Blue", "#191970",
  "Sizzling Red", "#FF2400", "Magma Grey", "#3D3D3D", "Luster Blue", "#4169E1",
  "Grandeur Grey", "#808080", "Prime Lucent Orange", "#FF7F00", "", "",
  "", "",
  // Specs
  "1197 cc", "81.06 bhp @ 6000 rpm", "112 Nm @ 4200 rpm", "4",
  "3845 mm", "1735 mm", "1530 mm", "2450 mm", "163 mm",
  "180 kmph", "12.5 sec", "22.56 kmpl",
  "9-inch Smartplay Pro+", "Auto Climate Control", "5 Seater",
  "6 Airbags", "Yes with EBD", "Yes", "4 Star"
];

export default function BulkCarUploader() {
  const [parsedCars, setParsedCars] = useState<ParsedCar[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [previewCar, setPreviewCar] = useState<ParsedCar | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
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

    // Parse variants
    const variants = [];
    for (let i = 1; i <= 3; i++) {
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

    // Parse colors
    const colors = [];
    for (let i = 1; i <= 10; i++) {
      const colorName = getValue(`color_${i}_name`);
      const colorHex = getValue(`color_${i}_hex`);
      if (colorName && colorHex) {
        colors.push({ name: colorName, hex: colorHex });
      }
    }

    // Parse specifications
    const specifications = {
      engine: [
        { label: "Displacement", value: getValue("spec_engine_displacement") },
        { label: "Max Power", value: getValue("spec_engine_max_power") },
        { label: "Max Torque", value: getValue("spec_engine_max_torque") },
        { label: "Cylinders", value: getValue("spec_engine_cylinders") },
      ].filter(s => s.value),
      dimensions: [
        { label: "Length", value: getValue("spec_dim_length") },
        { label: "Width", value: getValue("spec_dim_width") },
        { label: "Height", value: getValue("spec_dim_height") },
        { label: "Wheelbase", value: getValue("spec_dim_wheelbase") },
        { label: "Ground Clearance", value: getValue("spec_dim_ground_clearance") },
      ].filter(s => s.value),
      performance: [
        { label: "Top Speed", value: getValue("spec_perf_top_speed") },
        { label: "0-100 kmph", value: getValue("spec_perf_0_100") },
        { label: "Mileage", value: getValue("spec_perf_mileage") },
      ].filter(s => s.value),
      features: [
        { label: "Infotainment", value: getValue("spec_feat_infotainment") },
        { label: "AC", value: getValue("spec_feat_ac") },
        { label: "Seating Capacity", value: getValue("spec_feat_seats") },
      ].filter(s => s.value),
      safety: [
        { label: "Airbags", value: getValue("spec_safety_airbags") },
        { label: "ABS", value: getValue("spec_safety_abs") },
        { label: "ESC", value: getValue("spec_safety_esc") },
        { label: "NCAP Rating", value: getValue("spec_safety_ncap") },
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
      launchDate: getValue("launch_date"),
      overview: getValue("overview"),
      keyHighlights: getArray("key_highlights"),
      pros: getArray("pros"),
      cons: getArray("cons"),
      competitors: getArray("competitors"),
      variants,
      colors,
      specifications,
      image: getValue("image_url"),
      gallery: getArray("gallery_urls"),
      errors: errors.length > 0 ? errors : undefined,
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
    if (parsedCars.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < parsedCars.length; i++) {
      const car = parsedCars[i];
      
      try {
        // Transform to match the migrate-car-data format
        const carData = {
          slug: car.slug,
          name: car.name,
          brand: car.brand,
          bodyType: car.bodyType,
          tagline: car.tagline,
          price: car.price,
          priceNumeric: car.priceNumeric,
          originalPrice: car.originalPrice,
          discount: car.discount,
          fuelTypes: car.fuelTypes,
          transmission: car.transmission,
          availability: car.availability,
          isHot: car.isHot,
          isLimited: car.isLimited,
          isNew: car.isNew,
          isUpcoming: car.isUpcoming,
          launchDate: car.launchDate,
          overview: car.overview,
          keyHighlights: car.keyHighlights,
          specifications: car.specifications,
          colors: car.colors.map(c => ({ name: c.name, hex: c.hex })),
          variants: car.variants.map(v => ({
            name: v.name,
            price: v.price,
            priceNumeric: v.priceNumeric,
            fuelType: v.fuelType,
            transmission: v.transmission,
            features: v.features,
          })),
          offers: [],
          pros: car.pros,
          cons: car.cons,
          competitors: car.competitors,
          image: car.image,
          gallery: car.gallery,
        };

        const { error } = await supabase.functions.invoke("migrate-car-data", {
          body: { cars: [carData] },
        });

        if (error) throw error;
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${car.brand} ${car.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      setUploadProgress(Math.round(((i + 1) / parsedCars.length) * 100));
    }

    setUploadResults(results);
    setIsUploading(false);

    if (results.success > 0) {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${results.success} cars`,
      });
    }
  };

  const validCars = parsedCars.filter(c => !c.errors || c.errors.length === 0);
  const invalidCars = parsedCars.filter(c => c.errors && c.errors.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Car Import</h2>
          <p className="text-muted-foreground">Import 100+ cars at once from CSV/Excel</p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Upload a CSV file with car data. Use the template for the correct format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <Button onClick={() => fileInputRef.current?.click()}>
              Select CSV File
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Supports CSV format with up to 500 cars
            </p>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
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
                        <TableHead>Brand</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Body Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Variants</TableHead>
                        <TableHead>Colors</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validCars.map((car, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{car.brand}</TableCell>
                          <TableCell>{car.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{car.bodyType}</Badge>
                          </TableCell>
                          <TableCell>{car.price || `₹${(car.priceNumeric / 100000).toFixed(2)} Lakh`}</TableCell>
                          <TableCell>{car.variants.length} variants</TableCell>
                          <TableCell>{car.colors.length} colors</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewCar(car)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeCar(parsedCars.indexOf(car))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading cars...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
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
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setParsedCars([])}>
                Clear All
              </Button>
              <Button
                onClick={uploadCars}
                disabled={validCars.length === 0 || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import {validCars.length} Cars
              </Button>
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
