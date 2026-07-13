import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { getMyChurchId } from '@/lib/churchContext';

export default function QuickFamilyLink({ currentPerson, onLinked }) {
  const [query, setQuery] = useState('');
  const [allPeople, setAllPeople] = useState([]);
  const [linkingId, setLinkingId] = useState(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    base44.entities.Person.list().then(setAllPeople).catch(() => setAllPeople([]));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q === '' ? [] : allPeople.filter((p) =>
    p.id !== currentPerson.id &&
    (!currentPerson.family_id || p.family_id !== currentPerson.family_id) &&
    (`${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
  ).slice(0, 6);

  const linkPerson = async (p) => {
    setLinkingId(p.id);
    try {
      let famId = currentPerson.family_id;
      if (!famId) {
        const fam = await base44.entities.Family.create({
          family_name: `${currentPerson.last_name || currentPerson.first_name || 'Family'} Family`,
          church_id: currentPerson.church_id || await getMyChurchId(),
          address: currentPerson.address,
          city: currentPerson.city,
          state: currentPerson.state,
          zip: currentPerson.zip,
        });
        await base44.entities.Person.update(currentPerson.id, { family_id: fam.id });
        famId = fam.id;
      }
      await base44.entities.Person.update(p.id, { family_id: famId, family_role: 'unassigned' });
      setQuery('');
      setOpen(false);
      onLinked();
    } catch (err) {
      alert('Failed to link member: ' + (err.message || 'Unknown error'));
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div ref={wrapRef} className="relative mb-3">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search members to link to this family..."
          className="pl-8 h-8 text-xs"
        />
      </div>
      {open && q !== '' && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {matches.length === 0 ? (
            <p className="p-3 text-xs text-slate-400 text-center">No matching members.</p>
          ) : (
            matches.map((p) => (
              <button
                key={p.id}
                onClick={() => linkPerson(p)}
                disabled={linkingId !== null}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-medium text-slate-500">{p.first_name?.[0]}{p.last_name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{p.first_name} {p.last_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{p.email || 'No email'}</p>
                </div>
                {linkingId === p.id
                  ? <Loader2 size={13} className="animate-spin text-indigo-500" />
                  : <UserPlus size={13} className="text-indigo-500" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}