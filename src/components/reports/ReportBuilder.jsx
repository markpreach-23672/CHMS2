import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Save, Bookmark, Trash2, Plus, Search as SearchIcon } from 'lucide-react';
import moment from 'moment';

const BUILT_IN_COLUMNS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP' },
  { key: 'birth_date', label: 'Birth Date' },
  { key: 'status', label: 'Status' },
  { key: 'family_role', label: 'Family Role' },
  { key: 'family_name', label: 'Family Name' },
  { key: 'ytd_giving', label: 'YTD Giving' },
  { key: 'notes', label: 'Notes' },
];

const ROLE_LABELS = { head_of_household: 'Head of Household', spouse: 'Spouse', child: 'Child', other: 'Other' };

export default function ReportBuilder({ people, tags, savedSearches, customFields, families, donations, savedReports, onReportsChanged }) {
  const [popType, setPopType] = useState('everyone');
  const [popId, setPopId] = useState('');
  const [selectedColumns, setSelectedColumns] = useState(['first_name', 'last_name', 'email', 'phone', 'status']);
  const [sortField, setSortField] = useState('last_name');
  const [sortDir, setSortDir] = useState('asc');
  const [results, setResults] = useState(null);
  const [showSave, setShowSave] = useState(false);
  const [reportName, setReportName] = useState('');

  const allColumns = [...BUILT_IN_COLUMNS, ...customFields.map(f => ({ key: `custom.${f.name}`, label: f.name }))];

  const familyMap = useMemo(() => {
    const m = {};
    families.forEach(f => { m[f.id] = f; });
    return m;
  }, [families]);

  const ytdMap = useMemo(() => {
    const m = {};
    const yearStart = moment().startOf('year');
    donations.forEach(d => {
      if (moment(d.donation_date).isSameOrAfter(yearStart)) m[d.person_id] = (m[d.person_id] || 0) + (d.amount || 0);
    });
    return m;
  }, [donations]);

  const getCellValue = (person, colKey) => {
    if (colKey.startsWith('custom.')) return person.custom_fields?.[colKey.replace('custom.', '')] || '';
    if (colKey === 'family_name') return person.family_id ? familyMap[person.family_id]?.family_name || '' : '';
    if (colKey === 'ytd_giving') return `$${(ytdMap[person.id] || 0).toFixed(2)}`;
    if (colKey === 'birth_date') return person.birth_date ? moment(person.birth_date).format('MMM D, YYYY') : '';
    if (colKey === 'family_role') return ROLE_LABELS[person.family_role] || '';
    return person[colKey] || '';
  };

  const applySavedSearch = (search) => {
    const filters = search.query_config?.filters || [];
    return people.filter(person => filters.every(filter => {
      if (!filter.value && filter.operator !== 'is_empty') return true;
      if (filter.field === 'tag') return (person.tag_ids || []).includes(filter.value);
      let val = filter.field.startsWith('custom.')
        ? person.custom_fields?.[filter.field.replace('custom.', '')] || ''
        : person[filter.field] || '';
      switch (filter.operator) {
        case 'contains': return String(val).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'equals': return String(val).toLowerCase() === String(filter.value).toLowerCase();
        case 'starts_with': return String(val).toLowerCase().startsWith(String(filter.value).toLowerCase());
        case 'is_empty': return !val;
        default: return true;
      }
    }));
  };

  const runReport = (opts = {}) => {
    const pType = opts.popType ?? popType;
    const pId = opts.popId ?? popId;
    const cols = opts.columns ?? selectedColumns;
    const sField = opts.sortField ?? sortField;
    const sDir = opts.sortDir ?? sortDir;

    let pop;
    if (pType === 'everyone') pop = people;
    else if (pType === 'tag') pop = people.filter(p => (p.tag_ids || []).includes(pId));
    else if (pType === 'saved_search') {
      const search = savedSearches.find(s => s.id === pId);
      pop = search ? applySavedSearch(search) : people;
    }

    const sorted = [...pop].sort((a, b) => {
      let aVal = getCellValue(a, sField);
      let bVal = getCellValue(b, sField);
      if (sField === 'ytd_giving') {
        aVal = parseFloat(String(aVal).replace(/[$,]/g, '')) || 0;
        bVal = parseFloat(String(bVal).replace(/[$,]/g, '')) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sDir === 'asc' ? 1 : -1;
      return 0;
    });
    setResults(sorted);
  };

  const toggleColumn = (key) => {
    setSelectedColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const exportCSV = () => {
    if (!results || results.length === 0) return;
    const headers = selectedColumns.map(k => allColumns.find(c => c.key === k)?.label || k);
    const rows = results.map(p => selectedColumns.map(k => getCellValue(p, k)));
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!reportName.trim()) return;
    try {
      const created = await base44.entities.ReportDefinition.create({
        name: reportName, population_type: popType, population_id: popId || undefined,
        columns: selectedColumns, sort_field: sortField, sort_direction: sortDir,
      });
      onReportsChanged([...savedReports, created]);
      setShowSave(false);
      setReportName('');
    } catch (err) { alert('Failed to save report.'); }
  };

  const loadReport = (report) => {
    setPopType(report.population_type);
    setPopId(report.population_id || '');
    setSelectedColumns(report.columns?.length ? report.columns : ['first_name', 'last_name', 'email', 'phone', 'status']);
    setSortField(report.sort_field || 'last_name');
    setSortDir(report.sort_direction || 'asc');
    runReport({
      popType: report.population_type, popId: report.population_id || '',
      columns: report.columns?.length ? report.columns : ['first_name', 'last_name', 'email', 'phone', 'status'],
      sortField: report.sort_field || 'last_name', sortDir: report.sort_direction || 'asc',
    });
  };

  const handleDeleteReport = async (report) => {
    if (!confirm(`Delete saved report "${report.name}"?`)) return;
    try {
      await base44.entities.ReportDefinition.delete(report.id);
      onReportsChanged(savedReports.filter(r => r.id !== report.id));
    } catch (err) { alert('Failed to delete report.'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Saved Reports */}
      <div className="lg:col-span-1">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Saved Reports</h3>
        <div className="space-y-1.5">
          {savedReports.length === 0 ? (
            <p className="text-xs text-slate-400">No saved reports yet.</p>
          ) : savedReports.map(r => (
            <div key={r.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all">
              <Bookmark size={14} className="text-slate-400 flex-shrink-0" />
              <button onClick={() => loadReport(r)} className="text-sm text-slate-700 hover:text-indigo-600 flex-1 text-left truncate">{r.name}</button>
              <button onClick={() => handleDeleteReport(r)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Builder */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <SearchIcon size={18} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Report Builder</h2>
          </div>

          {/* Population */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Population</Label>
              <Select value={popType} onValueChange={setPopType}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="tag">By Tag</SelectItem>
                  <SelectItem value="saved_search">By Saved Search</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {popType !== 'everyone' && (
              <div>
                <Label className="text-xs font-medium text-slate-600">{popType === 'tag' ? 'Select Tag' : 'Select Search'}</Label>
                <select value={popId} onChange={e => setPopId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                  <option value="">Select…</option>
                  {popType === 'tag' ? tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                    : savedSearches.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Columns */}
          <div className="mb-4">
            <Label className="text-xs font-medium text-slate-600 mb-2 block">Columns</Label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-lg">
              {allColumns.map(col => (
                <label key={col.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <Checkbox checked={selectedColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} />
                  {col.label}
                </label>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs font-medium text-slate-600">Sort By</Label>
              <select value={sortField} onChange={e => setSortField(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                {allColumns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600">Direction</Label>
              <Select value={sortDir} onValueChange={setSortDir}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSave(true)} disabled={!results}>
              <Save size={14} className="mr-1.5" />Save Report
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!results || results.length === 0}>
              <Download size={14} className="mr-1.5" />Export CSV
            </Button>
            <Button size="sm" onClick={() => runReport()} className="bg-indigo-600 hover:bg-indigo-700">
              <SearchIcon size={14} className="mr-1.5" />Run Report
            </Button>
          </div>
        </div>

        {/* Results */}
        {results !== null && (
          <div className="mt-4">
            <p className="text-sm text-slate-600 mb-3"><span className="font-semibold text-slate-900">{results.length}</span> results</p>
            <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {selectedColumns.map(col => (
                      <th key={col} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                        {allColumns.find(c => c.key === col)?.label || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.length === 0 ? (
                    <tr><td colSpan={selectedColumns.length} className="px-4 py-8 text-center text-sm text-slate-400">No matching results.</td></tr>
                  ) : results.slice(0, 100).map(person => (
                    <tr key={person.id} className="hover:bg-slate-50/50">
                      {selectedColumns.map(col => (
                        <td key={col} className="px-4 py-2.5 text-sm text-slate-700 whitespace-nowrap">{getCellValue(person, col) || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.length > 100 && <p className="px-4 py-2 text-xs text-slate-400 text-center">Showing first 100 of {results.length} results. Export CSV for all.</p>}
            </div>
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSave && (
        <Dialog open onOpenChange={() => setShowSave(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Save Report</DialogTitle></DialogHeader>
            <div>
              <Label className="text-xs font-medium text-slate-600">Report Name</Label>
              <Input value={reportName} onChange={e => setReportName(e.target.value)} className="mt-1" autoFocus placeholder="e.g. Active Members Over 60" onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSave(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!reportName.trim()} className="bg-indigo-600 hover:bg-indigo-700">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}