import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CloudUpload, Link2, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminImageUploadProps {
  /** Current image URL value */
  value: string;
  /** Callback when image URL changes */
  onChange: (url: string) => void;
  /** Storage bucket name (default: car-assets) */
  bucket?: string;
  /** Folder path inside bucket */
  folder?: string;
  /** Label text */
  label?: string;
  /** Placeholder text for URL input */
  placeholder?: string;
  /** Recommended dimensions hint */
  recommendedSize?: string;
}

interface UploadState {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  fileName?: string;
}

export const AdminImageUpload = ({
  value,
  onChange,
  bucket = "car-assets",
  folder = "admin-uploads",
  label = "Image",
  placeholder = "https://example.com/image.jpg",
  recommendedSize,
}: AdminImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle", progress: 0 });
  const [urlInput, setUrlInput] = useState("");
  const [activeTab, setActiveTab] = useState<string>("upload");

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    setUploadState({ status: "uploading", progress: 30, fileName: file.name });

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      setUploadState(prev => ({ ...prev, progress: 80 }));

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      setUploadState({ status: "done", progress: 100, fileName: file.name });
      toast.success("Image uploaded successfully");
    } catch (err: any) {
      setUploadState({ status: "error", progress: 0, error: err.message, fileName: file.name });
      toast.error(`Upload failed: ${err.message}`);
    }
  }, [bucket, folder, onChange]);

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
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleUrlSubmit = () => {
    if (!urlInput.startsWith("http")) {
      toast.error("Enter a valid URL");
      return;
    }
    onChange(urlInput);
    setUrlInput("");
    toast.success("Image URL set");
  };

  const clearImage = () => {
    onChange("");
    setUploadState({ status: "idle", progress: 0 });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {recommendedSize && (
          <span className="text-[10px] text-muted-foreground">Recommended: {recommendedSize}</span>
        )}
      </div>

      {/* Current Image Preview */}
      {value && (
        <div className="relative rounded-lg overflow-hidden border bg-muted">
          <img
            src={value}
            alt="Preview"
            className="w-full h-32 object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={clearImage}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Upload Methods */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="upload" className="text-xs h-7">
            <CloudUpload className="h-3 w-3 mr-1" /> Upload File
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs h-7">
            <Link2 className="h-3 w-3 mr-1" /> Paste URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-2 space-y-2">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <CloudUpload className={cn("h-7 w-7 mx-auto mb-1", isDragOver ? "text-primary" : "text-muted-foreground/40")} />
            <p className="text-xs font-medium">
              {isDragOver ? "Drop image here" : "Drag & drop or click to browse"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP supported</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = '';
            }}
          />

          {/* Upload Progress */}
          {uploadState.status !== "idle" && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{uploadState.fileName}</p>
                {uploadState.status === "uploading" && <Progress value={uploadState.progress} className="h-1 mt-1" />}
              </div>
              {uploadState.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              {uploadState.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              {uploadState.status === "error" && <span title={uploadState.error}><AlertCircle className="h-4 w-4 text-destructive shrink-0" /></span>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="url" className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={placeholder}
              className="text-xs h-8"
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={!urlInput.startsWith("http")}
              size="sm"
              className="h-8 px-3"
              type="button"
            >
              Set
            </Button>
          </div>
          {urlInput.startsWith("http") && (
            <div className="border rounded p-1.5">
              <img
                src={urlInput}
                alt="Preview"
                className="h-20 w-full object-cover rounded"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Hidden fallback: raw URL input for accessibility */}
      {!value && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-xs h-7 opacity-0 absolute pointer-events-none"
          tabIndex={-1}
        />
      )}
    </div>
  );
};

export default AdminImageUpload;
