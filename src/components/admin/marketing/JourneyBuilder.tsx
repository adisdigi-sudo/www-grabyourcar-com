import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, Plus, Edit, Trash2, Play, Pause, Users, CheckCircle,
  Mail, MessageSquare, Clock, GitBranch, ArrowRight, Settings,
  Save, Eye, Copy, MoreHorizontal
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Journey {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: any;
  is_active: boolean;
  total_enrolled: number;
  total_completed: number;
  total_converted: number;
  created_at: string;
}

interface JourneyStep {
  id: string;
  journey_id: string;
  step_order: number;
  step_type: string;
  step_config: any;
  template_id: string | null;
  delay_days: number;
  delay_hours: number;
  delay_minutes: number;
  is_active: boolean;
}

const TRIGGER_TYPES = [
  { value: "form_submit", label: "Form Submission", icon: "📝" },
  { value: "page_view", label: "Page View", icon: "👁️" },
  { value: "manual", label: "Manual Enrollment", icon: "✋" },
  { value: "scheduled", label: "Scheduled", icon: "📅" },
  { value: "segment_entry", label: "Segment Entry", icon: "👥" },
  { value: "event", label: "Custom Event", icon: "⚡" },
];

const STEP_TYPES = [
  { value: "email", label: "Send Email", icon: Mail, color: "bg-blue-500" },
  { value: "whatsapp", label: "Send WhatsApp", icon: MessageSquare, color: "bg-green-500" },
  { value: "wait", label: "Wait/Delay", icon: Clock, color: "bg-orange-500" },
  { value: "condition", label: "Condition", icon: GitBranch, color: "bg-purple-500" },
];

