// Mirrors the absence-monitoring logic in the attendanceAbsenceAlerts backend job:
// for each attendance-tracked tag, flag people who missed 3+ consecutive sessions
// over the past 6 weeks.
export function computeCareAlerts({ records, events, people, tags, folders }) {
  const now = new Date();
  const trackedEventIds = new Set(records.map((r) => r.event_id));
  const presentSet = new Set(
    records.filter((r) => r.status === 'present').map((r) => `${r.event_id}:${r.person_id}`)
  );
  const tagById = Object.fromEntries(tags.map((t) => [t.id, t]));
  const folderById = Object.fromEntries(folders.map((f) => [f.id, f]));

  const sessions = events.filter(
    (e) => trackedEventIds.has(e.id) && (e.tag_ids || []).length > 0 && new Date(e.start_time) <= now
  );

  const sessionsByTag = {};
  for (const evt of sessions) {
    for (const tagId of evt.tag_ids || []) {
      (sessionsByTag[tagId] = sessionsByTag[tagId] || []).push(evt);
    }
  }

  const alerts = [];
  for (const [tagId, tagSessions] of Object.entries(sessionsByTag)) {
    tagSessions.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    if (tagSessions.length < 3) continue;

    const tag = tagById[tagId];
    const folder = tag?.folder_id ? folderById[tag.folder_id] : null;
    const latest = tagSessions[tagSessions.length - 1];
    const leaderIds = new Set([
      ...(tag?.leader_person_ids || []),
      ...(folder?.leader_person_id ? [folder.leader_person_id] : []),
      ...(latest.leader_person_id ? [latest.leader_person_id] : []),
    ]);

    const expected = people.filter((p) => (p.tag_ids || []).includes(tagId));
    for (const person of expected) {
      let streak = 0;
      for (let i = tagSessions.length - 1; i >= 0; i--) {
        if (presentSet.has(`${tagSessions[i].id}:${person.id}`)) break;
        streak++;
      }
      if (streak >= 3) {
        alerts.push({ person, tagId, tagName: tag?.name || 'Group', streak: Math.min(streak, 6), leaderIds });
      }
    }
  }

  alerts.sort((a, b) => b.streak - a.streak);
  return alerts;
}