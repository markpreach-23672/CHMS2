import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Cake, DollarSign, Users, TrendingDown, TrendingUp, Download } from 'lucide-react';
import moment from 'moment';

const COLOR_MAP = {
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  rose: 'bg-rose-50 text-rose-600 border-rose-200',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

function buildReports(data) {
  const { people, donations, funds, families } = data;
  const now = moment();

  return [
    {
      id: 'new_visitors', name: 'New Visitors This Month', description: 'First-time guests this month', icon: UserPlus, color: 'amber',
      compute: () => {
        const visitors = people.filter(p => p.status === 'visitor' && p.created_date && moment(p.created_date).isSame(now, 'month'));
        return {
          columns: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'joined', label: 'Joined' }],
          rows: visitors.map(p => ({ name: `${p.first_name} ${p.last_name}`, email: p.email || '', phone: p.phone || p.mobile || '', joined: moment(p.created_date).format('MMM D, YYYY') })),
        };
      },
    },
    {
      id: 'birthdays', name: 'Birthdays This Month', description: 'Members celebrating this month', icon: Cake, color: 'rose',
      compute: () => {
        const matches = people.filter(p => p.birth_date && moment(p.birth_date).month() === now.month())
          .map(p => ({ name: `${p.first_name} ${p.last_name}`, birthday: moment(p.birth_date).format('MMM D'), turning: now.year() - moment(p.birth_date).year(), email: p.email || '', phone: p.phone || '' }))
          .sort((a, b) => moment(a.birthday, 'MMM D').diff(moment(b.birthday, 'MMM D')));
        return { columns: [{ key: 'name', label: 'Name' }, { key: 'birthday', label: 'Birthday' }, { key: 'turning', label: 'Turning' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }], rows: matches };
      },
    },
    {
      id: 'giving_by_fund', name: 'Giving by Fund', description: 'Donation totals by fund', icon: DollarSign, color: 'emerald',
      compute: () => {
        const fundMap = {};
        donations.forEach(d => { const fid = d.fund_id || 'unassigned'; if (!fundMap[fid]) fundMap[fid] = { count: 0, total: 0 }; fundMap[fid].count++; fundMap[fid].total += d.amount || 0; });
        const rows = Object.entries(fundMap).map(([fid, info]) => ({ fund: funds.find(f => f.id === fid)?.name || 'Unassigned', gifts: info.count, total: `$${info.total.toFixed(2)}` }))
          .sort((a, b) => parseFloat(b.total.replace('$', '')) - parseFloat(a.total.replace('$', '')));
        return { columns: [{ key: 'fund', label: 'Fund' }, { key: 'gifts', label: 'Gifts' }, { key: 'total', label: 'Total' }], rows };
      },
    },
    {
      id: 'giving_by_family', name: 'Giving by Family', description: 'Donation totals by family', icon: Users, color: 'indigo',
      compute: () => {
        const famMap = {};
        donations.forEach(d => {
          const person = people.find(p => p.id === d.person_id); if (!person) return;
          const gid = person.family_id || person.id;
          if (!famMap[gid]) famMap[gid] = { count: 0, total: 0, donors: new Set() };
          famMap[gid].count++; famMap[gid].total += d.amount || 0; famMap[gid].donors.add(person.id);
        });
        const rows = Object.entries(famMap).map(([gid, info]) => {
          const fam = families.find(f => f.id === gid);
          const p = people.find(p => p.id === gid);
          return { family: fam?.family_name || (p ? `${p.first_name} ${p.last_name}` : 'Unknown'), donors: info.donors.size, gifts: info.count, total: `$${info.total.toFixed(2)}` };
        }).sort((a, b) => parseFloat(b.total.replace('$', '')) - parseFloat(a.total.replace('$', '')));
        return { columns: [{ key: 'family', label: 'Family' }, { key: 'donors', label: 'Donors' }, { key: 'gifts', label: 'Gifts' }, { key: 'total', label: 'Total' }], rows };
      },
    },
    {
      id: 'lapsed_donors', name: 'Lapsed Donors', description: 'Gave 90+ days ago, not since', icon: TrendingDown, color: 'slate',
      compute: () => {
        const cutoff = moment().subtract(90, 'days');
        const lastGift = {};
        donations.forEach(d => { const date = moment(d.donation_date); if (!lastGift[d.person_id] || date.isAfter(lastGift[d.person_id].date)) lastGift[d.person_id] = { date, amount: d.amount || 0 }; });
        const rows = Object.entries(lastGift).filter(([, info]) => info.date.isBefore(cutoff)).map(([pid, info]) => {
          const p = people.find(p => p.id === pid);
          return { name: p ? `${p.first_name} ${p.last_name}` : 'Unknown', email: p?.email || '', phone: p?.phone || '', lastGift: info.date.format('MMM D, YYYY'), amount: `$${info.amount.toFixed(2)}` };
        }).sort((a, b) => moment(a.lastGift, 'MMM D, YYYY').diff(moment(b.lastGift, 'MMM D, YYYY')));
        return { columns: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'lastGift', label: 'Last Gift' }, { key: 'amount', label: 'Amount' }], rows };
      },
    },
    {
      id: 'yoy_giving', name: 'Year-over-Year Giving', description: 'This year vs last year by month', icon: TrendingUp, color: 'blue',
      compute: () => {
        const ty = now.year(), ly = ty - 1;
        const rows = [];
        for (let m = 0; m < 12; m++) {
          const tyTotal = donations.filter(d => moment(d.donation_date).year() === ty && moment(d.donation_date).month() === m).reduce((s, d) => s + (d.amount || 0), 0);
          const lyTotal = donations.filter(d => moment(d.donation_date).year() === ly && moment(d.donation_date).month() === m).reduce((s, d) => s + (d.amount || 0), 0);
          rows.push({ month: moment().month(m).format('MMMM'), lastYear: `$${lyTotal.toFixed(2)}`, thisYear: `$${tyTotal.toFixed(2)}`, change: lyTotal > 0 ? `${((tyTotal - lyTotal) / lyTotal * 100).toFixed(1)}%` : '—' });
        }
        return { columns: [{ key: 'month', label: 'Month' }, { key: 'lastYear', label: String(ly) }, { key: 'thisYear', label: String(ty) }, { key: 'change', label: 'Change' }], rows };
      },
    },
  ];
}

