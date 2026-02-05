import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Sparkles, 
  Image, 
  FileText, 
  Wand2, 
  Download, 
  Copy, 
  RefreshCw, 
  Settings,
  Palette,
  Type,
  Layout,
  Target,
  Globe,
  Search,
  Check,
  Eye,
  Trash2
} from "lucide-react";

interface GeneratedImage {
  id: string;
  prompt: string;
  category: string;
  url: string;
  createdAt: string;
}

interface GeneratedContent {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
}

const IMAGE_CATEGORIES = [
  { id: 'hero', label: 'Hero Banners', description: 'Main homepage hero images' },
  { id: 'promo', label: 'Promo Banners', description: 'Promotional and offer banners' },
  { id: 'car', label: 'Car Images', description: 'Vehicle showcase images' },
  { id: 'testimonial', label: 'Testimonials', description: 'Customer testimonial backgrounds' },
  { id: 'cta', label: 'Call-to-Action', description: 'CTA section backgrounds' },
  { id: 'featured', label: 'Featured Cars', description: 'Featured vehicle cards' },
  { id: 'social', label: 'Social Media', description: 'Social media post images' },
];

const CONTENT_TYPES = [
  { id: 'meta_title', label: 'Meta Title', maxLength: 60 },
  { id: 'meta_description', label: 'Meta Description', maxLength: 160 },
  { id: 'blog_post', label: 'Blog Post', maxLength: 5000 },
  { id: 'product_description', label: 'Product Description', maxLength: 500 },
  { id: 'email_copy', label: 'Email Copy', maxLength: 2000 },
  { id: 'ad_copy', label: 'Ad Copy', maxLength: 150 },
  { id: 'social_post', label: 'Social Post', maxLength: 280 },
  { id: 'faq', label: 'FAQ Content', maxLength: 1000 },
];

const STORAGE_KEYS = {
  images: 'gyc_ai_images',
  content: 'gyc_ai_content',
};

