import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search as SearchIcon, Plus, Trash2, Save, Bookmark, X, Tag as TagIcon, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const BUILT_IN_FIELDS = [
  { name: 'first_name', label: 'First Name', type: 'text' },
  { name: 'last_name', label: 'Last Name', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'member', 'visitor', 'inactive'] },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'zip', label: 'ZIP', type: 'text' },
];

export default function Search() {
  const [filters, setFilters] = useState([{ field: 'first_name', operator: 'contains', value: '' }]);
  const [customFields, setCustomFields] = useState([]);
  const [tags, setTags] = useState([]);
  const [results, setResults] = useState(null);
  const [allPeople, setAllPeople] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [cf, t, p, ss] = await Promise.all([
        base44.entities.CustomField.list(),
        base44.entities.Tag.list(),
        base44.entities.Person.list(),
        base44.entities.SavedSearch.list(),
      ]);
      setCustomFields(cf);
      setTags(t);
      setAllPeople(p);
      setSavedSearches(ss);
    } catch (err) {
      console.error('Failed to load search data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allFields = [
    ...BUILT_IN_FIELDS,
    ...customFields.map((f) => ({
      name: `custom.${f.name}`,
      label: f.name,
      type: f.field_type === 'dropdown' ? 'select' : 'text',
      options: f.options || [],
    })),
    { name: 'tag', label: 'Has Tag', type: 'tag', options: tags.map((t) => ({ id: t.id, name: t.name })) },
  ];

  const getField = (name) => allFields.find((f) => f.name === name);

  const addFilter = () => {
    setFilters([...filters, { field: 'first_name', operator: 'contains', value: '' }]);
  };

  const removeFilter = (idx) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  const updateFilter = (idx, key, value) => {
    setFilters(filters.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  };

  const runSearch = () => {
    const matched = allPeople.filter((person) => {
      return filters.every((filter) => {
        if (!filter.value && filter.operator !== 'is_empty') return true;
        const field = getField(filter.field);
        if (!field) return true;

        let personValue;
        if (filter.field === 'tag') {
          personValue = (person.tag_ids || []).includes(filter.value);
          return personValue;
        }
        if (filter.field.startsWith('custom.')) {
          const customName = filter.field.replace('custom.', '');
          personValue = person.custom_fields?.[customName] || '';
        } else {
          personValue = person[filter.field] || '';
        }

        switch (filter.operator) {
          case 'contains':
            return String(personValue).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'equals':
            return String(personValue).toLowerCase() === String(filter.value).toLowerCase();
          case 'starts_with':
            return String(personValue).toLowerCase().startsWith(String(filter.value).toLowerCase());
          case 'is_empty':
            return !personValue;
          default:
            return true;
        }
      });
    });
    setResults(matched);
    setSelected(new Set());
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) return;
    try {
      const created = await base44.entities.SavedSearch.create({
        name: searchName,
        query_config: { filters },
      });
      setSavedSearches([created, ...savedSearches]);
      setShowSaveDialog(false);
      setSearchName('');
    } catch (err) {
      alert('Failed to save search.');
    }
  };

  const loadSavedSearch = (saved) => {
    setFilters(saved.query_config?.filters || [{ field: 'first_name', operator: 'contains', value: '' }]);
    setTimeout(runSearch, 100);
  };

  const handleDeleteSaved = async (saved) => {
    if (!confirm(`Delete saved search "${saved.name}"?`)) return;
    try {
      await base44.entities.SavedSearch.delete(saved.id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== saved.id));
    } catch (err) {
      alert('Failed to delete saved search.');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === (results?.length || 0)) setSelected(new Set());
    else setSelected(new Set(results?.map((p) => p.id) || []));
  };

  const handleBulkTag = async (tagId, action) => {
    const updates = Array.from(selected).map((pid) => {
      const person = results.find((p) => p.id === pid);
      const currentTags = person.tag_ids || [];
      let newTags;
      if (action === 'add') newTags = [...new Set([...currentTags, tagId])];
      else newTags = currentTags.filter((t) => t !== tagId);
      return { id: pid, tag_ids: newTags };
    });
    try {
      await base44.entities.Person.bulkUpdate(updates);
      setAllPeople((prev) => prev.map((p) => {
        const u = updates.find((x) => x.id === p.id);
        return u ? { ...p, tag_ids: u.tag_ids } : p;
      }));
      setResults((prev) => prev?.map((p) => {
        const u = updates.find((x) => x.id === p.id);
        return u ? { ...p, tag_ids: u.tag_ids } : p;
      }) || null);
      setShowBulkTag(false);
      setSelected(new Set());
    } catch (err) {
      alert('Failed to update tags.');
    }
  };

  const exportCSV = () => {
    if (!results || results.length === 0) return;
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'City', 'State', 'ZIP'];
    const rows = results.map((p) => [p.first_name, p.last_name, p.email, p.phone, p.status, p.city, p.state, p.zip]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'people_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Search</h1>
        <p className="text-slate-500 text-sm mt-1">Build visual queries to filter people on any field.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Saved Searches */}
        <div className="lg:col-span-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Saved Searches</h3>
          <div className="space-y-1.5">
            {savedSearches.length === 0 ? (
              <p className="text-xs text-slate-400">No saved searches yet.</p>
            ) : (
              savedSearches.map((ss) => (
                <div key={ss.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all">
                  <Bookmark size={14} className="text-slate-400 flex-shrink-0" />
                  <button onClick={() => loadSavedSearch(ss)} className="text-sm text-slate-700 hover:text-indigo-600 flex-1 text-left truncate">
                    {ss.name}
                  </button>
                  <button onClick={() => handleDeleteSaved(ss)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Query Builder */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <SearchIcon size={18} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Query Builder</h2>
            </div>

            <div className="space-y-2.5">
              {filters.map((filter, idx) => {
                const field = getField(filter.field);
                return (
                  <div key={idx} className="flex items-center gap-2 flex-wrap">
                    {idx > 0 && <span className="text-xs font-semibold text-indigo-600 px-1">AND</span>}
                    <Select value={filter.field} onValueChange={(v) => updateFilter(idx, 'field', v)}>
                      <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allFields.map((f) => (
                          <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filter.field !== 'tag' && (
                      <Select value={filter.operator} onValueChange={(v) => updateFilter(idx, 'operator', v)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="starts_with">Starts with</SelectItem>
                          <SelectItem value="is_empty">Is empty</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {filter.operator !== 'is_empty' && filter.field !== 'tag' && (
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                        placeholder="Value..."
                        className="flex-1 min-w-[120px] h-8 text-xs"
                      />
                    )}
                    {filter.field === 'tag' && (
                      <Select value={filter.value} onValueChange={(v) => updateFilter(idx, 'value', v)}>
                        <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select tag..." /></SelectTrigger>
                        <SelectContent>
                          {tags.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <button onClick={() => removeFilter(idx)} className="p-1 text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={addFilter}>
                <Plus size={14} className="mr-1" />
                Add Filter
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} disabled={!results}>
                <Save size={14} className="mr-1" />
                Save Search
              </Button>
              <Button size="sm" onClick={runSearch} className="bg-indigo-600 hover:bg-indigo-700">
                <SearchIcon size={14} className="mr-1" />
                Run Search
              </Button>
            </div>
          </div>

          {/* Results */}
          {results !== null && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{results.length}</span> {results.length === 1 ? 'result' : 'results'}
                  {selected.size > 0 && <span className="ml-3 text-indigo-600 font-medium">{selected.size} selected</span>}
                </p>
                <div className="flex gap-2">
                  {selected.size > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setShowBulkTag(true)}>
                      <TagIcon size={14} className="mr-1" />
                      Tag
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportCSV} disabled={results.length === 0}>
                    <Download size={14} className="mr-1" />
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="w-10 px-4 py-3">
                        <Checkbox checked={selected.size > 0 && selected.size === results.length} onCheckedChange={toggleSelectAll} />
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Name</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Email</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {results.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No matching results.</td></tr>
                    ) : (
                      results.map((person) => {
                        const personTags = (person.tag_ids || []).map((tid) => tags.find((t) => t.id === tid)).filter(Boolean);
                        return (
                          <tr key={person.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3"><Checkbox checked={selected.has(person.id)} onCheckedChange={() => toggleSelect(person.id)} /></td>
                            <td className="px-4 py-3">
                              <Link to={`/people/${person.id}`} className="flex items-center gap-2.5 group">
                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  {person.photo_url ? <img src={person.photo_url} alt="" className="w-full h-full object-cover rounded-full" /> : <span className="text-xs font-medium text-slate-500">{person.first_name?.[0]}{person.last_name?.[0]}</span>}
                                </div>
                                <span className="text-sm font-medium text-slate-900 group-hover:text-indigo-600">{person.first_name} {person.last_name}</span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{person.email || '—'}</td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${person.status === 'active' ? 'bg-emerald-50 text-emerald-600' : person.status === 'visitor' ? 'bg-amber-50 text-amber-600' : person.status === 'member' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>{person.status}</span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <div className="flex flex-wrap gap-1">
                                {personTags.slice(0, 3).map((tag) => (
                                  <span key={tag.id} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>{tag.name}</span>
                                ))}
                                {personTags.length > 3 && <span className="text-[10px] text-slate-400">+{personTags.length - 3}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <Dialog open onOpenChange={() => setShowSaveDialog(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Save Search</DialogTitle></DialogHeader>
            <div>
              <Label className="text-xs font-medium text-slate-600">Search Name</Label>
              <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Active Members in Elkhart" onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveSearch} disabled={!searchName.trim()} className="bg-indigo-600 hover:bg-indigo-700">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Tag */}
      {showBulkTag && (
        <Dialog open onOpenChange={() => setShowBulkTag(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Tag {selected.size} People</DialogTitle></DialogHeader>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm font-medium text-slate-700 flex-1">{tag.name}</span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkTag(tag.id, 'add')} className="h-7 text-xs">Add</Button>
                </div>
              ))}
              {tags.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No tags created yet.</p>}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowBulkTag(false)}>Done</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}