import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { base44 } from '@/api/base44Client';
import { UserCheck } from 'lucide-react';

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

export default function GuestFollowupFunnel() {
  const [funnel, setFunnel] = useState(null);
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
        if (!card) { setFunnel(null); return; }
        const wfId = card.workflow_id;
        const workflow = workflows.find((w) => w.id === wfId);
        const steps = allSteps
          .filter((s) => s.workflow_id === wfId)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const enrollments = allEnrollments.filter((e) => e.workflow_id === wfId);
        const totalGuests = enrollments.length;
        const rows = [{ label: 'Filled Card', count: totalGuests, start: true }];
        steps.forEach((step, i) => {
          const done = enrollments.filter((e) => {
            const stepsDone = e.status === 'completed' ? steps.length : e.current_step || 0;
            return stepsDone > i;
          }).length;
          rows.push({ label: `${i + 1}. ${STEP_LABELS[step.step_type] || step.step_type}`, count: done });
        });
        setFunnel(rows);
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
    <div className="bg-white rounded-xl border border-slate-200 mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">First-Time Guest Follow-up</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
          <UserCheck size={18} />
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">Loading chart…</div>
        ) : !funnel ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">No First-Time Guest connect card found.</div>
        ) : meta.totalGuests === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">No guests have filled out this card yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" name="Guests" radius={[0, 4, 4, 0]}>
                {funnel.map((entry, i) => (
                  <Cell key={i} fill={entry.start ? '#4f46e5' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}