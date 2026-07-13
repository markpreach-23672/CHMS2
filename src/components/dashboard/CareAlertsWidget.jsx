import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { HeartHandshake } from 'lucide-react';
import { computeCareAlerts } from '@/components/dashboard/careAlertsUtils';

const STREAK_STYLES = {
  3: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  4: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  5: 'bg-red-100 text-red-700 border border-red-300',
  6: 'bg-slate-900 text-white border border-slate-900',
};

export default function CareAlertsWidget() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let user = null;
        try { user = await base44.auth.me(); } catch (e) { /* not logged in */ }
        if (!user) { setAlerts([]); return; }

        const since = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);
        const sinceDate = since.toISOString().split('T')[0];
        const [records, events, people, tags, folders] = await Promise.all([
          base44.entities.AttendanceRecord.filter({ event_date: { $gte: sinceDate } }, '-event_date', 5000),
          base44.entities.CalendarEvent.filter({ start_time: { $gte: since.toISOString() } }, 'start_time', 2000),
          base44.entities.Person.list('first_name', 2000),
          base44.entities.Tag.list('name', 1000),
          base44.entities.TagFolder.list('name', 500),
        ]);

        let all = computeCareAlerts({ records, events, people, tags, folders });

        const isAdmin = ['super_admin', 'church_admin'].includes(user.role);
        if (!isAdmin) {
          const me = people.find((p) => p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase());
          all = me ? all.filter((a) => a.leaderIds.has(me.id)) : [];
        }
        setAlerts(all);
      } catch (err) {
        console.error('CareAlertsWidget error:', err);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || alerts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-8">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <HeartHandshake size={16} className="text-rose-500" />
          <h2 className="font-semibold text-slate-900 text-sm">Care Alerts — Ministry Follow-Up Needed</h2>
        </div>
        <span className="text-xs text-slate-400">{alerts.length} {alerts.length === 1 ? 'person' : 'people'}</span>
      </div>
      <div className="px-5 py-2 flex flex-wrap gap-3 border-b border-slate-50 text-[11px] text-slate-500">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1" />3 missed</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1" />4 missed</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1" />5 missed</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-900 mr-1" />6 missed</span>
      </div>
      <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
        {alerts.map((a) => (
          <Link
            key={`${a.tagId}:${a.person.id}`}
            to={`/people/${a.person.id}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              {a.person.photo_url ? (
                <img src={a.person.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-slate-500">
                  {a.person.first_name?.[0]}{a.person.last_name?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {a.person.first_name} {a.person.last_name}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {a.tagName} · {a.person.mobile || a.person.phone || a.person.email || 'No contact info'}
              </p>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold flex-shrink-0 ${STREAK_STYLES[a.streak]}`}>
              Missed {a.streak} weeks
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}