import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Entity automation payload: { event, data, entity_id }
    const entryId = body?.data?.id || body?.entity_id || body?.data?.entity_id;
    if (!entryId) {
      return Response.json({ skipped: 'No entry ID in payload' });
    }

    // Fetch the form entry
    const entry = await base44.asServiceRole.entities.FormEntry.get(entryId);
    if (!entry) {
      return Response.json({ skipped: 'Entry not found' });
    }

    // Fetch the form to get notify_emails + field definitions
    const form = await base44.asServiceRole.entities.Form.get(entry.form_id);
    if (!form) {
      return Response.json({ skipped: 'Form not found' });
    }
    if (!form.notify_emails || form.notify_emails.length === 0) {
      return Response.json({ skipped: 'No notification emails configured on form' });
    }

    // Build field summary from submission data
    const fieldSummary = (form.fields || [])
      .filter((f) => f.type !== 'section' && entry.data[f.id] !== undefined && entry.data[f.id] !== null && entry.data[f.id] !== '')
      .map((f) => {
        let val = entry.data[f.id];
        if (typeof val === 'object' && !Array.isArray(val)) {
          if (f.type === 'name') val = `${val.first || ''} ${val.last || ''}`.trim();
          else if (f.type === 'address') val = `${val.street || ''}, ${val.city || ''}, ${val.state || ''} ${val.zip || ''}`;
          else if (f.type === 'payment') val = `${val.label} - $${val.amount}`;
          else val = JSON.stringify(val);
        } else if (Array.isArray(val)) {
          val = val.join(', ');
        }
        return `${f.label}: ${val}`;
      })
      .join('\n');

    const subject = `New form submission: ${form.title}`;
    const emailBody = `A new submission has been received for "${form.title}".\n\n${fieldSummary}\n\nSubmitted at: ${new Date().toLocaleString()}`;

    // Get Gmail OAuth token (shared connector)
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('gmail');
      accessToken = conn.accessToken;
    } catch (err) {
      console.error('Gmail connector not available:', err.message);
      return Response.json({ skipped: 'Gmail not connected' });
    }

    // Build RFC 2822 MIME message and send via Gmail API
    const rawMessage = buildMimeMessage(form.notify_emails.join(', '), subject, emailBody);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gmail API error (${res.status}): ${errText}`);
      return Response.json({ error: 'Failed to send Gmail notification' }, { status: 502 });
    }

    return Response.json({ success: true, sent_to: form.notify_emails });
  } catch (error) {
    console.error(`Gmail form notification failed: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Build a base64url-encoded RFC 2822 message with proper UTF-8 encoding
function buildMimeMessage(to: string, subject: string, body: string): string {
  // RFC 2047 encode subject if it contains non-ASCII characters
  const encodedSubject = /[^\x00-\x7F]/.test(subject)
    ? `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`
    : subject;

  const lines = [
    `To: ${to}`,
    `From: me`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body,
  ];

  const email = lines.join('\r\n');
  const base64 = btoa(unescape(encodeURIComponent(email)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}