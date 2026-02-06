import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Send, Bot, User, Car, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  carData?: any;
  status?: "pending" | "success" | "error";
}

export const AICarChatAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `👋 Hi! I'm your AI Car Data Assistant. I can help you add cars to your database using natural language.

**Just tell me what car you want to add**, for example:
- "Add Maruti Swift 2024"
- "Create entry for Hyundai Creta facelift"
- "I want to add the new Tata Curvv EV"

I'll generate complete data including variants, colors, specifications, and pricing for the Indian market. Ready when you are!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const extractCarName = (text: string): string | null => {
    // Common patterns for car addition requests
    const patterns = [
      /add\s+(?:the\s+)?(?:new\s+)?(.+?)(?:\s+to\s+database)?$/i,
      /create\s+(?:entry\s+)?(?:for\s+)?(?:the\s+)?(?:new\s+)?(.+?)$/i,
      /generate\s+(?:data\s+)?(?:for\s+)?(?:the\s+)?(?:new\s+)?(.+?)$/i,
      /i\s+want\s+to\s+add\s+(?:the\s+)?(?:new\s+)?(.+?)$/i,
      /(?:please\s+)?(?:can\s+you\s+)?add\s+(.+?)$/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no pattern matches but text looks like a car name
    const words = text.trim().split(/\s+/);
    if (words.length >= 2 && words.length <= 6) {
      // Check if first word could be a brand
      const brands = ["maruti", "hyundai", "tata", "mahindra", "kia", "toyota", "honda", "mg", "skoda", "volkswagen", "bmw", "mercedes", "audi"];
      if (brands.some(b => text.toLowerCase().includes(b))) {
        return text.trim();
      }
    }

    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const carName = extractCarName(input);

    if (!carName) {
      // Just a conversation, not a car addition request
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I understand you said: "${input}"

To add a car, please tell me the car name like:
- "Add Maruti Swift 2024"
- "Create Hyundai Venue"
- "Generate data for Tata Nexon EV"

What car would you like me to add?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      return;
    }

    // Add processing message
    const processingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `🔄 Generating complete data for **${carName}**...

This includes:
- Variant details with pricing
- Color options with hex codes  
- Technical specifications
- Features and highlights

Please wait a moment...`,
      timestamp: new Date(),
      status: "pending",
    };
    setMessages((prev) => [...prev, processingMessage]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Please log in to add cars");
      }

      // First, generate preview
      const previewResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-car-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ carName, saveToDatabase: false }),
        }
      );

      if (!previewResponse.ok) {
        const error = await previewResponse.json();
        throw new Error(error.error || "Failed to generate car data");
      }

      const previewResult = await previewResponse.json();
      const carData = previewResult.data;

      // Update with preview
      const previewMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `✅ Generated data for **${carData.brand} ${carData.name}**!

**Summary:**
- **Body Type:** ${carData.body_type}
- **Variants:** ${carData.variants.length} (${carData.variants.map((v: any) => v.name).join(", ")})
- **Colors:** ${carData.colors.length} options
- **Specifications:** ${carData.specifications.length} specs
- **Features:** ${carData.features.length} features

**Price Range:** ${carData.variants[0]?.price} - ${carData.variants[carData.variants.length - 1]?.price}

---

Would you like me to **save this to the database**? Just say "yes" or "save it"!`,
        timestamp: new Date(),
        carData,
        status: "success",
      };

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = previewMessage;
        return updated;
      });
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `❌ **Error:** ${error instanceof Error ? error.message : "Something went wrong"}

Please try again or check if you're logged in to the admin panel.`,
        timestamp: new Date(),
        status: "error",
      };

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = errorMessage;
        return updated;
      });
      toast.error("Failed to generate car data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfirmation = async () => {
    const lastCarMessage = [...messages].reverse().find((m) => m.carData);
    if (!lastCarMessage?.carData) {
      toast.error("No car data to save");
      return;
    }

    setIsLoading(true);
    const carData = lastCarMessage.carData;

    const savingMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `💾 Saving **${carData.brand} ${carData.name}** to database...`,
      timestamp: new Date(),
      status: "pending",
    };
    setMessages((prev) => [...prev, savingMessage]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Please log in to save cars");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-car-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ carName: `${carData.brand} ${carData.name}`, saveToDatabase: true }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save car");
      }

      const result = await response.json();

      const successMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `🎉 **Success!** ${carData.brand} ${carData.name} has been added to your database!

**What was created:**
- ✅ Car entry with all basic details
- ✅ ${carData.variants.length} variants with pricing
- ✅ ${carData.colors.length} color options
- ✅ ${carData.specifications.length} specifications
- ✅ ${carData.features.length} features

${result.warnings?.length ? `\n⚠️ Some warnings: ${result.warnings.join(", ")}` : ""}

---

**What's next?** You can:
- Add another car (just tell me the name)
- View/edit this car in the Unified Car Management section
- Add images in the Gallery tab`,
        timestamp: new Date(),
        status: "success",
      };

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = successMessage;
        return updated;
      });

      toast.success(`${carData.name} added to database!`);
    } catch (error) {
      console.error("Save error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ **Failed to save:** ${error instanceof Error ? error.message : "Unknown error"}

This might happen if:
- The car already exists in the database
- There's a connection issue
- You need to log in again

Would you like me to try again?`,
        timestamp: new Date(),
        status: "error",
      };

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = errorMessage;
        return updated;
      });
      toast.error("Failed to save car");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      // Check if user is confirming save
      const lowerInput = input.toLowerCase().trim();
      if (["yes", "save", "save it", "confirm", "ok", "sure", "go ahead"].includes(lowerInput)) {
        setInput("");
        handleSaveConfirmation();
      } else {
        handleSend();
      }
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Car Chat Assistant
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {message.status === "pending" && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing...
                    </div>
                  )}
                  {message.carData && message.status === "success" && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={handleSaveConfirmation}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Save to Database
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a car name to add... (e.g., 'Add Maruti Swift 2024')"
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            💡 Tip: Just type any car name and I'll generate complete data for you
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
