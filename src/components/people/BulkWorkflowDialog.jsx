import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Workflow, GitBranch } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BulkWorkflowDialog({ selectedIds, onDone, onClose }) {
  const [workflows, setWorkflows] = useState([]);
  const [workflowId, setWorkflowId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Workflow.filter({ is_active: true }, '-created_date', 50)
      .then(setWorkflows)
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  }, []);

  const handleEnroll = async () => {
    if (!workflowId) return;
    setSaving(true);
    try {
      const existing = await base44.entities.WorkflowEnrollment.filter({
        workflow_id: workflowId,
        person_id: { $in: selectedIds },
      });
      const existingIds = new Set(existing.map((e) => e.person_id));
      const toEnroll = selectedIds.filter((id) => !existingIds.has(id));
      if (toEnroll.length > 0) {
        await base44.entities.WorkflowEnrollment.bulkCreate(
          toEnroll.map((personId) => ({
            workflow_id: workflowId,
            person_id: personId,
            current_step: 0,
            enrolled_date: new Date().toISOString(),
            status: 'active',
          }))
        );
      }
      onDone(toEnroll.length, selectedIds.length - toEnroll.length);
    } catch (err) {
      alert('Failed to enroll people into workflow.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch size={18} className="text-indigo-600" />
            Trigger Workflow — {selectedIds.length} {selectedIds.length === 1 ? 'Person' : 'People'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8">
              <Workflow size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No active workflows yet. Create one on the Connect Cards page first.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Select a workflow to enroll everyone into</p>
                <Select value={workflowId} onValueChange={setWorkflowId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a workflow..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                <p className="text-xs text-indigo-700">
                  People already enrolled in this workflow will be skipped automatically.
                </p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleEnroll}
            disabled={!workflowId || saving || workflows.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <GitBranch size={14} className="mr-1.5" />}
            Enroll {selectedIds.length} {selectedIds.length === 1 ? 'Person' : 'People'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}