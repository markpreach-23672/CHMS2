import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, CreditCard, Workflow, Mail, MessageSquare, Clock, CheckSquare, Trash2, MoreHorizontal, ArrowRight, Send, AlertCircle, QrCode, Pencil, LayoutTemplate, BarChart3, Users, Tag } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SubmitEntryDialog from '@/components/connectcards/SubmitEntryDialog';
import CardForm from '@/components/connectcards/CardForm';
import ShareCardDialog from '@/components/connectcards/ShareCardDialog';
import WorkflowTemplatePicker from '@/components/workflows/WorkflowTemplatePicker';
import WorkflowAnalytics from '@/components/workflows/WorkflowAnalytics';
import BulkEnrollDialog from '@/components/workflows/BulkEnrollDialog';

const PERSON_DATE_LABELS = {
  birth_date: 'Birthday',
  first_visit_date: 'First Visit Date',
  baptism_date: 'Baptism Date',
  membership_date: 'Membership Date',
};

const triggerLabel = (wf, cards, tags, calendars) => {
  switch (wf.trigger_type) {
    case 'tag':
      return `Group: ${tags.find((t) => t.id === wf.trigger_tag_id)?.name || 'Unknown'}`;
    case 'calendar_date':
      return `Calendar: ${calendars.find((c) => c.id === wf.trigger_calendar_id)?.name || 'Unknown'}`;
    case 'person_date':
      return `Person date: ${PERSON_DATE_LABELS[wf.trigger_person_date_field] || wf.trigger_person_date_field}`;
    case 'connect_card':
    default:
      if (wf.trigger_connect_card_id) return `Card: ${cards.find((c) => c.id === wf.trigger_connect_card_id)?.name || 'Unknown'}`;
      return 'Connect card';
  }
};

