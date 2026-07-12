import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export default function MemberPicker({ people, selectedIds, onChange, excludeId }) {
  const [search, setSearch] = useState('');

  const filtered = people.filter((p) => {
    if (p.id === excludeId) return false;
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const toggle = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  return (
    <div className="mt-1 border rounded-lg">
      <div className="p-2 border-b">
        <Input placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8" />
      </div>
      <div className="max-h-48 overflow-y-auto p-1">
        {filtered.length === 0 && <p className="text-xs text-slate-400 p-3 text-center">No people found</p>}
        {filtered.map((p) => (
          <label key={p.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm">
            <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
            <span>{p.first_name} {p.last_name}</span>
            {p.status && <span className="ml-auto text-[10px] text-slate-400 capitalize">{p.status}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}