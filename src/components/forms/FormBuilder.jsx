import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronUp, ChevronDown, Trash2, Plus, X, GripVertical, Eye } from 'lucide-react';
import FormRenderer from './FormRenderer';
import { FIELD_TYPE_META, getDefaultLabel, getAutoMapsTo } from './formTemplates';

export default function FormBuilder({ form, tags, workflows, onSave, onClose }) {
  const [title, setTitle] = useState(form?.title || '');
  const [description, setDescription] = useState(form?.description || '');
  const [headerImageUrl, setHeaderImageUrl] = useState(form?.header_image_url || '');
  const [submitButtonText, setSubmitButtonText] = useState(form?.submit_button_text || 'Submit');
  const [confirmationMessage, setConfirmationMessage] = useState(form?.confirmation_message || 'Thank you for your submission!');
  const [fields, setFields] = useState(form?.fields || []);
  const [expandedId, setExpandedId] = useState(null);
  const [tagIds, setTagIds] = useState(form?.tag_ids || []);
  const [workflowId, setWorkflowId] = useState(form?.workflow_id || '');
  const [notifyEmails, setNotifyEmails] = useState((form?.notify_emails || []).join(', '));
  const [sendConfirmation, setSendConfirmation] = useState(form?.send_submitter_confirmation || false);
  const [confirmationSubject, setConfirmationSubject] = useState(form?.confirmation_subject || '');
  const [confirmationBody, setConfirmationBody] = useState(form?.confirmation_body || '');
  const [previewValues, setPreviewValues] = useState({});
  const [saving, setSaving] = useState(false);

  const addField = (type) => {
    const newField = {
      id: `f${Date.now()}${Math.floor(Math.random() * 1000)}`,
      type,
      label: getDefaultLabel(type),
      required: false,
      maps_to: getAutoMapsTo(type),
      options: ['select', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
      payment_options: type === 'payment' ? [{ label: 'Standard', amount: 25 }] : undefined,
    };
    setFields([...fields, newField]);
    setExpandedId(newField.id);
  };

  const updateField = (id, updates) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const deleteField = (id) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const moveField = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const arr = [...fields];
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setFields(arr);
  };

  const toggleTag = (tagId) => {
    setTagIds((prev) => (prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]));
  };

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a form title.'); return; }
    setSaving(true);
    const formData = {
      title,
      description,
      header_image_url: headerImageUrl || undefined,
      submit_button_text: submitButtonText || 'Submit',
      confirmation_message: confirmationMessage,
      fields: fields.map(({ id, type, label, description, required, options, payment_options, maps_to, placeholder }) => {
        const f = { id, type, label, required: !!required };
        if (description) f.description = description;
        if (options) f.options = options;
        if (payment_options) f.payment_options = payment_options;
        if (maps_to) f.maps_to = maps_to;
        if (placeholder) f.placeholder = placeholder;
        return f;
      }),
      tag_ids: tagIds,
      workflow_id: workflowId || undefined,
      notify_emails: notifyEmails.split(',').map((e) => e.trim()).filter(Boolean),
      send_submitter_confirmation: sendConfirmation,
      confirmation_subject: confirmationSubject || undefined,
      confirmation_body: confirmationBody || undefined,
      is_active: true,
    };
    await onSave(formData);
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-bold">Form Builder</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Saving...' : 'Save Form'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_400px] h-[calc(92vh-65px)]">
          {/* Builder Panel */}
          <div className="overflow-y-auto p-6 space-y-5 border-r border-slate-100">
            {/* Form Settings */}
            <Section title="Form Settings">
              <div>
                <Label className="text-xs text-slate-500">Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-0.5" placeholder="My Form" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-0.5" rows={2} placeholder="Shown below the title on the public form" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Header Image URL</Label>
                <Input value={headerImageUrl} onChange={(e) => setHeaderImageUrl(e.target.value)} className="mt-0.5" placeholder="https://images.unsplash.com/..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Submit Button Text</Label>
                  <Input value={submitButtonText} onChange={(e) => setSubmitButtonText(e.target.value)} className="mt-0.5" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Confirmation Message</Label>
                <Textarea value={confirmationMessage} onChange={(e) => setConfirmationMessage(e.target.value)} className="mt-0.5" rows={2} placeholder="Shown after submission" />
              </div>
            </Section>

            {/* Fields */}
            <Section title={`Fields (${fields.length})`}>
              {fields.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No fields yet. Add some below.</p>}
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const meta = FIELD_TYPE_META.find((m) => m.type === field.type);
                  const isExpanded = expandedId === field.id;
                  return (
                    <div key={field.id} className="border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-2 p-2.5">
                        <GripVertical size={14} className="text-slate-300" />
                        <button onClick={() => setExpandedId(isExpanded ? null : field.id)} className="flex-1 flex items-center gap-2 text-left">
                          <span className={`text-xs font-medium ${meta?.color || 'text-slate-500'}`}>{meta?.label || field.type}</span>
                          <span className="text-sm text-slate-700 truncate">{field.label}</span>
                          {field.required && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Required</span>}
                          {field.maps_to && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">→ {field.maps_to}</span>}
                        </button>
                        <button onClick={() => moveField(index, -1)} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp size={14} /></button>
                        <button onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown size={14} /></button>
                        <button onClick={() => deleteField(field.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                      {isExpanded && (
                        <div className="p-3 pt-0 space-y-3 border-t border-slate-100">
                          <div>
                            <Label className="text-xs text-slate-500">Label</Label>
                            <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="mt-0.5 h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">Description (optional)</Label>
                            <Input value={field.description || ''} onChange={(e) => updateField(field.id, { description: e.target.value })} className="mt-0.5 h-8 text-sm" placeholder="Help text shown below the label" />
                          </div>
                          {field.type !== 'section' && (
                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                              <input type="checkbox" checked={field.required || false} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="rounded" />
                              Required field
                            </label>
                          )}
                          {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                            <div>
                              <Label className="text-xs text-slate-500">Options</Label>
                              <div className="space-y-1 mt-1">
                                {(field.options || []).map((opt, i) => (
                                  <div key={i} className="flex gap-1.5">
                                    <Input value={opt} onChange={(e) => updateField(field.id, { options: field.options.map((o, j) => j === i ? e.target.value : o) })} className="h-7 text-xs" />
                                    <button onClick={() => updateField(field.id, { options: field.options.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500 px-1"><X size={12} /></button>
                                  </div>
                                ))}
                                <button onClick={() => updateField(field.id, { options: [...(field.options || []), 'New Option'] })} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"><Plus size={12} /> Add Option</button>
                              </div>
                            </div>
                          )}
                          {field.type === 'payment' && (
                            <div>
                              <Label className="text-xs text-slate-500">Payment Options</Label>
                              <div className="space-y-1 mt-1">
                                {(field.payment_options || []).map((opt, i) => (
                                  <div key={i} className="flex gap-1.5">
                                    <Input placeholder="Label" value={opt.label} onChange={(e) => updateField(field.id, { payment_options: field.payment_options.map((p, j) => j === i ? { ...p, label: e.target.value } : p) })} className="h-7 text-xs flex-1" />
                                    <div className="relative w-24">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                                      <Input type="number" value={opt.amount} onChange={(e) => updateField(field.id, { payment_options: field.payment_options.map((p, j) => j === i ? { ...p, amount: parseFloat(e.target.value) || 0 } : p) })} className="h-7 text-xs pl-5" />
                                    </div>
                                    <button onClick={() => updateField(field.id, { payment_options: field.payment_options.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500 px-1"><X size={12} /></button>
                                  </div>
                                ))}
                                <button onClick={() => updateField(field.id, { payment_options: [...(field.payment_options || []), { label: 'New Option', amount: 0 }] })} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"><Plus size={12} /> Add Tier</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Add Field */}
            <Section title="Add Field">
              <div className="flex flex-wrap gap-1.5">
                {FIELD_TYPE_META.map((meta) => (
                  <button key={meta.type} onClick={() => addField(meta.type)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-xs font-medium text-slate-600 transition-colors">
                    <span className={meta.color}>•</span> {meta.label}
                  </button>
                ))}
              </div>
            </Section>

            {/* Automation */}
            <Section title="Automation & Notifications">
              {tags.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500">Assign Tags on Submission</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tags.map((tag) => (
                      <button key={tag.id} onClick={() => toggleTag(tag.id)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${tagIds.includes(tag.id) ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        style={tagIds.includes(tag.id) ? { backgroundColor: tag.color || '#6366f1' } : {}}>
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs text-slate-500">Enroll in Workflow</Label>
                <select value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} className="mt-0.5 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                  <option value="">No workflow</option>
                  {workflows.map((wf) => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Admin Notification Emails (comma-separated)</Label>
                <Input value={notifyEmails} onChange={(e) => setNotifyEmails(e.target.value)} className="mt-0.5" placeholder="pastor@church.com, admin@church.com" />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" checked={sendConfirmation} onChange={(e) => setSendConfirmation(e.target.checked)} className="rounded" />
                Send confirmation email to submitter
              </label>
              {sendConfirmation && (
                <>
                  <div>
                    <Label className="text-xs text-slate-500">Confirmation Email Subject</Label>
                    <Input value={confirmationSubject} onChange={(e) => setConfirmationSubject(e.target.value)} className="mt-0.5" placeholder="Thank you for your submission" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Confirmation Email Body</Label>
                    <Textarea value={confirmationBody} onChange={(e) => setConfirmationBody(e.target.value)} className="mt-0.5" rows={3} placeholder="Hi {{first_name}}, thank you for..." />
                    <p className="text-[10px] text-slate-400 mt-0.5">Merge fields: {'{{first_name}}'}, {'{{church_name}}'}</p>
                  </div>
                </>
              )}
            </Section>
          </div>

          {/* Preview Panel */}
          <div className="overflow-y-auto bg-slate-50 p-6">
            <div className="sticky top-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                <Eye size={14} /> Live Preview
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {headerImageUrl ? (
                  <img src={headerImageUrl} alt="" className="w-full h-32 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : null}
                <div className="p-5">
                  <h2 className="text-xl font-bold text-slate-900">{title || 'Untitled Form'}</h2>
                  {description && <p className="text-sm text-slate-500 mt-1 mb-3">{description}</p>}
                  <div className="mt-3">
                    <FormRenderer fields={fields} values={previewValues} onChange={setPreviewValues} disabled={false} />
                  </div>
                  <Button disabled className="w-full mt-5 bg-indigo-600">{submitButtonText || 'Submit'}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}