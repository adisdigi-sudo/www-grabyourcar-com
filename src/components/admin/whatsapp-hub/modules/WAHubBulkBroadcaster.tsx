import { UnifiedBulkBroadcaster } from "../../UnifiedBulkBroadcaster";

export function WAHubBulkBroadcaster() {
  return (
    <div className="h-full overflow-auto">
      <UnifiedBulkBroadcaster />
    </div>
  );
}
