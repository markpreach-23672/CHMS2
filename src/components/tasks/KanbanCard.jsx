import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveAssigneeIds, groupLabel } from '@/components/tasks/taskUtils';
import { CalendarDays, Users, Repeat, Pencil, Trash2 } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function KanbanCard({ task, people, categories, careGroups, serviceTeams, canManage, onEdit, onDelete }) {
  const cat = task.category_id ? categories.find((c) => c.id === task.category_id) : null;
  const assigneeIds = resolveAssigneeIds(task, careGroups, serviceTeams);
  const gLabel = groupLabel(task, careGroups, serviceTeams);
  const names = assigneeIds.slice(0, 2).map((id) => people.find((p) => p.id === id)).filter(Boolean).map((p) => p.first_name).join(', ');
  const overdue = task.status !== 'completed' && task.due_date && isBefore(new Date(task.due_date), startOfDay(new Date()));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm group">
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium text-slate-900 leading-snug">{task.title}</span>
        {canManage && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(task)}><Pencil size={12} /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600" onClick={() => onDelete(task)}><Trash2 size={12} /></Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>{task.priority}</span>
        {cat && <Badge variant="outline" style={{ borderColor: cat.color, color: cat.color }} className="text-[10px]">{cat.name}</Badge>}
        {task.is_recurring && (
          <span className="text-[10px] text-indigo-600 flex items-center gap-0.5"><Repeat size={11} /> {task.recurrence_frequency || 'weekly'}</span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
        {task.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
            <CalendarDays size={12} /> {format(new Date(task.due_date), 'MMM d')}{overdue && ' (overdue)'}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users size={12} /> {gLabel ? `${gLabel} (${assigneeIds.length})` : names || 'Unassigned'}
        </span>
      </div>
    </div>
  );
}