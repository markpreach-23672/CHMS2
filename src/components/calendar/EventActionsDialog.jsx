import React from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';

export default function EventActionsDialog({ event, getCalendar, onEdit, onDelete, onClose }) {
  if (!event) return null;
  const cal = getCalendar(event.calendar_id);
  const start = moment(event.start_time);
  const end = event.end_time ? moment(event.end_time) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cal && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />}
            <span className="truncate">{event.title}</span>
            {event.is_recurring && <span className="text-xs font-normal text-slate-400">↻ recurring</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-slate-600">
            {event.all_day
              ? `All day · ${start.format('ddd, MMM D, YYYY')}`
              : `${start.format('ddd, MMM D, YYYY · h:mm A')}${end ? ` – ${end.format('h:mm A')}` : ''}`}
          </div>
          {event.location && <div className="text-slate-600">📍 {event.location}</div>}
          {cal && <div className="text-slate-500 text-xs">Calendar: {cal.name}</div>}
          {event.description && (
            <div className="text-slate-600 whitespace-pre-wrap border-t border-slate-100 pt-2 mt-2">{event.description}</div>
          )}
        </div>
        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}><Pencil size={14} className="mr-1.5" />Edit</Button>
            <Button variant="destructive" onClick={() => {
              if (confirm(event.is_recurring ? `Delete "${event.title}"? This will delete the entire recurring series.` : `Delete "${event.title}"?`)) {
                onDelete(event);
                onClose();
              }
            }}><Trash2 size={14} className="mr-1.5" />Delete</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}