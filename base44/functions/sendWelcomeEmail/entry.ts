import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { isWorkflowAuthorized } from '../../shared/workflowAuth.ts';

function applyMergeFields(text: string, person: any, church: any) {
  return (text || '')
    .replace(/\{\{\s*first_name\s*\}\}/gi, person.first_name || 'there')
    .replace(/\{\{\s*last_name\s*\}\}/gi, person.last_name || '')
    .replace(/\{\{\s*full_name\s*\}\}/gi, `${person.first_name || ''} ${person.last_name || ''}`.trim())
    .replace(/\{\{\s*church_name\s*\}\}/gi, church?.name || 'our church');
}

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
    if (!person) return Response.json({ sent: false, reason: 'Person not found' });
    if (!person.email) return Response.json({ sent: false, reason: 'Person has no email' });

    const churches = await base44.asServiceRole.entities.Church.list();
    const church = churches.find((c: any) => c.id === person.church_id) || churches[0];

    // Find a welcome email template for this church
    const templates = await base44.asServiceRole.entities.MessageTemplate.filter({ type: 'email' });
    const template = templates.find(
      (t: any) =>
        (!person.church_id || !t.church_id || t.church_id === person.church_id) &&
        (t.name || '').toLowerCase().includes('welcome')
    );

    const subject = template
      ? applyMergeFields(template.subject || `Welcome to ${church?.name || 'our church'}!`, person, church)
      : `Welcome to ${church?.name || 'our church'}!`;
    const bodyText = template
      ? applyMergeFields(template.body, person, church)
      : `Hi ${person.first_name || 'there'},\n\nWelcome to ${church?.name || 'our church'}! We're so glad you're here. If you have any questions or want to get connected, just reply to this email.\n\nBlessings,\n${church?.name || 'Our church'} Team`;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('sendWelcomeEmail: RESEND_API_KEY not set');
      return Response.json({ error: 'Email is not configured' }, { status: 500 });
    }
    const fromEmail = church?.resend_from_email || 'Church <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: person.email, subject, text: bodyText }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`sendWelcomeEmail: Resend error (${res.status}): ${errText}`);
      return Response.json({ sent: false, reason: `Email send failed: ${errText}` });
    }

    return Response.json({ sent: true, used_template: template?.name || null });
  } catch (error) {
    console.error('sendWelcomeEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});