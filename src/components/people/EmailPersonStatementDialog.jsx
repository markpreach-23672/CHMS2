import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import moment from 'moment';

export default function EmailPersonStatementDialog({ person, onClose }) {
  const currentYear = moment().year();
  const [reportType, setReportType] = useState('ytd'); // ytd | annual
  const [year, setYear] = useState(currentYear.toString());
  const [greeting, setGreeting] = useState(`Dear ${person.first_name},`);
  const [message, setMessage] = useState(
    `Thank you for your generous and faithful giving. Your contributions make the ministry of our church possible, and we are deeply grateful for your partnership.`
  );
  const [footer, setFooter] = useState(
    'No goods or services were provided in exchange for these contributions, making them fully tax-deductible to the extent allowed by law.'
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('sendGivingStatement', {
        person_id: person.id,
        year: parseInt(reportType === 'ytd' ? currentYear : year),
        start_date: reportType === 'ytd' ? `${currentYear}-01-01` : undefined,
        end_date: reportType === 'ytd' ? moment().format('YYYY-MM-DD') : undefined,
        custom_greeting: greeting,
        custom_message: message,
        custom_footer: footer,
      });
      setResult(response.data);
    } catch (err) {
      setResult({ error: err.message || 'Failed to send statement.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={18} className="text-indigo-600" />
            Email Contribution Report
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ytd">Year to Date ({currentYear})</SelectItem>
                      <SelectItem value="annual">Annual Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reportType === 'annual' && (
                  <div>
                    <Label className="text-xs font-medium text-slate-600">Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Greeting</Label>
                <Input value={greeting} onChange={(e) => setGreeting(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Note of Appreciation</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">501(c)(3) Tax Statement</Label>
                <Textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={3} className="mt-1 text-sm" />
              </div>
              <p className="text-xs text-slate-400">
                The report will be sent to {person.email || 'this person'} with their full giving record for the selected period.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSend} disabled={sending || !person.email} className="bg-indigo-600 hover:bg-indigo-700">
                {sending ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Sending...</> : <><Mail size={14} className="mr-1.5" />Send Report</>}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div>
            <div className="text-center py-4">
              {result.error || result.sent === 0 ? (
                <>
                  <AlertCircle size={36} className="mx-auto text-red-400 mb-3" />
                  <p className="text-sm text-slate-600">{result.error || 'Could not send — no donations or email on file for this period.'}</p>
                </>
              ) : (
                <>
                  <CheckCircle size={36} className="mx-auto text-emerald-500 mb-3" />
                  <p className="text-sm font-medium text-slate-900">Report sent to {person.email}</p>
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={onClose} className="w-full">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}