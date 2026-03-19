import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Save, RefreshCw, Brain, Zap } from "lucide-react";

export function WAAgentConfig() {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  const { data: knowledge = [], isLoading } = useQuery({
    queryKey: ["ai-knowledge-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_knowledge_base")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const addKnowledge = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim() || !newContent.trim()) throw new Error("Title and content required");
      const { error } = await supabase.from("ai_knowledge_base").insert({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        sort_order: knowledge.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-base"] });
      setNewTitle("");
      setNewContent("");
      toast.success("Knowledge added");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ai_knowledge_base")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-knowledge-base"] }),
  });

  const deleteKnowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_knowledge_base").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-base"] });
      toast.success("Knowledge entry removed");
    },
  });

  const CATEGORIES = ["company", "services", "policies", "contact", "products", "general"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl">
          <Brain className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">AI Agent Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">
            Configure what your AI bot knows. This powers WhatsApp, Website Chat, and CRM Assistant.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{knowledge.length}</p>
            <p className="text-xs text-muted-foreground">Knowledge Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{knowledge.filter((k: any) => k.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{new Set(knowledge.map((k: any) => k.category)).size}</p>
            <p className="text-xs text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Add New */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Knowledge Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Return Policy" />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Content</Label>
            <Textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Enter the knowledge content the AI should know..."
              rows={3}
            />
          </div>
          <Button onClick={() => addKnowledge.mutate()} disabled={addKnowledge.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </CardContent>
      </Card>

      {/* Knowledge List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading knowledge base...</p>
        ) : (
          knowledge.map((item: any) => (
            <Card key={item.id} className={!item.is_active ? "opacity-50" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{item.title}</h3>
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => toggleActive.mutate({ id: item.id, is_active: item.is_active })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteKnowledge.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
