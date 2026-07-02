import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { entry_id, origin } = body;

    if (!entry_id) return Response.json({ error: 'Missing entry_id' }, { status: 400 });

    let entry;
    try {
      entry = await base44.asServiceRole.entities.FormEntry.get(entry_id);
    } catch {
      return Response.json({ error: 'Entry not found' }, { status: 404 });
    }

    const form = await base44.asServiceRole.entities.Form.get(entry.form_id);
    if (!form) return Response.json({ error: 'Form not found' }, { status: 404 });

    const amount = Math.round((entry.payment_amount || 0) * 100);
    if (amount <= 0) return Response.json({ error: 'No payment required' }, { status: 400 });

    const baseUrl = origin || 'https://app.base44.com';
    const params = new URLSearchParams();
    params.append('payment_method_types[0]', 'card');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', form.title);
    params.append('line_items[0][price_data][unit_amount]', String(amount));
    params.append('line_items[0][quantity]', '1');
    params.append('mode', 'payment');
    params.append('success_url', `${baseUrl}/form/${form.id}?payment=success&entry=${entry.id}`);
    params.append('cancel_url', `${baseUrl}/form/${form.id}?payment=cancelled&entry=${entry.id}`);
    params.append('metadata[base44_app_id]', Deno.env.get('BASE44_APP_ID') || '');
    params.append('metadata[entry_id]', entry.id);
    params.append('metadata[form_id]', form.id);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await res.json();
    if (!res.ok) {
      console.error('Stripe error:', JSON.stringify(session));
      return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 400 });
    }

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});