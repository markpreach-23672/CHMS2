import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    // Parse Stripe signature header: t=timestamp,v1=signature
    const parts = signature.split(',').map((s) => s.trim().split('='));
    const tPart = parts.find((p) => p[0] === 't');
    const v1Part = parts.find((p) => p[0] === 'v1');
    if (!tPart || !v1Part) {
      return Response.json({ error: 'Invalid signature format' }, { status: 400 });
    }

    const timestamp = tPart[1];
    const providedSig = v1Part[1];

    // Verify timestamp freshness (5 minutes)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300) {
      return Response.json({ error: 'Stale webhook' }, { status: 400 });
    }

    // Compute HMAC-SHA256
    const payload = `${timestamp}.${body}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const computedSig = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedSig !== providedSig) {
      console.error('Stripe webhook signature mismatch');
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const entryId = session.metadata?.entry_id;
      if (entryId) {
        try {
          await base44.asServiceRole.entities.FormEntry.update(entryId, {
            payment_status: 'paid'
          });
        } catch (err) {
          console.error('Failed to update entry:', err.message);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});