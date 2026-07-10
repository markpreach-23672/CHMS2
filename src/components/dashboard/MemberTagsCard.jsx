import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tag as TagIcon, Check, Pencil } from 'lucide-react';

export default function MemberTagsCard({ person, onSaved }) {
  const [tags, setTags] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState(person.tag_ids || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Tag.list().then(setTags).catch(() => {});
  }, []);

  useEffect(() => { setSelected(person.tag_ids || []); }, [person]);

  const myTags = (person.tag_ids || [])
    .map((id) => tags.find((t) => t.id === id))
    .filter(Boolean);

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Person.update(person.id, { tag_ids: selected });
      onSaved(updated);
      setShowPicker(false);
    } catch (err) {
      alert('Failed to update tags.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TagIcon size={18} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-900">My Tags</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPicker(true)}>
          <Pencil size={14} className="mr-1.5" />Edit
        </Button>
      </div>
      {myTags.length === 0 ? (
        <p className="text-sm text-slate-400">No tags assigned yet. Click "Edit" to choose tags that describe you.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {myTags.map((t) => (
            <span key={t.id} className="text-xs px-2.5 py-1 rounded-full font-medium text-white" style={{ backgroundColor: t.color || '#6366f1' }}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      {showPicker && (
        <Dialog open onOpenChange={() => setShowPicker(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Choose Your Tags</DialogTitle></DialogHeader>
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              {tags.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No tags available.</p>}
              {tags.map((t) => {
                const has = selected.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggle(t.id)} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-sm font-medium text-slate-700 flex-1">{t.name}</span>
                    {has && <Check size={14} className="text-emerald-600" />}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPicker(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Saving...' : 'Save Tags'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}