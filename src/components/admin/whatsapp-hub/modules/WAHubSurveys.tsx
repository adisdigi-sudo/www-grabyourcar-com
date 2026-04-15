import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Trash2, GripVertical, Play, Pause,
  BarChart3, MessageSquare, ListChecks, Star, ThumbsUp,
  Hash, Type, CheckSquare, ArrowRight, Eye, Send, Users,
  TrendingUp, PieChart
} from "lucide-react";
import { format } from "date-fns";

type QuestionType = "multiple_choice" | "rating" | "yes_no" | "open_text" | "nps";

interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
}

interface Survey {
  id: string;
  name: string;
  description: string;
  questions: SurveyQuestion[];
  is_active: boolean;
  total_responses: number;
  created_at: string;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ElementType }[] = [
  { value: "multiple_choice", label: "Multiple Choice", icon: ListChecks },
  { value: "rating", label: "Star Rating (1-5)", icon: Star },
  { value: "yes_no", label: "Yes / No", icon: ThumbsUp },
  { value: "open_text", label: "Open Text", icon: Type },
  { value: "nps", label: "NPS Score (0-10)", icon: Hash },
];

// ─── Survey Builder Dialog ───
function SurveyBuilder({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (survey: Partial<Survey>) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    { id: "q1", text: "", type: "multiple_choice", options: ["Option 1", "Option 2"], required: true },
  ]);

  const addQuestion = () => {
    setQuestions([...questions, {
      id: `q${Date.now()}`,
      text: "",
      type: "multiple_choice",
      options: ["Option 1", "Option 2"],
      required: true,
    }]);
  };

  const updateQuestion = (idx: number, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const addOption = (qIdx: number) => {
    const q = questions[qIdx];
    updateQuestion(qIdx, { options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] });
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const q = questions[qIdx];
    const opts = [...(q.options || [])];
    opts[oIdx] = value;
    updateQuestion(qIdx, { options: opts });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const q = questions[qIdx];
    if ((q.options?.length || 0) <= 2) return;
    updateQuestion(qIdx, { options: q.options?.filter((_, i) => i !== oIdx) });
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Survey name required"); return; }
    if (questions.some(q => !q.text.trim())) { toast.error("All questions need text"); return; }
    onSave({ name, description, questions, is_active: false, total_responses: 0 });
    setName(""); setDescription(""); setQuestions([{ id: "q1", text: "", type: "multiple_choice", options: ["Option 1", "Option 2"], required: true }]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Create Chat Survey
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Survey Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Post-Purchase Feedback" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." className="mt-1" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Questions ({questions.length})</h4>
              <Button size="sm" variant="outline" onClick={addQuestion}><Plus className="h-3.5 w-3.5 mr-1" /> Add Question</Button>
            </div>

            {questions.map((q, qIdx) => (
              <Card key={q.id} className="border-l-4 border-l-primary/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1 mt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="text-[10px]">Q{qIdx + 1}</Badge>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={q.text}
                        onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                        placeholder="Enter your question..."
                        className="font-medium"
                      />
                      <div className="flex items-center gap-3">
                        <Select value={q.type} onValueChange={(v) => updateQuestion(qIdx, { type: v as QuestionType })}>
                          <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {QUESTION_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>
                                <div className="flex items-center gap-2">
                                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Switch checked={q.required} onCheckedChange={(v) => updateQuestion(qIdx, { required: v })} />
                          <span className="text-[10px] text-muted-foreground">Required</span>
                        </div>
                      </div>

                      {q.type === "multiple_choice" && (
                        <div className="space-y-1.5 pl-2 border-l-2 border-muted">
                          {q.options?.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                className="h-7 text-xs flex-1"
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeOption(qIdx, oIdx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addOption(qIdx)}>
                            <Plus className="h-3 w-3 mr-1" /> Add Option
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeQuestion(qIdx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="gap-1"><ClipboardList className="h-4 w-4" /> Create Survey</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Phone Preview ───
function SurveyPhonePreview({ survey }: { survey: Survey | null }) {
  if (!survey) return (
    <Card className="h-full flex items-center justify-center">
      <p className="text-xs text-muted-foreground">Select a survey to preview</p>
    </Card>
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-blue-500" /> Chat Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mx-auto w-[260px] bg-gray-900 rounded-[2rem] p-2.5 shadow-xl">
          <div className="bg-white dark:bg-gray-800 rounded-[1.5rem] overflow-hidden">
            <div className="bg-green-600 text-white px-3 py-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold">G</div>
              <div>
                <p className="text-xs font-semibold">GrabYourCar</p>
                <p className="text-[9px] opacity-75">online</p>
              </div>
            </div>
            <div className="p-2.5 bg-[#e5ddd5] dark:bg-gray-700 min-h-[280px] space-y-2">
              {/* Bot greeting */}
              <div className="bg-white rounded-lg p-2 shadow-sm max-w-[210px] text-[11px]">
                📋 <strong>{survey.name}</strong>
                {survey.description && <p className="text-gray-500 mt-0.5">{survey.description}</p>}
              </div>

              {survey.questions.slice(0, 3).map((q, i) => (
                <div key={q.id}>
                  <div className="bg-white rounded-lg p-2 shadow-sm max-w-[210px] text-[11px]">
                    <p className="font-medium">Q{i + 1}: {q.text || "..."}</p>
                    {q.type === "multiple_choice" && q.options && (
                      <div className="mt-1 space-y-0.5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="bg-green-50 rounded px-1.5 py-0.5 text-[10px] border border-green-200">
                            {oi + 1}️⃣ {opt}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type === "rating" && <p className="text-[10px] mt-1">⭐ Reply 1-5</p>}
                    {q.type === "yes_no" && <p className="text-[10px] mt-1">👍 Yes  |  👎 No</p>}
                    {q.type === "nps" && <p className="text-[10px] mt-1">Reply 0-10</p>}
                  </div>
                  {/* Simulated user reply */}
                  <div className="flex justify-end mt-1">
                    <div className="bg-[#dcf8c6] rounded-lg px-2 py-1 text-[10px] shadow-sm">
                      {q.type === "multiple_choice" ? "1" : q.type === "rating" ? "⭐⭐⭐⭐⭐" : q.type === "yes_no" ? "Yes" : q.type === "nps" ? "9" : "Great service!"}
                    </div>
                  </div>
                </div>
              ))}

              {survey.questions.length > 3 && (
                <p className="text-center text-[9px] text-gray-500">+{survey.questions.length - 3} more questions...</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Surveys Module ───
export function WAHubSurveys() {
  const qc = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  const { data: surveys, isLoading } = useQuery({
    queryKey: ["wa-surveys"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_flows")
        .select("*")
        .eq("trigger_type", "survey")
        .order("created_at", { ascending: false });
      return (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description || "",
        questions: (f.nodes as any[]) || [],
        is_active: f.is_active,
        total_responses: f.total_completions || 0,
        created_at: f.created_at,
      })) as Survey[];
    },
  });

  const createSurvey = useMutation({
    mutationFn: async (survey: Partial<Survey>) => {
      const { error } = await supabase.from("wa_flows").insert({
        name: survey.name,
        description: survey.description,
        trigger_type: "survey",
        trigger_value: `survey_${Date.now()}`,
        nodes: survey.questions as any,
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Survey created!");
      qc.invalidateQueries({ queryKey: ["wa-surveys"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleSurvey = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from("wa_flows").update({ is_active: active }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-surveys"] }),
  });

  const deleteSurvey = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("wa_flows").delete().eq("id", id);
    },
    onSuccess: () => {
      toast.success("Survey deleted");
      qc.invalidateQueries({ queryKey: ["wa-surveys"] });
      setSelectedSurvey(null);
    },
  });

  // KPIs
  const totalSurveys = surveys?.length || 0;
  const activeSurveys = surveys?.filter(s => s.is_active).length || 0;
  const totalResponses = surveys?.reduce((s, sv) => s + sv.total_responses, 0) || 0;
  const avgCompletion = totalSurveys > 0 ? Math.round(totalResponses / totalSurveys) : 0;

  const kpis = [
    { label: "Total Surveys", value: totalSurveys, icon: ClipboardList, color: "text-primary" },
    { label: "Active", value: activeSurveys, icon: Play, color: "text-green-500" },
    { label: "Total Responses", value: totalResponses, icon: Users, color: "text-blue-500" },
    { label: "Avg Responses", value: avgCompletion, icon: TrendingUp, color: "text-amber-500" },
  ];

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2">
        {kpis.map(k => (
          <Card key={k.label} className="p-3">
            <div className="flex items-center gap-2">
              <k.icon className={`h-4 w-4 ${k.color}`} />
              <div>
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Mini Chat Surveys</h3>
          <p className="text-xs text-muted-foreground">Interactive multi-step surveys sent via WhatsApp</p>
        </div>
        <Button size="sm" onClick={() => setShowBuilder(true)}><Plus className="h-4 w-4 mr-1" /> Create Survey</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Survey List */}
        <div className="col-span-2 space-y-2">
          {(surveys || []).length === 0 ? (
            <Card className="p-12 text-center">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No surveys yet. Create your first one!</p>
            </Card>
          ) : (surveys || []).map(survey => (
            <Card
              key={survey.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedSurvey?.id === survey.id ? "ring-2 ring-primary/50" : ""}`}
              onClick={() => setSelectedSurvey(survey)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${survey.is_active ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{survey.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{survey.questions.length} questions</Badge>
                        <Badge variant={survey.is_active ? "default" : "secondary"} className="text-[10px]">
                          {survey.is_active ? "Active" : "Draft"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{survey.total_responses} responses</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={survey.is_active}
                      onCheckedChange={(v) => { toggleSurvey.mutate({ id: survey.id, active: v }); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm("Delete survey?")) deleteSurvey.mutate(survey.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview */}
        <SurveyPhonePreview survey={selectedSurvey} />
      </div>

      <SurveyBuilder open={showBuilder} onClose={() => setShowBuilder(false)} onSave={(s) => createSurvey.mutate(s)} />
    </div>
  );
}
