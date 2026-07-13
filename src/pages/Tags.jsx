import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Folder, Plus, Trash2, Tag as TagIcon, MoreHorizontal, Pencil, MessageSquare, Mail, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TextMessageDialog from '@/components/people/TextMessageDialog';
import EmailMessageDialog from '@/components/people/EmailMessageDialog';
import { downloadPeopleCsv } from '@/utils/csvExport';
import MemberPicker from '@/components/caregroups/MemberPicker';
import { getMyChurchId } from '@/lib/churchContext';

const TAG_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [folders, setFolders] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTagForm, setShowTagForm] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [editFolder, setEditFolder] = useState(null);
  const [editTag, setEditTag] = useState(null);
  const [textTag, setTextTag] = useState(null);
  const [emailTag, setEmailTag] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f, p] = await Promise.all([
        base44.entities.Tag.list(),
        base44.entities.TagFolder.list(),
        base44.entities.Person.list(),
      ]);
      setTags(t);
      setFolders(f);
      setPeople(p);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getTagCount = (tagId) => people.filter((p) => (p.tag_ids || []).includes(tagId)).length;

  const getTaggedPeople = (tagId) => people.filter((p) => (p.tag_ids || []).includes(tagId));

  const handleDownloadTag = (tag) => {
    const tagged = getTaggedPeople(tag.id);
    const safeName = tag.name.replace(/\s+/g, '-').toLowerCase();
    downloadPeopleCsv(tagged, `tag-${safeName}.csv`);
  };

  const unfiledTags = tags.filter((t) => !t.folder_id);
  const folderTags = (folderId) => tags.filter((t) => t.folder_id === folderId);

  const handleDeleteTag = async (tag) => {
    if (!confirm(`Delete tag "${tag.name}"? This will remove it from all people.`)) return;
    try {
      // Remove tag from all people
      const taggedPeople = people.filter((p) => (p.tag_ids || []).includes(tag.id));
      if (taggedPeople.length > 0) {
        await base44.entities.Person.bulkUpdate(
          taggedPeople.map((p) => ({
            id: p.id,
            tag_ids: (p.tag_ids || []).filter((t) => t !== tag.id),
          }))
        );
      }
      await base44.entities.Tag.delete(tag.id);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } catch (err) {
      alert('Failed to delete tag.');
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Delete folder "${folder.name}"? Tags inside will become unfiled.`)) return;
    try {
      const folderTagIds = folderTags(folder.id).map((t) => t.id);
      if (folderTagIds.length > 0) {
        await base44.entities.Tag.bulkUpdate(
          folderTagIds.map((id) => ({ id, folder_id: '' }))
        );
      }
      await base44.entities.TagFolder.delete(folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setTags((prev) => prev.map((t) => (t.folder_id === folder.id ? { ...t, folder_id: '' } : t)));
    } catch (err) {
      alert('Failed to delete folder.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tags</h1>
          <p className="text-slate-500 text-sm mt-1">Organize people into groups with tags and folders.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFolderForm(true)}>
            <Folder size={15} className="mr-1.5" />
            New Folder
          </Button>
          <Button onClick={() => { setEditTag(null); setShowTagForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} className="mr-1.5" />
            New Tag
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">Loading tags...</div>
      ) : (
        <div className="space-y-6">
          {/* Folders */}
          {folders.map((folder) => (
            <div key={folder.id} className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Folder size={16} className="text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-900">{folder.name}</h2>
                  <span className="text-xs text-slate-400">{folderTags(folder.id).length} tags</span>
                  {folder.leader_person_id && (() => {
                    const lead = people.find((p) => p.id === folder.leader_person_id);
                    return lead ? (
                      <span className="text-xs text-indigo-500 font-medium">Led by {lead.first_name} {lead.last_name}</span>
                    ) : null;
                  })()}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100">
                    <MoreHorizontal size={15} className="text-slate-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditFolder(folder); setShowFolderForm(true); }}>
                      <Pencil size={13} className="mr-2" /> Edit Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteFolder(folder)}>
                      Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {folderTags(folder.id).length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No tags in this folder.</p>
                ) : (
                  folderTags(folder.id).map((tag) => (
                    <TagChip
                      key={tag.id}
                      tag={tag}
                      count={getTagCount(tag.id)}
                      onEdit={() => { setEditTag(tag); setShowTagForm(true); }}
                      onDelete={() => handleDeleteTag(tag)}
                      onText={() => setTextTag(tag)}
                      onEmail={() => setEmailTag(tag)}
                      onDownload={() => handleDownloadTag(tag)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}

          {/* Unfiled tags */}
          {unfiledTags.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200">
              {folders.length > 0 && (
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900">Unfiled Tags</h2>
                </div>
              )}
              <div className="p-4 flex flex-wrap gap-2">
                {unfiledTags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    count={getTagCount(tag.id)}
                    onEdit={() => { setEditTag(tag); setShowTagForm(true); }}
                    onDelete={() => handleDeleteTag(tag)}
                    onText={() => setTextTag(tag)}
                    onEmail={() => setEmailTag(tag)}
                    onDownload={() => handleDownloadTag(tag)}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && tags.length === 0 && folders.length === 0 && (
            <div className="text-center py-16">
              <TagIcon size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-400 mb-4">No tags yet. Create your first tag to start organizing people.</p>
              <Button onClick={() => { setEditTag(null); setShowTagForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus size={16} className="mr-1.5" />
                Create Tag
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tag Form */}
      {showTagForm && (
        <TagForm
          tag={editTag}
          folders={folders}
          people={people}
          onSave={async (data) => {
            try {
              if (editTag) {
                const updated = await base44.entities.Tag.update(editTag.id, data);
                setTags((prev) => prev.map((t) => (t.id === editTag.id ? updated : t)));
              } else {
                const created = await base44.entities.Tag.create({ ...data, church_id: await getMyChurchId() });
                setTags((prev) => [...prev, created]);
              }
              setShowTagForm(false);
              setEditTag(null);
            } catch (err) {
              alert('Failed to save tag.');
            }
          }}
          onClose={() => { setShowTagForm(false); setEditTag(null); }}
        />
      )}

      {/* Folder Form */}
      {showFolderForm && (
        <FolderForm
          folder={editFolder}
          people={people}
          onSave={async (data) => {
            try {
              if (editFolder) {
                const updated = await base44.entities.TagFolder.update(editFolder.id, data);
                setFolders((prev) => prev.map((f) => (f.id === editFolder.id ? updated : f)));
              } else {
                const created = await base44.entities.TagFolder.create({ ...data, church_id: await getMyChurchId() });
                setFolders((prev) => [...prev, created]);
              }
              setShowFolderForm(false);
              setEditFolder(null);
            } catch (err) {
              alert('Failed to save folder.');
            }
          }}
          onClose={() => { setShowFolderForm(false); setEditFolder(null); }}
        />
      )}

      {textTag && (
        <TextMessageDialog
          recipients={getTaggedPeople(textTag.id).map((p) => ({
            name: `${p.first_name} ${p.last_name}`,
            phone: p.phone,
          }))}
          onClose={() => setTextTag(null)}
        />
      )}

      {emailTag && (
        <EmailMessageDialog
          recipients={getTaggedPeople(emailTag.id).map((p) => ({
            name: `${p.first_name} ${p.last_name}`,
            email: p.email,
          }))}
          onClose={() => setEmailTag(null)}
        />
      )}
    </div>
  );
}

function TagChip({ tag, count, onEdit, onDelete, onText, onEmail, onDownload }) {
  return (
    <div
      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
      style={{ backgroundColor: `${tag.color}12`, color: tag.color, border: `1px solid ${tag.color}25` }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
      <Link to={`/people?tag=${tag.id}`} className="hover:underline">
        {tag.name}
      </Link>
      <span className="text-xs opacity-60">{count}</span>
      <button
        onClick={onDownload}
        disabled={count === 0}
        className="p-0.5 rounded hover:opacity-70 transition-opacity disabled:opacity-30"
        title="Download tagged people as CSV"
      >
        <Download size={13} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-0.5 rounded hover:opacity-70 transition-opacity" title="More actions">
            <MoreHorizontal size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onText} disabled={count === 0}>
            <MessageSquare size={13} className="mr-2" /> Text People
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEmail} disabled={count === 0}>
            <Mail size={13} className="mr-2" /> Email People
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownload} disabled={count === 0}>
            <Download size={13} className="mr-2" /> Download CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil size={13} className="mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600" onClick={onDelete}>
            <Trash2 size={13} className="mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TagForm({ tag, folders, people, onSave, onClose }) {
  const [name, setName] = useState(tag?.name || '');
  const [leaderIds, setLeaderIds] = useState(tag?.leader_person_ids || []);
  const [color, setColor] = useState(tag?.color || TAG_COLORS[0]);
  const [folderId, setFolderId] = useState(tag?.folder_id || '');
  const [description, setDescription] = useState(tag?.description || '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tag ? 'Edit Tag' : 'New Tag'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. First-time Guest"
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Color</Label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Folder</Label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
            >
              <option value="">Unfiled</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Tag Leaders (receive absence alerts)</Label>
            <div className="mt-1">
              <MemberPicker people={people} selectedIds={leaderIds} onChange={setLeaderIds} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ name, color, folder_id: folderId || undefined, description, leader_person_ids: leaderIds })}
            disabled={!name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {tag ? 'Save' : 'Create Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FolderForm({ folder, people, onSave, onClose }) {
  const [name, setName] = useState(folder?.name || '');
  const [leaderId, setLeaderId] = useState(folder?.leader_person_id || '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{folder ? 'Edit Folder' : 'New Folder'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Folder Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunday School"
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Folder Leader / Director</Label>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
            >
              <option value="">No leader</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">Receives absence alerts for every tag in this folder.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ name, leader_person_id: leaderId || '' })}
            disabled={!name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {folder ? 'Save' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}