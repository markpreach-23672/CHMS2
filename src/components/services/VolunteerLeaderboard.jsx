import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function VolunteerLeaderboard({ assignments, personById }) {
  const top = useMemo(() => {
    const counts = {};
    for (const a of assignments) {
      if (!counts[a.person_id]) counts[a.person_id] = { count: 0, positions: new Set() };
      counts[a.person_id].count++;
      counts[a.person_id].positions.add(a.position);
    }
    return Object.entries(counts)
      .map(([pid, v]) => {
        const p = personById[pid];
        return {
          name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown',
          count: v.count,
          positions: [...v.positions].join(', '),
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [assignments, personById]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-slate-900 mb-1">Most Active Volunteers</h3>
      <p className="text-xs text-slate-400 mb-4">Times served in the selected period</p>
      <ResponsiveContainer width="100%" height={Math.max(200, top.length * 36)}>
        <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [`${v} time${v === 1 ? '' : 's'}`, 'Served']} />
          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}