import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Mail, Send, Loader2 } from 'lucide-react';

export default function EmailMessageDialog({ recipients, onClose }) {
  // recipients: array of { name, email }
  const withEmail = recipients.filter((r) => r.email);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || withEmail.length === 0) return;
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendBulkEmail', {
        recipients: withEmail.map((r) => r.email),
        subject,
        body,
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.message, sent: 0, failed: withEmail.length, total: withEmail.length });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={18} className="text-indigo-600" />
            Send Email
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <p className="text-sm">
              {result.error ? (
                <span className="text-red-600">Error: {result.error}</span>
              ) : (
                <>
                  Sent to <strong>{result.sent}</strong> of {result.total} recipient
                  {result.total === 1 ? '' : 's'}
                  {result.failed > 0 && (
                    <span className="text-amber-600"> ({result.failed} failed)</span>
                  )}
                  .
                </>
              )}
            </p>
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">
                Recipients ({withEmail.length})
              </p>
              <div className="max-h-20 overflow-y-auto text-xs text-slate-500 bg-slate-50 rounded-md p-2">
                {withEmail.length === 0 ? (
                  <p className="text-red-500">No recipients have an email address.</p>
                ) : (
                  withEmail.slice(0, 6).map((r, i) => (
                    <div key={i}>
                      {r.name} — {r.email}
                    </div>
                  ))
                )}
                {withEmail.length > 6 && (
                  <div>...and {withEmail.length - 6} more</div>
                )}
              </div>
            </div>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              autoFocus
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email..."
              rows={6}
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim() || withEmail.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {sending ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <Send size={14} className="mr-1.5" />
                )}
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}