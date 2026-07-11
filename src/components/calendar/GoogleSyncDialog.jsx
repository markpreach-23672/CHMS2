import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCw, CheckCircle, Loader2, ExternalLink, Link2 } from 'lucide-react';

const GOOGLE_CONNECTOR_ID = '6a52279de7bab96b1a1891ab';

export default function GoogleSyncDialog({ calendar, onSyncComplete, onClose }) {
  const [googleCalId, setGoogleCalId] = useState(calendar.google_calendar_id || '');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [connected, setConnected] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const checkConnection = async () => {
    try {
      const res = await base44.functions.invoke('googleConnectionStatus', {});
      setConnected(!!res.data.connected);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => { checkConnection(); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await base44.connectors.connectAppUser(GOOGLE_CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setConnecting(false);
          checkConnection();
        }
      }, 500);
    } catch {
      setConnecting(false);
      alert('Could not start Google connection.');
    }
  };

  const handleSave = async () => {
    if (!googleCalId.trim()) return;
    setSaving(true);
    try {
      await base44.entities.DepartmentCalendar.update(calendar.id, { google_calendar_id: googleCalId.trim() });
      onSyncComplete();
      onClose();
    } catch (err) {
      alert('Failed to save Google Calendar ID.');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!googleCalId.trim()) { alert('Please enter a Google Calendar ID first.'); return; }
    setSyncing(true);
    setSyncResult(null);
    try {
      await base44.entities.DepartmentCalendar.update(calendar.id, { google_calendar_id: googleCalId.trim() });
      const res = await base44.functions.invoke('bulkSyncCalendarToGoogle', { calendar_id: calendar.id });
      setSyncResult(res.data);
      onSyncComplete();
    } catch (err) {
      setSyncResult({ error: 'Sync failed. Make sure Google Calendar is connected in Settings.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar sync? Existing Google events will remain on Google.')) return;
    setSaving(true);
    try {
      await base44.entities.DepartmentCalendar.update(calendar.id, { google_calendar_id: undefined });
      onSyncComplete();
      onClose();
    } catch (err) {
      alert('Failed to disconnect.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw size={18} className="text-indigo-500" />
            Google Calendar Sync
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Calendar: <span className="font-medium">{calendar.name}</span></p>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Link2 size={16} className={connected ? 'text-emerald-600' : 'text-slate-400'} />
              <span className="text-sm text-slate-700">
                {connected === null ? 'Checking Google connection…' : connected ? 'Your Google account is connected' : 'Google account not connected'}
              </span>
            </div>
            {connected === false && (
              <Button size="sm" variant="outline" onClick={handleConnect} disabled={connecting}>
                {connecting ? <Loader2 size={14} className="animate-spin" /> : 'Connect Google'}
              </Button>
            )}
          </div>

          {calendar.google_calendar_id && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
              <span className="text-xs text-emerald-700">Sync is active. New and updated events automatically push to Google Calendar.</span>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-slate-600">Google Calendar ID</Label>
            <Input value={googleCalId} onChange={(e) => setGoogleCalId(e.target.value)} className="mt-1" placeholder="your-email@gmail.com or calendar ID" />
            <p className="text-xs text-slate-400 mt-1">
              Find it in <a href="https://calendar.google.com/calendar/settings" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">Google Calendar settings <ExternalLink size={10} /></a> → Integrate calendar → Calendar ID. Use your Gmail address for your primary calendar.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">
              <strong>One-way push sync:</strong> Events created here are pushed to Google. Changes made directly in Google Calendar will not sync back.
            </p>
          </div>

          {syncResult && (
            <div className={`p-3 rounded-lg text-sm ${syncResult.error ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {syncResult.error ? syncResult.error : `Synced ${syncResult.synced} of ${syncResult.total} events (${syncResult.created} new, ${syncResult.updated} updated${syncResult.errors > 0 ? `, ${syncResult.errors} errors` : ''}).`}
            </div>
          )}
        </div>
        <DialogFooter>
          {calendar.google_calendar_id && (
            <Button variant="outline" onClick={handleDisconnect} disabled={saving}>Disconnect</Button>
          )}
          <Button variant="outline" onClick={handleSync} disabled={syncing || !googleCalId.trim()}>
            {syncing ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
            {syncing ? 'Syncing...' : 'Sync All Events'}
          </Button>
          <Button onClick={handleSave} disabled={saving || !googleCalId.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}