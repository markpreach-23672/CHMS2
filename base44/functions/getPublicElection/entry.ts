import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { election_id } = body;

    let election;
    try {
      election = await base44.asServiceRole.entities.Election.get(election_id);
    } catch {
      return Response.json({ error: 'Election not found' }, { status: 404 });
    }

    if (!election.is_public || election.status === 'draft') {
      return Response.json({ error: 'Election not available' }, { status: 404 });
    }

    const votes = await base44.asServiceRole.entities.Vote.filter({ election_id });

    // Return results if closed
    if (election.status === 'closed') {
      const tally = {};
      for (const v of votes) {
        tally[v.candidate] = (tally[v.candidate] || 0) + 1;
      }
      return Response.json({
        id: election.id,
        title: election.title,
        description: election.description,
        status: 'closed',
        candidates: election.candidates || [],
        results: tally,
        total_votes: votes.length
      });
    }

    return Response.json({
      id: election.id,
      title: election.title,
      description: election.description,
      status: 'open',
      candidates: election.candidates || [],
      max_votes_per_person: election.max_votes_per_person || 1,
      total_votes: votes.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});