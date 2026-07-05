import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse Twilio webhook (form-encoded) — fall back to JSON for testing
    let body = '';
    let from = '';
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = (formData.get('Body') || '').toString().trim().toLowerCase();
      from = (formData.get('From') || '').toString();
    } else {
      const json = await req.json();
      body = (json.Body || json.body || '').toString().trim().toLowerCase();
      from = (json.From || json.from || '').toString();
    }

    console.log(`SMS received from ${from}: "${body}"`);

    // Look up active connect cards with keywords
    const cards = await base44.asServiceRole.entities.ConnectCard.filter({ is_active: true });
    const matchedCard = cards.find(c => c.keyword && c.keyword.toLowerCase().trim() === body);

    let replyMessage;
    if (matchedCard) {
      // Get the public site URL from the Church entity
      const churches = await base44.asServiceRole.entities.Church.list();
      const siteUrl = churches[0]?.site_url;
      if (!siteUrl) {
        console.error('No site_url set on Church entity — cannot build card link');
      }
      const cardUrl = `${siteUrl || ''}/card/${matchedCard.id}`;
      replyMessage = `Thanks for reaching out! Here's our connect card: ${cardUrl}`;

      // Create a Person record for this phone number if new
      try {
        const existing = await base44.asServiceRole.entities.Person.filter({ phone: from });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.Person.create({
            first_name: 'Text',
            last_name: 'Guest',
            phone: from,
            status: 'visitor',
            first_visit_date: new Date().toISOString().split('T')[0]
          });
        }
      } catch (e) {
        console.error('Person creation failed:', e.message);
      }
    } else {
      const keywords = cards.filter(c => c.keyword).map(c => c.keyword).join(', ');
      replyMessage = keywords
        ? `Welcome! Text one of these keywords to connect: ${keywords}`
        : `Welcome! Visit our website to connect with us.`;
    }

    // Escape XML special characters
    const safeMsg = replyMessage.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safeMsg}</Message></Response>`;
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('handleTwilioSMS error:', error.message);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong. Please try again later.</Message></Response>`;
    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }
});