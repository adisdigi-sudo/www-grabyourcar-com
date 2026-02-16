import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageSquare, Edit, Eye, Save, Car, Shield, Banknote,
  ShoppingBag, Zap, RotateCcw, Sparkles, ArrowRight
} from "lucide-react";

interface JourneyTemplate {
  type: string;
  label: string;
  icon: typeof Car;
  color: string;
  description: string;
  variables: string[];
  defaultMessage: string;
  currentMessage: string;
}

const DEFAULT_TEMPLATES: JourneyTemplate[] = [
  {
    type: "car_to_insurance",
    label: "Car → Insurance",
    icon: Shield,
    color: "bg-green-100 text-green-700",
    description: "Sent to car buyers who haven't explored insurance",
    variables: ["{{name}}", "{{car_model}}", "{{city}}"],
    defaultMessage: "Hi {{name}}! 🚗 Congratulations on your car inquiry with Grabyourcar! Did you know we also offer the best car insurance deals? Protect your new ride with comprehensive coverage at unbeatable rates. Reply YES to get a free quote!",
    currentMessage: "Hi {{name}}! 🚗 Congratulations on your car inquiry with Grabyourcar! Did you know we also offer the best car insurance deals? Protect your new ride with comprehensive coverage at unbeatable rates. Reply YES to get a free quote!",
  },
  {
    type: "car_to_loan",
    label: "Car → Loan",
    icon: Banknote,
    color: "bg-purple-100 text-purple-700",
    description: "Sent to car inquiries without financing",
    variables: ["{{name}}", "{{car_model}}"],
    defaultMessage: "Hey {{name}}! 💰 Looking at cars on Grabyourcar? We can help you get pre-approved for a car loan with the lowest EMIs! Check your eligibility in 2 minutes — no documents needed. Reply YES to know more!",
    currentMessage: "Hey {{name}}! 💰 Looking at cars on Grabyourcar? We can help you get pre-approved for a car loan with the lowest EMIs! Check your eligibility in 2 minutes — no documents needed. Reply YES to know more!",
  },
  {
    type: "loan_to_car",
    label: "Loan → Car",
    icon: Car,
    color: "bg-blue-100 text-blue-700",
    description: "Sent to loan leads who haven't browsed cars",
    variables: ["{{name}}", "{{loan_amount}}"],
    defaultMessage: "Hi {{name}}! 🎉 Great news — your car loan eligibility looks strong! Now let's find your dream car. Browse 75+ models on Grabyourcar with the best deals. Reply YES and our advisor will share personalized recommendations!",
    currentMessage: "Hi {{name}}! 🎉 Great news — your car loan eligibility looks strong! Now let's find your dream car. Browse 75+ models on Grabyourcar with the best deals. Reply YES and our advisor will share personalized recommendations!",
  },
  {
    type: "insurance_to_accessories",
    label: "Insurance → Accessories",
    icon: ShoppingBag,
    color: "bg-orange-100 text-orange-700",
    description: "Sent to insured customers without accessory orders",
    variables: ["{{name}}"],
    defaultMessage: "Hey {{name}}! 🛡️ Your car is insured — now make it stunning! Check out premium car accessories on Grabyourcar: seat covers, dash cams, alloy wheels & more. Reply YES for exclusive member discounts!",
    currentMessage: "Hey {{name}}! 🛡️ Your car is insured — now make it stunning! Check out premium car accessories on Grabyourcar: seat covers, dash cams, alloy wheels & more. Reply YES for exclusive member discounts!",
  },
  {
    type: "car_to_accessories",
    label: "Car → Accessories",
    icon: ShoppingBag,
    color: "bg-amber-100 text-amber-700",
    description: "Sent to car buyers without accessory orders",
    variables: ["{{name}}", "{{car_model}}"],
    defaultMessage: "Hi {{name}}! 🚗✨ Complete your car purchase with premium accessories! We have 500+ products — floor mats, perfumes, phone holders & more. Reply YES for a special first-order discount!",
    currentMessage: "Hi {{name}}! 🚗✨ Complete your car purchase with premium accessories! We have 500+ products — floor mats, perfumes, phone holders & more. Reply YES for a special first-order discount!",
  },
  {
    type: "loan_to_insurance",
    label: "Loan → Insurance",
    icon: Shield,
    color: "bg-teal-100 text-teal-700",
    description: "Sent to loan leads without insurance",
    variables: ["{{name}}"],
    defaultMessage: "Hey {{name}}! 💳 Since you're exploring car financing, don't forget about insurance! Grabyourcar offers the best insurance deals bundled with your loan. Reply YES for a combined quote!",
    currentMessage: "Hey {{name}}! 💳 Since you're exploring car financing, don't forget about insurance! Grabyourcar offers the best insurance deals bundled with your loan. Reply YES for a combined quote!",
  },
];

