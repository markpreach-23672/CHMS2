import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function TicketsManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [resolving, setResolving] = useState(null);
  const [response, setResponse] = useState('');

  const load = async () => {
    try {
      const list = await base44.entities.HelpDeskTicket.filter(
        filter === 'open' ? { status: 'open' } : {},
        '-created_date'
      );
      setTickets(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setLoading(true);
    load();
  }, [filter]);

  const confirmResolve = async () => {
    if (!resolving) return;
    try {
      await base44.entities.HelpDeskTicket.update(resolving.id, {
        status: 'resolved',
        staff_response: response,
      });
      setResolving(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {['open', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium ${
              filter === f ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'
            }`}
          >
            {f === 'open' ? 'Unresolved' : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
          <Inbox size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400">No {filter === 'open' ? 'unresolved ' : ''}questions</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="p-4 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900">{t.question}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {t.asked_by_name || 'A member'} · {new Date(t.created_date).toLocaleString()}
                  </p>
                  {t.notes && <p className="text-xs text-slate-500 mt-1 italic">AI note: {t.notes}</p>}
                  {t.staff_response && (
                    <p className="text-xs text-emerald-600 mt-1">Staff response: {t.staff_response}</p>
                  )}
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    t.status === 'open' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {t.status}
                </span>
              </div>
              {t.status === 'open' && (
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => { setResolving(t); setResponse(''); }}>
                    <CheckCircle2 size={12} /> Resolve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve question</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-700">{resolving?.question}</p>
          <Textarea
            rows={4}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Optional: note how this was handled"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolving(null)}>
              Cancel
            </Button>
            <Button onClick={confirmResolve}>Mark resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}