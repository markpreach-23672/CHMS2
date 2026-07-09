import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { recipients, message } = await req.json();
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ error: 'No recipients provided' }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    if (!accountSid || !authToken || !fromNumber) {
      console.error('sendSMS: Twilio env vars missing');
      return Response.json({ error: 'Twilio is not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);
    let sent = 0;
    let failed = 0;
    const results = [];

    for (const to of recipients) {
      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
          }
        );
        if (res.ok) {
          sent++;
          results.push({ to, status: 'sent' });
        } else {
          const errBody = await res.text();
          console.error(`sendSMS failed to ${to}:`, errBody);
          failed++;
          results.push({ to, status: 'failed', error: errBody });
        }
      } catch (e) {
        console.error(`sendSMS exception to ${to}:`, e.message);
        failed++;
        results.push({ to, status: 'failed', error: e.message });
      }
    }

    return Response.json({ sent, failed, total: recipients.length, results });
  } catch (error) {
    console.error('sendSMS error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});