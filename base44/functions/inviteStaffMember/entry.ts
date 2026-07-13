import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'church_admin') {
      return Response.json({ error: 'Only admins can invite or promote staff.' }, { status: 403 });
    }
    const { email, role, church_id: bodyChurchId } = await req.json();
    // Default to the inviter's own church so new staff are linked to the right church.
    const church_id = bodyChurchId || user.church_id || null;
    const rawEmail = (email || '').trim();
    const cleanEmail = rawEmail.toLowerCase();
    if (!cleanEmail) return Response.json({ error: 'Email is required.' }, { status: 400 });
    const validRoles = ['staff', 'church_admin', 'super_admin'];
    if (!validRoles.includes(role)) return Response.json({ error: 'Invalid role.' }, { status: 400 });

    // If they already have an account, promote them instead of re-inviting (which would fail).
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const existing = allUsers.find((u) => (u.email || '').toLowerCase() === cleanEmail);
    if (existing) {
      const updates = { role };
      if (church_id) updates.church_id = church_id;
      if (existing.role === role && !church_id) {
        return Response.json({ success: true, action: 'none', message: `${existing.email} is already ${role}.` });
      }
      await base44.asServiceRole.entities.User.update(existing.id, updates);
      return Response.json({ success: true, action: 'promoted', message: `${existing.email} was updated to ${role}.` });
    }

    // Otherwise send a brand-new invite. The platform only accepts 'user'/'admin' as the invite
    // role, so invite as 'user' and then set the desired staff role on the created record.
    try {
      await base44.users.inviteUser(rawEmail, 'user');
    } catch (inviteErr) {
      return Response.json({ error: 'Could not send invite: ' + (inviteErr.message || 'unknown error') }, { status: 500 });
    }
    let roleSet = false;
    try {
      const refreshed = await base44.asServiceRole.entities.User.list('-created_date', 500);
      const created = refreshed.find((u) => (u.email || '').toLowerCase() === cleanEmail);
      if (created) {
        const updates = { role };
        if (church_id) updates.church_id = church_id;
        await base44.asServiceRole.entities.User.update(created.id, updates);
        roleSet = true;
      }
    } catch (e) {
      console.log('Deferred role set:', e.message);
    }
    const message = roleSet
      ? `An invite was sent to ${rawEmail}, and they'll join as ${role}.`
      : `An invite was sent to ${rawEmail}. Set their role to ${role} on the Staff tab once they register.`;
    return Response.json({ success: true, action: 'invited', message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});