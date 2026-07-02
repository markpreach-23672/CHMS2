import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import moment from 'moment';

export default function ResponsesView({ form, entries, people, onClose }) {
  const [deleting, setDeleting] = useState(null);

  const fields = form.fields || [];
  const dataFields = fields.filter((f) => f.type !== 'section');

  const getPersonName = (personId) => {
    const person = people.find((p) => p.id === personId);
    return person ? `${person.first_name} ${person.last_name}`.trim() : '—';
  };

  const formatValue = (field, value) => {
    if (value === undefined || value === null || value === '') return '—';
    if (field.type === 'name') return `${value.first || ''} ${value.last || ''}`.trim();
    if (field.type === 'address') return [value.street, value.city, value.state, value.zip].filter(Boolean).join(', ');
    if (field.type === 'payment') return `${value.label} ($${Number(value.amount).toFixed(2)})`;
    if (field.type === 'checkbox') return Array.isArray(value) ? value.join(', ') : value;
    return String(value);
  };

  const handleExport = () => {
    const headers = [...dataFields.map((f) => f.label), 'Linked Person', 'Payment Status', 'Payment Amount', 'Submitted At'];
    const rows = entries.map((entry) => {
      return [
        ...dataFields.map((f) => {
          const val = entry.data?.[f.id];
          const formatted = formatValue(f, val);
          return `"${formatted.replace(/"/g, '""')}"`;
        }),
        `"${getPersonName(entry.person_id)}"`,
        `"${entry.payment_status || 'free'}"`,
        entry.payment_amount || 0,
        `"${entry.submitted_at ? moment(entry.submitted_at).format('YYYY-MM-DD HH:mm') : ''}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title.replace(/\s+/g, '_')}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (entryId) => {
    if (!confirm('Delete this response? This cannot be undone.')) return;
    setDeleting(entryId);
    try {
      await base44.entities.FormEntry.delete(entryId);
      window.location.reload();
    } catch (err) {
      alert('Failed to delete response.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">Responses — {form.title}</DialogTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{entries.length} {entries.length === 1 ? 'response' : 'responses'}</span>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={entries.length === 0}>
                <Download size={14} className="mr-1" /> Export CSV
              </Button>
            </div>
          </div>
        </DialogHeader>

        {entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-slate-400">No responses yet. Share your form to start collecting submissions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {dataFields.slice(0, 4).map((f) => (
                    <th key={f.id} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{f.label}</th>
                  ))}
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Person</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Payment</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    {dataFields.slice(0, 4).map((f) => (
                      <td key={f.id} className="py-2 px-3 text-slate-700 max-w-[180px] truncate">{formatValue(f, entry.data?.[f.id])}</td>
                    ))}
                    <td className="py-2 px-3">
                      {entry.person_id ? (
                        <a href={`/people/${entry.person_id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5 text-xs">
                          {getPersonName(entry.person_id)} <ExternalLink size={10} />
                        </a>
                      ) : <span className="text-slate-400 text-xs">Unlinked</span>}
                    </td>
                    <td className="py-2 px-3">
                      {entry.payment_status && entry.payment_status !== 'free' && entry.payment_status !== 'none' ? (
                        <span className="text-xs">
                          <span className={`px-1.5 py-0.5 rounded-full font-medium ${entry.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{entry.payment_status}</span>
                          {entry.payment_amount > 0 && <span className="text-slate-500 ml-1">${entry.payment_amount}</span>}
                        </span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">{entry.submitted_at ? moment(entry.submitted_at).format('MMM D, h:mm A') : '—'}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => handleDelete(entry.id)} disabled={deleting === entry.id} className="text-slate-400 hover:text-red-500">
                        {deleting === entry.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}