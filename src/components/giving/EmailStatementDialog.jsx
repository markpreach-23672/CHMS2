import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, CheckCircle, AlertCircle, Loader2, Users, User } from 'lucide-react';
import moment from 'moment';

export default function EmailStatementDialog({ people, onClose }) {
  const [personId, setPersonId] = useState('all');
  const [year, setYear] = useState(moment().year().toString());
  const [combineFamily, setCombineFamily] = useState(false);
  const [dateMode, setDateMode] = useState('year');
  const [startDate, setStartDate] = useState(moment().startOf('year').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const years = Array.from({ length: 5 }, (_, i) => (moment().year() - i).toString());

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('sendGivingStatement', {
        person_id: personId,
        year: parseInt(year),
        combine_family: combineFamily,
        start_date: dateMode === 'custom' ? startDate : undefined,
        end_date: dateMode === 'custom' ? endDate : undefined,
      });
      setResult(response.data);
    } catch (err) {
      setResult({ error: err.message || 'Failed to send statements.' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setSending(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={18} className="text-indigo-600" />
            Email Giving Statements
          </DialogTitle>
        </DialogHeader>

        {!result && (
          <>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-slate-600">Recipient</Label>
                <Select value={personId} onValueChange={setPersonId}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All donors with email</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Statement Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Family combine toggle */}
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-slate-600">Statement type:</Label>
                <div className="flex rounded-md border border-slate-200 overflow-hidden">
                  <button type="button" onClick={() => setCombineFamily(false)} className={`px-3 py-1 text-xs flex items-center gap-1 ${!combineFamily ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
                    <User size={12} /> Individual
                  </button>
                  <button type="button" onClick={() => setCombineFamily(true)} className={`px-3 py-1 text-xs flex items-center gap-1 ${combineFamily ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
                    <Users size={12} /> Family
                  </button>
                </div>
              </div>
              {/* Date range */}
              <div>
                <Label className="text-xs font-medium text-slate-600">Period</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Select value={dateMode} onValueChange={setDateMode}>
                    <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">By Year</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {dateMode === 'year' ? (
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-1 flex-1">
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 h-8 px-2 text-xs rounded-md border border-input" />
                      <span className="text-xs text-slate-400">to</span>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 h-8 px-2 text-xs rounded-md border border-input" />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                {combineFamily ? 'Family statements combine giving from all family members into one letter.' : 'Each donor receives their own individual statement.'} Suitable for tax records.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSend} disabled={sending} className="bg-indigo-600 hover:bg-indigo-700">
                {sending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Sending...</> : <><Mail size={14} className="mr-1.5" />Send Statements</>}
              </Button>
            </DialogFooter>
          </>
        )}

        {result && (
          <div>
            {result.error ? (
              <div className="text-center py-4">
                <AlertCircle size={36} className="mx-auto text-red-400 mb-3" />
                <p className="text-sm text-slate-600 mb-1">Failed to send statements.</p>
                <p className="text-xs text-slate-400">{result.error}</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle size={36} className="mx-auto text-emerald-500 mb-3" />
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {result.sent} {result.sent === 1 ? 'statement' : 'statements'} sent
                </p>
                {result.failed > 0 && (
                  <p className="text-xs text-amber-600">{result.failed} failed (no email on file)</p>
                )}
                <div className="mt-4 text-left max-h-40 overflow-y-auto">
                  {result.details?.filter((d) => d.status === 'sent').map((d, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 text-xs text-slate-600">
                      <CheckCircle size={12} className="text-emerald-500" />
                      {d.name} — {d.email}
                    </div>
                  ))}
                  {result.details?.filter((d) => d.status !== 'sent').map((d, i) => (
                    <div key={`f${i}`} className="flex items-center gap-2 py-1 text-xs text-slate-400">
                      <AlertCircle size={12} className="text-amber-400" />
                      {d.name} — {d.status === 'no_email' ? 'No email on file' : 'Failed'}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}