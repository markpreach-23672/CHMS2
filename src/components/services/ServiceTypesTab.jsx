import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, LayoutTemplate, X } from 'lucide-react';

export default function ServiceTypesTab({ churchId }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTypes(await base44.entities.ServiceType.list()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (t) => {
    if (!confirm(`Delete service type "${t.name}"? Existing plans are not affected.`)) return;
    try {
      await base44.entities.ServiceType.delete(t.id);
      setTypes((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) { alert('Failed to delete service type.'); }
  };

  const handleSaved = (saved) => {
    setTypes((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditItem(null);
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={15} className="mr-1.5" />New Service Type
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-sm text-slate-400 p-4">Loading...</p>
        ) : types.length === 0 ? (
          <p className="text-sm text-slate-400 p-4 col-span-2 text-center bg-white rounded-xl border border-slate-200 py-8">No service types yet. Define your normal worship schedule and standard order of service — new plans start from these templates.</p>
        ) : (
          types.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 group">
              <div className="flex items-center gap-2 mb-2">
                <LayoutTemplate size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900 flex-1">{t.name}</h3>
                <span className="text-xs text-slate-400">{t.default_time}</span>
                <button onClick={() => { setEditItem(t); setShowForm(true); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 p-1"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(t)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              </div>
              <div className="space-y-0.5">
                {(t.default_items || []).map((it, i) => (
                  <p key={i} className={`text-xs ${it.type === 'header' ? 'font-bold uppercase text-indigo-500 mt-1.5' : 'text-slate-600'}`}>
                    {it.type !== 'header' && <span className="text-slate-300 mr-1.5">{it.duration_minutes || 0}m</span>}
                    {it.title}{it.type === 'song' ? ' 🎵' : ''}
                  </p>
                ))}
                {(t.default_items || []).length === 0 && <p className="text-xs text-slate-400">No default flow items.</p>}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">{(t.positions || []).length} positions</p>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <ServiceTypeForm item={editItem} churchId={churchId} onSaved={handleSaved} onClose={() => { setShowForm(false); setEditItem(null); }} />
      )}
    </div>
  );
}

function ServiceTypeForm({ item, churchId, onSaved, onClose }) {
  const [name, setName] = useState(item?.name || '');
  const [defaultTime, setDefaultTime] = useState(item?.default_time || '10:00');
  const [positions, setPositions] = useState(item?.positions || ['Worship Leader', 'Vocals', 'Keys', 'Guitar', 'Bass', 'Drums', 'Usher', 'Greeter', 'Emcee', 'Prayer', 'Announcements', 'Sound', 'Media']);
  const [newPosition, setNewPosition] = useState('');
  const [items, setItems] = useState(item?.default_items || []);
  const [saving, setSaving] = useState(false);

  const addPosition = () => {
    const p = newPosition.trim();
    if (!p || positions.includes(p)) return;
    setPositions((prev) => [...prev, p]);
    setNewPosition('');
  };

  const addItem = () => setItems((prev) => [...prev, { title: '', type: 'element', duration_minutes: 5 }]);
  const updateItem = (idx, key, value) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name.trim()) { alert('Name is required.'); return; }
    setSaving(true);
    try {
      const data = {
        church_id: churchId,
        name,
        default_time: defaultTime,
        positions,
        default_items: items.filter((it) => it.title.trim()).map((it) => ({ ...it, duration_minutes: Number(it.duration_minutes) || 0 })),
      };
      if (item) onSaved(await base44.entities.ServiceType.update(item.id, data));
      else onSaved(await base44.entities.ServiceType.create(data));
    } catch (err) { alert('Failed to save service type.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Edit Service Type' : 'New Service Type'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Sunday Morning" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Default Start Time</Label>
              <Input type="time" value={defaultTime} onChange={(e) => setDefaultTime(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Positions</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {positions.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                  {p}
                  <button onClick={() => setPositions((prev) => prev.filter((x) => x !== p))} className="hover:text-red-500"><X size={11} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input value={newPosition} onChange={(e) => setNewPosition(e.target.value)} placeholder="Add position..." className="h-8 text-xs" onKeyDown={(e) => e.key === 'Enter' && addPosition()} />
              <Button size="sm" variant="outline" onClick={addPosition} className="h-8"><Plus size={13} /></Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-medium text-slate-600">Standard Order of Service</Label>
              <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs"><Plus size={12} className="mr-1" />Add</Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select value={it.type} onValueChange={(v) => updateItem(idx, 'type', v)}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="element">Element</SelectItem>
                      <SelectItem value="song">Song</SelectItem>
                      <SelectItem value="header">Header</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={it.title} onChange={(e) => updateItem(idx, 'title', e.target.value)} placeholder="Title" className="flex-1 h-8 text-xs" />
                  {it.type !== 'header' && (
                    <Input type="number" value={it.duration_minutes} onChange={(e) => updateItem(idx, 'duration_minutes', e.target.value)} className="w-16 h-8 text-xs" title="Minutes" />
                  )}
                  <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-slate-400">e.g. Welcome, Worship (songs), Announcements, Prayer, Sermon, Closing.</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}