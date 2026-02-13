import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import { 
  Upload, Link2, ImageIcon, X, Plus, Loader2, CheckCircle2, 
  AlertCircle, GripVertical, Star, Trash2, CloudUpload
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CarImageUploaderProps {
  carId: string;
  carName: string;
  carBrand: string;
  images: Array<{
    id: string;
    url: string;
    alt_text: string | null;
    is_primary: boolean | null;
    sort_order: number | null;
  }>;
  onImagesChanged: () => void;
}

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export const CarImageUploader = ({ carId, carName, carBrand, images, onImagesChanged }: CarImageUploaderProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [activeTab, setActiveTab] = useState("upload");

  const slug = `${carBrand.toLowerCase().replace(/\s+/g, '-')}/${carName.toLowerCase().replace(/\s+/g, '-')}`;

  // Upload file to Supabase storage then insert into car_images
  const uploadFileToStorage = async (file: File, fileId: string) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: "uploading" as const, progress: 30 } : f));

    const { error: uploadError } = await supabase.storage
      .from("car-assets")
      .upload(fileName, file, { contentType: file.type, upsert: true });

    if (uploadError) throw uploadError;

    setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 70 } : f));

    const { data: urlData } = supabase.storage.from("car-assets").getPublicUrl(fileName);

    const { error: dbError } = await supabase
      .from("car_images")
      .insert([{ car_id: carId, url: urlData.publicUrl, alt_text: carName, is_primary: images.length === 0 }]);

    if (dbError) throw dbError;

    setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: "done" as const, progress: 100 } : f));
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileArray.length === 0) {
      toast.error("Please select image files only");
      return;
    }

    const newUploads: UploadingFile[] = fileArray.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "pending" as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Upload all files
    for (const upload of newUploads) {
      try {
        await uploadFileToStorage(upload.file, upload.id);
      } catch (err: any) {
        setUploadingFiles(prev => prev.map(f => f.id === upload.id ? { ...f, status: "error" as const, error: err.message } : f));
      }
    }

    invalidateCarQueries(queryClient);
    onImagesChanged();
    toast.success(`${fileArray.length} image(s) uploaded successfully`);
  }, [carId, carName, images.length]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Add single URL
  const addUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase
        .from("car_images")
        .insert([{ car_id: carId, url, alt_text: carName, is_primary: images.length === 0 }]);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      onImagesChanged();
      setUrlInput("");
      toast.success("Image added");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  // Bulk URLs
  const addBulkUrlsMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const payload = urls.map((url, i) => ({
        car_id: carId,
        url,
        alt_text: carName,
        is_primary: images.length === 0 && i === 0,
        sort_order: images.length + i,
      }));
      const { error } = await supabase.from("car_images").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, urls) => {
      invalidateCarQueries(queryClient);
      onImagesChanged();
      setBulkUrls("");
      toast.success(`${urls.length} images added`);
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  // Delete image
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase.from("car_images").delete().eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      onImagesChanged();
      toast.success("Image deleted");
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  // Set primary
  const setPrimaryMutation = useMutation({
    mutationFn: async (imageId: string) => {
      // Unset all primary first
      await supabase.from("car_images").update({ is_primary: false }).eq("car_id", carId);
      const { error } = await supabase.from("car_images").update({ is_primary: true }).eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      onImagesChanged();
      toast.success("Primary image set");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const handleBulkAdd = () => {
    const urls = bulkUrls.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
    if (urls.length === 0) {
      toast.error("No valid URLs found");
      return;
    }
    addBulkUrlsMutation.mutate(urls);
  };

  const clearCompleted = () => {
    setUploadingFiles(prev => prev.filter(f => f.status !== "done"));
  };

  return (
    <div className="space-y-4">
      {/* Existing Images Gallery */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Current Images ({images.length})</Label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image) => (
              <div key={image.id} className="relative group rounded-lg overflow-hidden border bg-muted">
                <div className="aspect-[4/3]">
                  <img src={image.url} alt={image.alt_text || carName} className="h-full w-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
                {image.is_primary && (
                  <Badge className="absolute top-1.5 left-1.5 bg-accent-foreground text-accent text-[10px] px-1.5 py-0.5">
                    <Star className="h-3 w-3 mr-0.5" /> Primary
                  </Badge>
                )}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!image.is_primary && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 bg-white/90 hover:bg-white"
                      onClick={() => setPrimaryMutation.mutate(image.id)}
                      title="Set as primary"
                    >
                      <Star className="h-3.5 w-3.5 text-accent-foreground" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteImageMutation.mutate(image.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Methods */}
      <div className="border-t pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="text-xs">
              <CloudUpload className="h-3.5 w-3.5 mr-1" /> File Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs">
              <Link2 className="h-3.5 w-3.5 mr-1" /> URL
            </TabsTrigger>
            <TabsTrigger value="bulk" className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Bulk URLs
            </TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value="upload" className="space-y-3 mt-3">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                isDragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <CloudUpload className={cn("h-10 w-10 mx-auto mb-2", isDragOver ? "text-primary" : "text-muted-foreground/40")} />
              <p className="text-sm font-medium">
                {isDragOver ? "Drop images here" : "Drag & drop images or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports JPG, PNG, WebP • Multiple files allowed
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            {/* Upload Progress */}
            {uploadingFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Upload Progress</Label>
                  {uploadingFiles.some(f => f.status === "done") && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearCompleted}>
                      Clear completed
                    </Button>
                  )}
                </div>
                {uploadingFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded overflow-hidden shrink-0">
                      <img src={file.preview} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.file.name}</p>
                      <Progress value={file.progress} className="h-1.5 mt-1" />
                    </div>
                    <div className="shrink-0">
                      {file.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {file.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      {file.status === "error" && (
                        <div title={file.error}>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Image URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/car-image.jpg"
                  className="text-sm"
                />
                <Button
                  onClick={() => addUrlMutation.mutate(urlInput)}
                  disabled={!urlInput.startsWith("http") || addUrlMutation.isPending}
                  size="sm"
                >
                  {addUrlMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add
                </Button>
              </div>
            </div>
            {urlInput.startsWith("http") && (
              <div className="border rounded-lg p-2">
                <p className="text-xs text-muted-foreground mb-1">Preview</p>
                <div className="aspect-video rounded overflow-hidden bg-muted max-w-[200px]">
                  <img src={urlInput} alt="Preview" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Bulk URLs Tab */}
          <TabsContent value="bulk" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Paste multiple URLs (one per line)</Label>
              <textarea
                value={bulkUrls}
                onChange={(e) => setBulkUrls(e.target.value)}
                placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg"}
                className="mt-1 flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                rows={5}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {bulkUrls.split("\n").filter(u => u.trim().startsWith("http")).length} valid URL(s) detected
                </p>
                <Button
                  onClick={handleBulkAdd}
                  disabled={!bulkUrls.trim() || addBulkUrlsMutation.isPending}
                  size="sm"
                >
                  {addBulkUrlsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add All
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
