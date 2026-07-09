// PLT-011 SLA computation - real, computed on read against SupportSlaPolicy
// targets (no cron in this codebase, same convention as everything else
// time-based here, e.g. PlatformAdminUser.lockedUntil / PLT-010 retention).

export interface SlaPolicyLike {
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

export interface SlaStatus {
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  minutesRemaining: number | null; // clock currently in play; negative once breached
  band: 'on_track' | 'at_risk' | 'breached';
  isClosed: boolean;
}

const AT_RISK_THRESHOLD = 0.2; // within the last 20% of the allotted window

export function computeSlaStatus(
  ticket: { createdAt: Date; firstRespondedAt: Date | null; resolvedAt: Date | null; status: string },
  policy: SlaPolicyLike,
): SlaStatus {
  const now = new Date();
  const firstResponseDueAt = new Date(ticket.createdAt.getTime() + policy.firstResponseMinutes * 60 * 1000);
  const resolutionDueAt = new Date(ticket.createdAt.getTime() + policy.resolutionMinutes * 60 * 1000);

  const isClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'CANCELLED';

  const firstResponseBreached = ticket.firstRespondedAt ? ticket.firstRespondedAt > firstResponseDueAt : !isClosed && now > firstResponseDueAt;
  const resolutionBreached = ticket.resolvedAt ? ticket.resolvedAt > resolutionDueAt : !isClosed && now > resolutionDueAt;

  let minutesRemaining: number | null = null;
  if (!isClosed) {
    const activeDueAt = ticket.firstRespondedAt ? resolutionDueAt : firstResponseDueAt;
    minutesRemaining = Math.round((activeDueAt.getTime() - now.getTime()) / 60000);
  }

  let band: SlaStatus['band'] = 'on_track';
  if (!isClosed) {
    if (firstResponseBreached || resolutionBreached) band = 'breached';
    else if (minutesRemaining != null) {
      const windowMinutes = ticket.firstRespondedAt ? policy.resolutionMinutes : policy.firstResponseMinutes;
      if (minutesRemaining <= windowMinutes * AT_RISK_THRESHOLD) band = 'at_risk';
    }
  }

  return { firstResponseDueAt, resolutionDueAt, firstResponseBreached, resolutionBreached, minutesRemaining, band, isClosed };
}
