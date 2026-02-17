import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";

interface BankPartner {
  id: string;
  name: string;
  short_name: string | null;
  partner_type: string;
  interest_rate_min: number | null;
  interest_rate_max: number | null;
  max_tenure_months: number | null;
  max_loan_amount: number | null;
  processing_fee_percent: number | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  commission_percent: number | null;
  notes: string | null;
  sort_order: number;
}

export const LoanBankPartners = () => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState<BankPartner | null>(null);
  const [form, setForm] = useState({
    name: '', short_name: '', partner_type: 'bank',
    interest_rate_min: '', interest_rate_max: '',
    max_tenure_months: '84', max_loan_amount: '',
    processing_fee_percent: '', contact_person: '',
    contact_phone: '', contact_email: '',
    commission_percent: '', notes: '',
  });

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['loan-bank-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_bank_partners')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as BankPartner[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        short_name: form.short_name || null,
        partner_type: form.partner_type,
        interest_rate_min: form.interest_rate_min ? Number(form.interest_rate_min) : null,
        interest_rate_max: form.interest_rate_max ? Number(form.interest_rate_max) : null,
        max_tenure_months: form.max_tenure_months ? Number(form.max_tenure_months) : 84,
        max_loan_amount: form.max_loan_amount ? Number(form.max_loan_amount) : null,
        processing_fee_percent: form.processing_fee_percent ? Number(form.processing_fee_percent) : null,
        contact_person: form.contact_person || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        commission_percent: form.commission_percent ? Number(form.commission_percent) : null,
        notes: form.notes || null,
      };

      if (editingPartner) {
        const { error } = await supabase.from('loan_bank_partners').update(payload).eq('id', editingPartner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('loan_bank_partners').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-bank-partners'] });
      toast.success(editingPartner ? "Partner updated" : "Partner added");
      setShowDialog(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('loan_bank_partners').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loan-bank-partners'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loan_bank_partners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-bank-partners'] });
      toast.success("Partner removed");
    },
  });

  const resetForm = () => {
    setEditingPartner(null);
    setForm({ name: '', short_name: '', partner_type: 'bank', interest_rate_min: '', interest_rate_max: '', max_tenure_months: '84', max_loan_amount: '', processing_fee_percent: '', contact_person: '', contact_phone: '', contact_email: '', commission_percent: '', notes: '' });
  };

  const openEdit = (p: BankPartner) => {
    setEditingPartner(p);
    setForm({
      name: p.name, short_name: p.short_name || '', partner_type: p.partner_type,
      interest_rate_min: p.interest_rate_min?.toString() || '', interest_rate_max: p.interest_rate_max?.toString() || '',
      max_tenure_months: p.max_tenure_months?.toString() || '84', max_loan_amount: p.max_loan_amount?.toString() || '',
      processing_fee_percent: p.processing_fee_percent?.toString() || '', contact_person: p.contact_person || '',
      contact_phone: p.contact_phone || '', contact_email: p.contact_email || '',
      commission_percent: p.commission_percent?.toString() || '', notes: p.notes || '',
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Bank / NBFC Partners</h2>
        <Dialog open={showDialog} onOpenChange={v => { setShowDialog(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Partner</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPartner ? 'Edit' : 'Add'} Bank Partner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Short Name</Label><Input value={form.short_name} onChange={e => setForm(p => ({ ...p, short_name: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.partner_type} onValueChange={v => setForm(p => ({ ...p, partner_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="nbfc">NBFC</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Min Interest Rate (%)</Label><Input type="number" step="0.1" value={form.interest_rate_min} onChange={e => setForm(p => ({ ...p, interest_rate_min: e.target.value }))} /></div>
                <div><Label>Max Interest Rate (%)</Label><Input type="number" step="0.1" value={form.interest_rate_max} onChange={e => setForm(p => ({ ...p, interest_rate_max: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Max Tenure (months)</Label><Input type="number" value={form.max_tenure_months} onChange={e => setForm(p => ({ ...p, max_tenure_months: e.target.value }))} /></div>
                <div><Label>Max Loan Amount</Label><Input type="number" value={form.max_loan_amount} onChange={e => setForm(p => ({ ...p, max_loan_amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Processing Fee (%)</Label><Input type="number" step="0.1" value={form.processing_fee_percent} onChange={e => setForm(p => ({ ...p, processing_fee_percent: e.target.value }))} /></div>
                <div><Label>Commission (%)</Label><Input type="number" step="0.1" value={form.commission_percent} onChange={e => setForm(p => ({ ...p, commission_percent: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} className="w-full">
                {editingPartner ? 'Update' : 'Add'} Partner
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Interest Rate</TableHead>
                <TableHead>Max Tenure</TableHead>
                <TableHead>Processing Fee</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{p.name}</span>
                      {p.contact_person && <p className="text-xs text-muted-foreground">{p.contact_person}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{p.partner_type}</Badge></TableCell>
                  <TableCell>
                    {p.interest_rate_min && p.interest_rate_max
                      ? `${p.interest_rate_min}% - ${p.interest_rate_max}%`
                      : p.interest_rate_min ? `${p.interest_rate_min}%+` : '—'}
                  </TableCell>
                  <TableCell>{p.max_tenure_months ? `${p.max_tenure_months}m` : '—'}</TableCell>
                  <TableCell>{p.processing_fee_percent ? `${p.processing_fee_percent}%` : '—'}</TableCell>
                  <TableCell>{p.commission_percent ? `${p.commission_percent}%` : '—'}</TableCell>
                  <TableCell>
                    <Switch checked={p.is_active} onCheckedChange={v => toggleMutation.mutate({ id: p.id, is_active: v })} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No bank partners yet. Add your first partner above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
