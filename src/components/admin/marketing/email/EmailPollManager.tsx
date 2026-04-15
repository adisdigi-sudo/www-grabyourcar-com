import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, BarChart3, Vote, X } from "lucide-react";

interface Poll {
  id: string;
  question: string;
  options: string[];
  campaign_id: string | null;
  is_active: boolean;
  total_votes: number;
  created_at: string;
}

interface PollVote {
  poll_id: string;
  selected_option: string;
}

export function EmailPollManager() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);

  useEffect(() => { fetchPolls(); }, []);

  const fetchPolls = async () => {
    setIsLoading(true);
    const [pollsRes, votesRes] = await Promise.all([
      (supabase as any).from("email_polls").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("email_poll_votes").select("poll_id, selected_option"),
    ]);
    if (pollsRes.data) setPolls(pollsRes.data.map((p: any) => ({ ...p, options: Array.isArray(p.options) ? p.options : [] })));
    if (votesRes.data) setVotes(votesRes.data);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    const validOptions = newOptions.filter(o => o.trim());
    if (!newQuestion || validOptions.length < 2) { toast.error("Need question + at least 2 options"); return; }
    const { error } = await (supabase as any).from("email_polls").insert({
      question: newQuestion,
      options: validOptions,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Poll created");
    setIsCreateOpen(false);
    setNewQuestion("");
    setNewOptions(["", ""]);
    fetchPolls();
  };

  const togglePoll = async (id: string, active: boolean) => {
    await (supabase as any).from("email_polls").update({ is_active: active }).eq("id", id);
    fetchPolls();
  };

  const deletePoll = async (id: string) => {
    await (supabase as any).from("email_polls").delete().eq("id", id);
    toast.success("Poll deleted");
    fetchPolls();
  };

  const getVotesForPoll = (pollId: string) => votes.filter(v => v.poll_id === pollId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Vote className="h-4 w-4" />Email Polls</h3>
          <p className="text-xs text-muted-foreground">Embed polls in emails to boost engagement</p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="h-3 w-3 mr-1" />Create Poll</Button>
      </div>

      {polls.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No polls yet — create one to embed in your next campaign</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {polls.map(poll => {
            const pollVotes = getVotesForPoll(poll.id);
            const totalVotes = pollVotes.length;

            return (
              <Card key={poll.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm">{poll.question}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch checked={poll.is_active} onCheckedChange={v => togglePoll(poll.id, v)} />
                      <Button variant="ghost" size="icon" onClick={() => deletePoll(poll.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit">{totalVotes} votes</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {poll.options.map((opt: string) => {
                    const count = pollVotes.filter(v => v.selected_option === opt).length;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    return (
                      <div key={opt} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{opt}</span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Email Poll</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Question</Label>
              <Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Which car color do you prefer?" />
            </div>
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {newOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={opt} onChange={e => {
                      const updated = [...newOptions];
                      updated[i] = e.target.value;
                      setNewOptions(updated);
                    }} placeholder={`Option ${i + 1}`} />
                    {newOptions.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => setNewOptions(o => o.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
                {newOptions.length < 6 && (
                  <Button variant="outline" size="sm" onClick={() => setNewOptions(o => [...o, ""])}><Plus className="h-3 w-3 mr-1" />Add Option</Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Poll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
