import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MemberPicker from '@/components/caregroups/MemberPicker';
import { Loader2 } from 'lucide-react';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

export default function CareGroupForm({ open, onOpenChange, group, people, churchId, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: group?.name || '',
    description: group?.description || '',
    leader_id: group?.leader_id || '',
    member_ids: group?.member_ids || [],
    color: group?.color || '#8b5cf6',
  }));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (group?.id) {
        await base44.entities.CareGroup.update(group.id, form);
        if (group.calendar_id) {
          await base44.entities.DepartmentCalendar.update(group.calendar_id, { name: `${form.name} Calendar`, color: form.color });
        }
      } else {
        const calendar = await base44.entities.DepartmentCalendar.create({
          church_id: churchId,
          name: `${form.name} Calendar`,
          color: form.color,
        });
        await base44.entities.CareGroup.create({ ...form, church_id: churchId, calendar_id: calendar.id });
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group?.id ? 'Edit Care Group' : 'New Care Group'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Group Name *</Label>
            <Input className="mt-1" placeholder="e.g. Elder Care, Hospital Care, Mommy Care" value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label>Group Leader</Label>
            <Select value={form.leader_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, leader_id: v === 'none' ? '' : v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a leader" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No leader assigned</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Calendar Color</Label>
            <div className="flex gap-2 mt-1.5">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <Label>Members ({form.member_ids.length})</Label>
            <MemberPicker people={people} selectedIds={form.member_ids} excludeId={form.leader_id}
              onChange={(ids) => setForm(f => ({ ...f, member_ids: ids }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 size={14} className="animate-spin" />} {group?.id ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}