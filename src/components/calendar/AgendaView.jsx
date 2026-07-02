import React from 'react';
import moment from 'moment';
import { Trash2 } from 'lucide-react';

export default function AgendaView({ currentDate, getEventsForDay, getCalendar, onDeleteEvent }) {
  const days = Array.from({ length: 30 }, (_, i) => moment(currentDate).startOf('day').add(i, 'days'));
  const today = moment();

  const dayBuckets = days
    .map((d) => ({ date: d, events: getEventsForDay(d) }))
    .filter((bucket) => bucket.events.length > 0);

  if (dayBuckets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-sm text-slate-400">No events in the next 30 days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dayBuckets.map((bucket) => {
        const isToday = bucket.date.isSame(today, 'day');
        return (
          <div key={bucket.date.format('YYYY-MM-DD')}>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-semibold text-slate-900">
                {isToday ? 'Today' : bucket.date.format('dddd, MMM D')}
              </div>
              <div className="text-xs text-slate-400">{bucket.events.length} event{bucket.events.length > 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {bucket.events.map((event) => {
                const cal = getCalendar(event.calendar_id);
                return (
                  <div key={event.id + bucket.date.format('D')} className="flex items-center gap-3 p-3 group">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal?.color || '#3b82f6' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {event.title}{event.is_recurring ? ' ↻' : ''}
                      </div>
                      <div className="text-xs text-slate-500">
                        {event.all_day ? 'All day' : moment(event.start_time).format('h:mm A')}{event.end_time && !event.all_day ? ` – ${moment(event.end_time).format('h:mm A')}` : ''}
                        {event.location && ` · 📍 ${event.location}`}
                        {cal && ` · ${cal.name}`}
                      </div>
                    </div>
                    <button
                      onClick={() => { if (confirm(event.is_recurring ? `Delete "${event.title}"? This will delete the entire recurring series.` : `Delete "${event.title}"?`)) onDeleteEvent(event); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}