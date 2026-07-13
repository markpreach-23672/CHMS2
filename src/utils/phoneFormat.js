// Formats a phone number into (XXX) XXX-XXXX as digits are entered.
// Leaves values with extensions/international prefixes readable.
export function formatPhone(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  // Handle leading US country code
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length === 0) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  // Longer than 10 digits (extension etc.) — format first 10, append the rest
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)} x${d.slice(10)}`;
}