import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, 
  MapPin, Building, RefreshCw, Database, Plus, Trash2, Edit, IndianRupee,
  Calculator
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface State {
  id: string;
  code: string;
  name: string;
  rto_percentage: number;
  is_active: boolean;
}

interface City {
  id: string;
  state_code: string;
  name: string;
  rto_code: string;
  rto_percentage_override: number | null;
  is_metro: boolean;
  is_active: boolean;
}

interface CityPricing {
  id: string;
  car_id: string;
  variant_id: string | null;
  state: string;
  city: string;
  ex_showroom: number;
  rto: number;
  insurance: number;
  tcs: number;
  fastag: number;
  registration: number;
  handling: number;
  other_charges: number;
  on_road_price: number;
  is_active: boolean;
}

interface ParsedPricing {
  car_slug: string;
  variant_name: string;
  state: string;
  city: string;
  ex_showroom: number;
  rto: number;
  insurance: number;
  tcs: number;
  fastag: number;
  registration: number;
  handling: number;
  other_charges: number;
  errors?: string[];
}

const CSV_TEMPLATE = `car_slug,variant_name,state,city,ex_showroom,rto,insurance,tcs,fastag,registration,handling,other_charges
maruti-swift-2024,LXi,Delhi,New Delhi,649000,51920,22715,0,500,1000,15000,0
maruti-swift-2024,VXi,Delhi,New Delhi,749000,59920,26215,0,500,1000,15000,0
maruti-swift-2024,ZXi,Delhi,New Delhi,849000,67920,29715,0,500,1000,15000,0
maruti-swift-2024,LXi,Maharashtra,Mumbai,649000,71390,22715,0,500,1000,15000,2500
maruti-swift-2024,VXi,Maharashtra,Mumbai,749000,82390,26215,0,500,1000,15000,2500
maruti-swift-2024,ZXi,Maharashtra,Mumbai,849000,93390,29715,0,500,1000,15000,2500
hyundai-creta,E,Karnataka,Bangalore,1099900,142987,38497,10999,500,1000,15000,0
hyundai-creta,EX,Karnataka,Bangalore,1245900,161967,43606,12459,500,1000,15000,0`;

