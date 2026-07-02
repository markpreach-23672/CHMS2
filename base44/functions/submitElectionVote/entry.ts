import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { election_id, voter_name, voter_email, candidate } = body;

    if (!election_id || !voter_email || !candidate) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let election;
    try {
      election = await base44.asServiceRole.entities.Election.get(election_id);
    } catch {
      return Response.json({ error: 'Election not found' }, { status: 404 });
    }

    if (!election.is_public || election.status !== 'open') {
      return Response.json({ error: 'Election is not open for voting' }, { status: 400 });
    }

    if (!(election.candidates || []).includes(candidate)) {
      return Response.json({ error: 'Invalid candidate' }, { status: 400 });
    }

    // Check if already voted
    const existing = await base44.asServiceRole.entities.Vote.filter({ election_id, voter_email });
    if (existing.length >= (election.max_votes_per_person || 1)) {
      return Response.json({ error: 'You have already voted in this election' }, { status: 400 });
    }

    // Find or create person
    let person = null;
    const matches = await base44.asServiceRole.entities.Person.filter({ email: voter_email });
    if (matches.length > 0) person = matches[0];
    else {
      const nameParts = (voter_name || '').trim().split(/\s+/);
      person = await base44.asServiceRole.entities.Person.create({
        email: voter_email,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        status: 'visitor'
      });
    }

    await base44.asServiceRole.entities.Vote.create({
      election_id,
      person_id: person ? person.id : null,
      voter_email,
      voter_name: voter_name || '',
      candidate,
      voted_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});