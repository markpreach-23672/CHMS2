import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, ExternalLink, Download, Users } from 'lucide-react';
import moment from 'moment';

export default function EntryDetailDialog({ entry, form, people, onClose }) {
  const fields = form.fields || [];
  const person = people.find((p) => p.id === entry.person_id);

  const renderValue = (field, value) => {
    if (value === undefined || value === null || value === '') return <span className="text-slate-400">—</span>;

    if (field.type === 'name') {
      return <span className="text-slate-700">{`${value.first || ''} ${value.last || ''}`.trim()}</span>;
    }
    if (field.type === 'address') {
      return <span className="text-slate-700">{[value.street, value.city, value.state, value.zip].filter(Boolean).join(', ')}</span>;
    }
    if (field.type === 'payment') {
      return <span className="text-slate-700">{value.label} (${Number(value.amount).toFixed(2)})</span>;
    }
    if (field.type === 'checkbox') {
      return <span className="text-slate-700">{Array.isArray(value) ? value.join(', ') : value}</span>;
    }
    if (field.type === 'file') {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline text-sm">
          <FileText size={14} className="text-indigo-500" />
          {value.split('/').pop() || 'Download file'}
          <Download size={12} />
        </a>
      );
    }
    if (field.type === 'family_members') {
      if (!Array.isArray(value) || value.length === 0) return <span className="text-slate-400">—</span>;
      return (
        <div className="space-y-2">
          {value.map((member, idx) => (
            <div key={idx} className="text-sm p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={12} className="text-violet-500" />
                <span className="font-medium text-slate-700">{member.first_name} {member.last_name}</span>
                <span className="text-[10px] text-slate-400 capitalize ml-1">({(member.role || 'adult').replace(/_/g, ' ')})</span>
              </div>
              {(member.email || member.phone) && (
                <div className="text-xs text-slate-500">
                  {member.email && <span>{member.email}</span>}
                  {member.email && member.phone && <span> · </span>}
                  {member.phone && <span>{member.phone}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-slate-700">{String(value)}</span>;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Response Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {fields.map((field) => {
            if (field.type === 'section') {
              return <h3 key={field.id} className="text-sm font-semibold text-slate-900 pt-2">{field.label}</h3>;
            }
            const value = entry.data?.[field.id];
            return (
              <div key={field.id}>
                <label className="text-xs font-medium text-slate-500 block mb-0.5">{field.label}</label>
                <div>{renderValue(field, value)}</div>
              </div>
            );
          })}

          <div className="border-t border-slate-100 pt-4 space-y-2">
            {person && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-slate-500">Linked Person</span>
                <a href={`/people/${person.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5">
                  {person.first_name} {person.last_name} <ExternalLink size={10} />
                </a>
              </div>
            )}
            {entry.payment_status && entry.payment_status !== 'free' && entry.payment_status !== 'none' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-slate-500">Payment</span>
                <span className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${entry.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {entry.payment_status}
                  </span>
                  {entry.payment_amount > 0 && <span className="text-slate-600">${entry.payment_amount}</span>}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-slate-500">Submitted</span>
              <span className="text-slate-600 text-xs">{entry.submitted_at ? moment(entry.submitted_at).format('MMM D, YYYY h:mm A') : '—'}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}