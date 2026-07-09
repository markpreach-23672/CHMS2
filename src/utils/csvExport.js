export function downloadPeopleCsv(people, filename = 'people.csv') {
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Mobile',
    'Address',
    'City',
    'State',
    'ZIP',
    'Status',
  ];
  const rows = people.map((p) => [
    p.first_name || '',
    p.last_name || '',
    p.email || '',
    p.phone || '',
    p.mobile || '',
    p.address || '',
    p.city || '',
    p.state || '',
    p.zip || '',
    p.status || '',
  ]);

  const escape = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const csv = [headers, ...rows]
    .map((r) => r.map(escape).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}