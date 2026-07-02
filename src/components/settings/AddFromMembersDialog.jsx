import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Mail } from 'lucide-react';

export default function AddFromMembersDialog({ people, searchQuery, setSearchQuery, inviting, onInvite, onClose }) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [role, setRole] = useState('staff');

  const handleConfirm = () => {
    if (!selectedPerson) return;
    onInvite(selectedPerson, role);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Staff from Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              placeholder="Search members by name or email..."
              autoFocus
            />
          </div>

          <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-50">
            {people.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                {searchQuery ? 'No members found. Try a different search.' : 'No eligible members. Members need an email on file.'}
              </div>
            ) : (
              people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selectedPerson?.id === person.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-slate-500">{(person.first_name || '?')[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {person.first_name} {person.last_name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{person.email}</p>
                  </div>
                  {selectedPerson?.id === person.id && (
                    <span className="text-xs text-indigo-600 font-medium">Selected</span>
                  )}
                </button>
              ))
            )}
          </div>

          {selectedPerson && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Assign Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="church_admin">Church Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <Mail size={11} /> An invite will be sent to {selectedPerson.email}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={inviting || !selectedPerson} className="bg-indigo-600 hover:bg-indigo-700">
            {inviting ? 'Inviting...' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}