// Zero-dependency CSV/Excel/PDF export, same technique already used by
// lib/platformUserExport.ts and PLT-010's Export Center - no new libraries.

export interface ExportColumn<T> {
  header: string;
  get: (row: T) => string | number;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportRevenueCsv<T>(title: string, columns: ExportColumn<T>[], rows: T[]) {
  const header = columns.map((c) => c.header).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCsv(c.get(r))).join(','));
  download(new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' }), `gymflow-${title}-${stamp()}.csv`);
}

export function exportRevenueExcel<T>(title: string, columns: ExportColumn<T>[], rows: T[]) {
  const head = `<tr>${columns.map((c) => `<th>${c.header}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${String(c.get(r)).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  download(new Blob([`<html><head><meta charset="utf-8"></head><body><table border="1">${head}${body}</table></body></html>`], { type: 'application/vnd.ms-excel' }), `gymflow-${title}-${stamp()}.xls`);
}

export function exportRevenuePdf<T>(title: string, columns: ExportColumn<T>[], rows: T[]) {
  const head = `<tr>${columns.map((c) => `<th>${c.header}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${String(c.get(r)).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>GymFlow — ${title} — ${stamp()}</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #666; font-size: 12px; margin-top: 0; }
      table { border-collapse: collapse; width: 100%; font-size: 10px; margin-top: 16px; }
      th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }
      th { background: #f4f4f5; }
    </style></head>
    <body>
      <h1>GymFlow — ${title}</h1>
      <p>${rows.length} row(s) · exported ${new Date().toLocaleString()}</p>
      <table>${head}${body}</table>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`);
  win.document.close();
}
