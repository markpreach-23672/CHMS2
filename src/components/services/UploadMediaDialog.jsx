import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UploadCloud } from 'lucide-react';
import { FILE_TYPES } from '@/components/services/mediaTypes';

export default function UploadMediaDialog({ churchId, songs, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [fileType, setFileType] = useState('chord_chart');
  const [songId, setSongId] = useState('none');
  const [key, setKey] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async () => {
    if (!file || !name.trim()) { setError('Please choose a file and give it a name.'); return; }
    setSaving(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const record = await base44.entities.MediaFile.create({
        church_id: churchId || undefined,
        name: name.trim(),
        file_type: fileType,
        file_url,
        song_id: songId === 'none' ? undefined : songId,
        key: key || undefined,
        notes: notes || undefined,
      });
      onUploaded(record);
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>File</Label>
            <label className="mt-1 flex items-center gap-3 border border-dashed rounded-md p-3 cursor-pointer hover:bg-slate-50">
              <UploadCloud className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-600 truncate">{file ? file.name : 'Choose a PDF, image, or audio file...'}</span>
              <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.txt,.mp3,.wav,.m4a,.ogg" onChange={handleFileChange} />
            </label>
          </div>
          <div>
            <Label htmlFor="media-name">Name</Label>
            <Input id="media-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Amazing Grace - Chord Chart" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="media-key">Key (optional)</Label>
              <Input id="media-key" value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. G" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Link to Song (optional)</Label>
            <Select value={songId} onValueChange={setSongId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No song</SelectItem>
                {songs.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="media-notes">Notes (optional)</Label>
            <Textarea id="media-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {saving ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}