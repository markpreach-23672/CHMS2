import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer, Users, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import moment from 'moment';

export default function GivingStatement() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [allDonations, setAllDonations] = useState([]);
  const [funds, setFunds] = useState([]);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statementMode, setStatementMode] = useState(
    new URLSearchParams(window.location.search).get('mode') === 'family' ? 'family' : 'individual'
  );
  const [dateMode, setDateMode] = useState('year');
  const [year, setYear] = useState(moment().year().toString());
  const [startDate, setStartDate] = useState(moment().startOf('year').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));

  useEffect(() => {
    const load = async () => {
      try {
        const [p, d, f, c] = await Promise.all([
          base44.entities.Person.get(id),
          base44.entities.Donation.list('-donation_date', 500),
          base44.entities.Fund.list(),
          base44.entities.Church.list(),
        ]);
        setPerson(p);
        setAllDonations(d);
        setFunds(f);
        if (c.length > 0) setChurch(c[0]);
        if (p.family_id) {
          const members = await base44.entities.Person.filter({ family_id: p.family_id });
          setFamilyMembers(members.filter(m => m.id !== p.id));
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const includedIds = useMemo(() => {
    if (statementMode === 'family' && person?.family_id) {
      return [person.id, ...familyMembers.map(m => m.id)];
    }
    return [person?.id];
  }, [statementMode, person, familyMembers]);

  const rangeDonations = useMemo(() => {
    return allDonations
      .filter((d) => {
        if (!includedIds.includes(d.person_id)) return false;
        if (dateMode === 'year') return moment(d.donation_date).year().toString() === year;
        const dDate = moment(d.donation_date);
        return dDate.isSameOrAfter(moment(startDate)) && dDate.isSameOrBefore(moment(endDate));
      })
      .sort((a, b) => new Date(a.donation_date) - new Date(b.donation_date));
  }, [allDonations, includedIds, dateMode, year, startDate, endDate]);

  const total = rangeDonations.reduce((s, d) => s + (d.amount || 0), 0);
  const fundName = (fid) => funds.find((f) => f.id === fid)?.name || 'Unassigned';
  const fmt = (v) => `$${v.toFixed(2)}`;
  const years = Array.from({ length: 5 }, (_, i) => (moment().year() - i).toString());

  const fundBreakdown = useMemo(() => {
    const byFund = {};
    rangeDonations.forEach(d => {
      const fname = fundName(d.fund_id);
      if (!byFund[fname]) byFund[fname] = { total: 0, count: 0 };
      byFund[fname].total += d.amount || 0;
      byFund[fname].count++;
    });
    return Object.entries(byFund).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
  }, [rangeDonations, funds]);

  const dateLabel = dateMode === 'year'
    ? year
    : `${moment(startDate).format('MMM D, YYYY')} – ${moment(endDate).format('MMM D, YYYY')}`;

  const recipientName = useMemo(() => {
    if (statementMode === 'family' && familyMembers.length > 0) {
      const spouse = familyMembers.find(m => m.family_role === 'spouse');
      if (spouse) return `${person.first_name} & ${spouse.first_name} ${person.last_name}`;
      return [person, ...familyMembers].map(m => `${m.first_name} ${m.last_name}`).join(', ');
    }
    return `${person?.first_name} ${person?.last_name}`;
  }, [statementMode, person, familyMembers]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading statement...</div>;
  if (!person) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Person not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toolbar */}
      <div className="print:hidden bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <Link to="/giving" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft size={16} />Back to Giving
          </Link>
          <Button onClick={() => window.print()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Printer size={14} className="mr-1.5" />Print
          </Button>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {person.family_id && familyMembers.length > 0 && (
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
          )}
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

      {/* Printable statement */}
      <div className="max-w-2xl mx-auto bg-white shadow-sm print:shadow-none print:max-w-none my-8 print:my-0 p-10 print:p-8">
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
          {person.address && <p className="text-sm text-slate-600">{person.address}</p>}
          <p className="text-sm text-slate-600">{[person.city, person.state, person.zip].filter(Boolean).join(', ')}</p>
          {statementMode === 'family' && familyMembers.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">Includes giving from: {[person, ...familyMembers].map(m => `${m.first_name} ${m.last_name}`).join(', ')}</p>
          )}
        </div>

        <p className="text-sm text-slate-700 mb-4">Dear {statementMode === 'family' && familyMembers.length > 0 ? person.first_name + ' & Family' : person.first_name},</p>
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

        {rangeDonations.length === 0 ? (
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
              {rangeDonations.map((don) => (
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
    </div>
  );
}