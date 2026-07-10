import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MessageSquareText, CheckCircle2, Inbox } from 'lucide-react';

export default function HelpDeskTicketsCard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  const load = async () => {
    try {
      const open = await base44.entities.HelpDeskTicket.filter({ status: 'open' }, '-created_date', 5);
      setTickets(open);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const resolve = async (id) => {
    setResolving(id);
    try {
      await base44.entities.HelpDeskTicket.update(id, { status: 'resolved' });
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquareText size={16} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Unresolved Help Desk Questions</h2>
        </div>
        <Link to="/help-desk" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          View all
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center">
            <Inbox size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No unresolved questions</p>
          </div>
        ) : (
          tickets.map((t) => (
            <div key={t.id} className="px-5 py-3">
              <p className="text-sm text-slate-800">{t.question}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-slate-400">
                  {t.asked_by_name || 'A member'} · {new Date(t.created_date).toLocaleDateString()}
                </p>
                <button
                  onClick={() => resolve(t.id)}
                  disabled={resolving === t.id}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50 flex items-center gap-1"
                >
                  <CheckCircle2 size={12} /> Resolve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}