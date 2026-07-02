import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { calendar_id } = body;
    if (!calendar_id) return Response.json({ error: 'Missing calendar_id' }, { status: 400 });

    const deptCal = await base44.asServiceRole.entities.DepartmentCalendar.get(calendar_id);
    if (!deptCal || !deptCal.google_calendar_id) {
      return Response.json({ error: 'Google Calendar not configured for this calendar' }, { status: 400 });
    }

    const googleCalendarId = deptCal.google_calendar_id;
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    let timezone = 'America/New_York';
    try {
      const churches = await base44.asServiceRole.entities.Church.list();
      if (churches[0]?.timezone) timezone = churches[0].timezone;
    } catch { /* use default */ }

    const events = await base44.asServiceRole.entities.CalendarEvent.filter({ calendar_id });

    let synced = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const event of events) {
      try {
        const googleEvent = {
          summary: event.title || 'Untitled Event',
          description: event.description || '',
          location: event.location || '',
        };

        if (event.all_day) {
          const startDate = (event.start_time || '').split('T')[0];
          const endObj = new Date(event.end_time || event.start_time);
          endObj.setDate(endObj.getDate() + 1);
          googleEvent.start = { date: startDate };
          googleEvent.end = { date: endObj.toISOString().split('T')[0] };
        } else {
          googleEvent.start = { dateTime: event.start_time, timeZone: timezone };
          googleEvent.end = { dateTime: event.end_time || event.start_time, timeZone: timezone };
        }

        if (event.external_event_id) {
          // Update existing
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/${encodeURIComponent(event.external_event_id)}`,
            { method: 'PUT', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(googleEvent) }
          );
          if (res.ok) { updated++; synced++; }
          else errors++;
        } else {
          // Create new
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`,
            { method: 'POST', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(googleEvent) }
          );
          const createdEvent = await res.json();
          if (createdEvent.id) {
            await base44.asServiceRole.entities.CalendarEvent.update(event.id, {
              external_event_id: createdEvent.id,
              sync_provider: 'google'
            });
            created++;
            synced++;
          } else {
            errors++;
          }
        }
      } catch (err) {
        errors++;
        console.error(`Sync error for event ${event.id}: ${err.message}`);
      }
    }

    return Response.json({ success: true, synced, created, updated, errors, total: events.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});