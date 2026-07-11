import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const MODULES = [
  { key: 'people_access', label: 'People', hint: 'View/edit member profiles' },
  { key: 'giving_access', label: 'Giving', hint: 'View/edit donations' },
  { key: 'calendar_access', label: 'Calendar', hint: 'View/edit events' },
  { key: 'connect_cards_access', label: 'Connect Cards', hint: 'View/edit cards & workflows' },
  { key: 'tags_access', label: 'Tags', hint: 'View/assign tags' },
  { key: 'reports_access', label: 'Reports', hint: 'View/generate reports' },
  { key: 'settings_access', label: 'Settings', hint: 'View/edit church settings & staff' },
  { key: 'automations_access', label: 'Automations', hint: 'Create/manage automations' },
];

export default function PermissionCategoryForm({ category, onSave, onClose }) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [access, setAccess] = useState({
    people_access: category?.people_access || 'read',
    giving_access: category?.giving_access || 'none',
    calendar_access: category?.calendar_access || 'none',
    connect_cards_access: category?.connect_cards_access || 'none',
    tags_access: category?.tags_access || 'read',
    reports_access: category?.reports_access || 'read',
    settings_access: category?.settings_access || 'none',
    automations_access: category?.automations_access || 'none',
  });

  const setModule = (key, value) => setAccess((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    onSave({ name, description: description || undefined, ...access });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{category ? 'Edit Staff Role' : 'New Staff Role'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Role Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Follow-up Team" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="What this role is for" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Area Access</Label>
            <div className="mt-2 space-y-2 border border-slate-200 rounded-lg p-3">
              {MODULES.map((mod) => (
                <div key={mod.key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{mod.label}</p>
                    <p className="text-[10px] text-slate-400">{mod.hint}</p>
                  </div>
                  <Select value={access[mod.key]} onValueChange={(v) => setModule(mod.key, v)}>
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Access</SelectItem>
                      <SelectItem value="read">View</SelectItem>
                      <SelectItem value="write">View & Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()} className="bg-indigo-600 hover:bg-indigo-700">{category ? 'Save' : 'Create Role'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}