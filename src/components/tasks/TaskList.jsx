import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveAssigneeIds, groupLabel } from '@/components/tasks/taskUtils';
import { CheckCircle2, Circle, Pencil, Trash2, Users, CalendarDays } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function TaskList({ tasks, people, categories, careGroups, serviceTeams, myPersonId, canManage, onToggleComplete, onEdit, onDelete }) {
  const personById = Object.fromEntries(people.map((p) => [p.id, p]));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  if (tasks.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No tasks here.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const assigneeIds = resolveAssigneeIds(task, careGroups, serviceTeams);
        const completed = task.completed_person_ids || [];
        const done = task.status === 'completed';
        const iAmAssignee = myPersonId && assigneeIds.includes(myPersonId);
        const iCompleted = myPersonId && completed.includes(myPersonId);
        const cat = task.category_id ? catById[task.category_id] : null;
        const gLabel = groupLabel(task, careGroups, serviceTeams);
        const overdue = !done && task.due_date && isBefore(new Date(task.due_date), startOfDay(new Date()));
        const names = assigneeIds.slice(0, 3).map((id) => personById[id]).filter(Boolean)
          .map((p) => `${p.first_name} ${p.last_name}`).join(', ');

        return (
          <div key={task.id} className={`bg-white border rounded-xl p-4 group ${done ? 'opacity-60 border-slate-100' : 'border-slate-200'}`}>
            <div className="flex items-start gap-3">
              {iAmAssignee ? (
                <button onClick={() => onToggleComplete(task)} className="mt-0.5 text-slate-300 hover:text-emerald-500" title={iCompleted ? 'Mark not done' : 'Mark done'}>
                  {iCompleted ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} />}
                </button>
              ) : (
                <span className="mt-0.5">{done ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="text-slate-200" />}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</span>
                  {cat && <Badge variant="outline" style={{ borderColor: cat.color, color: cat.color }} className="text-[10px]">{cat.name}</Badge>}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>{task.priority}</span>
                </div>
                {task.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                  {task.due_date && (
                    <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                      <CalendarDays size={12} /> {format(new Date(task.due_date), 'MMM d, yyyy')}{overdue && ' (overdue)'}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {gLabel ? `${gLabel} (${assigneeIds.length})` : names || 'Unassigned'}
                    {assigneeIds.length > 3 && !gLabel && ` +${assigneeIds.length - 3}`}
                  </span>
                  {assigneeIds.length > 1 && <span className="text-emerald-600">{completed.length}/{assigneeIds.length} done</span>}
                  {task.assigned_by_name && <span>by {task.assigned_by_name}</span>}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => onDelete(task)}><Trash2 size={14} /></Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}