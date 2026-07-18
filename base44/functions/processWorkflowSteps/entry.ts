import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CRON_KEY = 'efc_cron_9d4b71a6f3e24c58b0a7d1c9e6f28453';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const reqBody = await req.json().catch(() => ({}));
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    const isAdmin = user && ['admin', 'super_admin', 'church_admin'].includes(user.role);
    if (reqBody.cron_key !== CRON_KEY && !isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const churches = await base44.asServiceRole.entities.Church.list();
    const church = churches[0] || {};
    const fromEmail = church.resend_from_email || 'Church <onboarding@resend.dev>';

    const enrollments = await base44.asServiceRole.entities.WorkflowEnrollment.filter({ status: 'active' });
    const now = new Date();
    let processedCount = 0;
    const workflowCache = {};
    const cardCache = {};

    for (const enrollment of enrollments) {
      try {
        const steps = await base44.asServiceRole.entities.WorkflowStep.filter({ workflow_id: enrollment.workflow_id });
        steps.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        if (steps.length === 0 || enrollment.current_step >= steps.length) {
          await base44.asServiceRole.entities.WorkflowEnrollment.update(enrollment.id, {
            status: 'completed',
            completed_date: now.toISOString()
          });
          continue;
        }

        const person = await base44.asServiceRole.entities.Person.get(enrollment.person_id);
        if (!person) continue;

        let workflow = workflowCache[enrollment.workflow_id];
        if (!workflow) {
          workflow = await base44.asServiceRole.entities.Workflow.get(enrollment.workflow_id).catch(() => null);
          workflowCache[enrollment.workflow_id] = workflow;
        }
        let cardFields = null;
        if (workflow && workflow.trigger_connect_card_id) {
          let card = cardCache[workflow.trigger_connect_card_id];
          if (!card) {
            card = await base44.asServiceRole.entities.ConnectCard.get(workflow.trigger_connect_card_id).catch(() => null);
            cardCache[workflow.trigger_connect_card_id] = card;
          }
          cardFields = Array.isArray(card?.fields) ? card.fields : null;
        }

        const enrolledDate = new Date(enrollment.enrolled_date);
        let currentStepIdx = enrollment.current_step;
        let stepAdvanced = false;

        while (currentStepIdx < steps.length) {
          const step = steps[currentStepIdx];
          const delayValue = step.delay_days || 0;
          const delayMs = step.delay_unit === 'minutes' ? delayValue * 60 * 1000
            : step.delay_unit === 'hours' ? delayValue * 60 * 60 * 1000
            : delayValue * 24 * 60 * 60 * 1000;
          const stepDueDate = new Date(enrolledDate.getTime() + delayMs);

          if (now >= stepDueDate) {
            await processStep(base44, step, person, fromEmail, church, cardFields);
            currentStepIdx++;
            stepAdvanced = true;
          } else {
            break;
          }
        }

        if (stepAdvanced) {
          if (currentStepIdx >= steps.length) {
            await base44.asServiceRole.entities.WorkflowEnrollment.update(enrollment.id, {
              current_step: currentStepIdx,
              status: 'completed',
              completed_date: now.toISOString()
            });
          } else {
            await base44.asServiceRole.entities.WorkflowEnrollment.update(enrollment.id, {
              current_step: currentStepIdx
            });
          }
          processedCount++;
        }
      } catch (err) {
        console.error(`Error processing enrollment ${enrollment.id}:`, err.message);
      }
    }

    return Response.json({ success: true, processed: processedCount, total_active: enrollments.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function applyMergeFields(body, person, church, cardFields) {
  let result = body || '';
  const ch = church || {};
  result = result.replace(/\{\{first_name\}\}/g, person.first_name || 'there');
  result = result.replace(/\{\{last_name\}\}/g, person.last_name || '');
  result = result.replace(/\{\{full_name\}\}/g, `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Friend');
  result = result.replace(/\{\{email\}\}/g, person.email || '');
  result = result.replace(/\{\{phone\}\}/g, person.phone || person.mobile || '');
  result = result.replace(/\{\{mobile\}\}/g, person.mobile || '');
  result = result.replace(/\{\{address\}\}/g, person.address || '');
  result = result.replace(/\{\{city\}\}/g, person.city || '');
  result = result.replace(/\{\{state\}\}/g, person.state || '');
  result = result.replace(/\{\{zip\}\}/g, person.zip || '');
  result = result.replace(/\{\{birth_date\}\}/g, person.birth_date || '');
  result = result.replace(/\{\{notes\}\}/g, person.notes || '');
  result = result.replace(/\{\{church_name\}\}/g, ch.name || 'our church');
  result = result.replace(/\{\{church_address\}\}/g, ch.address || '');
  result = result.replace(/\{\{church_city\}\}/g, ch.city || '');
  result = result.replace(/\{\{church_state\}\}/g, ch.state || '');
  result = result.replace(/\{\{church_zip\}\}/g, ch.zip || '');
  result = result.replace(/\{\{church_phone\}\}/g, ch.phone || '');
  result = result.replace(/\{\{church_email\}\}/g, ch.email || '');
  result = result.replace(/\{\{church_website\}\}/g, ch.site_url || '');
  if (cardFields && cardFields.length > 0) {
    const customData = person.custom_fields || {};
    result = result.replace(/\{\{field:([^}]+)\}\}/g, (match, label) => {
      const field = cardFields.find((f) => (f.label || '').toLowerCase() === label.trim().toLowerCase());
      if (!field) return match;
      if (field.maps_to && field.maps_to !== 'custom' && person[field.maps_to] !== undefined) return String(person[field.maps_to] || '');
      if (field.maps_to === 'custom' && customData[field.key] !== undefined) return String(customData[field.key] || '');
      return '';
    });
  }
  return result;
}

function effectiveMode(step, isStaff) {
  if (step.guest_info_mode) return step.guest_info_mode;
  if (isStaff) return step.info_scope === 'all' ? 'full_info' : 'contact_only';
  return 'none';
}

function guestInfoBlock(person, full, indent = '') {
  const guestName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Guest';
  let block = `${indent}Name: ${guestName}\n`;
  block += `${indent}Email: ${person.email || 'N/A'}\n`;
  block += `${indent}Phone: ${person.phone || person.mobile || 'N/A'}\n`;
  if (full) {
    if (person.mobile) block += `${indent}Mobile: ${person.mobile}\n`;
    if (person.address) block += `${indent}Address: ${person.address}${person.city ? ', ' + person.city : ''}${person.state ? ', ' + person.state : ''}${person.zip ? ' ' + person.zip : ''}\n`;
    if (person.birth_date) block += `${indent}Birth Date: ${person.birth_date}\n`;
    block += `${indent}Status: ${person.status || 'N/A'}\n`;
  }
  return block;
}

async function sendTwilioSMS(to, message, mediaUrl, fromNumberOverride) {
  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!accountSid || !authToken) {
      console.error('Twilio credentials not set');
      return false;
    }
    const auth = btoa(`${accountSid}:${authToken}`);

    let fromNumber = fromNumberOverride || '';
    if (!fromNumber) {
      // Look up the first phone number on the account
      const numbersRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      const numbersData = await numbersRes.json();
      fromNumber = numbersData.incoming_phone_numbers?.[0]?.phone_number;
    }
    if (!fromNumber) {
      console.error('No Twilio phone number found on account');
      return false;
    }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: fromNumber, To: to, Body: message, ...(mediaUrl ? { MediaUrl: mediaUrl } : {}) })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Twilio SMS error (${res.status}): ${errText}`);
      return false;
    }
    console.log(`SMS sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`Twilio SMS failed: ${err.message}`);
    return false;
  }
}

async function processStep(base44, step, person, fromEmail, church, cardFields) {
  // Apply tag
  if (step.step_type === 'apply_tag' && step.tag_id) {
    try {
      const existingTags = person.tag_ids || [];
      if (!existingTags.includes(step.tag_id)) {
        await base44.asServiceRole.entities.Person.update(person.id, {
          tag_ids: [...existingTags, step.tag_id]
        });
      }
    } catch (err) {
      console.error(`Apply tag failed: ${err.message}`);
    }
    return;
  }

  // Remove tag
  if (step.step_type === 'remove_tag' && step.tag_id) {
    try {
      const existingTags = person.tag_ids || [];
      if (existingTags.includes(step.tag_id)) {
        await base44.asServiceRole.entities.Person.update(person.id, {
          tag_ids: existingTags.filter((id) => id !== step.tag_id)
        });
      }
    } catch (err) {
      console.error(`Remove tag failed: ${err.message}`);
    }
    return;
  }

  // Staff notification
  if (step.step_type === 'staff_notify' && step.assigned_to_user_id) {
    try {
      const staffUser = await base44.asServiceRole.entities.User.get(step.assigned_to_user_id);
      if (!staffUser || !staffUser.email) return;
      const guestName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Guest';
      const subject = step.subject || `New guest follow-up: ${guestName}`;
      const mode = effectiveMode(step, true);
      let emailBody = `A new guest has submitted a connect card and needs follow-up.\n\n`;
      if (mode === 'full_info') {
        emailBody += `Guest Information:\n` + guestInfoBlock(person, true, '  ');
      } else if (mode === 'contact_only') {
        emailBody += `Guest Information:\n` + guestInfoBlock(person, false, '  ');
      } else if (mode === 'name_greeting') {
        emailBody += `Guest: ${guestName}\n`;
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
    return;
  }

  // No response alert
  if (step.step_type === 'no_response_alert' && step.assigned_to_user_id) {
    try {
      const staffUser = await base44.asServiceRole.entities.User.get(step.assigned_to_user_id);
      if (!staffUser || !staffUser.email) return;
      const guestName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Guest';
      const subject = `Follow-up needed: ${guestName} hasn't responded`;
      const mode = effectiveMode(step, true);
      let emailBody = `${guestName} submitted a connect card and hasn't responded to our follow-up outreach. They may be falling through the cracks.\n\n`;
      if (mode === 'full_info') {
        emailBody += `Guest Contact Information:\n` + guestInfoBlock(person, true, '  ');
      } else if (mode === 'contact_only') {
        emailBody += `Guest Contact Information:\n` + guestInfoBlock(person, false, '  ');
      } else if (mode === 'name_greeting') {
        emailBody += `Guest: ${guestName}\n`;
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
    return;
  }

  // Text message
  if (step.step_type === 'text') {
    const phone = person.phone || person.mobile;
    if (!phone) {
      console.error(`No phone number for person ${person.id}, skipping text step`);
      return;
    }
    let msg = applyMergeFields(step.body, person, church, cardFields);
    const mode = effectiveMode(step, false);
    if (mode === 'name_greeting') {
      msg = `Hi ${person.first_name || 'there'}, ` + msg;
    } else if (mode === 'contact_only' || mode === 'full_info') {
      msg = msg + '\n--- Guest Information ---\n' + guestInfoBlock(person, mode === 'full_info');
    }
    await sendTwilioSMS(phone, msg, step.media_url, step.from_number);
    return;
  }

  // Email
  if (step.step_type === 'email' && person.email) {
    let body = applyMergeFields(step.body, person, church, cardFields);
    const mode = effectiveMode(step, false);
    if (mode === 'name_greeting') {
      body = `Hi ${person.first_name || 'there'},\n\n` + body;
    } else if (mode === 'contact_only' || mode === 'full_info') {
      body = body + '\n\n--- Guest Information ---\n' + guestInfoBlock(person, mode === 'full_info');
    }
    const subject = applyMergeFields(step.subject || 'Update from our church', person, church, cardFields);
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