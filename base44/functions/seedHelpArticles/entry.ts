import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULTS = [
  {
    title: 'Service Times & Location',
    category: 'Visiting',
    body: `When you visit, here's what to expect:\n1. Arrive about 10 minutes early to park, check in kids, and grab coffee.\n2. Check in children (birth–5th grade) at the children's ministry desk before the service.\n3. Find a seat in the auditorium — ushers can help with directions.\n4. After the service, stop by the Connect Card table in the lobby so we can welcome you and share next steps.\n\nService times: Sunday 9:00 AM & 11:00 AM. Midweek prayer: Wednesday 7:00 PM. Location: [your street address, city].`,
  },
  {
    title: 'How to Give',
    category: 'Giving',
    body: `You can give in three ways.\n\nOnline:\n1. Open the Giving tab in your member portal.\n2. Choose a fund and enter the amount.\n3. Pick one-time or recurring.\n4. Enter payment details and confirm.\n\nText-to-give:\n1. Text the amount to [your text-to-give number].\n2. Follow the text link to set up your first gift.\n3. After that, text an amount to give again.\n\nIn person:\n1. Place cash or a check (payable to the church) in the offering during any service.\n2. Use a giving envelope if you'd like a year-end statement.`,
  },
  {
    title: 'Volunteering & Serving',
    category: 'Get Involved',
    body: `Ready to serve? Here's how:\n1. Open the Volunteers tab to see open roles.\n2. Tap a role to read its description.\n3. Tap Sign Up to express interest.\n4. Or fill out a Connect Card marked "I want to serve."\n5. Our team will follow up with next steps.`,
  },
  {
    title: 'What Are Connect Cards?',
    category: 'Connect',
    body: `Connect Cards are quick digital forms. To use one:\n1. Scan the QR code in the bulletin or on signs around the church.\n2. The card opens on your phone — no app needed.\n3. Fill out the short form (name, contact, and what you'd like to share).\n4. Tap Submit.\n5. Our team receives your card and follows up as needed.`,
  },
  {
    title: 'Updating Your Information',
    category: 'Account',
    body: `To update your profile:\n1. Open your member portal (My Family).\n2. Click the profile card.\n3. Edit your contact info, address, or other fields.\n4. Changes save automatically.\n5. For something you can't edit (like your email or a family relationship), send a Connect Card.`,
  },
  {
    title: 'Your Dashboard',
    category: 'Dashboard',
    body: `Your dashboard is your home base.\n\nMembers:\n1. Sign in and open your dashboard.\n2. Review your profile, tags, and giving summary.\n3. Use Quick Actions to jump to common tasks.\n4. Use the Help Desk chat to ask any question.\n\nStaff:\n1. Sign in to see church totals (people, tags, donations, events).\n2. Review recently added people.\n3. Check "Unresolved Help Desk Questions" and resolve any open items.`,
  },
  {
    title: 'The People Directory',
    category: 'People',
    body: `Staff manage everyone in the church here.\n1. Open the People tab.\n2. Search by name, email, or phone.\n3. Click a person to view or edit their details.\n4. Click Add Person to create a new profile.\n5. From a profile, apply tags, add notes, or enroll in a follow-up workflow.\n\nMembers: to update your own info, use your member portal.`,
  },
  {
    title: 'Families & Households',
    category: 'Families',
    body: `Families group related people into a household.\n1. Open the Families tab.\n2. Click a family to see its members and shared address.\n3. To create one, click Add Family and enter the family name and address.\n4. Add members and assign roles (head of household, spouse, adult, child).\n5. Members view their own family in the member portal; changes go through a Connect Card.`,
  },
  {
    title: 'Tags & Groups',
    category: 'Tags',
    body: `Tags organize people into groups.\n1. Open the Tags tab.\n2. Create a folder with Add Folder to group related tags.\n3. Click Add Tag, name it, pick a color, and save it into a folder.\n4. Apply tags from a person's profile (Tag button).\n5. Use tags to filter people, send group messages, or trigger workflows.`,
  },
  {
    title: 'Finding People (Search)',
    category: 'Search',
    body: `Use Search to find anyone fast.\n1. Open the Search tab.\n2. Type a name, email, or phone in the search bar.\n3. Add filters (tags, status, custom fields) to narrow results.\n4. Click a result to open the person's profile.\n5. Save common lookups as a Saved Search to re-run them anytime.`,
  },
  {
    title: 'Reports',
    category: 'Reports',
    body: `Reports turn your data into printable views.\n1. Open the Reports tab.\n2. Pick a prebuilt report (weekly guest follow-up, giving summary, directory, mailing labels).\n3. Set any filters or date range.\n4. Click Generate to preview.\n5. Print or export the result.\n6. Use Report Builder for a custom report, or enable the weekly guest report email to send it automatically.`,
  },
  {
    title: 'Calendar & Events',
    category: 'Calendar',
    body: `The Calendar shows everything happening at the church.\n1. Open the Calendar tab.\n2. Switch between Month, Week, Day, or Agenda views.\n3. Click a date/time and Add Event to create one.\n4. Set the title, time, location, and (optionally) recurrence.\n5. Pick a department calendar and sync to Google Calendar if connected.\n6. For a public view, mark the calendar public and share its link; each event has an "Add to calendar" option.`,
  },
  {
    title: 'Forms & Registrations',
    category: 'Forms',
    body: `Forms collect information for registrations and sign-ups.\n1. Open the Forms tab.\n2. Click New Form (or start from a template).\n3. Add fields (name, email, payment, etc.) and mark required ones.\n4. Set tags, a follow-up workflow, and a confirmation message.\n5. Save and open Share to get the public link or embed code.\n6. Review submissions under the form's Responses tab.`,
  },
  {
    title: 'Elections & Voting',
    category: 'Elections',
    body: `Elections let the church hold a vote.\n1. Open the Elections tab and click New Election.\n2. Enter the title, candidates, and the open/close window.\n3. Set how many votes each person gets.\n4. Open the election to send members the voting link.\n5. Members click the link, cast their vote, and results tally automatically.\n6. Close the election to lock results.`,
  },
  {
    title: 'Using the Help Desk',
    category: 'Help Desk',
    body: `The Help Desk chat answers your questions instantly.\n1. Open your dashboard and find the Help Desk chat.\n2. Type your question (or tap a suggested question).\n3. The assistant answers from our church's help materials.\n4. If it can't answer, it logs your question for staff follow-up.\n\nStaff: review unresolved questions and manage the help articles from the Help Desk page.`,
  },
  {
    title: 'Church Settings',
    category: 'Settings',
    body: `Settings is for church admins.\n1. Open the Settings tab.\n2. Update church profile (name, address, contact, branding color).\n3. Add custom fields for people or families under Custom Fields.\n4. Manage staff accounts and permissions under Staff & Permissions.\n5. Configure locations under Locations.\n\nOnly church admins can change settings. Members don't need to use Settings.`,
  },
  {
    title: 'Your Member Portal',
    category: 'Member Portal',
    body: `Your personal space, at "My Family".\n1. Sign in and open My Family.\n2. Edit your contact info and address in the profile card.\n3. View your family members and tags.\n4. Review your giving history and statements.\n5. For anything you can't change, send a Connect Card or ask the Help Desk.`,
  },
  {
    title: 'Giving Statements',
    category: 'Giving',
    body: `To get a giving statement:\n1. Open your member portal and find the Giving section.\n2. View your giving history and any available statement.\n3. If you need a new or corrected statement, contact the church office or ask the Help Desk.\n\nStaff can generate individual or bulk statements from the Giving tab.`,
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
    const byTitle = {};
    for (const a of existing) byTitle[a.title] = a;

    let created = 0;
    let updated = 0;
    for (const d of DEFAULTS) {
      if (byTitle[d.title]) {
        // Refresh text only; preserve any screenshot the admin attached.
        await base44.entities.HelpDeskArticle.update(byTitle[d.title].id, {
          title: d.title,
          body: d.body,
          category: d.category,
        });
        updated++;
      } else {
        await base44.entities.HelpDeskArticle.create({ ...d, church_id: churchId, is_active: true });
        created++;
      }
    }

    return Response.json({ success: true, created, updated });
  } catch (error) {
    console.error('seedHelpArticles error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});