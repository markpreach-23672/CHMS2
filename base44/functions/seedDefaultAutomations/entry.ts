import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'church_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const churchId = user.church_id || (user.data && user.data.church_id) || '';

    const existing = await base44.entities.Automation.filter({ church_id: churchId, trigger_type: 'monthly_digest' });
    if (existing.length > 0) {
      return Response.json({ success: true, created: 0, message: 'Default digest automation already exists' });
    }

    await base44.entities.Automation.create({
      church_id: churchId,
      name: 'Monthly Birthday & Anniversary Digest',
      description: 'Sends a monthly list of upcoming birthdays and anniversaries to chosen staff. Add a recipient and turn it on.',
      trigger_type: 'monthly_digest',
      day_of_month: 28,
      notify_user_ids: [],
      subject: 'Upcoming Birthdays & Anniversaries',
      body: 'Here is your monthly summary of upcoming birthdays and anniversaries to celebrate.',
      is_active: false,
    });

    return Response.json({ success: true, created: 1 });
  } catch (error) {
    console.error('seedDefaultAutomations error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});