import React from 'react';
import { CreditCard, Bell, MessageSquare, Sparkles } from 'lucide-react';

const points = [
  {
    icon: Sparkles,
    title: 'Smart Automation',
    desc: 'As soon as a guest completes a card, a customized follow-up workflow triggers instantly.',
  },
  {
    icon: Bell,
    title: 'Empowered Staff',
    desc: "We don't just send a generic alert. Staff reminders arrive with the exact key guest information they need to have a genuine conversation — built right into the notification.",
  },
  {
    icon: MessageSquare,
    title: 'Flexible Communication',
    desc: "Email, text, or a personal task — our system adapts to your church's unique style of care.",
  },
];

export default function ConnectCardSpotlight() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <CreditCard size={20} />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-indigo-100">The Connect Card Advantage</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl">Turn Visitors into Family, Automatically.</h2>
        <p className="mt-4 max-w-2xl text-indigo-100">
          The most critical moment in a visitor's journey is the follow-up. Our intelligent Connect Cards turn that first step into a meaningful relationship.
        </p>
        <div className="mt-10 grid sm:grid-cols-3 gap-6">
          {points.map((pt) => {
            const Icon = pt.icon;
            return (
              <div key={pt.title} className="p-6 rounded-2xl bg-white/10 backdrop-blur border border-white/15">
                <Icon size={22} className="text-amber-300" />
                <h3 className="mt-3 font-bold">{pt.title}</h3>
                <p className="mt-2 text-sm text-indigo-100 leading-relaxed">{pt.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}