import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Users, MoreHorizontal, ArrowLeft, Home, Phone, MapPin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Families() {
  const [families, setFamilies] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [f, p] = await Promise.all([
        base44.entities.Family.list(),
        base44.entities.Person.list(),
      ]);
      setFamilies(f);
      setPeople(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getMemberCount = (familyId) => people.filter((p) => p.family_id === familyId).length;
  const getHeadOfHousehold = (familyId) => people.find((p) => p.family_id === familyId && p.family_role === 'head_of_household');

  const handleDelete = async (family) => {
    if (!confirm(`Delete the ${family.family_name} family? Family members will remain but lose their family association.`)) return;
    try {
      const members = people.filter((p) => p.family_id === family.id);
      if (members.length > 0) {
        await base44.entities.Person.bulkUpdate(members.map((m) => ({ id: m.id, family_id: '', family_role: '' })));
      }
      await base44.entities.Family.delete(family.id);
      setFamilies((prev) => prev.filter((f) => f.id !== family.id));
    } catch (err) { alert('Failed to delete family.'); }
  };

  const viewFamily = async (family) => {
    setSelectedFamily(family);
    const members = people.filter((p) => p.family_id === family.id);
    setFamilyMembers(members);
  };

  if (selectedFamily) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <button onClick={() => setSelectedFamily(null)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={16} />Back to Families
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h1 className="text-xl font-bold text-slate-900">{selectedFamily.family_name} Family</h1>
          {selectedFamily.address && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-2">
              <MapPin size={14} className="text-slate-400" />
              {[selectedFamily.address, selectedFamily.city, selectedFamily.state, selectedFamily.zip].filter(Boolean).join(', ')}
            </p>
          )}
          {selectedFamily.home_phone && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <Phone size={14} className="text-slate-400" />
              {selectedFamily.home_phone}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Family Members ({familyMembers.length})</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {familyMembers.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No members linked to this family.</p>
            ) : (
              familyMembers.map((member) => {
                const roleLabel = { head_of_household: 'Head of Household', spouse: 'Spouse', child: 'Child', other: 'Other' };
                return (
                  <Link key={member.id} to={`/people/${member.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50">
                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {member.photo_url ? <img src={member.photo_url} alt="" className="w-full h-full object-cover rounded-full" /> : <span className="text-xs font-medium text-slate-500">{member.first_name?.[0]}{member.last_name?.[0]}</span>}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{member.first_name} {member.last_name}</p>
                      <p className="text-xs text-slate-400">{member.email || member.phone || ''}</p>
                    </div>
                    <span className="text-xs text-slate-500">{roleLabel[member.family_role] || 'Member'}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Families</h1>
          <p className="text-slate-500 text-sm mt-1">Group individuals into family units with defined roles.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1.5" />New Family
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-sm text-slate-400">Loading families...</div>
        ) : families.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-400 mb-3">No families yet.</p>
            <Button onClick={() => setShowForm(true)} variant="outline" size="sm"><Plus size={14} className="mr-1.5" />Create Family</Button>
          </div>
        ) : (
          families.map((family) => {
            const head = getHeadOfHousehold(family.id);
            const count = getMemberCount(family.id);
            return (
              <div key={family.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => viewFamily(family)}>
                    <h3 className="font-semibold text-slate-900 text-sm">{family.family_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{count} {count === 1 ? 'member' : 'members'}</p>
                    {head && <p className="text-xs text-slate-500 mt-2">Head: {head.first_name} {head.last_name}</p>}
                    {family.city && <p className="text-xs text-slate-400 mt-1">{family.city}, {family.state}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => viewFamily(family)}>View Family</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(family)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <FamilyForm
          people={people}
          onSave={async (data) => {
            try {
              const created = await base44.entities.Family.create(data);
              setFamilies((prev) => [...prev, created]);
              if (data.head_person_id) {
                await base44.entities.Person.update(data.head_person_id, { family_id: created.id, family_role: 'head_of_household' });
                setPeople((prev) => prev.map((p) => (p.id === data.head_person_id ? { ...p, family_id: created.id, family_role: 'head_of_household' } : p)));
              }
              setShowForm(false);
            } catch (err) { alert('Failed to create family.'); }
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function FamilyForm({ people, onSave, onClose }) {
  const [familyName, setFamilyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [headPersonId, setHeadPersonId] = useState('');

  const unassigned = people.filter((p) => !p.family_id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Family</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Family Name *</Label>
            <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Anderson" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Head of Household</Label>
            <select value={headPersonId} onChange={(e) => setHeadPersonId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
              <option value="">None</option>
              {unassigned.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
          <div><Label className="text-xs font-medium text-slate-600">Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label className="text-xs font-medium text-slate-600">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs font-medium text-slate-600">State</Label><Input value={state} onChange={(e) => setState(e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs font-medium text-slate-600">ZIP</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1" /></div>
          </div>
          <div><Label className="text-xs font-medium text-slate-600">Home Phone</Label><Input value={homePhone} onChange={(e) => setHomePhone(e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ family_name: familyName, address: address || undefined, city: city || undefined, state: state || undefined, zip: zip || undefined, home_phone: homePhone || undefined, head_person_id: headPersonId || undefined })} disabled={!familyName.trim()} className="bg-indigo-600 hover:bg-indigo-700">Create Family</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}