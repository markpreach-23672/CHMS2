import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch { body = {}; }

    const churches = await base44.asServiceRole.entities.Church.list();
    const churchById = {};
    for (const c of churches) churchById[c.id] = c;

    if (body.event === 'form_submission' && body.person_id) {
      return Response.json(await runFormSubmission(base44, body, churchById));
    }

    return Response.json(await runDateAutomations(base44, churchById));
  } catch (error) {
    console.error('runAutomations error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function runFormSubmission(base44, body, churchById) {
  const person = await base44.asServiceRole.entities.Person.get(body.person_id).catch(() => null);
  if (!person) return { success: true, actions: 0 };
  const automations = await base44.asServiceRole.entities.Automation.filter({ is_active: true, trigger_type: 'form_submission' });
  const relevant = automations.filter((a) => !a.trigger_form_id || a.trigger_form_id === body.form_id);
  let actions = 0;
  for (const a of relevant) {
    try {
      await executeAction(base44, a, person, churchById[person.church_id] || {});
      actions++;
    } catch (err) {
      console.error(`Action failed (${a.id}): ${err.message}`);
    }
  }
  return { success: true, actions };
}

async function runDateAutomations(base44, churchById) {
  const automations = await base44.asServiceRole.entities.Automation.filter({ is_active: true });
  const dateAutos = automations.filter((a) => a.trigger_type === 'birthday' || a.trigger_type === 'anniversary');
  if (dateAutos.length === 0) return { success: true, actions: 0 };

  const people = await base44.asServiceRole.entities.Person.list('-created_date', 500);
  const now = new Date();
  let actions = 0;

  for (const a of dateAutos) {
    const offsetDays = a.offset_days || 0;
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + offsetDays * 86400000);
    const m = target.getUTCMonth();
    const d = target.getUTCDate();
    const church = churchById[a.church_id] || {};

    for (const p of people) {
      if (p.church_id !== a.church_id) continue;
      if (a.target_type === 'tag' && a.target_tag_id && !(p.tag_ids || []).includes(a.target_tag_id)) continue;
      const dateStr = a.trigger_type === 'birthday' ? p.birth_date : p.anniversary_date;
      const pd = parseDate(dateStr);
      if (!pd) continue;
      if (pd.getUTCMonth() === m && pd.getUTCDate() === d) {
        try {
          await executeAction(base44, a, p, church);
          actions++;
        } catch (err) {
          console.error(`Action failed (${a.id}, person ${p.id}): ${err.message}`);
        }
      }
    }
  }
  return { success: true, actions };
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  return isNaN(d) ? null : d;
}

function applyMergeFields(text, person, church) {
  let r = text || '';
  const ch = church || {};
  r = r.replace(/\{\{first_name\}\}/g, person.first_name || 'there');
  r = r.replace(/\{\{last_name\}\}/g, person.last_name || '');
  r = r.replace(/\{\{full_name\}\}/g, `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Friend');
  r = r.replace(/\{\{email\}\}/g, person.email || '');
  r = r.replace(/\{\{phone\}\}/g, person.phone || person.mobile || '');
  r = r.replace(/\{\{church_name\}\}/g, ch.name || 'our church');
  return r;
}

async function executeAction(base44, auto, person, church) {
  if (auto.action_type === 'apply_tag' && auto.action_tag_id) {
    const existing = person.tag_ids || [];
    if (!existing.includes(auto.action_tag_id)) {
      await base44.asServiceRole.entities.Person.update(person.id, { tag_ids: [...existing, auto.action_tag_id] });
    }
    return;
  }
  if (auto.action_type === 'send_email' && person.email) {
    const fromEmail = church.resend_from_email || 'Church <onboarding@resend.dev>';
    const subject = applyMergeFields(auto.subject || 'Update from our church', person, church);
    const text = applyMergeFields(auto.body || '', person, church);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) { console.error('RESEND_API_KEY not set'); return; }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: person.email, subject, text })
    });
    if (!res.ok) { const t = await res.text(); console.error(`Resend error (${res.status}): ${t}`); }
    return;
  }
  if (auto.action_type === 'send_text') {
    const to = person.phone || person.mobile;
    if (!to) { console.error(`No phone for person ${person.id}`); return; }
    const msg = applyMergeFields(auto.body || '', person, church);
    await sendTwilioSMS(to, msg, auto.from_number);
    return;
  }
}

async function sendTwilioSMS(to, message, fromNumberOverride) {
  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!accountSid || !authToken) { console.error('Twilio credentials not set'); return false; }
    const auth = btoa(`${accountSid}:${authToken}`);
    let fromNumber = fromNumberOverride || '';
    if (!fromNumber) {
      const numbersRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      const numbersData = await numbersRes.json();
      fromNumber = numbersData.incoming_phone_numbers?.[0]?.phone_number;
    }
    if (!fromNumber) { console.error('No Twilio phone number found'); return false; }
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: fromNumber, To: to, Body: message })
    });
    if (!res.ok) { const t = await res.text(); console.error(`Twilio error (${res.status}): ${t}`); return false; }
    return true;
  } catch (err) { console.error(`Twilio SMS failed: ${err.message}`); return false; }
}