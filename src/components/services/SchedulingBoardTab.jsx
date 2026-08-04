import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import VolunteerBoard from '@/components/services/VolunteerBoard';
import AssignPositionDialog from '@/components/services/AssignPositionDialog';

const FALLBACK_POSITIONS = ['Worship Leader', 'Vocals', 'Keys', 'Guitar', 'Bass', 'Drums', 'Usher', 'Greeter', 'Sound', 'Media'];

export default function SchedulingBoardTab({ churchId, people }) {
  const [plans, setPlans] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [planId, setPlanId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fillPosition, setFillPosition] = useState('');

  useEffect(() => {
    (async () => {
      const [p, st] = await Promise.all([
        base44.entities.ServicePlan.list('-service_date', 100),
        base44.entities.ServiceType.list(),
      ]);
      setPlans(p);
      setServiceTypes(st);
      setPlanId(p[0]?.id || '');
      setLoading(false);
    })();
  }, []);

  const loadAssignments = useCallback(async (id) => {
    if (!id) { setAssignments([]); return; }
    setAssignments(await base44.entities.PlanAssignment.filter({ plan_id: id }));
  }, []);

  useEffect(() => { loadAssignments(planId); }, [planId, loadAssignments]);

  const plan = plans.find((p) => p.id === planId);
  const serviceType = plan ? serviceTypes.find((st) => st.id === plan.service_type_id) : null;
  const allPositions = serviceType?.positions?.length ? serviceType.positions : FALLBACK_POSITIONS;
  const filled = new Set(assignments.filter((a) => (a.status || 'scheduled') !== 'declined').map((a) => a.position));
  const openPositions = allPositions.filter((pos) => !filled.has(pos));

  const patch = (id, data) => setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));

  const handleStatusChange = async (assignment, status) => {
    patch(assignment.id, { status });
    await base44.entities.PlanAssignment.update(assignment.id, { status });
  };

  const handlePositionChange = async (assignment, position) => {
    // Moving someone into an open role puts them back on the schedule
    const data = { position, status: (assignment.status || 'scheduled') === 'declined' ? 'scheduled' : (assignment.status || 'scheduled') };
    patch(assignment.id, data);
    await base44.entities.PlanAssignment.update(assignment.id, data);
  };

  const handleRemove = async (assignment) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
    await base44.entities.PlanAssignment.delete(assignment.id);
  };

  const handleAssign = async (personId, position) => {
    const created = await base44.entities.PlanAssignment.create({
      church_id: churchId,
      plan_id: planId,
      person_id: personId,
      position,
      status: 'scheduled',
    });
    setAssignments((prev) => [...prev, created]);
    setFillPosition('');
  };

  if (loading) return <div className="p-8 text-sm text-slate-400">Loading...</div>;

  if (plans.length === 0) {
    return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">Create a service plan first, then schedule your volunteers here.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-72">
          <Label className="text-xs font-medium text-slate-600">Service Plan</Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.title} — {p.service_date}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-slate-500 pb-2">
          Drag volunteers between Scheduled, Confirmed, and Declined — or onto an open position to move them into that role.
        </p>
      </div>

      <VolunteerBoard
        assignments={assignments}
        people={people}
        openPositions={openPositions}
        onStatusChange={handleStatusChange}
        onPositionChange={handlePositionChange}
        onRemove={handleRemove}
        onAssignPosition={setFillPosition}
      />

      {fillPosition && (
        <AssignPositionDialog position={fillPosition} people={people} onAssign={handleAssign} onClose={() => setFillPosition('')} />
      )}
    </div>
  );
}