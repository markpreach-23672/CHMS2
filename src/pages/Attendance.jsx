import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import AttendanceSheet from '@/components/attendance/AttendanceSheet';
import { ClipboardCheck, ChevronRight, TagIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const [churchId, setChurchId] = useState(null);
  const [people, setPeople] = useState([]);
  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    (async () => {
      const [ppl, evts, tgs, churches] = await Promise.all([
        base44.entities.Person.list('first_name', 1000),
        base44.entities.CalendarEvent.list('-start_time', 300),
        base44.entities.Tag.list('name'),
        base44.entities.Church.list(),
      ]);
      setChurchId(churches[0]?.id || null);
      setPeople(ppl);
      setTags(tgs);
      // Only tagged events (tags define who is expected) within the last 8 weeks / next 2 weeks
      const since = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
      const until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      setEvents(evts.filter((e) => (e.tag_ids || []).length > 0 && new Date(e.start_time) >= since && new Date(e.start_time) <= until));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const tagById = Object.fromEntries(tags.map((t) => [t.id, t]));

  return (
    <div className="p-6 md:p-8 space-y-6">
      {selectedEvent ? (
        <AttendanceSheet event={selectedEvent} people={people} churchId={churchId} onBack={() => setSelectedEvent(null)} />
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="text-indigo-500" size={24} /> Attendance
            </h1>
            <p className="text-sm text-slate-500">
              Track attendance for services, classes, and groups. Events with tags appear here — the tag defines who is expected.
            </p>
          </div>

          {events.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
              <ClipboardCheck size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-700">No tagged events found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Add tags (like "Sunday School" or "Youth Group") to calendar events, and give the same tags to the people who should attend. Those sessions will show up here for check-in.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {events.map((evt) => (
                <button key={evt.id} onClick={() => setSelectedEvent(evt)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                  <div className="text-center w-12 shrink-0">
                    <div className="text-[10px] font-semibold uppercase text-indigo-500">{format(new Date(evt.start_time), 'MMM')}</div>
                    <div className="text-lg font-bold text-slate-900 leading-none">{format(new Date(evt.start_time), 'd')}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{evt.title}</p>
                    <p className="text-xs text-slate-500">{format(new Date(evt.start_time), 'EEEE · h:mm a')}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {(evt.tag_ids || []).map((tid) => tagById[tid] && (
                      <Badge key={tid} variant="outline" className="text-[10px] gap-1" style={{ borderColor: tagById[tid].color, color: tagById[tid].color }}>
                        <TagIcon size={9} /> {tagById[tid].name}
                      </Badge>
                    ))}
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}