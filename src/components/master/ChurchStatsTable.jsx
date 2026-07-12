import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default function ChurchStatsTable({ churches }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
            <th className="px-4 py-3">Church</th>
            <th className="px-4 py-3 text-right">Members</th>
            <th className="px-4 py-3 text-right">Weekly Income</th>
            <th className="px-4 py-3 text-right">YTD Income</th>
            <th className="px-4 py-3 text-right">Monthly Rate</th>
            <th className="px-4 py-3 text-right">Texts (MTD)</th>
            <th className="px-4 py-3">Links</th>
          </tr>
        </thead>
        <tbody>
          {churches.map((c) => (
            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{c.name}</div>
                <Badge className={`mt-0.5 text-[10px] ${STATUS_COLORS[c.subscription_status] || STATUS_COLORS.trial}`} variant="secondary">
                  {c.subscription_status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right font-semibold">{c.members.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{fmt(c.weeklyIncome)}</td>
              <td className="px-4 py-3 text-right font-semibold">{fmt(c.ytdIncome)}</td>
              <td className="px-4 py-3 text-right">{c.monthly_rate ? fmt(c.monthly_rate) + '/mo' : '—'}</td>
              <td className="px-4 py-3 text-right">{c.textsMtd.toLocaleString()}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  {c.site_url ? (
                    <a href={c.site_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 text-xs">
                      App link <ExternalLink size={11} />
                    </a>
                  ) : <span className="text-xs text-slate-300">No app link</span>}
                  {c.custom_domain && (
                    <a href={c.custom_domain} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 text-xs">
                      Custom link <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {churches.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No churches yet. Click "Add Church" to get started.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}