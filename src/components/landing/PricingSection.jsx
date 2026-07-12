import React from 'react';
import { Check } from 'lucide-react';

const included = [
  'Connect Cards & visitor follow-up',
  'Automated workflows & smart staff reminders',
  'Worship & service planning with media library',
  'Giving, pledges & statements',
  'People, families & tags',
  'Calendar with Google sync',
  'Forms, reports & elections',
  'Unlimited staff accounts',
];

export default function PricingSection({ onGetStarted }) {
  return (
    <section className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold tracking-widest uppercase text-indigo-600">Simple Pricing</span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Ministry Simplified. One Price.</h2>
        <p className="mt-4 text-slate-600 max-w-xl mx-auto">No tiers, no hidden add-ons, no complexity. Just the full power of Easy Flow for one flat monthly rate.</p>
      </div>
      <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/60 to-white p-8 sm:p-10 shadow-xl shadow-indigo-100">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">$69</span>
              <span className="text-slate-500 font-medium">/ month</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">Every feature. Every part. One easy flow.</p>
          </div>
          <button onClick={onGetStarted}
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25">
            Get Started Today
          </button>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {included.map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check size={12} strokeWidth={3} />
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}