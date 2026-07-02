import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const churches = await base44.asServiceRole.entities.Church.list();
    const fromEmail = churches[0]?.resend_from_email || 'Church <onboarding@resend.dev>';
    const churchName = churches[0]?.name || 'our church';

    const enrollments = await base44.asServiceRole.entities.WorkflowEnrollment.filter({ status: 'active' });
    const now = new Date();
    let processedCount = 0;

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

        const enrolledDate = new Date(enrollment.enrolled_date);
        let currentStepIdx = enrollment.current_step;
        let stepAdvanced = false;

        while (currentStepIdx < steps.length) {
          const step = steps[currentStepIdx];
          const delayValue = step.delay_days || 0;
          const delayMs = step.delay_unit === 'hours' ? delayValue * 60 * 60 * 1000 : delayValue * 24 * 60 * 60 * 1000;
          const stepDueDate = new Date(enrolledDate.getTime() + delayMs);

          if (now >= stepDueDate) {
            await processStep(base44, step, person, fromEmail, churchName);
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

function applyMergeFields(body, person, churchName) {
  let result = body || '';
  result = result.replace(/\{\{first_name\}\}/g, person.first_name || 'there');
  result = result.replace(/\{\{last_name\}\}/g, person.last_name || '');
  result = result.replace(/\{\{full_name\}\}/g, `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Friend');
  result = result.replace(/\{\{email\}\}/g, person.email || '');
  result = result.replace(/\{\{phone\}\}/g, person.phone || person.mobile || '');
  result = result.replace(/\{\{church_name\}\}/g, churchName || 'our church');
  return result;
}

async function processStep(base44, step, person, fromEmail, churchName) {
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
    return;
  }

  // No response alert
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
    return;
  }

  // Email
  if (step.step_type === 'email' && person.email) {
    const body = applyMergeFields(step.body, person, churchName);
    const subject = applyMergeFields(step.subject || 'Update from our church', person, churchName);
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: person.email,
          subject,
          text: body
        })
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