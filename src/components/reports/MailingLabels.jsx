import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Mail } from 'lucide-react';
import { jsPDF } from 'jspdf';
import moment from 'moment';

const LABEL_FORMATS = {
  '5160': { name: 'Avery 5160 (30 per page)', cols: 3, rows: 10, labelW: 2.625, labelH: 1.0, marginLeft: 0.5, marginTop: 0.5, gapX: 0.125, fontSize: 9 },
  '5163': { name: 'Avery 5163 (14 per page)', cols: 2, rows: 7, labelW: 4.0, labelH: 2.0, marginLeft: 0.156, marginTop: 0.5, gapX: 0.156, fontSize: 12 },
  '5164': { name: 'Avery 5164 (6 per page)', cols: 2, rows: 3, labelW: 3.33, labelH: 4.0, marginLeft: 0.3, marginTop: 0.5, gapX: 0.3, fontSize: 16 },
};

const NAME_FORMATS = [
  { value: 'family', label: 'The Johnson Family' },
  { value: 'couple', label: 'Mark & Marci Johnson' },
  { value: 'individual', label: 'Mark Johnson' },
];

export default function MailingLabels({ people, tags, savedSearches, families }) {
  const [format, setFormat] = useState('5160');
  const [popType, setPopType] = useState('everyone');
  const [popId, setPopId] = useState('');
  const [mode, setMode] = useState('household');
  const [nameFormat, setNameFormat] = useState('family');

  const familyMap = useMemo(() => { const m = {}; families.forEach(f => { m[f.id] = f; }); return m; }, [families]);

  const getPopulation = () => {
    if (popType === 'everyone') return people;
    if (popType === 'tag') return people.filter(p => (p.tag_ids || []).includes(popId));
    const search = savedSearches.find(s => s.id === popId);
    if (!search) return people;
    const filters = search.query_config?.filters || [];
    return people.filter(person => filters.every(f => {
      if (!f.value && f.operator !== 'is_empty') return true;
      if (f.field === 'tag') return (person.tag_ids || []).includes(f.value);
      let val = f.field.startsWith('custom.') ? person.custom_fields?.[f.field.replace('custom.', '')] || '' : person[f.field] || '';
      if (f.operator === 'contains') return String(val).toLowerCase().includes(String(f.value).toLowerCase());
      if (f.operator === 'equals') return String(val).toLowerCase() === String(f.value).toLowerCase();
      if (f.operator === 'is_empty') return !val;
      return true;
    }));
  };

  const buildHouseholds = (pop) => {
    const groups = {};
    const individuals = [];
    pop.forEach(p => {
      if (p.family_id) {
        if (!groups[p.family_id]) groups[p.family_id] = [];
        groups[p.family_id].push(p);
      } else individuals.push(p);
    });
    const labels = [];
    Object.entries(groups).forEach(([fid, members]) => {
      const fam = familyMap[fid];
      const head = members.find(m => m.family_role === 'head_of_household');
      const spouse = members.find(m => m.family_role === 'spouse');
      const lastName = fam?.family_name || head?.last_name || '';
      let nameLine;
      if (nameFormat === 'family') nameLine = `The ${lastName} Family`;
      else if (nameFormat === 'couple' && head && spouse) nameLine = `${head.first_name} & ${spouse.first_name} ${lastName}`;
      else if (head) nameLine = `${head.first_name} ${head.last_name}`;
      else nameLine = fam?.family_name || 'Family';
      const addr = fam?.address || head?.address || '';
      const city = fam?.city || head?.city || '';
      const state = fam?.state || head?.state || '';
      const zip = fam?.zip || head?.zip || '';
      labels.push({ nameLine, addr, cityLine: [city, state, zip].filter(Boolean).join(', ') });
    });
    individuals.forEach(p => {
      labels.push({ nameLine: `${p.first_name} ${p.last_name}`, addr: p.address || '', cityLine: [p.city, p.state, p.zip].filter(Boolean).join(', ') });
    });
    return labels;
  };

  const buildPersonLabels = (pop) => {
    return pop.map(p => ({ nameLine: `${p.first_name} ${p.last_name}`, addr: p.address || '', cityLine: [p.city, p.state, p.zip].filter(Boolean).join(', ') }));
  };

  const generatePDF = () => {
    const pop = getPopulation();
    const labels = mode === 'household' ? buildHouseholds(pop) : buildPersonLabels(pop);
    if (labels.length === 0) { alert('No labels to generate with the current selection.'); return; }

    const fmt = LABEL_FORMATS[format];
    const doc = new jsPDF({ unit: 'in', format: 'letter' });
    doc.setFontSize(fmt.fontSize);
    doc.setFont('helvetica', 'normal');

    let col = 0, row = 0;
    labels.forEach(label => {
      if (label.nameLine || label.addr || label.cityLine) {
        const x = fmt.marginLeft + col * (fmt.labelW + fmt.gapX);
        const yStart = fmt.marginTop + row * fmt.labelH + fmt.labelH * 0.30;
        const lineSpacing = fmt.labelH * 0.18;
        if (label.nameLine) doc.text(label.nameLine, x, yStart);
        if (label.addr) doc.text(label.addr, x, yStart + lineSpacing);
        if (label.cityLine) doc.text(label.cityLine, x, yStart + lineSpacing * 2);
      }
      row++;
      if (row >= fmt.rows) { row = 0; col++; }
      if (col >= fmt.cols) { col = 0; row = 0; doc.addPage(); doc.setFontSize(fmt.fontSize); doc.setFont('helvetica', 'normal'); }
    });

    doc.save(`mailing-labels-${format}-${moment().format('YYYY-MM-DD')}.pdf`);
  };

  const previewCount = () => {
    const pop = getPopulation();
    return mode === 'household' ? buildHouseholds(pop).length : pop.length;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <Mail size={18} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">Mailing Labels</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium text-slate-600">Label Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LABEL_FORMATS).map(([key, fmt]) => (
                <SelectItem key={key} value={key}>{fmt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              <Label className="text-xs font-medium text-slate-600">{popType === 'tag' ? 'Tag' : 'Search'}</Label>
              <select value={popId} onChange={e => setPopId(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                <option value="">Select…</option>
                {popType === 'tag' ? tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                  : savedSearches.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="household">One per household</SelectItem>
                <SelectItem value="person">One per person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === 'household' && (
            <div>
              <Label className="text-xs font-medium text-slate-600">Name Format</Label>
              <Select value={nameFormat} onValueChange={setNameFormat}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NAME_FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">Labels to generate</span>
          <span className="text-sm font-semibold text-slate-900">{previewCount()}</span>
        </div>

        <Button onClick={generatePDF} disabled={previewCount() === 0} className="w-full bg-indigo-600 hover:bg-indigo-700">
          <Download size={16} className="mr-2" />Generate PDF
        </Button>
      </div>
    </div>
  );
}