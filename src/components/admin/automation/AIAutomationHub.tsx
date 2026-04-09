import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WADripSequenceManager } from "./WADripSequenceManager";
import { AutoDialerDashboard } from "./AutoDialerDashboard";
import { AutoClosePipelineManager } from "./AutoClosePipelineManager";
import { MessageSquare, Phone, Zap, Bot } from "lucide-react";

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

      <Tabs defaultValue="drip" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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
