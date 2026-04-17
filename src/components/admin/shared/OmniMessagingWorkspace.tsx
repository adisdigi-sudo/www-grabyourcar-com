import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, MessageSquare, Settings } from "lucide-react";
import { OmniSendPanel } from "./OmniSendPanel";
import { OmniChatPanel } from "./OmniChatPanel";
import { ChannelProvidersSettings } from "../settings/ChannelProvidersSettings";

interface OmniRecipient {
  phone?: string;
  email?: string;
  name?: string;
}

interface OmniMessagingWorkspaceProps {
  recipients?: OmniRecipient[];
  context?: string;
  phone?: string;
  email?: string;
  showSettings?: boolean;
  /** When provided, scopes the Chat panel to these phone numbers only (vertical filtering). */
  allowedPhones?: string[];
  /** Label shown in the chat header e.g. "Insurance" */
  scopeLabel?: string;
}

/**
 * Combined side-by-side messaging workspace.
 * Drop this into any vertical for Campaign + Chat + Settings.
 * Pass `allowedPhones` + `scopeLabel` to scope the Chat to a single vertical's contacts.
 */
export function OmniMessagingWorkspace({
  recipients = [],
  context,
  phone,
  email,
  showSettings = false,
  allowedPhones,
  scopeLabel,
}: OmniMessagingWorkspaceProps) {
  const [tab, setTab] = useState("campaign");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className={`grid ${showSettings ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="campaign" className="gap-1.5 text-xs">
            <Send className="h-3.5 w-3.5" /> Campaign & Bulk Send
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Conversations
          </TabsTrigger>
          {showSettings && (
            <TabsTrigger value="settings" className="gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" /> Channel Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="campaign">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OmniSendPanel recipients={recipients} context={context} />
            <OmniChatPanel phone={phone} email={email} context={context} allowedPhones={allowedPhones} scopeLabel={scopeLabel} />
          </div>
        </TabsContent>

        <TabsContent value="chat">
          <OmniChatPanel phone={phone} email={email} context={context} allowedPhones={allowedPhones} scopeLabel={scopeLabel} />
        </TabsContent>

        {showSettings && (
          <TabsContent value="settings">
            <ChannelProvidersSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
