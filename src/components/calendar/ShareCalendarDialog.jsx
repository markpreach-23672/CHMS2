import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Copy, Download, Loader2, Globe, Code } from 'lucide-react';

export default function ShareCalendarDialog({ calendar, onClose }) {
  const [isPublic, setIsPublic] = useState(calendar.is_public || false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  const [downloading, setDownloading] = useState(false);

  const widgetUrl = `${window.location.origin}/calendar/public/${calendar.id}`;

  const togglePublic = async () => {
    setSaving(true);
    try {
      await base44.entities.DepartmentCalendar.update(calendar.id, { is_public: !isPublic });
      setIsPublic(!isPublic);
    } catch (err) {
      alert('Failed to update calendar visibility.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDownloadICS = async () => {
    setDownloading(true);
    try {
      const res = await base44.functions.invoke('generateICS', { calendar_id: calendar.id });
      const icsContent = res.data?.ics || (typeof res.data === 'string' ? res.data : '');
      if (!icsContent) { alert('Failed to generate ICS file.'); return; }
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(calendar.name || 'calendar').replace(/\s+/g, '_')}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate ICS file.');
    } finally {
      setDownloading(false);
    }
  };

  const embedCode = `<iframe src="${widgetUrl}" width="100%" height="600" frameborder="0" style="border:none; border-radius:8px;"></iframe>`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Calendar — {calendar.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Public toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Globe size={14} /> Public Calendar</Label>
              <p className="text-xs text-slate-400">Allow anyone with the link to view events</p>
            </div>
            <button onClick={togglePublic} disabled={saving} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isPublic ? 'bg-indigo-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {isPublic ? (
            <>
              {/* Widget URL */}
              <div>
                <Label className="text-xs font-medium text-slate-600">Public Calendar URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={widgetUrl} readOnly className="text-xs" />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(widgetUrl, 'url')}><Copy size={14} /></Button>
                </div>
                {copied === 'url' && <p className="text-xs text-emerald-500 mt-0.5">Copied!</p>}
              </div>

              {/* Embed code */}
              <div>
                <Label className="text-xs font-medium text-slate-600 flex items-center gap-1"><Code size={12} /> Embed Code</Label>
                <textarea readOnly value={embedCode} className="mt-1 w-full h-20 px-3 py-2 text-xs font-mono rounded-md border border-input bg-transparent resize-none" />
                <Button size="sm" variant="outline" className="mt-1" onClick={() => copyToClipboard(embedCode, 'embed')}>
                  <Copy size={12} className="mr-1" /> Copy Embed Code
                </Button>
                {copied === 'embed' && <p className="text-xs text-emerald-500 mt-0.5">Copied!</p>}
              </div>

              {/* QR Code */}
              <div className="text-center">
                <Label className="text-xs font-medium text-slate-600 mb-2 block">QR Code</Label>
                <div className="inline-block p-3 bg-white border border-slate-200 rounded-lg">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(widgetUrl)}`} alt="QR Code" width="120" height="120" />
                </div>
                <p className="text-xs text-slate-400 mt-1">Scan to open the calendar on any device</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Enable public access to share this calendar via link, embed, or QR code.</p>
          )}

          {/* ICS Download */}
          <div className="border-t border-slate-100 pt-4">
            <Label className="text-xs font-medium text-slate-600">ICS Calendar File</Label>
            <p className="text-xs text-slate-400 mb-2">Download to import into Google Calendar, Apple Calendar, or Outlook.</p>
            <Button variant="outline" size="sm" onClick={handleDownloadICS} disabled={downloading}>
              {downloading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Download size={14} className="mr-1" />}
              {downloading ? 'Generating...' : 'Download .ics File'}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}