import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const churches = await base44.asServiceRole.entities.Church.list();
    const fromEmail = churches[0]?.resend_from_email || 'Church <onboarding@resend.dev>';

    const body = await req.json();
    const { connect_card_id, field_data, first_name, last_name, email, phone, message } = body;

    if (!connect_card_id) {
      return Response.json({ error: 'Connect card ID is required' }, { status: 400 });
    }

    const card = await base44.asServiceRole.entities.ConnectCard.get(connect_card_id);
    if (!card || !card.is_active) {
      return Response.json({ error: 'Connect card not found or inactive' }, { status: 404 });
    }

    // Build person data from field_data (new) or individual fields (backward compat)
    const data = field_data || {};
    const personData = {};
    const customData = {};

    const fields = Array.isArray(card.fields) ? card.fields : [];
    if (fields.length > 0) {
      for (const field of fields) {
        const value = data[field.key];
        if (value === undefined || value === '' || value === false) continue;
        if (field.maps_to === 'custom') {
          customData[field.key] = value;
        } else if (field.maps_to) {
          personData[field.maps_to] = value;
        }
      }
    } else {
      if (first_name) personData.first_name = first_name;
      if (last_name) personData.last_name = last_name;
      if (email) personData.email = email;
      if (phone) personData.phone = phone;
      if (message) personData.notes = message;
    }

    // Ensure minimum person data
    if (!personData.first_name) personData.first_name = data.first_name || first_name || 'Guest';
    if (!personData.last_name) personData.last_name = data.last_name || last_name || '';
    if (!personData.email) personData.email = data.email || email || '';
    if (!personData.phone) personData.phone = data.phone || phone || '';
    if (!personData.status) personData.status = 'visitor';

    const matchEmail = personData.email;
    const matchPhone = personData.phone;

    // Find existing person by email or phone (prevent duplicates)
    let person;
    if (matchEmail) {
      const existing = await base44.asServiceRole.entities.Person.filter({ email: matchEmail });
      person = existing[0];
    }
    if (!person && matchPhone) {
      const existing = await base44.asServiceRole.entities.Person.filter({ phone: matchPhone });
      person = existing[0];
    }

    if (person) {
      // Update existing person with new data
      const updateData = { ...personData };
      delete updateData.status;
      if (person.status === 'inactive') updateData.status = 'visitor';
      if (Object.keys(customData).length > 0) {
        updateData.custom_fields = { ...(person.custom_fields || {}), ...customData };
      }
      // Append notes rather than overwriting
      if (personData.notes && person.notes && personData.notes !== person.notes) {
        updateData.notes = person.notes + '\n\n--- New Submission (' + new Date().toLocaleDateString() + ') ---\n' + personData.notes;
      }
      await base44.asServiceRole.entities.Person.update(person.id, updateData);
    } else {
      if (Object.keys(customData).length > 0) {
        personData.custom_fields = customData;
      }
      person = await base44.asServiceRole.entities.Person.create(personData);
    }

    // Apply tags configured on the card
    if (card.tag_ids && card.tag_ids.length > 0) {
      const existingTags = person.tag_ids || [];
      const newTags = [...new Set([...existingTags, ...card.tag_ids])];
      if (newTags.length !== existingTags.length) {
        await base44.asServiceRole.entities.Person.update(person.id, { tag_ids: newTags });
      }
    }

    // If card has a workflow, enroll and process immediate steps
    if (card.workflow_id) {
      const workflow = await base44.asServiceRole.entities.Workflow.get(card.workflow_id);
      if (workflow && workflow.is_active) {
        const existingEnrollments = await base44.asServiceRole.entities.WorkflowEnrollment.filter({
          workflow_id: card.workflow_id,
          person_id: person.id,
          status: 'active'
        });

        if (existingEnrollments.length === 0) {
          const enrollment = await base44.asServiceRole.entities.WorkflowEnrollment.create({
            workflow_id: card.workflow_id,
            person_id: person.id,
            current_step: 0,
            enrolled_date: new Date().toISOString(),
            status: 'active'
          });

          const steps = await base44.asServiceRole.entities.WorkflowStep.filter({ workflow_id: card.workflow_id });
          steps.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

          let nextStep = 0;
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if ((step.delay_days || 0) === 0) {
              await processStep(base44, step, person, fromEmail, churches[0], card, data);
              nextStep = i + 1;
            } else {
              break;
            }
          }

          if (nextStep >= steps.length) {
            await base44.asServiceRole.entities.WorkflowEnrollment.update(enrollment.id, {
              current_step: nextStep,
              status: 'completed',
              completed_date: new Date().toISOString()
            });
          } else {
            await base44.asServiceRole.entities.WorkflowEnrollment.update(enrollment.id, {
              current_step: nextStep
            });
          }
        }
      }
    }

    return Response.json({ success: true, person_id: person.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processStep(base44, step, person, fromEmail, church, card, fieldData) {
  if (step.step_type === 'staff_notify' && step.assigned_to_user_id) {
    try {
      const staffUser = await base44.asServiceRole.entities.User.get(step.assigned_to_user_id);
      if (!staffUser || !staffUser.email) return;
      const guestName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Guest';
      const subject = step.subject || `New guest follow-up: ${guestName}`;
      let emailBody = `A new guest has submitted a connect card and needs follow-up.\n\n`;
      emailBody += `Guest Information:\n`;
      emailBody += `  Name: ${guestName}\n`;
      emailBody += `  Email: ${person.email || 'N/A'}\n`;
      emailBody += `  Phone: ${person.phone || person.mobile || 'N/A'}\n`;
      if (step.info_scope === 'all') {
        if (person.mobile) emailBody += `  Mobile: ${person.mobile}\n`;
        if (person.address) emailBody += `  Address: ${person.address}${person.city ? ', ' + person.city : ''}${person.state ? ', ' + person.state : ''}${person.zip ? ' ' + person.zip : ''}\n`;
        if (person.birth_date) emailBody += `  Birth Date: ${person.birth_date}\n`;
        emailBody += `  Status: ${person.status || 'N/A'}\n`;
      }
      if (person.notes) emailBody += `  Message: ${person.notes}\n`;
      emailBody += `\nInstructions for contacting this guest:\n`;
      emailBody += step.body || '(No specific instructions provided)';
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: staffUser.email, subject, text: emailBody })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Resend API error (${res.status}): ${errText}`);
      }
    } catch (err) {
      console.error(`Staff notification failed: ${err.message}`);
    }
  }
  if (step.step_type === 'no_response_alert' && step.assigned_to_user_id) {
    try {
      const staffUser = await base44.asServiceRole.entities.User.get(step.assigned_to_user_id);
      if (!staffUser || !staffUser.email) return;
      const guestName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Guest';
      const subject = `Follow-up needed: ${guestName} hasn't responded`;
      let emailBody = `${guestName} submitted a connect card and hasn't responded to our follow-up outreach. They may be falling through the cracks.\n\n`;
      emailBody += `Guest Contact Information:\n`;
      emailBody += `  Name: ${guestName}\n`;
      emailBody += `  Email: ${person.email || 'N/A'}\n`;
      emailBody += `  Phone: ${person.phone || person.mobile || 'N/A'}\n`;
      if (step.info_scope === 'all') {
        if (person.mobile) emailBody += `  Mobile: ${person.mobile}\n`;
        if (person.address) emailBody += `  Address: ${person.address}${person.city ? ', ' + person.city : ''}${person.state ? ', ' + person.state : ''}${person.zip ? ' ' + person.zip : ''}\n`;
        if (person.birth_date) emailBody += `  Birth Date: ${person.birth_date}\n`;
        emailBody += `  Status: ${person.status || 'N/A'}\n`;
      }
      if (person.notes) emailBody += `  Original Message: ${person.notes}\n`;
      emailBody += `\nInstructions:\n`;
      emailBody += step.body || 'Please reach out personally (call or text) to connect with this guest and make sure they feel welcomed.';
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: staffUser.email, subject, text: emailBody })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Resend API error (${res.status}): ${errText}`);
      }
    } catch (err) {
      console.error(`No-response alert failed: ${err.message}`);
    }
  }
  if (step.step_type === 'email' && person.email) {
    const ch = church || {};
    const cardFields = Array.isArray(card?.fields) ? card.fields : [];
    let body = step.body || '';
    body = body.replace(/\{\{first_name\}\}/g, person.first_name || 'there');
    body = body.replace(/\{\{last_name\}\}/g, person.last_name || '');
    body = body.replace(/\{\{full_name\}\}/g, `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Friend');
    body = body.replace(/\{\{email\}\}/g, person.email || '');
    body = body.replace(/\{\{phone\}\}/g, person.phone || person.mobile || '');
    body = body.replace(/\{\{church_name\}\}/g, ch.name || 'our church');
    body = body.replace(/\{\{church_address\}\}/g, ch.address || '');
    body = body.replace(/\{\{church_city\}\}/g, ch.city || '');
    body = body.replace(/\{\{church_state\}\}/g, ch.state || '');
    body = body.replace(/\{\{church_zip\}\}/g, ch.zip || '');
    body = body.replace(/\{\{church_phone\}\}/g, ch.phone || '');
    body = body.replace(/\{\{church_email\}\}/g, ch.email || '');
    body = body.replace(/\{\{church_website\}\}/g, ch.site_url || '');
    body = body.replace(/\{\{field:([^}]+)\}\}/g, (m, label) => {
      const f = cardFields.find((x) => (x.label || '').toLowerCase() === label.trim().toLowerCase());
      if (!f) return m;
      if (fieldData && fieldData[f.key] !== undefined) return String(fieldData[f.key] || '');
      if (f.maps_to && f.maps_to !== 'custom' && person[f.maps_to] !== undefined) return String(person[f.maps_to] || '');
      return '';
    });
    const subject = (step.subject || 'Welcome')
      .replace(/\{\{first_name\}\}/g, person.first_name || 'there')
      .replace(/\{\{last_name\}\}/g, person.last_name || '')
      .replace(/\{\{church_name\}\}/g, ch.name || 'our church');
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const emailPayload = { from: fromEmail, to: person.email, subject };
      if (step.media_url) {
        const escaped = (body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        emailPayload.html = `<div>${escaped}<br><br><img src="${step.media_url}" style="max-width:100%;border-radius:8px;" /></div>`;
      } else {
        emailPayload.text = body;
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Resend API error (${res.status}): ${errText}`);
      }
    } catch (err) {
      console.error(`Email send failed for ${person.email}: ${err.message}`);
    }
  }
}