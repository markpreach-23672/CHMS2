import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const churches = await base44.asServiceRole.entities.Church.list();
    const fromEmail = churches[0]?.resend_from_email || 'Church <onboarding@resend.dev>';

    const body = await req.json();
    const { connect_card_id, first_name, last_name, email, phone, message } = body;

    if (!connect_card_id) {
      return Response.json({ error: 'Connect card ID is required' }, { status: 400 });
    }

    const card = await base44.asServiceRole.entities.ConnectCard.get(connect_card_id);
    if (!card || !card.is_active) {
      return Response.json({ error: 'Connect card not found or inactive' }, { status: 404 });
    }

    // Create or find person by email
    let person;
    if (email) {
      const existing = await base44.asServiceRole.entities.Person.filter({ email });
      person = existing[0];
    }
    if (!person) {
      person = await base44.asServiceRole.entities.Person.create({
        first_name: first_name || 'Guest',
        last_name: last_name || '',
        email: email || '',
        phone: phone || '',
        status: 'visitor',
        notes: message || ''
      });
    } else if (person.status === 'inactive') {
      await base44.asServiceRole.entities.Person.update(person.id, { status: 'visitor' });
    }

    // If card has a workflow, enroll and process immediate steps
    if (card.workflow_id) {
      const workflow = await base44.asServiceRole.entities.Workflow.get(card.workflow_id);
      if (workflow && workflow.is_active) {
        // Avoid duplicate enrollment
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

          // Get and sort steps
          const steps = await base44.asServiceRole.entities.WorkflowStep.filter({ workflow_id: card.workflow_id });
          steps.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

          // Process immediate steps (delay_days = 0)
          let nextStep = 0;
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if ((step.delay_days || 0) === 0) {
              await processStep(base44, step, person, fromEmail);
              nextStep = i + 1;
            } else {
              break;
            }
          }

          // Update enrollment
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
          subject: step.subject || 'Welcome',
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