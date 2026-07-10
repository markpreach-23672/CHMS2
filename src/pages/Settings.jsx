import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, MoreHorizontal, Users, Shield, Palette, ListTree, UserCog, MapPin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import LocationsTab from '@/components/settings/LocationsTab';
import AddFromMembersDialog from '@/components/settings/AddFromMembersDialog';
import PermissionCategoryForm from '@/components/settings/PermissionCategoryForm';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your church profile, custom fields, staff, and permissions.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="profile"><Palette size={14} className="mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="fields"><ListTree size={14} className="mr-1.5" />Custom Fields</TabsTrigger>
          <TabsTrigger value="staff"><Users size={14} className="mr-1.5" />Staff</TabsTrigger>
          <TabsTrigger value="permissions"><Shield size={14} className="mr-1.5" />Permissions</TabsTrigger>
          <TabsTrigger value="locations"><MapPin size={14} className="mr-1.5" />Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="fields"><CustomFieldsTab /></TabsContent>
        <TabsContent value="staff"><StaffTab /></TabsContent>
        <TabsContent value="permissions"><PermissionsTab /></TabsContent>
        <TabsContent value="locations"><LocationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const [church, setChurch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    base44.entities.Church.list().then((churches) => {
      if (churches.length > 0) {
        setChurch(churches[0]);
        setFormData(churches[0]);
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (church) {
        const updated = await base44.entities.Church.update(church.id, formData);
        setChurch(updated);
      } else {
        const created = await base44.entities.Church.create(formData);
        setChurch(created);
      }
    } catch (err) {
      alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Church Name</Label>
            <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Subdomain</Label>
            <Input value={formData.subdomain || ''} onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })} className="mt-1" placeholder="mychurch" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600">Address</Label>
          <Input value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-1" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs font-medium text-slate-600">City</Label><Input value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs font-medium text-slate-600">State</Label><Input value={formData.state || ''} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs font-medium text-slate-600">ZIP</Label><Input value={formData.zip || ''} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs font-medium text-slate-600">Phone</Label><Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs font-medium text-slate-600">Email</Label><Input value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1" /></div>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-600">Workflow From Email (Resend)</Label>
          <Input value={formData.resend_from_email || ''} onChange={(e) => setFormData({ ...formData, resend_from_email: e.target.value })} className="mt-1" placeholder="Church <noreply@yourdomain.com>" />
          <p className="text-xs text-slate-400 mt-1">Used for connect card workflow emails. Must be a verified Resend sender address.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Timezone</Label>
            <Input value={formData.timezone || ''} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Branding Color</Label>
            <div className="flex gap-2 mt-1">
              <input type="color" value={formData.branding_color || '#4f46e5'} onChange={(e) => setFormData({ ...formData, branding_color: e.target.value })} className="w-10 h-9 rounded-md border border-input cursor-pointer" />
              <Input value={formData.branding_color || ''} onChange={(e) => setFormData({ ...formData, branding_color: e.target.value })} className="flex-1" />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-2">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}

function CustomFieldsTab() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editField, setEditField] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CustomField.list();
      data.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setFields(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (field) => {
    if (!confirm(`Delete custom field "${field.name}"?`)) return;
    try {
      await base44.entities.CustomField.delete(field.id);
      setFields((prev) => prev.filter((f) => f.id !== field.id));
    } catch (err) { alert('Failed to delete field.'); }
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button variant="outline" onClick={() => { setEditField(null); setShowForm(true); }}>
          <Plus size={15} className="mr-1.5" />Add Field
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : fields.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No custom fields yet. Add one to extend your people profiles.</div>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{field.name} {field.is_private && <span className="text-[10px] text-rose-500 ml-1">🔒 Private</span>}</p>
                  <p className="text-xs text-slate-400 capitalize">{field.field_type} · applies to {field.applies_to}{field.section ? ` · ${field.section}` : ''}</p>
                </div>
                {(field.field_type === 'dropdown' || field.field_type === 'multi_select') && field.options?.length > 0 && (
                  <div className="flex gap-1">
                    {field.options.slice(0, 3).map((opt) => (
                      <span key={opt} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{opt}</span>
                    ))}
                    {field.options.length > 3 && <span className="text-[10px] text-slate-400">+{field.options.length - 3}</span>}
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditField(field); setShowForm(true); }}>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(field)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <CustomFieldForm
          field={editField}
          onSave={async (data) => {
            try {
              if (editField) {
                const updated = await base44.entities.CustomField.update(editField.id, data);
                setFields((prev) => prev.map((f) => (f.id === editField.id ? updated : f)));
              } else {
                const created = await base44.entities.CustomField.create({ ...data, sort_order: fields.length });
                setFields((prev) => [...prev, created]);
              }
              setShowForm(false);
              setEditField(null);
            } catch (err) { alert('Failed to save field.'); }
          }}
          onClose={() => { setShowForm(false); setEditField(null); }}
        />
      )}
    </div>
  );
}

