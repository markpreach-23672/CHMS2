import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const eventType = body.event?.type;
    const entityId = body.event?.entity_id;
    let data = body.data;

    if (!eventType || !entityId) {
      return Response.json({ error: 'Missing event type or entity ID' }, { status: 400 });
    }

    // For delete events from automation, data is null — skip (frontend handles delete separately)
    // For delete events from frontend, data is provided directly
    if (!data && eventType !== 'delete') {
      try {
        data = await base44.asServiceRole.entities.CalendarEvent.get(entityId);
      } catch {
        return Response.json({ status: 'skipped', reason: 'entity_not_found' });
      }
    }
    if (!data) {
      return Response.json({ status: 'skipped', reason: 'no_data' });
    }

    // Resolve target Google Calendar from the linked DepartmentCalendar
    let googleCalendarId = null;
    if (data.calendar_id) {
      try {
        const deptCal = await base44.asServiceRole.entities.DepartmentCalendar.get(data.calendar_id);
        if (deptCal?.google_calendar_id) {
          googleCalendarId = deptCal.google_calendar_id;
        }
      } catch { /* calendar not found */ }
    }

    // Skip if this calendar doesn't have Google sync enabled
    if (!googleCalendarId) {
      return Response.json({ status: 'skipped', reason: 'no_google_calendar_id' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Resolve timezone from Church record
    let timezone = 'America/New_York';
    try {
      const churches = await base44.asServiceRole.entities.Church.list();
      if (churches.length > 0 && churches[0].timezone) {
        timezone = churches[0].timezone;
      }
    } catch { /* use default */ }

    const externalEventId = data.external_event_id;

    // --- DELETE ---
    if (eventType === 'delete') {
      if (externalEventId) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${encodeURIComponent(externalEventId)}`,
          { method: 'DELETE', headers: authHeader }
        );
        return Response.json({ status: 'deleted_from_google', externalEventId });
      }
      return Response.json({ status: 'skipped', reason: 'no_external_event_id' });
    }

    // --- Build Google Calendar event payload ---
    const googleEvent = {
      summary: data.title || 'Untitled Event',
      description: data.description || '',
      location: data.location || '',
    };

    if (data.all_day) {
      const startDate = (data.start_time || '').split('T')[0];
      const endObj = new Date(data.end_time || data.start_time);
      endObj.setDate(endObj.getDate() + 1);
      googleEvent.start = { date: startDate };
      googleEvent.end = { date: endObj.toISOString().split('T')[0] };
    } else {
      googleEvent.start = { dateTime: data.start_time, timeZone: timezone };
      googleEvent.end = { dateTime: data.end_time || data.start_time, timeZone: timezone };
    }

    // --- CREATE ---
    if (eventType === 'create' || !externalEventId) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`,
        {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify(googleEvent),
        }
      );
      const created = await res.json();
      if (created.id) {
        await base44.asServiceRole.entities.CalendarEvent.update(entityId, {
          external_event_id: created.id,
          sync_provider: 'google'
        });
      }
      return Response.json({ status: 'created_in_google', externalEventId: created.id, calendar: googleCalendarId });
    }

    // --- UPDATE ---
    if (eventType === 'update' && externalEventId) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${encodeURIComponent(externalEventId)}`,
        {
          method: 'PUT',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify(googleEvent),
        }
      );
      const updated = await res.json();
      return Response.json({ status: 'updated_in_google', externalEventId: updated.id, calendar: googleCalendarId });
    }

    return Response.json({ status: 'no_action' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});