import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { calendar_id } = body;

    if (!calendar_id) {
      return Response.json({ error: 'Missing calendar_id' }, { status: 400 });
    }

    let cal;
    try {
      cal = await base44.asServiceRole.entities.DepartmentCalendar.get(calendar_id);
    } catch {
      return Response.json({ error: 'Calendar not found or not public' }, { status: 404 });
    }
    if (!cal.is_public) {
      return Response.json({ error: 'Calendar not found or not public' }, { status: 404 });
    }

    const events = await base44.asServiceRole.entities.CalendarEvent.filter({ calendar_id });

    return Response.json({
      id: cal.id,
      name: cal.name,
      color: cal.color,
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location,
        all_day: e.all_day,
        is_recurring: e.is_recurring,
        recurrence_frequency: e.recurrence_frequency,
        recurrence_interval: e.recurrence_interval,
        recurrence_days: e.recurrence_days,
        recurrence_end_date: e.recurrence_end_date,
        recurrence_week: e.recurrence_week,
        recurrence_weekday: e.recurrence_weekday
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});