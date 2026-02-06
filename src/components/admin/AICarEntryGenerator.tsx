import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AICarChatAssistant } from "./AICarChatAssistant";

interface GeneratedCarData {
  brand: string;
  name: string;
  slug: string;
  body_type: string;
  tagline: string;
  overview: string;
  fuel_types: string[];
  transmission_types: string[];
  key_highlights: string[];
  variants: any[];
  colors: any[];
  specifications: any[];
  features: any[];
}

export const AICarEntryGenerator = () => {
  const [carName, setCarName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedCarData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleGenerate = async () => {
    if (!carName.trim()) {
      toast.error("Please enter a car name");
      return;
    }

    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-car-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          carName,
          saveToDatabase: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate car data");
      }

      const result = await response.json();
      setGeneratedData(result.data);
      setShowPreview(true);
      toast.success("Car data generated successfully! Review before saving.");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate car data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedData) return;

    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-car-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          carName,
          saveToDatabase: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save car data");
      }

      const result = await response.json();
      toast.success(`✅ ${result.data.name} added to database!`);
      setCarName("");
      setGeneratedData(null);
      setShowPreview(false);
      setShowConfirm(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save car data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          AI Car Entry Generator
        </h2>
        <p className="text-muted-foreground">
          Add cars using AI - choose Quick Add for instant generation or Chat for conversational input
        </p>
      </div>

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Quick Add
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <AICarChatAssistant />
        </TabsContent>

        <TabsContent value="quick" className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Car Data</CardTitle>
          <CardDescription>
            Type the car name and model (e.g., "Maruti Swift 2024", "Hyundai Creta 2025")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="carName">Car Name *</Label>
            <Input
              id="carName"
              placeholder="e.g., Maruti Swift 2024, Tata Nexon EV, BMW X5..."
              value={carName}
              onChange={(e) => setCarName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleGenerate();
              }}
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading || !carName.trim()}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating AI Data...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Complete Car Data
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            AI will generate: variants, colors, specs, and on-road pricing for Indian market
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Generated Data</DialogTitle>
            <DialogDescription>
              Review the AI-generated data before saving to database
            </DialogDescription>
          </DialogHeader>

          {generatedData && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Brand</p>
                    <p className="font-medium">{generatedData.brand}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Model</p>
                    <p className="font-medium">{generatedData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Body Type</p>
                    <p className="font-medium">{generatedData.body_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Slug</p>
                    <p className="font-medium text-sm">{generatedData.slug}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tagline</p>
                  <p className="text-sm italic">{generatedData.tagline}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overview</p>
                  <p className="text-sm">{generatedData.overview}</p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <h3 className="font-semibold">Key Highlights</h3>
                <div className="flex flex-wrap gap-2">
                  {generatedData.key_highlights.map((h, i) => (
                    <Badge key={i}>{h}</Badge>
                  ))}
                </div>
              </div>

              {/* Variants */}
              <div className="space-y-2">
                <h3 className="font-semibold">Variants ({generatedData.variants.length})</h3>
                <div className="space-y-2">
                  {generatedData.variants.map((v, i) => (
                    <div key={i} className="border rounded p-3 text-sm">
                      <p className="font-medium">{v.name}</p>
                      <p className="text-muted-foreground">₹{v.price} | {v.fuel_type} | {v.transmission}</p>
                      <p className="text-xs">On-Road: ₹{(v.ex_showroom + v.rto + v.insurance + v.registration).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <h3 className="font-semibold">Colors ({generatedData.colors.length})</h3>
                <div className="flex flex-wrap gap-3">
                  {generatedData.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: c.hex_code }}
                      />
                      <span className="text-sm">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specifications Summary */}
              <div className="space-y-2">
                <h3 className="font-semibold">Specifications ({generatedData.specifications.length})</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedData.specifications.length} specs across{" "}
                  {new Set(generatedData.specifications.map((s) => s.category)).size} categories
                </p>
              </div>

              {/* Features Summary */}
              <div className="space-y-2">
                <h3 className="font-semibold">Features ({generatedData.features.length})</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedData.features.filter((f) => f.is_standard).length} standard,{" "}
                  {generatedData.features.filter((f) => !f.is_standard).length} optional
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Go Back
            </Button>
            <Button
              onClick={() => {
                setShowPreview(false);
                setShowConfirm(true);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Save to Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Car to Database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new car entry with all generated variants, colors, specifications, and features.
              You can edit details later in the Unified Car Management module.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Car"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-semibold text-primary">How It Works</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Enter any car name (e.g., "Maruti Swift 2024")</li>
                <li>AI generates complete data: base, mid, and top variants with realistic pricing</li>
                <li>Includes colors with hex codes, detailed specs, and on-road price breakup</li>
                <li>Review the data in the preview dialog</li>
                <li>Save to database in one click - all data is created automatically</li>
                <li>Fine-tune details later using Unified Car Management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
