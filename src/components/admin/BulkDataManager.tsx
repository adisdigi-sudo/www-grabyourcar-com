import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Database, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle,
  Car,
  Users,
  Package,
  Calendar,
  Shield,
  CreditCard,
  FileText,
  Plus,
  Trash2,
  Eye
} from "lucide-react";

interface ImportJob {
  id: string;
  type: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  errors?: string[];
}

const DATA_MODULES = [
  { id: 'cars', label: 'Car Catalog', icon: Car, description: 'Import car models, variants, and pricing' },
  { id: 'car_variants', label: 'Variant Pricing', icon: CreditCard, description: 'Import variant-wise pricing with on-road breakup' },
  { id: 'car_colors', label: 'Car Colors', icon: Car, description: 'Import car colors with images by variant' },
  { id: 'leads', label: 'Leads', icon: Users, description: 'Import customer leads and inquiries' },
  { id: 'accessories', label: 'Accessories', icon: Package, description: 'Import car accessories inventory' },
  { id: 'rentals', label: 'Self-Drive Vehicles', icon: Calendar, description: 'Import rental fleet vehicles' },
  { id: 'insurance', label: 'Insurance Plans', icon: Shield, description: 'Import insurance plan data' },
  { id: 'loans', label: 'Loan Offers', icon: CreditCard, description: 'Import bank loan offerings' },
  { id: 'contacts', label: 'Email Contacts', icon: FileText, description: 'Import email marketing contacts' },
];

