import { useParams, useNavigate } from "react-router-dom";
import { useCustomerDetail, useCustomerVerticalStatus, useUpdateVerticalStage, useVerticalPipelineStages, useAddActivity } from "@/hooks/useCrmCustomers";
import { Loader2, ArrowLeft, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { useState } from "react";

const VERTICALS = ["car_sales", "insurance", "loan", "corporate", "accessories", "rental"];
const VERTICAL_LABELS: Record<string, string> = {
  car_sales: "Car Sales", insurance: "Insurance", loan: "Car Loans",
  corporate: "Corporate", accessories: "Accessories", rental: "Rental",
};

export default function CrmCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useCustomerDetail(id);
  const { data: verticalStatusData } = useCustomerVerticalStatus(id);
  const [activeTab, setActiveTab] = useState("info");
  const [selectedVertical, setSelectedVertical] = useState<string>("car_sales");

  const { data: stagesData } = useVerticalPipelineStages(selectedVertical);
  const updateStage = useUpdateVerticalStage();
  const addActivity = useAddActivity();

  const [noteText, setNoteText] = useState("");

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const customer = data?.customer;
  const activities = data?.activities || [];
  const verticalStatuses = verticalStatusData?.statuses || [];
  const stages = stagesData?.stages || [];

  if (!customer) {
    return <p className="text-center py-12 text-muted-foreground">Customer not found</p>;
  }

  const currentVerticalStatus = verticalStatuses.find((s: any) => s.vertical_name === selectedVertical);

  const handleStageChange = (newStage: string) => {
    if (!id) return;
    updateStage.mutate({ customerId: id, vertical_name: selectedVertical, new_stage: newStage });
  };

  const handleAddNote = () => {
    if (!id || !noteText.trim()) return;
    addActivity.mutate(
      { customerId: id, activity_type: "note", notes: noteText },
      { onSuccess: () => setNoteText("") }
    );
  };

  const tabs = [
    { key: "info", label: "Basic Info" },
    { key: "verticals", label: "Vertical Status" },
    { key: "timeline", label: "Activity Timeline" },
    { key: "notes", label: "Notes" },
    { key: "followup", label: "Follow-up" },
    { key: "calls", label: "Call Log" },
  ];

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/crm/customers")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      {/* Header */}
      <div className="border rounded-lg p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{customer.name}</h1>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
            {customer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</span>}
            {customer.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{customer.city}</span>}
          </div>
        </div>
        <div className="text-right text-sm">
          <span className="px-2 py-0.5 rounded-full border">{customer.status}</span>
          <p className="mt-1 text-muted-foreground">Score: {customer.lead_score || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="border rounded-lg p-4 min-h-[300px]">
        {activeTab === "info" && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Source:</span> {customer.source || "—"}</div>
            <div><span className="text-muted-foreground">Primary Vertical:</span> {customer.primary_vertical || "—"}</div>
            <div><span className="text-muted-foreground">Lifecycle:</span> {customer.lifecycle_stage || "—"}</div>
            <div><span className="text-muted-foreground">Assigned To:</span> {customer.assigned_to || "—"}</div>
            <div><span className="text-muted-foreground">Tags:</span> {(customer.multi_vertical_tags || []).join(", ") || "—"}</div>
            <div><span className="text-muted-foreground">Created:</span> {new Date(customer.created_at).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Last Contacted:</span> {customer.last_contacted_at ? new Date(customer.last_contacted_at).toLocaleDateString() : "Never"}</div>
            <div><span className="text-muted-foreground">Next Follow-up:</span> {customer.next_followup_at ? new Date(customer.next_followup_at).toLocaleDateString() : "—"}</div>
          </div>
        )}

        {activeTab === "verticals" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {VERTICALS.map((v) => (
                <button
                  key={v}
                  onClick={() => setSelectedVertical(v)}
                  className={`px-3 py-1 text-sm rounded border ${selectedVertical === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {VERTICAL_LABELS[v]}
                </button>
              ))}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Current Stage: <strong>{currentVerticalStatus?.current_stage || "Not started"}</strong>
              </p>
              <div className="flex gap-1 flex-wrap">
                {stages.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => handleStageChange(s.stage_name)}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                      currentVerticalStatus?.current_stage === s.stage_name
                        ? "bg-primary text-primary-foreground"
                        : s.is_lost_stage
                        ? "hover:bg-destructive/10 text-destructive border-destructive/30"
                        : s.is_final_stage
                        ? "hover:bg-green-500/10 text-green-700 border-green-500/30"
                        : "hover:bg-muted"
                    }`}
                  >
                    {s.stage_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-2">
            {activities.length === 0 && <p className="text-muted-foreground text-sm">No activities yet</p>}
            {activities.map((a: any) => (
              <div key={a.id} className="flex gap-3 text-sm border-l-2 pl-3 py-1">
                <span className="text-muted-foreground whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString()}
                </span>
                <span className="font-medium">{a.activity_type}</span>
                {a.notes && <span className="text-muted-foreground">— {a.notes}</span>}
              </div>
            ))}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
              />
              <button onClick={handleAddNote} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                Add
              </button>
            </div>
            {activities.filter((a: any) => a.activity_type === "note").map((a: any) => (
              <div key={a.id} className="border rounded-md p-3 text-sm">
                <p>{a.notes}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "followup" && (
          <div className="space-y-3">
            <div className="border rounded-md p-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Next Follow-up</span>
              </div>
              <p>{customer.next_followup_at ? new Date(customer.next_followup_at).toLocaleString() : "Not scheduled"}</p>
            </div>
            <p className="text-sm text-muted-foreground">Follow-up scheduler will be built in a future step.</p>
          </div>
        )}

        {activeTab === "calls" && (
          <div className="space-y-3">
            <div className="border rounded-md p-4 text-sm">
              <p className="text-muted-foreground">Last Contacted: {customer.last_contacted_at ? new Date(customer.last_contacted_at).toLocaleString() : "Never"}</p>
              <p className="text-muted-foreground">Next Follow-up: {customer.next_followup_at ? new Date(customer.next_followup_at).toLocaleString() : "—"}</p>
            </div>
            <p className="text-sm text-muted-foreground">Call log integration will be built in a future step.</p>
          </div>
        )}
      </div>
    </div>
  );
}
