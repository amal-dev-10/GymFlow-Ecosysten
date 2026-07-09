import type { PlatformUserRowDTO } from '@/types/platformUsers';

const COLUMNS: { header: string; get: (u: PlatformUserRowDTO) => string | number }[] = [
  { header: 'Name', get: (u) => u.fullName },
  { header: 'Email', get: (u) => u.email ?? '' },
  { header: 'Phone', get: (u) => u.phone },
  { header: 'Department', get: (u) => u.department ?? '' },
  { header: 'Role', get: (u) => u.role },
  { header: 'Status', get: (u) => u.status },
  { header: 'MFA', get: (u) => (u.mfaEnabled ? 'Enabled' : 'Disabled') },
  { header: 'Last Login', get: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : '') },
  { header: 'Last Activity', get: (u) => (u.lastActivityAt ? new Date(u.lastActivityAt).toISOString() : '') },
  { header: 'Created', get: (u) => new Date(u.createdAt).toISOString().slice(0, 10) },
];

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

export function exportPlatformUsersCsv(users: PlatformUserRowDTO[]) {
  const header = COLUMNS.map((c) => c.header).join(',');
  const rows = users.map((u) => COLUMNS.map((c) => escapeCsv(c.get(u))).join(','));
  download(new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' }), `gymflow-platform-users-${stamp()}.csv`);
}

export function exportPlatformUsersExcel(users: PlatformUserRowDTO[]) {
  const head = `<tr>${COLUMNS.map((c) => `<th>${c.header}</th>`).join('')}</tr>`;
  const body = users.map((u) => `<tr>${COLUMNS.map((c) => `<td>${String(c.get(u)).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  download(new Blob([`<html><head><meta charset="utf-8"></head><body><table border="1">${head}${body}</table></body></html>`], { type: 'application/vnd.ms-excel' }), `gymflow-platform-users-${stamp()}.xls`);
}

export function exportPlatformUsersPdf(users: PlatformUserRowDTO[]) {
  const head = `<tr>${COLUMNS.map((c) => `<th>${c.header}</th>`).join('')}</tr>`;
  const body = users.map((u) => `<tr>${COLUMNS.map((c) => `<td>${String(c.get(u)).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>GymFlow Platform Users — ${stamp()}</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #666; font-size: 12px; margin-top: 0; }
      table { border-collapse: collapse; width: 100%; font-size: 10px; margin-top: 16px; }
      th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }
      th { background: #f4f4f5; }
    </style></head>
    <body>
      <h1>GymFlow — Platform Users</h1>
      <p>${users.length} users · exported ${new Date().toLocaleString()}</p>
      <table>${head}${body}</table>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`);
  win.document.close();
}
