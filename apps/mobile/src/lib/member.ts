import type { MemberDto } from './api';
import type { StatusType } from '../components/StatusBadge';

// Shared member display derivations so the list, detail, and edit screens all
// agree on name/status/plan formatting instead of each re-deriving it.

export function memberName(m: Pick<MemberDto, 'firstName' | 'lastName'>) {
  return `${m.firstName} ${m.lastName}`.trim();
}

export function memberNumber(m: MemberDto): string {
  return m.aiInsights?.memberNumber || 'MEM-—';
}

export function memberPhotoUrl(m: MemberDto): string | undefined {
  return m.aiInsights?.photoUrl || undefined;
}

export interface MembershipStatus {
  label: string;
  type: StatusType;
}

/** Effective membership status for a member, factoring the active subscription. */
export function membershipStatus(m: MemberDto): MembershipStatus {
  const sub = m.activeMembership;
  if (!sub) return { label: 'No Plan', type: 'default' };
  const status = (sub.status || '').toLowerCase();
  if (status === 'frozen') return { label: 'Frozen', type: 'info' };
  if (status === 'expired') return { label: 'Expired', type: 'error' };
  if (status === 'cancelled') return { label: 'Cancelled', type: 'error' };
  if ((sub.outstandingDues || 0) > 0) return { label: 'Payment Due', type: 'warning' };
  if (status === 'active') return { label: 'Active', type: 'success' };
  return { label: sub.status || 'Unknown', type: 'default' };
}

export function planName(m: MemberDto): string | null {
  return m.activeMembership?.membershipPlan?.name || null;
}

export function daysUntilExpiry(m: MemberDto): number | null {
  if (!m.activeMembership?.endDate) return null;
  const end = new Date(m.activeMembership.endDate).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function outstandingBalance(m: MemberDto): number {
  return m.activeMembership?.outstandingDues || 0;
}

export function memberEmail(m: MemberDto): string | null {
  return m.email || null;
}

export function memberPhone(m: MemberDto): string {
  return m.phoneNumber || '—';
}

export function memberGender(m: MemberDto): string {
  if (!m.gender) return '—';
  const g = m.gender.toLowerCase();
  if (g === 'm' || g === 'male') return 'Male';
  if (g === 'f' || g === 'female') return 'Female';
  return m.gender;
}

export function memberAge(m: MemberDto): number | null {
  if (!m.dob) return null;
  const birth = new Date(m.dob);
  if (isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function trainerName(m: MemberDto): string | null {
  return m.aiInsights?.assignedTrainerName || m.assignedTrainer?.name || null;
}

export function branchName(m: MemberDto): string | null {
  return m.homeGym?.name || null;
}

