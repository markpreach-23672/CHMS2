import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { BookOpen, Printer } from 'lucide-react';
import moment from 'moment';

export default function ChurchDirectory({ people, families, church }) {
  const [includePhotos, setIncludePhotos] = useState(true);
  const [familyGrouped, setFamilyGrouped] = useState(true);
  const [fields, setFields] = useState({ phone: true, email: true, address: false, birthday: false, homePhone: false });

  const toggleField = (key) => setFields(prev => ({ ...prev, [key]: !prev[key] }));

  const renderPerson = (p, photos, flds) => {
    let html = '<div class="entry">';
    if (photos) {
      if (p.photo_url) html += `<img src="${p.photo_url}" />`;
      else html += `<div class="photo-placeholder">${(p.first_name?.[0] || '')}${(p.last_name?.[0] || '')}</div>`;
    }
    html += '<div class="entry-info">';
    html += `<div class="entry-name">${p.first_name || ''} ${p.last_name || ''}</div>`;
    if (flds.phone && (p.phone || p.mobile)) html += `<div class="entry-detail">${p.phone || p.mobile}</div>`;
    if (flds.email && p.email) html += `<div class="entry-detail">${p.email}</div>`;
    if (flds.address && p.address) html += `<div class="entry-detail">${[p.address, p.city, p.state, p.zip].filter(Boolean).join(', ')}</div>`;
    if (flds.birthday && p.birth_date) html += `<div class="entry-detail">Birthday: ${moment(p.birth_date).format('MMM D')}</div>`;
    html += '</div></div>';
    return html;
  };

  const generateHTML = () => {
    const flds = fields;
    const photos = includePhotos;
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
    html += '.entry { display: flex; gap: 14px; margin-bottom: 14px; page-break-inside: avoid; }';
    html += '.entry img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }';
    html += '.photo-placeholder { width: 60px; height: 60px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #94a3b8; flex-shrink: 0; }';
    html += '.entry-info { flex: 1; }';
    html += '.entry-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }';
    html += '.entry-detail { font-size: 12px; color: #64748b; }';
    html += '</style></head><body>';

    // Cover page
    html += '<div class="cover">';
    if (church?.logo_url) html += `<img class="logo" src="${church.logo_url}" />`;
    html += `<h1>${church?.name || 'Church'} Directory</h1>`;
    html += `<p>${moment().format('MMMM YYYY')}</p>`;
    html += '</div>';

    if (familyGrouped) {
      const groups = {};
      const individuals = [];
      people.forEach(p => {
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
        members.forEach(m => { html += renderPerson(m, photos, flds); });
        html += '</div>';
      });

      if (individuals.length > 0) {
        html += '<div class="section-title">Individuals</div>';
        individuals.sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`));
        individuals.forEach(p => { html += renderPerson(p, photos, flds); });
      }
    } else {
      const sorted = [...people].sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`));
      sorted.forEach(p => { html += renderPerson(p, photos, flds); });
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
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <BookOpen size={18} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">Church Directory</h2>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium text-slate-700">Include photos</Label>
            <p className="text-xs text-slate-400">Show profile photos in the directory</p>
          </div>
          <Switch checked={includePhotos} onCheckedChange={setIncludePhotos} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium text-slate-700">Group by family</Label>
            <p className="text-xs text-slate-400">Family listings with members, or flat alphabetical</p>
          </div>
          <Switch checked={familyGrouped} onCheckedChange={setFamilyGrouped} />
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600 mb-2 block">Include Fields</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'phone', label: 'Phone' },
              { key: 'email', label: 'Email' },
              { key: 'address', label: 'Address' },
              { key: 'birthday', label: 'Birthday' },
              { key: 'homePhone', label: 'Home Phone (family)' },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <Checkbox checked={fields[f.key]} onCheckedChange={() => toggleField(f.key)} />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">{familyGrouped ? 'Family-grouped' : 'Individual'} directory with {people.length} {people.length === 1 ? 'person' : 'people'}</span>
        </div>

        <Button onClick={generateDirectory} disabled={people.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700">
          <Printer size={16} className="mr-2" />Generate Directory (Print to PDF)
        </Button>
      </div>
    </div>
  );
}