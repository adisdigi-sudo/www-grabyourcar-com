import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Search,
  Send,
  Bot,
  User,
  Copy,
  MapPin,
  UserCircle,
  Settings2,
  Percent,
  Calendar,
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
  address: string;
  founder: string;
  founderTitle: string;
  
  // Colors (HEX format)
  primaryColor: string;
  accentColor: string;
  
  // Partner Banks
  partnerBanks: string[];
  
  // Disclaimer & Terms
  disclaimer: string;
  termsAndConditions: string[];
  validityDays: number;
  
  // Footer CTA
  footerCTA: string;
  
  // Default EMI Settings
  defaultDownPaymentPercent: number;
  defaultInterestRate: number;
  defaultTenure: number;
  
  // AI Settings
  aiEnabled: boolean;
  aiTone: "professional" | "friendly" | "persuasive";
  aiPersonalization: boolean;
}

const defaultConfig: EMIPDFConfig = {
  companyName: "GRABYOURCAR",
  tagline: "India's Smarter Way to Buy New Cars",
  phone: "+91 98559 24442",
  email: "hello@grabyourcar.com",
  website: "www.grabyourcar.com",
  address: "MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana – 122001",
  founder: "Anshdeep Singh",
  founderTitle: "Founder & CEO",
  primaryColor: "#22c55e",
  accentColor: "#f59e0b",
  partnerBanks: ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "IDFC First", "Yes Bank", "Bank of Baroda"],
  disclaimer: "This is an indicative estimate. Actual EMI may vary based on bank policies, credit score, and prevailing interest rates.",
  termsAndConditions: [
    "Quote is valid for 7 days from generation date.",
    "Prices are subject to change based on manufacturer price revisions or government regulations.",
    "Actual EMI may vary based on bank policies, credit score, and prevailing interest rates.",
    "Processing fees and other bank charges may apply as per financing institution.",
  ],
  validityDays: 7,
  footerCTA: "Get the Best Car Loan - Lowest Interest Rates Guaranteed!",
  defaultDownPaymentPercent: 20,
  defaultInterestRate: 8.5,
  defaultTenure: 60,
  aiEnabled: true,
  aiTone: "professional",
  aiPersonalization: true,
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EMIPDFSettings = () => {
  const [config, setConfig] = useState<EMIPDFConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [newBank, setNewBank] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTerm, setNewTerm] = useState("");
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load settings from database
  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "emi_pdf_config")
        .single();

      if (data && !error) {
        const savedConfig = data.setting_value as unknown as Partial<EMIPDFConfig>;
        setConfig({ ...defaultConfig, ...savedConfig });
      }
    } catch (error) {
      console.log("No existing settings found, using defaults");
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("setting_key", "emi_pdf_config")
        .single();

      const settingValue = JSON.parse(JSON.stringify(config));

      if (existing) {
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

  const addTerm = () => {
    if (newTerm.trim() && !config.termsAndConditions.includes(newTerm.trim())) {
      setConfig(prev => ({
        ...prev,
        termsAndConditions: [...prev.termsAndConditions, newTerm.trim()]
      }));
      setNewTerm("");
    }
  };

  const removeTerm = (term: string) => {
    setConfig(prev => ({
      ...prev,
      termsAndConditions: prev.termsAndConditions.filter(t => t !== term)
    }));
  };

  const previewPDF = () => {
    const sampleData: EMIData = {
      loanAmount: 1500000,
      downPayment: 300000,
      loanPrincipal: 1200000,
      interestRate: config.defaultInterestRate,
      tenure: config.defaultTenure,
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
    
    generateEMIPdf(sampleData, config);
    toast.success("Sample PDF generated with current settings!");
  };

  // AI Chat functionality
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const systemPrompt = `You are an AI assistant for GrabYourCar EMI PDF settings. Help the admin:
      1. Generate professional taglines, disclaimers, and CTAs
      2. Suggest partner banks for car financing
      3. Write terms and conditions
      4. Provide content suggestions based on ${config.aiTone} tone
      
      Current settings:
      - Company: ${config.companyName}
      - Tagline: ${config.tagline}
      - Tone: ${config.aiTone}
      
      Keep responses concise and actionable. When suggesting content, provide ready-to-use text.`;

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/car-advisor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: chatInput }
          ],
          context: "emi_pdf_settings"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = { 
        role: "assistant", 
        content: data.response || data.message || "I can help you customize your EMI PDF settings. What would you like to modify?"
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = { 
        role: "assistant", 
        content: "I'm having trouble connecting. Here are some suggestions:\n\n• For taglines: \"Drive Your Dreams with Easy EMIs\"\n• For CTA: \"Get Personalized Loan Quotes in 60 Seconds!\"\n• For disclaimer: Include validity period and rate variation clauses."
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Search filter for settings
  const searchableFields = [
    { key: "companyName", label: "Company Name", value: config.companyName },
    { key: "tagline", label: "Tagline", value: config.tagline },
    { key: "phone", label: "Phone", value: config.phone },
    { key: "email", label: "Email", value: config.email },
    { key: "website", label: "Website", value: config.website },
    { key: "address", label: "Address", value: config.address },
    { key: "founder", label: "Founder", value: config.founder },
    { key: "disclaimer", label: "Disclaimer", value: config.disclaimer },
    { key: "footerCTA", label: "Footer CTA", value: config.footerCTA },
    ...config.partnerBanks.map(bank => ({ key: `bank_${bank}`, label: "Partner Bank", value: bank })),
  ];

  const filteredFields = searchQuery 
    ? searchableFields.filter(f => 
        f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            EMI PDF Customization
          </h2>
          <p className="text-muted-foreground">
            Customize the EMI estimate PDF branding, content, and AI-generated descriptions
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
            {searchQuery && filteredFields.length > 0 && (
              <Card className="absolute top-full mt-1 w-full z-50 max-h-60 overflow-auto">
                <CardContent className="p-2">
                  {filteredFields.map((field, idx) => (
                    <div 
                      key={idx}
                      className="p-2 hover:bg-muted rounded cursor-pointer text-sm"
                      onClick={() => {
                        setSearchQuery("");
                        toast.info(`Found in: ${field.label}`);
                      }}
                    >
                      <span className="font-medium">{field.label}:</span>
                      <span className="text-muted-foreground ml-2 truncate">
                        {field.value.substring(0, 40)}...
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
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
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="defaults">
            <Settings2 className="h-4 w-4 mr-2" />
            Defaults
          </TabsTrigger>
          <TabsTrigger value="banks">
            <Building2 className="h-4 w-4 mr-2" />
            Banks
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageCircle className="h-4 w-4 mr-2" />
            AI Chat
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Address
                  </Label>
                  <Input
                    value={config.address}
                    onChange={(e) => setConfig(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" /> Founder Name
                    </Label>
                    <Input
                      value={config.founder}
                      onChange={(e) => setConfig(prev => ({ ...prev, founder: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Founder Title</Label>
                    <Input
                      value={config.founderTitle}
                      onChange={(e) => setConfig(prev => ({ ...prev, founderTitle: e.target.value }))}
                    />
                  </div>
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
                      className="w-12 h-12 rounded-lg shadow-md flex items-center justify-center text-white font-bold text-xs" 
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      Primary
                    </div>
                    <div 
                      className="w-12 h-12 rounded-lg shadow-md flex items-center justify-center text-white font-bold text-xs" 
                      style={{ backgroundColor: config.accentColor }}
                    >
                      Accent
                    </div>
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
                  Customize disclaimer, terms, footer CTA, and other text content
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

                <Separator />

                {/* Terms & Conditions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Terms & Conditions</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Validity:</Label>
                      <Input
                        type="number"
                        value={config.validityDays}
                        onChange={(e) => setConfig(prev => ({ ...prev, validityDays: parseInt(e.target.value) || 7 }))}
                        className="w-16 h-8"
                        min={1}
                        max={30}
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      placeholder="Add a term or condition..."
                      onKeyDown={(e) => e.key === "Enter" && addTerm()}
                    />
                    <Button onClick={addTerm} size="sm">Add</Button>
                  </div>
                  <div className="space-y-2">
                    {config.termsAndConditions.map((term, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg group">
                        <span className="text-xs font-bold text-primary mt-0.5">{idx + 1}.</span>
                        <span className="text-sm flex-1">{term}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                          onClick={() => removeTerm(term)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
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

        {/* Default EMI Settings Tab */}
        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Default EMI Calculator Settings
              </CardTitle>
              <CardDescription>
                Set default values for EMI calculator when users open the quote modal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    Default Down Payment %
                  </Label>
                  <Input
                    type="number"
                    value={config.defaultDownPaymentPercent}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      defaultDownPaymentPercent: Math.min(90, Math.max(0, parseInt(e.target.value) || 0))
                    }))}
                    min={0}
                    max={90}
                  />
                  <p className="text-xs text-muted-foreground">Range: 0% to 90%</p>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-accent" />
                    Default Interest Rate (p.a.)
                  </Label>
                  <Input
                    type="number"
                    value={config.defaultInterestRate}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      defaultInterestRate: Math.min(30, Math.max(0, parseFloat(e.target.value) || 0))
                    }))}
                    step={0.1}
                    min={0}
                    max={30}
                  />
                  <p className="text-xs text-muted-foreground">Range: 0% to 30%</p>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Default Tenure (months)
                  </Label>
                  <Input
                    type="number"
                    value={config.defaultTenure}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      defaultTenure: Math.min(120, Math.max(12, parseInt(e.target.value) || 12))
                    }))}
                    min={12}
                    max={120}
                    step={12}
                  />
                  <p className="text-xs text-muted-foreground">Range: 12 to 120 months</p>
                </div>
              </div>

              <Separator />

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Preview Calculation</h4>
                <p className="text-sm text-muted-foreground">
                  For a ₹15,00,000 car with current defaults:
                </p>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Down Payment</p>
                    <p className="font-bold">₹{(1500000 * config.defaultDownPaymentPercent / 100).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Loan Amount</p>
                    <p className="font-bold">₹{(1500000 * (100 - config.defaultDownPaymentPercent) / 100).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Interest Rate</p>
                    <p className="font-bold">{config.defaultInterestRate}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tenure</p>
                    <p className="font-bold">{config.defaultTenure} months</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                          <div className="flex gap-2 flex-wrap">
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

        {/* AI Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI Content Assistant Chat
              </CardTitle>
              <CardDescription>
                Chat with AI to generate custom content, get suggestions, and modify settings
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 pr-4" ref={chatScrollRef}>
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Start a conversation</p>
                      <p className="text-sm mt-1">Ask me to generate taglines, disclaimers, or suggest content improvements.</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {[
                          "Generate a catchy tagline",
                          "Write a professional disclaimer",
                          "Suggest partner banks",
                          "Create a compelling CTA"
                        ].map((prompt) => (
                          <Button
                            key={prompt}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setChatInput(prompt);
                            }}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      } rounded-lg p-3`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === "assistant" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-6 text-xs"
                            onClick={() => copyToClipboard(msg.content)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isChatLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask AI for content suggestions..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                  disabled={isChatLoading}
                />
                <Button onClick={sendChatMessage} disabled={isChatLoading || !chatInput.trim()}>
                  {isChatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EMIPDFSettings;