const getStoredData = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const saveData = (key: string, data: unknown) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const AIContentHub = () => {
  const [activeTab, setActiveTab] = useState("images");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(() => 
    getStoredData(STORAGE_KEYS.images, [])
  );
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>(() => 
    getStoredData(STORAGE_KEYS.content, [])
  );
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  
  // Image generation form
  const [imageForm, setImageForm] = useState({
    prompt: '',
    category: 'hero',
    style: 'photorealistic',
    aspectRatio: '16:9',
  });
  
  // Content generation form
  const [contentForm, setContentForm] = useState({
    type: 'meta_title',
    topic: '',
    keywords: '',
    tone: 'professional',
    targetPage: '',
  });

  // SEO form
  const [seoForm, setSeoForm] = useState({
    page: '',
    currentTitle: '',
    currentDescription: '',
    targetKeywords: '',
  });

  const handleGenerateImage = async () => {
    if (!imageForm.prompt) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGeneratingImage(true);
    toast.loading('Generating image with AI...');

    // Simulate AI image generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock generated image (in production, this would call actual AI API)
    const newImage: GeneratedImage = {
      id: Date.now().toString(),
      prompt: imageForm.prompt,
      category: imageForm.category,
      url: `https://picsum.photos/seed/${Date.now()}/1200/600`,
      createdAt: new Date().toISOString(),
    };

    const updated = [...generatedImages, newImage];
    setGeneratedImages(updated);
    saveData(STORAGE_KEYS.images, updated);

    toast.dismiss();
    toast.success('Image generated successfully!');
    setIsGeneratingImage(false);
    setImageForm(prev => ({ ...prev, prompt: '' }));
  };

  const handleGenerateContent = async () => {
    if (!contentForm.topic) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGeneratingContent(true);
    toast.loading('Generating content with AI...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock generated content
    let generatedText = '';
    const contentType = CONTENT_TYPES.find(t => t.id === contentForm.type);
    
    switch (contentForm.type) {
      case 'meta_title':
        generatedText = `${contentForm.topic} | Best Prices in India | Grabyourcar`;
        break;
      case 'meta_description':
        generatedText = `Explore ${contentForm.topic} with Grabyourcar. Get the best prices, easy finance options, and doorstep delivery. Book a test drive today!`;
        break;
      case 'blog_post':
        generatedText = `# ${contentForm.topic}\n\nIntroduction paragraph about ${contentForm.topic}...\n\n## Key Points\n- Point 1\n- Point 2\n- Point 3\n\n## Conclusion\nSummary and call to action...`;
        break;
      case 'product_description':
        generatedText = `Discover the ${contentForm.topic}. This exceptional vehicle combines style, performance, and value. With advanced features and competitive pricing, it's the perfect choice for discerning buyers.`;
        break;
      case 'email_copy':
        generatedText = `Subject: Special Offer on ${contentForm.topic}\n\nDear Customer,\n\nWe're excited to share an exclusive offer on ${contentForm.topic}...\n\nBest regards,\nTeam Grabyourcar`;
        break;
      case 'ad_copy':
        generatedText = `🚗 ${contentForm.topic} - Starting at unbeatable prices! Easy EMI available. Book your test drive today! 📞`;
        break;
      case 'social_post':
        generatedText = `🔥 Just in! ${contentForm.topic} now available at Grabyourcar!\n\n✅ Best prices\n✅ Easy finance\n✅ Doorstep delivery\n\n#Grabyourcar #NewCar #CarDeals`;
        break;
      case 'faq':
        generatedText = `Q: What is the price of ${contentForm.topic}?\nA: The ${contentForm.topic} is available starting from competitive prices. Contact us for the latest offers.\n\nQ: What are the financing options?\nA: We offer easy EMI options with minimal documentation.`;
        break;
      default:
        generatedText = `AI-generated content for ${contentForm.topic}`;
    }

    const newContent: GeneratedContent = {
      id: Date.now().toString(),
      type: contentForm.type,
      title: contentForm.topic,
      content: generatedText,
      createdAt: new Date().toISOString(),
    };

    const updated = [...generatedContent, newContent];
    setGeneratedContent(updated);
    saveData(STORAGE_KEYS.content, updated);

    toast.dismiss();
    toast.success('Content generated successfully!');
    setIsGeneratingContent(false);
  };

  const handleGenerateSEO = async () => {
    if (!seoForm.page) {
      toast.error('Please select a page');
      return;
    }

    setIsGeneratingContent(true);
    toast.loading('Generating SEO content...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    const generatedTitle = `${seoForm.page} - Best Deals & Offers | Grabyourcar India`;
    const generatedDescription = `Discover the best ${seoForm.page.toLowerCase()} at Grabyourcar. Compare prices, features, and get exclusive offers. Easy financing available. Book your test drive today!`;

    setSeoForm(prev => ({
      ...prev,
      currentTitle: generatedTitle,
      currentDescription: generatedDescription,
    }));

    toast.dismiss();
    toast.success('SEO content generated!');
    setIsGeneratingContent(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const deleteImage = (id: string) => {
    const updated = generatedImages.filter(img => img.id !== id);
    setGeneratedImages(updated);
    saveData(STORAGE_KEYS.images, updated);
    toast.success('Image deleted');
  };

  const deleteContent = (id: string) => {
    const updated = generatedContent.filter(c => c.id !== id);
    setGeneratedContent(updated);
    saveData(STORAGE_KEYS.content, updated);
    toast.success('Content deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Content Hub
          </h2>
          <p className="text-muted-foreground">
            Generate images, SEO content, and marketing copy with AI
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{generatedImages.length}</div>
            <p className="text-xs text-muted-foreground">Images Generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{generatedContent.length}</div>
            <p className="text-xs text-muted-foreground">Content Pieces</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {generatedContent.filter(c => c.type.includes('meta')).length}
            </div>
            <p className="text-xs text-muted-foreground">SEO Optimized</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {IMAGE_CATEGORIES.length}
            </div>
            <p className="text-xs text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="images" className="gap-2">
            <Image className="h-4 w-4" />
            AI Images
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <FileText className="h-4 w-4" />
            AI Content
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Globe className="h-4 w-4" />
            SEO Generator
          </TabsTrigger>
        </TabsList>

        {/* AI Images Tab */}
        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Generate AI Image
              </CardTitle>
              <CardDescription>
                Create stunning images for banners, promotions, and more
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Image Prompt *</Label>
                <Textarea
                  placeholder="Describe the image you want... e.g., 'A sleek red SUV driving through scenic Indian mountains at sunset, cinematic lighting'"
                  value={imageForm.prompt}
                  onChange={(e) => setImageForm(prev => ({ ...prev, prompt: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={imageForm.category} 
                    onValueChange={(v) => setImageForm(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select 
                    value={imageForm.style} 
                    onValueChange={(v) => setImageForm(prev => ({ ...prev, style: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photorealistic">Photorealistic</SelectItem>
                      <SelectItem value="illustration">Illustration</SelectItem>
                      <SelectItem value="3d-render">3D Render</SelectItem>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select 
                    value={imageForm.aspectRatio} 
                    onValueChange={(v) => setImageForm(prev => ({ ...prev, aspectRatio: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Banner)</SelectItem>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                      <SelectItem value="9:16">9:16 (Story)</SelectItem>
                      <SelectItem value="21:9">21:9 (Ultra-wide)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imageForm.prompt}
                className="w-full"
              >
                {isGeneratingImage ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Image
              </Button>
            </CardContent>
          </Card>

          {/* Generated Images Grid */}
          {generatedImages.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Generated Images ({generatedImages.length})</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {generatedImages.map((image) => (
                  <Card key={image.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative group">
                      <img 
                        src={image.url} 
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteImage(image.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="pt-3">
                      <Badge variant="outline" className="mb-2">
                        {IMAGE_CATEGORIES.find(c => c.id === image.category)?.label}
                      </Badge>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {image.prompt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* AI Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Generate AI Content
              </CardTitle>
              <CardDescription>
                Create marketing copy, product descriptions, and more
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Content Type *</Label>
                  <Select 
                    value={contentForm.type} 
                    onValueChange={(v) => setContentForm(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label} ({type.maxLength} chars)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select 
                    value={contentForm.tone} 
                    onValueChange={(v) => setContentForm(prev => ({ ...prev, tone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Topic / Subject *</Label>
                <Input
                  placeholder="e.g., Maruti Swift 2024, SUVs under 15 Lakhs, Car Insurance Benefits"
                  value={contentForm.topic}
                  onChange={(e) => setContentForm(prev => ({ ...prev, topic: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Target Keywords (Optional)</Label>
                <Input
                  placeholder="e.g., best car, affordable SUV, car loan"
                  value={contentForm.keywords}
                  onChange={(e) => setContentForm(prev => ({ ...prev, keywords: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleGenerateContent}
                disabled={isGeneratingContent || !contentForm.topic}
                className="w-full"
              >
                {isGeneratingContent ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Content
              </Button>
            </CardContent>
          </Card>

          {/* Generated Content List */}
          {generatedContent.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Generated Content ({generatedContent.length})</h3>
              {generatedContent.map((content) => (
                <Card key={content.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="mb-1">
                          {CONTENT_TYPES.find(t => t.id === content.type)?.label}
                        </Badge>
                        <CardTitle className="text-base">{content.title}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(content.content)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteContent(content.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg font-sans">
                      {content.content}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SEO Generator Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                SEO Content Generator
              </CardTitle>
              <CardDescription>
                Generate optimized meta titles, descriptions, and keywords for any page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Page *</Label>
                <Select 
                  value={seoForm.page} 
                  onValueChange={(v) => setSeoForm(prev => ({ ...prev, page: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Homepage">Homepage</SelectItem>
                    <SelectItem value="Cars">Cars Listing</SelectItem>
                    <SelectItem value="Car Finance">Car Finance</SelectItem>
                    <SelectItem value="Car Insurance">Car Insurance</SelectItem>
                    <SelectItem value="Self Drive Rentals">Self Drive Rentals</SelectItem>
                    <SelectItem value="HSRP">HSRP Services</SelectItem>
                    <SelectItem value="Accessories">Car Accessories</SelectItem>
                    <SelectItem value="Corporate">Corporate Buying</SelectItem>
                    <SelectItem value="About Us">About Us</SelectItem>
                    <SelectItem value="Contact">Contact Us</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Keywords</Label>
                <Input
                  placeholder="e.g., buy new car, car dealership, auto finance"
                  value={seoForm.targetKeywords}
                  onChange={(e) => setSeoForm(prev => ({ ...prev, targetKeywords: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleGenerateSEO}
                disabled={isGeneratingContent || !seoForm.page}
                className="w-full"
              >
                {isGeneratingContent ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate SEO Content
              </Button>

              {seoForm.currentTitle && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Title</Label>
                      <span className="text-xs text-muted-foreground">
                        {seoForm.currentTitle.length}/60 characters
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input value={seoForm.currentTitle} readOnly className="flex-1" />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(seoForm.currentTitle)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Description</Label>
                      <span className="text-xs text-muted-foreground">
                        {seoForm.currentDescription.length}/160 characters
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Textarea value={seoForm.currentDescription} readOnly rows={3} className="flex-1" />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(seoForm.currentDescription)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Google Preview */}
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Google Search Preview:</p>
                    <div className="space-y-1">
                      <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                        {seoForm.currentTitle}
                      </p>
                      <p className="text-green-700 text-sm">
                        grabyourcar.com › {seoForm.page.toLowerCase().replace(/\s/g, '-')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {seoForm.currentDescription}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
