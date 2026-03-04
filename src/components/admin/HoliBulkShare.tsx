import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, RotateCcw, CheckCircle2, Copy, Image, Zap } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_TEMPLATES = [
  {
    name: "🎨 Holi Greeting",
    message: `🎨 *Wishing you a Colorful & Joyful Holi!* 🎉\n\nMay your journeys be filled with vibrant colors & happy memories.\n\n*Happy Holi from Team GrabYourCar!* 🚗✨\n\n👉 https://grabyourcar.lovable.app/holi`,
  },
  {
    name: "🚗 New Car Offer",
    message: `🚗 *Exciting Offer from GrabYourCar!*\n\n🔥 Get the best deals on your dream car this season!\n💰 Lowest on-road prices\n📋 Free insurance quotes\n🎁 Special festive discounts\n\n👉 Visit: https://grabyourcar.lovable.app\n📞 Call us: 9855924442`,
  },
  {
    name: "🛡️ Insurance Offer",
    message: `🛡️ *Car Insurance Renewal Reminder!*\n\nDon't let your insurance lapse! Renew with GrabYourCar for:\n✅ Best premiums\n✅ Instant policy\n✅ Zero paperwork\n\n👉 https://grabyourcar.lovable.app/car-insurance\n📞 9855924442`,
  },
  {
    name: "📢 General Promo",
    message: `👋 *Hello from GrabYourCar!*\n\nWe have something special for you! 🎁\n\n👉 https://grabyourcar.lovable.app\n📞 9855924442`,
  },
];

const parseNumbers = (raw: string): string[] => {
  return raw
    .split(/[\n,;]+/)
    .map((n) => n.trim().replace(/[^0-9]/g, ""))
    .filter((n) => n.length >= 10)
    .map((n) => (n.length === 10 ? `91${n}` : n));
};

export const HoliBulkShare = () => {
  const [numbersRaw, setNumbersRaw] = useState("");
  const [message, setMessage] = useState(SAMPLE_TEMPLATES[0].message);
  const [imageUrl, setImageUrl] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  const numbers = useMemo(() => parseNumbers(numbersRaw), [numbersRaw]);
  const progress = numbers.length > 0 ? Math.round((currentIndex / numbers.length) * 100) : 0;
  const isDone = started && currentIndex >= numbers.length;

  const buildUrl = (phone: string) => {
    const fullMsg = imageUrl
      ? `${message}\n\n📷 ${imageUrl}`
      : message;
    return `https://wa.me/${phone}?text=${encodeURIComponent(fullMsg)}`;
  };

  const sendNext = () => {
    if (currentIndex >= numbers.length) return;
    if (!started) setStarted(true);
    const phone = numbers[currentIndex];
    window.open(buildUrl(phone), "_blank");
    setCurrentIndex((i) => i + 1);
  };

  const reset = () => {
    setCurrentIndex(0);
    setStarted(false);
    setAutoMode(false);
  };

  const copyMessage = () => {
    const fullMsg = imageUrl ? `${message}\n\n📷 ${imageUrl}` : message;
    navigator.clipboard.writeText(fullMsg);
    toast.success("Message copied!");
  };

  const applyTemplate = (tpl: typeof SAMPLE_TEMPLATES[0]) => {
    setMessage(tpl.message);
    reset();
    toast.success(`"${tpl.name}" template loaded`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">WhatsApp Bulk Broadcaster</h2>
          <p className="text-sm text-muted-foreground">Send offers, posts & messages from your personal WhatsApp — no API needed</p>
        </div>
        <Badge variant="secondary" className="ml-auto">Personal Number</Badge>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_TEMPLATES.map((tpl) => (
              <Button
                key={tpl.name}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => applyTemplate(tpl)}
              >
                {tpl.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Message Composer */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Message</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyMessage} className="h-7 text-xs gap-1">
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Type your broadcast message here..."
              className="text-sm"
            />
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                <Image className="h-3 w-3" /> Image/Link URL (optional)
              </label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://grabyourcar.lovable.app/images/offer.png"
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Phone Numbers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Phone Numbers
              {numbers.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">{numbers.length} contacts</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder={"Paste numbers here:\n9855924442\n9876543210\n8765432109"}
              value={numbersRaw}
              onChange={(e) => { setNumbersRaw(e.target.value); reset(); }}
              rows={8}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              One per line, comma, or semicolon separated. 10-digit or with country code.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Send Controls */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {/* Progress */}
          {started && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sending progress</span>
                <span className="font-semibold">{currentIndex} / {numbers.length}</span>
              </div>
              <Progress value={progress} className="h-2.5" />
            </div>
          )}

          <div className="flex items-center gap-3">
            {isDone ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                All {numbers.length} messages opened! 🎉
              </div>
            ) : (
              <Button
                onClick={sendNext}
                disabled={numbers.length === 0 || !message.trim()}
                size="lg"
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {started ? `Send Next (${currentIndex + 1} of ${numbers.length})` : `Start Sending to ${numbers.length || 0} contacts`}
              </Button>
            )}
            {started && (
              <Button variant="outline" onClick={reset} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <strong>How it works:</strong> Each click opens WhatsApp Web/App with the message pre-filled for one contact.
            Hit send in WhatsApp → come back here → click "Send Next" for the next contact.
            Your message is sent from your number <strong>9855924442</strong>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
