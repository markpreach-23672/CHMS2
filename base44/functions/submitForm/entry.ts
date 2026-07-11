import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { form_id, data } = body;

    let form;
    try {
      form = await base44.asServiceRole.entities.Form.get(form_id);
    } catch {
      return Response.json({ error: 'Form not found' }, { status: 404 });
    }
    if (!form.is_active || form.is_archived) {
      return Response.json({ error: 'Form not found' }, { status: 404 });
    }

    // Extract profile data from submission
    const profileData = {};
    for (const field of form.fields || []) {
      const val = data[field.id];
      if (val === undefined || val === null || val === '') continue;
      if (field.type === 'name' && val) {
        if (val.first) profileData.first_name = val.first;
        if (val.last) profileData.last_name = val.last;
      } else if (field.type === 'address' && val) {
        if (val.street) profileData.address = val.street;
        if (val.city) profileData.city = val.city;
        if (val.state) profileData.state = val.state;
        if (val.zip) profileData.zip = val.zip;
      } else if (field.type === 'email') {
        profileData.email = val;
      } else if (field.type === 'phone') {
        profileData.phone = val;
      }
    }

    // Auto-link to person by email or name
    let person = null;
    if (profileData.email) {
      const matches = await base44.asServiceRole.entities.Person.filter({ email: profileData.email });
      if (matches.length > 0) person = matches[0];
    }
    if (!person && profileData.first_name && profileData.last_name) {
      const matches = await base44.asServiceRole.entities.Person.filter({ first_name: profileData.first_name, last_name: profileData.last_name });
      if (matches.length > 0) person = matches[0];
    }

    // Create new person if not found
    if (!person && (profileData.email || profileData.first_name)) {
      person = await base44.asServiceRole.entities.Person.create({
        ...profileData,
        status: 'visitor',
        tag_ids: form.tag_ids || []
      });
    } else if (person) {
      const updates = {};
      if (profileData.email && !person.email) updates.email = profileData.email;
      if (profileData.first_name && !person.first_name) updates.first_name = profileData.first_name;
      if (profileData.last_name && !person.last_name) updates.last_name = profileData.last_name;
      if (profileData.phone && !person.phone) updates.phone = profileData.phone;
      if (profileData.address && !person.address) updates.address = profileData.address;
      if (profileData.city && !person.city) updates.city = profileData.city;
      if (profileData.state && !person.state) updates.state = profileData.state;
      if (profileData.zip && !person.zip) updates.zip = profileData.zip;
      if (form.tag_ids && form.tag_ids.length > 0) {
        const existingTags = person.tag_ids || [];
        updates.tag_ids = [...new Set([...existingTags, ...form.tag_ids])];
      }
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Person.update(person.id, updates);
      }
    }

    // Handle family members field — create Family + Person records
    for (const field of form.fields || []) {
      if (field.type === 'family_members' && data[field.id] && Array.isArray(data[field.id])) {
        const members = data[field.id].filter((m) => m.first_name || m.last_name || m.email);
        if (members.length > 0) {
          const familyName = members[0].last_name || person?.last_name || 'Family';
          const family = await base44.asServiceRole.entities.Family.create({
            family_name: familyName,
            address: profileData.address || undefined,
            city: profileData.city || undefined,
            state: profileData.state || undefined,
            zip: profileData.zip || undefined,
          });
          if (person) {
            await base44.asServiceRole.entities.Person.update(person.id, { family_id: family.id, family_role: 'head_of_household' });
          }
          for (const member of members) {
            let memberPerson = null;
            if (member.email) {
              const matches = await base44.asServiceRole.entities.Person.filter({ email: member.email });
              if (matches.length > 0) memberPerson = matches[0];
            }
            if (!memberPerson) {
              await base44.asServiceRole.entities.Person.create({
                first_name: member.first_name || '',
                last_name: member.last_name || '',
                email: member.email || '',
                phone: member.phone || '',
                status: 'visitor',
                family_id: family.id,
                family_role: member.role || 'adult',
                tag_ids: form.tag_ids || []
              });
            } else {
              await base44.asServiceRole.entities.Person.update(memberPerson.id, { family_id: family.id, family_role: member.role || 'adult' });
            }
          }
        }
      }
    }

    // Determine payment info
    const hasPaymentField = (form.fields || []).some((f) => f.type === 'payment');
    let paymentAmount = 0;
    if (hasPaymentField) {
      for (const field of form.fields) {
        if (field.type === 'payment' && data[field.id]) {
          paymentAmount += data[field.id].amount || 0;
        }
      }
    }

    // Create form entry
    const entry = await base44.asServiceRole.entities.FormEntry.create({
      form_id,
      data,
      person_id: person ? person.id : null,
      payment_status: hasPaymentField ? 'pending' : 'free',
      payment_amount: paymentAmount,
      submitted_at: new Date().toISOString()
    });

    // Get church info for emails
    const churches = await base44.asServiceRole.entities.Church.list();
    const fromEmail = churches[0]?.resend_from_email || 'Church <onboarding@resend.dev>';
    const churchName = churches[0]?.name || 'our church';
    const resendKey = Deno.env.get("RESEND_API_KEY");

    // Send admin notifications
    if (form.notify_emails && form.notify_emails.length > 0 && resendKey) {
      const fieldSummary = (form.fields || [])
        .filter((f) => f.type !== 'section' && data[f.id] !== undefined && data[f.id] !== null && data[f.id] !== '')
        .map((f) => {
          let val = data[f.id];
          if (typeof val === 'object' && !Array.isArray(val)) {
            if (f.type === 'name') val = `${val.first || ''} ${val.last || ''}`.trim();
            else if (f.type === 'address') val = `${val.street || ''}, ${val.city || ''}, ${val.state || ''} ${val.zip || ''}`;
            else if (f.type === 'payment') val = `${val.label} - $${val.amount}`;
            else val = JSON.stringify(val);
          } else if (Array.isArray(val)) {
            val = val.join(', ');
          }
          return `${f.label}: ${val}`;
        })
        .join('\n');

      for (const email of form.notify_emails) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: fromEmail,
              to: email,
              subject: `New form submission: ${form.title}`,
              text: `A new submission has been received for "${form.title}".\n\n${fieldSummary}\n\nSubmitted at: ${new Date().toLocaleString()}`
            })
          });
        } catch (err) {
          console.error(`Admin notification failed: ${err.message}`);
        }
      }
    }

    // Send submitter confirmation
    if (form.send_submitter_confirmation && profileData.email && form.confirmation_body && resendKey) {
      let emailBody = form.confirmation_body;
      emailBody = emailBody.replace(/\{\{first_name\}\}/g, profileData.first_name || 'there');
      emailBody = emailBody.replace(/\{\{church_name\}\}/g, churchName);
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromEmail,
            to: profileData.email,
            subject: form.confirmation_subject || 'Thank you for your submission',
            text: emailBody
          })
        });
      } catch (err) {
        console.error(`Submitter confirmation failed: ${err.message}`);
      }
    }

    // Enroll in workflow
    if (form.workflow_id && person) {
      try {
        const existing = await base44.asServiceRole.entities.WorkflowEnrollment.filter({
          workflow_id: form.workflow_id,
          person_id: person.id,
          status: 'active'
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.WorkflowEnrollment.create({
            workflow_id: form.workflow_id,
            person_id: person.id,
            current_step: 0,
            enrolled_date: new Date().toISOString(),
            status: 'active'
          });
        }
      } catch (err) {
        console.error(`Workflow enrollment failed: ${err.message}`);
      }
    }

    // Fire form-submission automations
    if (person) {
      try {
        await base44.asServiceRole.functions.invoke('runAutomations', { event: 'form_submission', form_id, person_id: person.id });
      } catch (err) {
        console.error(`Automations trigger failed: ${err.message}`);
      }
    }

    return Response.json({
      success: true,
      entry_id: entry.id,
      confirmation_message: form.confirmation_message || 'Thank you for your submission!',
      payment_required: hasPaymentField,
      payment_amount: paymentAmount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});