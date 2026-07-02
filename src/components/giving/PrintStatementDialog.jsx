import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';

export default function PrintStatementDialog({ people, onClose }) {
  const [personId, setPersonId] = useState('');
  const navigate = useNavigate();

  const handlePrint = () => {
    navigate(`/giving/statement/${personId}`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer size={18} className="text-indigo-600" />
            Print Statement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Select Person</Label>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
            >
              <option value="">Choose a person...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400">
            Opens a printable giving statement with the person's name and mailing address, ready for printing and mailing.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePrint} disabled={!personId} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer size={14} className="mr-1.5" />Open Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}