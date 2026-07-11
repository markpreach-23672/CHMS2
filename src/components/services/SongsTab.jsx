import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Music, ExternalLink, Search } from 'lucide-react';
import CCLISearchDialog from '@/components/services/CCLISearchDialog';

export default function SongsTab({ churchId }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [showCCLI, setShowCCLI] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSongs(await base44.entities.Song.list('-created_date', 500)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (song) => {
    if (!confirm(`Delete "${song.title}" from the song library?`)) return;
    try {
      await base44.entities.Song.delete(song.id);
      setSongs((prev) => prev.filter((x) => x.id !== song.id));
    } catch (err) { alert('Failed to delete song.'); }
  };

  const handleSaved = (saved) => {
    setSongs((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditItem(null);
  };

  const filtered = songs.filter((s) => !search || `${s.title} ${s.artist || ''} ${s.ccli_number || ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, artist, or CCLI #..." className="max-w-xs" />
        <div className="flex-1" />
        <Button variant="outline" onClick={() => setShowCCLI(true)}>
          <Search size={15} className="mr-1.5" />Search CCLI
        </Button>
        <Button onClick={() => { setEditItem(null); setPrefill(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={15} className="mr-1.5" />Add Song
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No songs yet. Build your worship song library here — CCLI numbers auto-generate lyrics &amp; sheet music links.</div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-slate-50/50">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Music size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{s.title}{s.artist && <span className="text-slate-400 font-normal"> — {s.artist}</span>}</p>
                <p className="text-[11px] text-slate-400">
                  {s.default_key && `Key ${s.default_key} · `}{s.bpm ? `${s.bpm} BPM · ` : ''}{s.ccli_number ? `CCLI #${s.ccli_number}` : 'No CCLI number'}
                </p>
              </div>
              {s.ccli_number && (
                <a href={`https://songselect.ccli.com/songs/${s.ccli_number}`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-indigo-600 p-1" title="Open on CCLI SongSelect">
                  <ExternalLink size={14} />
                </a>
              )}
              <button onClick={() => { setEditItem(s); setShowForm(true); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 p-1"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(s)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <SongForm
          item={editItem}
          prefill={prefill}
          churchId={churchId}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditItem(null); setPrefill(null); }}
        />
      )}

      {showCCLI && (
        <CCLISearchDialog
          onPick={(s) => {
            setShowCCLI(false);
            setEditItem(null);
            setPrefill({ title: s.title || '', artist: s.artist || '', default_key: s.default_key || '', ccli_number: s.ccli_number || '', song_url: s.song_url || '' });
            setShowForm(true);
          }}
          onClose={() => setShowCCLI(false)}
        />
      )}
    </div>
  );
}

function SongForm({ item, prefill, churchId, onSaved, onClose }) {
  const [form, setForm] = useState({
    title: '', artist: '', default_key: '', bpm: '', ccli_number: '', song_url: '', lyrics_url: '', score_url: '', notes: '',
    ...prefill,
    ...item,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Song title is required.'); return; }
    setSaving(true);
    try {
      const data = { ...form, church_id: churchId, bpm: form.bpm ? Number(form.bpm) : undefined };
      if (item) onSaved(await base44.entities.Song.update(item.id, data));
      else onSaved(await base44.entities.Song.create(data));
    } catch (err) { alert('Failed to save song.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Edit Song' : 'Add Song'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-slate-600">Title *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Artist / Author</Label>
            <Input value={form.artist || ''} onChange={(e) => set('artist', e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-600">Key</Label>
              <Input value={form.default_key || ''} onChange={(e) => set('default_key', e.target.value)} className="mt-1" placeholder="G" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">BPM</Label>
              <Input type="number" value={form.bpm || ''} onChange={(e) => set('bpm', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">CCLI #</Label>
              <Input value={form.ccli_number || ''} onChange={(e) => set('ccli_number', e.target.value)} className="mt-1" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">With a CCLI number, lyrics &amp; sheet music links to CCLI SongSelect are generated automatically in team emails.</p>
          <div>
            <Label className="text-xs font-medium text-slate-600">Song Link (YouTube / Spotify)</Label>
            <Input value={form.song_url || ''} onChange={(e) => set('song_url', e.target.value)} className="mt-1" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Lyrics Link (optional override)</Label>
            <Input value={form.lyrics_url || ''} onChange={(e) => set('lyrics_url', e.target.value)} className="mt-1" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Sheet Music / Chord Chart Link (optional override)</Label>
            <Input value={form.score_url || ''} onChange={(e) => set('score_url', e.target.value)} className="mt-1" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Notes</Label>
            <Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}