function CustomFieldForm({ field, onSave, onClose }) {
  const [name, setName] = useState(field?.name || '');
  const [fieldType, setFieldType] = useState(field?.field_type || 'text');
  const [appliesTo, setAppliesTo] = useState(field?.applies_to || 'person');
  const [options, setOptions] = useState(field?.options?.join(', ') || '');
  const [section, setSection] = useState(field?.section || '');
  const [isPrivate, setIsPrivate] = useState(field?.is_private || false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{field ? 'Edit Custom Field' : 'New Custom Field'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Field Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Baptism Date" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Field Type</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="multi_select">Multi-Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Applies To</Label>
              <Select value={appliesTo} onValueChange={setAppliesTo}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Person</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(fieldType === 'dropdown' || fieldType === 'multi_select') && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Options (comma-separated)</Label>
              <Input value={options} onChange={(e) => setOptions(e.target.value)} className="mt-1" placeholder="Yes, No, In Progress" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Section</Label>
              <Input value={section} onChange={(e) => setSection(e.target.value)} className="mt-1" placeholder="e.g. Spiritual Milestones" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Private (admin only)</Label>
              <select value={isPrivate ? 'yes' : 'no'} onChange={(e) => setIsPrivate(e.target.value === 'yes')} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="no">No</option>
                <option value="yes">Yes — hide from non-admins</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, field_type: fieldType, applies_to: appliesTo, options: (fieldType === 'dropdown' || fieldType === 'multi_select') ? options.split(',').map((o) => o.trim()).filter(Boolean) : [], section: section || undefined, is_private: isPrivate })} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">{field ? 'Save' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaffTab() {
  const [users, setUsers] = useState([]);
  const [people, setPeople] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddFromMembers, setShowAddFromMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, p, c] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Person.list(),
        base44.entities.PermissionCategory.list(),
      ]);
      setUsers(u);
      setPeople(p);
      setCategories(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await base44.functions.invoke('inviteStaffMember', { email: inviteEmail, role: inviteRole });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      alert(data?.message || 'Invite sent.');
      setInviteEmail('');
      setShowInvite(false);
      load();
    } catch (err) {
      alert('Failed to invite user: ' + (err.message || 'Unknown error'));
    } finally {
      setInviting(false);
    }
  };

  const handleInviteFromMember = async (person, role) => {
    const email = (person.email || '').trim();
    if (!email) {
      alert('This member does not have an email address on file.');
      return;
    }
    setInviting(true);
    try {
      const res = await base44.functions.invoke('inviteStaffMember', { email, role });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      alert(data?.message || 'Invite sent.');
      setShowAddFromMembers(false);
      setSearchQuery('');
      load();
    } catch (err) {
      alert('Failed to invite user: ' + (err.message || 'Unknown error'));
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    setUpdatingUserId(userId);
    try {
      await base44.entities.User.update(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      alert('Failed to update role. You may need admin permissions.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateCategory = async (userId, categoryId) => {
    setUpdatingUserId(userId);
    try {
      await base44.entities.User.update(userId, { permission_category_id: categoryId || undefined });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permission_category_id: categoryId || undefined } : u)));
    } catch (err) {
      alert('Failed to update permission category.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const roleLabel = { super_admin: 'Super Admin', church_admin: 'Church Admin', staff: 'Staff' };
  const filteredPeople = people.filter((p) =>
    p.email &&
    (searchQuery === '' ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3">
        <Button variant="outline" onClick={() => setShowAddFromMembers(true)}>
          <Users size={15} className="mr-1.5" />Add from Members
        </Button>
        <Button variant="outline" onClick={() => setShowInvite(true)}>
          <Plus size={15} className="mr-1.5" />Invite by Email
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No staff members yet.</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50">
              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-slate-500">{user.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{user.full_name || 'Unnamed'}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
              {categories.length > 0 && (
                <Select
                  value={user.permission_category_id || 'none'}
                  onValueChange={(v) => handleUpdateCategory(user.id, v === 'none' ? '' : v)}
                  disabled={updatingUserId === user.id || user.role === 'super_admin'}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue placeholder="Permissions..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                value={user.role || 'staff'}
                onValueChange={(v) => handleUpdateRole(user.id, v)}
                disabled={updatingUserId === user.id || user.role === 'super_admin'}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="church_admin">Church Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))
        )}
      </div>

      {showInvite && (
        <Dialog open onOpenChange={() => setShowInvite(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Invite Staff Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-slate-600">Email Address</Label>
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" className="mt-1" autoFocus placeholder="staff@church.com" />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="church_admin">Church Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="bg-indigo-600 hover:bg-indigo-700">{inviting ? 'Inviting...' : 'Send Invite'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showAddFromMembers && (
        <AddFromMembersDialog
          people={filteredPeople}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          inviting={inviting}
          onInvite={handleInviteFromMember}
          onClose={() => { setShowAddFromMembers(false); setSearchQuery(''); }}
        />
      )}
    </div>
  );
}

function PermissionsTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.PermissionCategory.list();
      setCategories(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (cat) => {
    if (!confirm(`Delete role "${cat.name}"? Staff assigned to it will lose this permission set.`)) return;
    try {
      await base44.entities.PermissionCategory.delete(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) { alert('Failed to delete role.'); }
  };

  const accessLabel = { none: 'No Access', read: 'View', write: 'View & Edit' };
  const accessColor = { none: 'bg-slate-100 text-slate-400', read: 'bg-blue-50 text-blue-600', write: 'bg-emerald-50 text-emerald-600' };

  const modules = [
    { key: 'people_access', label: 'People' },
    { key: 'giving_access', label: 'Giving' },
    { key: 'calendar_access', label: 'Calendar' },
    { key: 'connect_cards_access', label: 'Connect Cards' },
    { key: 'tags_access', label: 'Tags' },
    { key: 'reports_access', label: 'Reports' },
    { key: 'settings_access', label: 'Settings' },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex-1">
          <Shield size={16} className="inline mr-1.5" />
          Define staff roles and the areas each can access. Then assign a role to each staff member on the Staff tab.
        </div>
        <Button variant="outline" onClick={() => { setEditCategory(null); setShowForm(true); }} className="flex-shrink-0">
          <Plus size={15} className="mr-1.5" />Add Role
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-sm text-slate-400">No staff roles yet. Add one to define what your team can access.</div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">{cat.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{cat.description || 'No description'}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100"><MoreHorizontal size={15} className="text-slate-400" /></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditCategory(cat); setShowForm(true); }}><Pencil size={14} className="mr-1.5" />Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(cat)}><Trash2 size={14} className="mr-1.5" />Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-1.5 mt-3">
                {modules.map((mod) => (
                  <div key={mod.key} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{mod.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${accessColor[cat[mod.key]] || accessColor.none}`}>
                      {accessLabel[cat[mod.key]] || accessLabel.none}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <PermissionCategoryForm
          category={editCategory}
          onSave={async (data) => {
            try {
              if (editCategory) {
                const updated = await base44.entities.PermissionCategory.update(editCategory.id, data);
                setCategories((prev) => prev.map((c) => (c.id === editCategory.id ? updated : c)));
              } else {
                const created = await base44.entities.PermissionCategory.create(data);
                setCategories((prev) => [...prev, created]);
              }
              setShowForm(false);
              setEditCategory(null);
            } catch (err) { alert('Failed to save role.'); }
          }}
          onClose={() => { setShowForm(false); setEditCategory(null); }}
        />
      )}
    </div>
  );
}