export default function PrebuiltReports(data) {
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const reports = buildReports(data);

  const runReport = (report) => {
    setSelectedId(report.id);
    setResult(report.compute());
  };

  const exportCSV = () => {
    if (!result || result.rows.length === 0) return;
    const headers = result.columns.map(c => c.label);
    const rows = result.rows.map(row => result.columns.map(col => row[col.key] || ''));
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedId}-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedReport = reports.find(r => r.id === selectedId);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {reports.map(report => {
          const Icon = report.icon;
          const active = selectedId === report.id;
          return (
            <button key={report.id} onClick={() => runReport(report)}
              className={`text-left p-4 rounded-xl border transition-all ${active ? 'border-indigo-300 bg-indigo-50/30 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${COLOR_MAP[report.color]}`}>
                <Icon size={18} />
              </div>
              <p className="text-sm font-semibold text-slate-900">{report.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{report.description}</p>
            </button>
          );
        })}
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">{selectedReport.name}</h3>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={result.rows.length === 0}>
              <Download size={14} className="mr-1.5" />Export CSV
            </Button>
          </div>
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {result.columns.map(col => (
                    <th key={col.key} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {result.rows.length === 0 ? (
                  <tr><td colSpan={result.columns.length} className="px-4 py-8 text-center text-sm text-slate-400">No data for this report.</td></tr>
                ) : result.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    {result.columns.map(col => (
                      <td key={col.key} className="px-4 py-2.5 text-sm text-slate-700 whitespace-nowrap">{row[col.key] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}