import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Personal serving-schedule calendar feed (ICS). Subscribe from Google/Apple/Outlook
// via URL: /functions/serviceScheduleICS?person_id=<id>&token=<signed token>
// The token is an HMAC signature of the person_id — feed URLs without a valid
// token require an authenticated staff member (or the person themselves).
const FEED_SECRET = 'efc-ics-feed-secret-3f8a1c9d74b2465e91a0c7d5b6e2f814';

async function feedToken(personId) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(FEED_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(String(personId)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    let personId = url.searchParams.get('person_id');
    let token = url.searchParams.get('token');
    if (!personId) {
      try { const body = await req.json(); personId = body.person_id; token = token || body.token; } catch { /* no body */ }
    }
    if (!personId) return new Response('Missing person_id', { status: 400, headers: { 'Content-Type': 'text/plain' } });

    const expectedToken = await feedToken(personId);

    if (token !== expectedToken) {
      // No valid feed token — require an authenticated staff member, or the person themselves
      let user = null;
      try { user = await base44.auth.me(); } catch (e) { user = null; }
      if (!user) return new Response('Unauthorized', { status: 401, headers: { 'Content-Type': 'text/plain' } });
      const isAdmin = ['admin', 'super_admin', 'church_admin'].includes(user.role);
      if (!isAdmin) {
        const p = await base44.asServiceRole.entities.Person.get(personId).catch(() => null);
        const isSelf = !!(p && p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase());
        if (!isSelf) return new Response('Unauthorized', { status: 401, headers: { 'Content-Type': 'text/plain' } });
      }
    }

    const person = await base44.asServiceRole.entities.Person.get(personId).catch(() => null);
    if (!person) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });

    const assignments = await base44.asServiceRole.entities.PlanAssignment.filter({ person_id: personId });
    const planIds = [...new Set(assignments.map((a) => a.plan_id))];
    const plans = [];
    for (const pid of planIds) {
      const p = await base44.asServiceRole.entities.ServicePlan.get(pid).catch(() => null);
      if (p) plans.push(p);
    }
    const planById = {};
    for (const p of plans) planById[p.id] = p;

    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Church//ServiceSchedule//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:' + escapeICS(`Serving Schedule - ${person.first_name || ''} ${person.last_name || ''}`.trim()) + '\r\n';

    for (const a of assignments) {
      const plan = planById[a.plan_id];
      if (!plan || !plan.service_date) continue;
      const time = plan.service_time || '10:00';
      const start = new Date(`${plan.service_date}T${time.length === 5 ? time : '10:00'}:00`);
      if (isNaN(start)) continue;
      const end = new Date(start.getTime() + 90 * 60000);
      ics += 'BEGIN:VEVENT\r\n';
      ics += `UID:${a.id}@church-service-schedule\r\n`;
      ics += `DTSTAMP:${fmt(new Date())}\r\n`;
      ics += `DTSTART:${fmt(start)}\r\n`;
      ics += `DTEND:${fmt(end)}\r\n`;
      ics += `SUMMARY:${escapeICS(`${plan.title} — ${a.position}`)}\r\n`;
      ics += `DESCRIPTION:${escapeICS(`You are scheduled as ${a.position} for ${plan.title}.`)}\r\n`;
      ics += 'END:VEVENT\r\n';
    }
    ics += 'END:VCALENDAR\r\n';

    if (req.method === 'GET') {
      return new Response(ics, {
        status: 200,
        headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="serving_schedule.ics"' }
      });
    }
    return Response.json({ ics, token: expectedToken });
  } catch (error) {
    console.error('serviceScheduleICS error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function fmt(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}