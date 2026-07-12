import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await req.json();
    if (!taskId) return Response.json({ error: 'taskId is required' }, { status: 400 });

    const tasks = await base44.entities.Task.filter({ id: taskId });
    const task = tasks[0];
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
    if (!task.notify_method || task.notify_method === 'none') {
      return Response.json({ sent: 0, message: 'Notifications disabled for this task' });
    }

    // Resolve assignee person IDs (individuals + group members)
    const personIds = new Set(task.assignee_person_ids || []);
    if (task.assignee_group_id) {
      if (task.assignee_group_type === 'care_group') {
        const groups = await base44.entities.CareGroup.filter({ id: task.assignee_group_id });
        const g = groups[0];
        if (g) {
          (g.member_ids || []).forEach((id) => personIds.add(id));
          if (g.leader_id) personIds.add(g.leader_id);
        }
      } else if (task.assignee_group_type === 'service_team') {
        const teams = await base44.entities.ServiceTeam.filter({ id: task.assignee_group_id });
        const t = teams[0];
        if (t) (t.members || []).forEach((m) => m.person_id && personIds.add(m.person_id));
      }
    }
    if (personIds.size === 0) return Response.json({ sent: 0, message: 'No assignees to notify' });

    const query = task.church_id ? { church_id: task.church_id } : {};
    const allPeople = await base44.entities.Person.filter(query, 'first_name', 1000);
    const people = allPeople.filter((p) => personIds.has(p.id));

    const dueLine = task.due_date ? `Due: ${task.due_date}` : 'No due date';
    const priorityLine = `Priority: ${task.priority || 'medium'}`;
    const assigner = task.assigned_by_name || user.full_name || 'Your church';

    const sendEmail = task.notify_method === 'email' || task.notify_method === 'both';
    const sendText = task.notify_method === 'text' || task.notify_method === 'both';

    let emailsSent = 0;
    if (sendEmail) {
      for (const p of people) {
        if (!p.email) continue;
        try {
          await base44.integrations.Core.SendEmail({
            to: p.email,
            subject: `New task assigned: ${task.title}`,
            body: `Hi ${p.first_name},\n\nYou have been assigned a new task by ${assigner}:\n\n${task.title}\n${task.description ? '\n' + task.description + '\n' : ''}\n${dueLine}\n${priorityLine}\n\nSign in to Easy Flow Church to view your task list.`,
          });
          emailsSent++;
        } catch (e) {
          console.error(`Failed to email ${p.email}:`, e.message);
        }
      }
    }

    let textsSent = 0;
    if (sendText) {
      const numbers = people.map((p) => p.mobile || p.phone).filter(Boolean);
      if (numbers.length > 0) {
        try {
          const smsRes = await base44.functions.invoke('sendSMS', {
            recipients: numbers,
            message: `New task from ${assigner}: ${task.title}. ${dueLine}. ${priorityLine}. Sign in to Easy Flow Church for details.`,
          });
          textsSent = smsRes?.data?.sent || 0;
        } catch (e) {
          console.error('Failed to send task SMS:', e.message);
        }
      }
    }

    return Response.json({ sent: emailsSent + textsSent, emails: emailsSent, texts: textsSent, recipients: people.length });
  } catch (error) {
    console.error('sendTaskNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});