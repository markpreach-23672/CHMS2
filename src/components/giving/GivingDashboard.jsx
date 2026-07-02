import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import moment from 'moment';

export default function GivingDashboard({ donations, funds, people, pledges, loading }) {
  const getPersonName = (pid) => {
    const p = people.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : 'Anonymous';
  };

  const getFundName = (fid) => funds.find((f) => f.id === fid)?.name || 'Unassigned';

  const stats = useMemo(() => {
    const now = moment();
    const thisMonth = donations.filter((d) => moment(d.donation_date).isSame(now, 'month'));
    const lastMonth = donations.filter((d) => moment(d.donation_date).isSame(now.clone().subtract(1, 'month'), 'month'));
    const totalThisMonth = thisMonth.reduce((s, d) => s + (d.amount || 0), 0);
    const totalLastMonth = lastMonth.reduce((s, d) => s + (d.amount || 0), 0);
    const totalAllTime = donations.reduce((s, d) => s + (d.amount || 0), 0);
    const avgDonation = thisMonth.length > 0 ? totalThisMonth / thisMonth.length : 0;
    const uniqueDonors = new Set(thisMonth.map((d) => d.person_id).filter(Boolean)).size;
    const monthChange = totalLastMonth > 0 ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : null;

    return {
      totalThisMonth,
      totalAllTime,
      avgDonation,
      uniqueDonors,
      donationCount: thisMonth.length,
      monthChange,
    };
  }, [donations]);

  const fundColors = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const monthlyDataByFund = useMemo(() => {
    const months = [];
    const fundNames = funds.map((f) => f.name);
    for (let i = 5; i >= 0; i--) {
      const m = moment().subtract(i, 'month');
      const monthDonations = donations.filter((d) => moment(d.donation_date).isSame(m, 'month'));
      const entry = { month: m.format('MMM') };
      fundNames.forEach((fn) => {
        const fid = funds.find((f) => f.name === fn)?.id;
        entry[fn] = Math.round(monthDonations.filter((d) => d.fund_id === fid).reduce((s, d) => s + (d.amount || 0), 0));
      });
      months.push(entry);
    }
    return { data: months, fundNames };
  }, [donations, funds]);

  const fundProgress = useMemo(() => {
    return funds.map((fund) => {
      const fundTotal = donations.filter((d) => d.fund_id === fund.id).reduce((s, d) => s + (d.amount || 0), 0);
      const fundPledges = pledges.filter((p) => p.fund_id === fund.id);
      const totalPledged = fundPledges.reduce((s, p) => s + (p.total_amount || 0), 0);
      const pledgeGiven = fundPledges.reduce((s, p) => s + (p.amount_given || 0), 0);
      const pledgeProgress = totalPledged > 0 ? (pledgeGiven / totalPledged) * 100 : 0;
      return { ...fund, fundTotal, totalPledged, pledgeGiven, pledgeProgress, hasPledges: fundPledges.length > 0 };
    });
  }, [funds, donations, pledges]);

  const recentDonations = useMemo(() => {
    return [...donations]
      .sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))
      .slice(0, 8);
  }, [donations]);

  const fmt = (val) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Giving This Month"
          value={fmt(stats.totalThisMonth)}
          icon={<DollarSign size={20} />}
          color="emerald"
          trend={stats.monthChange}
          subtext={`${stats.donationCount} donations`}
        />
        <StatCard
          label="All-Time Total"
          value={fmt(stats.totalAllTime)}
          icon={<TrendingUp size={20} />}
          color="indigo"
          subtext={`${donations.length} total donations`}
        />
        <StatCard
          label="Avg Donation"
          value={fmt(stats.avgDonation)}
          icon={<ArrowUpRight size={20} />}
          color="blue"
          subtext="This month"
        />
        <StatCard
          label="Donors This Month"
          value={stats.uniqueDonors}
          icon={<Users size={20} />}
          color="amber"
          subtext="Unique contributors"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Giving trend chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Monthly Giving by Fund</h3>
              <p className="text-xs text-slate-400">Last 6 months · stacked by fund</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyDataByFund.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                formatter={(v, name) => [`$${v.toLocaleString()}`, name]}
              />
              {monthlyDataByFund.fundNames.map((fn, i) => (
                <Bar key={fn} dataKey={fn} stackId="a" fill={fundColors[i % fundColors.length]} maxBarSize={50} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {monthlyDataByFund.fundNames.map((fn, i) => (
              <div key={fn} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: fundColors[i % fundColors.length] }} />
                <span className="text-xs text-slate-500">{fn}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent Transactions</h3>
          </div>
          <div className="space-y-3">
            {recentDonations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No transactions yet.</p>
            ) : (
              recentDonations.map((don) => (
                <div key={don.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <DollarSign size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {don.person_id ? (
                      <Link to={`/people/${don.person_id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600 truncate block">
                        {getPersonName(don.person_id)}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-slate-900">Anonymous</p>
                    )}
                    <p className="text-xs text-slate-400 truncate">{getFundName(don.fund_id)} · {moment(don.donation_date).format('MMM D')}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 flex-shrink-0">{fmt(don.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fund progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Fund Progress</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {fundProgress.length === 0 ? (
            <p className="text-sm text-slate-400 col-span-2 text-center py-4">No funds created yet.</p>
          ) : (
            fundProgress.map((fund) => (
              <div key={fund.id} className="border border-slate-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">{fund.name}</h4>
                    <p className="text-xs text-slate-400">{fund.description || 'No description'}</p>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{fmt(fund.fundTotal)}</span>
                </div>

                {/* Total raised bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Total Raised</span>
                    <span>{fund.fundTotal > 0 ? `${donations.filter((d) => d.fund_id === fund.id).length} gifts` : 'No gifts'}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${fund.fundTotal > 0 && stats.totalAllTime > 0 ? Math.min((fund.fundTotal / stats.totalAllTime) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Pledge progress */}
                {fund.hasPledges && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Pledge Progress</span>
                      <span className="font-medium">{fmt(fund.pledgeGiven)} / {fmt(fund.totalPledged)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(fund.pledgeProgress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{fund.pledgeProgress.toFixed(0)}% of pledges fulfilled</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, trend, subtext }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        {trend !== null && trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
    </div>
  );
}