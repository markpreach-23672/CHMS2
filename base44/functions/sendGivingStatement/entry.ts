import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'super_admin', 'church_admin'].includes(user.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { person_id, year, combine_family, start_date, end_date, custom_greeting, custom_message, custom_footer } = body;
    const targetYear = year || new Date().getFullYear();

    const donations = await base44.asServiceRole.entities.Donation.list('-donation_date', 2000);
    const people = await base44.asServiceRole.entities.Person.list();
    const funds = await base44.asServiceRole.entities.Fund.list();
    const churches = await base44.asServiceRole.entities.Church.list();
    const church = churches[0] || { name: 'Our Church' };

    const inDateRange = (d) => {
      try {
        if (start_date && end_date) {
          const dDate = new Date(d.donation_date);
          return dDate >= new Date(start_date) && dDate <= new Date(end_date);
        }
        return new Date(d.donation_date).getFullYear() === targetYear;
      } catch { return false; }
    };

    const rangeDonations = donations.filter(inDateRange);

    const fundName = (fid) => funds.find((f) => f.id === fid)?.name || 'Unassigned';
    const formatDate = (d) => {
      try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
      catch { return d; }
    };

    const dateLabel = start_date && end_date
      ? `${new Date(start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : targetYear.toString();

    const getRecipientName = (group) => {
      const { primary, members } = group;
      if (members.length > 1) {
        const spouse = members.find(m => m.family_role === 'spouse');
        if (spouse) return `${primary.first_name} & ${spouse.first_name} ${primary.last_name}`;
        return members.map(m => `${m.first_name} ${m.last_name}`).join(', ');
      }
      return `${primary.first_name} ${primary.last_name}`;
    };

    // Build recipient groups
    let recipientGroups = [];

    if (combine_family) {
      const personIds = [...new Set(rangeDonations.map(d => d.person_id).filter(Boolean))];
      const donors = personIds.map(pid => people.find(p => p.id === pid)).filter(Boolean);
      const families = {};
      donors.forEach(p => {
        const fid = p.family_id || `solo-${p.id}`;
        if (!families[fid]) families[fid] = [];
        families[fid].push(p);
      });
      recipientGroups = Object.entries(families).map(([fid, members]) => ({
        id: fid,
        members,
        primary: members.find(m => m.family_role === 'head_of_household') || members[0],
      }));
    } else {
      let recipients = [];
      if (person_id === 'all') {
        const personIds = [...new Set(rangeDonations.map(d => d.person_id).filter(Boolean))];
        recipients = personIds.map(pid => people.find(p => p.id === pid)).filter(Boolean);
      } else {
        const person = people.find(p => p.id === person_id);
        if (person) recipients = [person];
      }
      recipientGroups = recipients.map(p => ({ id: p.id, members: [p], primary: p }));
    }

    let sent = 0;
    let failed = 0;
    const details = [];

    for (const group of recipientGroups) {
      const { primary, members } = group;
      const email = primary.email || members.find(m => m.email)?.email;

      if (!email) {
        failed++;
        details.push({ name: getRecipientName(group), status: 'no_email' });
        continue;
      }

      const memberIds = new Set(members.map(m => m.id));
      const groupDonations = rangeDonations.filter(d => memberIds.has(d.person_id));
      if (groupDonations.length === 0) {
        details.push({ name: getRecipientName(group), status: 'no_donations' });
        continue;
      }

      const total = groupDonations.reduce((s, d) => s + (d.amount || 0), 0);

      // Fund breakdown
      const byFund = {};
      groupDonations.forEach(d => {
        const fname = fundName(d.fund_id);
        if (!byFund[fname]) byFund[fname] = 0;
        byFund[fname] += d.amount || 0;
      });
      const fundRows = Object.entries(byFund).map(([name, amt]) =>
        `<tr><td style="padding:4px 12px;">${name}</td><td style="padding:4px 12px;text-align:right;">$${amt.toFixed(2)}</td></tr>`
      ).join('');

      const rows = groupDonations.map(d =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${formatDate(d.donation_date)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${fundName(d.fund_id)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-transform:capitalize;">${d.method || 'cash'}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">$${(d.amount || 0).toFixed(2)}</td></tr>`
      ).join('');

      const recipientName = getRecipientName(group);
      const greetingName = combine_family && members.length > 1
        ? `${primary.first_name} & Family`
        : primary.first_name;

      const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
        <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #e2e8f0;margin-bottom:20px;">
          <h2 style="color:#4f46e5;margin:0;">${church.name}</h2>
          <p style="font-size:12px;color:#64748b;margin:4px 0 0;">${[church.address, church.city, church.state, church.zip].filter(Boolean).join(', ')}</p>
        </div>
        <p style="font-size:12px;color:#64748b;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p style="font-size:14px;">${custom_greeting || `Dear ${greetingName},`}</p>
        ${custom_message ? `<p style="font-size:14px;">${custom_message}</p>` : ''}
        <p style="font-size:14px;">Below is a record of your giving to ${church.name} during ${dateLabel} for your tax records:</p>
        ${fundRows ? `<p style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin:12px 0 4px;">Summary by Fund</p><table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 16px;"><tr style="background:#f8fafc;"><th style="padding:6px 12px;text-align:left;">Fund</th><th style="padding:6px 12px;text-align:right;">Total</th></tr>${fundRows}</table>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;">Date</th>
            <th style="padding:8px 12px;text-align:left;">Fund</th>
            <th style="padding:8px 12px;text-align:left;">Method</th>
            <th style="padding:8px 12px;text-align:right;">Amount</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="font-weight:bold;border-top:2px solid #cbd5e1;">
            <td colspan="3" style="padding:8px 12px;text-align:right;">Total Giving for ${dateLabel}:</td>
            <td style="padding:8px 12px;text-align:right;">$${total.toFixed(2)}</td>
          </tr></tfoot>
        </table>
        ${members.length > 1 ? `<p style="font-size:12px;color:#94a3b8;">This statement includes contributions from: ${members.map(m => m.first_name + ' ' + m.last_name).join(', ')}.</p>` : ''}
        <p style="font-size:14px;">Thank you for your faithful generosity and partnership in ministry.</p>
        <p style="font-size:14px;">With gratitude,<br/><strong>${church.name}</strong></p>
        <p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">${custom_footer || 'No goods or services were provided in exchange for these contributions, making them fully tax-deductible to the extent allowed by law.'}</p>
      </div>`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `${dateLabel} Giving Statement — ${church.name}`,
          body: html,
        });
        sent++;
        details.push({ name: recipientName, email, status: 'sent' });
      } catch (err) {
        failed++;
        details.push({ name: recipientName, email, status: 'failed', error: err.message });
      }
    }

    return Response.json({ sent, failed, total: recipientGroups.length, year: targetYear, details });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});