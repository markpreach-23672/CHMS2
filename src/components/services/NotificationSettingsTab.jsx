import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Loader2, CheckCircle } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, h) => {
  const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
  return { value: `${String(h).padStart(2, '0')}:00`, label };
});

export default function NotificationSettingsTab({ churchId }) {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.NotificationSetting.list()
      .then((list) => {
        const existing = list.find((s) => s.church_id === churchId) || list[0];
        setSetting(existing || { church_id: churchId, reminders_enabled: true, reminder_days_before: 3, reminder_time: '09:00' });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [churchId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (setting.id) {
        await base44.entities.NotificationSetting.update(setting.id, {
          reminders_enabled: setting.reminders_enabled,
          reminder_days_before: setting.reminder_days_before,
          reminder_time: setting.reminder_time,
        });
      } else {
        const created = await base44.entities.NotificationSetting.create(setting);
        setSetting(created);
      }
      setSaved(true);
    } catch (err) {
      alert('Failed to save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading settings…</div>;

  return (
    <div className="max-w-xl">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex items-start gap-3">
          <Bell size={20} className="text-indigo-500 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900">Team Service Reminders</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Automatically email scheduled team members before each service with the schedule and song links.
              (Assignment emails are also sent instantly whenever someone is added to a service role.)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Send automatic reminders</Label>
          <Switch
            checked={setting.reminders_enabled !== false}
            onCheckedChange={(v) => setSetting({ ...setting, reminders_enabled: v })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Days before the service</Label>
            <Select
              value={String(setting.reminder_days_before ?? 3)}
              onValueChange={(v) => setSetting({ ...setting, reminder_days_before: Number(v) })}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} day{d > 1 ? 's' : ''} before</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Time of day</Label>
            <Select
              value={setting.reminder_time || '09:00'}
              onValueChange={(v) => setSetting({ ...setting, reminder_time: v })}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {HOURS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <CheckCircle size={14} /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}