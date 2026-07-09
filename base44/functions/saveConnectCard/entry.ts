import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Please log in to save a connect card.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only admins can create or edit connect cards.' }, { status: 403 });

    const body = await req.json();
    const { id, ...data } = body;

    if (!data.name || !String(data.name).trim()) {
      return Response.json({ error: 'Card name is required.' }, { status: 400 });
    }

    let result;
    if (id) {
      result = await base44.asServiceRole.entities.ConnectCard.update(id, data);
    } else {
      result = await base44.asServiceRole.entities.ConnectCard.create(data);
    }
    return Response.json(result);
  } catch (error) {
    console.error('saveConnectCard error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});