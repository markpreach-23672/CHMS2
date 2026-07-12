import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function CareGroupEventDialog({ open, onOpenChange, group, churchId, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', date: '', start: '10:00', end: '11:00' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      await base44.entities.CalendarEvent.create({
        church_id: churchId,
        calendar_id: group.calendar_id,
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        start_time: `${form.date}T${form.start}:00`,
        end_time: `${form.date}T${form.end}:00`,
      });
      setForm({ title: '', description: '', location: '', date: '', start: '10:00', end: '11:00' });
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Event — {group?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Event Title *</Label>
            <Input className="mt-1" value={form.title} onChange={set('title')} placeholder="e.g. Hospital visit rotation" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date *</Label>
              <Input className="mt-1" type="date" value={form.date} onChange={set('date')} />
            </div>
            <div>
              <Label>Start</Label>
              <Input className="mt-1" type="time" value={form.start} onChange={set('start')} />
            </div>
            <div>
              <Label>End</Label>
              <Input className="mt-1" type="time" value={form.end} onChange={set('end')} />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input className="mt-1" value={form.location} onChange={set('location')} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={form.description} onChange={set('description')} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 size={14} className="animate-spin" />} Add Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}