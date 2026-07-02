import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer, Users, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import moment from 'moment';

export default function GivingStatementsBulk() {
  const [people, setPeople] = useState([]);
  const [allDonations, setAllDonations] = useState([]);
  const [funds, setFunds] = useState([]);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statementMode, setStatementMode] = useState('individual');
  const [dateMode, setDateMode] = useState('year');
  const [year, setYear] = useState(moment().year().toString());
  const [startDate, setStartDate] = useState(moment().startOf('year').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));

  useEffect(() => {
    const load = async () => {
      try {
        const [p, d, f, c] = await Promise.all([
          base44.entities.Person.list(),
          base44.entities.Donation.list('-donation_date', 1000),
          base44.entities.Fund.list(),
          base44.entities.Church.list(),
        ]);
        setPeople(p);
        setAllDonations(d);
        setFunds(f);
        if (c.length > 0) setChurch(c[0]);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const inDateRange = (d) => {
    if (dateMode === 'year') return moment(d.donation_date).year().toString() === year;
    const dDate = moment(d.donation_date);
    return dDate.isSameOrAfter(moment(startDate)) && dDate.isSameOrBefore(moment(endDate));
  };

  const dateLabel = dateMode === 'year'
    ? year
    : `${moment(startDate).format('MMM D, YYYY')} – ${moment(endDate).format('MMM D, YYYY')}`;

  const mailRecipients = useMemo(() => {
    const personIdsWithDonations = new Set(
      allDonations.filter(inDateRange).map(d => d.person_id).filter(Boolean)
    );

    if (statementMode === 'family') {
      const families = {};
      people.forEach(p => {
        if (!personIdsWithDonations.has(p.id)) return;
        const fid = p.family_id || `solo-${p.id}`;
        if (!families[fid]) families[fid] = [];
        families[fid].push(p);
      });
      return Object.entries(families)
        .filter(([_, members]) => !members.some(m => m.email))
        .map(([fid, members]) => ({
          id: fid,
          members,
          primary: members.find(m => m.family_role === 'head_of_household') || members[0],
        }));
    }

    return people
      .filter(p => personIdsWithDonations.has(p.id) && !p.email)
      .map(p => ({ id: p.id, primary: p, members: [p] }));
  }, [people, allDonations, year, dateMode, startDate, endDate, statementMode]);

  const getGroupDonations = (group) => {
    const memberIds = new Set(group.members.map(m => m.id));
    return allDonations
      .filter(d => memberIds.has(d.person_id) && inDateRange(d))
      .sort((a, b) => new Date(a.donation_date) - new Date(b.donation_date));
  };

  const getRecipientName = (group) => {
    const { primary, members } = group;
    if (members.length > 1) {
      const spouse = members.find(m => m.family_role === 'spouse');
      if (spouse) return `${primary.first_name} & ${spouse.first_name} ${primary.last_name}`;
      return members.map(m => `${m.first_name} ${m.last_name}`).join(', ');
    }
    return `${primary.first_name} ${primary.last_name}`;
  };

  const getFundBreakdown = (donations) => {
    const byFund = {};
    donations.forEach(d => {
      const fname = funds.find(f => f.id === d.fund_id)?.name || 'Unassigned';
      if (!byFund[fname]) byFund[fname] = { total: 0, count: 0 };
      byFund[fname].total += d.amount || 0;
      byFund[fname].count++;
    });
    return Object.entries(byFund).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
  };

  const fundName = (fid) => funds.find((f) => f.id === fid)?.name || 'Unassigned';
  const fmt = (v) => `$${v.toFixed(2)}`;
  const years = Array.from({ length: 5 }, (_, i) => (moment().year() - i).toString());

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading statements...</div>;
  }

  const renderStatement = (group, idx, isLast) => {
    const donations = getGroupDonations(group);
    const total = donations.reduce((s, d) => s + (d.amount || 0), 0);
    const fundBreakdown = getFundBreakdown(donations);
    const recipientName = getRecipientName(group);
    const { primary } = group;

    return (
      <div
        key={group.id}
        className="max-w-2xl mx-auto bg-white shadow-sm print:shadow-none print:max-w-none my-8 print:my-0 p-10 print:p-8 print:break-after-page"
        style={{ breakAfter: isLast ? 'auto' : 'page' }}
      >
        <div className="text-center pb-6 border-b-2 border-slate-200 mb-6">
          <h1 className="text-xl font-bold text-slate-900">{church?.name || 'Church Name'}</h1>
          {church && (
            <p className="text-xs text-slate-500 mt-1">
              {[church.address, church.city, church.state, church.zip].filter(Boolean).join(', ')}
              {church.phone && ` · ${church.phone}`}
            </p>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-4">{moment().format('MMMM D, YYYY')}</p>

        <div className="mb-6">
          <p className="text-sm font-medium text-slate-900">{recipientName}</p>
          {primary.address && <p className="text-sm text-slate-600">{primary.address}</p>}
          <p className="text-sm text-slate-600">{[primary.city, primary.state, primary.zip].filter(Boolean).join(', ')}</p>
          {group.members.length > 1 && (
            <p className="text-xs text-slate-400 mt-1">Includes giving from: {group.members.map(m => `${m.first_name} ${m.last_name}`).join(', ')}</p>
          )}
        </div>

        <p className="text-sm text-slate-700 mb-4">Dear {group.members.length > 1 ? primary.first_name + ' & Family' : primary.first_name},</p>
        <p className="text-sm text-slate-700 mb-6">
          Thank you for your generous contributions to {church?.name || 'our church'} during {dateLabel}. The following is a record of your giving for tax purposes:
        </p>

        {fundBreakdown.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary by Fund</p>
            <table className="w-full text-sm mb-4">
              <tbody>
                {fundBreakdown.map((fund, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">{fund.name}</td>
                    <td className="py-2 text-slate-400 text-right">{fund.count} {fund.count === 1 ? 'gift' : 'gifts'}</td>
                    <td className="py-2 text-slate-900 text-right font-medium w-24">{fmt(fund.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {donations.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-8 text-center">No donations recorded for {dateLabel}.</p>
        ) : (
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2 font-semibold text-slate-700">Date</th>
                <th className="text-left py-2 font-semibold text-slate-700">Fund</th>
                <th className="text-left py-2 font-semibold text-slate-700 capitalize">Method</th>
                <th className="text-right py-2 font-semibold text-slate-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((don) => (
                <tr key={don.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-600">{moment(don.donation_date).format('MMM D, YYYY')}</td>
                  <td className="py-2 text-slate-600">{fundName(don.fund_id)}</td>
                  <td className="py-2 text-slate-600 capitalize">{don.method}</td>
                  <td className="py-2 text-slate-900 text-right font-medium">{fmt(don.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td colSpan={3} className="py-3 text-right font-bold text-slate-900">Total Giving for {dateLabel}:</td>
                <td className="py-3 text-right font-bold text-slate-900 text-base">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        <p className="text-sm text-slate-700 mb-2">
          Thank you for your faithful generosity and partnership in ministry. If you have any questions about this statement, please contact our office.
        </p>
        <p className="text-sm text-slate-700 mb-6">With gratitude,</p>
        <p className="text-sm font-medium text-slate-900">{church?.name || ''}</p>
        {church?.email && <p className="text-xs text-slate-500">{church.email}</p>}

        <div className="mt-8 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 italic">
            No goods or services were provided in exchange for these contributions, making them fully tax-deductible to the extent allowed by law.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toolbar */}
      <div className="print:hidden bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <Link to="/giving" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft size={16} />Back to Giving
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{mailRecipients.length} statements to print</span>
            <Button onClick={() => window.print()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Printer size={14} className="mr-1.5" />Print All
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">Statement:</Label>
            <div className="flex rounded-md border border-slate-200 overflow-hidden">
              <button onClick={() => setStatementMode('individual')} className={`px-3 py-1 text-xs flex items-center gap-1 ${statementMode === 'individual' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
                <User size={12} /> Individual
              </button>
              <button onClick={() => setStatementMode('family')} className={`px-3 py-1 text-xs flex items-center gap-1 ${statementMode === 'family' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
                <Users size={12} /> Family
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">Period:</Label>
            <Select value={dateMode} onValueChange={setDateMode}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="year">By Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {dateMode === 'year' ? (
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-1">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 h-8 text-xs" />
                <span className="text-xs text-slate-400">to</span>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36 h-8 text-xs" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {mailRecipients.length === 0 && (
        <div className="max-w-md mx-auto mt-20 text-center">
          <Printer size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">No mailing statements needed — all donors with contributions in this period have email addresses on file.</p>
        </div>
      )}

      {/* Printable statements */}
      {mailRecipients.map((group, idx) => renderStatement(group, idx, idx === mailRecipients.length - 1))}
    </div>
  );
}