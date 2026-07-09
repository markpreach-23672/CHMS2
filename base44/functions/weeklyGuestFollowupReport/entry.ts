import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow optional manual triggering with an admin token; scheduled runs have no user.
    let invokingUser = null;
    try { invokingUser = await base44.auth.me(); } catch (e) { invokingUser = null; }
    if (invokingUser && !['super_admin', 'church_admin', 'admin'].includes(invokingUser.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const STEP_LABELS = {
      email: 'Email', text: 'Text', wait: 'Wait', task: 'Task',
      staff_notify: 'Staff Notify', no_response_alert: 'No-Response Alert',
      apply_tag: 'Apply Tag', remove_tag: 'Remove Tag',
    };

    // Locate the First Time Guest card + its follow-up workflow
    const cards = await base44.asServiceRole.entities.ConnectCard.list();
    const card = cards.find((c) => /first.?time.?guest/i.test(c.name) || /first.?time.?guest/i.test(c.title || ''));
    if (!card) return Response.json({ error: 'First Time Guest card not found' }, { status: 404 });

    const workflows = await base44.asServiceRole.entities.Workflow.list();
    const workflow = workflows.find((w) => w.id === card.workflow_id);
    if (!workflow) return Response.json({ error: 'Follow-up workflow not found' }, { status: 404 });

    const steps = await base44.asServiceRole.entities.WorkflowStep.filter({ workflow_id: workflow.id });
    steps.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const enrollments = await base44.asServiceRole.entities.WorkflowEnrollment.filter({ workflow_id: workflow.id });
    const people = await base44.asServiceRole.entities.Person.list();
    const churches = await base44.asServiceRole.entities.Church.list();
    const church = churches[0] || { name: 'Our Church' };

    const rows = enrollments.map((e) => {
      const person = people.find((p) => p.id === e.person_id);
      const stepsDone = e.status === 'completed' ? steps.length : (e.current_step || 0);
      const currentLabel = stepsDone >= steps.length
        ? 'Completed'
        : (steps[stepsDone] ? `${stepsDone + 1}. ${STEP_LABELS[steps[stepsDone].step_type] || steps[stepsDone].step_type}` : '—');
      const enrolledDate = e.enrolled_date
        ? new Date(e.enrolled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';
      const daysSince = e.enrolled_date
        ? Math.floor((Date.now() - new Date(e.enrolled_date).getTime()) / 86400000)
        : '—';
      return {
        name: person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
        email: person?.email || '—',
        phone: person?.phone || person?.mobile || '—',
        enrolled: enrolledDate,
        days: daysSince,
        progress: `${stepsDone} / ${steps.length}`,
        currentStep: currentLabel,
        status: e.status || 'active',
      };
    });

    const totalGuests = enrollments.length;
    const completedCount = enrollments.filter((e) => e.status === 'completed').length;
    const activeCount = enrollments.filter((e) => e.status === 'active').length;

    const tableRows = rows.length ? rows.map((r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500;">${r.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">${r.email}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">${r.phone}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">${r.enrolled}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">${r.days}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">${r.progress}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">${r.currentStep}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;text-transform:capitalize;">${r.status}</td>
      </tr>`).join('')
      : `<tr><td colspan="8" style="padding:20px;text-align:center;color:#94a3b8;">No guests are currently enrolled in this workflow.</td></tr>`;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = `<div style="font-family:sans-serif;max-width:800px;margin:0 auto;color:#1e293b;">
      <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #e2e8f0;margin-bottom:20px;">
        <h2 style="color:#4f46e5;margin:0;">${church.name}</h2>
        <p style="font-size:12px;color:#64748b;margin:4px 0 0;">Weekly First-Time Guest Follow-up Report</p>
        <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;">${today}</p>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#4f46e5;">${totalGuests}</div><div style="font-size:11px;color:#64748b;">Total Guests</div></div>
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#10b981;">${completedCount}</div><div style="font-size:11px;color:#64748b;">Completed</div></div>
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#f59e0b;">${activeCount}</div><div style="font-size:11px;color:#64748b;">In Progress</div></div>
      </div>
      <p style="font-size:13px;margin:0 0 8px;">Workflow: <strong>${workflow.name}</strong> (${steps.length} steps)</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;">Guest</th>
          <th style="padding:8px 12px;text-align:left;">Email</th>
          <th style="padding:8px 12px;text-align:left;">Phone</th>
          <th style="padding:8px 12px;text-align:left;">Enrolled</th>
          <th style="padding:8px 12px;text-align:left;">Days</th>
          <th style="padding:8px 12px;text-align:left;">Progress</th>
          <th style="padding:8px 12px;text-align:left;">Current Step</th>
          <th style="padding:8px 12px;text-align:left;">Status</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="font-size:11px;color:#94a3b8;margin-top:24px;">This report was generated automatically each week. It shows each guest's current position in the follow-up workflow so staff can see who still needs attention.</p>
    </div>`;

    // Send to people tagged with the configured team tag
    const reportTagId = church.guest_report_tag_id;
    if (!reportTagId) {
      return Response.json({ success: false, skipped: 'no_tag_configured', message: 'No team tag configured for the weekly report.' });
    }
    const taggedPeople = people.filter((p) => (p.tag_ids || []).includes(reportTagId));
    const recipientEmails = [...new Set(taggedPeople.filter((p) => p.email).map((p) => p.email))];
    if (recipientEmails.length === 0) {
      return Response.json({ success: false, skipped: 'no_recipients', message: 'No people with the selected tag have an email address.' });
    }

    const subject = `Weekly Guest Follow-up Report — ${church.name}`;
    let sent = 0;
    let failed = 0;
    for (const to of recipientEmails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to, subject, body: html, from_name: church.name,
        });
        sent++;
      } catch (err) {
        console.error(`Report email failed for ${to}:`, err.message);
        failed++;
      }
    }

    return Response.json({ success: true, sent, failed, totalGuests, recipients: recipientEmails });
  } catch (error) {
    console.error('weeklyGuestFollowupReport error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});