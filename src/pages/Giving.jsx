import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, DollarSign, TrendingUp, Folder, Trash2, MoreHorizontal, Pencil } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import moment from 'moment';
import { Link } from 'react-router-dom';

export default function Giving() {
  const [donations, setDonations] = useState([]);
  const [funds, setFunds] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [showFundForm, setShowFundForm] = useState(false);
  const [editFund, setEditFund] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [d, f, p] = await Promise.all([
        base44.entities.Donation.list('-donation_date', 200),
        base44.entities.Fund.list(),
        base44.entities.Person.list(),
      ]);
      setDonations(d);
      setFunds(f);
      setPeople(p);
    } catch (err) {
      console.error('Failed to load giving data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalThisMonth = donations
    .filter((d) => moment(d.donation_date).isSame(moment(), 'month'))
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalAllTime = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

  const getPersonName = (pid) => {
    const p = people.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  };
  const getFundName = (fid) => funds.find((f) => f.id === fid)?.name || 'Unassigned';

  const handleDeleteDonation = async (donation) => {
    if (!confirm('Delete this donation record?')) return;
    try {
      await base44.entities.Donation.delete(donation.id);
      setDonations((prev) => prev.filter((d) => d.id !== donation.id));
    } catch (err) {
      alert('Failed to delete donation.');
    }
  };

  const handleDeleteFund = async (fund) => {
    if (!confirm(`Delete fund "${fund.name}"?`)) return;
    try {
      await base44.entities.Fund.delete(fund.id);
      setFunds((prev) => prev.filter((f) => f.id !== fund.id));
    } catch (err) {
      alert('Failed to delete fund.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Giving</h1>
          <p className="text-slate-500 text-sm mt-1">Track donations, manage funds, and monitor pledges.</p>
        </div>
        <Button onClick={() => setShowDonationForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1.5" />
          Record Donation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <span className="text-sm text-slate-500">This Month</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">${totalThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-sm text-slate-500">All-Time Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">${totalAllTime.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Folder size={20} />
            </div>
            <span className="text-sm text-slate-500">Active Funds</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{funds.length}</p>
        </div>
      </div>

      <Tabs defaultValue="donations">
        <TabsList className="mb-4">
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="funds">Funds</TabsTrigger>
        </TabsList>

        <TabsContent value="donations">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Person</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Fund</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Method</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Loading donations...</td></tr>
                ) : donations.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">No donations recorded yet.</td></tr>
                ) : (
                  donations.map((don) => (
                    <tr key={don.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-600">{moment(don.donation_date).format('MMM D, YYYY')}</td>
                      <td className="px-4 py-3">
                        {don.person_id ? (
                          <Link to={`/people/${don.person_id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                            {getPersonName(don.person_id)}
                          </Link>
                        ) : <span className="text-sm text-slate-400">Anonymous</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{getFundName(don.fund_id)}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{don.method}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">${don.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteDonation(don)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="funds">
          <div className="flex justify-end mb-3">
            <Button variant="outline" onClick={() => { setEditFund(null); setShowFundForm(true); }}>
              <Plus size={15} className="mr-1.5" />
              New Fund
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {funds.map((fund) => {
              const fundTotal = donations.filter((d) => d.fund_id === fund.id).reduce((s, d) => s + (d.amount || 0), 0);
              return (
                <div key={fund.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{fund.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{fund.description || 'No description'}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditFund(fund); setShowFundForm(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteFund(fund)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-3">${fundTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <div className="flex gap-2 mt-2">
                    {fund.is_tax_deductible && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Tax Deductible</span>}
                    {fund.is_active ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Active</span> : <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Inactive</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Donation Form */}
      {showDonationForm && (
        <DonationForm
          people={people}
          funds={funds}
          onSave={async (data) => {
            try {
              const created = await base44.entities.Donation.create(data);
              setDonations((prev) => [created, ...prev]);
              setShowDonationForm(false);
            } catch (err) {
              alert('Failed to record donation.');
            }
          }}
          onClose={() => setShowDonationForm(false)}
        />
      )}

      {/* Fund Form */}
      {showFundForm && (
        <FundForm
          fund={editFund}
          onSave={async (data) => {
            try {
              if (editFund) {
                const updated = await base44.entities.Fund.update(editFund.id, data);
                setFunds((prev) => prev.map((f) => (f.id === editFund.id ? updated : f)));
              } else {
                const created = await base44.entities.Fund.create(data);
                setFunds((prev) => [...prev, created]);
              }
              setShowFundForm(false);
              setEditFund(null);
            } catch (err) {
              alert('Failed to save fund.');
            }
          }}
          onClose={() => { setShowFundForm(false); setEditFund(null); }}
        />
      )}
    </div>
  );
}

function DonationForm({ people, funds, onSave, onClose }) {
  const [personId, setPersonId] = useState('');
  const [fundId, setFundId] = useState(funds[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [donationDate, setDonationDate] = useState(moment().format('YYYY-MM-DD'));
  const [method, setMethod] = useState('cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Donation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Person</Label>
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <option value="">Anonymous</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Fund</Label>
            <select value={fundId} onChange={(e) => setFundId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Amount *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Date</Label>
              <Input type="date" value={donationDate} onChange={(e) => setDonationDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {method === 'check' && (
              <div>
                <Label className="text-xs font-medium text-slate-600">Check #</Label>
                <Input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} className="mt-1" />
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ person_id: personId || undefined, fund_id: fundId, amount: parseFloat(amount), donation_date: donationDate, method, check_number: checkNumber || undefined, notes })} disabled={!amount} className="bg-indigo-600 hover:bg-indigo-700">Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FundForm({ fund, onSave, onClose }) {
  const [name, setName] = useState(fund?.name || '');
  const [description, setDescription] = useState(fund?.description || '');
  const [isTaxDeductible, setIsTaxDeductible] = useState(fund?.is_tax_deductible ?? true);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{fund ? 'Edit Fund' : 'New Fund'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={isTaxDeductible} onChange={(e) => setIsTaxDeductible(e.target.checked)} className="rounded" />
            Tax Deductible
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, description, is_tax_deductible: isTaxDeductible, is_active: true })} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">{fund ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}