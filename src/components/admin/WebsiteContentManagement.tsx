import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Plus, Edit, Trash2, ExternalLink, Phone, MessageCircle, Menu, Settings, Footprints } from "lucide-react";

interface HeaderService {
  id: string;
  title: string;
  href: string;
  description: string;
  icon: string;
  badge?: string;
  isActive: boolean;
}

interface FooterLink {
  id: string;
  section: string;
  label: string;
  href: string;
  isActive: boolean;
}

interface CTASettings {
  phone: string;
  whatsappNumber: string;
  whatsappMessage: string;
  buttonText: string;
  isVisible: boolean;
}

export const WebsiteContentManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("header");
  
  // Header Services State
  const [headerServices, setHeaderServices] = useState<HeaderService[]>([]);
  const [editingService, setEditingService] = useState<HeaderService | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  
  // Footer Links State
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [editingFooterLink, setEditingFooterLink] = useState<FooterLink | null>(null);
  const [footerDialogOpen, setFooterDialogOpen] = useState(false);
  
  // CTA Settings State
  const [ctaSettings, setCtaSettings] = useState<CTASettings>({
    phone: "+1 155578093",
    whatsappNumber: "1155578093",
    whatsappMessage: "Hi Grabyourcar! I'm interested in buying a new car.",
    buttonText: "Talk to Expert",
    isVisible: true,
  });

  // Fetch settings from database
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["websiteContentSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .in("setting_key", ["header_services", "footer_links", "cta_settings"]);
      if (error) throw error;
      return data;
    },
  });

  // Initialize state from saved settings
  useEffect(() => {
    if (savedSettings) {
      savedSettings.forEach((setting) => {
        if (setting.setting_key === "header_services") {
          setHeaderServices(setting.setting_value as unknown as HeaderService[]);
        } else if (setting.setting_key === "footer_links") {
          setFooterLinks(setting.setting_value as unknown as FooterLink[]);
        } else if (setting.setting_key === "cta_settings") {
          setCtaSettings(setting.setting_value as unknown as CTASettings);
        }
      });
    }
  }, [savedSettings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("admin_settings")
        .upsert([{ 
          setting_key: key, 
          setting_value: JSON.parse(JSON.stringify(value)),
          updated_at: new Date().toISOString()
        }], { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websiteContentSettings"] });
      toast.success("Settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const handleSaveHeaderServices = () => {
    saveMutation.mutate({ key: "header_services", value: headerServices });
  };

  const handleSaveFooterLinks = () => {
    saveMutation.mutate({ key: "footer_links", value: footerLinks });
  };

  const handleSaveCTASettings = () => {
    saveMutation.mutate({ key: "cta_settings", value: ctaSettings });
  };

  const handleAddService = () => {
    setEditingService({
      id: crypto.randomUUID(),
      title: "",
      href: "/",
      description: "",
      icon: "Car",
      isActive: true,
    });
    setServiceDialogOpen(true);
  };

  const handleSaveService = () => {
    if (!editingService) return;
    const exists = headerServices.find(s => s.id === editingService.id);
    if (exists) {
      setHeaderServices(headerServices.map(s => s.id === editingService.id ? editingService : s));
    } else {
      setHeaderServices([...headerServices, editingService]);
    }
    setServiceDialogOpen(false);
    setEditingService(null);
  };

  const handleDeleteService = (id: string) => {
    setHeaderServices(headerServices.filter(s => s.id !== id));
  };

  const handleAddFooterLink = () => {
    setEditingFooterLink({
      id: crypto.randomUUID(),
      section: "services",
      label: "",
      href: "/",
      isActive: true,
    });
    setFooterDialogOpen(true);
  };

  const handleSaveFooterLink = () => {
    if (!editingFooterLink) return;
    const exists = footerLinks.find(l => l.id === editingFooterLink.id);
    if (exists) {
      setFooterLinks(footerLinks.map(l => l.id === editingFooterLink.id ? editingFooterLink : l));
    } else {
      setFooterLinks([...footerLinks, editingFooterLink]);
    }
    setFooterDialogOpen(false);
    setEditingFooterLink(null);
  };

  const handleDeleteFooterLink = (id: string) => {
    setFooterLinks(footerLinks.filter(l => l.id !== id));
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Website Content Management</h2>
          <p className="text-muted-foreground">Manage header, footer, and CTA button content</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="header"><Menu className="h-4 w-4 mr-2" />Header</TabsTrigger>
          <TabsTrigger value="footer"><Footprints className="h-4 w-4 mr-2" />Footer</TabsTrigger>
          <TabsTrigger value="cta"><MessageCircle className="h-4 w-4 mr-2" />CTA</TabsTrigger>
        </TabsList>

        {/* Header Services Tab */}
        <TabsContent value="header" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Header Services Menu</CardTitle>
                  <CardDescription>Manage navigation menu items</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddService}><Plus className="h-4 w-4 mr-2" />Add Service</Button>
                  <Button onClick={handleSaveHeaderServices} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headerServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.title}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{service.description}</TableCell>
                      <TableCell>{service.href}</TableCell>
                      <TableCell>{service.badge && <Badge>{service.badge}</Badge>}</TableCell>
                      <TableCell>
                        <Badge variant={service.isActive ? "default" : "secondary"}>
                          {service.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingService(service);
                            setServiceDialogOpen(true);
                          }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteService(service.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {headerServices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No services configured. Add your first header service.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer Links Tab */}
        <TabsContent value="footer" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Footer Links</CardTitle>
                  <CardDescription>Manage footer navigation links</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddFooterLink}><Plus className="h-4 w-4 mr-2" />Add Link</Button>
                  <Button onClick={handleSaveFooterLinks} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {footerLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell><Badge variant="outline">{link.section}</Badge></TableCell>
                      <TableCell className="font-medium">{link.label}</TableCell>
                      <TableCell>{link.href}</TableCell>
                      <TableCell>
                        <Badge variant={link.isActive ? "default" : "secondary"}>
                          {link.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingFooterLink(link);
                            setFooterDialogOpen(true);
                          }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteFooterLink(link.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {footerLinks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No links configured. Add your first footer link.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CTA Settings Tab */}
        <TabsContent value="cta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Talk to Expert Button Settings</CardTitle>
              <CardDescription>Configure the primary CTA button in header</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input 
                    value={ctaSettings.buttonText}
                    onChange={(e) => setCtaSettings({ ...ctaSettings, buttonText: e.target.value })}
                    placeholder="Talk to Expert"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    value={ctaSettings.phone}
                    onChange={(e) => setCtaSettings({ ...ctaSettings, phone: e.target.value })}
                    placeholder="+91 95772 00023"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp Number (without +)</Label>
                  <Input 
                    value={ctaSettings.whatsappNumber}
                    onChange={(e) => setCtaSettings({ ...ctaSettings, whatsappNumber: e.target.value })}
                    placeholder="1155578093"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={ctaSettings.isVisible}
                    onCheckedChange={(v) => setCtaSettings({ ...ctaSettings, isVisible: v })}
                  />
                  <Label>Show CTA Button</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>WhatsApp Pre-filled Message</Label>
                <Textarea 
                  value={ctaSettings.whatsappMessage}
                  onChange={(e) => setCtaSettings({ ...ctaSettings, whatsappMessage: e.target.value })}
                  placeholder="Hi! I'm interested in buying a new car."
                  rows={3}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <Button variant="whatsapp" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {ctaSettings.buttonText}
                </Button>
              </div>

              <Button onClick={handleSaveCTASettings} disabled={saveMutation.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />Save CTA Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Service Edit Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService?.title ? "Edit Service" : "Add Service"}</DialogTitle>
            <DialogDescription>Configure header menu service item</DialogDescription>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input 
                    value={editingService.title}
                    onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link</Label>
                  <Input 
                    value={editingService.href}
                    onChange={(e) => setEditingService({ ...editingService, href: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={editingService.description}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Badge (optional)</Label>
                  <Input 
                    value={editingService.badge || ""}
                    onChange={(e) => setEditingService({ ...editingService, badge: e.target.value })}
                    placeholder="New"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch 
                    checked={editingService.isActive}
                    onCheckedChange={(v) => setEditingService({ ...editingService, isActive: v })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveService}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Link Edit Dialog */}
      <Dialog open={footerDialogOpen} onOpenChange={setFooterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFooterLink?.label ? "Edit Link" : "Add Link"}</DialogTitle>
            <DialogDescription>Configure footer navigation link</DialogDescription>
          </DialogHeader>
          {editingFooterLink && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input 
                    value={editingFooterLink.section}
                    onChange={(e) => setEditingFooterLink({ ...editingFooterLink, section: e.target.value })}
                    placeholder="services, brands, company, legal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input 
                    value={editingFooterLink.label}
                    onChange={(e) => setEditingFooterLink({ ...editingFooterLink, label: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link</Label>
                  <Input 
                    value={editingFooterLink.href}
                    onChange={(e) => setEditingFooterLink({ ...editingFooterLink, href: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch 
                    checked={editingFooterLink.isActive}
                    onCheckedChange={(v) => setEditingFooterLink({ ...editingFooterLink, isActive: v })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFooterDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFooterLink}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
