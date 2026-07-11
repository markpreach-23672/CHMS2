import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    if (!query || !query.trim()) return Response.json({ error: 'Missing query' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Search for Christian worship songs matching: "${query}".
The query may be a song title, an artist name, or a CCLI song number — handle any of these.
Find up to 6 real, well-known worship songs that match. For each song provide:
- title: the exact song title
- artist: the primary artist/author (e.g. "Hillsong Worship", "Chris Tomlin")
- ccli_number: the official CCLI SongSelect song number (numeric string). Only include if you are confident it is the real CCLI number for this song; otherwise leave it as an empty string.
- default_key: the most common key it is performed in, if known (e.g. "G", "Bb"), else empty string.
- song_url: an official YouTube link for the song if known, else empty string.
Only include real songs. Do not invent CCLI numbers.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          songs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                artist: { type: 'string' },
                ccli_number: { type: 'string' },
                default_key: { type: 'string' },
                song_url: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json({ songs: result?.songs || [] });
  } catch (error) {
    console.error('searchCCLISongs error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});