import React from 'react';
import TaskKanban from '@/components/tasks/TaskKanban';
import { Workflow } from 'lucide-react';

const REACH_OUT_COLUMNS = [
  { id: 'open', label: 'Pending', color: 'bg-amber-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-500' },
];

export default function ReachOutBoard({ tasks, people, categories, careGroups, serviceTeams, canManage, onStatusChange, onEdit, onDelete }) {
  if (tasks.length === 0) {
    return (
      <div className="py-14 text-center">
        <Workflow className="mx-auto text-slate-300" size={32} />
        <p className="text-sm text-slate-400 mt-2">No automated reach-outs yet.</p>
        <p className="text-xs text-slate-400">Follow-up tasks created by your automations and workflows will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Follow-up tasks created automatically by your workflows. Drag a card between columns to update its status.
      </p>
      <TaskKanban tasks={tasks} people={people} categories={categories} careGroups={careGroups} serviceTeams={serviceTeams}
        canManage={canManage} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} columns={REACH_OUT_COLUMNS} />
    </div>
  );
}