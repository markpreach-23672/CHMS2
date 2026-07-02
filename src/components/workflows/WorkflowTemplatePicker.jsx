import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { WORKFLOW_TEMPLATES } from './workflowTemplates';

const STEP_LABELS = {
  email: 'Email',
  text: 'Text',
  wait: 'Wait',
  task: 'Task',
  staff_notify: 'Notify Staff',
  no_response_alert: 'Alert',
  apply_tag: 'Apply Tag',
  remove_tag: 'Remove Tag'
};

export default function WorkflowTemplatePicker({ onCreate, onClose }) {
  const [creating, setCreating] = useState(null);

  const handleSelect = async (template) => {
    setCreating(template.id);
    try {
      await onCreate(template);
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Templates</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2">One-click prebuilt sequences. You can customize steps after creation.</p>
        <div className="grid grid-cols-2 gap-3">
          {WORKFLOW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleSelect(tpl)}
              disabled={creating !== null}
              className="text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
            >
              <div className="text-2xl mb-1">{tpl.emoji}</div>
              <h3 className="font-semibold text-sm text-slate-900">{tpl.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
              <div className="mt-2 space-y-0.5">
                {tpl.steps.map((s, i) => (
                  <div key={i} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="text-slate-300 w-12">{s.delay_days === 0 ? 'Day 0' : `Day ${s.delay_days}`}</span>
                    <span>· {STEP_LABELS[s.step_type] || s.step_type}</span>
                    {s.subject && <span className="truncate text-slate-300">· {s.subject}</span>}
                  </div>
                ))}
              </div>
              {creating === tpl.id && (
                <div className="text-[10px] text-indigo-500 mt-1.5 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Creating...
                </div>
              )}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}