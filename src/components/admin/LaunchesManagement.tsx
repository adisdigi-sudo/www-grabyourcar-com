import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus, Edit, Trash2, Upload, Download, RefreshCw, Car, Rocket,
  Sparkles, Image, FileText, Search, Eye, Check, X, Wand2,
  Calendar, IndianRupee, Tag, Star, AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UpcomingCar {
  id: string;
  name: string;
  brand: string;
  expected_price: string | null;
  launch_date: string | null;
  segment: string | null;
  highlights: string[] | null;
  image_url: string | null;
  image_description: string | null;
  is_featured: boolean | null;
  status: string;
  fetched_at: string;
  expires_at: string | null;
  created_at: string;
}

const BRANDS = [
  "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Kia", "Toyota", 
  "Honda", "MG", "Skoda", "Volkswagen", "BMW", "Mercedes-Benz", 
  "Audi", "Jeep", "Citroen", "BYD", "Lexus", "Volvo", "Other"
];

const SEGMENTS = [
  "Hatchback", "Sedan", "Compact SUV", "SUV", "Premium SUV", 
  "MUV", "MPV", "Coupe", "Sports", "Electric", "Hybrid"
];

const SAMPLE_CSV = `name,brand,expected_price,launch_date,segment,highlights,image_url,is_featured,status
Maruti Swift 2025,Maruti Suzuki,₹7-10 Lakh,Q1 2025,Hatchback,"New design|Better mileage|Updated features",,true,upcoming
Hyundai Creta EV,Hyundai,₹18-22 Lakh,Q2 2025,Electric,"450km range|Fast charging|Premium interiors",,true,upcoming
Tata Curvv Petrol,Tata,₹10-15 Lakh,March 2025,Compact SUV,"Coupe SUV|1.2L Turbo|Connected features",,false,launched
Mahindra XUV.e8,Mahindra,₹25-30 Lakh,Q2 2025,Electric,"Born Electric|500km range|Premium SUV",,true,upcoming
Kia Syros,Kia,₹10-15 Lakh,February 2025,Compact SUV,"New design language|ADAS features|Sunroof",,true,upcoming`;

