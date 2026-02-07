import { useState } from "react";
import { useInsurancePartners, useFinancePartners } from "@/hooks/useCMSData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Edit, Shield, CreditCard, Building } from "lucide-react";

export function PartnersManager() {
  const [activeTab, setActiveTab] = useState('insurance');
  
  const { data: insurancePartners, isLoading: insuranceLoading, saveMutation: saveInsurance, deleteMutation: deleteInsurance } = useInsurancePartners();
  const [isInsuranceDialogOpen, setIsInsuranceDialogOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState({ id: '', name: '', logo_url: '', website_url: '', is_active: true, sort_order: 0 });

  const { data: financePartners, isLoading: financeLoading, saveMutation: saveFinance, deleteMutation: deleteFinance } = useFinancePartners();
  const [isFinanceDialogOpen, setIsFinanceDialogOpen] = useState(false);
  const [editingFinance, setEditingFinance] = useState({ id: '', name: '', logo_url: '', interest_rate_from: 0, interest_rate_to: 0, max_tenure_months: 84, processing_fee: '', is_active: true, sort_order: 0 });

  const handleSaveInsurance = async () => {
    const { id, ...data } = editingInsurance;
    await saveInsurance.mutateAsync(id ? { id, ...data } : data);
    setIsInsuranceDialogOpen(false);
    setEditingInsurance({ id: '', name: '', logo_url: '', website_url: '', is_active: true, sort_order: 0 });
  };

  const handleSaveFinance = async () => {
    const { id, ...data } = editingFinance;
    await saveFinance.mutateAsync(id ? { id, ...data } : data);
    setIsFinanceDialogOpen(false);
    setEditingFinance({ id: '', name: '', logo_url: '', interest_rate_from: 0, interest_rate_to: 0, max_tenure_months: 84, processing_fee: '', is_active: true, sort_order: 0 });
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Partners</h2><p className="text-muted-foreground">Manage insurance and finance partners</p></div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList><TabsTrigger value="insurance"><Shield className="h-4 w-4 mr-2" />Insurance</TabsTrigger><TabsTrigger value="finance"><CreditCard className="h-4 w-4 mr-2" />Finance</TabsTrigger></TabsList>

        <TabsContent value="insurance" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Insurance Partners</CardTitle></div>
              <Dialog open={isInsuranceDialogOpen} onOpenChange={setIsInsuranceDialogOpen}>
                <DialogTrigger asChild><Button onClick={() => setEditingInsurance({ id: '', name: '', logo_url: '', website_url: '', is_active: true, sort_order: 0 })}><Plus className="h-4 w-4 mr-2" />Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingInsurance.id ? 'Edit' : 'Add'} Insurance Partner</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Name *</Label><Input value={editingInsurance.name} onChange={(e) => setEditingInsurance(p => ({ ...p, name: e.target.value }))} /></div>
                    <div className="grid gap-2"><Label>Logo URL</Label><Input value={editingInsurance.logo_url} onChange={(e) => setEditingInsurance(p => ({ ...p, logo_url: e.target.value }))} /></div>
                    <div className="grid gap-2"><Label>Website</Label><Input value={editingInsurance.website_url} onChange={(e) => setEditingInsurance(p => ({ ...p, website_url: e.target.value }))} /></div>
                    <div className="flex items-center gap-2"><Switch checked={editingInsurance.is_active} onCheckedChange={(c) => setEditingInsurance(p => ({ ...p, is_active: c }))} /><Label>Active</Label></div>
                    <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsInsuranceDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveInsurance} disabled={!editingInsurance.name || saveInsurance.isPending}>{saveInsurance.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button></div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {insuranceLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Logo</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {insurancePartners?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.logo_url ? <img src={p.logo_url} alt={p.name} className="h-8 w-16 object-contain" /> : <Building className="h-8 w-8 text-muted-foreground" />}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? 'Active' : 'Hidden'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingInsurance({ id: p.id, name: p.name, logo_url: p.logo_url || '', website_url: p.website_url || '', is_active: p.is_active, sort_order: p.sort_order }); setIsInsuranceDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteInsurance.mutateAsync(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Finance Partners</CardTitle></div>
              <Dialog open={isFinanceDialogOpen} onOpenChange={setIsFinanceDialogOpen}>
                <DialogTrigger asChild><Button onClick={() => setEditingFinance({ id: '', name: '', logo_url: '', interest_rate_from: 0, interest_rate_to: 0, max_tenure_months: 84, processing_fee: '', is_active: true, sort_order: 0 })}><Plus className="h-4 w-4 mr-2" />Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingFinance.id ? 'Edit' : 'Add'} Finance Partner</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2"><Label>Name *</Label><Input value={editingFinance.name} onChange={(e) => setEditingFinance(p => ({ ...p, name: e.target.value }))} /></div>
                    <div className="grid gap-2"><Label>Logo URL</Label><Input value={editingFinance.logo_url} onChange={(e) => setEditingFinance(p => ({ ...p, logo_url: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label>Min Rate (%)</Label><Input type="number" step="0.1" value={editingFinance.interest_rate_from} onChange={(e) => setEditingFinance(p => ({ ...p, interest_rate_from: parseFloat(e.target.value) || 0 }))} /></div>
                      <div className="grid gap-2"><Label>Max Rate (%)</Label><Input type="number" step="0.1" value={editingFinance.interest_rate_to} onChange={(e) => setEditingFinance(p => ({ ...p, interest_rate_to: parseFloat(e.target.value) || 0 }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2"><Label>Max Tenure (months)</Label><Input type="number" value={editingFinance.max_tenure_months} onChange={(e) => setEditingFinance(p => ({ ...p, max_tenure_months: parseInt(e.target.value) || 84 }))} /></div>
                      <div className="grid gap-2"><Label>Processing Fee</Label><Input value={editingFinance.processing_fee} onChange={(e) => setEditingFinance(p => ({ ...p, processing_fee: e.target.value }))} /></div>
                    </div>
                    <div className="flex items-center gap-2"><Switch checked={editingFinance.is_active} onCheckedChange={(c) => setEditingFinance(p => ({ ...p, is_active: c }))} /><Label>Active</Label></div>
                    <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsFinanceDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveFinance} disabled={!editingFinance.name || saveFinance.isPending}>{saveFinance.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button></div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {financeLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Logo</TableHead><TableHead>Name</TableHead><TableHead>Interest Rate</TableHead><TableHead>Tenure</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {financePartners?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.logo_url ? <img src={p.logo_url} alt={p.name} className="h-8 w-16 object-contain" /> : <Building className="h-8 w-8 text-muted-foreground" />}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.interest_rate_from}% - {p.interest_rate_to}%</TableCell>
                        <TableCell>{p.max_tenure_months} mo</TableCell>
                        <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? 'Active' : 'Hidden'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingFinance({ id: p.id, name: p.name, logo_url: p.logo_url || '', interest_rate_from: p.interest_rate_from, interest_rate_to: p.interest_rate_to, max_tenure_months: p.max_tenure_months, processing_fee: p.processing_fee || '', is_active: p.is_active, sort_order: p.sort_order }); setIsFinanceDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFinance.mutateAsync(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PartnersManager;
