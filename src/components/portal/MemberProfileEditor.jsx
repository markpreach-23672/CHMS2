import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, Plus, Trash2, Users } from 'lucide-react';
import DateInput from '@/components/ui/date-input';

const FAMILY_ROLES = [
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'adult', label: 'Adult / Adult Child' },
  { value: 'other', label: 'Other' },
];

export default function MemberProfileEditor({ person, onSaved }) {
  const [form, setForm] = useState(person);
  const [saving, setSaving] = useState(false);
  const [family, setFamily] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ first_name: '', last_name: '', email: '', phone: '', family_role: 'spouse' });

  useEffect(() => { setForm(person); }, [person]);

  const loadFamily = async () => {
    if (!person.family_id) { setFamily([]); return; }
    try {
      const members = await base44.entities.Person.filter({ family_id: person.family_id });
      setFamily(members.filter((m) => m.id !== person.id));
    } catch (err) { console.error(err); }
  };
  useEffect(() => { loadFamily(); }, [person]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Person.update(person.id, {
        first_name: form.first_name, last_name: form.last_name,
        phone: form.phone, mobile: form.mobile, address: form.address,
        city: form.city, state: form.state, zip: form.zip,
        birth_date: form.birth_date, gender: form.gender, marital_status: form.marital_status,
      });
      onSaved(updated);
      alert('Profile saved.');
    } catch (err) { alert('Failed to save profile.'); }
    finally { setSaving(false); }
  };

  const handleAddFamily = async () => {
    if (!newMember.first_name.trim()) { alert('First name is required.'); return; }
    try {
      let familyId = person.family_id;
      if (!familyId) {
        const fam = await base44.entities.Family.create({
          family_name: `${form.last_name || form.first_name} Family`,
          church_id: person.church_id,
        });
        familyId = fam.id;
        await base44.entities.Person.update(person.id, { family_id: familyId, family_role: 'head_of_household' });
      }
      const created = await base44.entities.Person.create({
        first_name: newMember.first_name, last_name: newMember.last_name,
        email: newMember.email, phone: newMember.phone,
        family_role: newMember.family_role, family_id: familyId,
        church_id: person.church_id, status: 'active',
      });
      setFamily((prev) => [...prev, created]);
      setNewMember({ first_name: '', last_name: '', email: '', phone: '', family_role: 'spouse' });
      setShowAdd(false);
    } catch (err) { alert('Failed to add family member.'); }
  };

  const handleRemoveFamily = async (m) => {
    if (!confirm(`Remove ${m.first_name} from your family list?`)) return;
    try {
      await base44.entities.Person.update(m.id, { family_id: '' });
      setFamily((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err) { alert('Failed to remove.'); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserCog size={18} className="text-indigo-600" />
        <h2 className="font-semibold text-slate-900">My Information</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs">First Name *</Label><Input value={form.first_name || ''} onChange={(e) => set('first_name', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Last Name *</Label><Input value={form.last_name || ''} onChange={(e) => set('last_name', e.target.value)} className="mt-1" /></div>
        <div className="col-span-2"><Label className="text-xs">Email (locked)</Label><Input value={form.email || ''} disabled className="mt-1 bg-slate-50" /></div>
        <div><Label className="text-xs">Phone</Label><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Mobile</Label><Input value={form.mobile || ''} onChange={(e) => set('mobile', e.target.value)} className="mt-1" /></div>
        <div className="col-span-2"><Label className="text-xs">Address</Label><Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">City</Label><Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">State</Label><Input value={form.state || ''} onChange={(e) => set('state', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">ZIP</Label><Input value={form.zip || ''} onChange={(e) => set('zip', e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs">Birth Date</Label><DateInput value={form.birth_date || ''} onChange={(v) => set('birth_date', v)} className="mt-1" /></div>
        <div><Label className="text-xs">Gender</Label><Select value={form.gender || 'unspecified'} onValueChange={(v) => set('gender', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="unspecified">Unspecified</SelectItem></SelectContent></Select></div>
        <div className="col-span-2"><Label className="text-xs">Marital Status</Label><Select value={form.marital_status || 'single'} onValueChange={(v) => set('marital_status', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem><SelectItem value="separated">Separated</SelectItem></SelectContent></Select></div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-4">{saving ? 'Saving...' : 'Save Changes'}</Button>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Users size={18} className="text-indigo-600" /><h2 className="font-semibold text-slate-900">Family Members</h2></div>
          <Button variant="outline" size="sm" onClick={() => setShowAdd((s) => !s)}><Plus size={14} className="mr-1.5" />Add</Button>
        </div>
        {family.length === 0 ? (
          <p className="text-sm text-slate-400">No family members added yet.</p>
        ) : (
          <div className="space-y-2">
            {family.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                <div>
                  <p className="text-sm text-slate-900">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-slate-400">{FAMILY_ROLES.find((r) => r.value === m.family_role)?.label || m.family_role}</p>
                </div>
                <button onClick={() => handleRemoveFamily(m)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
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
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleAddFamily}>Add Member</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}