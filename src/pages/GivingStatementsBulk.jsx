import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import moment from 'moment';

export default function GivingStatementsBulk() {
  const [people, setPeople] = useState([]);
  const [allDonations, setAllDonations] = useState([]);
  const [funds, setFunds] = useState([]);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(moment().year().toString());

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

  const mailRecipients = useMemo(() => {
    // People who have donations in the selected year but NO email
    const personIdsWithDonations = new Set(
      allDonations
        .filter((d) => moment(d.donation_date).year().toString() === year)
        .map((d) => d.person_id)
        .filter(Boolean)
    );
    return people.filter((p) => personIdsWithDonations.has(p.id) && !p.email);
  }, [people, allDonations, year]);

  const getPersonDonations = (pid) => {
    return allDonations
      .filter((d) => d.person_id === pid && moment(d.donation_date).year().toString() === year)
      .sort((a, b) => new Date(a.donation_date) - new Date(b.donation_date));
  };

  const fundName = (fid) => funds.find((f) => f.id === fid)?.name || 'Unassigned';
  const fmt = (v) => `$${v.toFixed(2)}`;
  const years = Array.from({ length: 5 }, (_, i) => (moment().year() - i).toString());

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading statements...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toolbar - hidden when printing */}
      <div className="print:hidden bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link to="/giving" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} />Back to Giving
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{mailRecipients.length} statements to print</span>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => window.print()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Printer size={14} className="mr-1.5" />Print All
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {mailRecipients.length === 0 && (
        <div className="max-w-md mx-auto mt-20 text-center">
          <Printer size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">No mailing statements needed — all donors with {year} contributions have email addresses on file.</p>
        </div>
      )}

      {/* Printable statements */}
      {mailRecipients.map((person, idx) => {
        const personDonations = getPersonDonations(person.id);
        const total = personDonations.reduce((s, d) => s + (d.amount || 0), 0);
        return (
          <div
            key={person.id}
            className="max-w-2xl mx-auto bg-white shadow-sm print:shadow-none print:max-w-none my-8 print:my-0 p-10 print:p-8 print:break-after-page"
            style={{ breakAfter: idx < mailRecipients.length - 1 ? 'page' : 'auto' }}
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
              <p className="text-sm font-medium text-slate-900">{person.first_name} {person.last_name}</p>
              {person.address && <p className="text-sm text-slate-600">{person.address}</p>}
              <p className="text-sm text-slate-600">{[person.city, person.state, person.zip].filter(Boolean).join(', ')}</p>
            </div>

            <p className="text-sm text-slate-700 mb-4">Dear {person.first_name},</p>
            <p className="text-sm text-slate-700 mb-6">
              Thank you for your generous contributions to {church?.name || 'our church'} during {year}. The following is a record of your giving for tax purposes:
            </p>

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
                {personDonations.map((don) => (
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
                  <td colSpan={3} className="py-3 text-right font-bold text-slate-900">Total Giving for {year}:</td>
                  <td className="py-3 text-right font-bold text-slate-900 text-base">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>

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
      })}
    </div>
  );
}