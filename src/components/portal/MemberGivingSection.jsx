import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, DollarSign } from 'lucide-react';
import moment from 'moment';

export default function MemberGivingSection({ person }) {
  const [donations, setDonations] = useState([]);
  const [funds, setFunds] = useState([]);
  const [familyIds, setFamilyIds] = useState([person.id]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [all, fundList, familyMembers] = await Promise.all([
          base44.entities.Donation.list('-donation_date', 200),
          base44.entities.Fund.list(),
          person.family_id ? base44.entities.Person.filter({ family_id: person.family_id }) : Promise.resolve([]),
        ]);
        setDonations(all);
        setFunds(fundList);
        setFamilyIds([person.id, ...familyMembers.map((m) => m.id)]);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [person]);

  const mine = donations.filter((d) => familyIds.includes(d.person_id));
  const total = mine.reduce((s, d) => s + (d.amount || 0), 0);
  const fundName = (fid) => funds.find((f) => f.id === fid)?.name || 'Unassigned';
  const fmt = (v) => `$${(v || 0).toFixed(2)}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-900">My Giving</h2>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/giving/statement/${person.id}`} target="_blank">
            <Printer size={14} className="mr-1.5" />Print Statement
          </Link>
        </Button>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Read-only record of your contributions{familyIds.length > 1 ? ' (includes family giving)' : ''}.
      </p>
      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : mine.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No giving recorded yet.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">Date</th>
                <th className="py-2">Fund</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((d) => (
                <tr key={d.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-600">{moment(d.donation_date).format('MMM D, YYYY')}</td>
                  <td className="py-2 text-slate-600">{fundName(d.fund_id)}</td>
                  <td className="py-2 text-right font-medium text-slate-900">{fmt(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mt-3 text-sm font-semibold text-slate-900">Total: {fmt(total)}</div>
        </>
      )}
    </div>
  );
}