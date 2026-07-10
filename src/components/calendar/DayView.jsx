import React from 'react';
import moment from 'moment';

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START);
const HOUR_HEIGHT = 52;
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

export default function DayView({ currentDate, getEventsForDay, getCalendar, onSelectDate, onSelectEvent }) {
  const today = moment();
  const isToday = currentDate.isSame(today, 'day');
  const dayEvents = getEventsForDay(currentDate);
  const allDayEvents = dayEvents.filter((e) => e.all_day);
  const timedEvents = dayEvents.filter((e) => !e.all_day);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="text-xs text-slate-500 uppercase">{currentDate.format('dddd')}</div>
        <div className="text-lg font-semibold text-slate-900">
          {isToday ? <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-600 text-white rounded-full text-sm mr-1.5">{currentDate.format('D')}</span> : currentDate.format('MMMM D')}
          {isToday && <span className="text-xs font-normal text-indigo-500 ml-1">Today</span>}
        </div>
      </div>

      {allDayEvents.length > 0 && (
        <div className="px-5 py-2 border-b border-slate-100 space-y-1">
          {allDayEvents.map((event) => {
            const cal = getCalendar(event.calendar_id);
            return (
              <div key={event.id} className="text-xs px-2 py-1 rounded text-white font-medium" style={{ backgroundColor: cal?.color || '#3b82f6' }}
                onClick={() => onSelectEvent(event)}>
                🗓 {event.title}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid overflow-y-auto" style={{ gridTemplateColumns: '72px 1fr', maxHeight: '65vh' }}>
        <div className="border-r border-slate-100">
          {HOURS.map((h) => (
            <div key={h} className="text-[10px] text-slate-400 text-right pr-2 border-b border-slate-50 leading-[52px]" style={{ height: HOUR_HEIGHT }}>
              {h > 12 ? h - 12 : h}{h >= 12 ? ' PM' : ' AM'}
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: TOTAL_HEIGHT }} onClick={() => onSelectDate(currentDate)}>
          {HOURS.map((h) => (
            <div key={h} className="border-b border-slate-50" style={{ height: HOUR_HEIGHT }} />
          ))}
          {timedEvents.map((event) => {
            const start = moment(event.start_time);
            const end = event.end_time ? moment(event.end_time) : moment(start).add(1, 'hour');
            const startHour = start.hour() + start.minute() / 60;
            const endHour = end.hour() + end.minute() / 60;
            const top = Math.max(0, (startHour - HOUR_START) * HOUR_HEIGHT);
            const height = Math.max(28, Math.min(endHour, HOUR_END + 1) - Math.max(startHour, HOUR_START)) * HOUR_HEIGHT;
            const cal = getCalendar(event.calendar_id);
            return (
              <div key={event.id}
                className="absolute left-2 right-2 rounded-lg px-3 py-1 text-white overflow-hidden cursor-pointer"
                style={{ top, height, backgroundColor: cal?.color || '#3b82f6' }}
                onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
              >
                <div className="text-sm font-medium truncate">{event.title}{event.is_recurring ? ' ↻' : ''}</div>
                <div className="text-[10px] opacity-90">{start.format('h:mm A')}{event.end_time ? ` – ${end.format('h:mm A')}` : ''}</div>
                {event.location && <div className="text-[10px] opacity-80 truncate">📍 {event.location}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}