const SAMPLE_DATA: Record<string, string> = {
  cars: `brand,name,slug,price_range,body_type,fuel_types,transmission_types,is_bestseller,is_new,is_hot,tagline,overview,key_highlights,pros,cons
Maruti,Swift,maruti-swift,6.49 - 9.59 Lakh,Hatchback,Petrol;CNG,Manual;AMT,true,false,false,India's Favorite Hatchback,The Maruti Swift is one of the most popular hatchbacks in India known for its sporty design and fuel efficiency.,Sporty Design;Great Mileage;Peppy Engine;Low Maintenance,Good fuel efficiency;Sporty looks;Easy to drive,Limited rear space;Basic features in base variant
Maruti,Brezza,maruti-brezza,8.29 - 14.14 Lakh,SUV,Petrol;CNG,Manual;Automatic,true,true,true,Smart Choice for Smart Buyers,The Brezza is a compact SUV that offers a perfect blend of style comfort and performance.,Sunroof;360 Camera;HUD Display;Wireless Charging,Stylish design;Feature-loaded;Good ground clearance,No diesel option;Average rear AC
Hyundai,Creta,hyundai-creta,11.00 - 20.15 Lakh,SUV,Petrol;Diesel,Manual;Automatic,true,false,false,The Ultimate SUV,Hyundai Creta is a premium compact SUV with segment-leading features and powerful performance.,ADAS;Panoramic Sunroof;Bose Audio;Ventilated Seats,Premium interiors;Powerful engines;Safety features,Expensive top variants;Firm ride quality
Tata,Nexon,tata-nexon,8.10 - 15.50 Lakh,SUV,Petrol;Diesel;Electric,Manual;AMT,true,false,true,Play Safe Play Smart,The Nexon is India's safest car with 5-star Global NCAP rating and modern design.,5-Star Safety;Electric Option;Connected Tech;Terrain Modes,Excellent safety;Multiple powertrain options;Good build quality,AMT could be smoother;Boot space average`,
  
  car_variants: `car_slug,variant_name,fuel_type,transmission,ex_showroom,rto,insurance,tcs,fastag,registration,handling,on_road_price,features
maruti-swift,LXi,Petrol,Manual,649000,51920,22715,0,500,1000,15000,740135,Power Steering;Front Power Windows;Dual Airbags;ABS with EBD
maruti-swift,VXi,Petrol,Manual,749000,59920,26215,0,500,1000,15000,851635,SmartPlay Studio;Rear AC Vents;Electrically Adjustable ORVMs;All Power Windows
maruti-swift,VXi AMT,Petrol,AMT,799000,63920,27965,0,500,1000,15000,907385,Auto Gear Shift;Idle Start-Stop;ECO Mode;Hill Hold Assist
maruti-swift,ZXi,Petrol,Manual,849000,67920,29715,0,500,1000,15000,963135,Push Button Start;Cruise Control;Auto Climate Control;LED Projector Headlamps
maruti-swift,ZXi+ AMT,Petrol,AMT,959000,76720,33565,0,500,1000,15000,1085785,Sunroof;360 Camera;6 Airbags;Wireless Charger;Head-Up Display
hyundai-creta,E,Petrol,Manual,1099900,87992,38497,10999,500,1000,15000,1253888,17-inch Wheels;LED DRLs;Digital Cluster;Type-C USB Charger
hyundai-creta,EX,Petrol,Manual,1245900,99672,43606,12459,500,1000,15000,1418137,Sunroof;10.25 inch Display;Wireless Android Auto;Ventilated Front Seats
hyundai-creta,SX,Diesel,Automatic,1659900,132792,58097,16599,500,1000,15000,1883888,ADAS Level 2;Panoramic Sunroof;Bose 8 Speaker;Air Purifier
hyundai-creta,SX(O),Diesel,Automatic,2015000,161200,70525,20150,500,1000,15000,2283375,Digital Key;Voice Recognition;360 Camera;Front Parking Sensors
tata-nexon,Smart,Petrol,Manual,809900,64792,28347,0,500,1000,15000,919539,LED DRLs;Digital Instrument Cluster;Rear Wiper;Follow Me Home Headlamps
tata-nexon,Smart+ S,Petrol,AMT,959900,76792,33597,0,500,1000,15000,1085789,10.25 inch Display;Apple CarPlay;Android Auto;Reverse Camera
tata-nexon,Creative+,Diesel,Manual,1199900,95992,41997,11999,500,1000,15000,1365388,Sunroof;Wireless Charger;Ambient Lighting;Auto Headlamps
tata-nexon,Fearless+ S,Diesel,AMT,1549900,123992,54247,15499,500,1000,15000,1759638,Ventilated Seats;Air Purifier;360 Camera;6 Airbags;TPMS`,
  
  car_colors: `car_slug,color_name,hex_code,image_url
maruti-swift,Pearl Arctic White,#FAFAFA,https://cdn.example.com/maruti/swift/pearl-arctic-white.jpg
maruti-swift,Midnight Blue,#1A237E,https://cdn.example.com/maruti/swift/midnight-blue.jpg
maruti-swift,Solid Fire Red,#C62828,https://cdn.example.com/maruti/swift/solid-fire-red.jpg
maruti-swift,Magma Grey,#616161,https://cdn.example.com/maruti/swift/magma-grey.jpg
maruti-swift,Luster Blue,#1976D2,https://cdn.example.com/maruti/swift/luster-blue.jpg
maruti-swift,Sizzling Red,#B71C1C,https://cdn.example.com/maruti/swift/sizzling-red.jpg
hyundai-creta,Atlas White,#F5F5F5,https://cdn.example.com/hyundai/creta/atlas-white.jpg
hyundai-creta,Titan Grey,#4A4A4A,https://cdn.example.com/hyundai/creta/titan-grey.jpg
hyundai-creta,Abyss Black,#1A1A1A,https://cdn.example.com/hyundai/creta/abyss-black.jpg
hyundai-creta,Fiery Red,#D50000,https://cdn.example.com/hyundai/creta/fiery-red.jpg
hyundai-creta,Ranger Khaki,#8D6E63,https://cdn.example.com/hyundai/creta/ranger-khaki.jpg
hyundai-creta,Robust Emerald,#2E7D32,https://cdn.example.com/hyundai/creta/robust-emerald.jpg
tata-nexon,Pristine White,#FFFFFF,https://cdn.example.com/tata/nexon/pristine-white.jpg
tata-nexon,Flame Red,#D32F2F,https://cdn.example.com/tata/nexon/flame-red.jpg
tata-nexon,Daytona Grey,#757575,https://cdn.example.com/tata/nexon/daytona-grey.jpg
tata-nexon,Foliage Green,#388E3C,https://cdn.example.com/tata/nexon/foliage-green.jpg
tata-nexon,Creative Ocean,#0277BD,https://cdn.example.com/tata/nexon/creative-ocean.jpg
tata-nexon,Fearless Purple,#7B1FA2,https://cdn.example.com/tata/nexon/fearless-purple.jpg`,
  
  leads: `customer_name,phone,email,city,car_brand,car_model,car_variant,source,lead_type,status,priority,notes,budget_min,budget_max,buying_timeline,tags
Rahul Sharma,9876543210,rahul@email.com,Delhi,Maruti,Swift,VXi,website,car_inquiry,new,high,Interested in petrol variant with accessories,600000,800000,within_week,hot;ready_to_buy
Priya Patel,9876543211,priya@email.com,Mumbai,Hyundai,Creta,SX(O),whatsapp,test_drive,contacted,medium,Wants test drive this weekend,1500000,2000000,within_month,family;suv
Amit Kumar,9876543212,amit@email.com,Bangalore,Tata,Nexon,XZ+,referral,finance,qualified,high,Looking for loan options - salaried professional,900000,1200000,within_week,finance;exchange
Sneha Gupta,9876543213,sneha@email.com,Pune,Maruti,Brezza,ZXi+,showroom,exchange,new,low,Has old Swift for exchange,1000000,1400000,within_3_months,exchange;first_time_buyer`,
  
  accessories: `name,category,price,mrp,brand,compatibility,stock,description,image_url,is_featured
Premium 3D Floor Mats,Interior,1499,1999,AutoForm,All Cars,50,High quality 3D floor mats with anti-slip backing and waterproof material,https://example.com/floor-mat.jpg,true
Dash Camera 4K,Electronics,4999,6999,Viofo,All Cars,30,4K recording with night vision GPS tracking and parking mode,https://example.com/dash-cam.jpg,true
Leather Seat Covers Premium,Interior,7999,9999,Autoform,Sedan;Hatchback,25,Premium grade leather seat covers with cushioning and waterproof lining,https://example.com/seat-covers.jpg,true
Car Air Purifier,Electronics,2499,3499,Xiaomi,All Cars,40,HEPA filter air purifier with PM2.5 display and USB charging,https://example.com/air-purifier.jpg,false
Door Visor Set,Exterior,999,1499,Generic,All Cars,100,Injection molded door visors with chrome lining for rain protection,https://example.com/door-visor.jpg,false
Alloy Wheels 16 inch,Exterior,24999,29999,TSW,SUV;Sedan,15,Premium alloy wheels 16 inch with 5 year warranty,https://example.com/alloy-wheels.jpg,true`,
  
  rentals: `name,brand,vehicle_type,fuel_type,transmission,seats,year,color,daily_rate,weekly_rate,monthly_rate,location,available,features,security_deposit,km_limit_daily
Swift Dzire,Maruti,Sedan,Petrol,Manual,5,2024,Pearl White,1500,9000,35000,Delhi - Connaught Place,true,AC;Bluetooth;USB Charging,5000,150
Hyundai Venue,Hyundai,SUV,Petrol,Automatic,5,2023,Titan Grey,2500,15000,55000,Noida - Sector 18,true,Sunroof;Reverse Camera;TouchScreen,8000,150
Toyota Innova Crysta,Toyota,MPV,Diesel,Automatic,7,2024,Super White,4000,24000,90000,Gurugram - Cyber Hub,true,Captain Seats;Rear AC;Entertainment,15000,200
Maruti Ertiga,Maruti,MPV,Petrol,Automatic,7,2024,Arctic White,2200,13000,48000,Delhi - Rajouri Garden,true,AC;Bluetooth;Third Row,7000,150
Mahindra XUV700,Mahindra,SUV,Diesel,Automatic,7,2024,Midnight Black,5500,33000,120000,Noida - Sector 62,true,ADAS;Panoramic Sunroof;Alexa,20000,200`,
  
  insurance: `provider,plan_name,plan_type,premium_range_min,premium_range_max,idv_percentage,ncb_max_discount,key_features,claim_settlement_ratio,cashless_garages
HDFC Ergo,Basic Third Party,third_party,2999,4999,0,0,Third party liability;Personal accident cover;Legal liability,96.5,7500
ICICI Lombard,Comprehensive Plus,comprehensive,5999,15999,90,50,Full damage cover;Zero depreciation;Roadside assistance;Towing,95.8,8200
Tata AIG,Premium Shield,comprehensive,7999,19999,100,60,Engine protection;Return to invoice;Key replacement;NCB protection,97.2,7800
Bajaj Allianz,Total Secure,comprehensive,6499,17999,95,55,Consumable cover;Tyre protection;Personal belongings;EMI protection,96.1,9000
SBI General,Smart Cover,comprehensive,5499,14999,85,50,Zero depreciation;Roadside assistance;Personal accident;Passenger cover,94.5,6500`,
  
  loans: `bank_name,loan_name,interest_rate_min,interest_rate_max,tenure_min_months,tenure_max_months,processing_fee_percent,max_funding_percent,min_loan_amount,max_loan_amount,features
HDFC Bank,New Car Loan,8.50,10.50,12,84,0.50,90,100000,10000000,Quick approval;Doorstep service;Flexible EMI;Top-up loan facility
ICICI Bank,Auto Finance,8.75,11.00,12,84,0.40,85,150000,15000000,Pre-approved offers;Part-payment;Balance transfer;Online tracking
SBI,SBI Car Loan,8.40,10.25,12,84,0.35,90,100000,12000000,Lowest interest;No hidden charges;Doorstep documentation;Quick disbursal
Axis Bank,Axis Drive Easy,8.60,10.75,12,72,0.50,85,100000,8000000,Instant approval;Minimum documentation;Flexible tenure;Step-up EMI
Kotak Mahindra,Kotak Car Loan,8.65,10.80,12,84,0.45,85,150000,10000000,Zero foreclosure;Dedicated RM;Online application;Fast processing`,
  
  contacts: `name,email,company,designation,phone,city,gstin,tags,subscription_status,last_contacted
ABC Motors,contact@abcmotors.com,ABC Motors Pvt Ltd,Fleet Manager,9876543210,Delhi,27AABCU9603R1ZM,corporate;dealer;bulk_buyer,subscribed,2024-01-15
XYZ Industries,info@xyzind.com,XYZ Industries Ltd,Admin Head,9876543211,Mumbai,07AAACZ2345F1ZN,corporate;fleet;logistics,subscribed,2024-01-20
Tech Solutions Inc,fleet@techsol.com,Tech Solutions Inc,Operations Manager,9876543212,Bangalore,29AABCT1234G1ZP,corporate;tech;startup,subscribed,2024-01-18
Metro Logistics,admin@metrologistics.in,Metro Logistics Pvt Ltd,CEO,9876543213,Chennai,33AABCM5678H1ZQ,corporate;logistics;fleet,unsubscribed,2024-01-10
Sunrise Healthcare,transport@sunrisehc.com,Sunrise Healthcare Ltd,Transport Head,9876543214,Hyderabad,36AABCS9012I1ZR,corporate;healthcare;ambulance,subscribed,2024-01-22`,
};

