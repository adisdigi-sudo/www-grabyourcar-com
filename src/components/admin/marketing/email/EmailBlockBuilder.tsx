import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Type, Image, MousePointerClick, LayoutGrid, Minus, Share2,
  GripVertical, Trash2, ChevronUp, ChevronDown, Plus, Eye,
  Save, Heading1, AlignLeft, Sparkles, Loader2
} from "lucide-react";

export interface EmailBlock {
  id: string;
  type: "header" | "hero_image" | "text" | "cta_button" | "car_card" | "offer" | "footer" | "divider" | "social_links";
  content: Record<string, string>;
}

const BLOCK_TYPES = [
  { type: "header", label: "Header", icon: Heading1, defaults: { text: "GrabYourCar", bgColor: "#1a1a2e", textColor: "#ffffff", fontSize: "28" } },
  { type: "hero_image", label: "Hero Image", icon: Image, defaults: { url: "https://placehold.co/600x250/1a1a2e/ffffff?text=Your+Banner", alt: "Banner Image" } },
  { type: "text", label: "Text Block", icon: AlignLeft, defaults: { text: "Write your email content here. Use this block for paragraphs, descriptions, and details.", fontSize: "16", textColor: "#333333" } },
  { type: "cta_button", label: "CTA Button", icon: MousePointerClick, defaults: { text: "Book Now →", url: "https://grabyourcar.com", bgColor: "#e63946", textColor: "#ffffff", align: "center" } },
  { type: "car_card", label: "Car Card", icon: LayoutGrid, defaults: { carName: "Hyundai Creta 2026", price: "₹12,50,000", imageUrl: "https://placehold.co/280x180/f0f0f0/333?text=Car+Image", features: "Sunroof • ADAS • Turbo" } },
  { type: "offer", label: "Offer Banner", icon: Sparkles, defaults: { title: "🔥 Limited Time Offer", subtitle: "Get up to ₹1.5 Lakh off on selected models", bgColor: "#fef3c7", borderColor: "#f59e0b" } },
  { type: "divider", label: "Divider", icon: Minus, defaults: { color: "#e5e7eb", thickness: "1" } },
  { type: "social_links", label: "Social Links", icon: Share2, defaults: { instagram: "https://instagram.com/grabyourcar", facebook: "https://facebook.com/grabyourcar", whatsapp: "https://wa.me/919876543210" } },
  { type: "footer", label: "Footer", icon: Type, defaults: { text: "© 2026 GrabYourCar. All rights reserved.", address: "New Delhi, India", unsubscribeText: "Unsubscribe", bgColor: "#f9fafb", textColor: "#6b7280" } },
] as const;

const generateId = () => Math.random().toString(36).slice(2, 10);

