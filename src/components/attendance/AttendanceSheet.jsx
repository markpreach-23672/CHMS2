import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check, X, Loader2, Crown } from 'lucide-react';
import { format } from 'date-fns';

export default function AttendanceSheet({ event, people, churchId, onBack }) {
  const [marks, setMarks] = useState({});
  const [leaderId, setLeaderId] = useState(event.leader_person_id || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const roster = people.filter((p) => (p.tag_ids || []).some((t) => (event.tag_ids || []).includes(t)));

  useEffect(() => {
    base44.entities.AttendanceRecord.filter({ event_id: event.id }).then((records) => {
      setMarks(Object.fromEntries(records.map((r) => [r.person_id, r.status])));
      setLoading(false);
    });
  }, [event.id]);

  const setMark = (personId, status) => {
    setMarks((m) => ({ ...m, [personId]: m[personId] === status ? undefined : status }));
  };

  const markAllPresent = () => {
    setMarks(Object.fromEntries(roster.map((p) => [p.id, 'present'])));
  };

  const handleLeaderChange = async (v) => {
    const id = v === 'none' ? '' : v;
    setLeaderId(id);
    await base44.entities.CalendarEvent.update(event.id, { leader_person_id: id });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.AttendanceRecord.filter({ event_id: event.id });
      if (existing.length > 0) await base44.entities.AttendanceRecord.deleteMany({ event_id: event.id });
      const eventDate = event.start_time.split('T')[0];
      const rows = roster
        .filter((p) => marks[p.id])
        .map((p) => ({ church_id: churchId, event_id: event.id, event_date: eventDate, person_id: p.id, status: marks[p.id] }));
      if (rows.length > 0) await base44.entities.AttendanceRecord.bulkCreate(rows);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  const presentCount = roster.filter((p) => marks[p.id] === 'present').length;
  const absentCount = roster.filter((p) => marks[p.id] === 'absent').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={18} /></button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{event.title}</h2>
          <p className="text-sm text-slate-500">{format(new Date(event.start_time), 'EEEE, MMMM d, yyyy · h:mm a')}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-end gap-4 flex-wrap">
        <div className="min-w-56">
          <Label className="flex items-center gap-1.5"><Crown size={13} className="text-amber-500" /> Event Leader (gets absence alerts)</Label>
          <Select value={leaderId || 'none'} onValueChange={handleLeaderChange}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select leader" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No leader</SelectItem>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-emerald-600 font-medium">{presentCount} present</span>
          <span className="text-red-500 font-medium">{absentCount} absent</span>
          <Button variant="outline" size="sm" onClick={markAllPresent}>Mark All Present</Button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : roster.length === 0 ? (
        <div className="bg-white border border-dashed rounded-xl p-10 text-center text-sm text-slate-500">
          No people share this event's tags. Add the event's tag to people in the People module to build the expected roster.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {roster.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                {p.first_name?.[0]}{p.last_name?.[0]}
              </div>
              <span className="text-sm text-slate-800 flex-1">{p.first_name} {p.last_name}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setMark(p.id, 'present')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-colors ${
                    marks[p.id] === 'present' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                  }`}>
                  <Check size={13} /> Present
                </button>
                <button onClick={() => setMark(p.id, 'absent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-colors ${
                    marks[p.id] === 'absent' ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 text-slate-500 hover:border-red-300'
                  }`}>
                  <X size={13} /> Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {savedAt && <span className="text-xs text-emerald-600">Saved at {format(savedAt, 'h:mm a')}</span>}
        <Button onClick={handleSave} disabled={saving || loading} className="bg-indigo-600 hover:bg-indigo-700">
          {saving && <Loader2 size={14} className="animate-spin" />} Save Attendance
        </Button>
      </div>
    </div>
  );
}