import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, RotateCcw, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_MESSAGE = `🎨 *Wishing you a Colorful & Joyful Holi!* 🎉

May your journeys be filled with vibrant colors & happy memories.

*Happy Holi from Team GrabYourCar!* 🚗✨

👉 See our Holi greeting: https://grabyourcar.lovable.app/holi`;

const parseNumbers = (raw: string): string[] => {
  return raw
    .split(/[\n,;]+/)
    .map((n) => n.trim().replace(/[^0-9]/g, ""))
    .filter((n) => n.length >= 10)
    .map((n) => (n.length === 10 ? `91${n}` : n));
};

export const HoliBulkShare = () => {
  const [numbersRaw, setNumbersRaw] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);

  const numbers = useMemo(() => parseNumbers(numbersRaw), [numbersRaw]);
  const progress = numbers.length > 0 ? Math.round((currentIndex / numbers.length) * 100) : 0;
  const isDone = started && currentIndex >= numbers.length;

  const sendNext = () => {
    if (currentIndex >= numbers.length) return;
    if (!started) setStarted(true);
    const phone = numbers[currentIndex];
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setCurrentIndex((i) => i + 1);
  };

  const reset = () => {
    setCurrentIndex(0);
    setStarted(false);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    toast.success("Message copied!");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Holi Bulk WhatsApp Share
            <Badge variant="secondary" className="ml-auto">No API</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview */}
          <div className="rounded-xl overflow-hidden border max-w-[200px]">
            <img src="/images/holi-2026.png" alt="Holi poster" className="w-full h-auto" />
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Message Template</label>
              <Button variant="ghost" size="sm" onClick={copyMessage} className="h-7 text-xs gap-1">
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="text-sm"
            />
          </div>

          {/* Phone numbers */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Phone Numbers <span className="text-muted-foreground font-normal">(one per line or comma-separated)</span>
            </label>
            <Textarea
              placeholder="9855924442&#10;9876543210&#10;8765432109"
              value={numbersRaw}
              onChange={(e) => { setNumbersRaw(e.target.value); reset(); }}
              rows={5}
              className="text-sm font-mono"
            />
            {numbers.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{numbers.length} valid number(s) detected</p>
            )}
          </div>

          {/* Progress */}
          {started && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{currentIndex}/{numbers.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isDone ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                All {numbers.length} messages sent!
              </div>
            ) : (
              <Button
                onClick={sendNext}
                disabled={numbers.length === 0}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {started ? `Send Next (${currentIndex + 1}/${numbers.length})` : "Start Sending"}
              </Button>
            )}
            {started && (
              <Button variant="outline" onClick={reset} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Each click opens WhatsApp with the message pre-filled. Hit send in WhatsApp, come back, and click "Send Next" for the next number.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
