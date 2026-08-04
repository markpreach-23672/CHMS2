import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isWorkflowAuthorized } from '../../shared/workflowAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (!(await isWorkflowAuthorized(base44, body))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { person_id } = body;
    if (!person_id) return Response.json({ error: 'person_id is required' }, { status: 400 });

    const people = await base44.asServiceRole.entities.Person.filter({ id: person_id });
    const person = people[0];
    if (!person) return Response.json({ created: false, reason: 'Person not found' });

    const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim();
    const contact = [person.email, person.mobile || person.phone].filter(Boolean).join(' / ') || 'no contact info on file';

    // Find the membership coordinator via a "Membership Coordinator" tag
    const tags = await base44.asServiceRole.entities.Tag.list('-created_date', 1000);
    const coordinatorTag = tags.find(
      (t: any) =>
        (!person.church_id || !t.church_id || t.church_id === person.church_id) &&
        (t.name || '').toLowerCase().includes('membership coordinator')
    );
    let coordinatorIds: string[] = [];
    if (coordinatorTag) {
      const churchQuery = person.church_id ? { church_id: person.church_id } : {};
      const allPeople = await base44.asServiceRole.entities.Person.filter(churchQuery, 'first_name', 1000);
      coordinatorIds = allPeople.filter((p: any) => (p.tag_ids || []).includes(coordinatorTag.id)).map((p: any) => p.id);
    }

    // Create the helpdesk ticket
    const ticket = await base44.asServiceRole.entities.HelpDeskTicket.create({
      church_id: person.church_id || null,
      question: `New member follow-up: ${fullName} has not joined a Small Group 3 days after being added. Please reach out (${contact}).`,
      asked_by_name: 'Welcome Workflow',
      status: 'open',
    });

    // Create the task for the membership coordinator
    const task = await base44.asServiceRole.entities.Task.create({
      church_id: person.church_id || null,
      title: `Reach out to ${fullName} about joining a Small Group`,
      description: `${fullName} was added 3 days ago and doesn't have a Small Group tag yet. Contact: ${contact}. See helpdesk ticket #${ticket.id}.`,
      priority: 'medium',
      assigned_by_name: 'Welcome Workflow',
      assignee_person_ids: coordinatorIds,
      notify_method: 'email',
    });

    return Response.json({
      created: true,
      ticket_id: ticket.id,
      task_id: task.id,
      coordinator_found: coordinatorIds.length > 0,
    });
  } catch (error) {
    console.error('createMembershipFollowup error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});