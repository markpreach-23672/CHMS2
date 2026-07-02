import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { person_id, year } = body;
    const targetYear = year || new Date().getFullYear();

    const donations = await base44.asServiceRole.entities.Donation.list('-donation_date', 2000);
    const people = await base44.asServiceRole.entities.Person.list();
    const funds = await base44.asServiceRole.entities.Fund.list();
    const churches = await base44.asServiceRole.entities.Church.list();
    const church = churches[0] || { name: 'Our Church' };

    const yearDonations = donations.filter((d) => {
      try { return new Date(d.donation_date).getFullYear() === targetYear; }
      catch { return false; }
    });

    let recipients = [];
    if (person_id === 'all') {
      const personIds = [...new Set(yearDonations.map((d) => d.person_id).filter(Boolean))];
      recipients = personIds.map((pid) => people.find((p) => p.id === pid)).filter(Boolean);
    } else {
      const person = people.find((p) => p.id === person_id);
      if (person) recipients = [person];
    }

    const fundName = (fid) => funds.find((f) => f.id === fid)?.name || 'Unassigned';
    const formatDate = (d) => {
      try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
      catch { return d; }
    };

    let sent = 0;
    let failed = 0;
    const details = [];

    for (const person of recipients) {
      if (!person.email) {
        failed++;
        details.push({ name: `${person.first_name} ${person.last_name}`, status: 'no_email' });
        continue;
      }

      const personDonations = yearDonations.filter((d) => d.person_id === person.id);
      if (personDonations.length === 0) {
        details.push({ name: `${person.first_name} ${person.last_name}`, status: 'no_donations' });
        continue;
      }

      const total = personDonations.reduce((s, d) => s + (d.amount || 0), 0);

      const rows = personDonations.map((d) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${formatDate(d.donation_date)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${fundName(d.fund_id)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-transform:capitalize;">${d.method || 'cash'}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">$${(d.amount || 0).toFixed(2)}</td></tr>`
      ).join('');

      const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
        <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #e2e8f0;margin-bottom:20px;">
          <h2 style="color:#4f46e5;margin:0;">${church.name}</h2>
          <p style="font-size:12px;color:#64748b;margin:4px 0 0;">${[church.address, church.city, church.state, church.zip].filter(Boolean).join(', ')}</p>
        </div>
        <p style="font-size:12px;color:#64748b;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p style="font-size:14px;">Dear ${person.first_name},</p>
        <p style="font-size:14px;">Thank you for your generous contributions to ${church.name} during ${targetYear}. Below is a summary of your giving for your tax records:</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;">Date</th>
            <th style="padding:8px 12px;text-align:left;">Fund</th>
            <th style="padding:8px 12px;text-align:left;">Method</th>
            <th style="padding:8px 12px;text-align:right;">Amount</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="font-weight:bold;border-top:2px solid #cbd5e1;">
            <td colspan="3" style="padding:8px 12px;text-align:right;">Total Giving for ${targetYear}:</td>
            <td style="padding:8px 12px;text-align:right;">$${total.toFixed(2)}</td>
          </tr></tfoot>
        </table>
        <p style="font-size:14px;">Thank you for your faithful generosity and partnership in ministry.</p>
        <p style="font-size:14px;">With gratitude,<br/><strong>${church.name}</strong></p>
        <p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">No goods or services were provided in exchange for these contributions, making them fully tax-deductible to the extent allowed by law.</p>
      </div>`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: person.email,
          subject: `${targetYear} Giving Statement — ${church.name}`,
          body: html,
        });
        sent++;
        details.push({ name: `${person.first_name} ${person.last_name}`, email: person.email, status: 'sent' });
      } catch (err) {
        failed++;
        details.push({ name: `${person.first_name} ${person.last_name}`, email: person.email, status: 'failed', error: err.message });
      }
    }

    return Response.json({ sent, failed, total: recipients.length, year: targetYear, details });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});