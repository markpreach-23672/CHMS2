import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const PERSON_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP' },
  { key: 'birth_date', label: 'Birth Date' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
];

const FIELD_ALIASES = {
  first_name: ['first_name', 'firstname', 'first', 'fname', 'given_name', 'givenname'],
  last_name: ['last_name', 'lastname', 'last', 'lname', 'surname', 'family_name', 'familyname'],
  email: ['email', 'email_address', 'e-mail', 'emailaddress'],
  phone: ['phone', 'phone_number', 'telephone', 'home_phone', 'phonenumber'],
  mobile: ['mobile', 'cell', 'cell_phone', 'mobile_phone', 'cellphone'],
  address: ['address', 'street', 'street_address', 'address1', 'home_address'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  zip: ['zip', 'zip_code', 'postal_code', 'postcode', 'zipcode', 'postalcode'],
  birth_date: ['birth_date', 'birthdate', 'birthday', 'dob', 'date_of_birth', 'dateofbirth'],
  status: ['status', 'member_status', 'memberstatus'],
  notes: ['notes', 'note', 'comments', 'comment', 'description'],
};

const VALID_STATUSES = ['active', 'inactive', 'visitor', 'member'];

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

function autoMap(headers) {
  const mapping = {};
  headers.forEach((header, idx) => {
    const normalized = header.toLowerCase().trim().replace(/\s+/g, '_');
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(normalized) && mapping[field] === undefined) {
        mapping[field] = idx;
        break;
      }
    }
  });
  return mapping;
}

function sanitizeRecord(obj) {
  const cleaned = { ...obj };
  if (cleaned.status) {
    const normalized = cleaned.status.toLowerCase().trim();
    cleaned.status = VALID_STATUSES.includes(normalized) ? normalized : 'active';
  }
  return cleaned;
}

export default function ImportPeopleDialog({ onImported, onClose }) {
  const [step, setStep] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        setError('CSV file needs a header row and at least one data row.');
        return;
      }
      const hdrs = parsed[0].map((h) => h.trim());
      const dataRows = parsed.slice(1).filter((r) => r.some((c) => c.trim()));
      if (dataRows.length === 0) {
        setError('No data rows found in the CSV.');
        return;
      }
      setHeaders(hdrs);
      setRows(dataRows);
      setMapping(autoMap(hdrs));
      setStep('map');
    };
    reader.onerror = () => setError('Failed to read the file.');
    reader.readAsText(file);
  };

  const updateMapping = (field, colIdx) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (colIdx === '') {
        delete next[field];
      } else {
        next[field] = parseInt(colIdx);
      }
      return next;
    });
  };

  const mappedPreview = rows.slice(0, 5).map((row) => {
    const obj = {};
    PERSON_FIELDS.forEach((f) => {
      const colIdx = mapping[f.key];
      obj[f.key] = colIdx !== undefined ? (row[colIdx] || '').trim() : '';
    });
    return obj;
  });

  const validRowCount = rows.filter((row) => {
    const fnIdx = mapping.first_name;
    const lnIdx = mapping.last_name;
    return fnIdx !== undefined && lnIdx !== undefined && row[fnIdx]?.trim() && row[lnIdx]?.trim();
  }).length;

  const handleImport = async () => {
    setStep('importing');
    try {
      const records = rows
        .map((row) => {
          const obj = {};
          PERSON_FIELDS.forEach((f) => {
            const colIdx = mapping[f.key];
            if (colIdx !== undefined) {
              const val = (row[colIdx] || '').trim();
              if (val) obj[f.key] = val;
            }
          });
          return obj;
        })
        .filter((r) => r.first_name && r.last_name)
        .map(sanitizeRecord);

      const created = await base44.entities.Person.bulkCreate(records);
      setImportResult({ success: true, count: created.length, skipped: rows.length - records.length });
      setStep('done');
      onImported();
    } catch (err) {
      setImportResult({ success: false, error: err.message || 'Import failed.' });
      setStep('done');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={18} className="text-indigo-600" />
            Import People from CSV
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-700">Click to select a CSV file</p>
              <p className="text-xs text-slate-400 mt-1">First row should contain column headers</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle size={14} />
                {error}
              </p>
            )}
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
              <p className="font-medium text-slate-600 mb-1">Expected columns (any of these will auto-map):</p>
              <p>first_name, last_name, email, phone, mobile, address, city, state, zip, birth_date, status, notes</p>
              <p className="mt-1.5 text-slate-400">First Name and Last Name are required. Status must be: active, inactive, visitor, or member.</p>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileSpreadsheet size={16} className="text-slate-400" />
              <span className="font-medium">{fileName}</span>
              <span className="text-slate-400">·</span>
              <span>{rows.length} rows detected</span>
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
                Choose different file
              </Button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Map Columns</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {PERSON_FIELDS.map((field) => {
                  const colIdx = mapping[field.key];
                  const sample = colIdx !== undefined ? rows[0]?.[colIdx] : '';
                  return (
                    <div key={field.key} className="flex items-center gap-3 py-1">
                      <div className="w-32 flex-shrink-0">
                        <span className="text-xs font-medium text-slate-700">{field.label}</span>
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </div>
                      <Select
                        value={colIdx !== undefined ? String(colIdx) : ''}
                        onValueChange={(v) => updateMapping(field.key, v)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="— Skip —" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((hdr, idx) => (
                            <SelectItem key={idx} value={String(idx)}>{hdr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sample && (
                        <span className="text-[10px] text-slate-400 w-32 truncate flex-shrink-0">e.g. {sample}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preview (first 5 rows)</p>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {PERSON_FIELDS.filter((f) => mapping[f.key] !== undefined).map((f) => (
                          <th key={f.key} className="text-left px-3 py-2 font-medium text-slate-500 whitespace-nowrap">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mappedPreview.map((row, idx) => (
                        <tr key={idx}>
                          {PERSON_FIELDS.filter((f) => mapping[f.key] !== undefined).map((f) => (
                            <td key={f.key} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-40 truncate">{row[f.key] || <span className="text-slate-300">—</span>}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {validRowCount < rows.length && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <AlertCircle size={13} />
                {rows.length - validRowCount} row(s) will be skipped (missing first or last name).
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={mapping.first_name === undefined || mapping.last_name === undefined}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Import {validRowCount} {validRowCount === 1 ? 'person' : 'people'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-12 text-center">
            <Loader2 size={32} className="mx-auto text-indigo-600 animate-spin mb-3" />
            <p className="text-sm text-slate-600">Importing {rows.length} records...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-6 text-center space-y-3">
            {importResult?.success ? (
              <>
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="text-lg font-semibold text-slate-900">Import Complete</p>
                <p className="text-sm text-slate-500">
                  Successfully imported {importResult.count} {importResult.count === 1 ? 'person' : 'people'}.
                  {importResult.skipped > 0 && ` ${importResult.skipped} row(s) were skipped.`}
                </p>
              </>
            ) : (
              <>
                <AlertCircle size={40} className="mx-auto text-red-500" />
                <p className="text-lg font-semibold text-slate-900">Import Failed</p>
                <p className="text-sm text-red-500">{importResult?.error}</p>
              </>
            )}
            <DialogFooter>
              <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}