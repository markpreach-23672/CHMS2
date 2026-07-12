import React from 'react';
import { Users, Music, Zap, DollarSign } from 'lucide-react';

const pillars = [
  {
    icon: Users,
    title: 'Effortless Connections',
    desc: 'Capture visitors, manage members, and keep your church directory accurate and up-to-date with ease.',
    color: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50',
  },
  {
    icon: Music,
    title: 'Seamless Worship Planning',
    desc: 'From songs and chord charts to team assignments and service orders, everything for Sunday morning is a click away.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
  },
  {
    icon: Zap,
    title: 'Automated Care',
    desc: 'Create workflows that run in the background, ensuring no one slips through the cracks.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
  },
  {
    icon: DollarSign,
    title: 'Financial Clarity',
    desc: "Track giving and manage your church's resources with confidence and total transparency.",
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
  },
];

export default function FlowPillars() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <span className="text-xs font-semibold tracking-widest uppercase text-indigo-600">The Easy Flow Philosophy</span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Everything You Need, Flowing Together.</h2>
        <p className="mt-4 max-w-2xl mx-auto text-slate-600">
          Stop jumping between disconnected tools. With Easy Flow, every part of your ministry — from visitor welcome to worship planning to financial stewardship — works in harmony. It's not just a collection of tools; it's a streamlined ecosystem designed to save you time and help you focus on people, not admin.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className={`p-7 rounded-2xl ${p.bg} border border-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all`}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white shadow-md`}>
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-bold text-lg text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}