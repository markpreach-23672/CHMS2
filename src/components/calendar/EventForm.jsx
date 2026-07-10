import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import moment from 'moment';

export default function EventForm({ calendars, selectedDate, events, getCalendar, locations, tags, editingEvent, onSave, onClose }) {
  const ev = editingEvent;
  const [title, setTitle] = useState(ev?.title || '');
  const [calendarId, setCalendarId] = useState(ev?.calendar_id || calendars[0]?.id || '');
  const [startTime, setStartTime] = useState(ev ? moment(ev.start_time).format('YYYY-MM-DDTHH:mm') : (selectedDate ? selectedDate.format('YYYY-MM-DDTHH:mm') : moment().format('YYYY-MM-DDTHH:mm')));
  const [endTime, setEndTime] = useState(ev?.end_time ? moment(ev.end_time).format('YYYY-MM-DDTHH:mm') : (selectedDate ? selectedDate.format('YYYY-MM-DD') + 'T12:00' : moment().format('YYYY-MM-DD') + 'T12:00'));
  const [location, setLocation] = useState(ev?.location || '');
  const [description, setDescription] = useState(ev?.description || '');
  const [allDay, setAllDay] = useState(Boolean(ev?.all_day));
  const [isRecurring, setIsRecurring] = useState(Boolean(ev?.is_recurring));
  const [recFreq, setRecFreq] = useState(ev?.recurrence_frequency || 'weekly');
  const [recInterval, setRecInterval] = useState(ev?.recurrence_interval || 1);
  const [recEndDate, setRecEndDate] = useState(ev?.recurrence_end_date || '');
  const [recDays, setRecDays] = useState(() => {
    if (ev?.recurrence_days) return ev.recurrence_days;
    const dow = selectedDate ? selectedDate.day() : moment().day();
    return [dow];
  });
  const [monthlyMode, setMonthlyMode] = useState(ev?.recurrence_week ? 'weekday' : 'date');
  const [recWeek, setRecWeek] = useState(ev?.recurrence_week || (selectedDate ? Math.ceil(selectedDate.date() / 7) : 1));
  const [recWeekday, setRecWeekday] = useState(ev?.recurrence_weekday ?? (selectedDate ? selectedDate.day() : 0));
  const [selectedTagIds, setSelectedTagIds] = useState(ev?.tag_ids || []);

  const conflicts = useMemo(() => {
    if (!location.trim()) return [];
    const newStart = allDay ? moment(startTime).startOf('day') : moment(startTime);
    const newEnd = allDay ? moment(startTime).endOf('day') : moment(endTime);
    if (!newStart.isValid() || !newEnd.isValid()) return [];
    return events.filter((e) => {
      if (ev && e.id === ev.id) return false;
      if (!e.location || e.location.trim().toLowerCase() !== location.trim().toLowerCase()) return false;
      const eStart = moment(e.start_time);
      const eEnd = e.end_time ? moment(e.end_time) : moment(e.start_time).add(1, 'hour');
      if (e.all_day || allDay) {
        return eStart.isSameOrBefore(newEnd, 'day') && eEnd.isSameOrAfter(newStart, 'day');
      }
      return newStart.isBefore(eEnd) && newEnd.isAfter(eStart);
    });
  }, [location, startTime, endTime, allDay, events]);

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);
  };

  const handleSave = () => {
    onSave({
      title,
      calendar_id: calendarId,
      start_time: allDay ? moment(startTime).startOf('day').toISOString() : new Date(startTime).toISOString(),
      end_time: allDay ? moment(startTime).endOf('day').toISOString() : new Date(endTime).toISOString(),
      location: location || undefined,
      description: description || undefined,
      all_day: allDay,
      tag_ids: selectedTagIds,
      is_recurring: isRecurring,
      recurrence_frequency: isRecurring ? recFreq : undefined,
      recurrence_interval: isRecurring ? recInterval : undefined,
      recurrence_days: isRecurring && recFreq === 'weekly' ? recDays : undefined,
      recurrence_week: isRecurring && recFreq === 'monthly' && monthlyMode === 'weekday' ? recWeek : undefined,
      recurrence_weekday: isRecurring && recFreq === 'monthly' && monthlyMode === 'weekday' ? recWeekday : undefined,
      recurrence_end_date: isRecurring && recEndDate ? recEndDate : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{ev ? 'Edit Event' : 'New Event'}</DialogTitle></DialogHeader>
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
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="rounded" />
            Recurring event
          </label>
          {isRecurring && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600">Repeats</Label>
                  <select value={recFreq} onChange={(e) => setRecFreq(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">Every</Label>
                  <select value={recInterval} onChange={(e) => setRecInterval(parseInt(e.target.value))} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                    {recFreq === 'weekly'
                      ? [1,2,3,4].map(n => <option key={n} value={n}>{n} week{n > 1 ? 's' : ''}</option>)
                      : [1,2,3,4,6].map(n => <option key={n} value={n}>{n} month{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              {recFreq === 'weekly' && (
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">On these days</Label>
                  <div className="flex gap-1.5">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                      <button key={i} type="button"
                        onClick={() => setRecDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                        className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${recDays.includes(i) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-input hover:bg-slate-50'}`}
                      >{d}</button>
                    ))}
                  </div>
                </div>
              )}
              {recFreq === 'monthly' && (
                <div className="space-y-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input type="radio" checked={monthlyMode === 'date'} onChange={() => setMonthlyMode('date')} />
                      On day {moment(startTime).date()} of the month
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input type="radio" checked={monthlyMode === 'weekday'} onChange={() => setMonthlyMode('weekday')} />
                      On a specific weekday (e.g. "first Sunday")
                    </label>
                  </div>
                  {monthlyMode === 'weekday' && (
                    <div className="flex gap-2">
                      <select value={recWeek} onChange={(e) => setRecWeek(parseInt(e.target.value))} className="h-9 px-2 rounded-md border border-input bg-transparent text-sm flex-1">
                        <option value={1}>First</option>
                        <option value={2}>Second</option>
                        <option value={3}>Third</option>
                        <option value={4}>Fourth</option>
                        <option value={-1}>Last</option>
                      </select>
                      <select value={recWeekday} onChange={(e) => setRecWeekday(parseInt(e.target.value))} className="h-9 px-2 rounded-md border border-input bg-transparent text-sm flex-1">
                        {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label className="text-xs font-medium text-slate-600">Ends (optional)</Label>
                <Input type="date" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)} className="mt-1" />
                <p className="text-xs text-slate-400 mt-1">Leave blank to repeat indefinitely.</p>
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs font-medium text-slate-600">Location</Label>
            {locations.length > 0 ? (
              <select value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="">Select a location...</option>
                {locations.filter((l) => l.type === 'site').map((site) => (
                  <optgroup key={site.id} label={site.name}>
                    <option value={site.name}>{site.name} (whole site)</option>
                    {locations.filter((r) => r.type === 'room' && r.parent_id === site.id).map((room) => (
                      <option key={room.id} value={room.name}>{room.name}</option>
                    ))}
                  </optgroup>
                ))}
                {locations.filter((r) => r.type === 'room' && (!r.parent_id || !locations.find((s) => s.id === r.parent_id && s.type === 'site'))).length > 0 && (
                  <optgroup label="Other Rooms">
                    {locations.filter((r) => r.type === 'room' && (!r.parent_id || !locations.find((s) => s.id === r.parent_id && s.type === 'site'))).map((room) => (
                      <option key={room.id} value={room.name}>{room.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" placeholder="Type a location or set up locations in Settings" />
            )}
          </div>
          {tags.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Event Tags</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map((tag) => (
                  <button key={tag.id} onClick={() => toggleTag(tag.id)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${selectedTagIds.includes(tag.id) ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color || '#6366f1' } : {}}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>

          {conflicts.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span className="text-sm font-semibold">Location Conflict Detected ({conflicts.length})</span>
              </div>
              <p className="text-xs text-amber-700">"{location}" is already booked during this time:</p>
              <div className="space-y-1.5">
                {conflicts.map((c) => {
                  const cal = getCalendar(c.calendar_id);
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-xs bg-white rounded-md p-2 border border-amber-200">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cal?.color || '#3b82f6' }} />
                      <span className="font-medium text-slate-900 truncate">{c.title}</span>
                      <span className="text-slate-500 whitespace-nowrap">
                        {moment(c.start_time).format('MMM D, h:mm A')}{c.end_time ? ` – ${moment(c.end_time).format('h:mm A')}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || (isRecurring && recFreq === 'weekly' && recDays.length === 0)} className={conflicts.length > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}>
            {conflicts.length > 0 ? (ev ? 'Save Anyway' : 'Create Anyway') : (ev ? 'Save Changes' : 'Create Event')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}