function blockToHtml(block: EmailBlock): string {
  const c = block.content;
  switch (block.type) {
    case "header":
      return `<div style="background-color:${c.bgColor || '#1a1a2e'};padding:24px 32px;text-align:center;">
        <h1 style="color:${c.textColor || '#fff'};font-size:${c.fontSize || 28}px;margin:0;font-family:Arial,sans-serif;">${c.text || ''}</h1>
      </div>`;
    case "hero_image":
      return `<div style="text-align:center;"><img src="${c.url}" alt="${c.alt || ''}" style="max-width:100%;height:auto;display:block;margin:0 auto;" /></div>`;
    case "text":
      return `<div style="padding:16px 32px;"><p style="color:${c.textColor || '#333'};font-size:${c.fontSize || 16}px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">${c.text || ''}</p></div>`;
    case "cta_button":
      return `<div style="text-align:${c.align || 'center'};padding:16px 32px;">
        <a href="${c.url || '#'}" style="background-color:${c.bgColor || '#e63946'};color:${c.textColor || '#fff'};padding:14px 32px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">${c.text || 'Click Here'}</a>
      </div>`;
    case "car_card":
      return `<div style="padding:16px 32px;"><div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;max-width:320px;margin:0 auto;">
        <img src="${c.imageUrl}" alt="${c.carName}" style="width:100%;height:180px;object-fit:cover;" />
        <div style="padding:16px;"><h3 style="margin:0 0 8px;font-family:Arial,sans-serif;">${c.carName}</h3>
        <p style="color:#e63946;font-size:20px;font-weight:bold;margin:0 0 8px;">${c.price}</p>
        <p style="color:#6b7280;font-size:13px;margin:0;">${c.features}</p></div></div></div>`;
    case "offer":
      return `<div style="padding:16px 32px;"><div style="background:${c.bgColor || '#fef3c7'};border:2px solid ${c.borderColor || '#f59e0b'};border-radius:12px;padding:24px;text-align:center;">
        <h2 style="margin:0 0 8px;font-family:Arial,sans-serif;">${c.title}</h2>
        <p style="margin:0;color:#92400e;font-family:Arial,sans-serif;">${c.subtitle}</p></div></div>`;
    case "divider":
      return `<div style="padding:8px 32px;"><hr style="border:none;border-top:${c.thickness || 1}px solid ${c.color || '#e5e7eb'};margin:0;" /></div>`;
    case "social_links":
      return `<div style="text-align:center;padding:16px 32px;">
        ${c.instagram ? `<a href="${c.instagram}" style="margin:0 8px;color:#e63946;text-decoration:none;font-family:Arial,sans-serif;">Instagram</a>` : ''}
        ${c.facebook ? `<a href="${c.facebook}" style="margin:0 8px;color:#1877f2;text-decoration:none;font-family:Arial,sans-serif;">Facebook</a>` : ''}
        ${c.whatsapp ? `<a href="${c.whatsapp}" style="margin:0 8px;color:#25d366;text-decoration:none;font-family:Arial,sans-serif;">WhatsApp</a>` : ''}
      </div>`;
    case "footer":
      return `<div style="background:${c.bgColor || '#f9fafb'};padding:24px 32px;text-align:center;">
        <p style="color:${c.textColor || '#6b7280'};font-size:12px;margin:0 0 4px;font-family:Arial,sans-serif;">${c.text}</p>
        <p style="color:${c.textColor || '#6b7280'};font-size:11px;margin:0 0 4px;font-family:Arial,sans-serif;">${c.address || ''}</p>
        <a href="#" style="color:${c.textColor || '#6b7280'};font-size:11px;">${c.unsubscribeText || 'Unsubscribe'}</a>
      </div>`;
    default:
      return '';
  }
}

function blocksToFullHtml(blocks: EmailBlock[]): string {
  const body = blocks.map(blockToHtml).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">${body}</div></body></html>`;
}

interface BlockEditorProps {
  block: EmailBlock;
  onChange: (content: Record<string, string>) => void;
}

function BlockEditor({ block, onChange }: BlockEditorProps) {
  const c = block.content;
  const update = (key: string, val: string) => onChange({ ...c, [key]: val });

  const fields: Record<string, { label: string; key: string; type?: string }[]> = {
    header: [{ label: "Text", key: "text" }, { label: "BG Color", key: "bgColor", type: "color" }, { label: "Text Color", key: "textColor", type: "color" }, { label: "Font Size", key: "fontSize" }],
    hero_image: [{ label: "Image URL", key: "url" }, { label: "Alt Text", key: "alt" }],
    text: [{ label: "Content", key: "text", type: "textarea" }, { label: "Font Size", key: "fontSize" }, { label: "Text Color", key: "textColor", type: "color" }],
    cta_button: [{ label: "Button Text", key: "text" }, { label: "Link URL", key: "url" }, { label: "BG Color", key: "bgColor", type: "color" }, { label: "Text Color", key: "textColor", type: "color" }],
    car_card: [{ label: "Car Name", key: "carName" }, { label: "Price", key: "price" }, { label: "Image URL", key: "imageUrl" }, { label: "Features", key: "features" }],
    offer: [{ label: "Title", key: "title" }, { label: "Subtitle", key: "subtitle" }, { label: "BG Color", key: "bgColor", type: "color" }, { label: "Border Color", key: "borderColor", type: "color" }],
    divider: [{ label: "Color", key: "color", type: "color" }, { label: "Thickness (px)", key: "thickness" }],
    social_links: [{ label: "Instagram URL", key: "instagram" }, { label: "Facebook URL", key: "facebook" }, { label: "WhatsApp URL", key: "whatsapp" }],
    footer: [{ label: "Text", key: "text" }, { label: "Address", key: "address" }, { label: "BG Color", key: "bgColor", type: "color" }],
  };

  return (
    <div className="space-y-2 p-3">
      {(fields[block.type] || []).map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          {f.type === "textarea" ? (
            <Textarea value={c[f.key] || ''} onChange={e => update(f.key, e.target.value)} rows={3} className="text-xs" />
          ) : f.type === "color" ? (
            <div className="flex gap-2 items-center">
              <input type="color" value={c[f.key] || '#000000'} onChange={e => update(f.key, e.target.value)} className="h-8 w-10 rounded cursor-pointer" />
              <Input value={c[f.key] || ''} onChange={e => update(f.key, e.target.value)} className="text-xs flex-1" />
            </div>
          ) : (
            <Input value={c[f.key] || ''} onChange={e => update(f.key, e.target.value)} className="text-xs" />
          )}
        </div>
      ))}
    </div>
  );
}

