import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  Palette,
  Building2,
  Sparkles,
  Save,
  RefreshCw,
  Eye,
  MessageCircle,
  Phone,
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateEMIPdf, EMIData, OnRoadPriceBreakup } from "@/lib/generateEMIPdf";

interface EMIPDFConfig {
  // Branding
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  
  // Colors (HSL format)
  primaryColor: string;
  accentColor: string;
  
  // Partner Banks
  partnerBanks: string[];
  
  // Disclaimer
  disclaimer: string;
  
  // Footer CTA
  footerCTA: string;
  
  // AI Settings
  aiEnabled: boolean;
  aiTone: "professional" | "friendly" | "persuasive";
  aiPersonalization: boolean;
}

const defaultConfig: EMIPDFConfig = {
  companyName: "GRABYOURCAR",
  tagline: "India's Smarter Way to Buy New Cars",
  phone: "+91 98559 24442",
  email: "finance@grabyourcar.com",
  website: "www.grabyourcar.com",
  primaryColor: "#22c55e",
  accentColor: "#f59e0b",
  partnerBanks: ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank", "Bank of Baroda"],
  disclaimer: "This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing interest rates. Processing fee, pre-payment charges may apply. Contact us for a personalized loan quote.",
  footerCTA: "Get the Best Car Loan - Lowest Interest Rates Guaranteed!",
  aiEnabled: true,
  aiTone: "professional",
  aiPersonalization: true,
};

