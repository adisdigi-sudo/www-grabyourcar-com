import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCustomer } from "@/hooks/useCrmCustomers";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CrmCustomerNew() {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "", source: "",
    primary_vertical: "", multi_vertical_tags: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer.mutate(form, {
      onSuccess: (data) => {
        toast.success("Customer created");
        navigate(`/crm/customers/${data.customer.id}`);
      },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-4 max-w-2xl">
      <button onClick={() => navigate("/crm/customers")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold">Add Customer</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium">Phone *</label>
            <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium">City</label>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium">Source</label>
            <select value={form.source} onChange={(e) => set("source", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Select</option>
              <option value="walk-in">Walk-in</option>
              <option value="phone">Phone</option>
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="social">Social Media</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Primary Vertical</label>
            <select value={form.primary_vertical} onChange={(e) => set("primary_vertical", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
              <option value="">Select</option>
              <option value="car_sales">Car Sales</option>
              <option value="insurance">Insurance</option>
              <option value="loan">Car Loans</option>
              <option value="corporate">Corporate</option>
              <option value="accessories">Accessories</option>
              <option value="rental">Rental</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={createCustomer.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm">
          {createCustomer.isPending ? "Creating..." : "Create Customer"}
        </button>
      </form>
    </div>
  );
}
