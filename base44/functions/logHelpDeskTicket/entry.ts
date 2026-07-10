import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = (body && body.question) || '';
    const notes = (body && body.notes) || '';
    if (!question) return Response.json({ error: 'Question is required' }, { status: 400 });

    const churchId = user.church_id || (user.data && user.data.church_id) || '';
    const ticket = await base44.entities.HelpDeskTicket.create({
      church_id: churchId,
      question,
      notes,
      asked_by_user_id: user.id,
      asked_by_name: user.full_name || user.email || '',
      status: 'open',
    });

    return Response.json({ success: true, ticket_id: ticket.id });
  } catch (error) {
    console.error('logHelpDeskTicket error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});