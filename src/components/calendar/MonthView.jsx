import React from 'react';
import moment from 'moment';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthView({ currentDate, getEventsForDay, getCalendar, onSelectDate, onDeleteEvent }) {
  const today = moment();
  const monthStart = moment(currentDate).startOf('month');
  const startDay = monthStart.day();
  const daysInMonth = moment(currentDate).endOf('month').date();

  const cells = [];
  for (let i = 0; i < 42; i++) {
    if (i < startDay) {
      cells.push({ date: moment(monthStart).subtract(startDay - i, 'days'), inMonth: false });
    } else if (i >= startDay + daysInMonth) {
      cells.push({ date: moment(monthStart).add(i - startDay, 'days'), inMonth: false });
    } else {
      cells.push({ date: moment(monthStart).add(i - startDay, 'days'), inMonth: true });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100">
        {weekdays.map((wd) => (
          <div key={wd} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase">{wd}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((dayInfo, idx) => {
          const dayEvents = getEventsForDay(dayInfo.date);
          const isToday = dayInfo.date.isSame(today, 'day');
          return (
            <div
              key={idx}
              className={`min-h-[100px] border-r border-b border-slate-50 p-1.5 ${dayInfo.inMonth ? 'bg-white' : 'bg-slate-50/30'} ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`}
              onClick={() => onSelectDate(dayInfo.date)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`text-xs ${dayInfo.inMonth ? 'text-slate-600' : 'text-slate-300'} ${isToday ? 'font-bold' : ''}`}>
                {isToday ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded-full text-xs">{dayInfo.date.date()}</span>
                ) : (
                  dayInfo.date.date()
                )}
              </div>
              <div className="space-y-0.5 mt-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const cal = getCalendar(event.calendar_id);
                  return (
                    <div
                      key={event.id + idx}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white"
                      style={{ backgroundColor: cal?.color || '#3b82f6' }}
                      onClick={(e) => { e.stopPropagation(); if (confirm(event.is_recurring ? `Delete "${event.title}"? This will delete the entire recurring series.` : `Delete "${event.title}"?`)) onDeleteEvent(event); }}
                      title={`${event.title} - ${moment(event.start_time).format('h:mm A')}${event.is_recurring ? ' (recurring)' : ''}`}
                    >
                      {event.all_day ? '🗓 ' : `${moment(event.start_time).format('h:mm')} `}{event.title}{event.is_recurring ? ' ↻' : ''}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && <div className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}