import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import PlanFlowEditor from '@/components/services/PlanFlowEditor';
import PlanAssignments from '@/components/services/PlanAssignments';

export default function PlanEditor({ plan, churchId, people, serviceTypes, onBack, onPlanUpdate }) {
  const [items, setItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [songs, setSongs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, a, s, t] = await Promise.all([
        base44.entities.PlanItem.filter({ plan_id: plan.id }),
        base44.entities.PlanAssignment.filter({ plan_id: plan.id }),
        base44.entities.Song.list(),
        base44.entities.ServiceTeam.list(),
      ]);
      i.sort((x, y) => (x.sort_order || 0) - (y.sort_order || 0));
      setItems(i);
      setAssignments(a);
      setSongs(s);
      setTeams(t);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [plan.id]);

  useEffect(() => { load(); }, [load]);

  const serviceType = serviceTypes.find((st) => st.id === plan.service_type_id);
  const positions = serviceType?.positions?.length
    ? serviceType.positions
    : ['Worship Leader', 'Vocals', 'Keys', 'Guitar', 'Bass', 'Drums', 'Usher', 'Greeter', 'Emcee', 'Prayer', 'Announcements', 'Sound', 'Media'];

  const handleSendEmail = async () => {
    if (assignments.length === 0) { alert('Assign people to this plan first.'); return; }
    if (!confirm(`Email the full service schedule and songs to all ${assignments.length} scheduled people?`)) return;
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendServicePlanEmail', { plan_id: plan.id });
      const d = res.data;
      if (d?.success) {
        alert(`Email sent to ${d.sent} team member${d.sent === 1 ? '' : 's'}.${d.failed?.length ? ` Failed: ${d.failed.join(', ')}` : ''}`);
        onPlanUpdate({ ...plan, email_sent_at: new Date().toISOString() });
      } else {
        alert(d?.error || 'Failed to send emails.');
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to send emails.');
    } finally { setSending(false); }
  };

  const totalMinutes = items.filter((i) => i.type !== 'header').reduce((sum, i) => sum + (i.duration_minutes || 0), 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={15} className="mr-1" />All Plans</Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{plan.title}</h2>
          <p className="text-xs text-slate-400">{plan.service_date}{plan.service_time ? ` at ${plan.service_time}` : ''} · {totalMinutes} min total{plan.email_sent_at ? ` · team emailed ${new Date(plan.email_sent_at).toLocaleDateString()}` : ''}</p>
        </div>
        <Button onClick={handleSendEmail} disabled={sending} className="bg-indigo-600 hover:bg-indigo-700">
          {sending ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Send size={15} className="mr-1.5" />}
          {sending ? 'Sending...' : 'Email Team Schedule'}
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400">Loading plan...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlanFlowEditor
            plan={plan}
            churchId={churchId}
            items={items}
            setItems={setItems}
            songs={songs}
            setSongs={setSongs}
            people={people}
          />
          <PlanAssignments
            plan={plan}
            churchId={churchId}
            assignments={assignments}
            setAssignments={setAssignments}
            people={people}
            teams={teams}
            positions={positions}
          />
        </div>
      )}
    </div>
  );
}