export const LaunchesManagement = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkPreviewOpen, setIsBulkPreviewOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
  const [selectedCar, setSelectedCar] = useState<UpcomingCar | null>(null);
  const [bulkData, setBulkData] = useState<Partial<UpcomingCar>[]>([]);
  
  const [formData, setFormData] = useState<Partial<UpcomingCar>>({
    name: "",
    brand: "",
    expected_price: "",
    launch_date: "",
    segment: "",
    highlights: [],
    image_url: "",
    image_description: "",
    is_featured: false,
    status: "upcoming",
  });
  
  const [highlightsInput, setHighlightsInput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  // Fetch all cars
  const { data: cars = [], isLoading, refetch } = useQuery({
    queryKey: ["adminUpcomingCars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_upcoming_cars_cache")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UpcomingCar[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (car: Partial<UpcomingCar>) => {
      const { error } = await supabase.from("ai_upcoming_cars_cache").insert({
        name: car.name,
        brand: car.brand,
        expected_price: car.expected_price || null,
        launch_date: car.launch_date || null,
        segment: car.segment || null,
        highlights: car.highlights || null,
        image_url: car.image_url || null,
        image_description: car.image_description || null,
        is_featured: car.is_featured || false,
        status: car.status || "upcoming",
        fetched_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUpcomingCars"] });
      toast.success("Car added successfully");
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to add car");
      console.error(error);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UpcomingCar> }) => {
      const { error } = await supabase
        .from("ai_upcoming_cars_cache")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUpcomingCars"] });
      toast.success("Car updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCar(null);
    },
    onError: (error) => {
      toast.error("Failed to update car");
      console.error(error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_upcoming_cars_cache").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUpcomingCars"] });
      toast.success("Car deleted");
      setIsDeleteDialogOpen(false);
      setSelectedCar(null);
    },
    onError: (error) => {
      toast.error("Failed to delete car");
      console.error(error);
    },
  });

  // Bulk insert mutation
  const bulkInsertMutation = useMutation({
    mutationFn: async (cars: Partial<UpcomingCar>[]) => {
      const toInsert = cars.map((car) => ({
        name: car.name,
        brand: car.brand,
        expected_price: car.expected_price || null,
        launch_date: car.launch_date || null,
        segment: car.segment || null,
        highlights: car.highlights || null,
        image_url: car.image_url || null,
        image_description: car.image_description || null,
        is_featured: car.is_featured || false,
        status: car.status || "upcoming",
        fetched_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("ai_upcoming_cars_cache").insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUpcomingCars"] });
      toast.success(`${bulkData.length} cars imported successfully`);
      setIsBulkPreviewOpen(false);
      setBulkData([]);
    },
    onError: (error) => {
      toast.error("Failed to import cars");
      console.error(error);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      brand: "",
      expected_price: "",
      launch_date: "",
      segment: "",
      highlights: [],
      image_url: "",
      image_description: "",
      is_featured: false,
      status: "upcoming",
    });
    setHighlightsInput("");
  };

  const handleEdit = (car: UpcomingCar) => {
    setSelectedCar(car);
    setFormData({
      name: car.name,
      brand: car.brand,
      expected_price: car.expected_price || "",
      launch_date: car.launch_date || "",
      segment: car.segment || "",
      highlights: car.highlights || [],
      image_url: car.image_url || "",
      image_description: car.image_description || "",
      is_featured: car.is_featured || false,
      status: car.status,
    });
    setHighlightsInput(car.highlights?.join(", ") || "");
    setIsEditDialogOpen(true);
  };

  const handleDelete = (car: UpcomingCar) => {
    setSelectedCar(car);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveCreate = () => {
    const highlights = highlightsInput.split(",").map((h) => h.trim()).filter(Boolean);
    createMutation.mutate({ ...formData, highlights });
  };

  const handleSaveEdit = () => {
    if (!selectedCar) return;
    const highlights = highlightsInput.split(",").map((h) => h.trim()).filter(Boolean);
    updateMutation.mutate({
      id: selectedCar.id,
      updates: { ...formData, highlights },
    });
  };

  // CSV parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const parsed: Partial<UpcomingCar>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const car: Partial<UpcomingCar> = {};

        headers.forEach((header, idx) => {
          const value = values[idx];
          if (header === "name") car.name = value;
          else if (header === "brand") car.brand = value;
          else if (header === "expected_price") car.expected_price = value;
          else if (header === "launch_date") car.launch_date = value;
          else if (header === "segment") car.segment = value;
          else if (header === "highlights") car.highlights = value.split("|").map((h) => h.trim()).filter(Boolean);
          else if (header === "image_url") car.image_url = value;
          else if (header === "is_featured") car.is_featured = value.toLowerCase() === "true";
          else if (header === "status") car.status = value || "upcoming";
        });

        if (car.name && car.brand) {
          parsed.push(car);
        }
      }

      if (parsed.length > 0) {
        setBulkData(parsed);
        setIsBulkPreviewOpen(true);
      } else {
        toast.error("No valid data found in CSV");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "launches_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // AI Generation
  const generateWithAI = async (type: "text" | "image") => {
    if (!formData.name || !formData.brand) {
      toast.error("Please enter car name and brand first");
      return;
    }

    setIsAIGenerating(true);
    try {
      const carContext = `${formData.brand} ${formData.name}`;
      
      if (type === "text") {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are an automotive expert. Generate concise, accurate information for Indian car buyers."
              },
              {
                role: "user",
                content: `Generate details for the upcoming ${carContext} car in India:
1. Expected price range in INR (e.g., "₹12-15 Lakh")
2. Expected launch date (e.g., "Q2 2025" or "March 2025")
3. Segment (Hatchback/Sedan/Compact SUV/SUV/Premium SUV/MUV/Electric)
4. 5 key highlights (short phrases, each under 8 words)
5. A brief image description for AI generation

Respond in JSON format:
{
  "expected_price": "₹XX-XX Lakh",
  "launch_date": "Q2 2025",
  "segment": "SUV",
  "highlights": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
  "image_description": "A modern red SUV..."
}`
              }
            ],
            temperature: 0.7,
          }),
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setFormData((prev) => ({
            ...prev,
            expected_price: parsed.expected_price || prev.expected_price,
            launch_date: parsed.launch_date || prev.launch_date,
            segment: parsed.segment || prev.segment,
            highlights: parsed.highlights || prev.highlights,
            image_description: parsed.image_description || prev.image_description,
          }));
          setHighlightsInput(parsed.highlights?.join(", ") || "");
          toast.success("AI content generated!");
        }
      } else if (type === "image") {
        const imagePrompt = formData.image_description || 
          `Professional studio photo of ${carContext}, modern ${formData.segment || "car"}, India, sleek design, high resolution, automotive photography`;
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (imageUrl) {
          setFormData((prev) => ({ ...prev, image_url: imageUrl }));
          toast.success("AI image generated!");
        } else {
          toast.error("Failed to generate image");
        }
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error("AI generation failed");
    } finally {
      setIsAIGenerating(false);
    }
  };

  // Filter cars
  const filteredCars = cars.filter((car) => {
    const matchesSearch = 
      car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || car.status === statusFilter;
    const matchesBrand = brandFilter === "all" || car.brand === brandFilter;
    return matchesSearch && matchesStatus && matchesBrand;
  });

  const stats = {
    total: cars.length,
    upcoming: cars.filter((c) => c.status === "upcoming").length,
    launched: cars.filter((c) => c.status === "launched").length,
    featured: cars.filter((c) => c.is_featured).length,
  };

  const CarForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Car Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Creta EV"
          />
        </div>
        <div className="space-y-2">
          <Label>Brand *</Label>
          <Select value={formData.brand} onValueChange={(v) => setFormData({ ...formData, brand: v })}>
            <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
            <SelectContent>
              {BRANDS.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Expected Price</Label>
          <Input
            value={formData.expected_price || ""}
            onChange={(e) => setFormData({ ...formData, expected_price: e.target.value })}
            placeholder="₹10-15 Lakh"
          />
        </div>
        <div className="space-y-2">
          <Label>Launch Date</Label>
          <Input
            value={formData.launch_date || ""}
            onChange={(e) => setFormData({ ...formData, launch_date: e.target.value })}
            placeholder="Q2 2025"
          />
        </div>
        <div className="space-y-2">
          <Label>Segment</Label>
          <Select value={formData.segment || ""} onValueChange={(v) => setFormData({ ...formData, segment: v })}>
            <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
            <SelectContent>
              {SEGMENTS.map((seg) => (
                <SelectItem key={seg} value={seg}>{seg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Key Highlights (comma separated)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => generateWithAI("text")}
            disabled={isAIGenerating}
          >
            <Wand2 className={`h-4 w-4 mr-1 ${isAIGenerating ? "animate-spin" : ""}`} />
            AI Generate
          </Button>
        </div>
        <Textarea
          value={highlightsInput}
          onChange={(e) => setHighlightsInput(e.target.value)}
          placeholder="Modern design, Electric powertrain, 500km range, ADAS, Fast charging"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Image URL</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => generateWithAI("image")}
            disabled={isAIGenerating}
          >
            <Image className={`h-4 w-4 mr-1 ${isAIGenerating ? "animate-spin" : ""}`} />
            AI Generate Image
          </Button>
        </div>
        <Input
          value={formData.image_url || ""}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          placeholder="https://example.com/car-image.jpg"
        />
        {formData.image_url && (
          <div className="mt-2 rounded-lg overflow-hidden border h-32 w-48">
            <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Image Description (for AI)</Label>
        <Textarea
          value={formData.image_description || ""}
          onChange={(e) => setFormData({ ...formData, image_description: e.target.value })}
          placeholder="Professional photo of a modern red SUV..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="launched">Launched</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-7">
          <Switch
            checked={formData.is_featured || false}
            onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
          />
          <Label>Featured</Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Launches Management
          </h2>
          <p className="text-muted-foreground">Manage new launches and upcoming cars</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={downloadSampleCSV}>
            <Download className="h-4 w-4 mr-2" />
            Sample CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Car
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cars</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Launched</p>
                <p className="text-2xl font-bold">{stats.launched}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold">{stats.featured}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or brand..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="launched">Launched</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {BRANDS.map((brand) => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Cars ({filteredCars.length})</CardTitle>
          <CardDescription>Manage upcoming launches and new car entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCars.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No cars found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Launch</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {car.image_url && (
                          <img src={car.image_url} alt={car.name} className="w-12 h-8 object-cover rounded" />
                        )}
                        <span className="font-medium">{car.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{car.brand}</TableCell>
                    <TableCell className="text-primary font-medium">{car.expected_price || "-"}</TableCell>
                    <TableCell>{car.launch_date || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{car.segment || "-"}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={car.status === "launched" ? "default" : car.status === "upcoming" ? "secondary" : "destructive"}>
                        {car.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {car.is_featured ? (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <Star className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(car)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(car)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Add New Car
            </DialogTitle>
            <DialogDescription>Add a new upcoming or recently launched car</DialogDescription>
          </DialogHeader>
          <CarForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCreate} disabled={!formData.name || !formData.brand || createMutation.isPending}>
              Add Car
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Car
            </DialogTitle>
            <DialogDescription>Update car details</DialogDescription>
          </DialogHeader>
          <CarForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!formData.name || !formData.brand || updateMutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Car
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCar?.brand} {selectedCar?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCar && deleteMutation.mutate(selectedCar.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Preview Dialog */}
      <Dialog open={isBulkPreviewOpen} onOpenChange={setIsBulkPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Import Preview
            </DialogTitle>
            <DialogDescription>Review {bulkData.length} cars before importing</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Launch</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkData.map((car, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{car.name}</TableCell>
                    <TableCell>{car.brand}</TableCell>
                    <TableCell>{car.expected_price || "-"}</TableCell>
                    <TableCell>{car.launch_date || "-"}</TableCell>
                    <TableCell>{car.segment || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{car.status || "upcoming"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsBulkPreviewOpen(false); setBulkData([]); }}>
              Cancel
            </Button>
            <Button onClick={() => bulkInsertMutation.mutate(bulkData)} disabled={bulkInsertMutation.isPending}>
              {bulkInsertMutation.isPending ? "Importing..." : `Import ${bulkData.length} Cars`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
