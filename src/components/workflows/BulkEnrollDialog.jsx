import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Users } from 'lucide-react';

export default function BulkEnrollDialog({ workflow, tags, existingEnrollments, onEnrolled, onClose }) {
  const [selectedTagId, setSelectedTagId] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const loadPeople = async (tagId) => {
    setSelectedTagId(tagId);
    if (!tagId) { setPeople([]); return; }
    setLoading(true);
    try {
      const all = await base44.entities.Person.list();
      setPeople(all.filter((p) => (p.tag_ids || []).includes(tagId)));
    } catch (err) {
      setPeople([]);
    }
    setLoading(false);
  };

  const alreadyEnrolledIds = existingEnrollments.filter((e) => e.status === 'active').map((e) => e.person_id);
  const toEnroll = people.filter((p) => !alreadyEnrolledIds.includes(p.id));

  const handleEnroll = async () => {
    if (toEnroll.length === 0) return;
    setEnrolling(true);
    try {
      const records = toEnroll.map((p) => ({
        workflow_id: workflow.id,
        person_id: p.id,
        current_step: 0,
        enrolled_date: new Date().toISOString(),
        status: 'active'
      }));
      await base44.entities.WorkflowEnrollment.bulkCreate(records);
      onEnrolled(records.length);
    } catch (err) {
      alert('Failed to enroll people. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            Bulk Enroll — {workflow.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Select a tag to enroll everyone with that tag into this workflow. People already enrolled will be skipped.</p>
          <div>
            <Label className="text-xs font-medium text-slate-600">Select people by tag</Label>
            <select value={selectedTagId} onChange={(e) => loadPeople(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <option value="">Choose a tag...</option>
              {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          )}

          {!loading && selectedTagId && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">People with this tag</span>
                <span className="font-semibold text-slate-900">{people.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Already enrolled</span>
                <span className="font-semibold text-slate-500">{people.length - toEnroll.length}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-600">To be enrolled</span>
                <span className="font-semibold text-indigo-600">{toEnroll.length}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleEnroll} disabled={toEnroll.length === 0 || enrolling} className="bg-indigo-600 hover:bg-indigo-700">
            {enrolling ? 'Enrolling...' : `Enroll ${toEnroll.length} ${toEnroll.length === 1 ? 'Person' : 'People'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}