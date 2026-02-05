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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Plus, Edit, Trash2, Percent, Timer, Tag, Layout, Sparkles, Eye, EyeOff } from "lucide-react";

interface Offer {
  id: string;
  title: string;
  description: string;
  discountType: "percentage" | "flat" | "cashback" | "free";
  discountValue: string;
  validFrom: string;
  validTill: string;
  applicableTo: "all" | "brand" | "model" | "category";
  applicableValue: string;
  couponCode?: string;
  termsConditions: string;
  isActive: boolean;
  isFeatured: boolean;
  displayLocation: string[];
  priority: number;
}

interface AnnouncementBar {
  text: string;
  linkText?: string;
  linkUrl?: string;
  isVisible: boolean;
  backgroundColor: string;
  textColor: string;
}

interface LayoutSettings {
  heroStyle: "carousel" | "static" | "video";
  showAnnouncementBar: boolean;
  carGridColumns: number;
  testimonialStyle: "carousel" | "grid" | "masonry";
  footerLayout: "full" | "minimal" | "centered";
}

export const OffersManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("offers");
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  
  const [announcementBar, setAnnouncementBar] = useState<AnnouncementBar>({
    text: "🎉 Mega Savings Live — Unlock Exclusive Dealer Offers Today!",
    linkText: "View Offers",
    linkUrl: "/cars",
    isVisible: true,
    backgroundColor: "#22c55e",
    textColor: "#ffffff",
  });
  
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    heroStyle: "carousel",
    showAnnouncementBar: true,
    carGridColumns: 3,
    testimonialStyle: "carousel",
    footerLayout: "full",
  });

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["offersAndLayoutSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .in("setting_key", ["offers_list", "announcement_bar", "layout_settings"]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      savedSettings.forEach((setting) => {
        if (setting.setting_key === "offers_list") {
          setOffers(setting.setting_value as unknown as Offer[]);
        } else if (setting.setting_key === "announcement_bar") {
          setAnnouncementBar(setting.setting_value as unknown as AnnouncementBar);
        } else if (setting.setting_key === "layout_settings") {
          setLayoutSettings(setting.setting_value as unknown as LayoutSettings);
        }
      });
    }
  }, [savedSettings]);

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
      queryClient.invalidateQueries({ queryKey: ["offersAndLayoutSettings"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleAddOffer = () => {
    setEditingOffer({
      id: crypto.randomUUID(),
      title: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      validFrom: new Date().toISOString().split("T")[0],
      validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      applicableTo: "all",
      applicableValue: "",
      termsConditions: "",
      isActive: true,
      isFeatured: false,
      displayLocation: ["homepage"],
      priority: 1,
    });
    setOfferDialogOpen(true);
  };

  const handleSaveOffer = () => {
    if (!editingOffer) return;
    const exists = offers.find(o => o.id === editingOffer.id);
    if (exists) {
      setOffers(offers.map(o => o.id === editingOffer.id ? editingOffer : o));
    } else {
      setOffers([...offers, editingOffer]);
    }
    setOfferDialogOpen(false);
    setEditingOffer(null);
  };

  const handleDeleteOffer = (id: string) => {
    setOffers(offers.filter(o => o.id !== id));
  };

  const handleSaveAll = () => {
    saveMutation.mutate({ key: "offers_list", value: offers });
    saveMutation.mutate({ key: "announcement_bar", value: announcementBar });
    saveMutation.mutate({ key: "layout_settings", value: layoutSettings });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Offers & Layout</h2>
          <p className="text-muted-foreground">Manage promotions, announcements, and website layout</p>
        </div>
        <Button onClick={handleSaveAll} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />Save All Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="offers"><Tag className="h-4 w-4 mr-2" />Offers</TabsTrigger>
          <TabsTrigger value="announcement"><Sparkles className="h-4 w-4 mr-2" />Announcement</TabsTrigger>
          <TabsTrigger value="layout"><Layout className="h-4 w-4 mr-2" />Layout</TabsTrigger>
        </TabsList>

        {/* Offers Tab */}
        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Promotional Offers ({offers.length})</CardTitle>
                  <CardDescription>Create and manage deals and discounts</CardDescription>
                </div>
                <Button onClick={handleAddOffer}><Plus className="h-4 w-4 mr-2" />Add Offer</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Valid Till</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">{offer.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {offer.discountType === "percentage" ? `${offer.discountValue}%` : 
                           offer.discountType === "flat" ? `₹${offer.discountValue}` :
                           offer.discountType === "cashback" ? `₹${offer.discountValue} Cashback` :
                           "Free"}
                        </Badge>
                      </TableCell>
                      <TableCell>{offer.validTill}</TableCell>
                      <TableCell>
                        {offer.isFeatured && <Badge>Featured</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={offer.isActive ? "default" : "secondary"}>
                          {offer.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingOffer(offer);
                            setOfferDialogOpen(true);
                          }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteOffer(offer.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {offers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No offers created. Add your first promotional offer.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcement Bar Tab */}
        <TabsContent value="announcement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Announcement Bar
              </CardTitle>
              <CardDescription>Configure the top announcement strip</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <Switch 
                  checked={announcementBar.isVisible}
                  onCheckedChange={(v) => setAnnouncementBar({ ...announcementBar, isVisible: v })}
                />
                <Label>Show Announcement Bar</Label>
                <Badge variant={announcementBar.isVisible ? "default" : "secondary"}>
                  {announcementBar.isVisible ? <><Eye className="h-3 w-3 mr-1" />Visible</> : <><EyeOff className="h-3 w-3 mr-1" />Hidden</>}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Announcement Text</Label>
                <Textarea 
                  value={announcementBar.text}
                  onChange={(e) => setAnnouncementBar({ ...announcementBar, text: e.target.value })}
                  placeholder="🎉 Special offer message..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link Text (optional)</Label>
                  <Input 
                    value={announcementBar.linkText || ""}
                    onChange={(e) => setAnnouncementBar({ ...announcementBar, linkText: e.target.value })}
                    placeholder="View Offers"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link URL</Label>
                  <Input 
                    value={announcementBar.linkUrl || ""}
                    onChange={(e) => setAnnouncementBar({ ...announcementBar, linkUrl: e.target.value })}
                    placeholder="/cars"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={announcementBar.backgroundColor}
                      onChange={(e) => setAnnouncementBar({ ...announcementBar, backgroundColor: e.target.value })}
                      className="h-10 w-14 rounded cursor-pointer border"
                    />
                    <Input 
                      value={announcementBar.backgroundColor}
                      onChange={(e) => setAnnouncementBar({ ...announcementBar, backgroundColor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={announcementBar.textColor}
                      onChange={(e) => setAnnouncementBar({ ...announcementBar, textColor: e.target.value })}
                      className="h-10 w-14 rounded cursor-pointer border"
                    />
                    <Input 
                      value={announcementBar.textColor}
                      onChange={(e) => setAnnouncementBar({ ...announcementBar, textColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">Preview</Label>
                <div 
                  className="p-3 rounded-lg text-center font-medium text-sm"
                  style={{ 
                    backgroundColor: announcementBar.backgroundColor,
                    color: announcementBar.textColor
                  }}
                >
                  {announcementBar.text}
                  {announcementBar.linkText && (
                    <span className="ml-2 underline cursor-pointer">{announcementBar.linkText}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout Settings</CardTitle>
              <CardDescription>Configure website layout and design options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Hero Section Style</Label>
                  <Select 
                    value={layoutSettings.heroStyle}
                    onValueChange={(v: LayoutSettings["heroStyle"]) => setLayoutSettings({ ...layoutSettings, heroStyle: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carousel">Carousel (Auto-rotating)</SelectItem>
                      <SelectItem value="static">Static Banner</SelectItem>
                      <SelectItem value="video">Video Background</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Car Grid Columns</Label>
                  <Select 
                    value={String(layoutSettings.carGridColumns)}
                    onValueChange={(v) => setLayoutSettings({ ...layoutSettings, carGridColumns: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Columns</SelectItem>
                      <SelectItem value="3">3 Columns</SelectItem>
                      <SelectItem value="4">4 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Testimonial Style</Label>
                  <Select 
                    value={layoutSettings.testimonialStyle}
                    onValueChange={(v: LayoutSettings["testimonialStyle"]) => setLayoutSettings({ ...layoutSettings, testimonialStyle: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carousel">Carousel</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="masonry">Masonry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Footer Layout</Label>
                  <Select 
                    value={layoutSettings.footerLayout}
                    onValueChange={(v: LayoutSettings["footerLayout"]) => setLayoutSettings({ ...layoutSettings, footerLayout: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full (All sections)</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="centered">Centered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Offer Edit Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOffer?.title ? "Edit Offer" : "Add Offer"}</DialogTitle>
            <DialogDescription>Configure promotional offer details</DialogDescription>
          </DialogHeader>
          {editingOffer && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Offer Title</Label>
                <Input 
                  value={editingOffer.title}
                  onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
                  placeholder="Diwali Special Offer"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={editingOffer.description}
                  onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                  placeholder="Get amazing discounts on all new cars..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select 
                    value={editingOffer.discountType}
                    onValueChange={(v: Offer["discountType"]) => setEditingOffer({ ...editingOffer, discountType: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                      <SelectItem value="cashback">Cashback</SelectItem>
                      <SelectItem value="free">Free Gift/Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input 
                    value={editingOffer.discountValue}
                    onChange={(e) => setEditingOffer({ ...editingOffer, discountValue: e.target.value })}
                    placeholder={editingOffer.discountType === "percentage" ? "10" : "5000"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input 
                    type="date"
                    value={editingOffer.validFrom}
                    onChange={(e) => setEditingOffer({ ...editingOffer, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Till</Label>
                  <Input 
                    type="date"
                    value={editingOffer.validTill}
                    onChange={(e) => setEditingOffer({ ...editingOffer, validTill: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Coupon Code (optional)</Label>
                <Input 
                  value={editingOffer.couponCode || ""}
                  onChange={(e) => setEditingOffer({ ...editingOffer, couponCode: e.target.value.toUpperCase() })}
                  placeholder="DIWALI2024"
                />
              </div>

              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea 
                  value={editingOffer.termsConditions}
                  onChange={(e) => setEditingOffer({ ...editingOffer, termsConditions: e.target.value })}
                  placeholder="Offer valid on select models. T&C apply."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingOffer.isActive}
                    onCheckedChange={(v) => setEditingOffer({ ...editingOffer, isActive: v })}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={editingOffer.isFeatured}
                    onCheckedChange={(v) => setEditingOffer({ ...editingOffer, isFeatured: v })}
                  />
                  <Label>Featured</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOffer}>Save Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
