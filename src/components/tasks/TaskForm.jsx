import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MemberPicker from '@/components/caregroups/MemberPicker';
import DateInput from '@/components/ui/date-input';
import { Loader2 } from 'lucide-react';

export default function TaskForm({ open, onOpenChange, task, user, people, categories, careGroups, serviceTeams, churchId, onSaved }) {
  const [form, setForm] = useState(() => ({
    title: task?.title || '',
    description: task?.description || '',
    category_id: task?.category_id || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    assignee_person_ids: task?.assignee_person_ids || [],
    assignee_group_type: task?.assignee_group_type || '',
    assignee_group_id: task?.assignee_group_id || '',
    notify_method: task?.notify_method || 'email',
    recurrence: task?.is_recurring ? (task.recurrence_frequency || 'weekly') : 'none',
  }));
  const [assignMode, setAssignMode] = useState(task?.assignee_group_id ? 'group' : 'people');
  const [saving, setSaving] = useState(false);

  const groupValue = form.assignee_group_id ? `${form.assignee_group_type}:${form.assignee_group_id}` : 'none';

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { recurrence, ...rest } = form;
      const data = {
        ...rest,
        is_recurring: recurrence !== 'none',
        recurrence_frequency: recurrence !== 'none' ? recurrence : undefined,
        assignee_person_ids: assignMode === 'people' ? form.assignee_person_ids : [],
        assignee_group_type: assignMode === 'group' && form.assignee_group_id ? form.assignee_group_type : undefined,
        assignee_group_id: assignMode === 'group' ? form.assignee_group_id : '',
        category_id: form.category_id || undefined,
        due_date: form.due_date || undefined,
      };
      let saved;
      if (task?.id) {
        saved = await base44.entities.Task.update(task.id, data);
      } else {
        saved = await base44.entities.Task.create({
          ...data,
          church_id: churchId,
          status: 'open',
          completed_person_ids: [],
          assigned_by_user_id: user?.id,
          assigned_by_name: user?.full_name,
        });
        if (form.notify_method !== 'none') {
          base44.functions.invoke('sendTaskNotification', { taskId: saved.id }).catch(console.error);
        }
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      alert('Could not save task: ' + (err.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task?.id ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Task Title *</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Set up chairs for Sunday service" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, category_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <DateInput className="mt-1" value={form.due_date} onChange={(v) => setForm(f => ({ ...f, due_date: v }))} />
            </div>
          </div>

          <div>
            <Label>Repeat</Label>
            <Select value={form.recurrence} onValueChange={(v) => setForm(f => ({ ...f, recurrence: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {form.recurrence !== 'none' && (
              <p className="text-xs text-slate-400 mt-1">When this task is completed, the next occurrence is created automatically.</p>
            )}
          </div>

          <div>
            <Label>Assign To</Label>
            <div className="flex gap-2 mt-1.5 mb-2">
              <Button type="button" size="sm" variant={assignMode === 'people' ? 'default' : 'outline'} onClick={() => setAssignMode('people')}>
                People
              </Button>
              <Button type="button" size="sm" variant={assignMode === 'group' ? 'default' : 'outline'} onClick={() => setAssignMode('group')}>
                Group
              </Button>
            </div>
            {assignMode === 'people' ? (
              <MemberPicker people={people} selectedIds={form.assignee_person_ids}
                onChange={(ids) => setForm(f => ({ ...f, assignee_person_ids: ids }))} />
            ) : (
              <Select value={groupValue} onValueChange={(v) => {
                if (v === 'none') { setForm(f => ({ ...f, assignee_group_type: '', assignee_group_id: '' })); return; }
                const [type, id] = v.split(':');
                setForm(f => ({ ...f, assignee_group_type: type, assignee_group_id: id }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select a group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a group…</SelectItem>
                  {careGroups.map((g) => <SelectItem key={g.id} value={`care_group:${g.id}`}>Care Group — {g.name}</SelectItem>)}
                  {serviceTeams.map((t) => <SelectItem key={t.id} value={`service_team:${t.id}`}>Team — {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Notify Assignees</Label>
            <Select value={form.notify_method} onValueChange={(v) => setForm(f => ({ ...f, notify_method: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="text">Text Message</SelectItem>
                <SelectItem value="both">Email + Text</SelectItem>
                <SelectItem value="none">No Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 size={14} className="animate-spin" />} {task?.id ? 'Save Changes' : 'Create & Assign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}