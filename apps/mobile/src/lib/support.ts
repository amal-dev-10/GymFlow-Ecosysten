import type { StatusType } from '../components/StatusBadge';
import type { SupportTicketStatus, SupportTicketPriority } from './api';

// Human labels + badge styling for ticket status/priority, shared across the
// support list and detail screens.

export function statusLabel(status: SupportTicketStatus): string {
  switch (status) {
    case 'IN_PROGRESS': return 'In Progress';
    case 'WAITING_FOR_CUSTOMER': return 'Awaiting You';
    default: return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

export function statusType(status: SupportTicketStatus): StatusType {
  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      return 'success';
    case 'ESCALATED':
      return 'error';
    case 'WAITING_FOR_CUSTOMER':
      return 'warning';
    case 'CANCELLED':
      return 'default';
    default:
      return 'info';
  }
}

export const isClosedStatus = (status: SupportTicketStatus) =>
  status === 'RESOLVED' || status === 'CLOSED' || status === 'CANCELLED';

export const PRIORITIES: SupportTicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function priorityLabel(p: SupportTicketPriority): string {
  return p.charAt(0) + p.slice(1).toLowerCase();
}

export function priorityColor(p: SupportTicketPriority, colors: any): string {
  switch (p) {
    case 'URGENT': return colors.error;
    case 'HIGH': return colors.warning;
    case 'MEDIUM': return colors.info;
    default: return colors.textMuted;
  }
}

export const SUPPORT_CATEGORIES = [
  'Billing',
  'Subscription',
  'Members',
  'Attendance',
  'Reports',
  'Bug Report',
  'Feature Request',
  'General',
];
