import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Trash2, Tag as TagIcon, MoreHorizontal, Mail, Phone, Upload, Copy, Edit3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import PersonForm from '@/components/people/PersonForm';
import ImportPeopleDialog from '@/components/people/ImportPeopleDialog';
import DuplicateDetector from '@/components/people/DuplicateDetector';
import BulkUpdateFieldsDialog from '@/components/people/BulkUpdateFieldsDialog';

export default function People() {
  const [people, setPeople] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Person.list('-created_date', 200);
      setPeople(data);
    } catch (err) {
      console.error('Failed to load people:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const data = await base44.entities.Tag.list();
      setTags(data);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, []);

  useEffect(() => {
    loadPeople();
    loadTags();
  }, [loadPeople, loadTags]);

  const filtered = people.filter((p) => {
    const matchesSearch =
      !search ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleDelete = async (person) => {
    if (!confirm(`Delete ${person.first_name} ${person.last_name}?`)) return;
    try {
      await base44.entities.Person.delete(person.id);
      setPeople((prev) => prev.filter((p) => p.id !== person.id));
    } catch (err) {
      alert('Failed to delete person.');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} people?`)) return;
    try {
      await base44.entities.Person.deleteMany({ id: { $in: Array.from(selected) } });
      setPeople((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
    } catch (err) {
      alert('Failed to delete people.');
    }
  };

  const handleBulkTag = async (tagId, action) => {
    const updates = Array.from(selected).map((pid) => {
      const person = people.find((p) => p.id === pid);
      const currentTags = person.tag_ids || [];
      let newTags;
      if (action === 'add') {
        newTags = [...new Set([...currentTags, tagId])];
      } else {
        newTags = currentTags.filter((t) => t !== tagId);
      }
      return { id: pid, tag_ids: newTags };
    });
    try {
      await base44.entities.Person.bulkUpdate(updates);
      setPeople((prev) =>
        prev.map((p) => {
          const update = updates.find((u) => u.id === p.id);
          return update ? { ...p, tag_ids: update.tag_ids } : p;
        })
      );
      setShowBulkTag(false);
      setSelected(new Set());
    } catch (err) {
      alert('Failed to update tags.');
    }
  };

  const handleSaved = (savedPerson) => {
    setPeople((prev) => {
      const idx = prev.findIndex((p) => p.id === savedPerson.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedPerson;
        return next;
      }
      return [savedPerson, ...prev];
    });
    setShowForm(false);
    setEditPerson(null);
  };

  const getPersonTags = (person) => {
    return (person.tag_ids || []).map((tid) => tags.find((t) => t.id === tid)).filter(Boolean);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">People</h1>
          <p className="text-slate-500 text-sm mt-1">
            {people.length} {people.length === 1 ? 'person' : 'people'} in your database
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDuplicates(true)}>
            <Copy size={16} className="mr-1.5" />
            Find Duplicates
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload size={16} className="mr-1.5" />
            Import CSV
          </Button>
          <Button
            onClick={() => { setEditPerson(null); setShowForm(true); }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus size={16} className="mr-1.5" />
            Add Person
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="visitor">Visitor</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
          <span className="text-sm font-medium text-indigo-900">{selected.size} selected</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setShowBulkTag(true)}>
            <TagIcon size={14} className="mr-1.5" />
            Tag
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulkUpdate(true)}>
            <Edit3 size={14} className="mr-1.5" />
            Update Fields
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 border-red-200" onClick={handleBulkDelete}>
            <Trash2 size={14} className="mr-1.5" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={selected.size > 0 && selected.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Contact</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tags</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Loading people...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm text-slate-400 mb-3">No people found</p>
                  <Button onClick={() => { setEditPerson(null); setShowForm(true); }} variant="outline" size="sm">
                    <Plus size={14} className="mr-1.5" />
                    Add Person
                  </Button>
                </td>
              </tr>
            ) : (
              filtered.map((person) => {
                const personTags = getPersonTags(person);
                return (
                  <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(person.id)}
                        onCheckedChange={() => toggleSelect(person.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/people/${person.id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {person.photo_url ? (
                            <img src={person.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-slate-500">
                              {person.first_name?.[0]}{person.last_name?.[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {person.first_name} {person.last_name}
                          </p>
                          <p className="text-xs text-slate-400 md:hidden">
                            {person.email || person.phone || ''}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {person.email && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-400" />
                            {person.email}
                          </p>
                        )}
                        {person.phone && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400" />
                            {person.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {personTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {personTags.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-slate-400 bg-slate-100">
                            +{personTags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        person.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                        person.status === 'visitor' ? 'bg-amber-50 text-amber-600' :
                        person.status === 'member' ? 'bg-indigo-50 text-indigo-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {person.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          <MoreHorizontal size={16} className="text-slate-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditPerson(person); setShowForm(true); }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/people/${person.id}`}>View Profile</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(person)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Person Form Modal */}
      {showForm && (
        <PersonForm
          person={editPerson}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditPerson(null); }}
        />
      )}

      {/* Import Dialog */}
      {showImport && (
        <ImportPeopleDialog
          onImported={loadPeople}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Bulk Tag Modal */}
      {showBulkTag && (
        <Dialog open onOpenChange={() => setShowBulkTag(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TagIcon size={18} className="text-indigo-600" />
                Manage Tags — {selected.size} {selected.size === 1 ? 'Person' : 'People'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {tags.map((tag) => {
                const countWithTag = Array.from(selected).filter((pid) => {
                  const person = people.find((p) => p.id === pid);
                  return (person?.tag_ids || []).includes(tag.id);
                }).length;
                return (
                  <div key={tag.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-700">{tag.name}</span>
                      {countWithTag > 0 && (
                        <span className="text-xs text-slate-400 ml-1.5">· {countWithTag} of {selected.size} have this</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkTag(tag.id, 'add')}
                      className="h-7 text-xs"
                      disabled={countWithTag === selected.size}
                    >
                      <Plus size={12} className="mr-1" />Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkTag(tag.id, 'remove')}
                      className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200"
                      disabled={countWithTag === 0}
                    >
                      <Trash2 size={12} className="mr-1" />Remove
                    </Button>
                  </div>
                );
              })}
              {tags.length === 0 && (
                <div className="text-center py-8">
                  <TagIcon size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">No tags created yet. Create tags on the Tags page first.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkTag(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Update Fields Modal */}
      {showBulkUpdate && (
        <BulkUpdateFieldsDialog
          selectedIds={Array.from(selected)}
          onUpdated={(fieldKey, newValue) => {
            setPeople((prev) =>
              prev.map((p) => (selected.has(p.id) ? { ...p, [fieldKey]: newValue } : p))
            );
            setShowBulkUpdate(false);
            setSelected(new Set());
          }}
          onClose={() => setShowBulkUpdate(false)}
        />
      )}

      {/* Duplicate Detector */}
      {showDuplicates && (
        <DuplicateDetector
          people={people}
          onClose={() => setShowDuplicates(false)}
          onMerged={(primaryId, deletedId) => {
            setPeople(prev => prev.filter(p => p.id !== deletedId));
          }}
        />
      )}
    </div>
  );
}