import type { OrganizationRowDTO } from '@/types/organizations';
import type { Org360Overview } from '@/types/org360';

const COLUMNS: { header: string; get: (o: OrganizationRowDTO) => string | number }[] = [
  { header: 'Name', get: (o) => o.name },
  { header: 'Code', get: (o) => o.slug },
  { header: 'Status', get: (o) => o.derivedStatus },
  { header: 'Plan', get: (o) => o.plan?.name ?? '' },
  { header: 'Subscription', get: (o) => o.subscriptionStatus },
  { header: 'Experience', get: (o) => o.workspaceExperience },
  { header: 'Owner', get: (o) => o.owner?.name ?? '' },
  { header: 'Email', get: (o) => o.owner?.email ?? o.email ?? '' },
  { header: 'Phone', get: (o) => o.owner?.phone ?? o.phone ?? '' },
  { header: 'Country', get: (o) => o.country ?? '' },
  { header: 'Timezone', get: (o) => o.timezone ?? '' },
  { header: 'Members', get: (o) => o.usage.members.used },
  { header: 'Member Limit', get: (o) => (o.usage.members.limit == null ? 'Unlimited' : o.usage.members.limit) },
  { header: 'Branches', get: (o) => o.usage.branches.used },
  { header: 'Users', get: (o) => o.usage.users.used },
  { header: 'Health Score', get: (o) => o.health.score },
  { header: 'Health', get: (o) => o.health.band },
  { header: 'Payment', get: (o) => o.paymentStatus },
  { header: 'Created', get: (o) => new Date(o.createdAt).toISOString().slice(0, 10) },
  { header: 'Last Active', get: (o) => (o.lastActiveAt ? new Date(o.lastActiveAt).toISOString().slice(0, 10) : '') },
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

// Export the full Organization 360 snapshot (used by the "Export Organization"
// quick action) as a single structured JSON file — richer than the flat CSV
// used for the multi-org directory export.
export function exportOrgOverviewJson(overview: Org360Overview) {
  const blob = new Blob([JSON.stringify(overview, null, 2)], { type: 'application/json' });
  download(blob, `gymflow-${overview.slug}-${stamp()}.json`);
}

export function exportOrgsCsv(orgs: OrganizationRowDTO[]) {
  const header = COLUMNS.map((c) => c.header).join(',');
  const rows = orgs.map((o) => COLUMNS.map((c) => escapeCsv(c.get(o))).join(','));
  const csv = [header, ...rows].join('\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `gymflow-organizations-${stamp()}.csv`);
}

export function exportOrgsExcel(orgs: OrganizationRowDTO[]) {
  // A minimal HTML table is the most dependency-free way to hand Excel a file
  // it opens natively with formatting intact.
  const head = `<tr>${COLUMNS.map((c) => `<th>${c.header}</th>`).join('')}</tr>`;
  const body = orgs.map((o) => `<tr>${COLUMNS.map((c) => `<td>${String(c.get(o)).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">${head}${body}</table></body></html>`;
  download(new Blob([html], { type: 'application/vnd.ms-excel' }), `gymflow-organizations-${stamp()}.xls`);
}

// PDF export via the browser print dialog: renders a clean, printable table in
// a new window and triggers print (users pick "Save as PDF").
export function exportOrgsPdf(orgs: OrganizationRowDTO[]) {
  const head = `<tr>${COLUMNS.map((c) => `<th>${c.header}</th>`).join('')}</tr>`;
  const body = orgs.map((o) => `<tr>${COLUMNS.map((c) => `<td>${String(c.get(o)).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>GymFlow Organizations — ${stamp()}</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { color: #666; font-size: 12px; margin-top: 0; }
      table { border-collapse: collapse; width: 100%; font-size: 10px; margin-top: 16px; }
      th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }
      th { background: #f4f4f5; }
    </style></head>
    <body>
      <h1>GymFlow — Organizations</h1>
      <p>${orgs.length} organizations · exported ${new Date().toLocaleString()}</p>
      <table>${head}${body}</table>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`);
  win.document.close();
}
