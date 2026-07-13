import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search } from 'lucide-react';
import { getMyChurchId } from '@/lib/churchContext';
import { formatPhone } from '@/utils/phoneFormat';

const ROLE_OPTIONS = [
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' },
  { value: 'other', label: 'Other' },
  { value: 'unassigned', label: 'Unassigned' },
];

export default function AddFamilyMemberDialog({ currentPerson, onClose, onAdded }) {
  const [mode, setMode] = useState('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [allPeople, setAllPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [role, setRole] = useState('unassigned');
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Person.list()
      .then((p) => setAllPeople(p))
      .catch(() => setAllPeople([]))
      .finally(() => setLoadingPeople(false));
  }, []);

  const eligible = allPeople.filter((p) =>
    p.id !== currentPerson.id &&
    p.family_id !== currentPerson.family_id &&
    (searchQuery === '' ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const ensureFamily = async () => {
    if (currentPerson.family_id) return currentPerson.family_id;
    const famName = `${currentPerson.last_name || currentPerson.first_name || 'Family'} Family`;
    const churchId = currentPerson.church_id || await getMyChurchId();
    const fam = await base44.entities.Family.create({
      family_name: famName,
      church_id: churchId,
      address: currentPerson.address,
      city: currentPerson.city,
      state: currentPerson.state,
      zip: currentPerson.zip,
    });
    await base44.entities.Person.update(currentPerson.id, { family_id: fam.id });
    return fam.id;
  };

  const handleAddExisting = async () => {
    if (!selectedPerson) return;
    setSaving(true);
    try {
      const famId = await ensureFamily();
      await base44.entities.Person.update(selectedPerson.id, { family_id: famId, family_role: role });
      onAdded();
    } catch (err) {
      alert('Failed to add family member: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = async () => {
    if (!newFirst.trim() || !newLast.trim()) {
      alert('First and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const famId = await ensureFamily();
      await base44.entities.Person.create({
        first_name: newFirst.trim(),
        last_name: newLast.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        family_id: famId,
        family_role: role,
        church_id: currentPerson.church_id || await getMyChurchId(),
        status: 'active',
      });
      onAdded();
    } catch (err) {
      alert('Failed to create family member: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${mode === 'existing' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Existing Member
          </button>
          <button
            onClick={() => setMode('new')}
            className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${mode === 'new' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            New Person
          </button>
        </div>

        {mode === 'existing' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" placeholder="Search by name or email..." autoFocus />
            </div>
            <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-50">
              {loadingPeople ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading...</div>
              ) : eligible.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">{searchQuery ? 'No members found.' : 'No eligible members.'}</div>
              ) : (
                eligible.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPerson(p)} className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${selectedPerson?.id === p.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-slate-500">{(p.first_name || '?')[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.email || 'No email'}</p>
                    </div>
                    {selectedPerson?.id === p.id && <span className="text-xs text-indigo-600 font-medium">Selected</span>}
                  </button>
                ))
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Family Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-600">First Name *</Label>
                <Input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} className="mt-1" autoFocus />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Last Name *</Label>
                <Input value={newLast} onChange={(e) => setNewLast(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Phone</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(formatPhone(e.target.value))} placeholder="(555) 555-5555" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Family Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={mode === 'existing' ? handleAddExisting : handleAddNew}
            disabled={saving || (mode === 'existing' && !selectedPerson) || (mode === 'new' && (!newFirst.trim() || !newLast.trim()))}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? 'Adding...' : mode === 'existing' ? 'Add to Family' : 'Create & Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}