export default function ConnectCards() {
  const [cards, setCards] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [steps, setSteps] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [submitCard, setSubmitCard] = useState(null);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [shareCard, setShareCard] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [analyticsWorkflow, setAnalyticsWorkflow] = useState(null);
  const [bulkEnrollWorkflow, setBulkEnrollWorkflow] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getConnectCardData', {});
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      setCards(data.cards || []);
      setWorkflows(data.workflows || []);
      setEnrollments(data.enrollments || []);
      setUsers(data.users || []);
      setTags(data.tags || []);
      setSteps(data.steps || {});
      const cals = await base44.entities.DepartmentCalendar.list().catch(() => []);
      setCalendars(cals);
    } catch (err) {
      console.error('Failed to load connect cards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEnrollmentCount = (wfId) => enrollments.filter((e) => e.workflow_id === wfId && e.status === 'active').length;
  const getCardWorkflow = (cardWfId) => workflows.find((w) => w.id === cardWfId);

  const handleDeleteCard = async (card) => {
    if (!confirm(`Delete connect card "${card.name}"?`)) return;
    try {
      await base44.entities.ConnectCard.delete(card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (err) {
      alert('Failed to delete card.');
    }
  };

  const handleDeleteWorkflow = async (wf) => {
    if (!confirm(`Delete workflow "${wf.name}" and all its steps?`)) return;
    try {
      const wfSteps = steps[wf.id] || [];
      if (wfSteps.length > 0) {
        await base44.entities.WorkflowStep.deleteMany({ workflow_id: wf.id });
      }
      await base44.entities.Workflow.delete(wf.id);
      setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
      setSteps((prev) => { const n = { ...prev }; delete n[wf.id]; return n; });
      if (selectedWorkflow?.id === wf.id) setSelectedWorkflow(null);
    } catch (err) {
      alert('Failed to delete workflow.');
    }
  };

  const handleAddStep = async (wfId, stepData) => {
    try {
      const wfSteps = steps[wfId] || [];
      const sortOrder = wfSteps.length;
      const created = await base44.entities.WorkflowStep.create({ ...stepData, workflow_id: wfId, sort_order: sortOrder });
      setSteps((prev) => ({ ...prev, [wfId]: [...(prev[wfId] || []), created] }));
    } catch (err) {
      alert('Failed to add step.');
    }
  };

  const handleDeleteStep = async (wfId, stepId) => {
    try {
      await base44.entities.WorkflowStep.delete(stepId);
      setSteps((prev) => ({ ...prev, [wfId]: (prev[wfId] || []).filter((s) => s.id !== stepId) }));
    } catch (err) {
      alert('Failed to delete step.');
    }
  };

  const stepIcon = (type) => {
    switch (type) {
      case 'email': return Mail;
      case 'text': return MessageSquare;
      case 'wait': return Clock;
      case 'task': return CheckSquare;
      case 'staff_notify': return Send;
      case 'no_response_alert': return AlertCircle;
      case 'apply_tag': return Tag;
      case 'remove_tag': return Tag;
      default: return Clock;
    }
  };

  const stepLabel = (type) => {
    switch (type) {
      case 'email': return 'Send Email';
      case 'text': return 'Send Text';
      case 'wait': return 'Wait';
      case 'task': return 'Staff Task';
      case 'staff_notify': return 'Notify Staff';
      case 'no_response_alert': return 'No Response Alert';
      case 'apply_tag': return 'Apply Tag';
      case 'remove_tag': return 'Remove Tag';
      default: return type;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Connect Cards & Workflows</h1>
          <p className="text-slate-500 text-sm mt-1">Digital connect cards feed automated follow-up workflows.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplatePicker(true)}>
            <LayoutTemplate size={15} className="mr-1.5" />
            New from Template
          </Button>
          <Button variant="outline" onClick={() => setShowWorkflowForm(true)}>
            <Workflow size={15} className="mr-1.5" />
            New Workflow
          </Button>
          <Button onClick={() => setShowCardForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} className="mr-1.5" />
            New Connect Card
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connect Cards */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Connect Cards</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-sm text-slate-400">Loading...</div>
            ) : cards.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <CreditCard size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No connect cards yet.</p>
              </div>
            ) : (
              cards.map((card) => {
                const wf = getCardWorkflow(card.workflow_id);
                return (
                  <div key={card.id} className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => setEditingCard(card)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm">{card.name}</h3>
                          {card.is_active ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Active</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Inactive</span>
                          )}
                        </div>
                        {card.title && <p className="text-xs text-slate-500 mt-1">{card.title}</p>}
                        {card.keyword && <p className="text-xs text-slate-400 mt-1">Text keyword: <span className="font-mono font-medium text-slate-600">{card.keyword}</span></p>}
                        {wf && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                            <ArrowRight size={12} />
                            Feeds into <span className="font-medium text-slate-700">{wf.name}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100" onClick={(e) => e.stopPropagation()}><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSubmitCard(card)}><Send size={14} className="mr-1.5" />Submit Entry</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShareCard(card)}><QrCode size={14} className="mr-1.5" />Share / Embed</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingCard(card)}><Pencil size={14} className="mr-1.5" />Edit Card</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteCard(card)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Workflows */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Automated Workflows</h2>
          <div className="space-y-3">
            {workflows.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Workflow size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No workflows yet.</p>
              </div>
            ) : (
              workflows.map((wf) => {
                const wfSteps = steps[wf.id] || [];
                const activeCount = getEnrollmentCount(wf.id);
                const isExpanded = selectedWorkflow?.id === wf.id;
                return (
                  <div key={wf.id} className="bg-white rounded-xl border border-slate-200">
                    <div
                      className="flex items-start justify-between p-4 cursor-pointer"
                      onClick={() => setSelectedWorkflow(isExpanded ? null : wf)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm">{wf.name}</h3>
                          {wf.is_active ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Active</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Inactive</span>
                          )}
                        </div>
                        {wf.description && <p className="text-xs text-slate-500 mt-1">{wf.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span>{wfSteps.length} steps</span>
                          <span>{activeCount} active enrollments</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs">
                          <span className="text-slate-400">Trigger:</span>
                          <span className="font-medium text-slate-600">{triggerLabel(wf, cards, tags, calendars)}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100" onClick={(e) => e.stopPropagation()}><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAnalyticsWorkflow(wf); }}><BarChart3 size={14} className="mr-1.5" />Analytics</DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setBulkEnrollWorkflow(wf); }}><Users size={14} className="mr-1.5" />Bulk Enroll</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf); }}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                        <div className="space-y-2">
                          {wfSteps.map((step, idx) => {
                            const StepIcon = stepIcon(step.step_type);
                            return (
                              <div key={step.id} className="flex items-start gap-3 group">
                                <div className="flex flex-col items-center">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <StepIcon size={14} className="text-slate-500" />
                                  </div>
                                  {idx < wfSteps.length - 1 && <div className="w-px h-6 bg-slate-200" />}
                                </div>
                                <div className="flex-1 min-w-0 pb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-900">{stepLabel(step.step_type)}</span>
                                    {step.delay_days > 0 && <span className="text-[10px] text-slate-400">after {step.delay_days} {(step.delay_unit || 'days') === 'hours' ? 'hour' : 'day'}{step.delay_days > 1 ? 's' : ''}</span>}
                                    <button onClick={() => handleDeleteStep(wf.id, step.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                  {step.subject && <p className="text-xs text-slate-500 truncate">Subject: {step.subject}</p>}
                                  {step.body && <p className="text-xs text-slate-400 truncate mt-0.5">{step.body}</p>}
                                  {step.task_description && <p className="text-xs text-slate-500">{step.task_description}</p>}
                                  {(step.step_type === 'staff_notify' || step.step_type === 'no_response_alert') && (
                                    <p className="text-xs text-slate-500">
                                      {step.step_type === 'no_response_alert' ? 'Alert' : 'Notify'} {users.find((u) => u.id === step.assigned_to_user_id)?.full_name || users.find((u) => u.id === step.assigned_to_user_id)?.email || 'staff'} via {step.notify_method || 'email'}
                                    </p>
                                  )}
                                  {(step.step_type === 'staff_notify' || step.step_type === 'no_response_alert') && step.body && <p className="text-xs text-slate-400 truncate mt-0.5">{step.body}</p>}
                                  {(step.step_type === 'apply_tag' || step.step_type === 'remove_tag') && step.tag_id && (
                                    <p className="text-xs text-slate-500">{step.step_type === 'apply_tag' ? 'Apply' : 'Remove'} tag: {tags.find((t) => t.id === step.tag_id)?.name || 'Unknown'}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {wfSteps.length === 0 && <p className="text-xs text-slate-400 py-2">No steps yet. Add one below.</p>}
                        </div>
                        <AddStepButton onAdd={(data) => handleAddStep(wf.id, data)} users={users} tags={tags} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Card Form */}
      {(showCardForm || editingCard) && (
        <CardForm
          workflows={workflows}
          tags={tags}
          editingCard={editingCard}
          onSave={async (data) => {
            try {
              const payload = editingCard ? { id: editingCard.id, ...data } : data;
              const res = await base44.functions.invoke('saveConnectCard', payload);
              const result = res.data;
              if (result?.error) throw new Error(result.error);
              if (editingCard) {
                setCards((prev) => prev.map((c) => c.id === editingCard.id ? result : c));
                setEditingCard(null);
              } else {
                setCards((prev) => [...prev, result]);
                setShowCardForm(false);
                setShareCard(result);
              }
            } catch (err) {
              const backendError = err.response?.data?.error || err.message;
              alert('Failed to save card: ' + (backendError || 'Unknown error'));
            }
          }}
          onClose={() => { setShowCardForm(false); setEditingCard(null); }}
        />
      )}

      {/* Submit Entry Dialog */}
      {submitCard && (
        <SubmitEntryDialog
          card={submitCard}
          onClose={() => setSubmitCard(null)}
        />
      )}

      {/* Share Card Dialog */}
      {shareCard && (
        <ShareCardDialog card={shareCard} onClose={() => setShareCard(null)} />
      )}

      {/* Workflow Template Picker */}
      {showTemplatePicker && (
        <WorkflowTemplatePicker
          onCreate={async (template) => {
            try {
              const created = await base44.entities.Workflow.create({ name: template.name, description: template.description, is_active: true });
              const stepsToCreate = template.steps.map((s) => ({
                step_type: s.step_type,
                delay_days: s.delay_days || 0,
                delay_unit: s.delay_unit || 'days',
                subject: s.subject,
                body: s.body,
                task_description: s.task_description,
                notify_method: s.notify_method || 'email',
                guest_info_mode: s.guest_info_mode || (s.info_scope === 'all' ? 'full_info' : s.info_scope === 'contact_only' ? 'contact_only' : 'none'),
                workflow_id: created.id,
                sort_order: s.sort_order
              }));
              const createdSteps = await base44.entities.WorkflowStep.bulkCreate(stepsToCreate);
              setWorkflows((prev) => [...prev, created]);
              setSteps((prev) => ({ ...prev, [created.id]: createdSteps.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) }));
              setShowTemplatePicker(false);
            } catch (err) {
              alert('Failed to create workflow from template.');
            }
          }}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Workflow Analytics */}
      {analyticsWorkflow && (
        <WorkflowAnalytics
          workflow={analyticsWorkflow}
          steps={steps[analyticsWorkflow.id] || []}
          enrollments={enrollments.filter((e) => e.workflow_id === analyticsWorkflow.id)}
          onClose={() => setAnalyticsWorkflow(null)}
        />
      )}

      {/* Bulk Enroll */}
      {bulkEnrollWorkflow && (
        <BulkEnrollDialog
          workflow={bulkEnrollWorkflow}
          tags={tags}
          existingEnrollments={enrollments.filter((e) => e.workflow_id === bulkEnrollWorkflow.id)}
          onEnrolled={(count) => {
            loadData();
            setBulkEnrollWorkflow(null);
            alert(`Successfully enrolled ${count} ${count === 1 ? 'person' : 'people'} in "${bulkEnrollWorkflow.name}".`);
          }}
          onClose={() => setBulkEnrollWorkflow(null)}
        />
      )}

      {/* Workflow Form */}
      {showWorkflowForm && (
        <WorkflowForm
          cards={cards}
          tags={tags}
          calendars={calendars}
          onSave={async (data) => {
            try {
              const created = await base44.entities.Workflow.create(data);
              setWorkflows((prev) => [...prev, created]);
              setSteps((prev) => ({ ...prev, [created.id]: [] }));
              setShowWorkflowForm(false);
            } catch (err) {
              alert('Failed to create workflow.');
            }
          }}
          onClose={() => setShowWorkflowForm(false)}
        />
      )}
    </div>
  );
}

function AddStepButton({ onAdd, users, tags }) {
  const [show, setShow] = useState(false);
  const [type, setType] = useState('email');
  const [delayDays, setDelayDays] = useState('0');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [staffUserId, setStaffUserId] = useState('');
  const [notifyMethod, setNotifyMethod] = useState('email');
  const [delayUnit, setDelayUnit] = useState('days');
  const [guestInfoMode, setGuestInfoMode] = useState('none');
  const [tagId, setTagId] = useState('');

  const handleAdd = () => {
    const data = { step_type: type, delay_days: parseInt(delayDays) || 0, delay_unit: delayUnit };
    if (type === 'email' || type === 'text') {
      data.subject = subject;
      data.body = body;
      data.guest_info_mode = guestInfoMode;
    }
    if (type === 'task') {
      data.task_description = taskDescription;
    }
    if (type === 'staff_notify' || type === 'no_response_alert') {
      data.assigned_to_user_id = staffUserId;
      data.notify_method = notifyMethod;
      data.guest_info_mode = guestInfoMode;
      data.body = body;
    }
    if (type === 'apply_tag' || type === 'remove_tag') {
      data.tag_id = tagId;
    }
    onAdd(data);
    setShow(false);
    setType('email');
    setDelayDays('0');
    setSubject('');
    setBody('');
    setTaskDescription('');
    setStaffUserId('');
    setNotifyMethod('email');
    setDelayUnit('days');
    setGuestInfoMode('none');
    setTagId('');
  };

  const guestInfoSelect = (
    <div>
      <Label className="text-[10px] text-slate-500">Guest info to include</Label>
      <Select value={guestInfoMode} onValueChange={setGuestInfoMode}>
        <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None — no guest info</SelectItem>
          <SelectItem value="name_greeting">Name greeting — personalize with guest's name</SelectItem>
          <SelectItem value="contact_only">Contact info — name, email, phone</SelectItem>
          <SelectItem value="full_info">Full details — all guest info on file</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
        <Plus size={12} />
        Add Step
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] text-slate-500">Step Type</Label>
          <Select value={type} onValueChange={(v) => { setType(v); setGuestInfoMode((v === 'staff_notify' || v === 'no_response_alert') ? 'contact_only' : 'none'); }}>
            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Send Email</SelectItem>
              <SelectItem value="text">Send Text</SelectItem>
              <SelectItem value="wait">Wait</SelectItem>
              <SelectItem value="task">Staff Task</SelectItem>
              <SelectItem value="staff_notify">Notify Staff</SelectItem>
              <SelectItem value="no_response_alert">No Response Alert</SelectItem>
              <SelectItem value="apply_tag">Apply Tag</SelectItem>
              <SelectItem value="remove_tag">Remove Tag</SelectItem>
              </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-slate-500">Timing</Label>
          <div className="flex gap-2 mt-0.5">
            <Input type="number" value={delayDays} onChange={(e) => setDelayDays(e.target.value)} className="h-8 text-xs w-16" />
            <Select value={delayUnit} onValueChange={setDelayUnit}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours from visit</SelectItem>
                <SelectItem value="days">Days from visit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {(type === 'email' || type === 'text') && (
        <>
          <div>
            <Label className="text-[10px] text-slate-500">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-xs mt-0.5" />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="text-xs mt-0.5" rows={2} />
            <p className="text-[10px] text-slate-400 mt-0.5">Merge fields: {'{{first_name}}'}, {'{{last_name}}'}, {'{{church_name}}'}, {'{{full_name}}'}</p>
          </div>
          {guestInfoSelect}
        </>
      )}
      {type === 'task' && (
        <div>
          <Label className="text-[10px] text-slate-500">Task Description</Label>
          <Input value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className="h-8 text-xs mt-0.5" placeholder="e.g., Call this guest to say hi" />
        </div>
      )}
      {(type === 'staff_notify' || type === 'no_response_alert') && (
        <>
          {type === 'no_response_alert' && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-[10px] text-amber-700">
              This alert fires after the delay below — set it to fire a few days after your email step so staff can follow up with guests who haven't replied.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-slate-500">Staff Member</Label>
              <select value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} className="mt-0.5 w-full h-8 px-2 rounded-md border border-input bg-transparent text-xs">
                <option value="">Select...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Method</Label>
              <Select value={notifyMethod} onValueChange={setNotifyMethod}>
                <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {guestInfoSelect}
          <div>
            <Label className="text-[10px] text-slate-500">{type === 'no_response_alert' ? 'Follow-up Instructions' : 'Instructions for Staff'}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="text-xs mt-0.5" rows={2} placeholder={type === 'no_response_alert' ? "e.g., Guest hasn't replied to our email — call them personally to check in and invite them to Sunday service." : "e.g., Call within 48 hours. Mention the Sunday service. Invite to coffee."} />
          </div>
        </>
      )}
      {(type === 'apply_tag' || type === 'remove_tag') && (
        <div>
          <Label className="text-[10px] text-slate-500">{type === 'apply_tag' ? 'Tag to Apply' : 'Tag to Remove'}</Label>
          <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="mt-0.5 w-full h-8 px-2 rounded-md border border-input bg-transparent text-xs">
            <option value="">Select a tag...</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => setShow(false)}>Cancel</Button>
        <Button size="sm" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs">Add Step</Button>
      </div>
    </div>
  );
}

function WorkflowForm({ cards, tags, calendars, onSave, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('connect_card');
  const [triggerConnectCardId, setTriggerConnectCardId] = useState('');
  const [triggerTagId, setTriggerTagId] = useState('');
  const [triggerCalendarId, setTriggerCalendarId] = useState('');
  const [triggerPersonDateField, setTriggerPersonDateField] = useState('birth_date');

  const handleSave = () => {
    const data = { name, description: description || undefined, is_active: true, trigger_type: triggerType };
    if (triggerType === 'connect_card' && triggerConnectCardId) data.trigger_connect_card_id = triggerConnectCardId;
    if (triggerType === 'tag' && triggerTagId) data.trigger_tag_id = triggerTagId;
    if (triggerType === 'calendar_date' && triggerCalendarId) data.trigger_calendar_id = triggerCalendarId;
    if (triggerType === 'person_date') data.trigger_person_date_field = triggerPersonDateField;
    onSave(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Workflow</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. First-Time Guest Follow-up" className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Trigger Type</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="connect_card">Connect Card</SelectItem>
                <SelectItem value="tag">Group / Tag</SelectItem>
                <SelectItem value="calendar_date">Calendar Date</SelectItem>
                <SelectItem value="person_date">Person Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {triggerType === 'connect_card' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Triggering Connect Card</Label>
              <select value={triggerConnectCardId} onChange={(e) => setTriggerConnectCardId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="">Select a connect card...</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {triggerType === 'tag' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Triggering Group / Tag</Label>
              <select value={triggerTagId} onChange={(e) => setTriggerTagId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="">Select a group/tag...</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {triggerType === 'calendar_date' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Triggering Calendar</Label>
              <select value={triggerCalendarId} onChange={(e) => setTriggerCalendarId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="">Select a calendar...</option>
                {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {triggerType === 'person_date' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Person Date Field</Label>
              <Select value={triggerPersonDateField} onValueChange={setTriggerPersonDateField}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="birth_date">Birthday</SelectItem>
                  <SelectItem value="first_visit_date">First Visit Date</SelectItem>
                  <SelectItem value="baptism_date">Baptism Date</SelectItem>
                  <SelectItem value="membership_date">Membership Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">Create Workflow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}