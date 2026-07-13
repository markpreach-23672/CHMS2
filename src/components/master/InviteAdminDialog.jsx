import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function InviteAdminDialog({ church, open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setResult('');
    try {
      const res = await base44.functions.invoke('inviteStaffMember', {
        email: email.trim(),
        role: 'church_admin',
        church_id: church.id,
      });
      setResult(res.data?.message || res.data?.error || 'Done.');
      if (res.data?.success) setEmail('');
    } catch (err) {
      setResult('Failed: ' + (err.message || 'unknown error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Invite Admin — {church?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            This person will receive an email invite and become the church admin (master admin) for this account.
          </p>
          <div>
            <Label className="text-xs">Admin Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@church.org" className="mt-1" />
          </div>
          {result && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">{result}</p>}
          <Button onClick={handleInvite} disabled={sending || !email.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {sending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {sending ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}