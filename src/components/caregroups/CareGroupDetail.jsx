import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CareGroupEventDialog from '@/components/caregroups/CareGroupEventDialog';
import { ArrowLeft, Crown, Users, Calendar as CalendarIcon, Plus, MapPin, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';

export default function CareGroupDetail({ group, people, churchId, onBack, onEdit }) {
  const [events, setEvents] = useState([]);
  const [showEventDialog, setShowEventDialog] = useState(false);

  const peopleById = Object.fromEntries(people.map(p => [p.id, p]));
  const leader = group.leader_id ? peopleById[group.leader_id] : null;
  const members = (group.member_ids || []).map(id => peopleById[id]).filter(Boolean);

  const loadEvents = useCallback(async () => {
    if (!group.calendar_id) return;
    const evts = await base44.entities.CalendarEvent.filter({ calendar_id: group.calendar_id }, 'start_time');
    setEvents(evts);
  }, [group.calendar_id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const deleteEvent = async (evt) => {
    if (!confirm(`Delete event "${evt.title}"?`)) return;
    await base44.entities.CalendarEvent.delete(evt.id);
    loadEvents();
  };

  const upcoming = events.filter(e => new Date(e.start_time) >= new Date(new Date().toDateString()));
  const past = events.filter(e => new Date(e.start_time) < new Date(new Date().toDateString()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={18} /></button>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: group.color || '#8b5cf6' }}>
            {group.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{group.name}</h2>
            {group.description && <p className="text-sm text-slate-500">{group.description}</p>}
          </div>
        </div>
        <Button variant="outline" onClick={onEdit}><Pencil size={14} /> Edit Group</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4"><Users size={16} className="text-indigo-500" /> Members</h3>
          {leader && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 border border-amber-100 mb-2">
              <Crown size={15} className="text-amber-500" />
              <span className="text-sm font-medium text-slate-800">{leader.first_name} {leader.last_name}</span>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-amber-600">Leader</span>
            </div>
          )}
          {members.length === 0 && !leader && <p className="text-sm text-slate-400 py-4 text-center">No members assigned yet.</p>}
          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                  {m.first_name?.[0]}{m.last_name?.[0]}
                </div>
                <div className="text-sm text-slate-800">{m.first_name} {m.last_name}</div>
                {m.phone || m.mobile ? <span className="ml-auto text-xs text-slate-400">{m.mobile || m.phone}</span> : null}
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2"><CalendarIcon size={16} className="text-indigo-500" /> Group Calendar</h3>
            <Button size="sm" onClick={() => setShowEventDialog(true)} className="bg-indigo-600 hover:bg-indigo-700"><Plus size={14} /> Event</Button>
          </div>
          {events.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No events scheduled yet.</p>}
          <div className="space-y-2">
            {upcoming.map((evt) => (
              <EventRow key={evt.id} evt={evt} onDelete={() => deleteEvent(evt)} />
            ))}
            {past.length > 0 && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pt-3">Past Events</p>
                {past.slice(-5).reverse().map((evt) => (
                  <EventRow key={evt.id} evt={evt} onDelete={() => deleteEvent(evt)} past />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <CareGroupEventDialog open={showEventDialog} onOpenChange={setShowEventDialog} group={group} churchId={churchId} onSaved={loadEvents} />
    </div>
  );
}

function EventRow({ evt, onDelete, past }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border border-slate-100 group ${past ? 'opacity-60' : 'hover:border-indigo-200'}`}>
      <div className="text-center w-12 shrink-0">
        <div className="text-[10px] font-semibold uppercase text-indigo-500">{format(new Date(evt.start_time), 'MMM')}</div>
        <div className="text-lg font-bold text-slate-900 leading-none">{format(new Date(evt.start_time), 'd')}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">{evt.title}</p>
        <p className="text-xs text-slate-500 flex items-center gap-2">
          {format(new Date(evt.start_time), 'h:mm a')}
          {evt.location && <span className="flex items-center gap-0.5"><MapPin size={10} /> {evt.location}</span>}
        </p>
      </div>
      <button onClick={onDelete} className="p-1.5 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 size={14} />
      </button>
    </div>
  );
}