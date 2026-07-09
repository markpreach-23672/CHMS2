import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { CARD_TEMPLATES } from './cardTemplates';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' }
];

const MAPS_TO_OPTIONS = [
  { value: 'first_name', label: '→ First Name' },
  { value: 'last_name', label: '→ Last Name' },
  { value: 'email', label: '→ Email' },
  { value: 'phone', label: '→ Phone' },
  { value: 'mobile', label: '→ Mobile' },
  { value: 'address', label: '→ Address' },
  { value: 'city', label: '→ City' },
  { value: 'state', label: '→ State' },
  { value: 'zip', label: '→ ZIP' },
  { value: 'birth_date', label: '→ Birthday' },
  { value: 'notes', label: '→ Notes' },
  { value: 'custom', label: '→ Custom Field' }
];

export default function CardForm({ workflows, tags, editingCard, onSave, onClose }) {
  const [name, setName] = useState(editingCard?.name || '');
  const [title, setTitle] = useState(editingCard?.title || '');
  const [description, setDescription] = useState(editingCard?.description || '');
  const [keyword, setKeyword] = useState(editingCard?.keyword || '');
  const [workflowId, setWorkflowId] = useState(editingCard?.workflow_id || '');
  const [buttonText, setButtonText] = useState(editingCard?.button_text || 'Submit');
  const [confirmationMsg, setConfirmationMsg] = useState(editingCard?.confirmation_message || '');
  const [fields, setFields] = useState(Array.isArray(editingCard?.fields) ? editingCard.fields : []);
  const [selectedTagIds, setSelectedTagIds] = useState(editingCard?.tag_ids || []);
  const [showTemplatePicker, setShowTemplatePicker] = useState(!editingCard);

  const applyTemplate = (tpl) => {
    setName(tpl.name);
    setTitle(tpl.title);
    setDescription(tpl.description);
    setKeyword(tpl.keyword);
    setButtonText(tpl.button_text);
    setConfirmationMsg(tpl.confirmation_message);
    setFields(tpl.fields.map(f => ({ ...f })));
    setShowTemplatePicker(false);
  };

  const addField = () => {
    setFields(prev => [...prev, { key: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false, maps_to: 'custom' }]);
  };

  const updateField = (idx, updates) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const removeField = (idx) => {
    setFields(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleTag = (tagId) => {
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleSave = () => {
    onSave({
      name,
      title: title || undefined,
      description: description || undefined,
      keyword: keyword || undefined,
      workflow_id: workflowId || undefined,
      button_text: buttonText || 'Submit',
      confirmation_message: confirmationMsg || undefined,
      fields: fields.map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required || false,
        maps_to: f.maps_to || 'custom',
        ...(f.type === 'select' ? { options: f.options || [] } : {})
      })),
      tag_ids: selectedTagIds,
      is_active: true
    });
  };

  if (showTemplatePicker) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Card Template</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {CARD_TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
              >
                <div className="text-2xl mb-1">{tpl.emoji}</div>
                <h3 className="font-semibold text-sm text-slate-900">{tpl.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">{tpl.fields.length} fields</p>
              </button>
            ))}
            <button
              onClick={() => { setFields([]); setShowTemplatePicker(false); }}
              className="text-left p-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
            >
              <div className="text-2xl mb-1">📝</div>
              <h3 className="font-semibold text-sm text-slate-900">Start from Scratch</h3>
              <p className="text-xs text-slate-500 mt-0.5">Build a custom card with your own fields.</p>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {!editingCard && (
              <button onClick={() => setShowTemplatePicker(true)} className="p-1 rounded hover:bg-slate-100">
                <ArrowLeft size={16} className="text-slate-400" />
              </button>
            )}
            <DialogTitle>{editingCard ? 'Edit Connect Card' : 'New Connect Card'}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-slate-600">Card Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Display Title (shown to guests)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-600">Text Keyword</Label>
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value.toUpperCase())} className="mt-1 font-mono" placeholder="GUEST" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Submit Button Text</Label>
                <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Confirmation Message (after submission)</Label>
              <Textarea value={confirmationMsg} onChange={(e) => setConfirmationMsg(e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>

          {/* Field Builder */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Form Fields</Label>
              <Button size="sm" variant="outline" onClick={addField} className="h-7 text-xs">
                <Plus size={12} className="mr-1" /> Add Field
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      className="h-8 text-xs flex-1"
                      placeholder="Field label"
                    />
                    <button onClick={() => removeField(idx)} className="p-1 text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={field.type} onChange={(e) => updateField(idx, { type: e.target.value })} className="h-8 text-xs px-2 rounded-md border border-input bg-transparent">
                      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                    <select value={field.maps_to || 'custom'} onChange={(e) => updateField(idx, { maps_to: e.target.value })} className="h-8 text-xs px-2 rounded-md border border-input bg-transparent">
                      {MAPS_TO_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 h-8 px-1">
                      <Checkbox checked={field.required || false} onCheckedChange={(v) => updateField(idx, { required: v })} />
                      Required
                    </label>
                  </div>
                  {field.type === 'select' && (
                    <Input
                      value={(field.options || []).join(', ')}
                      onChange={(e) => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className="h-8 text-xs"
                      placeholder="Dropdown options, comma-separated"
                    />
                  )}
                </div>
              ))}
              {fields.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No fields yet. Click "Add Field" to start building.</p>}
            </div>
          </div>

          {/* Tags & Workflow */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">Auto-Apply Tags on Submission</Label>
              {tags.length === 0 ? (
                <p className="text-xs text-slate-400">No tags available. Create tags in the Tags page.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${selectedTagIds.includes(tag.id) ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color || '#6366f1' } : {}}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Trigger Workflow</Label>
              <select value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="">None</option>
                {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {editingCard ? 'Save Changes' : 'Create Card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}