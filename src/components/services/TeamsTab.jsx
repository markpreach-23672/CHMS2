import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Users } from 'lucide-react';

const DEFAULT_POSITIONS = ['Worship Leader', 'Vocals', 'Keys', 'Guitar', 'Bass', 'Drums', 'Usher', 'Greeter', 'Emcee', 'Prayer', 'Announcements', 'Sound', 'Media'];

export default function TeamsTab({ churchId, people }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTeams(await base44.entities.ServiceTeam.list()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const personName = (id) => {
    const p = people.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  };

  const handleDelete = async (team) => {
    if (!confirm(`Delete team "${team.name}"?`)) return;
    try {
      await base44.entities.ServiceTeam.delete(team.id);
      setTeams((prev) => prev.filter((x) => x.id !== team.id));
    } catch (err) { alert('Failed to delete team.'); }
  };

  const handleSaved = (saved) => {
    setTeams((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditItem(null);
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={15} className="mr-1.5" />New Team
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-sm text-slate-400 p-4">Loading...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-slate-400 p-4 col-span-2 text-center bg-white rounded-xl border border-slate-200 py-8">No teams yet. Create rotating worship teams, usher teams, or ad-hoc groups — then assign a whole team to a service plan in one click.</p>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl border border-slate-200 p-4 group">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 flex-1">{team.name}</h3>
                <button onClick={() => { setEditItem(team); setShowForm(true); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 p-1"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(team)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              </div>
              {team.description && <p className="text-xs text-slate-400 mb-2">{team.description}</p>}
              <div className="space-y-1">
                {(team.members || []).map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{personName(m.person_id)}</span>
                    <span className="text-slate-400">{m.position}</span>
                  </div>
                ))}
                {(team.members || []).length === 0 && <p className="text-xs text-slate-400">No members yet.</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <TeamForm item={editItem} churchId={churchId} people={people} onSaved={handleSaved} onClose={() => { setShowForm(false); setEditItem(null); }} />
      )}
    </div>
  );
}

function TeamForm({ item, churchId, people, onSaved, onClose }) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [members, setMembers] = useState(item?.members || []);
  const [saving, setSaving] = useState(false);

  const addMember = () => setMembers((prev) => [...prev, { person_id: '', position: DEFAULT_POSITIONS[0] }]);
  const updateMember = (idx, key, value) => setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
  const removeMember = (idx) => setMembers((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name.trim()) { alert('Team name is required.'); return; }
    setSaving(true);
    try {
      const data = { church_id: churchId, name, description, members: members.filter((m) => m.person_id) };
      if (item) onSaved(await base44.entities.ServiceTeam.update(item.id, data));
      else onSaved(await base44.entities.ServiceTeam.create(data));
    } catch (err) { alert('Failed to save team.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Edit Team' : 'New Team'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Team Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Worship Team A" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-medium text-slate-600">Members & Positions</Label>
              <Button size="sm" variant="outline" onClick={addMember} className="h-7 text-xs"><Plus size={12} className="mr-1" />Add</Button>
            </div>
            <div className="space-y-2">
              {members.map((m, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select value={m.person_id} onValueChange={(v) => updateMember(idx, 'person_id', v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Person..." /></SelectTrigger>
                    <SelectContent>
                      {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={m.position} onChange={(e) => updateMember(idx, 'position', e.target.value)} className="w-36" placeholder="Position" list={`positions-${idx}`} />
                  <datalist id={`positions-${idx}`}>
                    {DEFAULT_POSITIONS.map((p) => <option key={p} value={p} />)}
                  </datalist>
                  <button onClick={() => removeMember(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              {members.length === 0 && <p className="text-xs text-slate-400">No members added.</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Saving...' : 'Save Team'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}