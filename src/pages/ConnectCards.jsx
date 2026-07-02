import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, CreditCard, Workflow, Mail, MessageSquare, Clock, CheckSquare, Trash2, MoreHorizontal, ArrowRight, Send, AlertCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SubmitEntryDialog from '@/components/connectcards/SubmitEntryDialog';

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, w, e, u] = await Promise.all([
        base44.entities.ConnectCard.list(),
        base44.entities.Workflow.list(),
        base44.entities.WorkflowEnrollment.list(),
        base44.entities.User.list(),
      ]);
      setCards(c);
      setWorkflows(w);
      setEnrollments(e);
      setUsers(u);

      const stepsMap = {};
      await Promise.all(w.map(async (wf) => {
        const ws = await base44.entities.WorkflowStep.filter({ workflow_id: wf.id });
        ws.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        stepsMap[wf.id] = ws;
      }));
      setSteps(stepsMap);
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
                  <div key={card.id} className="bg-white rounded-xl border border-slate-200 p-4">
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
                        <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSubmitCard(card)}><Send size={14} className="mr-1.5" />Submit Entry</DropdownMenuItem>
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
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100" onClick={(e) => e.stopPropagation()}><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                                </div>
                              </div>
                            );
                          })}
                          {wfSteps.length === 0 && <p className="text-xs text-slate-400 py-2">No steps yet. Add one below.</p>}
                        </div>
                        <AddStepButton onAdd={(data) => handleAddStep(wf.id, data)} users={users} />
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
      {showCardForm && (
        <CardForm
          workflows={workflows}
          onSave={async (data) => {
            try {
              const created = await base44.entities.ConnectCard.create(data);
              setCards((prev) => [...prev, created]);
              setShowCardForm(false);
            } catch (err) {
              alert('Failed to create card.');
            }
          }}
          onClose={() => setShowCardForm(false)}
        />
      )}

      {/* Submit Entry Dialog */}
      {submitCard && (
        <SubmitEntryDialog
          card={submitCard}
          onClose={() => setSubmitCard(null)}
        />
      )}

      {/* Workflow Form */}
      {showWorkflowForm && (
        <WorkflowForm
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

function AddStepButton({ onAdd, users }) {
  const [show, setShow] = useState(false);
  const [type, setType] = useState('email');
  const [delayDays, setDelayDays] = useState('0');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [staffUserId, setStaffUserId] = useState('');
  const [notifyMethod, setNotifyMethod] = useState('email');
  const [delayUnit, setDelayUnit] = useState('days');
  const [infoScope, setInfoScope] = useState('contact_only');

  const handleAdd = () => {
    const data = { step_type: type, delay_days: parseInt(delayDays) || 0, delay_unit: delayUnit };
    if (type === 'email' || type === 'text') {
      data.subject = subject;
      data.body = body;
    }
    if (type === 'task') {
      data.task_description = taskDescription;
    }
    if (type === 'staff_notify' || type === 'no_response_alert') {
      data.assigned_to_user_id = staffUserId;
      data.notify_method = notifyMethod;
      data.info_scope = infoScope;
      data.body = body;
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
    setInfoScope('contact_only');
  };

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
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Send Email</SelectItem>
              <SelectItem value="text">Send Text</SelectItem>
              <SelectItem value="wait">Wait</SelectItem>
              <SelectItem value="task">Staff Task</SelectItem>
              <SelectItem value="staff_notify">Notify Staff</SelectItem>
              <SelectItem value="no_response_alert">No Response Alert</SelectItem>
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
          </div>
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
          <div>
            <Label className="text-[10px] text-slate-500">Information to Include</Label>
            <Select value={infoScope} onValueChange={setInfoScope}>
              <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contact_only">Contact info only (name, email, phone)</SelectItem>
                <SelectItem value="all">All info on file (address, birthday, status, etc.)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">{type === 'no_response_alert' ? 'Follow-up Instructions' : 'Instructions for Staff'}</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="text-xs mt-0.5" rows={2} placeholder={type === 'no_response_alert' ? "e.g., Guest hasn't replied to our email — call them personally to check in and invite them to Sunday service." : "e.g., Call within 48 hours. Mention the Sunday service. Invite to coffee."} />
          </div>
        </>
      )}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => setShow(false)}>Cancel</Button>
        <Button size="sm" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs">Add Step</Button>
      </div>
    </div>
  );
}

function CardForm({ workflows, onSave, onClose }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keyword, setKeyword] = useState('');
  const [workflowId, setWorkflowId] = useState('');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Connect Card</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Card Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. First-Time Guest Card" className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Display Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome! Tell us about you." className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Text Keyword</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value.toUpperCase())} placeholder="e.g. GUEST" className="mt-1 font-mono" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Trigger Workflow</Label>
            <select value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <option value="">None</option>
              {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, title: title || undefined, description: description || undefined, keyword: keyword || undefined, workflow_id: workflowId || undefined, is_active: true })} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">Create Card</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowForm({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, description: description || undefined, is_active: true })} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">Create Workflow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}