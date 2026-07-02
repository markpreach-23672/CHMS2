import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const card_id = body.card_id;

    if (!card_id) {
      return Response.json({ error: 'Card ID is required' }, { status: 400 });
    }

    const card = await base44.asServiceRole.entities.ConnectCard.get(card_id);
    if (!card || !card.is_active) {
      return Response.json({ error: 'Card not found or inactive' }, { status: 404 });
    }

    const churches = await base44.asServiceRole.entities.Church.list();
    const church = churches[0] || {};

    return Response.json({
      card: {
        name: card.name,
        title: card.title || '',
        description: card.description || '',
        fields: Array.isArray(card.fields) ? card.fields : [],
        button_text: card.button_text || 'Submit',
        confirmation_message: card.confirmation_message || 'Thank you for your submission!'
      },
      church: {
        name: church.name || 'Church',
        logo_url: church.logo_url || '',
        branding_color: church.branding_color || '#4f46e5'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});