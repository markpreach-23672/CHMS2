import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp, Target, FileBarChart } from 'lucide-react';
import PledgeSummaryReport from '@/components/giving/PledgeSummaryReport';
import DateInput from '@/components/ui/date-input';
import { getMyChurchId } from '@/lib/churchContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import moment from 'moment';

export default function PledgesTab({ pledges, donations, people, funds, loading, setPledges }) {
  const [showForm, setShowForm] = useState(false);
  const [editPledge, setEditPledge] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const getPersonName = (pid) => {
    const p = people.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  };
  const getFundName = (fid) => funds.find((f) => f.id === fid)?.name || 'General Fund';

  const calcAmountGiven = (pledge) => {
    return donations
      .filter((d) => {
        if (d.person_id !== pledge.person_id) return false;
        if (pledge.fund_id && d.fund_id !== pledge.fund_id) return false;
        const date = moment(d.donation_date);
        if (pledge.start_date && date.isBefore(moment(pledge.start_date), 'day')) return false;
        if (pledge.end_date && date.isAfter(moment(pledge.end_date), 'day')) return false;
        return true;
      })
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  };

  const totalPledged = pledges.reduce((s, p) => s + (p.total_amount || 0), 0);
  const totalGiven = pledges.reduce((s, p) => s + calcAmountGiven(p), 0);
  const overallPct = totalPledged > 0 ? Math.min((totalGiven / totalPledged) * 100, 100) : 0;

  const handleDelete = async (pledge) => {
    if (!confirm(`Delete pledge for ${getPersonName(pledge.person_id)}?`)) return;
    try {
      await base44.entities.Pledge.delete(pledge.id);
      setPledges((prev) => prev.filter((p) => p.id !== pledge.id));
    } catch (err) {
      alert('Failed to delete pledge.');
    }
  };

  const handleSave = async (data) => {
    try {
      if (editPledge) {
        const updated = await base44.entities.Pledge.update(editPledge.id, data);
        setPledges((prev) => prev.map((p) => (p.id === editPledge.id ? updated : p)));
      } else {
        const created = await base44.entities.Pledge.create({ ...data, church_id: await getMyChurchId() });
        setPledges((prev) => [...prev, created]);
      }
      setShowForm(false);
      setEditPledge(null);
    } catch (err) {
      alert('Failed to save pledge.');
    }
  };

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Target size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">Total Pledged</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">${totalPledged.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">Fulfilled So Far</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${totalGiven.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Overall Progress</span>
            <span className="text-sm font-bold text-slate-900">{overallPct.toFixed(0)}%</span>
          </div>
          <Progress value={overallPct} className="h-2.5 mt-2" />
        </div>
      </div>

      <div className="flex justify-end gap-2 mb-3">
        <Button variant="outline" onClick={() => setShowReport(true)}>
          <FileBarChart size={15} className="mr-1.5" />
          Summary Report
        </Button>
        <Button variant="outline" onClick={() => { setEditPledge(null); setShowForm(true); }}>
          <Plus size={15} className="mr-1.5" />
          New Pledge
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading pledges...</div>
        ) : pledges.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No pledges yet. Create one to track giving commitments.</div>
        ) : (
          pledges.map((pledge) => {
            const given = calcAmountGiven(pledge);
            const pct = pledge.total_amount > 0 ? Math.min((given / pledge.total_amount) * 100, 100) : 0;
            const remaining = Math.max(pledge.total_amount - given, 0);
            return (
              <div key={pledge.id} className="px-5 py-4 hover:bg-slate-50/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {pledge.person_id ? (
                        <Link to={`/people/${pledge.person_id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                          {getPersonName(pledge.person_id)}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">Anonymous</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{getFundName(pledge.fund_id)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {pledge.start_date ? moment(pledge.start_date).format('MMM D, YYYY') : '—'}
                      {pledge.end_date ? ` → ${moment(pledge.end_date).format('MMM D, YYYY')}` : ''}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditPledge(pledge); setShowForm(true); }}>
                        <Pencil size={14} className="mr-1.5" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(pledge)}>
                        <Trash2 size={14} className="mr-1.5" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={pct} className="h-2.5 flex-1" />
                  <span className="text-xs font-bold text-slate-700 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>Pledged: <span className="font-semibold text-slate-700">${pledge.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                  <span>Given: <span className="font-semibold text-emerald-600">${given.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
                  {remaining > 0 && <span>Remaining: <span className="font-semibold text-slate-700">${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>}
                  {remaining === 0 && given > 0 && <span className="font-semibold text-emerald-600">✓ Fulfilled</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <PledgeForm
          pledge={editPledge}
          people={people}
          funds={funds}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditPledge(null); }}
        />
      )}

      {showReport && (
        <PledgeSummaryReport
          pledges={pledges}
          donations={donations}
          people={people}
          funds={funds}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function PledgeForm({ pledge, people, funds, onSave, onClose }) {
  const [personId, setPersonId] = useState(pledge?.person_id || '');
  const [fundId, setFundId] = useState(pledge?.fund_id || '');
  const [totalAmount, setTotalAmount] = useState(pledge?.total_amount || '');
  const [startDate, setStartDate] = useState(pledge?.start_date || moment().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(pledge?.end_date || '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{pledge ? 'Edit Pledge' : 'New Pledge'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Person *</Label>
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <option value="">Select a person...</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Fund</Label>
            <select value={fundId} onChange={(e) => setFundId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <option value="">General (No specific fund)</option>
              {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Total Pledged Amount *</Label>
            <Input type="number" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="mt-1" autoFocus placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Start Date *</Label>
              <DateInput value={startDate} onChange={setStartDate} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">End Date</Label>
              <DateInput value={endDate} onChange={setEndDate} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ person_id: personId || undefined, fund_id: fundId || undefined, total_amount: parseFloat(totalAmount), start_date: startDate, end_date: endDate || undefined })}
            disabled={!personId || !totalAmount}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {pledge ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}