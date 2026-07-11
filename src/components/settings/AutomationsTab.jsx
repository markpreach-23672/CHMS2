import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, MoreHorizontal, Zap, Mail, MessageSquare, Tag as TagIcon, Calendar, Gift } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const TRIGGERS = {
  birthday: { label: 'Birthday', icon: Gift },
  anniversary: { label: 'Anniversary', icon: Calendar },
  form_submission: { label: 'Form Submission', icon: Mail },
};
const ACTIONS = {
  send_email: { label: 'Send Email', icon: Mail },
  send_text: { label: 'Send Text', icon: MessageSquare },
  apply_tag: { label: 'Apply Tag', icon: TagIcon },
};

export default function AutomationsTab({ canEdit }) {
  const [automations, setAutomations] = useState([]);
  const [tags, setTags] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, t, f] = await Promise.all([
        base44.entities.Automation.list('-created_date', 100),
        base44.entities.Tag.list(),
        base44.entities.Form.list(),
      ]);
      setAutomations(a);
      setTags(t);
      setForms(f);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (item) => {
    if (!confirm(`Delete automation "${item.name}"?`)) return;
    try {
      await base44.entities.Automation.delete(item.id);
      setAutomations((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) { alert('Failed to delete automation.'); }
  };

  const handleToggle = async (item) => {
    try {
      const updated = await base44.entities.Automation.update(item.id, { is_active: !item.is_active });
      setAutomations((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
    } catch (err) { alert('Failed to toggle automation.'); }
  };

  const handleSaved = (saved) => {
    setAutomations((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditItem(null);
  };

  const tagName = (id) => tags.find((t) => t.id === id)?.name || '—';
  const formName = (id) => forms.find((f) => f.id === id)?.title || 'Any form';

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 flex-1">
          <Zap size={16} className="inline mr-1.5" />
          Automations run automatically — send birthday emails, text anniversary reminders, or auto-tag form respondents. Birthday &amp; anniversary automations run each morning.
        </div>
        {canEdit && (
          <Button variant="outline" onClick={() => { setEditItem(null); setShowForm(true); }} className="flex-shrink-0">
            <Plus size={15} className="mr-1.5" />Add Automation
          </Button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : automations.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No automations yet. Add one to automate follow-up.</div>
        ) : (
          automations.map((a) => {
            const TrigIcon = TRIGGERS[a.trigger_type]?.icon || Zap;
            const ActIcon = ACTIONS[a.action_type]?.icon || Zap;
            return (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{a.name}</p>
                    {!a.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">Paused</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1"><TrigIcon size={11} />{TRIGGERS[a.trigger_type]?.label}</span>
                    <span>→</span>
                    <span className="inline-flex items-center gap-1"><ActIcon size={11} />{ACTIONS[a.action_type]?.label}</span>
                    {a.target_type === 'tag' && <span>· tag: {tagName(a.target_tag_id)}</span>}
                    {a.trigger_type === 'form_submission' && <span>· {formName(a.trigger_form_id)}</span>}
                    {a.action_type === 'apply_tag' && <span>· → {tagName(a.action_tag_id)}</span>}
                  </p>
                </div>
                {canEdit && <Switch checked={!!a.is_active} onCheckedChange={() => handleToggle(a)} />}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditItem(a); setShowForm(true); }}><Pencil size={14} className="mr-1.5" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(a)}><Trash2 size={14} className="mr-1.5" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <AutomationForm
          item={editItem}
          tags={tags}
          forms={forms}
          onSave={async (data) => {
            try {
              if (editItem) {
                const updated = await base44.entities.Automation.update(editItem.id, data);
                handleSaved(updated);
              } else {
                const created = await base44.entities.Automation.create(data);
                handleSaved(created);
              }
            } catch (err) { alert('Failed to save automation.'); }
          }}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function AutomationForm({ item, tags, forms, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'birthday',
    target_type: 'everyone',
    target_tag_id: '',
    trigger_form_id: '',
    action_type: 'send_email',
    action_tag_id: '',
    subject: '',
    body: '',
    from_number: '',
    offset_days: 0,
    is_active: true,
    ...item,
  });

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const isDate = form.trigger_type === 'birthday' || form.trigger_type === 'anniversary';

  const handleSave = () => {
    if (!form.name.trim()) { alert('Name is required.'); return; }
    const data = { ...form };
    if (data.target_type !== 'tag') delete data.target_tag_id;
    if (form.trigger_type !== 'form_submission') delete data.trigger_form_id;
    if (form.action_type !== 'apply_tag') delete data.action_tag_id;
    if (form.action_type === 'apply_tag' && !data.action_tag_id) { alert('Select a tag to apply.'); return; }
    if ((form.action_type === 'send_email' || form.action_type === 'send_text') && !data.body?.trim()) { alert('Message body is required.'); return; }
    if (!isDate) delete data.offset_days;
    onSave(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Edit Automation' : 'New Automation'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1" autoFocus placeholder="e.g. Birthday Email" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Trigger</Label>
              <Select value={form.trigger_type} onValueChange={(v) => set('trigger_type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="form_submission">Form Submission</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Action</Label>
              <Select value={form.action_type} onValueChange={(v) => set('action_type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_email">Send Email</SelectItem>
                  <SelectItem value="send_text">Send Text</SelectItem>
                  <SelectItem value="apply_tag">Apply Tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isDate && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Send offset (days from {form.trigger_type})</Label>
              <Input type="number" value={form.offset_days ?? 0} onChange={(e) => set('offset_days', parseInt(e.target.value || '0', 10))} className="mt-1" />
              <p className="text-xs text-slate-400 mt-1">0 = on the day. Use -7 to send a week before, 1 for the day after.</p>
            </div>
          )}

          {form.trigger_type === 'form_submission' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Form</Label>
              <Select value={form.trigger_form_id || 'any'} onValueChange={(v) => set('trigger_form_id', v === 'any' ? '' : v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any form</SelectItem>
                  {forms.map((f) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-slate-600">Who does it apply to?</Label>
            <Select value={form.target_type} onValueChange={(v) => set('target_type', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="tag">People with a specific tag</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.target_type === 'tag' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Target Tag</Label>
              <Select value={form.target_tag_id || ''} onValueChange={(v) => set('target_tag_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select tag..." /></SelectTrigger>
                <SelectContent>
                  {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.action_type === 'apply_tag' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Tag to Apply</Label>
              <Select value={form.action_tag_id || ''} onValueChange={(v) => set('action_tag_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select tag..." /></SelectTrigger>
                <SelectContent>
                  {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.action_type === 'send_email' && (
            <>
              <div>
                <Label className="text-xs font-medium text-slate-600">Subject</Label>
                <Input value={form.subject} onChange={(e) => set('subject', e.target.value)} className="mt-1" placeholder="Happy Birthday!" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Body</Label>
                <Textarea rows={5} value={form.body} onChange={(e) => set('body', e.target.value)} className="mt-1" placeholder="Hi {{first_name}}, we're celebrating you today!" />
                <p className="text-xs text-slate-400 mt-1">Merge fields: {'{{first_name}}'}, {'{{last_name}}'}, {'{{church_name}}'}</p>
              </div>
            </>
          )}
          {form.action_type === 'send_text' && (
            <>
              <div>
                <Label className="text-xs font-medium text-slate-600">Message</Label>
                <Textarea rows={4} value={form.body} onChange={(e) => set('body', e.target.value)} className="mt-1" placeholder="Hi {{first_name}}, happy birthday from {{church_name}}!" />
                <p className="text-xs text-slate-400 mt-1">Merge fields: {'{{first_name}}'}, {'{{church_name}}'}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">From Number (optional)</Label>
                <Input value={form.from_number} onChange={(e) => set('from_number', e.target.value)} className="mt-1" placeholder="Override church Twilio number" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">{item ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}