import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { resolveAssigneeIds } from '@/components/tasks/taskUtils';
import { ListTodo, CalendarDays } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';

// Dashboard card showing the current user's open tasks, color-coded:
// yellow = in progress, red = overdue, green = completed today's view.
// Renders nothing if the user has no open assigned tasks.
export default function MyTasksWidget() {
  const [myTasks, setMyTasks] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (!user) { setMyTasks([]); return; }
        const query = user.church_id ? { church_id: user.church_id } : {};
        const [people, tasks, careGroups, serviceTeams] = await Promise.all([
          base44.entities.Person.filter(query, 'first_name'),
          base44.entities.Task.filter(query, '-created_date', 500),
          base44.entities.CareGroup.filter(query),
          base44.entities.ServiceTeam.filter(query),
        ]);
        const me = people.find((p) => p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase());
        if (!me) { setMyTasks([]); return; }
        const mine = tasks.filter((t) => resolveAssigneeIds(t, careGroups, serviceTeams).includes(me.id)
          && t.status !== 'completed' && !(t.completed_person_ids || []).includes(me.id));
        setMyTasks(mine);
      } catch (e) {
        setMyTasks([]);
      }
    })();
  }, []);

  // Hide entirely while loading or when there are no open tasks
  if (!myTasks || myTasks.length === 0) return null;

  const today = startOfDay(new Date());

  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
          <ListTodo size={16} className="text-indigo-500" /> My Open Tasks ({myTasks.length})
        </h2>
        <Link to="/tasks" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all tasks</Link>
      </div>
      <div className="divide-y divide-slate-50">
        {myTasks.slice(0, 6).map((task) => {
          const overdue = task.due_date && isBefore(new Date(task.due_date), today);
          return (
            <Link key={task.id} to="/tasks" className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors border-l-4 ${
              overdue ? 'border-l-red-500 bg-red-50/40' : 'border-l-yellow-400 bg-yellow-50/40'
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                {task.assigned_by_name && <p className="text-xs text-slate-400">from {task.assigned_by_name}</p>}
              </div>
              {task.due_date && (
                <span className={`text-xs flex items-center gap-1 shrink-0 ${overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                  <CalendarDays size={12} /> {format(new Date(task.due_date), 'MMM d')}{overdue && ' · Overdue'}
                </span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                overdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {overdue ? 'Overdue' : 'In Progress'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}