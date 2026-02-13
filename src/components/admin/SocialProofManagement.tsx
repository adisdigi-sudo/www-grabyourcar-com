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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Plus, Edit, Trash2, Star, Image, Video, X, Loader2 } from "lucide-react";

interface GoogleReviewDB {
  id: string;
  author_name: string;
  author_photo: string | null;
  rating: number;
  review_text: string;
  relative_time: string | null;
  car_purchased: string | null;
  is_local_guide: boolean;
  is_visible: boolean;
  sort_order: number;
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
  rating: number;
  is_featured: boolean;
  is_visible: boolean;
  sort_order: number;
}

interface ReviewSettings {
  overallRating: number;
  totalReviews: number;
  responseRate: number;
}

export const SocialProofManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("reviews");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Review state
  const [editingReview, setEditingReview] = useState<GoogleReviewDB | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewSettings, setReviewSettings] = useState<ReviewSettings>({
    overallRating: 4.6,
    totalReviews: 127,
    responseRate: 95,
  });

  // Story state
  const [editingStory, setEditingStory] = useState<DeliveryStory | null>(null);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Queries
  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["google-reviews-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("google_reviews")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as GoogleReviewDB[];
    },
  });

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

  const { data: savedSettings } = useQuery({
    queryKey: ["reviewSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "review_settings")
        .maybeSingle();
      if (error) throw error;
      return data?.setting_value as unknown as ReviewSettings | null;
    },
  });

  useEffect(() => {
    if (savedSettings) setReviewSettings(savedSettings);
  }, [savedSettings]);

  // Mutations
  const saveReviewMutation = useMutation({
    mutationFn: async (review: GoogleReviewDB) => {
      const { id, ...data } = review;
      const { data: existing } = await (supabase as any)
        .from("google_reviews").select("id").eq("id", id).maybeSingle();
      if (existing) {
        const { error } = await (supabase as any).from("google_reviews").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("google_reviews").insert({ id, ...data });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-reviews-admin"] });
      queryClient.invalidateQueries({ queryKey: ["google-reviews-public"] });
      toast.success("Review saved");
      setReviewDialogOpen(false);
      setEditingReview(null);
    },
    onError: () => toast.error("Failed to save review"),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("google_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-reviews-admin"] });
      queryClient.invalidateQueries({ queryKey: ["google-reviews-public"] });
      toast.success("Review deleted");
    },
    onError: () => toast.error("Failed to delete review"),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admin_settings")
        .upsert([{
          setting_key: "review_settings",
          setting_value: JSON.parse(JSON.stringify(reviewSettings)),
          updated_at: new Date().toISOString(),
        }], { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewSettings"] });
      toast.success("Review settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const saveStoryMutation = useMutation({
    mutationFn: async (story: DeliveryStory) => {
      const { id, ...data } = story;
      const { data: existing } = await (supabase as any)
        .from("delivery_stories").select("id").eq("id", id).maybeSingle();
      if (existing) {
        const { error } = await (supabase as any).from("delivery_stories").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("delivery_stories").insert({ id, ...data });
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
      const { error } = await (supabase as any).from("delivery_stories").delete().eq("id", id);
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
    if (!editingStory) return;
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
      if (type === "photo") {
        setEditingStory({ ...editingStory, image_url: urlData.publicUrl });
      } else {
        setEditingStory({ ...editingStory, video_url: urlData.publicUrl });
      }
      toast.success(`${type === "photo" ? "Photo" : "Video"} uploaded`);
    } catch (err) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setter(false);
    }
  };

  // Handlers
  const handleAddReview = () => {
    setEditingReview({
      id: crypto.randomUUID(),
      author_name: "",
      author_photo: null,
      rating: 5,
      review_text: "",
      relative_time: "",
      car_purchased: null,
      is_local_guide: false,
      is_visible: true,
      sort_order: reviews.length,
    });
    setReviewDialogOpen(true);
  };

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
      rating: 5,
      is_featured: false,
      is_visible: true,
      sort_order: stories.length,
    });
    setStoryDialogOpen(true);
  };

  if (loadingReviews || loadingStories) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Social Proof Management</h2>
          <p className="text-muted-foreground">Quick edit reviews and delivery stories</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "reviews" && (
            <Button onClick={handleAddReview} className="gap-2">
              <Plus className="h-4 w-4" />Add Review
            </Button>
          )}
          {activeTab === "stories" && (
            <Button onClick={handleAddStory} className="gap-2">
              <Plus className="h-4 w-4" />Add Story
            </Button>
          )}
        </div>
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
              <CardDescription>Overall ratings shown on site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Overall Rating (0-5)</Label>
                  <Input type="number" step="0.1" min="0" max="5" 
                    value={reviewSettings.overallRating}
                    onChange={(e) => setReviewSettings({ ...reviewSettings, overallRating: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Total Reviews</Label>
                  <Input type="number" 
                    value={reviewSettings.totalReviews}
                    onChange={(e) => setReviewSettings({ ...reviewSettings, totalReviews: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Response Rate %</Label>
                  <Input type="number" min="0" max="100"
                    value={reviewSettings.responseRate}
                    onChange={(e) => setReviewSettings({ ...reviewSettings, responseRate: parseInt(e.target.value) })} />
                </div>
              </div>
              <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Reviews ({reviews.length})</CardTitle>
              <CardDescription>Click card to edit • Drag to reorder coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reviews. Click "Add Review" above to get started.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                  {reviews.map((review) => (
                    <div key={review.id} 
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition group"
                      onClick={() => {
                        setEditingReview(review);
                        setReviewDialogOpen(true);
                      }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{review.author_name}</p>
                          <div className="flex gap-1 mt-1">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteReviewMutation.mutate(review.id);
                          }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{review.review_text}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {review.is_local_guide && <Badge variant="secondary" className="text-[10px] py-0">Local Guide</Badge>}
                        <Badge variant={review.is_visible ? "default" : "outline"} className="text-[10px] py-0">
                          {review.is_visible ? "Visible" : "Hidden"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Stories Tab */}
        <TabsContent value="stories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real Delivery Stories ({stories.length})</CardTitle>
              <CardDescription>Click card to edit • Add photos and videos easily</CardDescription>
            </CardHeader>
            <CardContent>
              {stories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No stories yet. Click "Add Story" above to get started.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                  {stories.map((story) => (
                    <div key={story.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition group"
                      onClick={() => {
                        setEditingStory(story);
                        setStoryDialogOpen(true);
                      }}>
                      {story.image_url && (
                        <div className="mb-2 rounded overflow-hidden h-24 bg-muted">
                          <img src={story.image_url} alt="story" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="font-semibold text-sm">{story.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{story.car_brand} {story.car_model}</p>
                      <p className="text-xs text-muted-foreground">{story.location}</p>
                      <div className="flex gap-1 mt-2">
                        {Array.from({ length: story.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {story.image_url && <Badge variant="secondary" className="text-[10px] py-0">Photo</Badge>}
                        {story.video_url && <Badge variant="secondary" className="text-[10px] py-0">Video</Badge>}
                        {story.is_featured && <Badge className="text-[10px] py-0">Featured</Badge>}
                        <Badge variant={story.is_visible ? "default" : "outline"} className="text-[10px] py-0">
                          {story.is_visible ? "Visible" : "Hidden"}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStoryMutation.mutate(story.id);
                        }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Edit Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Google Review</DialogTitle>
          </DialogHeader>
          {editingReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={editingReview.author_name}
                    onChange={(e) => setEditingReview({ ...editingReview, author_name: e.target.value })}
                    placeholder="e.g., John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Rating (1-5)</Label>
                  <Input type="number" min="1" max="5" value={editingReview.rating}
                    onChange={(e) => setEditingReview({ ...editingReview, rating: parseInt(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Car Purchased (Optional)</Label>
                  <Input value={editingReview.car_purchased || ""}
                    onChange={(e) => setEditingReview({ ...editingReview, car_purchased: e.target.value })}
                    placeholder="e.g., Hyundai Creta" />
                </div>
                <div className="space-y-2">
                  <Label>Time Posted (Optional)</Label>
                  <Input value={editingReview.relative_time || ""}
                    onChange={(e) => setEditingReview({ ...editingReview, relative_time: e.target.value })}
                    placeholder="e.g., 2 weeks ago" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Review Text</Label>
                <Textarea value={editingReview.review_text}
                  onChange={(e) => setEditingReview({ ...editingReview, review_text: e.target.value })}
                  placeholder="Customer's feedback..."
                  rows={4} />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editingReview.is_local_guide}
                    onCheckedChange={(checked) => setEditingReview({ ...editingReview, is_local_guide: checked })} />
                  <Label>Local Guide</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingReview.is_visible}
                    onCheckedChange={(checked) => setEditingReview({ ...editingReview, is_visible: checked })} />
                  <Label>Visible on Site</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => editingReview && saveReviewMutation.mutate(editingReview)} disabled={saveReviewMutation.isPending}>
              {saveReviewMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story Edit Dialog */}
      <Dialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Delivery Story</DialogTitle>
          </DialogHeader>
          {editingStory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={editingStory.customer_name}
                    onChange={(e) => setEditingStory({ ...editingStory, customer_name: e.target.value })}
                    placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={editingStory.location}
                    onChange={(e) => setEditingStory({ ...editingStory, location: e.target.value })}
                    placeholder="Mumbai, India" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Car Brand</Label>
                  <Input value={editingStory.car_brand}
                    onChange={(e) => setEditingStory({ ...editingStory, car_brand: e.target.value })}
                    placeholder="Hyundai" />
                </div>
                <div className="space-y-2">
                  <Label>Car Model</Label>
                  <Input value={editingStory.car_model}
                    onChange={(e) => setEditingStory({ ...editingStory, car_model: e.target.value })}
                    placeholder="Creta" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Testimonial</Label>
                <Textarea value={editingStory.testimonial || ""}
                  onChange={(e) => setEditingStory({ ...editingStory, testimonial: e.target.value })}
                  placeholder="Customer's story..."
                  rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rating (1-5)</Label>
                  <Input type="number" min="1" max="5" value={editingStory.rating}
                    onChange={(e) => setEditingStory({ ...editingStory, rating: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Date</Label>
                  <Input type="date" value={editingStory.delivery_date || ""}
                    onChange={(e) => setEditingStory({ ...editingStory, delivery_date: e.target.value })} />
                </div>
              </div>

              {/* Photo/Video Upload */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Photo</Label>
                  {editingStory.image_url && (
                    <div className="relative mb-2">
                      <img src={editingStory.image_url} alt="preview" className="w-full h-24 object-cover rounded" />
                      <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setEditingStory({ ...editingStory, image_url: null })}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], "photo")} />
                  <Button variant="outline" className="w-full" onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}>
                    {uploadingPhoto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Image className="h-4 w-4 mr-2" />}
                    {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Video</Label>
                  {editingStory.video_url && (
                    <div className="relative mb-2">
                      <div className="bg-muted h-24 rounded flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setEditingStory({ ...editingStory, video_url: null })}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], "video")} />
                  <Button variant="outline" className="w-full" onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideo}>
                    {uploadingVideo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
                    {uploadingVideo ? "Uploading..." : "Upload Video"}
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editingStory.is_featured}
                    onCheckedChange={(checked) => setEditingStory({ ...editingStory, is_featured: checked })} />
                  <Label>Featured Story</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingStory.is_visible}
                    onCheckedChange={(checked) => setEditingStory({ ...editingStory, is_visible: checked })} />
                  <Label>Visible on Site</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => editingStory && saveStoryMutation.mutate(editingStory)} disabled={saveStoryMutation.isPending}>
              {saveStoryMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Story
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
