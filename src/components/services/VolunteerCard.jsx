import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';

export default function VolunteerCard({ assignment, personName, onRemove }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 shadow-sm flex items-center gap-2 group">
      <GripVertical size={13} className="text-slate-300 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{personName}</p>
        <p className="text-[11px] text-slate-400 truncate">{assignment.position}{assignment.team_id ? ' · via team' : ''}</p>
      </div>
      <button onClick={() => onRemove(assignment)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-0.5 flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}