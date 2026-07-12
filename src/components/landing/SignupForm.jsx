import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, Send } from 'lucide-react';

const inputCls = "w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white";

export default function SignupForm() {
  const [form, setForm] = useState({ church_name: '', contact_name: '', email: '', phone: '', city: '', state: '', congregation_size: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.church_name || !form.contact_name || !form.email) {
      setError('Please fill in your church name, your name, and email.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await base44.entities.SignupLead.create({
        ...form,
        congregation_size: form.congregation_size || undefined,
        phone: form.phone || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        message: form.message || undefined,
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900">You're in the flow!</h3>
        <p className="text-slate-600 mt-2 text-sm max-w-sm mx-auto">Thanks for reaching out. Our team will contact you shortly to get your church set up with Easy Flow.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <input className={inputCls} placeholder="Church name *" value={form.church_name} onChange={set('church_name')} />
        <input className={inputCls} placeholder="Your name *" value={form.contact_name} onChange={set('contact_name')} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <input className={inputCls} type="email" placeholder="Email *" value={form.email} onChange={set('email')} />
        <input className={inputCls} type="tel" placeholder="Phone" value={form.phone} onChange={set('phone')} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <input className={inputCls} placeholder="City" value={form.city} onChange={set('city')} />
        <input className={inputCls} placeholder="State" value={form.state} onChange={set('state')} />
        <select className={inputCls} value={form.congregation_size} onChange={set('congregation_size')}>
          <option value="">Congregation size</option>
          <option value="under_50">Under 50</option>
          <option value="50_150">50 – 150</option>
          <option value="150_500">150 – 500</option>
          <option value="over_500">Over 500</option>
        </select>
      </div>
      <textarea className={inputCls} rows={3} placeholder="Anything you'd like us to know? (optional)" value={form.message} onChange={set('message')} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 text-sm hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {saving ? 'Sending...' : 'Start My Easy Flow — $69/mo'}
      </button>
    </form>
  );
}