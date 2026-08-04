import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, MoreHorizontal, Heart, Users, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Volunteers() {
  const [roles, setRoles] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        base44.entities.VolunteerRole.list(),
        base44.entities.Person.list(),
      ]);
      r.sort((a, b) => (a.area || 'General').localeCompare(b.area || 'General') || a.name.localeCompare(b.name));
      setRoles(r);
      setPeople(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rolesByArea = useMemo(() => {
    const groups = {};
    roles.forEach((r) => {
      const area = r.area || 'General';
      if (!groups[area]) groups[area] = [];
      groups[area].push(r);
    });
    return groups;
  }, [roles]);

  const getPeopleForRole = (roleId) => people.filter((p) => (p.volunteer_role_ids || []).includes(roleId));

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const selectedRolePeople = selectedRoleId ? getPeopleForRole(selectedRoleId) : [];
  const filteredPeople = search
    ? selectedRolePeople.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()))
    : selectedRolePeople;

  const totalVolunteers = people.filter((p) => (p.volunteer_role_ids || []).length > 0).length;

  const handleDeleteRole = async (role) => {
    const count = getPeopleForRole(role.id).length;
    if (!confirm(`Delete "${role.name}"?${count > 0 ? ` ${count} ${count === 1 ? 'person is' : 'people are'} assigned to this role — they will be unassigned.` : ''}`)) return;
    try {
      await base44.entities.VolunteerRole.delete(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedRoleId === role.id) setSelectedRoleId(null);
    } catch (err) { alert('Failed to delete role.'); }
  };

  const handleSaveRole = async (data) => {
    try {
      if (editRole) {
        const updated = await base44.entities.VolunteerRole.update(editRole.id, data);
        setRoles((prev) => prev.map((r) => (r.id === editRole.id ? updated : r)));
      } else {
        const created = await base44.entities.VolunteerRole.create({ ...data, sort_order: roles.length });
        setRoles((prev) => [...prev, created]);
      }
      setShowRoleForm(false);
      setEditRole(null);
    } catch (err) { alert('Failed to save role.'); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Volunteers</h1>
          <p className="text-slate-500 text-sm mt-1">Define volunteer roles and see who serves in each area.</p>
        </div>
        <Button onClick={() => { setEditRole(null); setShowRoleForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1.5" />Add Role
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role list */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1"><Heart size={14} /><span className="text-xs font-medium">Roles</span></div>
              <p className="text-2xl font-bold text-slate-900">{roles.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-1"><Users size={14} /><span className="text-xs font-medium">Volunteers</span></div>
              <p className="text-2xl font-bold text-slate-900">{totalVolunteers}</p>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400">Loading...</div>
          ) : roles.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400">
              No volunteer roles yet. Add roles like Greeter, Usher, or Worship Team to get started.
            </div>
          ) : (
            Object.entries(rolesByArea).map(([area, areaRoles]) => (
              <div key={area}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">{area}</p>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
                  {areaRoles.map((role) => {
                    const count = getPeopleForRole(role.id).length;
                    const isActive = selectedRoleId === role.id;
                    return (
                      <div
                        key={role.id}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-indigo-50' : 'hover:bg-slate-50/50'}`}
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{role.name}</p>
                          {role.description && <p className="text-xs text-slate-400 truncate">{role.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{count}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-lg hover:bg-slate-200">
                                <MoreHorizontal size={15} className="text-slate-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => { setEditRole(role); setShowRoleForm(true); }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteRole(role)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Roster panel */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">{selectedRole.name}</h2>
                <p className="text-xs text-slate-400">{selectedRole.area || 'General'} · {selectedRolePeople.length} {selectedRolePeople.length === 1 ? 'volunteer' : 'volunteers'}</p>
                {selectedRolePeople.length > 0 && (
                  <div className="mt-3 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search volunteers..." className="pl-9 h-8 text-sm" />
                  </div>
                )}
              </div>
              {selectedRolePeople.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No one assigned to this role yet. Assign volunteers from each person's profile.
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredPeople.map((person) => (
                    <Link
                      key={person.id}
                      to={`/people/${person.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {person.photo_url ? (
                          <img src={person.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium text-slate-500">{person.first_name?.[0]}{person.last_name?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{person.first_name} {person.last_name}</p>
                        <p className="text-xs text-slate-400 truncate">{person.email || person.phone || person.mobile || 'No contact info'}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        person.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                        person.status === 'member' ? 'bg-indigo-50 text-indigo-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>{person.status}</span>
                    </Link>
                  ))}
                  {filteredPeople.length === 0 && (
                    <div className="p-4 text-center text-sm text-slate-400">No matches for "{search}".</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Heart size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-400">Select a role to see who's serving in that area.</p>
            </div>
          )}
        </div>
      </div>

      {showRoleForm && (
        <RoleForm
          role={editRole}
          onSave={handleSaveRole}
          onClose={() => { setShowRoleForm(false); setEditRole(null); }}
        />
      )}
    </div>
  );
}

function RoleForm({ role, onSave, onClose }) {
  const [name, setName] = useState(role?.name || '');
  const [area, setArea] = useState(role?.area || 'General');
  const [description, setDescription] = useState(role?.description || '');
  const [requirements, setRequirements] = useState(role?.requirements || '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{role ? 'Edit Role' : 'New Volunteer Role'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Role Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Greeter, Usher, Worship Team" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Area</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} className="mt-1" placeholder="e.g. Hospitality, Worship, Children's Ministry" />
            <p className="text-xs text-slate-400 mt-1">Roles are grouped by area in the list.</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} placeholder="Optional description of this role" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Requirements</Label>
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} className="mt-1" rows={2} placeholder="e.g. Background check, arrive 30 min early, training required" />
            <p className="text-xs text-slate-400 mt-1">Shown when someone taps this role on the scheduling board.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, area: area || 'General', description: description || undefined, requirements: requirements || undefined })} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {role ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}