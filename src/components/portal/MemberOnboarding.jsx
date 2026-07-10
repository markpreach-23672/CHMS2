import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, UserPlus } from 'lucide-react';

const FAMILY_ROLES = [
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'adult', label: 'Adult / Adult Child' },
  { value: 'other', label: 'Other' },
];

export default function MemberOnboarding({ email, church, onCreated }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', mobile: '', address: '',
    city: '', state: '', zip: '', birth_date: '', gender: 'unspecified',
    marital_status: 'single', family_role: 'head_of_household',
  });
  const [family, setFamily] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ first_name: '', last_name: '', email: '', phone: '', family_role: 'spouse' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addFamily = () => {
    if (!newMember.first_name.trim()) { alert('First name required.'); return; }
    setFamily((prev) => [...prev, { ...newMember, _id: Date.now().toString() }]);
    setNewMember({ first_name: '', last_name: '', email: '', phone: '', family_role: 'spouse' });
    setShowAdd(false);
  };

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { alert('First and last name are required.'); return; }
    setSaving(true);
    try {
      const church_id = church?.id;
      let familyId;
      if (family.length > 0) {
        const fam = await base44.entities.Family.create({ family_name: `${form.last_name} Family`, church_id });
        familyId = fam.id;
      }
      const self = await base44.entities.Person.create({
        ...form, email, church_id, family_id: familyId, status: 'active',
      });
      if (familyId && family.length > 0) {
        await base44.entities.Person.bulkCreate(
          family.map((m) => ({
            first_name: m.first_name, last_name: m.last_name, email: m.email, phone: m.phone,
            family_role: m.family_role, family_id: familyId, church_id, status: 'active',
          }))
        );
      }
      onCreated(self);
    } catch (err) { alert('Failed to save your information. Please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus size={18} className="text-indigo-600" />
        <h2 className="font-semibold text-slate-900">Welcome — let's get you set up</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">Enter your information so we can add you to our directory. You'll be able to edit this anytime.</p>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs">First Name *</Label><Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Last Name *</Label><Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className="mt-1" /></div>
        <div className="col-span-2"><Label className="text-xs">Email (locked)</Label><Input value={email} disabled className="mt-1 bg-slate-50" /></div>
        <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Mobile</Label><Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} className="mt-1" /></div>
        <div className="col-span-2"><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">City</Label><Input value={form.city} onChange={(e) => set('city', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">State</Label><Input value={form.state} onChange={(e) => set('state', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">ZIP</Label><Input value={form.zip} onChange={(e) => set('zip', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Birth Date</Label><Input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Gender</Label><Select value={form.gender} onValueChange={(v) => set('gender', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="unspecified">Unspecified</SelectItem></SelectContent></Select></div>
        <div className="col-span-2"><Label className="text-xs">Marital Status</Label><Select value={form.marital_status} onValueChange={(v) => set('marital_status', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem><SelectItem value="separated">Separated</SelectItem></SelectContent></Select></div>
        <div className="col-span-2"><Label className="text-xs">Your Role in Family</Label><Select value={form.family_role} onValueChange={(v) => set('family_role', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{FAMILY_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Family Members</h2>
          <Button variant="outline" size="sm" onClick={() => setShowAdd((s) => !s)}><Plus size={14} className="mr-1.5" />Add</Button>
        </div>
        {family.length === 0 ? (
          <p className="text-sm text-slate-400">Add your spouse and/or children (optional).</p>
        ) : (
          <div className="space-y-2">
            {family.map((m) => (
              <div key={m._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                <div>
                  <p className="text-sm text-slate-900">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-slate-400">{FAMILY_ROLES.find((r) => r.value === m.family_role)?.label}</p>
                </div>
                <button onClick={() => setFamily((prev) => prev.filter((x) => x._id !== m._id))} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {showAdd && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="First name" value={newMember.first_name} onChange={(e) => setNewMember((p) => ({ ...p, first_name: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="Last name" value={newMember.last_name} onChange={(e) => setNewMember((p) => ({ ...p, last_name: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="Email" value={newMember.email} onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="Phone" value={newMember.phone} onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))} className="h-8 text-sm" />
            </div>
            <Select value={newMember.family_role} onValueChange={(v) => setNewMember((p) => ({ ...p, family_role: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{FAMILY_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={addFamily}>Add</Button>
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-4">{saving ? 'Saving...' : 'Save My Information'}</Button>
    </div>
  );
}