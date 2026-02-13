import { useState, useEffect, useRef } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Plus, Edit, Trash2, Star, Image, Car, MapPin, Upload, Video, X, Loader2 } from "lucide-react";

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
  customer_name: string;
  location: string;
  car_model: string;
  car_brand: string;
  image_url: string | null;
  video_url: string | null;
  testimonial: string | null;
  delivery_date: string | null;
  savings: string | null;
  highlight: string | null;
  buyer_type: string | null;
  wait_time: string | null;
  rating: number;
  journey_steps: string[];
  is_featured: boolean;
  is_visible: boolean;
  sort_order: number;
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  
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
  const [editingStory, setEditingStory] = useState<DeliveryStory | null>(null);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);

  // Fetch review settings from admin_settings
  const { data: savedSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["socialProofSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .in("setting_key", ["google_reviews", "review_settings"]);
      if (error) throw error;
      return data;
    },
  });

  // Fetch delivery stories from dedicated table
  const { data: stories = [], isLoading: loadingStories } = useQuery({
    queryKey: ["delivery-stories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("delivery_stories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as DeliveryStory[];
    },
  });

  useEffect(() => {
    if (savedSettings) {
      savedSettings.forEach((setting) => {
        if (setting.setting_key === "google_reviews") {
          setReviews(setting.setting_value as unknown as GoogleReview[]);
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
    onError: () => toast.error("Failed to save settings"),
  });

  // Story mutations using delivery_stories table
  const saveStoryMutation = useMutation({
    mutationFn: async (story: DeliveryStory) => {
      const { id, ...storyData } = story;
      // Check if exists
      const { data: existing } = await (supabase as any)
        .from("delivery_stories")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("delivery_stories")
          .update(storyData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("delivery_stories")
          .insert({ id, ...storyData });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-stories"] });
      toast.success("Story saved");
      setStoryDialogOpen(false);
      setEditingStory(null);
    },
    onError: () => toast.error("Failed to save story"),
  });

  const deleteStoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("delivery_stories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-stories"] });
      toast.success("Story deleted");
    },
    onError: () => toast.error("Failed to delete story"),
  });

  // File upload handler
  const handleFileUpload = async (file: File, type: "photo" | "video") => {
    const setter = type === "photo" ? setUploadingPhoto : setUploadingVideo;
    setter(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `delivery-stories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("car-assets")
        .upload(path, file, { contentType: file.type, upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from("car-assets").getPublicUrl(path);
      
      if (editingStory) {
        if (type === "photo") {
          setEditingStory({ ...editingStory, image_url: urlData.publicUrl });
        } else {
          setEditingStory({ ...editingStory, video_url: urlData.publicUrl });
        }
      }
      toast.success(`${type === "photo" ? "Photo" : "Video"} uploaded`);
    } catch (err) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setter(false);
    }
  };

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
      customer_name: "",
      location: "",
      car_model: "",
      car_brand: "",
      image_url: null,
      video_url: null,
      testimonial: "",
      delivery_date: new Date().toISOString().split("T")[0],
      savings: null,
      highlight: null,
      buyer_type: null,
      wait_time: null,
      rating: 5,
      journey_steps: [],
      is_featured: false,
      is_visible: true,
      sort_order: stories.length,
    });
    setStoryDialogOpen(true);
  };

  const isLoading = loadingSettings || loadingStories;

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
                  type="number" step="0.1" min="0" max="5"
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
                            <Star key={i} className="h-4 w-4 fill-accent text-accent" />
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
                  <CardDescription>Showcase authentic customer deliveries — stored in database</CardDescription>
                </div>
                <Button onClick={handleAddStory}><Plus className="h-4 w-4 mr-2" />Add Story</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Car</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell>
                        {story.image_url ? (
                          <img src={story.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Image className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{story.customer_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          {story.car_brand} {story.car_model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{story.location}
                        </div>
                      </TableCell>
                      <TableCell>{story.delivery_date}</TableCell>
                      <TableCell>
                        <Badge variant={story.is_featured ? "default" : "outline"}>
                          {story.is_featured ? "Featured" : "Normal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={story.is_visible ? "default" : "secondary"}>
                          {story.is_visible ? "Visible" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingStory(story);
                            setStoryDialogOpen(true);
                          }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteStoryMutation.mutate(story.id)}>
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

      {/* Story Dialog with File Upload */}
      <Dialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStory?.customer_name ? "Edit Story" : "Add Story"}</DialogTitle>
          </DialogHeader>
          {editingStory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={editingStory.customer_name} onChange={(e) => setEditingStory({ ...editingStory, customer_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={editingStory.location} onChange={(e) => setEditingStory({ ...editingStory, location: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Car Brand</Label>
                  <Input value={editingStory.car_brand} onChange={(e) => setEditingStory({ ...editingStory, car_brand: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Car Model</Label>
                  <Input value={editingStory.car_model} onChange={(e) => setEditingStory({ ...editingStory, car_model: e.target.value })} />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Delivery Photo</Label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "photo");
                  }}
                />
                {editingStory.image_url ? (
                  <div className="relative inline-block">
                    <img src={editingStory.image_url} alt="Preview" className="w-full max-h-48 rounded-lg object-cover border" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => setEditingStory({ ...editingStory, image_url: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed flex flex-col gap-1"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload photo</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Video Upload */}
              <div className="space-y-2">
                <Label>Delivery Video (optional)</Label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "video");
                  }}
                />
                {editingStory.video_url ? (
                  <div className="relative">
                    <video src={editingStory.video_url} controls className="w-full max-h-48 rounded-lg border" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => setEditingStory({ ...editingStory, video_url: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-16 border-dashed flex gap-2"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideo}
                  >
                    {uploadingVideo ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Video className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Upload video</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Date</Label>
                  <Input type="date" value={editingStory.delivery_date || ""} onChange={(e) => setEditingStory({ ...editingStory, delivery_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Savings (e.g. ₹50,000)</Label>
                  <Input value={editingStory.savings || ""} onChange={(e) => setEditingStory({ ...editingStory, savings: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Highlight Tag</Label>
                  <Input value={editingStory.highlight || ""} onChange={(e) => setEditingStory({ ...editingStory, highlight: e.target.value })} placeholder="e.g. Priority Delivery" />
                </div>
                <div className="space-y-2">
                  <Label>Buyer Type</Label>
                  <Input value={editingStory.buyer_type || ""} onChange={(e) => setEditingStory({ ...editingStory, buyer_type: e.target.value })} placeholder="e.g. Family Upgrade" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Wait Time</Label>
                <Input value={editingStory.wait_time || ""} onChange={(e) => setEditingStory({ ...editingStory, wait_time: e.target.value })} placeholder="e.g. 3 weeks" />
              </div>
              <div className="space-y-2">
                <Label>Customer Testimonial</Label>
                <Textarea value={editingStory.testimonial || ""} onChange={(e) => setEditingStory({ ...editingStory, testimonial: e.target.value })} rows={3} />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editingStory.is_featured} onCheckedChange={(v) => setEditingStory({ ...editingStory, is_featured: v })} />
                  <Label>Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingStory.is_visible} onCheckedChange={(v) => setEditingStory({ ...editingStory, is_visible: v })} />
                  <Label>Visible</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => editingStory && saveStoryMutation.mutate(editingStory)} disabled={saveStoryMutation.isPending}>
              {saveStoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
