import { useState } from "react";
import { CrmVerticalSelector } from "@/components/crm/CrmVerticalSelector";
import { useVerticalPipelineStages, useCustomersByVerticalStage } from "@/hooks/useCrmCustomers";
import { useCrmAccess } from "@/hooks/useCrmAccess";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ViewMode = "kanban" | "list" | "done" | "lost";

export default function CrmPipeline() {
  const [selectedVertical, setSelectedVertical] = useState<string>("car_sales");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const navigate = useNavigate();
  const { isExecutive, crmUser } = useCrmAccess();

  const { data: stagesData, isLoading: stagesLoading } = useVerticalPipelineStages(selectedVertical);
  const stages = stagesData?.stages || [];

  // Use vertical-based customer list — filter by is_final/is_lost for done/lost views
  const { data: customersData, isLoading: customersLoading } = useCustomersByVerticalStage({
    vertical_name: selectedVertical,
    is_final: viewMode === "done" ? true : undefined,
    is_lost: viewMode === "lost" ? true : undefined,
    assigned_to: isExecutive ? crmUser?.user_id : undefined,
  });

  const customers = customersData?.customers || [];

  const isLoading = stagesLoading || customersLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <div className="flex gap-1 border rounded-md overflow-hidden text-sm">
          {(["kanban", "list", "done", "lost"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 capitalize ${viewMode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {m === "done" ? "Done Clients" : m === "lost" ? "Lost Clients" : m}
            </button>
          ))}
        </div>
      </div>

      <CrmVerticalSelector selected={selectedVertical} onSelect={setSelectedVertical} />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : viewMode === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage: any) => {
            // Match customers by their vertical_stage (from customer_vertical_status)
            const stageCustomers = customers.filter((c: any) => c.vertical_stage === stage.stage_name);
            return (
              <div key={stage.id} className="min-w-[250px] border rounded-lg flex flex-col">
                <div className={`p-3 border-b text-sm font-medium flex items-center justify-between ${
                  stage.is_final_stage ? "bg-green-50 text-green-800" : stage.is_lost_stage ? "bg-red-50 text-red-800" : "bg-muted"
                }`}>
                  <span>{stage.stage_name}</span>
                  <span className="text-xs opacity-70">{stageCustomers.length}</span>
                </div>
                <div className="p-2 space-y-2 flex-1 min-h-[200px]">
                  {stageCustomers.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/crm/customers/${c.id}`)}
                      className="border rounded-md p-2 text-sm cursor-pointer hover:bg-muted/50"
                    >
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                      {c.city && <p className="text-xs text-muted-foreground">{c.city}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Done / Lost — all use the same table, data is already filtered by is_final/is_lost */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Vertical Stage</th>
                <th className="text-left p-3">City</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} onClick={() => navigate(`/crm/customers/${c.id}`)} className="border-t hover:bg-muted/50 cursor-pointer">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs border">{c.vertical_stage}</span></td>
                  <td className="p-3">{c.city || "—"}</td>
                  <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {viewMode === "done" ? "No completed clients yet" : viewMode === "lost" ? "No lost clients" : "No customers in this pipeline"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
