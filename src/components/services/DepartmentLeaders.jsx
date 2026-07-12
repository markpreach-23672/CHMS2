import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

// Groups assignments by service department (service type), showing top team members in each.
export default function DepartmentLeaders({ assignments, personById, planById, serviceTypes }) {
  const departments = useMemo(() => {
    const typeById = Object.fromEntries(serviceTypes.map((t) => [t.id, t]));
    const groups = {};
    for (const a of assignments) {
      const plan = planById[a.plan_id];
      const typeName = (plan?.service_type_id && typeById[plan.service_type_id]?.name) || 'General Services';
      if (!groups[typeName]) groups[typeName] = {};
      if (!groups[typeName][a.person_id]) groups[typeName][a.person_id] = { count: 0, positions: new Set() };
      groups[typeName][a.person_id].count++;
      groups[typeName][a.person_id].positions.add(a.position);
    }
    return Object.entries(groups).map(([name, members]) => ({
      name,
      members: Object.entries(members)
        .map(([pid, v]) => {
          const p = personById[pid];
          return {
            id: pid,
            name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
            count: v.count,
            positions: [...v.positions],
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    }));
  }, [assignments, personById, planById, serviceTypes]);

  return (
    <div>
      <h3 className="font-semibold text-slate-900 mb-3">Top Team Members by Department</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept) => (
          <div key={dept.name} className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="font-semibold text-indigo-600 text-sm mb-3">{dept.name}</h4>
            <div className="space-y-2.5">
              {dept.members.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{m.name}</div>
                      <div className="text-xs text-slate-400 truncate">{m.positions.join(', ')}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">{m.count}×</Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}