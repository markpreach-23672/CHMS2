import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

export default function TextMessageDialog({ recipients, onClose }) {
  // recipients: array of { name, phone }
  const withPhone = recipients.filter((r) => r.phone);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const charCount = message.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));

  const handleSend = async () => {
    if (!message.trim() || withPhone.length === 0) return;
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendSMS', {
        recipients: withPhone.map((r) => r.phone),
        message,
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.message, sent: 0, failed: withPhone.length, total: withPhone.length });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-600" />
            Send Text Message
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
                Recipients ({withPhone.length})
              </p>
              <div className="max-h-24 overflow-y-auto text-xs text-slate-500 space-y-0.5 bg-slate-50 rounded-md p-2">
                {withPhone.length === 0 ? (
                  <p className="text-red-500">No recipients have a phone number.</p>
                ) : (
                  withPhone.slice(0, 8).map((r, i) => (
                    <div key={i}>
                      {r.name} — {r.phone}
                    </div>
                  ))
                )}
                {withPhone.length > 8 && (
                  <div>...and {withPhone.length - 8} more</div>
                )}
              </div>
            </div>
            <div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={5}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">
                {charCount} chars · {segments} SMS segment{segments > 1 ? 's' : ''}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !message.trim() || withPhone.length === 0}
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