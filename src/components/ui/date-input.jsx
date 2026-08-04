import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

function isoToDisplay(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${m}/${d}/${y}`;
}

function parseToIso(text) {
  const t = text.trim();
  if (!t) return '';
  const m = t.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2}|\d{4})$/);
  if (!m) return null;
  let [, mm, dd, yy] = m;
  if (yy.length === 2) yy = String(2000 + Number(yy));
  const mo = Number(mm), da = Number(dd);
  if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  return `${yy}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
}

export default function DateInput({ value, onChange, className, inputClassName, disabled, ...props }) {
  const [text, setText] = useState(isoToDisplay(value));
  const [focused, setFocused] = useState(false);
  const nativeRef = useRef(null);

  useEffect(() => {
    if (!focused) setText(isoToDisplay(value));
  }, [value, focused]);

  const handleText = (t) => {
    setText(t);
    const iso = parseToIso(t);
    if (iso !== null) onChange(iso);
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        value={text}
        onChange={(e) => handleText(e.target.value)}
        placeholder="MM/DD/YYYY"
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setText(isoToDisplay(value)); }}
        disabled={disabled}
        className={cn('pr-9', inputClassName)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => {
          const el = nativeRef.current;
          if (!el) return;
          // showPicker() throws inside a cross-origin iframe (e.g. the app preview)
          try {
            if (el.showPicker) el.showPicker();
            else el.click();
          } catch {
            el.click();
          }
        }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-40"
      >
        <Calendar size={15} />
      </button>
      <input
        ref={nativeRef}
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-0 bottom-0 w-px h-px opacity-0 pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}