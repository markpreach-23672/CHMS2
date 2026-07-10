import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'church_admin') {
      return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }
    const { email, first_name, existing } = await req.json();
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

    const churches = await base44.asServiceRole.entities.Church.list();
    const church = churches[0];
    const fromEmail = church?.resend_from_email || 'Church <onboarding@resend.dev>';
    const churchName = church?.name || 'our church';
    const siteUrl = (church?.site_url || '').replace(/\/$/, '');
    const portalUrl = siteUrl ? `${siteUrl}/my-family` : '/my-family';

    const subject = `Access your profile at ${churchName}`;
    const greeting = first_name ? `Hi ${first_name}` : 'Hello';
    const body = existing
      ? `${greeting},\n\nYou've been invited to view and update your personal profile and family information at ${churchName}. From your member portal you can also view your giving history and print receipts.\n\nOpen your portal: ${portalUrl}\n\nSign in (or create your account) using this email address: ${email}\n\nBlessings,\n${churchName}`
      : `${greeting},\n\nYou've been invited to join the ${churchName} family directory. Please use the link below to enter your personal and family information. You'll also be able to view your giving history and print receipts once your records are linked.\n\nGet started: ${portalUrl}\n\nSign in (or create your account) using this email address: ${email}\n\nBlessings,\n${churchName}`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: email, subject, text: body })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend error (${res.status}): ${errText}`);
      return Response.json({ error: 'Failed to send invitation email' }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});