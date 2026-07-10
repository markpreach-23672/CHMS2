import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Tag, DollarSign, Calendar as CalendarIcon, TrendingUp, ArrowUpRight, UserPlus, Clock } from 'lucide-react';
import GuestFollowupFunnel from '@/components/dashboard/GuestFollowupFunnel';
import { useAuth } from '@/lib/AuthContext';
import MemberDashboard from '@/components/dashboard/MemberDashboard';
import HelpDeskTicketsCard from '@/components/helpdesk/HelpDeskTicketsCard';

function AdminDashboard() {
  const [stats, setStats] = useState({ people: 0, tags: 0, donations: 0, events: 0 });
  const [recentPeople, setRecentPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Person.list('-created_date', 5),
      base44.entities.Tag.list(),
      base44.entities.Donation.list('-donation_date', 10),
      base44.entities.CalendarEvent.list('-start_time', 5),
    ])
      .then(([people, tags, donations, events]) => {
        setRecentPeople(people);
        setStats({
          people: people.length,
          tags: tags.length,
          donations: donations.length,
          events: events.length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total People', value: stats.people, icon: Users, color: 'indigo', link: '/people' },
    { label: 'Active Tags', value: stats.tags, icon: Tag, color: 'emerald', link: '/tags' },
    { label: 'Donations', value: stats.donations, icon: DollarSign, color: 'amber', link: '/giving' },
    { label: 'Upcoming Events', value: stats.events, icon: CalendarIcon, color: 'rose', link: '/calendar' },
  ];

  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back to your church workspace overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[stat.color]}`}>
                  <Icon size={20} />
                </div>
                <ArrowUpRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '—' : stat.value}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <GuestFollowupFunnel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <HelpDeskTicketsCard />
        </div>
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Recently Added People</h2>
            <Link to="/people" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
            ) : recentPeople.length === 0 ? (
              <div className="p-8 text-center">
                <UserPlus size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No people yet</p>
                <Link to="/people" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2 inline-block">
                  Add your first person
                </Link>
              </div>
            ) : (
              recentPeople.map((person) => (
                <Link
                  key={person.id}
                  to={`/people/${person.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {person.photo_url ? (
                      <img src={person.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium text-slate-500">
                        {person.first_name?.[0]}{person.last_name?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {person.first_name} {person.last_name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{person.email || person.phone || 'No contact info'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    person.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                    person.status === 'visitor' ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {person.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <Link to="/people" className="flex flex-col items-start gap-2 p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
              <UserPlus size={20} className="text-indigo-600" />
              <span className="text-sm font-medium text-slate-900">Add Person</span>
              <span className="text-xs text-slate-400">Create a new profile</span>
            </Link>
            <Link to="/tags" className="flex flex-col items-start gap-2 p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
              <Tag size={20} className="text-emerald-600" />
              <span className="text-sm font-medium text-slate-900">Manage Tags</span>
              <span className="text-xs text-slate-400">Organize your people</span>
            </Link>
            <Link to="/giving" className="flex flex-col items-start gap-2 p-4 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all">
              <DollarSign size={20} className="text-amber-600" />
              <span className="text-sm font-medium text-slate-900">Record Gift</span>
              <span className="text-xs text-slate-400">Enter a donation</span>
            </Link>
            <Link to="/calendar" className="flex flex-col items-start gap-2 p-4 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition-all">
              <CalendarIcon size={20} className="text-rose-600" />
              <span className="text-sm font-medium text-slate-900">Add Event</span>
              <span className="text-xs text-slate-400">Schedule something</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    return <div className="p-8 max-w-7xl mx-auto text-sm text-slate-400">Loading...</div>;
  }
  if (user?.role === 'member') {
    return <MemberDashboard user={user} />;
  }
  return <AdminDashboard />;
}