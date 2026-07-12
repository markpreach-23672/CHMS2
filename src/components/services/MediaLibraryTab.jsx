import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Library, Plus, Search } from 'lucide-react';
import UploadMediaDialog from '@/components/services/UploadMediaDialog';
import MediaFileCard from '@/components/services/MediaFileCard';
import { FILE_TYPES } from '@/components/services/mediaTypes';

export default function MediaLibraryTab({ churchId }) {
  const [files, setFiles] = useState([]);
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [songFilter, setSongFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [f, s] = await Promise.all([
      base44.entities.MediaFile.list('-created_date', 500),
      base44.entities.Song.list('title', 500),
    ]);
    setFiles(f);
    setSongs(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const songMap = Object.fromEntries(songs.map(s => [s.id, s]));

  const filtered = files.filter(f => {
    if (typeFilter !== 'all' && f.file_type !== typeFilter) return false;
    if (songFilter !== 'all' && f.song_id !== songFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const songTitle = songMap[f.song_id]?.title || '';
      if (!f.name?.toLowerCase().includes(q) && !songTitle.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    await base44.entities.MediaFile.delete(file.id);
    setFiles(prev => prev.filter(x => x.id !== file.id));
  };

  if (loading) return <div className="text-sm text-slate-400 py-8">Loading media library...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input placeholder="Search files or songs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {FILE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={songFilter} onValueChange={setSongFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All songs</SelectItem>
            {songs.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowUpload(true)} className="sm:ml-auto">
          <Plus className="w-4 h-4 mr-1" /> Upload File
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <Library className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No files yet</p>
          <p className="text-slate-400 text-sm mt-1">Upload chord charts, PDF scores, and backing tracks for your team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(f => (
            <MediaFileCard key={f.id} file={f} song={songMap[f.song_id]} onDelete={() => handleDelete(f)} />
          ))}
        </div>
      )}

      {showUpload && (
        <UploadMediaDialog
          churchId={churchId}
          songs={songs}
          onClose={() => setShowUpload(false)}
          onUploaded={(newFile) => { setFiles(prev => [newFile, ...prev]); setShowUpload(false); }}
        />
      )}
    </div>
  );
}