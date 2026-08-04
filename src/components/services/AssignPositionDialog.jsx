import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AssignPositionDialog({ position, people, onAssign, onClose }) {
  const [personId, setPersonId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!personId) return;
    setSaving(true);
    await onAssign(personId, position);
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Fill "{position}"</DialogTitle></DialogHeader>
        <div>
          <Label className="text-xs font-medium text-slate-600">Person</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select person..." /></SelectTrigger>
            <SelectContent>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={saving || !personId} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}