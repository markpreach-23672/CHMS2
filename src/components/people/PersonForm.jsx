import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import DateInput from '@/components/ui/date-input';
import { getMyChurchId } from '@/lib/churchContext';
import { formatPhone } from '@/utils/phoneFormat';

export default function PersonForm({ person, onSave, onClose }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    birth_date: '',
    status: 'active',
    notes: '',
    photo_url: '',
    family_role: '',
    gender: '',
    marital_status: '',
    first_visit_date: '',
    baptism_date: '',
    membership_date: '',
    anniversary_date: '',
    ...person,
  });
  const [customFields, setCustomFields] = useState([]);
  const [volunteerRoles, setVolunteerRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!person?.id;
  const baptizedField = customFields.find((f) => f.name === 'Baptized');
  const holySpiritField = customFields.find((f) => f.name === 'Holy Spirit');
  const otherCustomFields = customFields.filter((f) => !['Baptized', 'Holy Spirit', 'Membership Date', 'Baptism Date'].includes(f.name));

  useEffect(() => {
    base44.entities.CustomField.list().then(setCustomFields).catch(() => {});
    base44.entities.VolunteerRole.list().then(setVolunteerRoles).catch(() => {});
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: { ...(prev.custom_fields || {}), [fieldName]: value },
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData((prev) => ({ ...prev, photo_url: file_url }));
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let saved;
      const data = { ...formData };
      if (!data.family_role) delete data.family_role;
      if (!data.birth_date) delete data.birth_date;
      if (!data.first_visit_date) delete data.first_visit_date;
      if (!data.baptism_date) delete data.baptism_date;
      if (!data.membership_date) delete data.membership_date;
      if (!data.anniversary_date) delete data.anniversary_date;

      if (isEdit) {
        saved = await base44.entities.Person.update(person.id, data);
      } else {
        if (!data.church_id) data.church_id = await getMyChurchId();
        saved = await base44.entities.Person.create(data);
      }
      onSave(saved);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save person. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Person' : 'Add New Person'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200">
                {formData.photo_url ? (
                  <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-medium text-slate-400">
                    {formData.first_name?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              {formData.photo_url && (
                <button
                  type="button"
                  onClick={() => handleChange('photo_url', '')}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploading ? 'Uploading...' : 'Upload Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">First Name *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Last Name *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs font-medium text-slate-600">Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Gender</Label>
              <Select value={formData.gender || ''} onValueChange={(v) => handleChange('gender', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Marital Status</Label>
              <Select value={formData.marital_status || ''} onValueChange={(v) => handleChange('marital_status', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                  <SelectItem value="separated">Separated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Family Role</Label>
              <Select value={formData.family_role || ''} onValueChange={(v) => handleChange('family_role', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="head_of_household">Head of Household</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
                className="mt-1"
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Mobile</Label>
              <Input
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', formatPhone(e.target.value))}
                className="mt-1"
                placeholder="(555) 555-5555"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Birth Date</Label>
              <DateInput value={formData.birth_date} onChange={(v) => handleChange('birth_date', v)} className="mt-1" />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="text-xs font-medium text-slate-600">Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">City</Label>
              <Input
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">State</Label>
              <Input
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">ZIP</Label>
              <Input
                value={formData.zip}
                onChange={(e) => handleChange('zip', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Milestone Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">First Visit</Label>
              <DateInput value={formData.first_visit_date || ''} onChange={(v) => handleChange('first_visit_date', v)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Membership Date</Label>
              <DateInput value={formData.membership_date || ''} onChange={(v) => handleChange('membership_date', v)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Anniversary</Label>
              <DateInput value={formData.anniversary_date || ''} onChange={(v) => handleChange('anniversary_date', v)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Baptism Date</Label>
              <DateInput value={formData.baptism_date || ''} onChange={(v) => handleChange('baptism_date', v)} className="mt-1" />
            </div>
            {baptizedField && (
              <div>
                <Label className="text-xs font-medium text-slate-600">Baptized</Label>
                <Select value={formData.custom_fields?.Baptized || ''} onValueChange={(v) => handleCustomFieldChange('Baptized', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {(baptizedField.options || []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {holySpiritField && (
              <div>
                <Label className="text-xs font-medium text-slate-600">Holy Spirit</Label>
                <DateInput value={formData.custom_fields?.['Holy Spirit'] || ''} onChange={(v) => handleCustomFieldChange('Holy Spirit', v)} className="mt-1" />
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {otherCustomFields.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Custom Fields</p>
              <div className="grid grid-cols-2 gap-4">
                {otherCustomFields.map((field) => {
                  const cfValue = formData.custom_fields?.[field.name];
                  return (
                    <div key={field.id}>
                      <Label className="text-xs font-medium text-slate-600">
                        {field.name}
                        {field.is_private && <span className="ml-1 text-rose-400">🔒</span>}
                      </Label>
                      {field.field_type === 'dropdown' ? (
                        <Select value={cfValue || ''} onValueChange={(v) => handleCustomFieldChange(field.name, v)}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : field.field_type === 'multi_select' ? (
                        <div className="mt-1 space-y-1">
                          {(field.options || []).map((opt) => {
                            const arr = Array.isArray(cfValue) ? cfValue : [];
                            return (
                              <label key={opt} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                <Checkbox checked={arr.includes(opt)} onCheckedChange={() => {
                                  const newArr = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
                                  handleCustomFieldChange(field.name, newArr);
                                }} />
                                {opt}
                              </label>
                            );
                          })}
                        </div>
                      ) : field.field_type === 'checkbox' ? (
                        <div className="mt-2">
                          <Checkbox checked={cfValue === true || cfValue === 'true'} onCheckedChange={(v) => handleCustomFieldChange(field.name, v)} />
                        </div>
                      ) : field.field_type === 'date' ? (
                        <DateInput value={cfValue || ''} onChange={(v) => handleCustomFieldChange(field.name, v)} className="mt-1" />
                      ) : (
                        <Input
                          type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
                          value={cfValue || ''}
                          onChange={(e) => handleCustomFieldChange(field.name, field.field_type === 'phone' ? formatPhone(e.target.value) : e.target.value)}
                          className="mt-1"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Volunteer Roles */}
          {volunteerRoles.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Volunteer Roles</p>
              <div className="grid grid-cols-2 gap-2">
                {volunteerRoles.sort((a, b) => (a.area || 'General').localeCompare(b.area || 'General') || a.name.localeCompare(b.name)).map((role) => {
                  const arr = Array.isArray(formData.volunteer_role_ids) ? formData.volunteer_role_ids : [];
                  const checked = arr.includes(role.id);
                  return (
                    <label key={role.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          const newArr = checked ? arr.filter((x) => x !== role.id) : [...arr, role.id];
                          handleChange('volunteer_role_ids', newArr);
                        }}
                      />
                      {role.name}
                      <span className="text-slate-400">· {role.area || 'General'}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs font-medium text-slate-600">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={15} className="mr-1.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Person'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}