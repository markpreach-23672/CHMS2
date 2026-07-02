import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';

export default function PledgeSummaryReport({ pledges, donations, people, funds, onClose }) {
  const getPersonName = (pid) => {
    const p = people.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : 'Anonymous';
  };
  const getFundName = (fid) => funds.find((f) => f.id === fid)?.name || 'General Fund';

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

  const report = useMemo(() => {
    const enriched = pledges.map((p) => {
      const given = calcAmountGiven(p);
      const pct = p.total_amount > 0 ? (given / p.total_amount) * 100 : 0;
      const isPastDue = p.end_date && moment(p.end_date).isBefore(moment(), 'day');
      const met = given >= p.total_amount && p.total_amount > 0;
      return { ...p, given, pct: Math.min(pct, 100), remaining: Math.max(p.total_amount - given, 0), isPastDue, met };
    });

    const totalCommitted = pledges.reduce((s, p) => s + (p.total_amount || 0), 0);
    const totalFulfilled = enriched.reduce((s, p) => s + p.given, 0);
    const overallPct = totalCommitted > 0 ? (totalFulfilled / totalCommitted) * 100 : 0;

    const metMilestones = enriched.filter((p) => p.met);
    const missedMilestones = enriched.filter((p) => !p.met);

    return { totalCommitted, totalFulfilled, overallPct, metMilestones, missedMilestones, enriched };
  }, [pledges, donations]);

  const fmt = (val) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Target size={18} className="text-indigo-600" />
              Pledge Summary Report
            </DialogTitle>
            <button onClick={() => window.print()} className="text-slate-400 hover:text-slate-600 print:hidden">
              <Printer size={16} />
            </button>
          </div>
        </DialogHeader>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-indigo-400 mb-1">
              <Target size={13} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Total Committed</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{fmt(report.totalCommitted)}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
              <TrendingUp size={13} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Fulfilled</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{fmt(report.totalFulfilled)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Overall Progress</span>
            <p className="text-xl font-bold text-slate-900">{report.overallPct.toFixed(0)}%</p>
            <Progress value={report.overallPct} className="h-1.5 mt-1.5" />
          </div>
        </div>

        {/* Met Milestones */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900">Met Milestone</h3>
            <span className="text-xs text-slate-400">({report.metMilestones.length})</span>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-50">
            {report.metMilestones.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No pledges fulfilled yet.</p>
            ) : (
              report.metMilestones.map((p) => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1">
                    {p.person_id ? (
                      <Link to={`/people/${p.person_id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                        {getPersonName(p.person_id)}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-slate-400">Anonymous</span>
                    )}
                    <p className="text-xs text-slate-400">{getFundName(p.fund_id)} · {fmt(p.total_amount)} pledged</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-emerald-600">{fmt(p.given)}</span>
                    <p className="text-xs text-emerald-500">✓ Fulfilled</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Missed Milestones */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-500" />
            <h3 className="text-sm font-semibold text-slate-900">Missed Milestone</h3>
            <span className="text-xs text-slate-400">({report.missedMilestones.length})</span>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-50">
            {report.missedMilestones.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">All pledges are on track!</p>
            ) : (
              report.missedMilestones.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex-1">
                      {p.person_id ? (
                        <Link to={`/people/${p.person_id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                          {getPersonName(p.person_id)}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">Anonymous</span>
                      )}
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{getFundName(p.fund_id)}</span>
                      {p.isPastDue && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Past Due</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">{fmt(p.given)}</span>
                      <span className="text-xs text-slate-400"> / {fmt(p.total_amount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={p.pct} className="h-1.5 flex-1" />
                    <span className="text-xs font-semibold text-slate-600 w-9 text-right">{p.pct.toFixed(0)}%</span>
                    <span className="text-xs text-slate-400 w-20 text-right">{fmt(p.remaining)} left</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}