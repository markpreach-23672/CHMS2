import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole;

    // Determine which service plan to sync (direct call or entity automation payload)
    let planId = body.plan_id || null;
    let deletedPlanData = null;

    if (!planId && body.event) {
      const { entity_name, entity_id, type } = body.event;
      if (entity_name === 'ServicePlan') {
        if (type === 'delete') {
          deletedPlanData = body.data;
        } else {
          planId = entity_id;
        }
      } else if (entity_name === 'PlanAssignment') {
        planId = body.data?.plan_id || null;
        if (!planId && body.payload_too_large && type !== 'delete') {
          const assignment = await svc.entities.PlanAssignment.get(entity_id).catch(() => null);
          planId = assignment?.plan_id || null;
        }
      }
    }

    const { accessToken } = await svc.connectors.getConnection('googlecalendar');
    const gcal = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Plan was deleted — remove the Google event so attendees get cancellations
    if (deletedPlanData) {
      if (deletedPlanData.google_event_id) {
        await fetch(`${gcal}/${deletedPlanData.google_event_id}?sendUpdates=all`, { method: 'DELETE', headers });
        return Response.json({ status: 'event_deleted' });
      }
      return Response.json({ status: 'no_event_to_delete' });
    }

    if (!planId) return Response.json({ status: 'no_plan_id' });

    const plan = await svc.entities.ServicePlan.get(planId).catch(() => null);
    if (!plan) return Response.json({ status: 'plan_not_found' });

    // Gather assignments and the assigned people
    const assignments = await svc.entities.PlanAssignment.filter({ plan_id: planId });
    if (assignments.length === 0 && !plan.google_event_id) {
      return Response.json({ status: 'no_assignments' });
    }

    const personIds = [...new Set(assignments.map((a) => a.person_id))];
    const people = [];
    for (const pid of personIds) {
      const p = await svc.entities.Person.get(pid).catch(() => null);
      if (p) people.push(p);
    }
    const attendees = people.filter((p) => p.email).map((p) => ({ email: p.email }));

    // Timezone from the church profile
    let timezone = 'America/New_York';
    if (plan.church_id) {
      const church = await svc.entities.Church.get(plan.church_id).catch(() => null);
      if (church?.timezone) timezone = church.timezone;
    }

    // Build start/end times (default 90-minute service)
    const time = plan.service_time || '10:00';
    const [h, m] = time.split(':').map(Number);
    const endTotal = h * 60 + m + 90;
    const endH = String(Math.floor(endTotal / 60) % 24).padStart(2, '0');
    const endM = String(endTotal % 60).padStart(2, '0');

    const roster = assignments
      .map((a) => {
        const p = people.find((pp) => pp.id === a.person_id);
        return `${a.position}: ${p ? `${p.first_name} ${p.last_name}` : 'Unknown'}`;
      })
      .join('\n');

    const eventBody = {
      summary: plan.title,
      description: `You are scheduled to serve at this service.\n\nTeam:\n${roster}`,
      start: { dateTime: `${plan.service_date}T${time}:00`, timeZone: timezone },
      end: { dateTime: `${plan.service_date}T${endH}:${endM}:00`, timeZone: timezone },
      attendees,
    };

    const createEvent = async () => {
      const res = await fetch(`${gcal}?sendUpdates=all`, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventBody),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Google Calendar create failed:', err);
        throw new Error(`Google Calendar create failed (${res.status})`);
      }
      const created = await res.json();
      await svc.entities.ServicePlan.update(planId, { google_event_id: created.id });
      return created.id;
    };

    if (plan.google_event_id) {
      const res = await fetch(`${gcal}/${plan.google_event_id}?sendUpdates=all`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(eventBody),
      });
      if (res.ok) return Response.json({ status: 'updated', event_id: plan.google_event_id });
      if (res.status === 404 || res.status === 410) {
        // Event was removed in Google — recreate it
        const eventId = await createEvent();
        return Response.json({ status: 'recreated', event_id: eventId });
      }
      const err = await res.text();
      console.error('Google Calendar update failed:', err);
      return Response.json({ error: `Google Calendar update failed (${res.status})` }, { status: 500 });
    }

    const eventId = await createEvent();
    return Response.json({ status: 'created', event_id: eventId });
  } catch (error) {
    console.error('syncServicePlanToGoogle error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});