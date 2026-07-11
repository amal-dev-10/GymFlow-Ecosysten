import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../providers/WorkspaceProvider';
import { billingApi, InvoiceDto, attendanceApi, membersApi, membershipsApi, rolesApi } from '../lib/api';

// ---------------------------------------------------------------------------
// Reports derived from real data. Revenue comes off the subscription ledger
// (the same source billing uses); attendance comes off the analytics endpoint.
// ---------------------------------------------------------------------------

export interface RevenueReport {
  totalCollected: number;
  totalOutstanding: number;
  totalBilled: number;
  invoiceCount: number;
  /** Last 7 calendar days of collections, oldest → newest. */
  daily: { label: string; value: number }[];
  /** Collected amount grouped by plan category, largest first. */
  byCategory: { label: string; value: number }[];
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildRevenue(invoices: InvoiceDto[]): RevenueReport {
  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((s, i) => s + i.outstanding, 0);
  const totalBilled = invoices.reduce((s, i) => s + i.total, 0);

  // Daily collections for the trailing 7 days, bucketed by invoice creation day.
  const today = startOfDay(new Date());
  const days: { label: string; value: number }[] = [];
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dayKeys.push(d.toDateString());
    days.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), value: 0 });
  }
  for (const inv of invoices) {
    const key = startOfDay(new Date(inv.createdAt)).toDateString();
    const idx = dayKeys.indexOf(key);
    if (idx >= 0) days[idx].value += inv.amountPaid;
  }

  // Collected by plan category.
  const catMap = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.amountPaid <= 0) continue;
    const cat = inv.category || 'Membership';
    catMap.set(cat, (catMap.get(cat) || 0) + inv.amountPaid);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return {
    totalCollected,
    totalOutstanding,
    totalBilled,
    invoiceCount: invoices.length,
    daily: days,
    byCategory,
  };
}

export function useRevenueReport() {
  const { gymId } = useWorkspace();
  const gid = gymId || '';
  return useQuery({
    queryKey: ['reports', 'revenue', gid],
    queryFn: async () => buildRevenue(await billingApi.listInvoices(gid)),
    enabled: !!gid,
  });
}

// ---------------------------------------------------------------------------
// Attendance — real parts of the analytics endpoint (daily trends, peak hours,
// status split, avg duration). The endpoint's member/trainer "insights" are
// backend-mock, so they're intentionally ignored here.
// ---------------------------------------------------------------------------
export interface AttendanceReport {
  totalVisits: number;
  avgVisitDuration: number;
  daily: { label: string; value: number }[];
  peakBuckets: { label: string; value: number }[];
  status: { label: string; value: number }[];
}

function buildAttendance(a: any): AttendanceReport {
  const trends: any[] = Array.isArray(a?.dailyTrends) ? a.dailyTrends : [];
  const daily = trends.slice(-14).map((t) => ({
    label: t.date ? new Date(t.date).getDate().toString() : '',
    value: Number(t.count) || 0,
  }));
  const totalVisits = trends.reduce((s, t) => s + (Number(t.count) || 0), 0);

  // Condense the 24 peak-hour entries into readable 3-hour buckets.
  const ranges: [number, number, string][] = [
    [6, 9, '6–9'], [9, 12, '9–12'], [12, 15, '12–15'], [15, 18, '15–18'], [18, 21, '18–21'], [21, 24, '21–24'],
  ];
  const peaks: any[] = Array.isArray(a?.peakHours) ? a.peakHours : [];
  const hourVal = (h: number) => Number(peaks.find((p) => parseInt(p.hour, 10) === h)?.count) || 0;
  const peakBuckets = ranges.map(([from, to, label]) => {
    let value = 0;
    for (let h = from; h < to; h++) value += hourVal(h);
    return { label, value };
  });

  const sd = a?.statusDistribution || {};
  const status = [
    { label: 'Inside', value: Number(sd.checkedIn) || 0 },
    { label: 'Left', value: Number(sd.checkedOut) || 0 },
    { label: 'Denied', value: Number(sd.deniedEntry) || 0 },
  ];

  return {
    totalVisits,
    avgVisitDuration: Number(a?.averageVisitDuration) || 0,
    daily,
    peakBuckets,
    status,
  };
}

export function useAttendanceReport() {
  const { gymId } = useWorkspace();
  const gid = gymId || '';
  return useQuery({
    queryKey: ['reports', 'attendance', gid],
    queryFn: async () => buildAttendance(await attendanceApi.getAnalytics(gid)),
    enabled: !!gid,
  });
}

// ---------------------------------------------------------------------------
// Membership — derived from the real subscription ledger (same source billing
// uses), scoped to the active gym.
// ---------------------------------------------------------------------------
export interface MembershipReport {
  total: number;
  active: number;
  frozen: number;
  expired: number;
  cancelled: number;
  activeRatio: number;
  expiringSoon: number;
  byPlan: { label: string; value: number }[];
}

function subInGym(sub: any, gid: string) {
  return sub.member?.homeGymId === gid || sub.gymId === gid;
}

