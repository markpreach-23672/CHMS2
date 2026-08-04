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
    if (!person) return Response.json({ has_small_group: false, reason: 'Person not found' });

    const tagIds = person.tag_ids || [];
    if (tagIds.length === 0) return Response.json({ has_small_group: false });

    const tags = await base44.asServiceRole.entities.Tag.list('-created_date', 1000);
    const hasSmallGroup = tags.some(
      (t: any) => tagIds.includes(t.id) && (t.name || '').toLowerCase().includes('small group')
    );

    return Response.json({ has_small_group: hasSmallGroup });
  } catch (error) {
    console.error('checkSmallGroupTag error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});