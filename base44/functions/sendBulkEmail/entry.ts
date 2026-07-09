import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { recipients, subject, body } = await req.json();
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ error: 'No recipients provided' }, { status: 400 });
    }
    if (!subject || !subject.trim()) {
      return Response.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!body || !body.trim()) {
      return Response.json({ error: 'Body is required' }, { status: 400 });
    }

    const churches = await base44.asServiceRole.entities.Church.list();
    const fromEmail = churches[0]?.resend_from_email || 'Church <onboarding@resend.dev>';
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('sendBulkEmail: RESEND_API_KEY not set');
      return Response.json({ error: 'Email is not configured' }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const to of recipients) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to,
            subject,
            text: body,
          }),
        });
        if (res.ok) {
          sent++;
          results.push({ to, status: 'sent' });
        } else {
          const errBody = await res.text();
          console.error(`sendBulkEmail failed to ${to}:`, errBody);
          failed++;
          results.push({ to, status: 'failed', error: errBody });
        }
      } catch (e) {
        console.error(`sendBulkEmail exception to ${to}:`, e.message);
        failed++;
        results.push({ to, status: 'failed', error: e.message });
      }
    }

    return Response.json({ sent, failed, total: recipients.length, results });
  } catch (error) {
    console.error('sendBulkEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});