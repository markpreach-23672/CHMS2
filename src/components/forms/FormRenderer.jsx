import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

export default function FormRenderer({ fields, values, onChange, errors = {}, disabled = false }) {
  const handleChange = (fieldId, value) => {
    onChange({ ...values, [fieldId]: value });
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const error = errors[field.id];
        const value = values[field.id];

        if (field.type === 'section') {
          return (
            <div key={field.id} className="pt-2">
              <h3 className="text-lg font-semibold text-slate-900">{field.label}</h3>
              {field.description && <p className="text-sm text-slate-500 mt-0.5">{field.description}</p>}
            </div>
          );
        }

        return (
          <div key={field.id}>
            <Label className="text-sm font-medium text-slate-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            {field.description && <p className="text-xs text-slate-400 mb-1">{field.description}</p>}

            {field.type === 'text' && (
              <Input value={value || ''} onChange={(e) => handleChange(field.id, e.target.value)} disabled={disabled} placeholder={field.placeholder} className={error ? 'border-red-400' : ''} />
            )}
            {field.type === 'essay' && (
              <Textarea value={value || ''} onChange={(e) => handleChange(field.id, e.target.value)} disabled={disabled} rows={3} className={error ? 'border-red-400' : ''} />
            )}
            {field.type === 'email' && (
              <Input type="email" value={value || ''} onChange={(e) => handleChange(field.id, e.target.value)} disabled={disabled} placeholder="you@example.com" className={error ? 'border-red-400' : ''} />
            )}
            {field.type === 'phone' && (
              <Input type="tel" value={value || ''} onChange={(e) => handleChange(field.id, e.target.value)} disabled={disabled} placeholder="(555) 123-4567" className={error ? 'border-red-400' : ''} />
            )}
            {field.type === 'date' && (
              <Input type="date" value={value || ''} onChange={(e) => handleChange(field.id, e.target.value)} disabled={disabled} className={error ? 'border-red-400' : ''} />
            )}
            {field.type === 'name' && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First Name" value={value?.first || ''} onChange={(e) => handleChange(field.id, { ...value, first: e.target.value })} disabled={disabled} className={error ? 'border-red-400' : ''} />
                <Input placeholder="Last Name" value={value?.last || ''} onChange={(e) => handleChange(field.id, { ...value, last: e.target.value })} disabled={disabled} className={error ? 'border-red-400' : ''} />
              </div>
            )}
            {field.type === 'address' && (
              <div className="space-y-2">
                <Input placeholder="Street Address" value={value?.street || ''} onChange={(e) => handleChange(field.id, { ...value, street: e.target.value })} disabled={disabled} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="City" value={value?.city || ''} onChange={(e) => handleChange(field.id, { ...value, city: e.target.value })} disabled={disabled} />
                  <Input placeholder="State" value={value?.state || ''} onChange={(e) => handleChange(field.id, { ...value, state: e.target.value })} disabled={disabled} />
                  <Input placeholder="ZIP" value={value?.zip || ''} onChange={(e) => handleChange(field.id, { ...value, zip: e.target.value })} disabled={disabled} />
                </div>
              </div>
            )}
            {field.type === 'select' && (
              <Select value={value || ''} onValueChange={(v) => handleChange(field.id, v)} disabled={disabled}>
                <SelectTrigger className={error ? 'border-red-400' : ''}><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{(field.options || []).map((opt, i) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {field.type === 'radio' && (
              <RadioGroup value={value || ''} onValueChange={(v) => handleChange(field.id, v)} disabled={disabled}>
                {(field.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`${field.id}-${i}`} />
                    <Label htmlFor={`${field.id}-${i}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            {field.type === 'checkbox' && (
              <div className="space-y-2">
                {(field.options || []).map((opt, i) => {
                  const checked = (value || []).includes(opt);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox checked={checked} onCheckedChange={(c) => {
                        const newVal = c ? [...(value || []), opt] : (value || []).filter((v) => v !== opt);
                        handleChange(field.id, newVal);
                      }} disabled={disabled} id={`${field.id}-${i}`} />
                      <Label htmlFor={`${field.id}-${i}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
                    </div>
                  );
                })}
              </div>
            )}
            {field.type === 'payment' && (
              <div className="space-y-2">
                {(field.payment_options || []).map((opt, i) => {
                  const isSelected = value?.label === opt.label;
                  return (
                    <button key={i} type="button" onClick={() => !disabled && handleChange(field.id, opt)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="text-sm font-medium text-slate-900">{opt.label}</span>
                      <span className="text-sm font-bold text-emerald-600">${Number(opt.amount).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {field.type === 'file' && (
              <Input type="file" disabled={disabled} onChange={(e) => handleChange(field.id, e.target.files?.[0]?.name || '')} />
            )}

            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}