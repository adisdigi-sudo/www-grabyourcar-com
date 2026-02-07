import { useState } from "react";
import { useTestimonials } from "@/hooks/useCMSData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit, Star, Quote, User, MapPin, Car } from "lucide-react";

interface TestimonialFormData {
  id?: string;
  customer_name: string;
  customer_location: string;
  customer_image: string;
  car_purchased: string;
  rating: number;
  testimonial_text: string;
  video_url: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

const defaultTestimonial: TestimonialFormData = {
  customer_name: '',
  customer_location: '',
  customer_image: '',
  car_purchased: '',
  rating: 5,
  testimonial_text: '',
  video_url: '',
  is_featured: false,
  is_active: true,
  sort_order: 0,
};

export function TestimonialsManager() {
  const { data: testimonials, isLoading, saveMutation, deleteMutation } = useTestimonials();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialFormData>(defaultTestimonial);

  const handleSave = async () => {
    await saveMutation.mutateAsync(editingTestimonial);
    setIsDialogOpen(false);
    setEditingTestimonial(defaultTestimonial);
  };

  const handleEdit = (testimonial: any) => {
    setEditingTestimonial({
      id: testimonial.id,
      customer_name: testimonial.customer_name || '',
      customer_location: testimonial.customer_location || '',
      customer_image: testimonial.customer_image || '',
      car_purchased: testimonial.car_purchased || '',
      rating: testimonial.rating || 5,
      testimonial_text: testimonial.testimonial_text || '',
      video_url: testimonial.video_url || '',
      is_featured: testimonial.is_featured ?? false,
      is_active: testimonial.is_active ?? true,
      sort_order: testimonial.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this testimonial?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const renderStars = (rating: number) => Array.from({ length: 5 }).map((_, i) => (
    <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
  ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Testimonials</h2>
          <p className="text-muted-foreground">Manage customer reviews</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTestimonial(defaultTestimonial)}>
              <Plus className="h-4 w-4 mr-2" />Add Testimonial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTestimonial.id ? 'Edit' : 'Add'} Testimonial</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Customer Name *</Label>
                  <Input value={editingTestimonial.customer_name} onChange={(e) => setEditingTestimonial(prev => ({ ...prev, customer_name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Location</Label>
                  <Input value={editingTestimonial.customer_location} onChange={(e) => setEditingTestimonial(prev => ({ ...prev, customer_location: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Photo URL</Label>
                  <Input value={editingTestimonial.customer_image} onChange={(e) => setEditingTestimonial(prev => ({ ...prev, customer_image: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Car Purchased</Label>
                  <Input value={editingTestimonial.car_purchased} onChange={(e) => setEditingTestimonial(prev => ({ ...prev, car_purchased: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setEditingTestimonial(prev => ({ ...prev, rating: star }))}>
                      <Star className={`h-6 w-6 ${star <= editingTestimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Review Text *</Label>
                <Textarea value={editingTestimonial.testimonial_text} onChange={(e) => setEditingTestimonial(prev => ({ ...prev, testimonial_text: e.target.value }))} rows={4} />
              </div>
              <div className="grid gap-2">
                <Label>Video URL (optional)</Label>
                <Input value={editingTestimonial.video_url} onChange={(e) => setEditingTestimonial(prev => ({ ...prev, video_url: e.target.value }))} placeholder="YouTube/Vimeo URL" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={editingTestimonial.is_featured} onCheckedChange={(checked) => setEditingTestimonial(prev => ({ ...prev, is_featured: checked }))} /><Label>Featured</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editingTestimonial.is_active} onCheckedChange={(checked) => setEditingTestimonial(prev => ({ ...prev, is_active: checked }))} /><Label>Active</Label></div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={!editingTestimonial.customer_name || !editingTestimonial.testimonial_text || saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : testimonials?.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16">
          <Quote className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No testimonials yet</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonials?.map((t) => (
            <Card key={t.id} className={!t.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {t.customer_image ? <img src={t.customer_image} alt={t.customer_name} className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>}
                    <div>
                      <h4 className="font-semibold">{t.customer_name}</h4>
                      {t.customer_location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{t.customer_location}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-3">{renderStars(t.rating)}</div>
                <p className="text-sm text-muted-foreground line-clamp-4 mb-3">"{t.testimonial_text}"</p>
                <div className="flex items-center justify-between pt-3 border-t">
                  {t.car_purchased && <Badge variant="outline" className="text-xs"><Car className="h-3 w-3 mr-1" />{t.car_purchased}</Badge>}
                  <div className="flex gap-1">
                    {t.is_featured && <Badge>Featured</Badge>}
                    {!t.is_active && <Badge variant="secondary">Hidden</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default TestimonialsManager;
