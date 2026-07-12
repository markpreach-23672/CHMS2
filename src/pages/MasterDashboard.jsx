import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import AddChurchDialog from '@/components/master/AddChurchDialog';
import ChurchStatsTable from '@/components/master/ChurchStatsTable';
import { Link } from 'react-router-dom';
import { Building2, Users, DollarSign, Plus, RefreshCw, HeartHandshake, ArrowRight } from 'lucide-react';

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MasterDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadStats = useCallback(() => {
    setLoading(true);
    base44.functions.invoke('masterDashboardStats', {})
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
    loadStats();
  }, [loadStats]);

  if (user && user.role !== 'super_admin') {
    return <div className="p-10 text-center text-slate-500">This page is only available to the master account.</div>;
  }

  if (loading && !stats) {
    return (
      <div className="p-10 flex justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const churches = stats?.churches || [];
  const totals = churches.reduce(
    (acc, c) => ({
      members: acc.members + c.members,
      weekly: acc.weekly + c.weeklyIncome,
      ytd: acc.ytd + c.ytdIncome,
      mrr: acc.mrr + (c.monthly_rate || 0),
    }),
    { members: 0, weekly: 0, ytd: 0, mrr: 0 }
  );

  const cards = [
    { label: 'Churches Signed Up', value: stats?.totalChurches ?? 0, icon: Building2, color: 'text-indigo-500' },
    { label: 'Total Members', value: totals.members.toLocaleString(), icon: Users, color: 'text-emerald-500' },
    { label: 'Combined YTD Giving', value: fmt(totals.ytd), icon: DollarSign, color: 'text-amber-500' },
    { label: 'Monthly Recurring Revenue', value: fmt(totals.mrr), icon: DollarSign, color: 'text-sky-500' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Dashboard</h1>
          <p className="text-sm text-slate-500">All churches across the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStats} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={15} /> Add Church
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <c.icon size={22} className={c.color} />
            <div>
              <div className="text-xl font-bold text-slate-900">{c.value}</div>
              <div className="text-xs text-slate-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Link to="/care-groups" className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <HeartHandshake size={20} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-slate-900 text-sm">Care Groups</div>
          <div className="text-xs text-slate-500">Assign leaders, members, and group calendars for care ministries</div>
        </div>
        <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
      </Link>

      <ChurchStatsTable churches={churches} />

      <AddChurchDialog open={showAdd} onOpenChange={setShowAdd} onCreated={loadStats} />
    </div>
  );
}