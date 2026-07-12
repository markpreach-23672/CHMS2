import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Heart, LogIn, ArrowRight } from 'lucide-react';
import FlowPillars from '@/components/landing/FlowPillars';
import ConnectCardSpotlight from '@/components/landing/ConnectCardSpotlight';
import PricingSection from '@/components/landing/PricingSection';
import SignupForm from '@/components/landing/SignupForm';

export default function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const formRef = useRef(null);

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

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-sm">EF</span>
            </div>
            <div>
              <span className="text-slate-900 font-semibold text-sm block">Easy Flow Church</span>
              <span className="text-slate-400 text-[10px]">Church Management</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 text-sm font-medium hover:text-slate-900 transition-colors">
              <LogIn size={16} /> Sign In
            </Link>
            <button onClick={scrollToForm} className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md shadow-indigo-500/20">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-fuchsia-50/40 to-amber-50/40" />
        <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-indigo-700 text-xs font-medium border border-indigo-100 shadow-sm">
            <Heart size={12} className="text-fuchsia-500" /> All your ministry tools, perfectly unified
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
            Experience the <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Easy Flow</span><br className="hidden sm:block" /> of Church Management.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
            Simple, powerful, and built to help your church grow — without the friction.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={scrollToForm} className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25">
              Get Started for $69/mo <ArrowRight size={16} />
            </button>
            <Link to="/login" className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
              <LogIn size={16} /> Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Easy Flow Pillars */}
      <FlowPillars />

      {/* Connect Card Spotlight */}
      <ConnectCardSpotlight />

      {/* Pricing */}
      <PricingSection onGetStarted={scrollToForm} />

      {/* Signup Form */}
      <section ref={formRef} className="relative overflow-hidden bg-slate-50 border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Ready to find your flow?</h2>
            <p className="mt-3 text-slate-600">Join the churches reclaiming their time and focus. Tell us about your church and we'll get you set up.</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 p-6 sm:p-10">
            <SignupForm />
          </div>
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