function buildMembership(subs: any[], gid: string): MembershipReport {
  const scoped = subs.filter((s) => subInGym(s, gid));
  let active = 0, frozen = 0, expired = 0, cancelled = 0, expiringSoon = 0;
  const planMap = new Map<string, number>();
  const now = Date.now();

  for (const s of scoped) {
    const st = String(s.status || '').toLowerCase();
    if (st === 'active') active++;
    else if (st === 'frozen') frozen++;
    else if (st === 'expired') expired++;
    else if (st === 'cancelled') cancelled++;

    const plan = s.membershipPlan?.name || 'Other';
    planMap.set(plan, (planMap.get(plan) || 0) + 1);

    if (st === 'active' && s.endDate) {
      const days = (new Date(s.endDate).getTime() - now) / 86400000;
      if (days >= 0 && days <= 7) expiringSoon++;
    }
  }

  const total = scoped.length;
  const byPlan = Array.from(planMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    total, active, frozen, expired, cancelled,
    activeRatio: total > 0 ? Math.round((active / total) * 100) : 0,
    expiringSoon,
    byPlan,
  };
}

export function useMembershipReport() {
  const { gymId } = useWorkspace();
  const gid = gymId || '';
  return useQuery({
    queryKey: ['reports', 'membership', gid],
    queryFn: async () => buildMembership(await membershipsApi.listAllSubscriptions(), gid),
    enabled: !!gid,
  });
}

// ---------------------------------------------------------------------------
// Members — demographics + growth from the real member roster.
// ---------------------------------------------------------------------------
export interface MemberReport {
  total: number;
  newThisMonth: number;
  byGender: { label: string; value: number }[];
  byAge: { label: string; value: number }[];
  growth: { data: number[]; labels: string[] };
}

function ageOf(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
}

function buildMembers(members: any[]): MemberReport {
  const total = members.length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let male = 0, female = 0, other = 0, newThisMonth = 0;
  const ageBuckets = { '<18': 0, '18–25': 0, '26–35': 0, '36–50': 0, '50+': 0 } as Record<string, number>;

  for (const m of members) {
    const g = String(m.gender || '').toLowerCase();
    if (g === 'm' || g === 'male') male++;
    else if (g === 'f' || g === 'female') female++;
    else other++;

    if (m.createdAt && new Date(m.createdAt).getTime() >= monthStart) newThisMonth++;

    const age = ageOf(m.dob);
    if (age != null) {
      if (age < 18) ageBuckets['<18']++;
      else if (age <= 25) ageBuckets['18–25']++;
      else if (age <= 35) ageBuckets['26–35']++;
      else if (age <= 50) ageBuckets['36–50']++;
      else ageBuckets['50+']++;
    }
  }

  // Cumulative roster size at the end of each of the last 5 months.
  const labels: string[] = [];
  const data: number[] = [];
  for (let i = 4; i >= 0; i--) {
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
    labels.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('en-IN', { month: 'short' }));
    data.push(members.filter((m) => m.createdAt && new Date(m.createdAt).getTime() < end).length);
  }

  return {
    total,
    newThisMonth,
    byGender: [
      { label: 'Male', value: male },
      { label: 'Female', value: female },
      { label: 'Other', value: other },
    ].filter((x) => x.value > 0),
    byAge: Object.entries(ageBuckets).map(([label, value]) => ({ label, value })),
    growth: { data, labels },
  };
}

export function useMemberReport() {
  const { gymId } = useWorkspace();
  const gid = gymId || '';
  return useQuery({
    queryKey: ['reports', 'members', gid],
    queryFn: async () => buildMembers(await membersApi.listFlat(gid)),
    enabled: !!gid,
  });
}

// ---------------------------------------------------------------------------
// Trainers — members-per-trainer from real staff + roster (no PT-session data
// exists, so this is assignment-based, not session-based).
// ---------------------------------------------------------------------------
export interface TrainerReport {
  total: number;
  assigned: number;
  unassigned: number;
  assignedPct: number;
  leaderboard: { label: string; value: number }[];
  trainerCount: number;
}

function buildTrainers(staff: any[], members: any[]): TrainerReport {
  const trainers = staff.filter((s) => {
    const names = [s.roleName, ...(s.roleNames || [])].join(' ').toLowerCase();
    return names.includes('trainer');
  });
  const trainerById = new Map<string, string>();
  trainers.forEach((t) => trainerById.set(t.id, t.name));

  const counts = new Map<string, number>();
  let assigned = 0;
  for (const m of members) {
    const tId = m.aiInsights?.trainerId || m.assignedTrainer?.id;
    const tName = m.aiInsights?.assignedTrainerName || m.assignedTrainer?.name;
    if (tId || tName) {
      assigned++;
      const key = (tId && trainerById.get(tId)) || tName || 'Assigned';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const total = members.length;
  const leaderboard = Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    total,
    assigned,
    unassigned: total - assigned,
    assignedPct: total > 0 ? Math.round((assigned / total) * 100) : 0,
    leaderboard,
    trainerCount: trainers.length,
  };
}

export function useTrainerReport() {
  const { gymId } = useWorkspace();
  const gid = gymId || '';
  return useQuery({
    queryKey: ['reports', 'trainers', gid],
    queryFn: async () => {
      const [staff, members] = await Promise.all([rolesApi.getEmployees(), membersApi.listFlat(gid)]);
      return buildTrainers(staff, members);
    },
    enabled: !!gid,
  });
}
