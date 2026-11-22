export function downloadCsv(rows: Array<Array<unknown>>, filename: string): void {
  if (!rows.length) return;
  const safe = (v: unknown): string => {
    let str = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
    return '"' + str.replaceAll('"', '""') + '"';
  };
  const csvString = '\ufeff' + rows.map(r => r.map(safe).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csvString], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

