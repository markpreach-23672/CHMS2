import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle } from 'lucide-react';
import MemberProfileEditor from '@/components/portal/MemberProfileEditor';
import MemberOnboarding from '@/components/portal/MemberOnboarding';
import MemberGivingSection from '@/components/portal/MemberGivingSection';

export default function MemberPortal() {
  const [user, setUser] = useState(null);
  const [person, setPerson] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        if (!u) { setLoading(false); return; }
        setUser(u);
        const churches = await base44.entities.Church.list();
        if (churches.length) setChurch(churches[0]);
        const matches = await base44.entities.Person.filter({ email: u.email });
        setPerson(matches[0] || null);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-sm w-full text-center">
          <UserCircle size={40} className="mx-auto text-slate-300 mb-3" />
          <h1 className="text-lg font-semibold text-slate-900">Member Portal</h1>
          <p className="text-sm text-slate-500 mt-1 mb-5">Sign in to view and update your profile, family info, and giving.</p>
          <div className="flex flex-col gap-2">
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { window.location.href = '/login'; }}>Sign In</Button>
            <Button variant="outline" onClick={() => { window.location.href = '/register'; }}>Create Account</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">{church?.name || 'Church'} · Member Portal</h1>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut size={15} className="mr-1.5" />Sign Out</Button>
      </header>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {person ? (
          <>
            <MemberProfileEditor person={person} onSaved={setPerson} />
            <MemberGivingSection person={person} />
          </>
        ) : (
          <MemberOnboarding email={user.email} church={church} onCreated={setPerson} />
        )}
      </div>
    </div>
  );
}