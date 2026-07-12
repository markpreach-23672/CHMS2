import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { UserPlus, Tag, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import MemberProfileEditor from '@/components/portal/MemberProfileEditor';
import MemberGivingSection from '@/components/portal/MemberGivingSection';
import MemberOnboarding from '@/components/portal/MemberOnboarding';
import MemberTagsCard from '@/components/dashboard/MemberTagsCard';
import HelpDeskChat from '@/components/helpdesk/HelpDeskChat';
import MyTasksWidget from '@/components/tasks/MyTasksWidget';

export default function MemberDashboard({ user }) {
  const [person, setPerson] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const churches = await base44.entities.Church.list();
        if (churches.length) setChurch(churches[0]);
        if (user?.email) {
          const matches = await base44.entities.Person.filter({ email: user.email });
          setPerson(matches[0] || null);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto text-sm text-slate-400">Loading...</div>;
  }

  const firstName = person?.first_name || (user?.full_name ? user.full_name.split(' ')[0] : 'there');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {firstName}</h1>
        <p className="text-slate-500 text-sm mt-1">Here's your personal information, family, tags, and giving.</p>
      </div>

      <MyTasksWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {person ? (
          <>
            <MemberProfileEditor person={person} onSaved={setPerson} />
            <MemberTagsCard person={person} onSaved={setPerson} />
            <MemberGivingSection person={person} />
          </>
        ) : (
          <div className="lg:col-span-2">
            <MemberOnboarding email={user?.email} church={church} onCreated={setPerson} />
          </div>
        )}

        <div className="lg:col-span-2">
          <HelpDeskChat />
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