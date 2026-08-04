import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isWorkflowAuthorized } from '../../shared/workflowAuth.ts';

function resolveAssigneeIds(task: any, careGroups: any[], serviceTeams: any[]): string[] {
  const ids = new Set<string>(task.assignee_person_ids || []);
  if (task.assignee_group_id) {
    if (task.assignee_group_type === 'care_group') {
      const g = careGroups.find((x) => x.id === task.assignee_group_id);
      if (g) {
        (g.member_ids || []).forEach((id: string) => ids.add(id));
        if (g.leader_id) ids.add(g.leader_id);
      }
    } else if (task.assignee_group_type === 'service_team') {
      const t = serviceTeams.find((x) => x.id === task.assignee_group_id);
      if (t) (t.members || []).forEach((m: any) => m.person_id && ids.add(m.person_id));
    }
  }
  return [...ids];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (!(await isWorkflowAuthorized(base44, body))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('sendTaskDueReminders: RESEND_API_KEY not set');
      return Response.json({ error: 'Email is not configured' }, { status: 500 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const tomorrowDate = new Date();
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);

    const [allTasks, careGroups, serviceTeams, allPeople, churches] = await Promise.all([
      base44.asServiceRole.entities.Task.list('-created_date', 500),
      base44.asServiceRole.entities.CareGroup.list(),
      base44.asServiceRole.entities.ServiceTeam.list(),
      base44.asServiceRole.entities.Person.list('first_name', 1000),
      base44.asServiceRole.entities.Church.list(),
    ]);

    const dueTasks = allTasks.filter(
      (t: any) =>
        t.status !== 'completed' &&
        t.due_date &&
        (t.due_date === today || t.due_date === tomorrow) &&
        t.reminder_sent_for !== t.due_date
    );

    const personById = Object.fromEntries(allPeople.map((p: any) => [p.id, p]));
    let emailsSent = 0;
    let tasksProcessed = 0;

    for (const task of dueTasks) {
      const church = churches.find((c: any) => c.id === task.church_id) || churches[0];
      const fromEmail = church?.resend_from_email || 'Church <onboarding@resend.dev>';
      const completed = new Set(task.completed_person_ids || []);
      const assignees = resolveAssigneeIds(task, careGroups, serviceTeams)
        .filter((id) => !completed.has(id))
        .map((id) => personById[id])
        .filter((p) => p && p.email);

      const dueLabel = task.due_date === today ? 'today' : 'tomorrow';
      for (const p of assignees) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: fromEmail,
              to: p.email,
              subject: `Reminder: "${task.title}" is due ${dueLabel}`,
              text: `Hi ${p.first_name || 'there'},\n\nThis is a reminder that your task "${task.title}" is due ${dueLabel} (${task.due_date}).\n${task.description ? '\n' + task.description + '\n' : ''}\nPriority: ${task.priority || 'medium'}\n\nSign in to Easy Flow Church to view your task list.`,
            }),
          });
          if (res.ok) emailsSent++;
          else console.error(`sendTaskDueReminders: Resend error for ${p.email}:`, await res.text());
        } catch (e) {
          console.error(`sendTaskDueReminders: failed for ${p.email}:`, e.message);
        }
      }

      await base44.asServiceRole.entities.Task.update(task.id, { reminder_sent_for: task.due_date });
      tasksProcessed++;
    }

    return Response.json({ tasks_processed: tasksProcessed, emails_sent: emailsSent });
  } catch (error) {
    console.error('sendTaskDueReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});