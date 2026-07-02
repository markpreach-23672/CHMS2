import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const churches = await base44.asServiceRole.entities.Church.list();
    const fromEmail = churches[0]?.resend_from_email || 'Church <onboarding@resend.dev>';

    // Get all active enrollments
    const enrollments = await base44.asServiceRole.entities.WorkflowEnrollment.filter({ status: 'active' });
    const now = new Date();
    let processedCount = 0;

    for (const enrollment of enrollments) {
      try {
        // Get workflow steps
        const steps = await base44.asServiceRole.entities.WorkflowStep.filter({ workflow_id: enrollment.workflow_id });
        steps.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        if (steps.length === 0) {
          await base44.asServiceRole.entities.WorkflowEnrollment.update(enrollment.id, {
            status: 'completed',
            completed_date: now.toISOString()
          });
          continue;
        }

        if (enrollment.current_step >= steps.length) {
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

        // Process all steps whose delay has elapsed
        while (currentStepIdx < steps.length) {
          const step = steps[currentStepIdx];
          const delayDays = step.delay_days || 0;
          const stepDueDate = new Date(enrolledDate.getTime() + delayDays * 24 * 60 * 60 * 1000);

          if (now >= stepDueDate) {
            await processStep(base44, step, person, fromEmail);
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
        // Skip this enrollment on error, continue processing others
        console.error(`Error processing enrollment ${enrollment.id}:`, err.message);
      }
    }

    return Response.json({ success: true, processed: processedCount, total_active: enrollments.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processStep(base44, step, person, fromEmail) {
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
  if (step.step_type === 'email' && person.email) {
    let body = step.body || '';
    body = body.replace(/\{\{first_name\}\}/g, person.first_name || 'there');
    body = body.replace(/\{\{last_name\}\}/g, person.last_name || '');
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: person.email,
          subject: step.subject || 'Update from our church',
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