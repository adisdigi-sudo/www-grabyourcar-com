import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WADripSequenceManager } from "./WADripSequenceManager";
import { AutoDialerDashboard } from "./AutoDialerDashboard";
import { AutoClosePipelineManager } from "./AutoClosePipelineManager";
import { AIBrainDashboard } from "./AIBrainDashboard";
import { MessageSquare, Phone, Zap, Bot, Brain } from "lucide-react";

export function AIAutomationHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          AI Automation Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          WhatsApp drip sequences, auto-dialer, lead qualification & auto-close pipeline
        </p>
      </div>

      <Tabs defaultValue="ai-brain" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-brain" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Brain
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
