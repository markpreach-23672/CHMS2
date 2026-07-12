import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6'];

export default function CategoryManager({ open, onOpenChange, categories, churchId, onChanged }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.TaskCategory.create({ church_id: churchId, name: name.trim(), color });
      setName('');
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Existing tasks keep working without it.`)) return;
    await base44.entities.TaskCategory.delete(cat.id);
    onChanged();
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
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <Button onClick={handleAdd} disabled={saving || !name.trim()} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
              <Plus size={15} />
            </Button>
          </div>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="divide-y divide-slate-100 border rounded-lg">
            {categories.length === 0 && <p className="text-sm text-slate-400 p-4 text-center">No categories yet.</p>}
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 group">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#6366f1' }} />
                <span className="text-sm text-slate-800 flex-1">{cat.name}</span>
                <button onClick={() => handleDelete(cat)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}