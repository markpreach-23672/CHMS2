import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const FIELD_TYPES = {
  first_name: 'text', last_name: 'text', email: 'text', phone: 'text', mobile: 'text',
  status: 'select', gender: 'select', marital_status: 'select', family_role: 'select',
  address: 'text', city: 'text', state: 'text', zip: 'text',
  birth_date: 'date', first_visit_date: 'date', baptism_date: 'date', membership_date: 'date',
  tag: 'tag', giving_total: 'number', giving_fund: 'fund', has_given: 'boolean',
};

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

function buildCtx(customFields, donations) {
  const givingTotals = {};
  const fundGivers = {};
  for (const d of (donations || [])) {
    givingTotals[d.person_id] = (givingTotals[d.person_id] || 0) + (d.amount || 0);
    if (d.fund_id) {
      (fundGivers[d.fund_id] = fundGivers[d.fund_id] || new Set()).add(d.person_id);
    }
  }
  return { customFields: customFields || [], donations: donations || [], givingTotals, fundGivers };
}

function matchesTarget(a, p, ctx, ssById) {
  if (a.target_type === 'tag' && a.target_tag_id) return (p.tag_ids || []).includes(a.target_tag_id);
  if (a.target_type === 'saved_search' && a.target_saved_search_id) {
    const ss = ssById[a.target_saved_search_id];
    if (!ss || !ss.query_config) return false;
    return personMatchesQuery(p, ss.query_config, ctx);
  }
  return true;
}

function personMatchesQuery(person, queryConfig, ctx) {
  const filters = (queryConfig && queryConfig.filters) || [];
  const logic = (queryConfig && queryConfig.logic) || 'and';
  if (filters.length === 0) return true;
  const customFields = ctx.customFields || [];
  const getCustomType = (name) => {
    const cf = customFields.find((f) => f.name === name);
    if (!cf) return 'text';
    return cf.field_type === 'dropdown' ? 'select'
      : cf.field_type === 'multi_select' ? 'multiselect'
      : cf.field_type === 'checkbox' ? 'boolean'
      : cf.field_type === 'number' ? 'number'
      : cf.field_type === 'date' ? 'date'
      : 'text';
  };
  const checkFilter = (filter) => {
    if (!filter.value && filter.operator !== 'is_empty') return true;
    if (filter.field === 'tag') return (person.tag_ids || []).includes(filter.value);
    if (filter.field === 'giving_total') {
      return compareNumber(ctx.givingTotals[person.id] || 0, filter.operator, parseFloat(filter.value) || 0);
    }
    if (filter.field === 'giving_fund') return (ctx.fundGivers[filter.value] || new Set()).has(person.id);
    if (filter.field === 'has_given') {
      const count = (ctx.donations || []).filter((d) => d.person_id === person.id).length;
      return filter.value === 'true' ? count > 0 : count === 0;
    }
    let personValue;
    let type;
    if (filter.field.startsWith('custom.')) {
      const customName = filter.field.replace('custom.', '');
      personValue = person.custom_fields?.[customName];
      type = getCustomType(customName);
      if (type === 'multiselect') {
        const arr = Array.isArray(personValue) ? personValue : [];
        return arr.includes(filter.value);
      }
      if (type === 'boolean') {
        return (personValue === true || personValue === 'true') === (filter.value === 'true');
      }
    } else {
      personValue = person[filter.field];
      type = FIELD_TYPES[filter.field] || 'text';
    }
    if (type === 'number') return compareNumber(Number(personValue) || 0, filter.operator, parseFloat(filter.value) || 0);
    return compareValue(personValue, filter.operator, filter.value);
  };
  return logic === 'and' ? filters.every(checkFilter) : filters.some(checkFilter);
}

function compareValue(personValue, operator, filterValue) {
  const pv = String(personValue || '').toLowerCase();
  const fv = String(filterValue || '').toLowerCase();
  switch (operator) {
    case 'contains': return pv.includes(fv);
    case 'equals': return pv === fv;
    case 'not_equals': return pv !== fv;
    case 'starts_with': return pv.startsWith(fv);
    case 'is_empty': return !personValue;
    case 'is_before': return new Date(personValue) < new Date(filterValue);
    case 'is_after': return new Date(personValue) > new Date(filterValue);
    default: return true;
  }
}

function compareNumber(personValue, operator, filterValue) {
  const num = Number(personValue) || 0;
  const target = Number(filterValue) || 0;
  switch (operator) {
    case 'equals': return num === target;
    case 'greater_than': return num > target;
    case 'less_than': return num < target;
    case 'is_empty': return num === 0;
    default: return true;
  }
}

