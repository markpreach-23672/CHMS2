import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, ChevronLeft, ChevronRight, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import moment from 'moment';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [visibleCalendars, setVisibleCalendars] = useState(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([
        base44.entities.CalendarEvent.list(),
        base44.entities.DepartmentCalendar.list(),
      ]);
      setEvents(e);
      setCalendars(c);
      setVisibleCalendars(new Set(c.map((cal) => cal.id)));
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCalendar = (calId) => calendars.find((c) => c.id === calId);

  const filteredEvents = events.filter((e) => visibleCalendars.has(e.calendar_id));

  const monthStart = moment(currentMonth).startOf('month');
  const monthEnd = moment(currentMonth).endOf('month');
  const startDay = monthStart.day();
  const daysInMonth = monthEnd.date();

  const weeks = [];
  let day = 1;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (w === 0 && d < startDay) {
        const prevMonth = moment(monthStart).subtract(startDay - d, 'days');
        week.push({ date: prevMonth, inMonth: false });
      } else if (day > daysInMonth) {
        const nextMonth = moment(monthStart).add(day - 1, 'days');
        week.push({ date: nextMonth, inMonth: false });
        day++;
      } else {
        week.push({ date: moment(monthStart).add(day - 1, 'days'), inMonth: true, dayNum: day });
        day++;
      }
    }
    weeks.push(week);
  }

  const getEventsForDay = (date) => {
    return filteredEvents.filter((e) => {
      if (!e.start_time) return false;
      const eventDate = moment(e.start_time);
      return eventDate.isSame(date, 'day');
    });
  };

  const handleDeleteEvent = async (event) => {
    if (!confirm(`Delete "${event.title}"?`)) return;
    try {
      await base44.entities.CalendarEvent.delete(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err) {
      alert('Failed to delete event.');
    }
  };

  const toggleCalendar = (calId) => {
    setVisibleCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(calId)) next.delete(calId);
      else next.add(calId);
      return next;
    });
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = moment();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500 text-sm mt-1">Multi-department calendar with color-coded events.</p>
        </div>
        <Button onClick={() => { setSelectedDate(moment()); setShowEventForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1.5" />
          Add Event
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">{currentMonth.format('MMMM YYYY')}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentMonth(moment(currentMonth).subtract(1, 'month'))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} className="text-slate-500" /></button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(moment())}>Today</Button>
                <button onClick={() => setCurrentMonth(moment(currentMonth).add(1, 'month'))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={18} className="text-slate-500" /></button>
              </div>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {weekdays.map((wd) => (
                <div key={wd} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase">{wd}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {weeks.flat().map((dayInfo, idx) => {
                const dayEvents = getEventsForDay(dayInfo.date);
                const isToday = dayInfo.date.isSame(today, 'day');
                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border-r border-b border-slate-50 p-1.5 ${dayInfo.inMonth ? 'bg-white' : 'bg-slate-50/30'} ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`}
                    onClick={() => { setSelectedDate(dayInfo.date); setShowEventForm(true); }}
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
                            key={event.id}
                            className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white"
                            style={{ backgroundColor: cal?.color || '#3b82f6' }}
                            onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${event.title}"?`)) handleDeleteEvent(event); }}
                            title={`${event.title} - ${moment(event.start_time).format('h:mm A')}`}
                          >
                            {moment(event.start_time).format('h:mm')} {event.title}
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
        </div>

        {/* Calendar list sidebar */}
        <div className="w-56 flex-shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Departments</h3>
          <div className="space-y-1.5">
            {calendars.map((cal) => (
              <label key={cal.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleCalendars.has(cal.id)}
                  onChange={() => toggleCalendar(cal.id)}
                  className="rounded"
                />
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                <span className="text-sm text-slate-700">{cal.name}</span>
              </label>
            ))}
            {calendars.length === 0 && !loading && (
              <p className="text-xs text-slate-400">No calendars yet.</p>
            )}
          </div>
        </div>
      </div>

      {showEventForm && (
        <EventForm
          calendars={calendars}
          selectedDate={selectedDate}
          onSave={async (data) => {
            try {
              const created = await base44.entities.CalendarEvent.create(data);
              setEvents((prev) => [...prev, created]);
              setShowEventForm(false);
            } catch (err) {
              alert('Failed to create event.');
            }
          }}
          onClose={() => setShowEventForm(false)}
        />
      )}
    </div>
  );
}

function EventForm({ calendars, selectedDate, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [calendarId, setCalendarId] = useState(calendars[0]?.id || '');
  const [startTime, setStartTime] = useState(selectedDate ? selectedDate.format('YYYY-MM-DDTHH:mm') : moment().format('YYYY-MM-DDTHH:mm'));
  const [endTime, setEndTime] = useState(selectedDate ? selectedDate.format('YYYY-MM-DD') + 'T12:00' : moment().format('YYYY-MM-DD') + 'T12:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Calendar</Label>
            <select value={calendarId} onChange={(e) => setCalendarId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Start</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" disabled={allDay} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">End</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" disabled={allDay} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="rounded" />
            All Day
          </label>
          <div>
            <Label className="text-xs font-medium text-slate-600">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ title, calendar_id: calendarId, start_time: allDay ? moment(startTime).startOf('day').toISOString() : new Date(startTime).toISOString(), end_time: allDay ? moment(startTime).endOf('day').toISOString() : new Date(endTime).toISOString(), location: location || undefined, description: description || undefined, all_day: allDay })} disabled={!title.trim()} className="bg-indigo-600 hover:bg-indigo-700">Create Event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}