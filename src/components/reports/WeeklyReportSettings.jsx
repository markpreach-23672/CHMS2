import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Send } from 'lucide-react';

export default function WeeklyReportSettings({ tags, people, church }) {
  const [tagId, setTagId] = useState(church?.guest_report_tag_id || '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');

  const selectedTag = tags.find((t) => t.id === tagId);
  const recipientCount = tagId
    ? (people || []).filter((p) => (p.tag_ids || []).includes(tagId) && p.email).length
    : 0;

  const persist = async () => {
    if (church?.id) {
      await base44.entities.Church.update(church.id, { guest_report_tag_id: tagId || null });
    } else {
      await base44.entities.Church.create({ name: 'Our Church', guest_report_tag_id: tagId || null });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      await persist();
      setSavedMsg('Saved.');
    } catch (e) {
      setSavedMsg('Failed: ' + (e.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    setSendMsg('');
    try {
      await persist();
      const res = await base44.functions.invoke('weeklyGuestFollowupReport', {});
      const d = res.data || res;
      setSendMsg(d.success ? `Sent to ${d.sent} recipient${d.sent === 1 ? '' : 's'}.` : (d.message || d.error || 'Failed to send.'));
    } catch (e) {
      setSendMsg('Failed: ' + (e.message || 'error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
          <Clock size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Weekly Guest Follow-up Report</h2>
          <p className="text-xs text-slate-400">Choose the team tag that receives the emailed report each Monday at 9am.</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Recipient team tag</label>
          <Select value={tagId || 'none'} onValueChange={(v) => { setTagId(v === 'none' ? '' : v); setSavedMsg(''); }}>
            <SelectTrigger><SelectValue placeholder="Select a tag…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No team (report disabled)</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tagId && (
            <p className="text-xs text-slate-400 mt-1.5">
              {recipientCount} recipient{recipientCount === 1 ? '' : 's'} with the &ldquo;{selectedTag?.name}&rdquo; tag will receive the report.
            </p>
          )}
        </div>
        {savedMsg && <p className="text-xs text-emerald-600">{savedMsg}</p>}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save team'}</Button>
          <Button variant="outline" onClick={handleSendNow} disabled={sending || !tagId}>
            <Send size={14} /> {sending ? 'Sending…' : 'Send now'}
          </Button>
        </div>
        {sendMsg && <p className="text-xs text-slate-500">{sendMsg}</p>}
      </div>
    </div>
  );
}