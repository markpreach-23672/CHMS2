import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, ChevronUp, ChevronDown, Music, ListOrdered } from 'lucide-react';

export default function PlanFlowEditor({ plan, churchId, items, setItems, songs, setSongs, people }) {
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const persistOrder = async (newItems) => {
    setItems(newItems);
    try {
      await base44.entities.PlanItem.bulkUpdate(newItems.map((it, i) => ({ id: it.id, sort_order: i })));
    } catch (err) { console.error(err); }
  };

  const move = (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[idx], next[to]] = [next[to], next[idx]];
    persistOrder(next);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Remove "${item.title}" from the flow?`)) return;
    try {
      await base44.entities.PlanItem.delete(item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) { alert('Failed to remove item.'); }
  };

  const handleSaved = (saved) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [...prev, saved];
    });
    setShowForm(false);
    setEditItem(null);
  };

  const songById = (id) => songs.find((s) => s.id === id);
  const personName = (id) => {
    const p = people.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : '';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
        <ListOrdered size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900 flex-1">Order of Service</h3>
        <Button size="sm" variant="outline" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus size={13} className="mr-1" />Add Item
        </Button>
      </div>
      <div className="divide-y divide-slate-50">
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No items yet. Add songs, elements, and section headers.</p>
        ) : (
          items.map((item, idx) => {
            const song = item.song_id ? songById(item.song_id) : null;
            return (
              <div key={item.id} className={`flex items-center gap-2 px-4 py-2.5 group ${item.type === 'header' ? 'bg-slate-50/70' : ''}`}>
                <div className="flex flex-col">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ChevronUp size={13} /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ChevronDown size={13} /></button>
                </div>
                {item.type === 'header' ? (
                  <p className="flex-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600">{item.title}</p>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 flex items-center gap-1.5">
                      {item.type === 'song' && <Music size={13} className="text-indigo-400 flex-shrink-0" />}
                      <span className="truncate">{song ? `${song.title}${song.artist ? ' — ' + song.artist : ''}` : item.title}</span>
                      {(item.key_override || song?.default_key) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 flex-shrink-0">Key {item.key_override || song.default_key}</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.duration_minutes || 0} min
                      {item.person_id && ` · ${personName(item.person_id)}`}
                      {item.notes && ` · ${item.notes}`}
                    </p>
                  </div>
                )}
                <button onClick={() => { setEditItem(item); setShowForm(true); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 p-1"><Pencil size={13} /></button>
                <button onClick={() => handleDelete(item)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <ItemForm
          item={editItem}
          plan={plan}
          churchId={churchId}
          nextOrder={items.length}
          songs={songs}
          setSongs={setSongs}
          people={people}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function ItemForm({ item, plan, churchId, nextOrder, songs, setSongs, people, onSaved, onClose }) {
  const [form, setForm] = useState({
    type: 'element', title: '', duration_minutes: 5, song_id: '', key_override: '', person_id: '', notes: '',
    ...item,
  });
  const [saving, setSaving] = useState(false);
  const [newSong, setNewSong] = useState(false);
  const [songForm, setSongForm] = useState({ title: '', artist: '', default_key: '', ccli_number: '', song_url: '' });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    let songId = form.song_id;
    let title = form.title;
    setSaving(true);
    try {
      if (form.type === 'song' && newSong) {
        if (!songForm.title.trim()) { alert('Song title is required.'); setSaving(false); return; }
        const created = await base44.entities.Song.create({ church_id: churchId, ...songForm });
        setSongs((prev) => [...prev, created]);
        songId = created.id;
      }
      if (form.type === 'song') {
        const song = songId ? [...songs, {}].find((s) => s.id === songId) : null;
        title = song?.title || songForm.title || title || 'Song';
        if (!songId) { alert('Pick a song or add a new one.'); setSaving(false); return; }
      }
      if (!title.trim() && form.type !== 'song') { alert('Title is required.'); setSaving(false); return; }

      const data = {
        church_id: churchId,
        plan_id: plan.id,
        type: form.type,
        title: title || 'Song',
        duration_minutes: Number(form.duration_minutes) || 0,
        song_id: form.type === 'song' ? songId : undefined,
        key_override: form.type === 'song' ? form.key_override : undefined,
        person_id: form.person_id || undefined,
        notes: form.notes || undefined,
      };
      if (item) {
        const updated = await base44.entities.PlanItem.update(item.id, data);
        onSaved(updated);
      } else {
        const created = await base44.entities.PlanItem.create({ ...data, sort_order: nextOrder });
        onSaved(created);
      }
    } catch (err) { alert('Failed to save item.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Type</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="element">Service Element</SelectItem>
                <SelectItem value="song">Song</SelectItem>
                <SelectItem value="header">Section Header</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.type === 'song' ? (
            <>
              {!newSong ? (
                <div>
                  <Label className="text-xs font-medium text-slate-600">Song</Label>
                  <Select value={form.song_id || ''} onValueChange={(v) => set('song_id', v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pick from song library..." /></SelectTrigger>
                    <SelectContent>
                      {songs.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}{s.artist ? ` — ${s.artist}` : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button onClick={() => setNewSong(true)} className="text-xs text-indigo-600 hover:underline mt-1">+ Add a new song</button>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                  <Input value={songForm.title} onChange={(e) => setSongForm((p) => ({ ...p, title: e.target.value }))} placeholder="Song title *" />
                  <Input value={songForm.artist} onChange={(e) => setSongForm((p) => ({ ...p, artist: e.target.value }))} placeholder="Artist" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={songForm.default_key} onChange={(e) => setSongForm((p) => ({ ...p, default_key: e.target.value }))} placeholder="Key (e.g. G)" />
                    <Input value={songForm.ccli_number} onChange={(e) => setSongForm((p) => ({ ...p, ccli_number: e.target.value }))} placeholder="CCLI #" />
                  </div>
                  <Input value={songForm.song_url} onChange={(e) => setSongForm((p) => ({ ...p, song_url: e.target.value }))} placeholder="Song link (YouTube/Spotify)" />
                  <button onClick={() => setNewSong(false)} className="text-xs text-slate-500 hover:underline">Pick existing instead</button>
                </div>
              )}
              <div>
                <Label className="text-xs font-medium text-slate-600">Key for this service (optional)</Label>
                <Input value={form.key_override || ''} onChange={(e) => set('key_override', e.target.value)} className="mt-1" placeholder="e.g. A" />
              </div>
            </>
          ) : (
            <div>
              <Label className="text-xs font-medium text-slate-600">Title *</Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="mt-1" autoFocus placeholder={form.type === 'header' ? 'e.g. WORSHIP' : 'e.g. Welcome & Announcements'} />
            </div>
          )}

          {form.type !== 'header' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-slate-600">Duration (min)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={(e) => set('duration_minutes', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">Led By</Label>
                  <Select value={form.person_id || 'none'} onValueChange={(v) => set('person_id', v === 'none' ? '' : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Nobody" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nobody</SelectItem>
                      {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Notes</Label>
                <Textarea rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} className="mt-1" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}