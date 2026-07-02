import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { form_id } = body;

    let form;
    try {
      form = await base44.asServiceRole.entities.Form.get(form_id);
    } catch {
      return Response.json({ error: 'Form not found' }, { status: 404 });
    }
    if (!form.is_active || form.is_archived) {
      return Response.json({ error: 'Form not found' }, { status: 404 });
    }

    return Response.json({
      id: form.id,
      title: form.title,
      description: form.description,
      header_image_url: form.header_image_url,
      fields: form.fields || [],
      submit_button_text: form.submit_button_text || 'Submit',
      confirmation_message: form.confirmation_message
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});