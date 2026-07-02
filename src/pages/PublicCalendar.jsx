import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import moment from 'moment';
import { getEventsForDay } from '@/utils/calendarUtils';

export default function PublicCalendar() {
  const { calendarId } = useParams();
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(moment());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke('getPublicCalendar', { calendar_id: calendarId });
        if (res.data?.error) {
          setError(res.data.error);
        } else {
          setCalendar(res.data);
        }
      } catch (err) {
        setError('Calendar not found or not public.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [calendarId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <CalendarIcon size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const events = calendar.events || [];
  const today = moment();
  const monthStart = moment(currentDate).startOf('month');
  const startDay = monthStart.day();
  const daysInMonth = moment(currentDate).endOf('month').date();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    if (i < startDay) cells.push({ date: moment(monthStart).subtract(startDay - i, 'days'), inMonth: false });
    else if (i >= startDay + daysInMonth) cells.push({ date: moment(monthStart).add(i - startDay, 'days'), inMonth: false });
    else cells.push({ date: moment(monthStart).add(i - startDay, 'days'), inMonth: true });
  }

  const selectedDayEvents = selectedDate ? getEventsForDay(events, selectedDate) : [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100" style={{ borderTop: `4px solid ${calendar.color || '#3b82f6'}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: calendar.color || '#3b82f6' }}>
                <CalendarIcon size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{calendar.name}</h1>
                <p className="text-sm text-slate-500">{events.length} events scheduled</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentDate(moment(currentDate).subtract(1, 'month'))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} className="text-slate-500" /></button>
              <h2 className="text-lg font-semibold text-slate-900 min-w-[180px] text-center">{currentDate.format('MMMM YYYY')}</h2>
              <button onClick={() => setCurrentDate(moment(currentDate).add(1, 'month'))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={18} className="text-slate-500" /></button>
              <Button variant="outline" size="sm" onClick={() => { setCurrentDate(moment()); setSelectedDate(null); }} className="ml-1">Today</Button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="p-4">
            <div className="grid grid-cols-7 border-b border-slate-100 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd) => (
                <div key={wd} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase">{wd}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((dayInfo, idx) => {
                const dayEvents = getEventsForDay(events, dayInfo.date);
                const isToday = dayInfo.date.isSame(today, 'day');
                const isSelected = selectedDate && dayInfo.date.isSame(selectedDate, 'day');
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(dayInfo.date)}
                    className={`min-h-[72px] border-r border-b border-slate-50 p-1.5 text-left transition-colors ${dayInfo.inMonth ? 'bg-white' : 'bg-slate-50/30'} ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`text-xs ${dayInfo.inMonth ? 'text-slate-600' : 'text-slate-300'} ${isToday ? 'font-bold' : ''}`}>
                      {isToday ? <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded-full text-xs">{dayInfo.date.date()}</span> : dayInfo.date.date()}
                    </div>
                    <div className="space-y-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div key={event.id + idx} className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white" style={{ backgroundColor: calendar.color || '#3b82f6' }}>
                          {event.all_day ? '🗓 ' : `${moment(event.start_time).format('h:mm')} `}{event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} more</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected day events */}
        {selectedDate && (
          <div className="mt-4 bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-3">{selectedDate.format('dddd, MMMM D, YYYY')}</h3>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-slate-400">No events on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                    <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: calendar.color || '#3b82f6' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{event.title}</div>
                      <div className="text-xs text-slate-500">
                        {event.all_day ? 'All day' : moment(event.start_time).format('h:mm A') + (event.end_time ? ` – ${moment(event.end_time).format('h:mm A')}` : '')}
                        {event.is_recurring && ' ↻'}
                      </div>
                      {event.location && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={10} /> {event.location}</div>
                      )}
                      {event.description && <p className="text-xs text-slate-500 mt-1">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}