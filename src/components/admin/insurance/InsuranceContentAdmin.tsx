import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export function InsuranceContentAdmin() {
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-insurance-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_content")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, section_data }: { id: string; section_data: any }) => {
      const { error } = await supabase.from("insurance_content").update({ section_data }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-content"] });
      toast.success("Content updated!");
      setEditingSection(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const startEditing = (section: any) => {
    setEditingSection(section.id);
    setEditData(section.section_data || {});
  };

  const handleSave = (id: string) => {
    saveMutation.mutate({ id, section_data: editData });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Page Content Sections</CardTitle>
          <CardDescription>Edit all text, features, and data shown on the insurance page</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-4">
              {sections?.map((section) => (
                <Card key={section.id} className="border">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{section.section_title || section.section_key}</CardTitle>
                      <CardDescription className="text-xs">Key: {section.section_key}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {editingSection === section.id ? (
                        <>
                          <Button size="sm" onClick={() => handleSave(section.id)} disabled={saveMutation.isPending}>
                            <Save className="h-3 w-3 mr-1" />
                            {saveMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEditing(section)}>Edit</Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {editingSection === section.id ? (
                      <Textarea
                        value={JSON.stringify(editData, null, 2)}
                        onChange={(e) => {
                          try { setEditData(JSON.parse(e.target.value)); } catch {}
                        }}
                        className="font-mono text-xs min-h-[200px]"
                      />
                    ) : (
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40 font-mono">
                        {JSON.stringify(section.section_data, null, 2)}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))}
              {!sections?.length && <p className="text-sm text-muted-foreground text-center py-8">No content sections found</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
