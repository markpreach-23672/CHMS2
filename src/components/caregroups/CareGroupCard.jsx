import React from 'react';
import { Users, Crown, Pencil, Trash2, ChevronRight } from 'lucide-react';

export default function CareGroupCard({ group, leader, onOpen, onEdit, onDelete }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow group cursor-pointer" onClick={onOpen}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: group.color || '#8b5cf6' }}>
            {group.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{group.name}</h3>
            {group.description && <p className="text-xs text-slate-500 line-clamp-1">{group.description}</p>}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Pencil size={15} /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Crown size={13} className="text-amber-500" />
          {leader ? `${leader.first_name} ${leader.last_name}` : 'No leader'}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={13} />
          {(group.member_ids || []).length} member{(group.member_ids || []).length === 1 ? '' : 's'}
        </span>
        <ChevronRight size={14} className="ml-auto text-slate-300" />
      </div>
    </div>
  );
}