async function runFormSubmission(base44, body, churchById) {
  const person = await base44.asServiceRole.entities.Person.get(body.person_id).catch(() => null);
  if (!person) return { success: true, actions: 0 };
  const automations = await base44.asServiceRole.entities.Automation.filter({ is_active: true, trigger_type: 'form_submission' });
  const relevant = automations.filter((a) => !a.trigger_form_id || a.trigger_form_id === body.form_id);
  if (relevant.length === 0) return { success: true, actions: 0 };

  const customFields = await base44.asServiceRole.entities.CustomField.list().catch(() => []);
  const donations = await base44.asServiceRole.entities.Donation.list().catch(() => []);
  const ctx = buildCtx(customFields, donations);
  const savedSearches = await base44.asServiceRole.entities.SavedSearch.list().catch(() => []);
  const ssById = {};
  for (const s of savedSearches) ssById[s.id] = s;

  let actions = 0;
  for (const a of relevant) {
    try {
      if (!matchesTarget(a, person, ctx, ssById)) continue;
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
  const digestAutos = automations.filter((a) => a.trigger_type === 'monthly_digest');
  if (dateAutos.length === 0 && digestAutos.length === 0) return { success: true, actions: 0 };

  const people = await base44.asServiceRole.entities.Person.list('-created_date', 500);
  const now = new Date();
  let actions = 0;

  if (dateAutos.length > 0) {
    const customFields = await base44.asServiceRole.entities.CustomField.list().catch(() => []);
    const donations = await base44.asServiceRole.entities.Donation.list().catch(() => []);
    const ctx = buildCtx(customFields, donations);
    const savedSearches = await base44.asServiceRole.entities.SavedSearch.list().catch(() => []);
    const ssById = {};
    for (const s of savedSearches) ssById[s.id] = s;

    for (const a of dateAutos) {
      const offsetDays = a.offset_days || 0;
      const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + offsetDays * 86400000);
      const m = target.getUTCMonth();
      const d = target.getUTCDate();
      const church = churchById[a.church_id] || {};

      for (const p of people) {
        if (p.church_id !== a.church_id) continue;
        if (!matchesTarget(a, p, ctx, ssById)) continue;
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
  }

  if (digestAutos.length > 0) {
    const users = await base44.asServiceRole.entities.User.list();
    const userById = {};
    for (const u of users) userById[u.id] = u;
    const todayDay = now.getUTCDate();
    const nextMonth = (now.getUTCMonth() + 1) % 12;
    const monthName = MONTHS[nextMonth];
    const resendKey = Deno.env.get("RESEND_API_KEY");

    for (const a of digestAutos) {
      if ((a.day_of_month || 28) !== todayDay) continue;
      const recipients = (a.notify_user_ids || []).map((id) => userById[id]?.email).filter(Boolean);
      if (recipients.length === 0) {
        console.log(`Digest ${a.id} has no recipients, skipping`);
        continue;
      }
      const church = churchById[a.church_id] || {};
      const birthdays = [];
      const anniversaries = [];
      for (const p of people) {
        if (p.church_id !== a.church_id) continue;
        const bd = parseDate(p.birth_date);
        if (bd && bd.getUTCMonth() === nextMonth) birthdays.push({ name: fullName(p), day: bd.getUTCDate() });
        const ad = parseDate(p.anniversary_date);
        if (ad && ad.getUTCMonth() === nextMonth) anniversaries.push({ name: fullName(p), day: ad.getUTCDate() });
      }
      birthdays.sort((x, y) => x.day - y.day);
      anniversaries.sort((x, y) => x.day - y.day);

      const subject = a.subject || `Upcoming Birthdays & Anniversaries — ${monthName}`;
      let text = (a.body ? a.body + '\n\n' : '');
      text += `Birthdays in ${monthName}:\n`;
      if (birthdays.length) for (const b of birthdays) text += `  • ${b.name} — ${monthName} ${b.day}\n`;
      else text += '  None\n';
      text += `\nAnniversaries in ${monthName}:\n`;
      if (anniversaries.length) for (const an of anniversaries) text += `  • ${an.name} — ${monthName} ${an.day}\n`;
      else text += '  None\n';

      const fromEmail = church.resend_from_email || 'Church <onboarding@resend.dev>';
      if (!resendKey) { console.error('RESEND_API_KEY not set'); continue; }
      for (const email of recipients) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromEmail, to: email, subject, text })
          });
          if (!res.ok) { const t = await res.text(); console.error(`Resend error (${res.status}): ${t}`); }
          actions++;
        } catch (err) {
          console.error(`Digest email to ${email} failed: ${err.message}`);
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

function fullName(p) {
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
}

function applyMergeFields(text, person, church) {
  let r = text || '';
  const ch = church || {};
  r = r.replace(/\{\{first_name\}\}/g, person.first_name || 'there');
  r = r.replace(/\{\{last_name\}\}/g, person.last_name || '');
  r = r.replace(/\{\{full_name\}\}/g, fullName(person));
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