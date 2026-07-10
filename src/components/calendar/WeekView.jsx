import React from 'react';
import moment from 'moment';

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START);
const HOUR_HEIGHT = 44;
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

export default function WeekView({ currentDate, getEventsForDay, getCalendar, onSelectDate, onSelectEvent }) {
  const today = moment();
  const weekStart = moment(currentDate).startOf('week');
  const days = Array.from({ length: 7 }, (_, i) => moment(weekStart).add(i, 'days'));

  const renderEvent = (event, dayDate) => {
    const start = moment(event.start_time);
    const end = event.end_time ? moment(event.end_time) : moment(start).add(1, 'hour');
    const startHour = start.hour() + start.minute() / 60;
    const endHour = end.hour() + end.minute() / 60;
    const top = Math.max(0, (startHour - HOUR_START) * HOUR_HEIGHT);
    const height = Math.max(20, Math.min(endHour, HOUR_END + 1) - Math.max(startHour, HOUR_START)) * HOUR_HEIGHT;
    const cal = getCalendar(event.calendar_id);
    return (
      <div
        key={event.id + dayDate.format('D')}
        className="absolute left-0.5 right-0.5 rounded text-[10px] px-1.5 py-0.5 text-white overflow-hidden cursor-pointer"
        style={{ top, height, backgroundColor: cal?.color || '#3b82f6' }}
        onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
      >
        <div className="font-medium truncate">{event.title}{event.is_recurring ? ' ↻' : ''}</div>
        <div className="opacity-80">{start.format('h:mm A')}</div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
        <div className="border-r border-slate-100" />
        {days.map((d) => {
          const isToday = d.isSame(today, 'day');
          return (
            <div key={d.format('D')} className="text-center py-2 border-r border-slate-100 last:border-r-0">
              <div className="text-xs text-slate-500 uppercase">{d.format('ddd')}</div>
              <div className={`text-base font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-900'}`}>
                {isToday ? <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-full text-xs">{d.format('D')}</span> : d.format('D')}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
        <div className="border-r border-slate-100 text-[9px] text-slate-400 px-1 py-1 text-right">all-day</div>
        {days.map((d) => {
          const allDayEvents = getEventsForDay(d).filter((e) => e.all_day);
          return (
            <div key={d.format('D')} className="border-r border-slate-100 last:border-r-0 p-0.5 min-h-[24px]" onClick={() => onSelectDate(d)} style={{ cursor: 'pointer' }}>
              {allDayEvents.map((event) => {
                const cal = getCalendar(event.calendar_id);
                return (
                  <div key={event.id} className="text-[9px] px-1 py-0.5 rounded truncate text-white font-medium" style={{ backgroundColor: cal?.color || '#3b82f6' }}
                    onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}>
                    {event.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="grid overflow-y-auto" style={{ gridTemplateColumns: `56px repeat(7, 1fr)`, maxHeight: '65vh' }}>
        <div className="border-r border-slate-100">
          {HOURS.map((h) => (
            <div key={h} className="text-[10px] text-slate-400 text-right pr-2 border-b border-slate-50" style={{ height: HOUR_HEIGHT }}>
              {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
            </div>
          ))}
        </div>
        {days.map((d) => {
          const isToday = d.isSame(today, 'day');
          return (
            <div key={d.format('D')} className={`relative border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-indigo-50/30' : ''}`} style={{ height: TOTAL_HEIGHT }} onClick={() => onSelectDate(d)}>
              {HOURS.map((h) => (
                <div key={h} className="border-b border-slate-50" style={{ height: HOUR_HEIGHT }} />
              ))}
              {getEventsForDay(d).filter((e) => !e.all_day).map((event) => renderEvent(event, d))}
            </div>
          );
        })}
      </div>
    </div>
  );
}