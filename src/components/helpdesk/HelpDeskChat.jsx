import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { LifeBuoy, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTED = [
  'What are the service times?',
  'How do I give?',
  'How do I sign up to volunteer?',
];

function ToolCallBadge({ toolCall }) {
  const name = toolCall.name || '';
  const status = toolCall.status || '';
  const isLog = /log/i.test(name);
  const label = isLog ? 'Logging your question for staff' : 'Searching help desk articles';
  const done = ['completed', 'success'].includes(status);
  const failed = ['failed', 'error'].includes(status);
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
      {failed ? (
        <span className="text-rose-500">Something went wrong</span>
      ) : done ? (
        <Sparkles size={12} className="text-emerald-500" />
      ) : (
        <Loader2 size={12} className="animate-spin" />
      )}
      <span>{label}</span>
    </div>
  );
}

export default function HelpDeskChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [awaiting, setAwaiting] = useState(false);
  const [booting, setBooting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') setAwaiting(false);
    });
    return () => unsubscribe();
  }, [conversation]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const ensureConversation = useCallback(async () => {
    if (conversation) return conversation;
    setBooting(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'helpdesk_assistant',
        metadata: { name: 'Help Desk Chat' },
      });
      setConversation(conv);
      setMessages(conv.messages || []);
      return conv;
    } finally {
      setBooting(false);
    }
  }, [conversation]);

  const send = async (text) => {
    const t = (text != null ? text : input).trim();
    if (!t || awaiting) return;
    setInput('');
    setAwaiting(true);
    try {
      const conv = await ensureConversation();
      await base44.agents.addMessage(conv, { role: 'user', content: t });
    } catch (err) {
      console.error('Help desk send failed', err);
      setAwaiting(false);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment." },
      ]);
    }
  };

  const waitingForReply = awaiting && (messages.length === 0 || messages[messages.length - 1]?.role === 'user');

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col" style={{ height: 460 }}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <LifeBuoy size={16} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">Help Desk</h2>
          <p className="text-xs text-slate-400">Answers from our church help materials</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <LifeBuoy size={22} className="text-indigo-600" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Hi! I'm your church help assistant.</p>
            <p className="text-xs text-slate-400 mb-4">Ask me about services, giving, volunteering, and more.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 text-white px-3.5 py-2 text-sm'
                  : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-50 text-slate-800 px-3.5 py-2 text-sm'
              }
            >
              {m.content &&
                (m.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <ReactMarkdown className="prose prose-sm max-w-none">{m.content}</ReactMarkdown>
                ))}
              {m.tool_calls && m.tool_calls.map((tc, idx) => <ToolCallBadge key={idx} toolCall={tc} />)}
            </div>
          </div>
        ))}

        {waitingForReply && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-slate-50 px-3.5 py-2.5">
              <Loader2 size={14} className="animate-spin text-slate-400" />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type your question…"
            className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || awaiting || booting}
            className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 disabled:opacity-40 transition"
          >
            {awaiting || booting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}