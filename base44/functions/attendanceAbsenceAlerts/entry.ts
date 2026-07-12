import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Weekly job: for every attendance-tracked event tag, find people who have missed
// 3 or more consecutive sessions (looking back 6 weeks) and email the event leader.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    if (user && !['super_admin', 'church_admin'].includes(user.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const since = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000); // 6 weeks
    const sinceDate = since.toISOString().split('T')[0];

    const records = await base44.asServiceRole.entities.AttendanceRecord.filter(
      { event_date: { $gte: sinceDate } }, '-event_date', 5000
    );
    if (records.length === 0) return Response.json({ alerts: 0, message: 'No attendance records in window' });

    const trackedEventIds = new Set(records.map((r) => r.event_id));
    const presentSet = new Set(records.filter((r) => r.status === 'present').map((r) => `${r.event_id}:${r.person_id}`));

    const allEvents = await base44.asServiceRole.entities.CalendarEvent.filter(
      { start_time: { $gte: since.toISOString() } }, 'start_time', 2000
    );
    // Sessions = past events that had attendance taken and carry tags
    const sessions = allEvents.filter(
      (e) => trackedEventIds.has(e.id) && (e.tag_ids || []).length > 0 && new Date(e.start_time) <= now
    );
    if (sessions.length === 0) return Response.json({ alerts: 0, message: 'No tagged sessions with attendance' });

    const people = await base44.asServiceRole.entities.Person.list('first_name', 2000);
    const tags = await base44.asServiceRole.entities.Tag.list('name', 1000);
    const tagById = Object.fromEntries(tags.map((t) => [t.id, t]));
    const personById = Object.fromEntries(people.map((p) => [p.id, p]));

    // Group sessions by tag (oldest -> newest)
    const sessionsByTag = {};
    for (const evt of sessions) {
      for (const tagId of evt.tag_ids || []) {
        (sessionsByTag[tagId] = sessionsByTag[tagId] || []).push(evt);
      }
    }

    let alertsSent = 0;
    const details = [];

    for (const [tagId, tagSessions] of Object.entries(sessionsByTag)) {
      tagSessions.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      if (tagSessions.length < 3) continue;

      const latest = tagSessions[tagSessions.length - 1];
      const leader = latest.leader_person_id ? personById[latest.leader_person_id] : null;
      if (!leader || !leader.email) continue; // no leader to notify

      const expected = people.filter((p) => (p.tag_ids || []).includes(tagId));
      const flagged = [];
      for (const person of expected) {
        let streak = 0;
        for (let i = tagSessions.length - 1; i >= 0; i--) {
          if (presentSet.has(`${tagSessions[i].id}:${person.id}`)) break;
          streak++;
        }
        if (streak >= 3) flagged.push({ person, streak });
      }
      if (flagged.length === 0) continue;

      const tagName = tagById[tagId]?.name || 'your group';
      const lines = flagged.map(({ person, streak }) => {
        const contact = [person.mobile || person.phone, person.email].filter(Boolean).join(' | ') || 'no contact info on file';
        return `- ${person.first_name} ${person.last_name}: missed ${streak} straight sessions (${contact})`;
      });

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: leader.email,
          subject: `Attendance alert: ${flagged.length} ${tagName} member${flagged.length === 1 ? '' : 's'} need a check-in`,
          body: `Hi ${leader.first_name},\n\nThe following people in "${tagName}" have missed 3 or more consecutive sessions over the past 6 weeks:\n\n${lines.join('\n')}\n\nA quick call or text could make all the difference.\n\n— Easy Flow Church`,
        });
        alertsSent++;
        details.push({ tag: tagName, leader: leader.email, flagged: flagged.length });
      } catch (e) {
        console.error(`Failed to email leader ${leader.email}:`, e.message);
      }
    }

    return Response.json({ alerts: alertsSent, details });
  } catch (error) {
    console.error('attendanceAbsenceAlerts error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});