export function JourneyTemplateEditor() {
  const [templates, setTemplates] = useState<JourneyTemplate[]>(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<JourneyTemplate | null>(null);
  const [editText, setEditText] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<JourneyTemplate | null>(null);

  const SAMPLE_DATA: Record<string, string> = {
    "{{name}}": "Rahul Sharma",
    "{{car_model}}": "Hyundai Creta",
    "{{city}}": "Mumbai",
    "{{loan_amount}}": "₹8,50,000",
  };

  const resolvePreview = (text: string) => {
    let resolved = text;
    for (const [key, val] of Object.entries(SAMPLE_DATA)) {
      resolved = resolved.split(key).join(val);
    }
    return resolved;
  };

  const startEdit = (template: JourneyTemplate) => {
    setEditingTemplate(template);
    setEditText(template.currentMessage);
  };

  const saveEdit = () => {
    if (!editingTemplate) return;
    setTemplates(prev =>
      prev.map(t => t.type === editingTemplate.type ? { ...t, currentMessage: editText } : t)
    );
    toast.success(`Template "${editingTemplate.label}" updated`);
    setEditingTemplate(null);
  };

  const resetTemplate = (type: string) => {
    setTemplates(prev =>
      prev.map(t => t.type === type ? { ...t, currentMessage: t.defaultMessage } : t)
    );
    toast.success("Template reset to default");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Journey Message Templates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize WhatsApp messages for each cross-sell journey
          </p>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {templates.map(template => {
            const Icon = template.icon;
            const charCount = template.currentMessage.length;
            const isModified = template.currentMessage !== template.defaultMessage;

            return (
              <Card key={template.type} className={isModified ? "border-primary/30" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${template.color} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{template.label}</span>
                        {isModified && <Badge className="bg-primary/10 text-primary border-0 text-[9px]">Modified</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{template.description}</p>

                      {/* Message Preview */}
                      <div className="bg-muted/40 rounded-lg p-3 mb-2">
                        <p className="text-xs whitespace-pre-wrap leading-relaxed">{template.currentMessage}</p>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{charCount} chars</span>
                        <div className="flex gap-1">
                          {template.variables.map(v => (
                            <Badge key={v} variant="outline" className="text-[9px] font-mono">{v}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] gap-1" onClick={() => startEdit(template)}>
                        <Edit className="h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1" onClick={() => setPreviewTemplate(template)}>
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                      {isModified && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1" onClick={() => resetTemplate(template.type)}>
                          <RotateCcw className="h-3 w-3" /> Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      {editingTemplate && (
        <Dialog open onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Edit className="h-4 w-4" /> Edit: {editingTemplate.label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Available Variables</Label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {editingTemplate.variables.map(v => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="text-[10px] font-mono cursor-pointer hover:bg-primary/10"
                      onClick={() => setEditText(prev => prev + " " + v)}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Message Template</Label>
                <Textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={6}
                  className="mt-1 text-sm font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">{editText.length} characters</p>
              </div>
              <div>
                <Label className="text-xs">Live Preview</Label>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 mt-1 border border-green-200 dark:border-green-800">
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{resolvePreview(editText)}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button onClick={saveEdit} className="gap-1.5">
                <Save className="h-4 w-4" /> Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">WhatsApp Preview</DialogTitle>
            </DialogHeader>
            <div className="bg-[#e5ddd5] dark:bg-[#1a1a1a] rounded-xl p-4">
              <div className="bg-white dark:bg-[#2a2a2a] rounded-lg p-3 shadow-sm max-w-[85%] ml-auto">
                <p className="text-xs whitespace-pre-wrap leading-relaxed">
                  {resolvePreview(previewTemplate.currentMessage)}
                </p>
                <p className="text-[9px] text-muted-foreground text-right mt-1">
                  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
