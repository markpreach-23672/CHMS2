import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Folder, FolderPlus, Check, ArrowLeft } from 'lucide-react';

const TAG_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

export default function TagPicker({ person, tags, folders, onToggleTag, onTagCreated, onFolderCreated, onClose }) {
  const [mode, setMode] = useState('list');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [newTagFolderId, setNewTagFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const created = await base44.entities.Tag.create({
        name: newTagName,
        color: newTagColor,
        folder_id: newTagFolderId || undefined,
      });
      onTagCreated(created);
      onToggleTag(created.id);
      setNewTagName('');
      setNewTagColor(TAG_COLORS[0]);
      setNewTagFolderId('');
      setMode('list');
    } catch (err) {
      alert('Failed to create tag.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const created = await base44.entities.TagFolder.create({ name: newFolderName });
      onFolderCreated(created);
      setNewFolderName('');
      setMode('list');
    } catch (err) {
      alert('Failed to create folder.');
    } finally {
      setCreating(false);
    }
  };

  const folderGroups = folders.map(f => ({ folder: f, tags: tags.filter(t => t.folder_id === f.id) }));
  const unfiledTags = tags.filter(t => !t.folder_id);

  const renderTagButton = (tag) => {
    const has = (person.tag_ids || []).includes(tag.id);
    return (
      <button
        key={tag.id}
        onClick={() => onToggleTag(tag.id)}
        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
      >
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
        <span className="text-sm font-medium text-slate-700 flex-1">{tag.name}</span>
        {has && <Check size={14} className="text-emerald-600" />}
      </button>
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode !== 'list' && (
              <button onClick={() => setMode('list')} className="p-1 rounded hover:bg-slate-100">
                <ArrowLeft size={16} />
              </button>
            )}
            {mode === 'list' ? 'Manage Tags' : mode === 'createTag' ? 'New Tag' : 'New Folder'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'list' && (
          <>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {folderGroups.map(({ folder, tags: fTags }) => (
                <div key={folder.id}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2.5 mb-1 flex items-center gap-1.5">
                    <Folder size={11} /> {folder.name}
                  </p>
                  <div className="space-y-0.5">{fTags.map(renderTagButton)}</div>
                </div>
              ))}
              {unfiledTags.length > 0 && (
                <div>
                  {folders.length > 0 && (
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2.5 mb-1">Unfiled</p>
                  )}
                  <div className="space-y-0.5">{unfiledTags.map(renderTagButton)}</div>
                </div>
              )}
              {tags.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No tags yet. Create one below.</p>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setMode('createTag')}>
                <Plus size={14} className="mr-1" /> New Tag
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setMode('createFolder')}>
                <FolderPlus size={14} className="mr-1" /> New Folder
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
            </DialogFooter>
          </>
        )}

        {mode === 'createTag' && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Tag Name *</Label>
              <Input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="e.g. Volunteer" className="mt-1" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateTag()} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Color</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {TAG_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setNewTagColor(c)} className={`w-7 h-7 rounded-full transition-all ${newTagColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Folder</Label>
              <Select value={newTagFolderId} onValueChange={setNewTagFolderId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unfiled" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unfiled</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTag} disabled={!newTagName.trim() || creating} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {creating ? 'Creating...' : 'Create & Assign'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === 'createFolder' && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Folder Name *</Label>
              <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. Ministry Teams" className="mt-1" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
            </div>
            <p className="text-xs text-slate-400">Folders help organize related tags into groups.</p>
            <DialogFooter>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creating} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {creating ? 'Creating...' : 'Create Folder'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}