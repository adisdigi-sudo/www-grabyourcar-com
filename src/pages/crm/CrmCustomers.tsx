import { useState } from "react";
import { useCustomerList } from "@/hooks/useCrmCustomers";
import { useCrmAccess } from "@/hooks/useCrmAccess";
import { CrmVerticalSelector } from "@/components/crm/CrmVerticalSelector";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";

export default function CrmCustomers() {
  const navigate = useNavigate();
  const { isExecutive, crmUser } = useCrmAccess();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading } = useCustomerList({
    page,
    limit: 50,
    search: search || undefined,
    vertical: selectedVertical || undefined,
    status: statusFilter || undefined,
    assigned_to: isExecutive ? crmUser?.user_id : undefined,
  });

  const customers = data?.customers || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button
          onClick={() => navigate("/crm/customers/new")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          + Add Customer
        </button>
      </div>

      <CrmVerticalSelector selected={selectedVertical} onSelect={setSelectedVertical} />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-background"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Interested">Interested</option>
          <option value="Quoted">Quoted</option>
          <option value="Booked">Booked</option>
          <option value="Delivered">Delivered</option>
          <option value="Lost">Lost</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-left p-3">City</th>
                  <th className="text-left p-3">Vertical</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/crm/customers/${c.id}`)}
                    className="border-t hover:bg-muted/50 cursor-pointer"
                  >
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3">{c.city || "—"}</td>
                    <td className="p-3">{c.primary_vertical || "—"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs border">{c.status}</span>
                    </td>
                    <td className="p-3">{c.lead_score || 0}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total: {total}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-3 py-1">Page {page}</span>
              <button
                disabled={customers.length < 50}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
