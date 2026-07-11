import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Users, UserPlus, CalendarPlus, Copy } from 'lucide-react';

export default function PlanAssignments({ plan, churchId, assignments, setAssignments, people, teams, positions }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const personName = (id) => {
    const p = people.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  };

  const handleRemove = async (a) => {
    try {
      await base44.entities.PlanAssignment.delete(a.id);
      setAssignments((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) { alert('Failed to remove assignment.'); }
  };

  const handleAssignTeam = async (team) => {
    const members = (team.members || []).filter((m) => m.person_id);
    const newOnes = members.filter((m) => !assignments.some((a) => a.person_id === m.person_id && a.position === (m.position || 'Team Member')));
    if (newOnes.length === 0) { alert('Everyone on this team is already scheduled.'); setShowTeam(false); return; }
    try {
      const created = await base44.entities.PlanAssignment.bulkCreate(newOnes.map((m) => ({
        church_id: churchId,
        plan_id: plan.id,
        person_id: m.person_id,
        position: m.position || 'Team Member',
        team_id: team.id,
      })));
      setAssignments((prev) => [...prev, ...created]);
      setShowTeam(false);
    } catch (err) { alert('Failed to assign team.'); }
  };

  const copyFeedLink = (personId) => {
    const url = `${window.location.origin}/functions/serviceScheduleICS?person_id=${personId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(personId);
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
        <Users size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900 flex-1">Team & Positions</h3>
        <Button size="sm" variant="outline" onClick={() => setShowTeam(true)}><Users size={13} className="mr-1" />Assign Team</Button>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}><UserPlus size={13} className="mr-1" />Add Person</Button>
      </div>
      <div className="divide-y divide-slate-50">
        {assignments.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">Nobody scheduled yet. Assign a whole team or add people one by one.</p>
        ) : (
          assignments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{personName(a.person_id)}</p>
                <p className="text-[11px] text-slate-400">{a.position}{a.team_id ? ' · via team' : ''}</p>
              </div>
              <button
                onClick={() => copyFeedLink(a.person_id)}
                title="Copy this person's calendar feed link (subscribe in Google/Apple/Outlook for auto-sync)"
                className="text-slate-300 hover:text-indigo-600 p-1 flex items-center gap-1"
              >
                {copiedId === a.person_id ? <span className="text-[10px] text-emerald-500">Copied!</span> : <CalendarPlus size={14} />}
              </button>
              <button onClick={() => handleRemove(a)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
            </div>
          ))
        )}
      </div>
      <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-start gap-1.5">
        <Copy size={11} className="mt-0.5 flex-shrink-0" />
        The calendar icon copies a personal feed link — paste it into Google/Apple/Outlook "subscribe by URL" and their serving schedule stays auto-synced.
      </div>

      {showAdd && (
        <AddAssignmentDialog
          plan={plan}
          churchId={churchId}
          people={people}
          positions={positions}
          existing={assignments}
          onAdded={(created) => { setAssignments((prev) => [...prev, created]); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showTeam && (
        <Dialog open onOpenChange={() => setShowTeam(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Assign a Team</DialogTitle></DialogHeader>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {teams.filter((t) => t.is_active !== false).map((t) => (
                <button key={t.id} onClick={() => handleAssignTeam(t)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left">
                  <Users size={16} className="text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{(t.members || []).length} member{(t.members || []).length === 1 ? '' : 's'}</p>
                  </div>
                </button>
              ))}
              {teams.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No teams yet. Create them on the Teams tab.</p>}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowTeam(false)}>Cancel</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddAssignmentDialog({ plan, churchId, people, positions, existing, onAdded, onClose }) {
  const [personId, setPersonId] = useState('');
  const [position, setPosition] = useState(positions[0] || '');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!personId || !position) { alert('Pick a person and a position.'); return; }
    if (existing.some((a) => a.person_id === personId && a.position === position)) {
      alert('That person is already scheduled for this position.');
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.PlanAssignment.create({
        church_id: churchId,
        plan_id: plan.id,
        person_id: personId,
        position,
      });
      onAdded(created);
    } catch (err) { alert('Failed to add assignment.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Person to Schedule</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Person</Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select person..." /></SelectTrigger>
              <SelectContent>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {positions.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Adding...' : <><Plus size={14} className="mr-1" />Add</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}