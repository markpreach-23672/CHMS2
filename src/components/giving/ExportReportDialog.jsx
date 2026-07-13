import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet, Target } from 'lucide-react';
import DateInput from '@/components/ui/date-input';
import moment from 'moment';

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(filename, headers, rows) {
  const csv = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportReportDialog({ donations, pledges, people, funds, onClose }) {
  const [reportType, setReportType] = useState('donations');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fundId, setFundId] = useState('all');

  const getPersonName = (pid) => {
    const p = people.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  };
  const getFundName = (fid) => funds.find((f) => f.id === fid)?.name || 'General Fund';

  const filteredDonations = donations.filter((d) => {
    if (fundId !== 'all' && d.fund_id !== fundId) return false;
    if (dateFrom && moment(d.donation_date).isBefore(moment(dateFrom), 'day')) return false;
    if (dateTo && moment(d.donation_date).isAfter(moment(dateTo), 'day')) return false;
    return true;
  });

  const filteredPledges = pledges.filter((p) => {
    if (fundId !== 'all' && p.fund_id !== fundId) return false;
    return true;
  });

  const calcAmountGiven = (pledge) => {
    return donations
      .filter((d) => {
        if (d.person_id !== pledge.person_id) return false;
        if (pledge.fund_id && d.fund_id !== pledge.fund_id) return false;
        const date = moment(d.donation_date);
        if (pledge.start_date && date.isBefore(moment(pledge.start_date), 'day')) return false;
        if (pledge.end_date && date.isAfter(moment(pledge.end_date), 'day')) return false;
        return true;
      })
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  };

  const donationsTotal = filteredDonations.reduce((s, d) => s + (d.amount || 0), 0);
  const pledgesTotalPledged = filteredPledges.reduce((s, p) => s + (p.total_amount || 0), 0);
  const pledgesTotalGiven = filteredPledges.reduce((s, p) => s + calcAmountGiven(p), 0);

  const handleExport = () => {
    if (reportType === 'donations') {
      const headers = ['Date', 'Person', 'Fund', 'Method', 'Amount', 'Check #', 'Notes'];
      const rows = filteredDonations
        .slice()
        .sort((a, b) => moment(a.donation_date).diff(moment(b.donation_date)))
        .map((d) => [
          moment(d.donation_date).format('YYYY-MM-DD'),
          d.person_id ? getPersonName(d.person_id) : 'Anonymous',
          getFundName(d.fund_id),
          d.method || '',
          (d.amount || 0).toFixed(2),
          d.check_number || '',
          d.notes || '',
        ]);
      rows.push(['', '', '', 'TOTAL', donationsTotal.toFixed(2), '', '']);
      const fundLabel = fundId === 'all' ? 'all-funds' : funds.find((f) => f.id === fundId)?.name?.replace(/\s+/g, '-').toLowerCase() || 'fund';
      const dateLabel = dateFrom || dateTo ? `${dateFrom || 'start'}-to-${dateTo || 'end'}` : 'all-time';
      downloadCSV(`giving-report-${fundLabel}-${dateLabel}.csv`, headers, rows);
    } else {
      const headers = ['Person', 'Fund', 'Total Pledged', 'Amount Given', 'Remaining', '% Fulfilled', 'Start Date', 'End Date', 'Status'];
      const rows = filteredPledges.map((p) => {
        const given = calcAmountGiven(p);
        const remaining = Math.max((p.total_amount || 0) - given, 0);
        const pct = p.total_amount > 0 ? ((given / p.total_amount) * 100).toFixed(1) : '0.0';
        const status = remaining === 0 && given > 0 ? 'Fulfilled' : given > 0 ? 'In Progress' : 'Not Started';
        return [
          p.person_id ? getPersonName(p.person_id) : 'Anonymous',
          getFundName(p.fund_id),
          (p.total_amount || 0).toFixed(2),
          given.toFixed(2),
          remaining.toFixed(2),
          pct + '%',
          p.start_date || '',
          p.end_date || '',
          status,
        ];
      });
      rows.push(['', '', pledgesTotalPledged.toFixed(2), pledgesTotalGiven.toFixed(2), (pledgesTotalPledged - pledgesTotalGiven).toFixed(2), '', '', '', 'TOTAL']);
      downloadCSV(`pledge-summary-${moment().format('YYYY-MM-DD')}.csv`, headers, rows);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={18} className="text-indigo-600" />
            Export Report
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="donations">
                  <span className="flex items-center gap-2"><FileSpreadsheet size={14} /> Giving Report (Donations)</span>
                </SelectItem>
                <SelectItem value="pledges">
                  <span className="flex items-center gap-2"><Target size={14} /> Pledge Summary</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === 'donations' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-600">From Date</Label>
                <DateInput value={dateFrom} onChange={setDateFrom} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">To Date</Label>
                <DateInput value={dateTo} onChange={setDateTo} className="mt-1" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-slate-600">Fund</Label>
            <select value={fundId} onChange={(e) => setFundId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <option value="all">All Funds</option>
              {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Records to export</span>
              <span className="font-semibold text-slate-900">
                {reportType === 'donations' ? filteredDonations.length : filteredPledges.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{reportType === 'donations' ? 'Total amount' : 'Total pledged'}</span>
              <span className="font-semibold text-slate-900">
                ${(reportType === 'donations' ? donationsTotal : pledgesTotalPledged).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {reportType === 'pledges' && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Fulfilled so far</span>
                <span className="font-semibold text-emerald-600">
                  ${pledgesTotalGiven.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {reportType === 'donations' && filteredDonations.length === 0 && (
            <p className="text-xs text-amber-600">No donations match the selected filters.</p>
          )}
          {reportType === 'pledges' && filteredPledges.length === 0 && (
            <p className="text-xs text-amber-600">No pledges match the selected filters.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleExport}
            disabled={reportType === 'donations' ? filteredDonations.length === 0 : filteredPledges.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Download size={15} className="mr-1.5" />
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}