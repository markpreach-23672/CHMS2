import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Printer, Eye } from 'lucide-react';
import moment from 'moment';

const ALL_FIELDS = [
  { key: 'phone', label: 'Phone' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'homePhone', label: 'Home Phone (family)' },
  { key: 'status', label: 'Status' },
  { key: 'familyRole', label: 'Family Role' },
  { key: 'maritalStatus', label: 'Marital Status' },
  { key: 'membershipDate', label: 'Membership Date' },
  { key: 'baptismDate', label: 'Baptism Date' },
];

const PHOTO_SIZES = { small: 40, medium: 60, large: 80 };
const ROLE_LABELS = { head_of_household: 'Head of Household', spouse: 'Spouse', adult: 'Adult', child: 'Child', unassigned: 'Unassigned', other: 'Other' };

export default function ChurchDirectory({ people, families, church, tags, savedSearches }) {
  const [includePhotos, setIncludePhotos] = useState(true);
  const [photoSize, setPhotoSize] = useState('medium');
  const [familyGrouped, setFamilyGrouped] = useState(true);
  const [fields, setFields] = useState({ phone: true, email: true, address: false, birthday: false, homePhone: false, mobile: false, status: false, familyRole: false, maritalStatus: false, membershipDate: false, baptismDate: false });
  const [popType, setPopType] = useState('everyone');
  const [popId, setPopId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPreview, setShowPreview] = useState(false);

  const toggleField = (key) => setFields(prev => ({ ...prev, [key]: !prev[key] }));

  const filteredPeople = useMemo(() => {
    let pop = people;
    if (popType === 'tag' && popId) pop = pop.filter(p => (p.tag_ids || []).includes(popId));
    else if (popType === 'saved_search' && popId) {
      const search = savedSearches.find(s => s.id === popId);
      if (search) {
        const filters = search.query_config?.filters || [];
        pop = pop.filter(person => filters.every(filter => {
          if (!filter.value && filter.operator !== 'is_empty') return true;
          if (filter.field === 'tag') return (person.tag_ids || []).includes(filter.value);
          let val = filter.field.startsWith('custom.') ? person.custom_fields?.[filter.field.replace('custom.', '')] || '' : person[filter.field] || '';
          switch (filter.operator) {
            case 'contains': return String(val).toLowerCase().includes(String(filter.value).toLowerCase());
            case 'equals': return String(val).toLowerCase() === String(filter.value).toLowerCase();
            case 'starts_with': return String(val).toLowerCase().startsWith(String(filter.value).toLowerCase());
            case 'is_empty': return !val;
            default: return true;
          }
        }));
      }
    }
    if (statusFilter !== 'all') pop = pop.filter(p => p.status === statusFilter);
    return pop;
  }, [people, popType, popId, statusFilter, savedSearches]);

  const getFieldValue = (p, key, family) => {
    switch (key) {
      case 'phone': return p.phone || p.mobile || '';
      case 'mobile': return p.mobile || '';
      case 'email': return p.email || '';
      case 'address': return [p.address, p.city, p.state, p.zip].filter(Boolean).join(', ');
      case 'birthday': return p.birth_date ? moment(p.birth_date).format('MMM D') : '';
      case 'homePhone': return family?.home_phone || '';
      case 'status': return p.status || '';
      case 'familyRole': return ROLE_LABELS[p.family_role] || '';
      case 'maritalStatus': return p.marital_status ? p.marital_status.charAt(0).toUpperCase() + p.marital_status.slice(1) : '';
      case 'membershipDate': return p.membership_date ? moment(p.membership_date).format('MMM D, YYYY') : '';
      case 'baptismDate': return p.baptism_date ? moment(p.baptism_date).format('MMM D, YYYY') : '';
      default: return '';
    }
  };

  const renderPersonHTML = (p, family) => {
    const photoPx = PHOTO_SIZES[photoSize];
    let html = '<div class="entry">';
    if (includePhotos) {
      if (p.photo_url) html += `<img src="${p.photo_url}" style="width:${photoPx}px;height:${photoPx}px" />`;
      else html += `<div class="photo-placeholder" style="width:${photoPx}px;height:${photoPx}px;font-size:${Math.round(photoPx * 0.3)}px">${(p.first_name?.[0] || '')}${(p.last_name?.[0] || '')}</div>`;
    }
    html += '<div class="entry-info">';
    html += `<div class="entry-name">${p.first_name || ''} ${p.last_name || ''}</div>`;
    ALL_FIELDS.forEach(f => {
      if (!fields[f.key]) return;
      const val = getFieldValue(p, f.key, family);
      if (val) html += `<div class="entry-detail">${f.label}: ${val}</div>`;
    });
    html += '</div></div>';
    return html;
  };

  const generateHTML = () => {
    const photoPx = PHOTO_SIZES[photoSize];
    let html = '<!DOCTYPE html><html><head><title>Church Directory</title><style>';
    html += '@page { size: letter; margin: 0.5in; }';
    html += '* { box-sizing: border-box; }';
    html += 'body { font-family: "Helvetica Neue", Arial, sans-serif; color: #333; margin: 0; }';
    html += '.cover { text-align: center; page-break-after: always; padding-top: 2.5in; }';
    html += '.cover img.logo { max-width: 120px; max-height: 120px; margin-bottom: 24px; border-radius: 8px; }';
    html += '.cover h1 { font-size: 32px; margin: 0 0 8px; color: #1e293b; }';
    html += '.cover p { font-size: 16px; color: #94a3b8; margin: 0; }';
    html += '.section-title { font-size: 14px; font-weight: 700; color: #4f46e5; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 1px; }';
    html += '.family-block { page-break-inside: avoid; margin-bottom: 24px; }';
    html += '.family-name { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }';
    html += '.family-addr { font-size: 12px; color: #94a3b8; margin-bottom: 12px; }';
    html += `.entry { display: flex; gap: 14px; margin-bottom: 14px; page-break-inside: avoid; }`;
    html += `.entry img { border-radius: 50%; object-fit: cover; flex-shrink: 0; }`;
    html += `.photo-placeholder { border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; flex-shrink: 0; font-weight: 600; }`;
    html += '.entry-info { flex: 1; }';
    html += '.entry-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }';
    html += '.entry-detail { font-size: 12px; color: #64748b; }';
    html += '</style></head><body>';

    html += '<div class="cover">';
    if (church?.logo_url) html += `<img class="logo" src="${church.logo_url}" />`;
    html += `<h1>${church?.name || 'Church'} Directory</h1>`;
    html += `<p>${moment().format('MMMM YYYY')}</p>`;
    html += '</div>';

    if (familyGrouped) {
      const groups = {};
      const individuals = [];
      filteredPeople.forEach(p => {
        if (p.family_id) { if (!groups[p.family_id]) groups[p.family_id] = []; groups[p.family_id].push(p); }
        else individuals.push(p);
      });
      const sortedFamilies = Object.entries(groups)
        .map(([fid, members]) => ({ family: families.find(f => f.id === fid), members }))
        .sort((a, b) => (a.family?.family_name || '').localeCompare(b.family?.family_name || ''));

      sortedFamilies.forEach(({ family, members }) => {
        html += '<div class="family-block">';
        html += `<div class="family-name">${family?.family_name || 'Family'} Family</div>`;
        if (fields.address && (family?.address || members[0]?.address)) {
          const a = family?.address || members[0]?.address;
          const c = family?.city || members[0]?.city;
          const s = family?.state || members[0]?.state;
          const z = family?.zip || members[0]?.zip;
          html += `<div class="family-addr">${[a, c, s, z].filter(Boolean).join(', ')}</div>`;
        }
        if (fields.homePhone && family?.home_phone) html += `<div class="family-addr">${family.home_phone}</div>`;
        members.forEach(m => { html += renderPersonHTML(m, family); });
        html += '</div>';
      });

      if (individuals.length > 0) {
        html += '<div class="section-title">Individuals</div>';
        individuals.sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`));
        individuals.forEach(p => { html += renderPersonHTML(p); });
      }
    } else {
      const sorted = [...filteredPeople].sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`));
      sorted.forEach(p => { html += renderPersonHTML(p); });
    }

    html += '</body></html>';
    return html;
  };

  const generateDirectory = () => {
    const html = generateHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow pop-ups to generate the directory.'); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <BookOpen size={18} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Church Directory</h2>
        </div>

        <div className="space-y-5">
          {/* Population */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-2 block">Who to Include</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={popType} onValueChange={setPopType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="tag">By Tag</SelectItem>
                  <SelectItem value="saved_search">By Saved Search</SelectItem>
                </SelectContent>
              </Select>
              {popType !== 'everyone' ? (
                <select value={popId} onChange={e => setPopId(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-transparent text-sm">
                  <option value="">Select…</option>
                  {popType === 'tag' ? tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                    : savedSearches.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active only</SelectItem>
                    <SelectItem value="member">Members only</SelectItem>
                    <SelectItem value="visitor">Visitors only</SelectItem>
                    <SelectItem value="inactive">Inactive only</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-slate-700">Include photos</Label>
                <p className="text-xs text-slate-400">Show profile photos in the directory</p>
              </div>
              <Switch checked={includePhotos} onCheckedChange={setIncludePhotos} />
            </div>
            {includePhotos && (
              <div>
                <Label className="text-xs font-medium text-slate-600">Photo size</Label>
                <Select value={photoSize} onValueChange={setPhotoSize}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Family grouping */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-slate-700">Group by family</Label>
              <p className="text-xs text-slate-400">Family listings with members, or flat alphabetical</p>
            </div>
            <Switch checked={familyGrouped} onCheckedChange={setFamilyGrouped} />
          </div>

          {/* Fields */}
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-2 block">Contact Fields to Include</Label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg">
              {ALL_FIELDS.map(f => (
                <label key={f.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <Checkbox checked={fields[f.key]} onCheckedChange={() => toggleField(f.key)} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">{filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'} · {familyGrouped ? 'Family-grouped' : 'Alphabetical'}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowPreview(!showPreview)}>
              <Eye size={16} className="mr-2" />{showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
            <Button onClick={generateDirectory} disabled={filteredPeople.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              <Printer size={16} className="mr-2" />Generate PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Live Preview</h3>
          <div className="border border-slate-200 rounded-lg overflow-auto max-h-[600px]">
            <div className="p-4" dangerouslySetInnerHTML={{ __html: generateHTML().replace(/<!DOCTYPE html><html><head>.*?<\/head><body>/s, '').replace(/<\/body><\/html>/, '') }} />
          </div>
        </div>
      )}
    </div>
  );
}