import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Merge, AlertCircle, Check, ArrowRight } from 'lucide-react';
import moment from 'moment';

export default function DuplicateDetector({ people, onClose, onMerged }) {
  const [merging, setMerging] = useState(null);
  const [merged, setMerged] = useState(new Set());

  const duplicateGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    for (let i = 0; i < people.length; i++) {
      if (seen.has(people[i].id)) continue;
      const matches = [];
      for (let j = i + 1; j < people.length; j++) {
        if (seen.has(people[j].id)) continue;
        const a = people[i], b = people[j];
        const sameEmail = a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase();
        const samePhone = a.phone && b.phone && a.phone === b.phone;
        const sameName = a.first_name?.toLowerCase() === b.first_name?.toLowerCase() &&
          a.last_name?.toLowerCase() === b.last_name?.toLowerCase();
        if (sameEmail || samePhone || sameName) {
          matches.push(b);
          seen.add(b.id);
        }
      }
      if (matches.length > 0) {
        groups.push([people[i], ...matches]);
        seen.add(people[i].id);
      }
    }
    return groups;
  }, [people]);

  const handleMerge = async (primary, secondary) => {
    setMerging({ primary, secondary });
    try {
      const merged = { ...primary };
      const fields = ['email', 'phone', 'mobile', 'address', 'city', 'state', 'zip', 'birth_date', 'photo_url', 'notes', 'gender', 'marital_status', 'first_visit_date', 'baptism_date', 'membership_date'];
      fields.forEach(f => { if (!merged[f] && secondary[f]) merged[f] = secondary[f]; });
      merged.tag_ids = [...new Set([...(primary.tag_ids || []), ...(secondary.tag_ids || [])])];
      merged.custom_fields = { ...(secondary.custom_fields || {}), ...(primary.custom_fields || {}) };
      await base44.entities.Person.update(primary.id, merged);

      const donations = await base44.entities.Donation.filter({ person_id: secondary.id });
      if (donations.length > 0) {
        await base44.entities.Donation.bulkUpdate(donations.map(d => ({ id: d.id, person_id: primary.id })));
      }
      if (!primary.family_id && secondary.family_id) {
        await base44.entities.Person.update(primary.id, { family_id: secondary.family_id, family_role: secondary.family_role });
      }
      await base44.entities.Person.delete(secondary.id);
      setMerged(prev => new Set([...prev, secondary.id]));
      onMerged(primary.id, secondary.id);
    } catch (err) {
      alert('Merge failed: ' + err.message);
    } finally {
      setMerging(null);
    }
  };

  const pendingGroups = duplicateGroups.filter(g => g.filter(p => !merged.has(p.id)).length > 1);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge size={18} className="text-indigo-600" />
            Duplicate Detection
          </DialogTitle>
        </DialogHeader>

        {pendingGroups.length === 0 ? (
          <div className="text-center py-12">
            <Check size={36} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-sm text-slate-600">No duplicates found. Your people database is clean!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle size={14} className="inline mr-1.5 text-amber-500" />
              Found {pendingGroups.length} potential duplicate {pendingGroups.length === 1 ? 'group' : 'groups'}. Review and merge to keep one record per person. Donations, tags, and family links will be transferred.
            </p>
            {pendingGroups.map((group, gi) => {
              const remaining = group.filter(p => !merged.has(p.id));
              if (remaining.length <= 1) return null;
              return (
                <div key={gi} className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Group {gi + 1}</p>
                  <div className="space-y-2">
                    {remaining.map((person, pi) => (
                      <div key={person.id}>
                        {pi > 0 && (
                          <div className="flex items-center gap-2 py-1.5">
                            <div className="flex-1 border-t border-dashed border-slate-200" />
                            <span className="text-[10px] text-slate-400">merge into above</span>
                            <div className="flex-1 border-t border-dashed border-slate-200" />
                          </div>
                        )}
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {person.photo_url ? <img src={person.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-medium text-slate-500">{person.first_name?.[0]}{person.last_name?.[0]}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{person.first_name} {person.last_name}</p>
                            <p className="text-xs text-slate-400">{person.email || 'No email'} · {person.phone || 'No phone'}</p>
                            <p className="text-xs text-slate-400">Status: {person.status} · Joined: {moment(person.created_date).format('MMM D, YYYY')}</p>
                          </div>
                          {pi > 0 && (
                            <Button size="sm" variant="outline" onClick={() => handleMerge(remaining[0], person)} disabled={merging !== null} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                              {merging?.secondary?.id === person.id ? 'Merging…' : <><ArrowRight size={14} className="mr-1" />Merge</>}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}