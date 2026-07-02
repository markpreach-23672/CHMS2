import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const method = req.method;

    // Extract calendar_id from query params (GET) or body (POST)
    let calendarId = null;
    const url = new URL(req.url);
    calendarId = url.searchParams.get('calendar_id');

    if (!calendarId) {
      try {
        const body = await req.json();
        calendarId = body.calendar_id;
      } catch { /* no body */ }
    }

    if (!calendarId) {
      return new Response('Missing calendar_id', { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }

    const cal = await base44.asServiceRole.entities.DepartmentCalendar.get(calendarId);
    if (!cal || !cal.is_public) {
      return new Response('Calendar not found or not public', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }

    const events = await base44.asServiceRole.entities.CalendarEvent.filter({ calendar_id: calendarId });

    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Church//Calendar//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:' + escapeICS(cal.name) + '\r\n';

    for (const event of events) {
      ics += 'BEGIN:VEVENT\r\n';
      ics += `UID:${event.id}@church-calendar\r\n`;
      ics += `DTSTAMP:${formatICSDate(new Date())}\r\n`;

      if (event.all_day) {
        const startDate = (event.start_time || '').split('T')[0].replace(/-/g, '');
        ics += `DTSTART;VALUE=DATE:${startDate}\r\n`;
        const endObj = new Date(event.end_time || event.start_time);
        endObj.setDate(endObj.getDate() + 1);
        ics += `DTEND;VALUE=DATE:${endObj.toISOString().split('T')[0].replace(/-/g, '')}\r\n`;
      } else {
        ics += `DTSTART:${formatICSDateTime(event.start_time)}\r\n`;
        ics += `DTEND:${formatICSDateTime(event.end_time || event.start_time)}\r\n`;
      }

      ics += `SUMMARY:${escapeICS(event.title || 'Untitled Event')}\r\n`;
      if (event.description) ics += `DESCRIPTION:${escapeICS(event.description)}\r\n`;
      if (event.location) ics += `LOCATION:${escapeICS(event.location)}\r\n`;
      ics += 'END:VEVENT\r\n';
    }

    ics += 'END:VCALENDAR\r\n';

    // Return raw ICS for GET (subscription), JSON for POST (frontend download)
    if (method === 'GET') {
      return new Response(ics, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="${cal.name.replace(/\s+/g, '_')}.ics"`
        }
      });
    } else {
      return Response.json({ ics, calendar_name: cal.name });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatICSDateTime(isoString) {
  return new Date(isoString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}