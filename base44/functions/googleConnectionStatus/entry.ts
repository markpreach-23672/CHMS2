import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection('6a52279de7bab96b1a1891ab');
    if (!conn?.accessToken) return Response.json({ connected: false });

    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    });
    return Response.json({ connected: res.ok });
  } catch {
    return Response.json({ connected: false });
  }
});