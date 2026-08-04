import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isWorkflowAuthorized } from '../../shared/workflowAuth.ts';

function nextDate(from: string | undefined, frequency: string): string {
  const base = from ? new Date(from + 'T00:00:00Z') : new Date();
  const d = new Date(base);
  if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  // If the computed date is in the past (task completed late), roll forward from today
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  while (d < today) {
    if (frequency === 'daily') d.setUTCDate(d.getUTCDate() + 1);
    else if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (!(await isWorkflowAuthorized(base44, body))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id } = body;
    if (!task_id) return Response.json({ error: 'task_id is required' }, { status: 400 });

    const tasks = await base44.asServiceRole.entities.Task.filter({ id: task_id });
    const task = tasks[0];
    if (!task) return Response.json({ created: false, reason: 'Task not found' });
    if (!task.is_recurring || task.status !== 'completed') {
      return Response.json({ created: false, reason: 'Task is not a completed recurring task' });
    }

    const frequency = task.recurrence_frequency || 'weekly';
    const newTask = await base44.asServiceRole.entities.Task.create({
      church_id: task.church_id || null,
      title: task.title,
      description: task.description || '',
      category_id: task.category_id || undefined,
      priority: task.priority || 'medium',
      due_date: nextDate(task.due_date, frequency),
      status: 'open',
      is_recurring: true,
      recurrence_frequency: frequency,
      assigned_by_user_id: task.assigned_by_user_id || undefined,
      assigned_by_name: task.assigned_by_name || undefined,
      assignee_person_ids: task.assignee_person_ids || [],
      assignee_group_type: task.assignee_group_type || undefined,
      assignee_group_id: task.assignee_group_id || '',
      notify_method: task.notify_method || 'email',
      completed_person_ids: [],
    });

    return Response.json({ created: true, new_task_id: newTask.id, due_date: newTask.due_date });
  } catch (error) {
    console.error('createNextRecurringTask error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});