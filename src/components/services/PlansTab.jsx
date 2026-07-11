import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calendar, ChevronRight, Trash2 } from 'lucide-react';
import PlanEditor from '@/components/services/PlanEditor';

export default function PlansTab({ churchId, people }) {
  const [plans, setPlans] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, st] = await Promise.all([
        base44.entities.ServicePlan.list('-service_date', 100),
        base44.entities.ServiceType.list(),
      ]);
      setPlans(p);
      setServiceTypes(st);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (plan, e) => {
    e.stopPropagation();
    if (!confirm(`Delete plan "${plan.title}"? This removes its flow and assignments.`)) return;
    try {
      const [items, assignments] = await Promise.all([
        base44.entities.PlanItem.filter({ plan_id: plan.id }),
        base44.entities.PlanAssignment.filter({ plan_id: plan.id }),
      ]);
      if (items.length) await base44.entities.PlanItem.deleteMany({ plan_id: plan.id });
      if (assignments.length) await base44.entities.PlanAssignment.deleteMany({ plan_id: plan.id });
      await base44.entities.ServicePlan.delete(plan.id);
      setPlans((prev) => prev.filter((x) => x.id !== plan.id));
    } catch (err) { alert('Failed to delete plan.'); }
  };

  if (selectedPlan) {
    return (
      <PlanEditor
        plan={selectedPlan}
        churchId={churchId}
        people={people}
        serviceTypes={serviceTypes}
        onBack={() => { setSelectedPlan(null); load(); }}
        onPlanUpdate={(updated) => setSelectedPlan(updated)}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={15} className="mr-1.5" />New Plan
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No service plans yet. Create a Service Type first (with your standard flow), then start a plan.</div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} onClick={() => setSelectedPlan(plan)} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 cursor-pointer group">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{plan.title}</p>
                <p className="text-xs text-slate-400">
                  {plan.service_date}{plan.service_time ? ` · ${plan.service_time}` : ''}
                  {plan.email_sent_at && <span className="ml-2 text-emerald-500">Team emailed</span>}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${plan.status === 'scheduled' ? 'bg-emerald-50 text-emerald-600' : plan.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>{plan.status}</span>
              <button onClick={(e) => handleDelete(plan, e)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              <ChevronRight size={15} className="text-slate-300" />
            </div>
          ))
        )}
      </div>

      {showNew && (
        <NewPlanDialog
          churchId={churchId}
          serviceTypes={serviceTypes}
          onCreated={(plan) => { setShowNew(false); setPlans((prev) => [plan, ...prev]); setSelectedPlan(plan); }}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

function NewPlanDialog({ churchId, serviceTypes, onCreated, onClose }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [typeId, setTypeId] = useState(serviceTypes[0]?.id || '');
  const [time, setTime] = useState(serviceTypes[0]?.default_time || '10:00');
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (v) => {
    setTypeId(v);
    const st = serviceTypes.find((s) => s.id === v);
    if (st?.default_time) setTime(st.default_time);
  };

  const handleCreate = async () => {
    if (!title.trim() || !date) { alert('Title and date are required.'); return; }
    setSaving(true);
    try {
      const plan = await base44.entities.ServicePlan.create({
        church_id: churchId,
        service_type_id: typeId || undefined,
        title,
        service_date: date,
        service_time: time,
        status: 'draft',
      });
      const st = serviceTypes.find((s) => s.id === typeId);
      const defaults = st?.default_items || [];
      if (defaults.length > 0) {
        await base44.entities.PlanItem.bulkCreate(defaults.map((d, i) => ({
          church_id: churchId,
          plan_id: plan.id,
          sort_order: i,
          type: d.type || 'element',
          title: d.title,
          duration_minutes: d.duration_minutes || 5,
        })));
      }
      onCreated(plan);
    } catch (err) { alert('Failed to create plan.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Service Plan</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Sunday Morning Worship" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Service Type (loads your standard flow)</Label>
            <Select value={typeId || 'none'} onValueChange={(v) => handleTypeChange(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Blank plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Blank plan</SelectItem>
                {serviceTypes.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Start Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Creating...' : 'Create Plan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}