// Builds lyrics / sheet music / listen links for a song.
// CCLI SongSelect deep links are auto-generated from the CCLI number;
// lyrics_url / score_url on the song act as manual overrides.
export function songLinks(song) {
  if (!song) return [];
  const links = [];
  if (song.song_url) links.push({ label: 'Listen', url: song.song_url });
  if (song.ccli_number) {
    links.push({ label: 'Lyrics', url: song.lyrics_url || `https://songselect.ccli.com/songs/${song.ccli_number}/viewlyrics` });
    links.push({ label: 'Sheet Music & Chords', url: song.score_url || `https://songselect.ccli.com/songs/${song.ccli_number}` });
  } else {
    if (song.lyrics_url) links.push({ label: 'Lyrics', url: song.lyrics_url });
    if (song.score_url) links.push({ label: 'Sheet Music & Chords', url: song.score_url });
  }
  return links;
}