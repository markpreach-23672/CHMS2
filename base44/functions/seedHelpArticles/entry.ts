import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULTS = [
  {
    title: 'Service Times & Location',
    category: 'Visiting',
    body: 'Our Sunday services are at 9:00 AM and 11:00 AM, and midweek prayer is Wednesday at 7:00 PM. The church is located at [your street address, city]. Children’s ministry (birth–5th grade) runs during both Sunday services. Plan to arrive about 10 minutes early so you can check in your kids and grab a cup of coffee.',
  },
  {
    title: 'How to Give',
    category: 'Giving',
    body: 'You can give in three ways:\n• Online — open the Giving tab in your member portal and choose a fund and amount.\n• Text-to-give — text the amount to [your text-to-give number].\n• In person — place cash or checks (made payable to the church) in the offering during any service.\nYou’ll receive a year-end giving statement for your tax records. If you have questions about a specific gift, contact the church office.',
  },
  {
    title: 'Volunteering & Serving',
    category: 'Get Involved',
    body: 'We’d love to help you find a place to serve! Open volunteer roles are listed under the Volunteers tab — tap a role to sign up. You can also fill out a Connect Card marked “I want to serve” and our team will follow up with next steps and a conversation about where you might fit best.',
  },
  {
    title: 'What Are Connect Cards?',
    category: 'Connect',
    body: 'Connect Cards are quick digital forms for prayer requests, decisions, event sign-ups, and more. Scan the QR code printed in the bulletin or on signs around the church, fill out the short form, and our team will follow up as needed. You never have to fill one out — but it’s the easiest way to let us know how we can serve you.',
  },
  {
    title: 'Updating Your Information',
    category: 'Account',
    body: 'Keep your profile current! On your member dashboard, use the profile card to edit your contact info, address, and family members. Changes save automatically. If you need to change something you can’t edit (like your email or a family relationship), let us know via a Connect Card.',
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'church_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const churchId = user.church_id || (user.data && user.data.church_id) || '';

    const existing = await base44.entities.HelpDeskArticle.filter({ church_id: churchId });
    const existingTitles = new Set(existing.map((a) => a.title));
    const toCreate = DEFAULTS
      .filter((d) => !existingTitles.has(d.title))
      .map((d) => ({ ...d, church_id: churchId, is_active: true }));

    if (toCreate.length === 0) {
      return Response.json({ success: true, created: 0, message: 'All starter articles already exist.' });
    }
    const created = await base44.entities.HelpDeskArticle.bulkCreate(toCreate);
    return Response.json({ success: true, created: created.length });
  } catch (error) {
    console.error('seedHelpArticles error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});