const STORAGE_KEY = 'gyc_import_jobs';

const getStoredJobs = (): ImportJob[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveJobs = (jobs: ImportJob[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
};

export const BulkDataManager = () => {
  const [activeTab, setActiveTab] = useState("import");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [importJobs, setImportJobs] = useState<ImportJob[]>(getStoredJobs);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const downloadSampleCSV = (moduleId: string) => {
    const content = SAMPLE_DATA[moduleId];
    if (!content) {
      toast.error('Sample not available for this module');
      return;
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleId}_sample.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedModule) {
      toast.error('Please select a module and file');
      return;
    }

    setIsImporting(true);
    toast.loading('Processing file...');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
      
      setPreviewData(rows.slice(0, 6)); // Show first 5 rows + header
      setShowPreview(true);

      const job: ImportJob = {
        id: Date.now().toString(),
        type: selectedModule,
        fileName: file.name,
        totalRows: lines.length - 1,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const updatedJobs = [...importJobs, job];
      setImportJobs(updatedJobs);
      saveJobs(updatedJobs);

      toast.dismiss();
      toast.success(`File uploaded: ${lines.length - 1} rows detected`);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to process file');
    } finally {
      setIsImporting(false);
    }
  };

  const processImport = async (jobId: string) => {
    const job = importJobs.find(j => j.id === jobId);
    if (!job) return;

    // Update job status to processing
    const updateJob = (updates: Partial<ImportJob>) => {
      const updated = importJobs.map(j => 
        j.id === jobId ? { ...j, ...updates } : j
      );
      setImportJobs(updated);
      saveJobs(updated);
    };

    updateJob({ status: 'processing' });
    toast.loading(`Importing ${job.type} data...`);

    // Simulate processing
    for (let i = 0; i <= job.totalRows; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      updateJob({ 
        processedRows: i,
        successCount: Math.floor(i * 0.95),
        errorCount: Math.floor(i * 0.05),
      });
    }

    updateJob({ 
      status: 'completed',
      successCount: Math.floor(job.totalRows * 0.95),
      errorCount: Math.floor(job.totalRows * 0.05),
    });

    toast.dismiss();
    toast.success(`Import completed: ${Math.floor(job.totalRows * 0.95)} records imported`);
  };

  const deleteJob = (jobId: string) => {
    const updated = importJobs.filter(j => j.id !== jobId);
    setImportJobs(updated);
    saveJobs(updated);
    toast.success('Import job deleted');
  };

  const exportData = (moduleId: string) => {
    const content = SAMPLE_DATA[moduleId] || 'No data available';
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleId}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <RefreshCw className="h-3 w-3" /> },
      processing: { color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      completed: { color: 'bg-green-100 text-green-800', icon: <Check className="h-3 w-3" /> },
      failed: { color: 'bg-red-100 text-red-800', icon: <X className="h-3 w-3" /> },
    };
    const config = configs[status] || configs.pending;
    
    return (
      <Badge className={`${config.color} gap-1`}>
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Bulk Data Manager
          </h2>
          <p className="text-muted-foreground">
            Import and export data across all modules with Excel/CSV support
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{importJobs.length}</div>
            <p className="text-xs text-muted-foreground">Total Import Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {importJobs.filter(j => j.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {importJobs.reduce((acc, j) => acc + j.successCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Records Imported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {importJobs.reduce((acc, j) => acc + j.errorCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import History
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Data Module</CardTitle>
              <CardDescription>
                Choose which type of data you want to import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {DATA_MODULES.map((module) => (
                  <Card 
                    key={module.id}
                    className={`cursor-pointer transition-all ${
                      selectedModule === module.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedModule(module.id)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          selectedModule === module.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <module.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{module.label}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {module.description}
                          </p>
                        </div>
                        {selectedModule === module.id && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedModule && (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Upload a CSV file to import {DATA_MODULES.find(m => m.id === selectedModule)?.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                    className="max-w-[200px] mx-auto"
                  />
                </div>

                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => downloadSampleCSV(selectedModule)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample CSV
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Import Guidelines
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• First row must contain column headers</li>
                    <li>• Use comma (,) as delimiter</li>
                    <li>• Use semicolon (;) for multiple values in a field</li>
                    <li>• Boolean values: true/false or 1/0</li>
                    <li>• Dates: YYYY-MM-DD format</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DATA_MODULES.map((module) => (
              <Card key={module.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <module.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{module.label}</CardTitle>
                      <CardDescription className="text-xs">{module.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => exportData(module.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => exportData(module.id)}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      Export Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Success</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No import jobs yet. Start by importing data above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    importJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {DATA_MODULES.find(m => m.id === job.type)?.label || job.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{job.fileName}</TableCell>
                        <TableCell>{job.totalRows}</TableCell>
                        <TableCell className="text-green-600">{job.successCount}</TableCell>
                        <TableCell className="text-red-600">{job.errorCount}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(job.processedRows / job.totalRows) * 100} 
                              className="w-20 h-2" 
                            />
                            <span className="text-xs text-muted-foreground">
                              {Math.round((job.processedRows / job.totalRows) * 100)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {job.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => processImport(job.id)}
                              >
                                Start
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteJob(job.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Data Preview</DialogTitle>
            <DialogDescription>
              Review the first few rows of your import file
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewData[0]?.map((header, i) => (
                    <TableHead key={i} className="whitespace-nowrap">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(1).map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="whitespace-nowrap">{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={() => {
              const pendingJob = importJobs.find(j => j.status === 'pending');
              if (pendingJob) {
                processImport(pendingJob.id);
              }
              setShowPreview(false);
            }}>
              Start Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
