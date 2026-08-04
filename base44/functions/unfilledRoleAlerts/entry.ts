import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CRON_KEY = 'efc_cron_9d4b71a6f3e24c58b0a7d1c9e6f28453';

function tzParts(timezone: string) {
  const now = new Date();
  const hour = parseInt(now.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }), 10) % 24;
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
  return { hour, dateStr };
}

function esc(s: string) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const force = body.force === true;

    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    const isAdmin = user && ['admin', 'super_admin', 'church_admin'].includes(user.role);
    if (body.cron_key !== CRON_KEY && !isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return Response.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

    const [churches, settingsList, serviceTypes, users] = await Promise.all([
      svc.entities.Church.list(),
      svc.entities.NotificationSetting.list(),
      svc.entities.ServiceType.list(),
      svc.entities.User.list(),
    ]);

    const results: any[] = [];

    for (const church of churches) {
      const settings = settingsList.find((s: any) => s.church_id === church.id) || {};
      const alertHour = parseInt(settings.reminder_time || '09:00', 10);
      const timezone = church.timezone || 'America/New_York';
      const { hour, dateStr } = tzParts(timezone);

      if (!force && hour !== alertHour) {
        results.push({ church: church.name, status: 'not_send_hour', currentHour: hour, alertHour });
        continue;
      }

      // 48 hours out (in the church's timezone)
      const target = new Date(dateStr + 'T00:00:00');
      target.setDate(target.getDate() + 2);
      const targetDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;

      const plans = await svc.entities.ServicePlan.filter({ church_id: church.id, service_date: targetDate });
      const duePlans = plans.filter((p: any) => p.status !== 'completed' && !p.unfilled_alert_sent_at);

      if (duePlans.length === 0) {
        results.push({ church: church.name, status: 'no_due_plans', targetDate });
        continue;
      }

      // Ministry leaders = church admins for this church, falling back to the church office email
      const leaderEmails = users
        .filter((u: any) => u.church_id === church.id && ['church_admin', 'admin'].includes(u.role) && u.email)
        .map((u: any) => u.email);
      if (leaderEmails.length === 0 && church.email) leaderEmails.push(church.email);
      if (leaderEmails.length === 0) {
        results.push({ church: church.name, status: 'no_leader_email' });
        continue;
      }

      for (const plan of duePlans) {
        const serviceType = serviceTypes.find((st: any) => st.id === plan.service_type_id);
        const positions: string[] = serviceType?.positions || [];
        if (positions.length === 0) {
          results.push({ church: church.name, plan: plan.title, status: 'no_positions_defined' });
          continue;
        }

        const assignments = await svc.entities.PlanAssignment.filter({ plan_id: plan.id });
        const filled = new Set(
          assignments.filter((a: any) => (a.status || 'scheduled') !== 'declined').map((a: any) => a.position)
        );
        const unfilled = positions.filter((p) => !filled.has(p));

        if (unfilled.length === 0) {
          results.push({ church: church.name, plan: plan.title, status: 'fully_staffed' });
          continue;
        }

        const dateHuman = new Date(plan.service_date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        });
        const declined = assignments.filter((a: any) => a.status === 'declined');

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
            <h2 style="margin-bottom:4px;">${unfilled.length} unfilled role${unfilled.length === 1 ? '' : 's'} — ${esc(plan.title)}</h2>
            <p style="margin-top:0;color:#64748b;">${dateHuman}${plan.service_time ? ' at ' + esc(plan.service_time) : ''} · in 48 hours</p>
            <p>These positions still need a volunteer:</p>
            <ul style="padding-left:18px;">
              ${unfilled.map((p) => `<li style="margin-bottom:4px;font-weight:600;">${esc(p)}</li>`).join('')}
            </ul>
            ${declined.length ? `<p style="color:#b91c1c;font-size:13px;">${declined.length} volunteer${declined.length === 1 ? ' has' : 's have'} declined for this service.</p>` : ''}
            <p style="font-size:13px;color:#64748b;">Open the Scheduling Board in Service Planning to fill these roles.</p>
          </div>`;

        const fromEmail = church.resend_from_email || 'Church <onboarding@resend.dev>';
        let sent = 0;
        for (const email of leaderEmails) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: fromEmail,
              to: email,
              subject: `Action needed: ${unfilled.length} unfilled role${unfilled.length === 1 ? '' : 's'} for ${plan.title}`,
              html,
            }),
          });
          if (res.ok) sent++;
          else console.error(`Resend error for ${email} (${res.status}): ${await res.text()}`);
        }

        await svc.entities.ServicePlan.update(plan.id, { unfilled_alert_sent_at: new Date().toISOString() });
        results.push({ church: church.name, plan: plan.title, unfilled, sent });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('unfilledRoleAlerts error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});