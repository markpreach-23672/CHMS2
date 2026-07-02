import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import AgendaView from '@/components/calendar/AgendaView';
import EventForm from '@/components/calendar/EventForm';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [locations, setLocations] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(moment());
  const [viewMode, setViewMode] = useState('month');
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [visibleCalendars, setVisibleCalendars] = useState(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [e, c, locs, t] = await Promise.all([
        base44.entities.CalendarEvent.list(),
        base44.entities.DepartmentCalendar.list(),
        base44.entities.Location.list(),
        base44.entities.Tag.list(),
      ]);
      setEvents(e);
      setCalendars(c);
      setLocations(locs);
      setTags(t);
      setVisibleCalendars(new Set(c.map((cal) => cal.id)));
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getCalendar = (calId) => calendars.find((c) => c.id === calId);
  const filteredEvents = events.filter((e) => visibleCalendars.has(e.calendar_id));

  const isRecurringOnDate = (event, date) => {
    if (!event.is_recurring || !event.recurrence_frequency) return false;
    const start = moment(event.start_time);
    const checkDate = moment(date);
    if (checkDate.isBefore(start, 'day')) return false;
    if (event.recurrence_end_date && checkDate.isAfter(moment(event.recurrence_end_date), 'day')) return false;
    const interval = event.recurrence_interval || 1;

    if (event.recurrence_frequency === 'weekly') {
      const days = event.recurrence_days || [];
      if (!days.includes(checkDate.day())) return false;
      const startWeek = moment(start).startOf('week');
      const checkWeek = moment(checkDate).startOf('week');
      const weekDiff = checkWeek.diff(startWeek, 'weeks');
      return weekDiff >= 0 && weekDiff % interval === 0;
    }

    if (event.recurrence_frequency === 'monthly') {
      const monthDiff = (checkDate.year() - start.year()) * 12 + (checkDate.month() - start.month());
      if (monthDiff < 0 || monthDiff % interval !== 0) return false;

      // Nth weekday of month pattern (e.g., "first Sunday")
      if (event.recurrence_week && event.recurrence_weekday !== undefined && event.recurrence_weekday !== null) {
        if (checkDate.day() !== event.recurrence_weekday) return false;
        if (event.recurrence_week === -1) {
          const daysInMonth = moment(checkDate).endOf('month').date();
          return checkDate.date() > daysInMonth - 7;
        }
        return Math.ceil(checkDate.date() / 7) === event.recurrence_week;
      }

      // Day of month pattern (default)
      return checkDate.date() === start.date();
    }

    return false;
  };

  const getEventsForDay = (date) => {
    return filteredEvents.filter((e) => {
      if (!e.start_time) return false;
      if (e.is_recurring && e.recurrence_frequency) return isRecurringOnDate(e, date);
      return moment(e.start_time).isSame(date, 'day');
    });
  };

  const handleDeleteEvent = async (event) => {
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

  const handlePrev = () => {
    if (viewMode === 'month' || viewMode === 'agenda') setCurrentDate(moment(currentDate).subtract(1, 'month'));
    else if (viewMode === 'week') setCurrentDate(moment(currentDate).subtract(7, 'days'));
    else setCurrentDate(moment(currentDate).subtract(1, 'day'));
  };

  const handleNext = () => {
    if (viewMode === 'month' || viewMode === 'agenda') setCurrentDate(moment(currentDate).add(1, 'month'));
    else if (viewMode === 'week') setCurrentDate(moment(currentDate).add(7, 'days'));
    else setCurrentDate(moment(currentDate).add(1, 'day'));
  };

  const headerTitle = () => {
    if (viewMode === 'month') return currentDate.format('MMMM YYYY');
    if (viewMode === 'week') {
      const start = moment(currentDate).startOf('week');
      const end = moment(start).add(6, 'days');
      if (start.month() === end.month()) return `${start.format('MMM D')} – ${end.format('D, YYYY')}`;
      return `${start.format('MMM D')} – ${end.format('MMM D, YYYY')}`;
    }
    if (viewMode === 'day') return currentDate.format('dddd, MMM D, YYYY');
    return 'Upcoming Events';
  };

  const onSelectDate = (date) => { setSelectedDate(date); setShowEventForm(true); };

  const viewProps = { currentDate, getEventsForDay, getCalendar, onSelectDate, onDeleteEvent: handleDeleteEvent };

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
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} className="text-slate-500" /></button>
              <h2 className="text-lg font-semibold text-slate-900 min-w-[200px] text-center">{headerTitle()}</h2>
              <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={18} className="text-slate-500" /></button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(moment())} className="ml-1">Today</Button>
            </div>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {['month', 'week', 'day', 'agenda'].map((v) => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${viewMode === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-400">Loading...</div>
          ) : viewMode === 'month' ? (
            <MonthView {...viewProps} />
          ) : viewMode === 'week' ? (
            <WeekView {...viewProps} />
          ) : viewMode === 'day' ? (
            <DayView {...viewProps} />
          ) : (
            <AgendaView {...viewProps} />
          )}
        </div>

        <div className="w-56 flex-shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Departments</h3>
          <div className="space-y-1.5">
            {calendars.map((cal) => (
              <label key={cal.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={visibleCalendars.has(cal.id)} onChange={() => toggleCalendar(cal.id)} className="rounded" />
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                <span className="text-sm text-slate-700">{cal.name}</span>
              </label>
            ))}
            {calendars.length === 0 && !loading && <p className="text-xs text-slate-400">No calendars yet.</p>}
          </div>
        </div>
      </div>

      {showEventForm && (
        <EventForm
          calendars={calendars}
          selectedDate={selectedDate}
          events={events}
          getCalendar={getCalendar}
          locations={locations}
          tags={tags}
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