const EMIPDFSettings = () => {
  const [config, setConfig] = useState<EMIPDFConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [newBank, setNewBank] = useState("");

  // Load settings from database
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "emi_pdf_config")
        .single();

      if (data && !error) {
        const savedConfig = data.setting_value as unknown as EMIPDFConfig;
        setConfig({ ...defaultConfig, ...savedConfig });
      }
    } catch (error) {
      console.log("No existing settings found, using defaults");
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // First check if setting exists
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("setting_key", "emi_pdf_config")
        .single();

      const settingValue = JSON.parse(JSON.stringify(config));

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("admin_settings")
          .update({
            setting_value: settingValue,
            description: "EMI PDF generation configuration",
            updated_at: new Date().toISOString(),
          })
          .eq("setting_key", "emi_pdf_config");

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("admin_settings")
          .insert([{
            setting_key: "emi_pdf_config",
            setting_value: settingValue,
            description: "EMI PDF generation configuration",
          }]);

        if (error) throw error;
      }
      
      toast.success("EMI PDF settings saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const generateAISuggestion = async (field: "tagline" | "disclaimer" | "footerCTA") => {
    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-emi-content", {
        body: { field, tone: config.aiTone, companyName: config.companyName }
      });

      if (error) throw error;

      if (data?.content) {
        setAiSuggestion(data.content);
        toast.success("AI suggestion generated!");
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error("Failed to generate AI content. Try again.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const applyAISuggestion = (field: keyof EMIPDFConfig) => {
    if (aiSuggestion) {
      setConfig(prev => ({ ...prev, [field]: aiSuggestion }));
      setAiSuggestion("");
      toast.success("AI suggestion applied!");
    }
  };

  const addBank = () => {
    if (newBank.trim() && !config.partnerBanks.includes(newBank.trim())) {
      setConfig(prev => ({
        ...prev,
        partnerBanks: [...prev.partnerBanks, newBank.trim()]
      }));
      setNewBank("");
    }
  };

  const removeBank = (bank: string) => {
    setConfig(prev => ({
      ...prev,
      partnerBanks: prev.partnerBanks.filter(b => b !== bank)
    }));
  };

  const previewPDF = () => {
    // Generate sample PDF with current settings
    const sampleData: EMIData = {
      loanAmount: 1500000,
      downPayment: 300000,
      loanPrincipal: 1200000,
      interestRate: 8.5,
      tenure: 60,
      emi: 24536,
      totalPayment: 1472160,
      totalInterest: 272160,
      carName: "Sample Car Model",
      variantName: "Top Variant",
      selectedColor: "Pearl White",
      selectedCity: "Delhi NCR",
      onRoadPrice: {
        exShowroom: 1350000,
        rto: 108000,
        insurance: 45000,
        tcs: 13500,
        fastag: 500,
        registration: 3000,
        handling: 5000,
        onRoadPrice: 1525000,
      }
    };
    
    generateEMIPdf(sampleData);
    toast.success("Sample PDF generated with current settings!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            EMI PDF Customization
          </h2>
          <p className="text-muted-foreground">
            Customize the EMI estimate PDF branding, content, and AI-generated descriptions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={previewPDF}>
            <Eye className="h-4 w-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="banks">
            <Building2 className="h-4 w-4 mr-2" />
            Partner Banks
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Information</CardTitle>
                <CardDescription>
                  Displayed on the PDF header and footer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={config.companyName}
                    onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="GRABYOURCAR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={config.tagline}
                    onChange={(e) => setConfig(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="India's Smarter Way to Buy New Cars"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Phone
                    </Label>
                    <Input
                      value={config.phone}
                      onChange={(e) => setConfig(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" /> Email
                    </Label>
                    <Input
                      value={config.email}
                      onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Website
                  </Label>
                  <Input
                    value={config.website}
                    onChange={(e) => setConfig(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Brand Colors</CardTitle>
                <CardDescription>
                  Customize the PDF color scheme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Color (Header, CTA)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.primaryColor}
                      onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                      placeholder="#22c55e"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color (Interest, Highlights)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.accentColor}
                      onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={config.accentColor}
                      onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                      placeholder="#f59e0b"
                    />
                  </div>
                </div>
                <Separator />
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">Preview</p>
                  <div className="flex gap-2">
                    <div 
                      className="w-12 h-12 rounded-lg shadow-md" 
                      style={{ backgroundColor: config.primaryColor }}
                    />
                    <div 
                      className="w-12 h-12 rounded-lg shadow-md" 
                      style={{ backgroundColor: config.accentColor }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PDF Content</CardTitle>
                <CardDescription>
                  Customize disclaimer, footer CTA, and other text content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Disclaimer Text</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => generateAISuggestion("disclaimer")}
                      disabled={isGeneratingAI || !config.aiEnabled}
                    >
                      {isGeneratingAI ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      Generate with AI
                    </Button>
                  </div>
                  <Textarea
                    value={config.disclaimer}
                    onChange={(e) => setConfig(prev => ({ ...prev, disclaimer: e.target.value }))}
                    rows={3}
                    placeholder="Enter disclaimer text..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Footer Call-to-Action</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => generateAISuggestion("footerCTA")}
                      disabled={isGeneratingAI || !config.aiEnabled}
                    >
                      {isGeneratingAI ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      Generate with AI
                    </Button>
                  </div>
                  <Input
                    value={config.footerCTA}
                    onChange={(e) => setConfig(prev => ({ ...prev, footerCTA: e.target.value }))}
                    placeholder="Get the Best Car Loan - Lowest Interest Rates Guaranteed!"
                  />
                </div>

                {/* AI Suggestion Preview */}
                {aiSuggestion && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">AI Suggestion:</p>
                          <p className="text-sm text-muted-foreground">{aiSuggestion}</p>
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => applyAISuggestion("disclaimer")}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Apply to Disclaimer
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => applyAISuggestion("footerCTA")}
                            >
                              Apply to Footer CTA
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setAiSuggestion("")}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Partner Banks Tab */}
        <TabsContent value="banks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Partner Banks
              </CardTitle>
              <CardDescription>
                Banks displayed on the EMI estimate PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newBank}
                  onChange={(e) => setNewBank(e.target.value)}
                  placeholder="Add a bank name..."
                  onKeyDown={(e) => e.key === "Enter" && addBank()}
                />
                <Button onClick={addBank}>Add Bank</Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {config.partnerBanks.map((bank) => (
                  <Badge 
                    key={bank} 
                    variant="secondary"
                    className="px-3 py-1.5 text-sm cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={() => removeBank(bank)}
                  >
                    {bank}
                    <span className="ml-2">×</span>
                  </Badge>
                ))}
              </div>
              
              {config.partnerBanks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No partner banks added. Add banks to display on the PDF.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Content Assistant
              </CardTitle>
              <CardDescription>
                Use AI to generate personalized content for your EMI PDFs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div>
                  <Label className="text-base">Enable AI Assistance</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate taglines, disclaimers, and CTAs using AI
                  </p>
                </div>
                <Switch
                  checked={config.aiEnabled}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aiEnabled: checked }))}
                />
              </div>

              {config.aiEnabled && (
                <>
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label>AI Tone</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["professional", "friendly", "persuasive"] as const).map((tone) => (
                        <Button
                          key={tone}
                          variant={config.aiTone === tone ? "default" : "outline"}
                          onClick={() => setConfig(prev => ({ ...prev, aiTone: tone }))}
                          className="capitalize"
                        >
                          {tone}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {config.aiTone === "professional" && "Formal, trustworthy language suitable for financial documents"}
                      {config.aiTone === "friendly" && "Warm, approachable language that builds customer rapport"}
                      {config.aiTone === "persuasive" && "Compelling, action-oriented language to drive conversions"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <Label>Personalization</Label>
                      <p className="text-sm text-muted-foreground">
                        Include car name and customer details in AI suggestions
                      </p>
                    </div>
                    <Switch
                      checked={config.aiPersonalization}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aiPersonalization: checked }))}
                    />
                  </div>

                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-6 w-6 text-primary shrink-0" />
                        <div>
                          <p className="font-medium">Quick Generate</p>
                          <p className="text-sm text-muted-foreground mb-3">
                            Generate all content with one click
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => generateAISuggestion("tagline")}
                              disabled={isGeneratingAI}
                            >
                              {isGeneratingAI ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
                              Generate Tagline
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => generateAISuggestion("disclaimer")}
                              disabled={isGeneratingAI}
                            >
                              Generate Disclaimer
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => generateAISuggestion("footerCTA")}
                              disabled={isGeneratingAI}
                            >
                              Generate CTA
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EMIPDFSettings;
