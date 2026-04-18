import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, Sparkles } from "lucide-react";
import { ReplyAgentsBuilder } from "./ReplyAgentsBuilder";

interface Props {
  /** Vertical slug from business_verticals (e.g. "insurance", "loans", "hsrp", "rentals", "accessories", "car-sales") */
  verticalSlug: string;
  verticalLabel?: string;
}

/**
 * Drop-in launcher for a vertical workspace.
 * Renders a compact card; clicking it opens the Reply Agents Builder
 * pre-scoped to the given vertical so vertical managers can create &
 * manage their own WhatsApp / Email auto-reply agents.
 */
export function VerticalReplyAgentsCard({ verticalSlug, verticalLabel }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                Reply Agents <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                Configure AI auto-reply bots for {verticalLabel || verticalSlug} (WhatsApp & Email)
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} size="sm">Open Builder</Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Reply Agents — {verticalLabel || verticalSlug}
            </DialogTitle>
          </DialogHeader>
          <ReplyAgentsBuilder verticalSlug={verticalSlug} compact />
        </DialogContent>
      </Dialog>
    </>
  );
}