export function JourneyBuilder() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([]);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newJourney, setNewJourney] = useState({
    name: "",
    description: "",
    trigger_type: "form_submit",
    trigger_config: {},
  });
  const [newStep, setNewStep] = useState({
    step_type: "email",
    template_id: "",
    delay_days: 0,
    delay_hours: 0,
    delay_minutes: 0,
    step_config: {},
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchJourneys();
  }, []);

  useEffect(() => {
    if (selectedJourney) {
      fetchJourneySteps(selectedJourney.id);
    }
  }, [selectedJourney]);

  const fetchJourneys = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("journey_automations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJourneys(data || []);
    } catch (error) {
      console.error("Error fetching journeys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJourneySteps = async (journeyId: string) => {
    try {
      const { data, error } = await supabase
        .from("journey_steps")
        .select("*")
        .eq("journey_id", journeyId)
        .order("step_order");

      if (error) throw error;
      setJourneySteps(data || []);
    } catch (error) {
      console.error("Error fetching steps:", error);
    }
  };

  const handleCreateJourney = async () => {
    if (!newJourney.name) {
      toast({ title: "Error", description: "Journey name is required", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("journey_automations")
        .insert([{
          name: newJourney.name,
          description: newJourney.description,
          trigger_type: newJourney.trigger_type,
          trigger_config: newJourney.trigger_config,
          is_active: false,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Journey created", description: "Now add steps to your automation" });
      setIsCreating(false);
      setNewJourney({ name: "", description: "", trigger_type: "form_submit", trigger_config: {} });
      fetchJourneys();
      if (data) setSelectedJourney(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (journey: Journey) => {
    try {
      const { error } = await supabase
        .from("journey_automations")
        .update({ is_active: !journey.is_active })
        .eq("id", journey.id);

      if (error) throw error;

      toast({ 
        title: journey.is_active ? "Journey paused" : "Journey activated",
        description: journey.is_active ? "Automation stopped" : "Leads will now be enrolled"
      });
      fetchJourneys();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddStep = async () => {
    if (!selectedJourney) return;

    try {
      const stepOrder = journeySteps.length + 1;
      const { error } = await supabase
        .from("journey_steps")
        .insert([{
          journey_id: selectedJourney.id,
          step_order: stepOrder,
          step_type: newStep.step_type,
          template_id: newStep.template_id || null,
          delay_days: newStep.delay_days,
          delay_hours: newStep.delay_hours,
          delay_minutes: newStep.delay_minutes,
          step_config: newStep.step_config,
          is_active: true,
        }]);

      if (error) throw error;

      toast({ title: "Step added", description: `Step ${stepOrder} added to journey` });
      setIsAddingStep(false);
      setNewStep({ step_type: "email", template_id: "", delay_days: 0, delay_hours: 0, delay_minutes: 0, step_config: {} });
      fetchJourneySteps(selectedJourney.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteJourney = async (id: string) => {
    if (!confirm("Delete this journey and all its steps?")) return;

    try {
      const { error } = await supabase
        .from("journey_automations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Journey deleted" });
      if (selectedJourney?.id === id) setSelectedJourney(null);
      fetchJourneys();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStepIcon = (type: string) => {
    const step = STEP_TYPES.find(s => s.value === type);
    return step ? step.icon : Clock;
  };

  const getStepColor = (type: string) => {
    const step = STEP_TYPES.find(s => s.value === type);
    return step?.color || "bg-gray-500";
  };

  const formatDelay = (days: number, hours: number, minutes: number) => {
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.length > 0 ? parts.join(" ") : "Immediately";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            Journey Automations
          </h2>
          <p className="text-sm text-muted-foreground">
            Create drip campaigns with email and WhatsApp sequences
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Journey
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Journeys List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Your Journeys</CardTitle>
            <CardDescription>{journeys.length} automations</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {journeys.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No journeys yet</p>
                    <p className="text-xs">Create your first automation</p>
                  </div>
                ) : (
                  journeys.map((journey) => (
                    <motion.div
                      key={journey.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        selectedJourney?.id === journey.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                      )}
                      onClick={() => setSelectedJourney(journey)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{journey.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {journey.description || "No description"}
                          </p>
                        </div>
                        <Switch
                          checked={journey.is_active}
                          onCheckedChange={() => handleToggleActive(journey)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {journey.total_enrolled}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {journey.total_completed}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {TRIGGER_TYPES.find(t => t.value === journey.trigger_type)?.label || journey.trigger_type}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Journey Builder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedJourney ? selectedJourney.name : "Select a Journey"}
                </CardTitle>
                <CardDescription>
                  {selectedJourney ? "Configure automation steps" : "Choose from the list to edit"}
                </CardDescription>
              </div>
              {selectedJourney && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAddingStep(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Step
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteJourney(selectedJourney.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedJourney ? (
              <div className="text-center py-20 text-muted-foreground">
                <GitBranch className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Select a journey to view and edit steps</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Trigger Card */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                    {TRIGGER_TYPES.find(t => t.value === selectedJourney.trigger_type)?.icon || "⚡"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Trigger</p>
                    <p className="font-medium">
                      {TRIGGER_TYPES.find(t => t.value === selectedJourney.trigger_type)?.label}
                    </p>
                  </div>
                  <Badge variant={selectedJourney.is_active ? "default" : "secondary"}>
                    {selectedJourney.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>

                {/* Steps Flow */}
                <div className="border-l-2 border-dashed border-muted-foreground/30 ml-5 pl-6 space-y-4">
                  <AnimatePresence>
                    {journeySteps.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No steps yet. Add your first action.</p>
                      </div>
                    ) : (
                      journeySteps.map((step, index) => {
                        const StepIcon = getStepIcon(step.step_type);
                        return (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="relative"
                          >
                            {/* Connector dot */}
                            <div className={cn(
                              "absolute -left-8 w-4 h-4 rounded-full border-2 border-background",
                              getStepColor(step.step_type)
                            )} />
                            
                            <Card className="bg-muted/30">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                                    getStepColor(step.step_type)
                                  )}>
                                    <StepIcon className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">Step {step.step_order}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {STEP_TYPES.find(s => s.value === step.step_type)?.label}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Wait: {formatDelay(step.delay_days, step.delay_hours, step.delay_minutes)}
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Journey Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Journey</DialogTitle>
            <DialogDescription>Set up your automation trigger and basic details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Journey Name</Label>
              <Input
                placeholder="e.g., Welcome Series"
                value={newJourney.name}
                onChange={(e) => setNewJourney({ ...newJourney, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What does this journey do?"
                value={newJourney.description}
                onChange={(e) => setNewJourney({ ...newJourney, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select 
                value={newJourney.trigger_type} 
                onValueChange={(v) => setNewJourney({ ...newJourney, trigger_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <span className="flex items-center gap-2">
                        <span>{trigger.icon}</span>
                        {trigger.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateJourney}>
              <Zap className="h-4 w-4 mr-2" />
              Create Journey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Step Dialog */}
      <Dialog open={isAddingStep} onOpenChange={setIsAddingStep}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Journey Step</DialogTitle>
            <DialogDescription>Configure the action and timing for this step</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Step Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {STEP_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    variant={newStep.step_type === type.value ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setNewStep({ ...newStep, step_type: type.value })}
                  >
                    <type.icon className="h-4 w-4 mr-2" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Wait Before Sending</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newStep.delay_days}
                    onChange={(e) => setNewStep({ ...newStep, delay_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={newStep.delay_hours}
                    onChange={(e) => setNewStep({ ...newStep, delay_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Minutes</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={newStep.delay_minutes}
                    onChange={(e) => setNewStep({ ...newStep, delay_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingStep(false)}>Cancel</Button>
            <Button onClick={handleAddStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
