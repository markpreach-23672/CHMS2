import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit3, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FIELD_OPTIONS = [
  { key: 'status', label: 'Status', type: 'enum', options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'visitor', label: 'Visitor' },
    { value: 'member', label: 'Member' },
  ]},
  { key: 'gender', label: 'Gender', type: 'enum', options: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'unspecified', label: 'Unspecified' },
  ]},
  { key: 'marital_status', label: 'Marital Status', type: 'enum', options: [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
    { value: 'separated', label: 'Separated' },
  ]},
  { key: 'family_role', label: 'Family Role', type: 'enum', options: [
    { value: 'head_of_household', label: 'Head of Household' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'adult', label: 'Adult' },
    { value: 'child', label: 'Child' },
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'zip', label: 'ZIP', type: 'text' },
];

export default function BulkUpdateFieldsDialog({ selectedIds, onUpdated, onClose }) {
  const [fieldKey, setFieldKey] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedField = FIELD_OPTIONS.find((f) => f.key === fieldKey);

  const handleApply = async () => {
    if (!fieldKey || value === '') return;
    setSaving(true);
    try {
      const updates = selectedIds.map((id) => ({ id, [fieldKey]: value }));
      await base44.entities.Person.bulkUpdate(updates);
      onUpdated(fieldKey, value);
    } catch (err) {
      alert('Failed to update people. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const canApply = fieldKey && value !== '' && !saving;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 size={18} className="text-indigo-600" />
            Update Fields — {selectedIds.length} {selectedIds.length === 1 ? 'Person' : 'People'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Field to update</Label>
            <Select value={fieldKey} onValueChange={(v) => { setFieldKey(v); setValue(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a field..." />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedField && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">New value</Label>
              {selectedField.type === 'enum' ? (
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${selectedField.label.toLowerCase()}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedField.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={`Enter ${selectedField.label.toLowerCase()}...`}
                />
              )}
            </div>
          )}

          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            <p className="text-xs text-amber-700">
              This will overwrite the selected field for all {selectedIds.length} selected {selectedIds.length === 1 ? 'person' : 'people'}.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleApply} disabled={!canApply} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Edit3 size={14} className="mr-1.5" />}
            Apply to {selectedIds.length} {selectedIds.length === 1 ? 'Person' : 'People'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}