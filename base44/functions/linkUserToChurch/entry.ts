import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Links the logged-in user to the correct church:
// 1. If they already have a church_id, keep it.
// 2. If a subdomain is provided (they signed in via a church login page), use that church.
// 3. Otherwise, match their email to a Person record and use that person's church.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.church_id) return Response.json({ church_id: user.church_id, linked: false });

    let churchId = null;
    let body = {};
    try { body = await req.json(); } catch (e) { /* no body */ }

    if (body.subdomain) {
      const matches = await base44.asServiceRole.entities.Church.filter({ subdomain: body.subdomain });
      churchId = matches[0]?.id || null;
    }

    if (!churchId && user.email) {
      const people = await base44.asServiceRole.entities.Person.filter({ email: user.email });
      const person = people.find((p) => p.church_id);
      churchId = person?.church_id || null;
    }

    if (!churchId) {
      return Response.json({ church_id: null, linked: false, message: 'No matching church found for this account.' });
    }

    await base44.asServiceRole.entities.User.update(user.id, { church_id: churchId });
    return Response.json({ church_id: churchId, linked: true });
  } catch (error) {
    console.error('linkUserToChurch error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});