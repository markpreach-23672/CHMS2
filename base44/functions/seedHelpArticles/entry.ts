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
  {
    title: 'Your Dashboard',
    category: 'Dashboard',
    body: 'Your dashboard is your home base. Members see their profile, tags, giving history, quick actions, and the help desk chat. Church staff see a dashboard with totals (people, tags, donations, upcoming events), recently added people, and any unresolved help desk questions to review.',
  },
  {
    title: 'The People Directory',
    category: 'People',
    body: 'The People directory is where church staff manage everyone in the church. Staff can add a person, edit contact details, record notes, apply tags, enroll people in follow-up workflows, and view a person’s giving and family connections. Members don’t manage the directory — to update your own info, use your member portal profile.',
  },
  {
    title: 'Families & Households',
    category: 'Families',
    body: 'Families group related people into a household so shared address, phone, and members are visible at a glance. Staff can create a family and add members (head of household, spouse, adult, child). Members can view their own family in the member portal; to make changes, send a Connect Card.',
  },
  {
    title: 'Tags & Groups',
    category: 'Tags',
    body: 'Tags organize people into groups — like “First-time Guest,” “Volunteer,” or “Member.” Staff use tags to filter people, send group messages, trigger follow-up workflows, and build reports. Each tag sits in a folder and has a color for easy spotting.',
  },
  {
    title: 'Finding People (Search)',
    category: 'Search',
    body: 'Use Search to find anyone fast. Staff can search by name, email, or phone, and filter by tags, status, or custom fields. Saved searches let you re-run common lookups (like “Active volunteers”). Members looking for their own record should open the member portal.',
  },
  {
    title: 'Reports',
    category: 'Reports',
    body: 'Reports turn church data into printable views — weekly guest follow-up, giving summaries, a church directory, mailing labels, and custom report builder. Staff can generate, print, or export reports. The weekly guest report can be emailed automatically to your team.',
  },
  {
    title: 'Calendar & Events',
    category: 'Calendar',
    body: 'The Calendar shows everything happening at the church — services, meetings, and special events. Events can be one-time or recurring, placed on a department calendar, and synced to Google Calendar. A public calendar view lets members and visitors see upcoming events, and each public event has a shareable link and an “Add to calendar” option.',
  },
  {
    title: 'Forms & Registrations',
    category: 'Forms',
    body: 'Forms collect information for registrations, sign-ups, and more — event registration, membership, volunteer intake, and custom forms. Each form can have its own fields, payment options, tags, and a follow-up workflow. Members and visitors fill out a public form link; submissions create records and can trigger automatic follow-up.',
  },
  {
    title: 'Elections & Voting',
    category: 'Elections',
    body: 'Elections let the church hold a vote — for board members, budget approval, or any decision. Staff create an election with candidates and an open/close window; members receive a link and vote. Each person can vote up to the set limit, and results are tallied automatically.',
  },
  {
    title: 'Using the Help Desk',
    category: 'Help Desk',
    body: 'The Help Desk chat answers your questions instantly using our church’s help materials. Just type your question. If the assistant can’t find an answer, it logs your question for our staff team to follow up. Church staff can review unresolved questions and manage the help articles from the Help Desk page.',
  },
  {
    title: 'Church Settings',
    category: 'Settings',
    body: 'Settings is where church staff configure the church: profile info (name, address, contact, branding color), custom fields for people and families, staff accounts and permissions, and locations. Only church admins can change settings. Members don’t need to use Settings — personal info lives in the member portal.',
  },
  {
    title: 'Your Member Portal',
    category: 'Member Portal',
    body: 'The Member Portal (“My Family”) is your personal space. Update your contact info and address, view your family, see your tags, and review your giving history and statements. Changes save automatically. If something’s missing or wrong that you can’t edit, send a Connect Card or ask the help desk.',
  },
  {
    title: 'Giving Statements',
    category: 'Giving',
    body: 'At year-end (or anytime you request one), the church provides a giving statement summarizing your contributions for tax purposes. Staff can generate and email individual or bulk statements. If you need a copy or notice a discrepancy, contact the church office or ask here.',
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