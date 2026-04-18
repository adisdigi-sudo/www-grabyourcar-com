import { useState } from "react";
import { EnginesList } from "./sales-engines/EnginesList";
import { EngineEditor } from "./sales-engines/EngineEditor";

export function WAHubSalesEngines() {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (editingId) {
    return <EngineEditor engineId={editingId} onBack={() => setEditingId(null)} />;
  }
  return <EnginesList onEdit={setEditingId} />;
}
