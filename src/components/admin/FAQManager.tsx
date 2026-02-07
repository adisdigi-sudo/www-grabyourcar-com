import { useState } from "react";
import { useFAQs } from "@/hooks/useCMSData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Edit, HelpCircle, GripVertical } from "lucide-react";

interface FAQFormData {
  id?: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

const defaultFAQ: FAQFormData = {
  question: '',
  answer: '',
  category: 'general',
  is_active: true,
  sort_order: 0,
};

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'buying', label: 'Car Buying' },
  { value: 'finance', label: 'Finance & Loans' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'hsrp', label: 'HSRP & FASTag' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'after-sales', label: 'After Sales' },
];

export function FAQManager() {
  const { data: faqs, isLoading, saveMutation, deleteMutation } = useFAQs();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQFormData>(defaultFAQ);
  const [activeCategory, setActiveCategory] = useState('all');

  const handleSave = async () => {
    await saveMutation.mutateAsync(editingFAQ);
    setIsDialogOpen(false);
    setEditingFAQ(defaultFAQ);
  };

  const handleEdit = (faq: any) => {
    setEditingFAQ({
      id: faq.id,
      question: faq.question || '',
      answer: faq.answer || '',
      category: faq.category || 'general',
      is_active: faq.is_active ?? true,
      sort_order: faq.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const filteredFAQs = faqs?.filter(f => 
    activeCategory === 'all' || f.category === activeCategory
  );

  const faqsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = faqs?.filter(f => f.category === cat.value) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">FAQs</h2>
          <p className="text-muted-foreground">Manage frequently asked questions for all pages</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingFAQ(defaultFAQ)}>
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFAQ.id ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
              <DialogDescription>Create helpful answers for common customer questions</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Question *</Label>
                <Input
                  value={editingFAQ.question}
                  onChange={(e) => setEditingFAQ(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="What documents are required to buy a car?"
                />
              </div>

              <div className="grid gap-2">
                <Label>Answer *</Label>
                <Textarea
                  value={editingFAQ.answer}
                  onChange={(e) => setEditingFAQ(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder="Provide a clear and helpful answer..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select 
                    value={editingFAQ.category}
                    onValueChange={(value) => setEditingFAQ(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={editingFAQ.sort_order}
                    onChange={(e) => setEditingFAQ(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Show this FAQ on the website</p>
                </div>
                <Switch
                  checked={editingFAQ.is_active}
                  onCheckedChange={(checked) => setEditingFAQ(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!editingFAQ.question || !editingFAQ.answer || saveMutation.isPending}
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingFAQ.id ? 'Update' : 'Create'} FAQ
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="all">
            All ({faqs?.length || 0})
          </TabsTrigger>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label} ({faqsByCategory[cat.value]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                FAQs
              </CardTitle>
              <CardDescription>
                {activeCategory === 'all' 
                  ? 'All frequently asked questions' 
                  : `FAQs for ${CATEGORIES.find(c => c.value === activeCategory)?.label}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredFAQs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No FAQs found. Add your first FAQ!
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFAQs?.map((faq, index) => (
                    <AccordionItem key={faq.id} value={faq.id} className={!faq.is_active ? 'opacity-60' : ''}>
                      <div className="flex items-center gap-2">
                        <AccordionTrigger className="flex-1 text-left hover:no-underline">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-sm w-6">
                              {index + 1}.
                            </span>
                            <span>{faq.question}</span>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 mr-4">
                          <Badge variant="outline" className="text-xs">
                            {CATEGORIES.find(c => c.value === faq.category)?.label}
                          </Badge>
                          {!faq.is_active && (
                            <Badge variant="secondary" className="text-xs">Hidden</Badge>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(faq)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => handleDelete(faq.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <AccordionContent className="text-muted-foreground pl-9">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FAQManager;
