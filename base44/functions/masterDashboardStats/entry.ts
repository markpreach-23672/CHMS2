import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return Response.json({ error: 'Super admin access required' }, { status: 403 });

    const svc = base44.asServiceRole;
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const churches = await svc.entities.Church.list('-created_date', 500);

    const results = await Promise.all(churches.map(async (church) => {
      const [people, donations, texts] = await Promise.all([
        svc.entities.Person.filter({ church_id: church.id }, '-created_date', 10000),
        svc.entities.Donation.filter({ church_id: church.id, donation_date: { $gte: yearStart } }, '-donation_date', 10000),
        svc.entities.TextMessageLog.filter({ church_id: church.id, sent_at: { $gte: monthStart }, status: 'sent' }, '-sent_at', 10000),
      ]);

      let ytdIncome = 0;
      let weeklyIncome = 0;
      for (const d of donations) {
        const amt = d.amount || 0;
        ytdIncome += amt;
        if (d.donation_date >= weekAgo) weeklyIncome += amt;
      }

      return {
        id: church.id,
        name: church.name,
        site_url: church.site_url || '',
        custom_domain: church.custom_domain || '',
        monthly_rate: church.monthly_rate || 0,
        subscription_status: church.subscription_status || 'trial',
        created_date: church.created_date,
        members: people.length,
        weeklyIncome,
        ytdIncome,
        textsMtd: texts.length,
      };
    }));

    return Response.json({
      totalChurches: churches.length,
      churches: results,
    });
  } catch (error) {
    console.error('masterDashboardStats error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});