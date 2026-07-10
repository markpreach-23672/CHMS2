import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Calendar as CalendarIcon, DollarSign, CreditCard, FileText, BarChart3, Heart, LogIn, UserPlus, ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated()
      .then(async (authed) => {
        if (authed) {
          try {
            const u = await base44.auth.me();
            navigate(u?.role === 'member' ? '/my-family' : '/dashboard', { replace: true });
          } catch (err) {
            navigate('/dashboard', { replace: true });
          }
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const features = [
    { icon: Users, title: 'People', desc: 'Track members, visitors, and families with rich profiles and tags.' },
    { icon: DollarSign, title: 'Giving', desc: 'Record donations, pledges, and generate statements in seconds.' },
    { icon: CalendarIcon, title: 'Calendar', desc: 'Schedule events and sync with Google Calendar.' },
    { icon: CreditCard, title: 'Connect Cards', desc: 'Digital guest cards that trigger automated follow-up workflows.' },
    { icon: FileText, title: 'Forms', desc: 'Build custom forms for registrations, sign-ups, and more.' },
    { icon: BarChart3, title: 'Reports', desc: 'Gain insights with directories, labels, and custom reports.' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-sm">EF</span>
            </div>
            <div>
              <span className="text-slate-900 font-semibold text-sm block">Easy Flow Church</span>
              <span className="text-slate-400 text-[10px]">Church Management</span>
            </div>
          </div>
          <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
            <LogIn size={16} /> Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
            <Heart size={12} /> All-in-one church management
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Grow your church community,<br className="hidden sm:block" /> one connection at a time.
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-slate-600">
            Easy Flow Church brings your people, giving, calendar, and follow-up workflows together — so your team can focus on ministry, not spreadsheets.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login" className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
              <LogIn size={16} /> Sign In to Your Account
            </Link>
            <Link to="/register" className="flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
              <UserPlus size={16} /> Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Everything your church needs</h2>
          <p className="mt-3 text-slate-600">Powerful tools, beautifully simple to use.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="p-6 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all bg-white">
                <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="mt-3 text-slate-300">Sign in to access your church dashboard.</p>
          <Link to="/login" className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors">
            Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Easy Flow Church · Church Management
        </div>
      </footer>
    </div>
  );
}