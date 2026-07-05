import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import moment from 'moment';

export default function MonthlyTrendsChart({ donations }) {
  const months = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const m = moment().subtract(i, 'month');
      const monthDonations = donations.filter((d) => moment(d.donation_date).isSame(m, 'month'));
      const total = monthDonations.reduce((s, d) => s + (d.amount || 0), 0);
      data.push({
        month: m.format('MMM'),
        year: m.format('YYYY'),
        fullLabel: m.format('MMM YYYY'),
        total: Math.round(total),
        count: monthDonations.length,
        avg: monthDonations.length > 0 ? total / monthDonations.length : 0,
      });
    }
    return data;
  }, [donations]);

  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const momChange = previous && previous.total > 0
    ? ((current.total - previous.total) / previous.total) * 100
    : null;
  const momDelta = current.total - (previous?.total || 0);

  const ytdTotal = months
    .filter((m) => m.year === moment().format('YYYY'))
    .reduce((s, m) => s + m.total, 0);
  const bestMonth = months.reduce((best, m) => (m.total > best.total ? m : best), months[0]);

  const fmt = (val) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const TrendIcon = momChange === null
    ? Minus
    : momChange >= 0
      ? TrendingUp
      : TrendingDown;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-indigo-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Monthly Donation Trends</h3>
            <p className="text-xs text-slate-400">Total contributions over the last 12 months</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400">YTD Total</p>
            <p className="text-sm font-bold text-slate-900">{fmt(ytdTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Best Month</p>
            <p className="text-sm font-bold text-slate-900">{bestMonth.fullLabel}</p>
            <p className="text-xs text-emerald-600">{fmt(bestMonth.total)}</p>
          </div>
        </div>
      </div>

      {/* MoM comparison banner */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-400">{previous?.fullLabel || 'Last Month'}</p>
          <p className="text-lg font-bold text-slate-700 mt-0.5">{fmt(previous?.total || 0)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{previous?.count || 0} donations</p>
        </div>
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
          <p className="text-xs text-indigo-500">{current?.fullLabel || 'This Month'}</p>
          <p className="text-lg font-bold text-indigo-700 mt-0.5">{fmt(current?.total || 0)}</p>
          <p className="text-xs text-indigo-400 mt-0.5">{current?.count || 0} donations</p>
        </div>
        <div className={`rounded-lg border px-4 py-3 ${momChange !== null && momChange >= 0 ? 'bg-emerald-50 border-emerald-100' : momChange !== null ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
          <p className="text-xs text-slate-400">Month-over-Month</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TrendIcon size={16} className={momChange !== null && momChange >= 0 ? 'text-emerald-600' : momChange !== null ? 'text-red-500' : 'text-slate-400'} />
            <p className={`text-lg font-bold ${momChange !== null && momChange >= 0 ? 'text-emerald-700' : momChange !== null ? 'text-red-600' : 'text-slate-500'}`}>
              {momChange !== null ? `${momChange >= 0 ? '+' : ''}${momChange.toFixed(1)}%` : '—'}
            </p>
          </div>
          <p className={`text-xs mt-0.5 ${momDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {momDelta >= 0 ? '+' : ''}{fmt(Math.abs(momDelta))}
          </p>
        </div>
      </div>

      {/* Area chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
          <Tooltip
            cursor={{ stroke: '#4f46e5', strokeWidth: 1 }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            formatter={(v) => [`$${v.toLocaleString()}`, 'Total']}
            labelFormatter={(label, payload) => {
              const item = payload && payload[0] && payload[0].payload;
              return item ? item.fullLabel : label;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#4f46e5"
            strokeWidth={2.5}
            fill="url(#totalGradient)"
            dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Monthly breakdown table */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Monthly Breakdown</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {[...months].reverse().map((m, idx) => {
            const prev = months[months.length - 1 - idx - 1];
            const change = prev && prev.total > 0 ? ((m.total - prev.total) / prev.total) * 100 : null;
            return (
              <div key={m.fullLabel} className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-xs text-slate-400">{m.fullLabel}</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{fmt(m.total)}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[10px] text-slate-400">{m.count} gifts</p>
                  {change !== null && (
                    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(change).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}