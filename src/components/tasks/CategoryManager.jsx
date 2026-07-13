import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6'];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {COLORS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full border-2 ${value === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

export default function CategoryManager({ open, onOpenChange, categories, churchId, onChanged }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0]);

  const handleAdd = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await base44.entities.TaskCategory.create({ church_id: churchId, name: name.trim(), color });
      setName('');
      onChanged();
    } catch (err) {
      alert('Could not add category: ' + (err.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || COLORS[0]);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      await base44.entities.TaskCategory.update(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
      onChanged();
    } catch (err) {
      alert('Could not update category: ' + (err.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Existing tasks keep working without it.`)) return;
    try {
      await base44.entities.TaskCategory.delete(cat.id);
      onChanged();
    } catch (err) {
      alert('Could not delete category: ' + (err.message || 'unknown error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>To-Do Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="e.g. Outreach, Maintenance, Events" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
            <Button onClick={handleAdd} disabled={saving || !name.trim()} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
              <Plus size={15} />
            </Button>
          </div>
          <ColorPicker value={color} onChange={setColor} />
          <div className="divide-y divide-slate-100 border rounded-lg">
            {categories.length === 0 && <p className="text-sm text-slate-400 p-4 text-center">No categories yet.</p>}
            {categories.map((cat) => (
              editingId === cat.id ? (
                <div key={cat.id} className="px-3 py-2.5 space-y-2 bg-slate-50">
                  <div className="flex gap-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); } }} autoFocus />
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="h-8 bg-indigo-600 hover:bg-indigo-700 shrink-0">
                      <Check size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 shrink-0">
                      <X size={14} />
                    </Button>
                  </div>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                </div>
              ) : (
                <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 group">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#6366f1' }} />
                  <span className="text-sm text-slate-800 flex-1">{cat.name}</span>
                  <button onClick={() => startEdit(cat)} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(cat)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}