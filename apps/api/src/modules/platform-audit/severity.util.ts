// PLT-010 Audit Center severity heuristic. Used both at write time (when a
// caller of AuditLogsService.logEvent doesn't pass an explicit severity) and
// read time (to display a sensible severity for legacy rows where
// severity = null) - the same function both times, so the two never drift.
// Audit rows are immutable: legacy rows are never backfilled/mutated to add
// a stored severity, this is purely a display-time derivation for them.

export const SEVERITY_LEVELS = ['Information', 'Low', 'Medium', 'High', 'Critical'] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

const CRITICAL_KEYWORDS = ['IMPERSONAT', 'DELET', 'ARCHIV', 'SUSPICIOUS', 'BREACH', 'ALL_SESSIONS_REVOKED', 'LOCKED'];
const HIGH_KEYWORDS = ['FAILED', 'FAILURE', 'SUSPEND', 'REVOK', 'MFA_RESET', 'MFA_DISABLED', 'PASSWORD_RESET', 'DENIED', 'UNAUTHORIZED', 'REFUND', 'CANCEL'];
const MEDIUM_KEYWORDS = ['UPDATE', 'CHANGE', 'ASSIGN', 'GRANT', 'DOWNGRADE', 'OVERRIDE', 'RESET'];
const LOW_KEYWORDS = ['CREATE', 'INVIT', 'VIEW', 'EXPORT', 'ACTIVAT'];

function matchesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((k) => haystack.includes(k));
}

/** Derives a Severity from an event's eventType/action text. Deterministic and pure. */
export function deriveSeverity(input: { eventType?: string | null; action?: string | null }): Severity {
  const haystack = `${input.eventType || ''} ${input.action || ''}`.toUpperCase();
  if (matchesAny(haystack, CRITICAL_KEYWORDS)) return 'Critical';
  if (matchesAny(haystack, HIGH_KEYWORDS)) return 'High';
  if (matchesAny(haystack, MEDIUM_KEYWORDS)) return 'Medium';
  if (matchesAny(haystack, LOW_KEYWORDS)) return 'Low';
  return 'Information';
}

/** Effective severity for a stored row: its own value if present, otherwise derived. */
export function effectiveSeverity(row: { severity?: string | null; eventType?: string | null; action?: string | null }): Severity {
  if (row.severity && (SEVERITY_LEVELS as readonly string[]).includes(row.severity)) return row.severity as Severity;
  return deriveSeverity(row);
}

export function severityRank(s: Severity): number {
  return SEVERITY_LEVELS.indexOf(s);
}
