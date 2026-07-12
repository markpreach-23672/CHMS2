import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VolunteerLeaderboard from '@/components/services/VolunteerLeaderboard';
import DepartmentLeaders from '@/components/services/DepartmentLeaders';
import { Users, ClipboardList, TrendingUp } from 'lucide-react';

const RANGES = { '3m': 90, '6m': 180, '12m': 365, all: null };

export default function VolunteerReportTab({ people }) {
  const [assignments, setAssignments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [range, setRange] = useState('6m');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.PlanAssignment.list('-created_date', 2000),
      base44.entities.ServicePlan.list('-service_date', 500),
      base44.entities.ServiceType.list(),
    ])
      .then(([a, p, t]) => { setAssignments(a); setPlans(p); setServiceTypes(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const personById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);

  const filtered = useMemo(() => {
    const days = RANGES[range];
    const cutoff = days ? new Date(Date.now() - days * 86400000) : null;
    return assignments.filter((a) => {
      const plan = planById[a.plan_id];
      if (!plan) return false;
      if (cutoff && new Date(plan.service_date) < cutoff) return false;
      return true;
    });
  }, [assignments, planById, range]);

  const stats = useMemo(() => {
    const volunteers = new Set(filtered.map((a) => a.person_id));
    const planIds = new Set(filtered.map((a) => a.plan_id));
    return {
      total: filtered.length,
      volunteers: volunteers.size,
      avg: volunteers.size ? (filtered.length / volunteers.size).toFixed(1) : 0,
      services: planIds.size,
    };
  }, [filtered]);

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading volunteer report…</div>;

  const statCards = [
    { label: 'Total Assignments', value: stats.total, icon: ClipboardList, color: 'text-indigo-500' },
    { label: 'Active Volunteers', value: stats.volunteers, icon: Users, color: 'text-emerald-500' },
    { label: 'Avg. Times Served', value: stats.avg, icon: TrendingUp, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">Serving activity across {stats.services} service{stats.services === 1 ? '' : 's'}</p>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <s.icon size={22} className={s.color} />
            <div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
          No serving assignments found in this period. Assign volunteers to service plans to see reports here.
        </div>
      ) : (
        <>
          <VolunteerLeaderboard assignments={filtered} personById={personById} />
          <DepartmentLeaders assignments={filtered} personById={personById} planById={planById} serviceTypes={serviceTypes} />
        </>
      )}
    </div>
  );
}