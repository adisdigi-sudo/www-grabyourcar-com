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
import { Save, Plus, Edit, Trash2, Star, Image, MessageSquare, Car, MapPin, Calendar } from "lucide-react";

interface GoogleReview {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  date: string;
  comment: string;
  carPurchased?: string;
  isLocalGuide: boolean;
  hasResponse: boolean;
  responseText?: string;
  isVisible: boolean;
}

interface DeliveryStory {
  id: string;
  customerName: string;
  location: string;
  carName: string;
  carBrand: string;
  imageUrl: string;
  testimonial: string;
  deliveryDate: string;
  timeline: { step: string; date: string }[];
  isFeatured: boolean;
  isVisible: boolean;
}

interface ReviewSettings {
  overallRating: number;
  totalReviews: number;
  googlePlaceId: string;
  showResponseRate: boolean;
  responseRate: number;
}

export const SocialProofManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("reviews");
  
  // Google Reviews State
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [editingReview, setEditingReview] = useState<GoogleReview | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewSettings, setReviewSettings] = useState<ReviewSettings>({
    overallRating: 4.6,
    totalReviews: 127,
    googlePlaceId: "",
    showResponseRate: true,
    responseRate: 95,
  });
  
  // Delivery Stories State
  const [stories, setStories] = useState<DeliveryStory[]>([]);
  const [editingStory, setEditingStory] = useState<DeliveryStory | null>(null);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);

  // Fetch settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["socialProofSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .in("setting_key", ["google_reviews", "delivery_stories", "review_settings"]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      savedSettings.forEach((setting) => {
        if (setting.setting_key === "google_reviews") {
          setReviews(setting.setting_value as unknown as GoogleReview[]);
        } else if (setting.setting_key === "delivery_stories") {
          setStories(setting.setting_value as unknown as DeliveryStory[]);
        } else if (setting.setting_key === "review_settings") {
          setReviewSettings(setting.setting_value as unknown as ReviewSettings);
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
      queryClient.invalidateQueries({ queryKey: ["socialProofSettings"] });
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  // Review handlers
  const handleAddReview = () => {
    setEditingReview({
      id: crypto.randomUUID(),
      name: "",
      rating: 5,
      date: new Date().toISOString().split("T")[0],
      comment: "",
      isLocalGuide: false,
      hasResponse: false,
      isVisible: true,
    });
    setReviewDialogOpen(true);
  };

  const handleSaveReview = () => {
    if (!editingReview) return;
    const exists = reviews.find(r => r.id === editingReview.id);
    if (exists) {
      setReviews(reviews.map(r => r.id === editingReview.id ? editingReview : r));
    } else {
      setReviews([...reviews, editingReview]);
    }
    setReviewDialogOpen(false);
    setEditingReview(null);
  };

  const handleDeleteReview = (id: string) => {
    setReviews(reviews.filter(r => r.id !== id));
  };

  const handleSaveAllReviews = () => {
    saveMutation.mutate({ key: "google_reviews", value: reviews });
    saveMutation.mutate({ key: "review_settings", value: reviewSettings });
  };

  // Story handlers
  const handleAddStory = () => {
    setEditingStory({
      id: crypto.randomUUID(),
      customerName: "",
      location: "",
      carName: "",
      carBrand: "",
      imageUrl: "",
      testimonial: "",
      deliveryDate: new Date().toISOString().split("T")[0],
      timeline: [],
      isFeatured: false,
      isVisible: true,
    });
    setStoryDialogOpen(true);
  };

  const handleSaveStory = () => {
    if (!editingStory) return;
    const exists = stories.find(s => s.id === editingStory.id);
    if (exists) {
      setStories(stories.map(s => s.id === editingStory.id ? editingStory : s));
    } else {
      setStories([...stories, editingStory]);
    }
    setStoryDialogOpen(false);
    setEditingStory(null);
  };

  const handleDeleteStory = (id: string) => {
    setStories(stories.filter(s => s.id !== id));
  };

  const handleSaveAllStories = () => {
    saveMutation.mutate({ key: "delivery_stories", value: stories });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Social Proof Management</h2>
        <p className="text-muted-foreground">Manage Google Reviews and Delivery Stories</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="reviews"><Star className="h-4 w-4 mr-2" />Google Reviews</TabsTrigger>
          <TabsTrigger value="stories"><Image className="h-4 w-4 mr-2" />Delivery Stories</TabsTrigger>
        </TabsList>

        {/* Google Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Settings</CardTitle>
              <CardDescription>Configure overall review display</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="5"
                  value={reviewSettings.overallRating}
                  onChange={(e) => setReviewSettings({ ...reviewSettings, overallRating: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Reviews</Label>
                <Input 
                  type="number"
                  value={reviewSettings.totalReviews}
                  onChange={(e) => setReviewSettings({ ...reviewSettings, totalReviews: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Response Rate %</Label>
                <Input 
                  type="number"
                  value={reviewSettings.responseRate}
                  onChange={(e) => setReviewSettings({ ...reviewSettings, responseRate: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Google Place ID</Label>
                <Input 
                  value={reviewSettings.googlePlaceId}
                  onChange={(e) => setReviewSettings({ ...reviewSettings, googlePlaceId: e.target.value })}
                  placeholder="For future API integration"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reviews ({reviews.length})</CardTitle>
                  <CardDescription>Manage customer reviews</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddReview}><Plus className="h-4 w-4 mr-2" />Add Review</Button>
                  <Button onClick={handleSaveAllReviews} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />Save All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.name}</span>
                          {review.isLocalGuide && <Badge variant="secondary">Local Guide</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{review.comment}</TableCell>
                      <TableCell>{review.date}</TableCell>
                      <TableCell>
                        <Badge variant={review.isVisible ? "default" : "secondary"}>
                          {review.isVisible ? "Visible" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingReview(review);
                            setReviewDialogOpen(true);
                          }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteReview(review.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Stories Tab */}
        <TabsContent value="stories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Real Delivery Stories ({stories.length})</CardTitle>
                  <CardDescription>Showcase authentic customer deliveries</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddStory}><Plus className="h-4 w-4 mr-2" />Add Story</Button>
                  <Button onClick={handleSaveAllStories} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />Save All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Car</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium">{story.customerName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          {story.carBrand} {story.carName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{story.location}
                        </div>
                      </TableCell>
                      <TableCell>{story.deliveryDate}</TableCell>
                      <TableCell>
                        <Badge variant={story.isFeatured ? "default" : "outline"}>
                          {story.isFeatured ? "Featured" : "Normal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={story.isVisible ? "default" : "secondary"}>
                          {story.isVisible ? "Visible" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingStory(story);
                            setStoryDialogOpen(true);
                          }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteStory(story.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingReview?.name ? "Edit Review" : "Add Review"}</DialogTitle>
          </DialogHeader>
          {editingReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={editingReview.name} onChange={(e) => setEditingReview({ ...editingReview, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <Select value={String(editingReview.rating)} onValueChange={(v) => setEditingReview({ ...editingReview, rating: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map(r => <SelectItem key={r} value={String(r)}>{r} Stars</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={editingReview.date} onChange={(e) => setEditingReview({ ...editingReview, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Car Purchased (optional)</Label>
                  <Input value={editingReview.carPurchased || ""} onChange={(e) => setEditingReview({ ...editingReview, carPurchased: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Review Comment</Label>
                <Textarea value={editingReview.comment} onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })} rows={3} />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editingReview.isLocalGuide} onCheckedChange={(v) => setEditingReview({ ...editingReview, isLocalGuide: v })} />
                  <Label>Local Guide</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingReview.isVisible} onCheckedChange={(v) => setEditingReview({ ...editingReview, isVisible: v })} />
                  <Label>Visible</Label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={editingReview.hasResponse} onCheckedChange={(v) => setEditingReview({ ...editingReview, hasResponse: v })} />
                  <Label>Has Business Response</Label>
                </div>
                {editingReview.hasResponse && (
                  <Textarea 
                    value={editingReview.responseText || ""} 
                    onChange={(e) => setEditingReview({ ...editingReview, responseText: e.target.value })}
                    placeholder="Business response..."
                    rows={2}
                  />
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveReview}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story Dialog */}
      <Dialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStory?.customerName ? "Edit Story" : "Add Story"}</DialogTitle>
          </DialogHeader>
          {editingStory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={editingStory.customerName} onChange={(e) => setEditingStory({ ...editingStory, customerName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={editingStory.location} onChange={(e) => setEditingStory({ ...editingStory, location: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Car Brand</Label>
                  <Input value={editingStory.carBrand} onChange={(e) => setEditingStory({ ...editingStory, carBrand: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Car Model</Label>
                  <Input value={editingStory.carName} onChange={(e) => setEditingStory({ ...editingStory, carName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input value={editingStory.imageUrl} onChange={(e) => setEditingStory({ ...editingStory, imageUrl: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Date</Label>
                  <Input type="date" value={editingStory.deliveryDate} onChange={(e) => setEditingStory({ ...editingStory, deliveryDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Customer Testimonial</Label>
                <Textarea value={editingStory.testimonial} onChange={(e) => setEditingStory({ ...editingStory, testimonial: e.target.value })} rows={3} />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editingStory.isFeatured} onCheckedChange={(v) => setEditingStory({ ...editingStory, isFeatured: v })} />
                  <Label>Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingStory.isVisible} onCheckedChange={(v) => setEditingStory({ ...editingStory, isVisible: v })} />
                  <Label>Visible</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStory}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