export default function StateCityPricingManager() {
  const [activeTab, setActiveTab] = useState("manage");
  const [parsedData, setParsedData] = useState<ParsedPricing[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState({
    ex_showroom: 0,
    state: "",
    city: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch states
  const { data: states = [] } = useQuery({
    queryKey: ['indian-states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indian_states')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as State[];
    }
  });

  // Fetch cities for selected state
  const { data: cities = [] } = useQuery({
    queryKey: ['indian-cities', selectedState],
    queryFn: async () => {
      if (!selectedState) return [];
      const { data, error } = await supabase
        .from('indian_cities')
        .select('*')
        .eq('state_code', selectedState)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as City[];
    },
    enabled: !!selectedState
  });

  // Fetch cars
  const { data: cars = [] } = useQuery({
    queryKey: ['cars-for-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('id, slug, name, brand')
        .order('brand');
      if (error) throw error;
      return data;
    }
  });

  // Fetch existing city pricing
  const { data: existingPricing = [] } = useQuery({
    queryKey: ['city-pricing', selectedCar, selectedState, selectedCity],
    queryFn: async () => {
      let query = supabase
        .from('car_city_pricing')
        .select('*')
        .eq('is_active', true);
      
      if (selectedCar) query = query.eq('car_id', selectedCar);
      if (selectedState) query = query.eq('state', selectedState);
      if (selectedCity) query = query.eq('city', selectedCity);
      
      const { data, error } = await query.order('state').limit(100);
      if (error) throw error;
      return data as CityPricing[];
    }
  });

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "state_city_pricing_template.csv";
    link.click();
    
    toast({
      title: "Template Downloaded",
      description: "Fill in the template with state-city pricing data",
    });
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        rows.push(line.split(',').map(cell => cell.trim()));
      }
    }
    return rows;
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
          toast({ title: "Error", description: "CSV must have header and data rows", variant: "destructive" });
          return;
        }

        const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, "_"));
        const dataRows = rows.slice(1);
        
        const parsed: ParsedPricing[] = dataRows.map(row => {
          const getValue = (key: string) => {
            const index = headers.indexOf(key);
            return index >= 0 ? row[index] || "" : "";
          };
          const getNumber = (key: string) => {
            const val = getValue(key).replace(/[^\d.-]/g, "");
            return parseFloat(val) || 0;
          };

          const errors: string[] = [];
          const car_slug = getValue("car_slug");
          const state = getValue("state");
          const city = getValue("city");
          
          if (!car_slug) errors.push("Car slug required");
          if (!state) errors.push("State required");
          if (!city) errors.push("City required");

          return {
            car_slug,
            variant_name: getValue("variant_name"),
            state,
            city,
            ex_showroom: getNumber("ex_showroom"),
            rto: getNumber("rto"),
            insurance: getNumber("insurance"),
            tcs: getNumber("tcs"),
            fastag: getNumber("fastag") || 500,
            registration: getNumber("registration") || 1000,
            handling: getNumber("handling") || 15000,
            other_charges: getNumber("other_charges"),
            errors: errors.length > 0 ? errors : undefined,
          };
        });

        setParsedData(parsed);
        toast({
          title: "CSV Parsed",
          description: `${parsed.length} pricing entries ready to import`,
        });
      } catch (error) {
        toast({ title: "Parse Error", description: "Failed to parse CSV file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const uploadPricing = async () => {
    const validData = parsedData.filter(d => !d.errors || d.errors.length === 0);
    if (validData.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    let success = 0, failed = 0;

    for (let i = 0; i < validData.length; i++) {
      const item = validData[i];
      
      try {
        // Find car by slug
        const { data: car } = await supabase
          .from('cars')
          .select('id')
          .eq('slug', item.car_slug)
          .single();
        
        if (!car) {
          failed++;
          continue;
        }

        // Find variant if specified
        let variantId = null;
        if (item.variant_name) {
          const { data: variant } = await supabase
            .from('car_variants')
            .select('id')
            .eq('car_id', car.id)
            .eq('name', item.variant_name)
            .maybeSingle();
          variantId = variant?.id || null;
        }

        const onRoadPrice = item.ex_showroom + item.rto + item.insurance + 
          item.tcs + item.fastag + item.registration + item.handling + item.other_charges;

        // Upsert pricing
        const { error } = await supabase
          .from('car_city_pricing')
          .upsert({
            car_id: car.id,
            variant_id: variantId,
            state: item.state,
            city: item.city,
            ex_showroom: item.ex_showroom,
            rto: item.rto,
            insurance: item.insurance,
            tcs: item.tcs,
            fastag: item.fastag,
            registration: item.registration,
            handling: item.handling,
            other_charges: item.other_charges,
            on_road_price: onRoadPrice,
            is_active: true,
          }, {
            onConflict: 'car_id,variant_id,state,city'
          });

        if (error) throw error;
        success++;
      } catch (error) {
        failed++;
      }

      setUploadProgress(Math.round(((i + 1) / validData.length) * 100));
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ['city-pricing'] });
    
    toast({
      title: "Import Complete",
      description: `${success} successful, ${failed} failed`,
    });
  };

  const calculateOnRoadPrice = () => {
    const state = states.find(s => s.code === calculatorData.state);
    if (!state || !calculatorData.ex_showroom) return null;

    const rtoPercent = state.rto_percentage / 100;
    const rto = Math.round(calculatorData.ex_showroom * rtoPercent);
    const insurance = Math.round(calculatorData.ex_showroom * 0.035);
    const tcs = calculatorData.ex_showroom > 1000000 ? Math.round(calculatorData.ex_showroom * 0.01) : 0;
    const fastag = 500;
    const registration = 1000;
    const handling = 15000;
    const onRoad = calculatorData.ex_showroom + rto + insurance + tcs + fastag + registration + handling;

    return { rto, insurance, tcs, fastag, registration, handling, onRoad };
  };

  const validData = parsedData.filter(d => !d.errors || d.errors.length === 0);
  const invalidData = parsedData.filter(d => d.errors && d.errors.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            State & City Pricing
          </h2>
          <p className="text-muted-foreground">Manage on-road prices by state and city</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCalculator(true)}>
            <Calculator className="h-4 w-4 mr-2" />
            Price Calculator
          </Button>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{states.length}</p>
              <p className="text-sm text-muted-foreground">States</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cities.length || '50+'}</p>
              <p className="text-sm text-muted-foreground">Cities</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{existingPricing.length}</p>
              <p className="text-sm text-muted-foreground">Price Entries</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cars.length}</p>
              <p className="text-sm text-muted-foreground">Cars</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="manage">Manage Pricing</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          <TabsTrigger value="states">States & Cities</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Car</Label>
                <Select value={selectedCar} onValueChange={setSelectedCar}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cars</SelectItem>
                    {cars.map(car => (
                      <SelectItem key={car.id} value={car.id}>
                        {car.brand} {car.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select State</Label>
                <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedCity(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    {states.map(state => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name} ({state.rto_percentage}% RTO)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select City</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedState ? "Select City" : "Select State First"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city.id} value={city.name}>
                        {city.name} {city.is_metro && <Badge variant="secondary" className="ml-1">Metro</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Pricing Table */}
          <Card>
            <CardHeader>
              <CardTitle>City-wise Pricing ({existingPricing.length} entries)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>State</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Ex-Showroom</TableHead>
                      <TableHead className="text-right">RTO</TableHead>
                      <TableHead className="text-right">Insurance</TableHead>
                      <TableHead className="text-right">On-Road</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingPricing.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No pricing data found. Use bulk import to add pricing.
                        </TableCell>
                      </TableRow>
                    ) : (
                      existingPricing.map((pricing) => (
                        <TableRow key={pricing.id}>
                          <TableCell>{pricing.state}</TableCell>
                          <TableCell>{pricing.city}</TableCell>
                          <TableCell className="text-right">₹{(pricing.ex_showroom / 100000).toFixed(2)}L</TableCell>
                          <TableCell className="text-right">₹{(pricing.rto / 1000).toFixed(0)}K</TableCell>
                          <TableCell className="text-right">₹{(pricing.insurance / 1000).toFixed(0)}K</TableCell>
                          <TableCell className="text-right font-semibold">₹{(pricing.on_road_price / 100000).toFixed(2)}L</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Bulk Import State-City Pricing
              </CardTitle>
              <CardDescription>
                Upload CSV with pricing for multiple states, cities, and variants
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
                  CSV should include: car_slug, variant_name, state, city, ex_showroom, rto, insurance, etc.
                </p>
              </div>

              {parsedData.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="default">{validData.length} Valid</Badge>
                      {invalidData.length > 0 && (
                        <Badge variant="destructive">{invalidData.length} Invalid</Badge>
                      )}
                    </div>
                    <Button onClick={uploadPricing} disabled={validData.length === 0 || isUploading}>
                      {isUploading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Import {validData.length} Entries
                        </>
                      )}
                    </Button>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading pricing data...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Car</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead className="text-right">Ex-Showroom</TableHead>
                          <TableHead className="text-right">RTO</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.map((item, idx) => (
                          <TableRow key={idx} className={item.errors ? 'bg-destructive/10' : ''}>
                            <TableCell>{item.car_slug}</TableCell>
                            <TableCell>{item.variant_name || '-'}</TableCell>
                            <TableCell>{item.state}</TableCell>
                            <TableCell>{item.city}</TableCell>
                            <TableCell className="text-right">₹{(item.ex_showroom / 100000).toFixed(2)}L</TableCell>
                            <TableCell className="text-right">₹{(item.rto / 1000).toFixed(0)}K</TableCell>
                            <TableCell>
                              {item.errors ? (
                                <Badge variant="destructive">{item.errors.join(', ')}</Badge>
                              ) : (
                                <Badge variant="default">Valid</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="states" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* States List */}
            <Card>
              <CardHeader>
                <CardTitle>Indian States ({states.length})</CardTitle>
                <CardDescription>RTO percentage by state</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-right">RTO %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {states.map(state => (
                        <TableRow 
                          key={state.id} 
                          className={`cursor-pointer ${selectedState === state.code ? 'bg-muted' : ''}`}
                          onClick={() => setSelectedState(state.code)}
                        >
                          <TableCell className="font-mono">{state.code}</TableCell>
                          <TableCell>{state.name}</TableCell>
                          <TableCell className="text-right">{state.rto_percentage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Cities List */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Cities {selectedState && `in ${states.find(s => s.code === selectedState)?.name || selectedState}`}
                </CardTitle>
                <CardDescription>
                  {selectedState ? `${cities.length} cities` : 'Select a state to view cities'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {selectedState ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>City</TableHead>
                          <TableHead>RTO Code</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cities.map(city => (
                          <TableRow key={city.id}>
                            <TableCell>{city.name}</TableCell>
                            <TableCell className="font-mono">{city.rto_code || '-'}</TableCell>
                            <TableCell>
                              {city.is_metro && <Badge>Metro</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Click on a state to view its cities
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Price Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              On-Road Price Calculator
            </DialogTitle>
            <DialogDescription>
              Calculate estimated on-road price based on state RTO rates
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ex-Showroom Price (₹)</Label>
              <Input
                type="number"
                placeholder="e.g., 649000"
                value={calculatorData.ex_showroom || ''}
                onChange={(e) => setCalculatorData(prev => ({ ...prev, ex_showroom: parseInt(e.target.value) || 0 }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>State</Label>
              <Select 
                value={calculatorData.state} 
                onValueChange={(v) => setCalculatorData(prev => ({ ...prev, state: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(state => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name} ({state.rto_percentage}% RTO)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {calculatorData.ex_showroom > 0 && calculatorData.state && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                {(() => {
                  const calc = calculateOnRoadPrice();
                  if (!calc) return null;
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Ex-Showroom</span>
                        <span>₹{calculatorData.ex_showroom.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>RTO</span>
                        <span>₹{calc.rto.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Insurance</span>
                        <span>₹{calc.insurance.toLocaleString('en-IN')}</span>
                      </div>
                      {calc.tcs > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>TCS (1%)</span>
                          <span>₹{calc.tcs.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>FASTag</span>
                        <span>₹{calc.fastag.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Registration</span>
                        <span>₹{calc.registration.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Handling</span>
                        <span>₹{calc.handling.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                        <span>On-Road Price</span>
                        <span className="text-primary">₹{calc.onRoad.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalculator(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
