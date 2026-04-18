import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WADripSequenceManager } from "./WADripSequenceManager";
import { AutoDialerDashboard } from "./AutoDialerDashboard";
import { AutoClosePipelineManager } from "./AutoClosePipelineManager";
import { AIBrainDashboard } from "./AIBrainDashboard";
import { ReplyAgentsBuilder } from "./ReplyAgentsBuilder";
import { MessageSquare, Phone, Zap, Bot, Brain, Sparkles } from "lucide-react";

export function AIAutomationHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          Hybrid Automation Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Rule-based WhatsApp automations with AI fallback for open-ended sales and support conversations
        </p>
      </div>

      <Tabs defaultValue="reply-agents" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="reply-agents" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Reply Agents
          </TabsTrigger>
          <TabsTrigger value="ai-brain" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Hybrid Brain
          </TabsTrigger>
          <TabsTrigger value="drip" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WA Drip Sequences
          </TabsTrigger>
          <TabsTrigger value="dialer" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Auto-Dialer
          </TabsTrigger>
          <TabsTrigger value="auto-close" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto-Close Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reply-agents" className="mt-6">
          <ReplyAgentsBuilder />
        </TabsContent>

        <TabsContent value="ai-brain" className="mt-6">
          <AIBrainDashboard />
        </TabsContent>

        <TabsContent value="drip" className="mt-6">
          <WADripSequenceManager />
        </TabsContent>

        <TabsContent value="dialer" className="mt-6">
          <AutoDialerDashboard />
        </TabsContent>

        <TabsContent value="auto-close" className="mt-6">
          <AutoClosePipelineManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