interface EmailBlockBuilderProps {
  onSaveTemplate?: (html: string, blocks: EmailBlock[]) => void;
  initialBlocks?: EmailBlock[];
  templateId?: string;
}

export function EmailBlockBuilder({ onSaveTemplate, initialBlocks, templateId }: EmailBlockBuilderProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveSubject, setSaveSubject] = useState("");
  const [saveCategory, setSaveCategory] = useState("custom");
  const [isSaving, setIsSaving] = useState(false);

  const addBlock = (type: string) => {
    const def = BLOCK_TYPES.find(b => b.type === type);
    if (!def) return;
    const newBlock: EmailBlock = { id: generateId(), type: def.type, content: { ...def.defaults } };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const updateBlockContent = useCallback((id: string, content: Record<string, string>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  }, []);

  const fullHtml = blocksToFullHtml(blocks);
  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  const handleSaveTemplate = async () => {
    if (!saveName) { toast.error("Template name required"); return; }
    setIsSaving(true);
    try {
      const payload = {
        name: saveName,
        subject: saveSubject || saveName,
        category: saveCategory,
        html_content: fullHtml,
        blocks_json: blocks as any,
        is_active: true,
      };

      if (templateId) {
        const { error } = await supabase.from("email_templates").update(payload).eq("id", templateId);
        if (error) throw error;
        toast.success("Template updated!");
      } else {
        const { error } = await supabase.from("email_templates").insert(payload);
        if (error) throw error;
        toast.success("Template saved!");
      }
      setIsSaveOpen(false);
      onSaveTemplate?.(fullHtml, blocks);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground mr-2">Add Block:</span>
              {BLOCK_TYPES.map(bt => (
                <Button key={bt.type} variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => addBlock(bt.type)}>
                  <bt.icon className="h-3 w-3" />{bt.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 ml-4">
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)} disabled={blocks.length === 0}>
                <Eye className="h-3 w-3 mr-1" />Preview
              </Button>
              <Button size="sm" onClick={() => setIsSaveOpen(true)} disabled={blocks.length === 0}>
                <Save className="h-3 w-3 mr-1" />Save Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Builder Layout */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Block List — left */}
        <div className="lg:col-span-2 space-y-2">
          <Label className="text-xs text-muted-foreground">Blocks ({blocks.length})</Label>
          {blocks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click "Add Block" above to start building your email</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {blocks.map((block, idx) => {
                const bt = BLOCK_TYPES.find(b => b.type === block.type);
                const Icon = bt?.icon || Type;
                return (
                  <div
                    key={block.id}
                    className={`flex items-center gap-2 border rounded-lg p-2 cursor-pointer transition-colors ${selectedBlockId === block.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedBlockId(block.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">{bt?.label || block.type}</span>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); moveBlock(block.id, -1); }} disabled={idx === 0}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); moveBlock(block.id, 1); }} disabled={idx === blocks.length - 1}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); removeBlock(block.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Block Editor */}
          {selectedBlock && (
            <Card className="mt-3">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm">Edit: {BLOCK_TYPES.find(b => b.type === selectedBlock.type)?.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-3">
                <BlockEditor block={selectedBlock} onChange={content => updateBlockContent(selectedBlock.id, content)} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live Preview — right */}
        <div className="lg:col-span-3">
          <Label className="text-xs text-muted-foreground mb-2 block">Live Preview</Label>
          <Card className="overflow-hidden">
            <div className="bg-muted/30 p-4">
              <div className="bg-white mx-auto shadow-md rounded-lg overflow-hidden" style={{ maxWidth: 600 }}>
                {blocks.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground text-sm">Add blocks to see preview</div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: blocks.map(blockToHtml).join('') }} />
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Full Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />Full Email Preview</DialogTitle></DialogHeader>
          <ScrollArea className="h-[65vh] border rounded-lg bg-muted/30 p-4">
            <div className="bg-white mx-auto shadow-md rounded-lg overflow-hidden" style={{ maxWidth: 600 }} dangerouslySetInnerHTML={{ __html: fullHtml }} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Save Template Modal */}
      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="e.g., Corporate Welcome Email" value={saveName} onChange={e => setSaveName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input placeholder="e.g., Welcome to GrabYourCar!" value={saveSubject} onChange={e => setSaveSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={saveCategory} onValueChange={setSaveCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
