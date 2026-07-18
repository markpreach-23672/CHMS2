import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function ccliLinks(song) {
  const links = [];
  if (song.song_url) links.push({ label: 'Listen', url: song.song_url });
  if (song.ccli_number) {
    links.push({ label: 'Lyrics (CCLI SongSelect)', url: song.lyrics_url || `https://songselect.ccli.com/songs/${song.ccli_number}/viewlyrics` });
    links.push({ label: 'Sheet Music & Chords (CCLI SongSelect)', url: song.score_url || `https://songselect.ccli.com/songs/${song.ccli_number}` });
  } else {
    if (song.lyrics_url) links.push({ label: 'Lyrics', url: song.lyrics_url });
    if (song.score_url) links.push({ label: 'Sheet Music & Chords', url: song.score_url });
  }
  return links;
}

function tzParts(timezone) {
  const now = new Date();
  const hour = parseInt(now.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }), 10) % 24;
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
  return { hour, dateStr };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const force = body.force === true; // manual "send now" ignores the time-of-day check

    const CRON_KEY = 'efc_cron_9d4b71a6f3e24c58b0a7d1c9e6f28453';
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    const isAdmin = user && ['admin', 'super_admin', 'church_admin'].includes(user.role);
    if (body.cron_key !== CRON_KEY && !isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return Response.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

    const [settingsList, churches] = await Promise.all([
      svc.entities.NotificationSetting.list(),
      svc.entities.Church.list(),
    ]);

    const results = [];

    for (const church of churches) {
      const settings = settingsList.find((s) => s.church_id === church.id) || settingsList[0] || {};
      if (settings.reminders_enabled === false) {
        results.push({ church: church.name, status: 'disabled' });
        continue;
      }
      const daysBefore = Number.isFinite(settings.reminder_days_before) ? settings.reminder_days_before : 3;
      const sendHour = parseInt(settings.reminder_time || '09:00', 10);
      const timezone = church.timezone || 'America/New_York';
      const { hour, dateStr } = tzParts(timezone);

      if (!force && hour !== sendHour) {
        results.push({ church: church.name, status: 'not_send_hour', currentHour: hour, sendHour });
        continue;
      }

      // Target service date = today + daysBefore (in church timezone)
      const target = new Date(dateStr + 'T00:00:00');
      target.setDate(target.getDate() + daysBefore);
      const targetDate = target.toISOString().split('T')[0];

      const plans = await svc.entities.ServicePlan.filter({ church_id: church.id, service_date: targetDate });
      const duePlans = plans.filter((p) => !p.reminder_sent_at && p.status !== 'completed');

      for (const plan of duePlans) {
        const [items, assignments, songs] = await Promise.all([
          svc.entities.PlanItem.filter({ plan_id: plan.id }),
          svc.entities.PlanAssignment.filter({ plan_id: plan.id }),
          svc.entities.Song.list(),
        ]);
        if (assignments.length === 0) continue;
        items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const songById = {};
        for (const s of songs) songById[s.id] = s;

        const personIds = [...new Set(assignments.map((a) => a.person_id))];
        const people = [];
        for (const pid of personIds) {
          const p = await svc.entities.Person.get(pid).catch(() => null);
          if (p) people.push(p);
        }
        const personById = {};
        for (const p of people) personById[p.id] = p;
        const recipients = people.filter((p) => p.email);
        if (recipients.length === 0) continue;

        const dateHuman = new Date(plan.service_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        let teamHtml = '<h3 style="margin:20px 0 8px;">Team</h3><table cellpadding="4" style="border-collapse:collapse;">';
        for (const a of assignments) {
          const p = personById[a.person_id];
          const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown';
          teamHtml += `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">${a.position}</td><td style="padding:2px 0;font-weight:600;">${name}</td></tr>`;
        }
        teamHtml += '</table>';

        let flowHtml = '<h3 style="margin:20px 0 8px;">Order of Service</h3><table cellpadding="4" style="border-collapse:collapse;width:100%;">';
        for (const item of items) {
          if (item.type === 'header') {
            flowHtml += `<tr><td colspan="2" style="padding:10px 0 4px;font-weight:700;text-transform:uppercase;font-size:12px;color:#4f46e5;">${item.title}</td></tr>`;
            continue;
          }
          const song = item.song_id ? songById[item.song_id] : null;
          let label = item.title;
          if (song) {
            const key = item.key_override || song.default_key;
            label = `🎵 ${song.title}${song.artist ? ' — ' + song.artist : ''}${key ? ' (Key of ' + key + ')' : ''}`;
          }
          flowHtml += `<tr><td style="padding:3px 12px 3px 0;color:#94a3b8;white-space:nowrap;">${item.duration_minutes || 0} min</td><td style="padding:3px 0;">${label}</td></tr>`;
        }
        flowHtml += '</table>';

        const songItems = items.filter((i) => i.song_id && songById[i.song_id]);
        let songsHtml = '';
        if (songItems.length > 0) {
          songsHtml = '<h3 style="margin:20px 0 8px;">Worship Songs</h3>';
          for (const item of songItems) {
            const song = songById[item.song_id];
            const key = item.key_override || song.default_key;
            songsHtml += `<div style="margin-bottom:12px;padding:10px;background:#f8fafc;border-radius:8px;">
              <div style="font-weight:600;">${song.title}${song.artist ? ' — ' + song.artist : ''}</div>
              <div style="font-size:12px;color:#64748b;">${key ? 'Key: ' + key + ' · ' : ''}${song.bpm ? 'BPM: ' + song.bpm + ' · ' : ''}${song.ccli_number ? 'CCLI #' + song.ccli_number : ''}</div>`;
            const links = ccliLinks(song);
            if (links.length) {
              songsHtml += '<div style="margin-top:6px;">' + links.map((l) => `<a href="${l.url}" style="color:#4f46e5;font-size:13px;margin-right:14px;">${l.label}</a>`).join('') + '</div>';
            }
            songsHtml += '</div>';
          }
        }

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
            <h2 style="margin-bottom:4px;">Reminder: ${plan.title}</h2>
            <p style="margin-top:0;color:#64748b;">${dateHuman}${plan.service_time ? ' at ' + plan.service_time : ''} · ${church.name || ''}</p>
            <p>This is a reminder that you're scheduled to serve. Here's everything you need:</p>
            ${plan.notes ? `<p>${plan.notes}</p>` : ''}
            ${teamHtml}
            ${flowHtml}
            ${songsHtml}
            <p style="margin-top:24px;font-size:12px;color:#94a3b8;">You're receiving this because you're scheduled to serve. Questions? Reply to this email or contact the church office.</p>
          </div>`;

        const fromEmail = church.resend_from_email || 'Church <onboarding@resend.dev>';
        const subject = `Reminder: ${plan.title} — ${dateHuman}`;

        let sent = 0;
        for (const p of recipients) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromEmail, to: p.email, subject, html })
          });
          if (res.ok) sent++;
          else console.error(`Resend error for ${p.email} (${res.status}): ${await res.text()}`);
        }

        await svc.entities.ServicePlan.update(plan.id, { reminder_sent_at: new Date().toISOString() });
        results.push({ church: church.name, plan: plan.title, sent });
      }

      if (duePlans.length === 0) {
        results.push({ church: church.name, status: 'no_due_plans', targetDate });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('sendServiceReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});