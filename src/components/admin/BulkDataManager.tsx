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
  { id: 'leads', label: 'Leads', icon: Users, description: 'Import customer leads and inquiries' },
  { id: 'accessories', label: 'Accessories', icon: Package, description: 'Import car accessories inventory' },
  { id: 'rentals', label: 'Self-Drive Vehicles', icon: Calendar, description: 'Import rental fleet vehicles' },
  { id: 'insurance', label: 'Insurance Plans', icon: Shield, description: 'Import insurance plan data' },
  { id: 'loans', label: 'Loan Offers', icon: CreditCard, description: 'Import bank loan offerings' },
  { id: 'contacts', label: 'Email Contacts', icon: FileText, description: 'Import email marketing contacts' },
];

const SAMPLE_DATA: Record<string, string> = {
  cars: `brand,name,slug,price_range,body_type,fuel_types,transmission_types,is_bestseller,is_new
Maruti,Swift,maruti-swift,6.49 - 9.59 Lakh,Hatchback,Petrol;CNG,Manual;AMT,true,false
Maruti,Brezza,maruti-brezza,8.29 - 14.14 Lakh,SUV,Petrol;CNG,Manual;Automatic,true,true
Hyundai,Creta,hyundai-creta,11.00 - 20.15 Lakh,SUV,Petrol;Diesel,Manual;Automatic,true,false
Tata,Nexon,tata-nexon,8.10 - 15.50 Lakh,SUV,Petrol;Diesel;Electric,Manual;AMT,true,false`,
  
  leads: `customer_name,phone,email,city,car_brand,car_model,source,lead_type,notes
Rahul Sharma,9876543210,rahul@email.com,Delhi,Maruti,Swift,website,car_inquiry,Interested in petrol variant
Priya Patel,9876543211,priya@email.com,Mumbai,Hyundai,Creta,whatsapp,test_drive,Wants test drive this weekend
Amit Kumar,9876543212,amit@email.com,Bangalore,Tata,Nexon,referral,finance,Looking for loan options`,
  
  accessories: `id,name,category,price,mrp,brand,compatibility,stock,image_url
1,Premium Floor Mats,Interior,1499,1999,Generic,All Cars,50,https://example.com/mat.jpg
2,Car Dash Camera,Electronics,3499,4999,Viofo,All Cars,30,https://example.com/cam.jpg
3,Seat Covers Premium,Interior,4999,6999,Autoform,Sedan;Hatchback,25,https://example.com/seat.jpg`,
  
  rentals: `name,brand,vehicle_type,fuel_type,transmission,seats,year,color,rent,location,available
Swift Dzire,Maruti,Sedan,Petrol,Manual,5,2024,White,1500,Delhi - Connaught Place,true
Hyundai Venue,Hyundai,SUV,Petrol,Automatic,5,2023,Grey,2500,Noida - Sector 18,true
Toyota Innova,Toyota,MPV,Diesel,Automatic,7,2024,White,4000,Gurugram - Cyber Hub,true`,
  
  insurance: `provider,plan_name,plan_type,premium_min,premium_max,idv_percentage,ncb_discount,features
HDFC Ergo,Basic Cover,third_party,2999,4999,0,0,Third party liability;Personal accident cover
ICICI Lombard,Comprehensive,comprehensive,5999,15999,90,50,Full damage cover;Zero depreciation;Roadside assistance
Tata AIG,Premium Plus,comprehensive,7999,19999,100,60,Engine protection;Return to invoice;Key replacement`,
  
  loans: `bank,loan_name,interest_rate_min,interest_rate_max,tenure_min,tenure_max,processing_fee,max_funding
HDFC Bank,New Car Loan,8.50,10.50,12,84,0.50,90
ICICI Bank,Auto Loan,8.75,11.00,12,84,0.40,85
SBI,SBI Car Loan,8.40,10.25,12,84,0.35,90
Axis Bank,Axis Drive Easy,8.60,10.75,12,72,0.50,85`,
  
  contacts: `name,email,company,gstin,phone,tags
ABC Motors,contact@abcmotors.com,ABC Motors Pvt Ltd,27AABCU9603R1ZM,9876543210,corporate;dealer
XYZ Industries,info@xyzind.com,XYZ Industries Ltd,07AAACZ2345F1ZN,9876543211,corporate;fleet`,
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
