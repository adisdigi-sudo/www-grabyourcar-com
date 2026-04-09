import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, Globe, Zap, Timer, Users, Layers
} from "lucide-react";

interface BatchConfig {
  batchSize: number;
  batchDelaySeconds: number;
  sendInTimezone: boolean;
  optimalTimeSend: boolean;
}

interface Props {
  config: BatchConfig;
  onChange: (config: BatchConfig) => void;
  totalRecipients?: number;
}

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "🇮🇳 India (IST)" },
  { value: "America/New_York", label: "🇺🇸 US Eastern (ET)" },
  { value: "America/Los_Angeles", label: "🇺🇸 US Pacific (PT)" },
  { value: "Europe/London", label: "🇬🇧 London (GMT)" },
  { value: "Asia/Dubai", label: "🇦🇪 Dubai (GST)" },
  { value: "Asia/Singapore", label: "🇸🇬 Singapore (SGT)" },
];

export function BatchSendingConfig({ config, onChange, totalRecipients = 0 }: Props) {
  const estimatedBatches = Math.ceil(totalRecipients / Math.max(config.batchSize, 1));
  const estimatedTimeMin = Math.ceil((estimatedBatches * config.batchDelaySeconds) / 60);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" />Batch & Timezone Sending</CardTitle>
        <CardDescription className="text-xs">Control delivery speed and optimize for recipient timezones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Batch Settings */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" />Batch Size</Label>
            <Input
              type="number"
              min={10}
              max={1000}
              value={config.batchSize}
              onChange={e => onChange({ ...config, batchSize: parseInt(e.target.value) || 100 })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Emails per batch (10-1000)</p>
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><Timer className="h-3 w-3" />Delay Between Batches</Label>
            <Select
              value={config.batchDelaySeconds.toString()}
              onValueChange={v => onChange({ ...config, batchDelaySeconds: parseInt(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="600">10 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estimation */}
        {totalRecipients > 0 && (
          <div className="bg-muted/50 rounded-md p-3 text-xs">
            <p><strong>{totalRecipients}</strong> recipients → <strong>{estimatedBatches}</strong> batches → ~<strong>{estimatedTimeMin}</strong> minutes total</p>
          </div>
        )}

        {/* Timezone & Optimal Send */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Recipient Timezone Send</p>
                <p className="text-[10px] text-muted-foreground">Deliver at the right local time for each recipient</p>
              </div>
            </div>
            <Switch
              checked={config.sendInTimezone}
              onCheckedChange={v => onChange({ ...config, sendInTimezone: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Optimal Open Time</p>
                <p className="text-[10px] text-muted-foreground">Send when each contact is most likely to open</p>
              </div>
            </div>
            <Switch
              checked={config.optimalTimeSend}
              onCheckedChange={v => onChange({ ...config, optimalTimeSend: v })}
            />
          </div>
        </div>

        {(config.sendInTimezone || config.optimalTimeSend) && (
          <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
            <p className="text-xs text-primary">
              {config.optimalTimeSend
                ? "📊 Emails will be sent at each contact's historical best open time"
                : "🌍 Emails will be delivered at the same local time across all timezones"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
