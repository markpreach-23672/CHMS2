import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle } from 'lucide-react';

export default function SubmitEntryDialog({ card, onClose }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      await base44.functions.invoke('submitConnectCard', {
        connect_card_id: card.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        message
      });
      setSuccess(true);
    } catch (err) {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Entry Submitted!</h3>
          <p className="text-sm text-slate-500 mt-1">{firstName} has been added and the follow-up workflow has been triggered.</p>
          <Button onClick={onClose} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700">Done</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Entry — {card.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Enter the visitor's info. This creates a person record and triggers the linked follow-up workflow.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" autoFocus />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Phone</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Message / Prayer Request</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!firstName.trim() || !email.trim() || submitting} className="bg-indigo-600 hover:bg-indigo-700">
            {submitting ? 'Submitting...' : 'Submit & Trigger Workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}