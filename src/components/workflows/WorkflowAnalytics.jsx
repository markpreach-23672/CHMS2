import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, TrendingUp, CheckCircle, Activity, Percent } from 'lucide-react';

const STEP_LABELS = {
  email: 'Send Email',
  text: 'Send Text',
  wait: 'Wait',
  task: 'Staff Task',
  staff_notify: 'Notify Staff',
  no_response_alert: 'No Response Alert',
  apply_tag: 'Apply Tag',
  remove_tag: 'Remove Tag'
};

export default function WorkflowAnalytics({ workflow, steps, enrollments, onClose }) {
  const total = enrollments.length;
  const active = enrollments.filter((e) => e.status === 'active').length;
  const completed = enrollments.filter((e) => e.status === 'completed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sortedSteps = [...steps].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const stats = [
    { label: 'Enrolled', value: total, icon: Users, color: 'text-slate-900', bg: 'bg-slate-50' },
    { label: 'Active', value: active, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rate', value: `${completionRate}%`, icon: Percent, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500" />
            {workflow.name} — Analytics
          </DialogTitle>
        </DialogHeader>

        {total === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">No enrollments yet. Once people are enrolled in this workflow, analytics will appear here.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`text-center p-3 rounded-lg ${s.bg}`}>
                    <Icon size={16} className={`mx-auto mb-1 ${s.color}`} />
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Funnel */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Step Funnel</div>
              <div className="space-y-2">
                {sortedSteps.map((step, idx) => {
                  const reached = enrollments.filter((e) => e.current_step > idx || e.status === 'completed').length;
                  const pct = total > 0 ? Math.round((reached / total) * 100) : 0;
                  return (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className="w-28 text-xs text-slate-600 truncate flex-shrink-0">
                        {STEP_LABELS[step.step_type] || step.step_type}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                        <div className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-slate-700">
                          {reached} / {total} ({pct}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Shows how many enrolled people have reached each step in the sequence.</p>
            </div>
          </>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}