// Zero-dependency client-side export, same technique as lib/platformUserExport.ts:
// CSV via Blob, "Excel" via an HTML table saved with an .xls extension
// (Excel opens HTML tables natively), "PDF" via the browser's print dialog,
// JSON via Blob. No new libraries added.

import type { AuditEventRowDTO } from '@/types/audit';

const COLUMNS: { header: string; get: (e: AuditEventRowDTO) => string | number }[] = [
  { header: 'Timestamp', get: (e) => new Date(e.createdAt).toISOString() },
  { header: 'Category', get: (e) => e.eventCategory ?? '' },
  { header: 'Event', get: (e) => e.action },
  { header: 'Event Type', get: (e) => e.eventType ?? '' },
  { header: 'Performed By', get: (e) => e.user },
  { header: 'Target Resource', get: (e) => `${e.entityType ?? ''} ${e.entityId ?? ''}`.trim() },
  { header: 'Organization', get: (e) => e.organization?.name ?? '' },
  { header: 'IP Address', get: (e) => e.ipAddress ?? '' },
  { header: 'Location', get: (e) => e.country ?? '' },
  { header: 'Device', get: (e) => `${e.device} / ${e.browser} / ${e.os}` },
  { header: 'Status', get: (e) => e.status },
  { header: 'Severity', get: (e) => e.severity },
  { header: 'Correlation ID', get: (e) => e.correlationId ?? '' },
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

export function exportAuditLogsCsv(rows: AuditEventRowDTO[]) {
  const header = COLUMNS.map((c) => c.header).join(',');
  const body = rows.map((r) => COLUMNS.map((c) => escapeCsv(c.get(r))).join(','));
  download(new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' }), `gymflow-audit-log-${stamp()}.csv`);
}

export function exportAuditLogsExcel(rows: AuditEventRowDTO[]) {
  const head = `<tr>${COLUMNS.map((c) => `<th>${c.header}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${COLUMNS.map((c) => `<td>${String(c.get(r)).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
  const html = `<html><head><meta charset="utf-8"></head><body><table>${head}${body}</table></body></html>`;
  download(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `gymflow-audit-log-${stamp()}.xls`);
}

export function exportAuditLogsJson(rows: AuditEventRowDTO[]) {
  download(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }), `gymflow-audit-log-${stamp()}.json`);
}

export function exportAuditLogsPdf(rows: AuditEventRowDTO[]) {
  const head = `<tr>${COLUMNS.map((c) => `<th style="border:1px solid #ccc;padding:4px;font-size:10px;">${c.header}</th>`).join('')}</tr>`;
  const body = rows
    .map((r) => `<tr>${COLUMNS.map((c) => `<td style="border:1px solid #ccc;padding:4px;font-size:10px;">${String(c.get(r)).replace(/</g, '&lt;')}</td>`).join('')}</tr>`)
    .join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<html><head><title>GymFlow Audit Log Export</title></head><body><h3>GymFlow Audit Log Export - ${stamp()}</h3><table style="border-collapse:collapse;width:100%;">${head}${body}</table></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
