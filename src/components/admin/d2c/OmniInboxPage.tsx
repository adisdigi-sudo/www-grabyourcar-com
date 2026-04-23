import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, MessageSquare, ArrowRight } from "lucide-react";

/**
 * Legacy Omni Inbox page.
 * Deprecated in favour of the central WhatsApp Hub Inbox.
 * Kept as a redirect-style empty state so any bookmarked links degrade gracefully.
 */
export const OmniInboxPage = () => {
  const goToHub = () => {
    // AdminLayout reads ?tab= and switches the active workspace.
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "whatsapp-hub");
    window.location.href = url.toString();
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-lg w-full border-dashed">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Inbox className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Omni Inbox has moved</h2>
            <p className="text-sm text-muted-foreground">
              All customer conversations now live in the{" "}
              <span className="font-medium text-foreground">WhatsApp Hub Inbox</span>.
              Per-vertical inboxes were removed to keep one single source of truth for agents.
            </p>
          </div>
          <Button onClick={goToHub} size="lg" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Open WhatsApp Hub Inbox
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground pt-2">
            Tip: bookmark the WhatsApp Hub for fastest access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OmniInboxPage;
