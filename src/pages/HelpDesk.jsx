import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import ArticlesManager from '@/components/helpdesk/ArticlesManager';
import TicketsManager from '@/components/helpdesk/TicketsManager';
import { BookOpen, MessageSquareText, ShieldAlert } from 'lucide-react';

export default function HelpDesk() {
  const { user } = useAuth();
  const [tab, setTab] = useState('tickets');

  if (user?.role === 'member') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 p-6 rounded-xl border border-slate-200 bg-white">
          <ShieldAlert size={20} className="text-amber-500" />
          <p className="text-sm text-slate-600">
            This area is for church staff. Members can ask questions from the help desk chat on the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { k: 'tickets', label: 'Questions', Icon: MessageSquareText },
    { k: 'articles', label: 'Training Articles', Icon: BookOpen },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Help Desk</h1>
        <p className="text-slate-500 text-sm mt-1">
          Review unresolved questions and manage the training materials the AI uses to answer members.
        </p>
      </div>
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.Icon;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t.k ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>
      {tab === 'tickets' ? <TicketsManager /> : <ArticlesManager />}
    </div>
  );
}