import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UserCheck, ClipboardList } from 'lucide-react';
import FunnelBarChart from '@/components/dashboard/FunnelBarChart';

const STEP_LABELS = {
  email: 'Email',
  text: 'Text',
  wait: 'Wait',
  task: 'Task',
  staff_notify: 'Staff Notify',
  no_response_alert: 'No-Response Alert',
  apply_tag: 'Apply Tag',
  remove_tag: 'Remove Tag',
};

const TASK_TYPES = ['task', 'staff_notify', 'no_response_alert'];

export default function GuestFollowupFunnel() {
  const [guestRows, setGuestRows] = useState(null);
  const [taskRows, setTaskRows] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ConnectCard.list(),
      base44.entities.Workflow.list(),
      base44.entities.WorkflowStep.list(),
      base44.entities.WorkflowEnrollment.list(),
    ])
      .then(([cards, workflows, allSteps, allEnrollments]) => {
        const card = cards.find((c) => /first.?time.?guest/i.test(c.name) || /first.?time.?guest/i.test(c.title || ''));
        if (!card) { setGuestRows(null); return; }
        const wfId = card.workflow_id;
        const workflow = workflows.find((w) => w.id === wfId);
        const steps = allSteps
          .filter((s) => s.workflow_id === wfId)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const enrollments = allEnrollments.filter((e) => e.workflow_id === wfId);
        const totalGuests = enrollments.length;

        const gRows = [{ label: 'Filled Card', count: totalGuests, start: true }];
        const tRows = [];
        steps.forEach((step, i) => {
          const done = enrollments.filter((e) => {
            const stepsDone = e.status === 'completed' ? steps.length : e.current_step || 0;
            return stepsDone > i;
          }).length;
          const row = { label: `${i + 1}. ${STEP_LABELS[step.step_type] || step.step_type}`, count: done };
          if (TASK_TYPES.includes(step.step_type)) tRows.push(row);
          else gRows.push(row);
        });
        setGuestRows(totalGuests > 0 ? gRows : []);
        setTaskRows(totalGuests > 0 ? tRows : []);
        setMeta({ workflowName: workflow?.name || 'Follow-up Workflow', totalGuests, stepCount: steps.length });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const subtitle = loading
    ? 'Loading…'
    : !meta
      ? 'No follow-up workflow found'
      : `${meta.totalGuests} guest${meta.totalGuests === 1 ? '' : 's'} filled out the card · ${meta.stepCount} follow-up step${meta.stepCount === 1 ? '' : 's'}`;

  return (
    <>
      <FunnelBarChart
        title="First-Time Guest Follow-up"
        subtitle={subtitle}
        icon={UserCheck}
        iconClass="bg-indigo-50 text-indigo-600"
        rows={loading ? null : guestRows}
        emptyMessage={loading ? 'Loading chart…' : !guestRows ? 'No First-Time Guest connect card found.' : 'No guests have filled out this card yet.'}
        barColor="#10b981"
      />
      <FunnelBarChart
        title="Follow-up Tasks"
        subtitle={loading ? 'Loading…' : 'Task and staff-alert steps in the guest follow-up workflow'}
        icon={ClipboardList}
        iconClass="bg-amber-50 text-amber-600"
        rows={loading ? null : taskRows}
        emptyMessage={loading ? 'Loading chart…' : !taskRows ? 'No First-Time Guest connect card found.' : taskRows && taskRows.length === 0 ? 'No task steps in this workflow yet.' : 'No task activity yet.'}
        barColor="#f59e0b"
        height={200}
      />
    </>
  );
}