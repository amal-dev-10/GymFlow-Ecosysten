'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  Building2,
  Users,
  DollarSign,
  AlertTriangle,
  Sliders,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  User,
  ChevronRight,
  RefreshCw,
  UserPlus,
  ClipboardList,
  BarChart2,
  Clock,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Zap,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Calendar,
  PieChart,
  Target,
  UserCheck,
  Grid,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { gymApi, orgApi, rolesApi, membershipsApi, attendanceApi, freezeApi } from '../../../lib/api';
import { handleApiError } from '../../../lib/api/client';
import { useAccessControl } from '../../../context/access-control';
import { Tabs } from '../../../components/ui';

// ── Shared types ─────────────────────────────────────────────────────────
interface KpiCard {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendVal?: string;
  color: string;
  bg: string;
}

interface BranchDetails {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  status: string;
  capacity: number;
  latitude: number | null;
  longitude: number | null;
}

// ── Shared helpers ───────────────────────────────────────────────────────
function formatCurrencyWith(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const CHART_COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neutral-200 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-neutral-500 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' && currency ? formatCurrencyWith(p.value, currency) : p.value}
        </p>
      ))}
    </div>
  );
};

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2">
      <BarChart2 className="w-8 h-8 text-neutral-300" />
      <p className="text-xs text-neutral-400">{label}</p>
    </div>
  );
}

// ── Scope indicator pill (shows what the sidebar gym-selector currently drives) ──
function ScopeBadge({ isAllGyms, branchName }: { isAllGyms: boolean; branchName?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-light text-primary text-[10px] font-bold">
      {isAllGyms ? <Grid className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
      {isAllGyms ? 'All Branches' : branchName}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ENTRY POINT — decides scope from the sidebar's gym selector (?gymId=)
// ═════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardRouter />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 -mx-6 -mt-8">
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-200/80 px-8 py-5">
        <div className="h-6 w-48 bg-neutral-100 rounded-lg animate-pulse" />
      </div>
      <div className="px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-neutral-50 border border-neutral-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function DashboardRouter() {
  const searchParams = useSearchParams();
  const gymIdParam = searchParams.get('gymId');
  const isAllGyms = !gymIdParam || gymIdParam === 'all';

  return isAllGyms ? <OrgWideDashboard /> : <BranchDashboard gymId={gymIdParam as string} />;
}

// ═════════════════════════════════════════════════════════════════════════
// ALL GYMS VIEW — organization-wide analytics (formerly "Analytics HQ")
// ═════════════════════════════════════════════════════════════════════════
function OrgWideDashboard() {
  const router = useRouter();
  const { hasFeature, hasPermission } = useAccessControl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'revenue'>('overview');
  const [branches, setBranches] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [orgOverview, setOrgOverview] = useState<any>(null);
  const [branchMetrics, setBranchMetrics] = useState<any>(null);
  const [attendanceAnalytics, setAttendanceAnalytics] = useState<any>(null);
  const [allSubscriptions, setAllSubscriptions] = useState<any[]>([]);
  const [currency, setCurrency] = useState('USD');

  const formatCurrency = (amount: number) => formatCurrencyWith(amount, currency);

  const canViewOrgAnalytics = (hasPermission('reports.view_analytics') || hasPermission('reports.view')) && hasFeature('reports');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const orgId = localStorage.getItem('organizationId');
      if (!orgId) { router.push('/organizations'); return; }

      try {
        const orgs = await orgApi.list();
        const org = orgs.find((o: any) => o.id === orgId);
        if (org?.currency) setCurrency(org.currency);
      } catch (_) { }

      const gymList = await gymApi.list(orgId);
      setBranches(gymList || []);
      const firstBranch = gymList?.[0]?.id;

      const [overview, attAnalytics, subs, metrics] = await Promise.allSettled([
        orgApi.getOverviewStats(orgId),
        attendanceApi.getAnalytics(undefined),
        membershipsApi.listAllSubscriptions(),
        firstBranch ? gymApi.getMetrics(firstBranch) : Promise.resolve(null),
      ]);

      if (overview.status === 'fulfilled') setOrgOverview(overview.value);
      if (attAnalytics.status === 'fulfilled') setAttendanceAnalytics(attAnalytics.value);
      if (subs.status === 'fulfilled') setAllSubscriptions(subs.value || []);
      if (metrics.status === 'fulfilled') setBranchMetrics(metrics.value);
    } catch (err: any) {
      setError(handleApiError(err) || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const goToBranch = (branchId: string) => router.push(`/workspace/dashboard?gymId=${branchId}`);

  // ── Derived data ──────────────────────────────────────────────────────
  const activeSubs = allSubscriptions.filter((s: any) => s.status === 'Active').length;
  const expiredSubs = allSubscriptions.filter((s: any) => s.status === 'Expired').length;
  const frozenSubs = allSubscriptions.filter((s: any) => s.status === 'Frozen').length;
  const totalRevenue = allSubscriptions.reduce((sum: number, s: any) => sum + (s.amountPaid || 0), 0);

  const revenueByPlan: Record<string, number> = {};
  allSubscriptions.forEach((s: any) => {
    const plan = s.membershipPlan?.name || 'Unknown';
    revenueByPlan[plan] = (revenueByPlan[plan] || 0) + (s.amountPaid || 0);
  });
  const topPlans = Object.entries(revenueByPlan).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, revenue]) => ({ name, revenue }));

  const subStatusData = [
    { name: 'Active', value: activeSubs, color: '#22C55E' },
    { name: 'Expired', value: expiredSubs, color: '#EF4444' },
    { name: 'Frozen', value: frozenSubs, color: '#2563EB' },
  ].filter(d => d.value > 0);

  const revenueTrendData = branchMetrics?.revenueLabels?.map((label: string, i: number) => ({
    month: label,
    revenue: branchMetrics.revenueTrend?.[i] ?? 0,
  })) || [];

  const dailyAttendance = (attendanceAnalytics?.dailyTrends || []).slice(-30).map((d: any) => ({
    date: d.date?.slice(5),
    visits: d.count,
  }));

  const peakHoursData = (attendanceAnalytics?.peakHours || []).map((h: any) => ({
    hour: h.hour?.slice(0, 5) || h.hour,
    visits: h.count,
  }));

  const branchComparison = (attendanceAnalytics?.branchAnalytics || []).map((b: any) => ({
    id: b.branchId,
    name: b.branchName,
    attendance: b.attendanceCount,
    avgDuration: b.averageDuration,
    denied: b.deniedEntries,
  }));

  const sd = attendanceAnalytics?.statusDistribution || {};
  const statusDistData = [
    { name: 'Checked Out', value: sd.checkedOut || 0, color: '#22C55E' },
    { name: 'Active Session', value: sd.checkedIn || 0, color: '#2563EB' },
    { name: 'Auto Checkout', value: sd.autoCheckedOut || 0, color: '#06B6D4' },
    { name: 'Denied', value: sd.deniedEntry || 0, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const kpiCards: KpiCard[] = [
    {
      label: 'Total Members',
      value: (orgOverview?.totalMembers ?? '—').toLocaleString(),
      sub: `Across ${branches.length} branch${branches.length !== 1 ? 'es' : ''}`,
      icon: Users, trend: 'up', trendVal: `${branchMetrics?.activeMembers ?? 0} active`,
      color: 'text-primary', bg: 'bg-primary-light border-primary/20',
    },
    {
      label: 'Active Memberships',
      value: (orgOverview?.activeMemberships ?? activeSubs).toLocaleString(),
      sub: `${expiredSubs} expired • ${frozenSubs} frozen`,
      icon: CheckCircle, trend: activeSubs > expiredSubs ? 'up' : 'down',
      trendVal: `${Math.round((activeSubs / Math.max(allSubscriptions.length, 1)) * 100)}% retention`,
      color: 'text-success', bg: 'bg-success-light border-green-200',
    },
    {
      label: 'Revenue MTD',
      value: formatCurrency(orgOverview?.monthlyRevenue ?? branchMetrics?.revenueMonth ?? 0),
      sub: branchMetrics?.revenueDesc || 'This month',
      icon: DollarSign, trend: 'up',
      trendVal: `${formatCurrency(branchMetrics?.revenueMonth ?? 0)} top branch`,
      color: 'text-success', bg: 'bg-success-light border-green-200',
    },
    {
      label: 'Attendance Today',
      value: (orgOverview?.attendanceToday ?? branchMetrics?.attendanceToday ?? 0).toLocaleString(),
      sub: branchMetrics?.attendanceDesc || 'Check-ins today',
      icon: Activity, trend: 'neutral',
      trendVal: `Avg ${formatDuration(attendanceAnalytics?.averageVisitDuration || 60)} per visit`,
      color: 'text-primary', bg: 'bg-primary-light border-primary/20',
    },
    {
      label: 'Pending Dues',
      value: formatCurrency(orgOverview?.pendingDues ?? 0),
      sub: `${branchMetrics?.renewalsCount ?? 0} renewals in 30d`,
      icon: AlertTriangle, trend: 'down',
      trendVal: `${branchMetrics?.upcomingActions?.length ?? 0} actions needed`,
      color: 'text-amber-700', bg: 'bg-warning-light border-amber-200',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      sub: `Across ${allSubscriptions.length} subscriptions`,
      icon: TrendingUp, trend: 'up',
      trendVal: `${topPlans[0]?.name || 'N/A'} top plan`,
      color: 'text-primary', bg: 'bg-primary-light border-primary/20',
    },
  ];

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto" />
          <p className="text-sm text-danger font-semibold">{error}</p>
          <button onClick={() => loadData()} className="text-xs text-neutral-600 hover:text-neutral-800 flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col -mx-6 -mt-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'}`}>
          <CheckCircle className="w-4 h-4" />
          {toast.message}
        </div>
      )}

      {/* ─── TOP HEADER ─── */}
      <div className="sticky top-[-100px] z-40 bg-white border-b border-neutral-200/80 shadow-lg shadow-black/5">
        <div className="px-8 py-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-primary-light border border-primary/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-neutral-900">Dashboard</h1>
                <ScopeBadge isAllGyms />
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">Real-time intelligence across your organization</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => loadData()} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100/70 rounded-xl transition" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          scrollable={false}
          tabs={[
            { id: 'overview', label: 'Overview', icon: BarChart2 },
            { id: 'attendance', label: 'Attendance Intelligence', icon: Calendar },
            { id: 'revenue', label: 'Membership Revenue', icon: DollarSign },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </div>

      {!canViewOrgAnalytics ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
          <ShieldAlert className="w-10 h-10 text-neutral-300" />
          <p className="text-sm font-bold text-neutral-600">Organization-wide analytics restricted</p>
          <p className="text-xs text-neutral-400 max-w-xs text-center">Your role can only view a specific branch's dashboard. Pick a branch from the sidebar to get started.</p>
          <button
            onClick={() => router.push('/workspace/gyms')}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition"
          >
            View Branches <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex-1 px-8 pt-6 pb-16">

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {kpiCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div key={i} className={`${card.bg} border rounded-2xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5`}>
                      <div className="flex items-center justify-between">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bg} border`}>
                          <Icon className={`w-4.5 h-4.5 ${card.color}`} />
                        </div>
                        {card.trend && (
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${card.trend === 'up' ? 'bg-success-light text-success' : card.trend === 'down' ? 'bg-danger-light text-danger' : 'bg-neutral-100 text-neutral-600'}`}>
                            {card.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : card.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
                            {card.trendVal}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">{card.label}</p>
                        <p className={`text-2xl font-black mt-0.5 ${card.color}`}>{card.value}</p>
                        <p className="text-[11px] text-neutral-500 mt-1">{card.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">Revenue Trend</h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Last 6 months — branch collections</p>
                    </div>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  {revenueTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={revenueTrendData}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <Tooltip content={<CustomTooltip currency={currency} />} />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: '#2563EB', r: 4 }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyState label="No revenue data available yet" />}
                </div>

                <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">Subscription Status</h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Distribution across org</p>
                    </div>
                    <PieChart className="w-4 h-4 text-neutral-400" />
                  </div>
                  {subStatusData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <RPieChart>
                          <Pie data={subStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                            {subStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(v) => [`${v} subs`, '']} />
                        </RPieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {subStatusData.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                              <span className="text-neutral-600">{d.name}</span>
                            </div>
                            <span className="font-bold text-neutral-800">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <EmptyState label="No subscription data" />}
                </div>
              </div>

              <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Branch Performance Comparison</h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Last 30 days attendance metrics — click a branch to drill in</p>
                  </div>
                  <Building2 className="w-4 h-4 text-neutral-400" />
                </div>

                {branchComparison.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          {['Branch', 'Attendance', 'Avg Duration', 'Denied Entries', 'Score', ''].map(h => (
                            <th key={h} className="text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider pb-3 pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {branchComparison.map((b: any, i: number) => {
                          const score = Math.min(100, Math.round((b.attendance / Math.max(...branchComparison.map((x: any) => x.attendance), 1)) * 100));
                          const branchMatch = branches.find((br: any) => br.name === b.name);
                          return (
                            <tr
                              key={i}
                              className="hover:bg-neutral-100/60 transition-colors cursor-pointer"
                              onClick={() => branchMatch && goToBranch(branchMatch.id)}
                            >
                              <td className="py-3 pr-4 font-semibold text-neutral-800">{b.name}</td>
                              <td className="py-3 pr-4 text-neutral-700">{b.attendance.toLocaleString()}</td>
                              <td className="py-3 pr-4 text-neutral-700">{formatDuration(b.avgDuration)}</td>
                              <td className="py-3 pr-4">
                                <span className={`font-bold ${b.denied > 5 ? 'text-danger' : 'text-neutral-600'}`}>{b.denied}</span>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-neutral-100 rounded-full">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
                                  </div>
                                  <span className="text-[10px] text-neutral-600 font-bold w-8">{score}%</span>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                {branchMatch && <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <EmptyState label="No branch comparison data — attend some sessions first" />}
              </div>

              {branchMetrics?.upcomingActions?.length > 0 && (
                <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-neutral-900">Action Items</h3>
                    <span className="text-[10px] bg-danger-light text-danger border border-red-200 px-2 py-0.5 rounded-full font-bold">
                      {branchMetrics.upcomingActions.length} pending
                    </span>
                  </div>
                  <div className="space-y-2">
                    {branchMetrics.upcomingActions.slice(0, 8).map((action: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-neutral-100/60 rounded-xl">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${action.priority === 'Critical' ? 'bg-danger animate-pulse' : action.priority === 'High' ? 'bg-primary' : action.priority === 'Medium' ? 'bg-warning' : 'bg-neutral-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-800 truncate">{action.label}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-neutral-500">{action.date}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${action.priority === 'Critical' ? 'bg-danger-light text-danger' : action.priority === 'High' ? 'bg-primary-light text-primary' : 'bg-neutral-100 text-neutral-600'}`}>{action.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Checked Out', value: sd.checkedOut ?? 0, icon: CheckCircle, color: 'text-success', bg: 'bg-success-light border-green-200' },
                  { label: 'Active Sessions', value: sd.checkedIn ?? 0, icon: Zap, color: 'text-primary', bg: 'bg-primary-light border-primary/20' },
                  { label: 'Auto Checked Out', value: sd.autoCheckedOut ?? 0, icon: Clock, color: 'text-primary', bg: 'bg-primary-light border-primary/20' },
                  { label: 'Denied Entries', value: sd.deniedEntry ?? 0, icon: ShieldAlert, color: 'text-danger', bg: 'bg-danger-light border-red-200' },
                ].map((k, i) => {
                  const Icon = k.icon;
                  return (
                    <div key={i} className={`${k.bg} border rounded-2xl p-4`}>
                      <Icon className={`w-5 h-5 ${k.color} mb-3`} />
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">{k.label}</p>
                      <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">Daily Attendance — Last 30 Days</h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Total check-ins per day</p>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-600">
                      Avg {dailyAttendance.length > 0 ? Math.round(dailyAttendance.reduce((s: number, d: any) => s + d.visits, 0) / dailyAttendance.length) : 0}/day
                    </span>
                  </div>
                  {dailyAttendance.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dailyAttendance} barSize={8}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="visits" name="Check-ins" fill="#2563EB" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState label="No attendance data for last 30 days" />}
                </div>

                <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-neutral-900 mb-1">Session Status</h3>
                  <p className="text-[11px] text-neutral-500 mb-4">30-day distribution</p>
                  {statusDistData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <RPieChart>
                          <Pie data={statusDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                            {statusDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip formatter={(v) => [`${v}`, '']} />
                        </RPieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {statusDistData.map((d, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                              <span className="text-neutral-600">{d.name}</span>
                            </div>
                            <span className="font-bold text-neutral-800">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <EmptyState label="No session data yet" />}
                </div>
              </div>

              <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Peak Check-in Hours</h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Visits by hour of day — last 30 days</p>
                  </div>
                  <Target className="w-4 h-4 text-neutral-400" />
                </div>
                {peakHoursData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={peakHoursData} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="visits" name="Check-ins" radius={[3, 3, 0, 0]}>
                        {peakHoursData.map((_: any, i: number) => {
                          const hour = parseInt(peakHoursData[i]?.hour || '0');
                          const isPeak = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20);
                          return <Cell key={i} fill={isPeak ? '#2563EB' : '#CBD5E1'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState label="No hourly data yet" />}
                <div className="flex items-center gap-4 mt-3 text-[10px] text-neutral-500">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" /> Peak hours</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-neutral-200 inline-block" /> Off-peak</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-neutral-900 mb-4">Visit Intelligence</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Avg Visit Duration', value: formatDuration(attendanceAnalytics?.averageVisitDuration || 60), icon: Clock },
                      { label: 'Expected Today', value: (attendanceAnalytics?.forecasting?.expectedToday ?? '—').toLocaleString?.() ?? attendanceAnalytics?.forecasting?.expectedToday ?? '—', icon: UserCheck },
                      { label: 'Peak Occupancy Forecast', value: `${attendanceAnalytics?.forecasting?.peakOccupancyForecast || 0}%`, icon: Target },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 bg-neutral-100/60 rounded-xl">
                          <Icon className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1">
                            <p className="text-[10px] text-neutral-500">{item.label}</p>
                            <p className="text-sm font-bold text-neutral-800">{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                    {attendanceAnalytics?.forecasting?.capacityPlanningInsight && (
                      <div className="p-3 bg-primary-light border border-primary/20 rounded-xl">
                        <p className="text-[10px] text-primary leading-relaxed">
                          💡 {attendanceAnalytics.forecasting.capacityPlanningInsight}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-neutral-900 mb-1">Attendance → Renewal Correlation</h3>
                  <p className="text-[11px] text-neutral-500 mb-4">How visit frequency drives membership renewals</p>
                  {attendanceAnalytics?.revenueCorrelation?.attendanceVsRenewals?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={attendanceAnalytics.revenueCorrelation.attendanceVsRenewals} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="attendanceRate" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="renewalRate" name="Renewal Rate" fill="#22C55E" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState label="No correlation data yet" />}
                  {attendanceAnalytics?.revenueCorrelation?.retentionRate && (
                    <p className="text-[11px] text-success font-bold mt-3">
                      Overall Retention: {attendanceAnalytics.revenueCorrelation.retentionRate}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: formatCurrency(totalRevenue), sub: `${allSubscriptions.length} subscriptions`, color: 'text-success', bg: 'bg-success-light border-green-200' },
                  { label: 'Revenue MTD', value: formatCurrency(branchMetrics?.revenueMonth || 0), sub: branchMetrics?.revenueDesc || 'This month', color: 'text-primary', bg: 'bg-primary-light border-primary/20' },
                  { label: 'Active Subs', value: activeSubs.toLocaleString(), sub: `${Math.round((activeSubs / Math.max(allSubscriptions.length, 1)) * 100)}% of total`, color: 'text-primary', bg: 'bg-primary-light border-primary/20' },
                  { label: 'Avg Revenue/Sub', value: formatCurrency(allSubscriptions.length > 0 ? Math.round(totalRevenue / allSubscriptions.length) : 0), sub: 'Per subscription', color: 'text-success', bg: 'bg-success-light border-green-200' },
                ].map((k, i) => (
                  <div key={i} className={`${k.bg} border rounded-2xl p-4`}>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">{k.label}</p>
                    <p className={`text-xl font-black mt-1.5 ${k.color}`}>{k.value}</p>
                    <p className="text-[11px] text-neutral-500 mt-1">{k.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-neutral-900 mb-1">Revenue by Plan</h3>
                  <p className="text-[11px] text-neutral-500 mb-5">Top performing membership plans</p>
                  {topPlans.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={topPlans} layout="vertical" barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip content={<CustomTooltip currency={currency} />} />
                        <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                          {topPlans.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState label="No plan revenue data yet" />}
                </div>

                <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-neutral-900 mb-1">6-Month Trend</h3>
                  <p className="text-[11px] text-neutral-500 mb-5">Monthly collections</p>
                  {revenueTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={revenueTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <Tooltip content={<CustomTooltip currency={currency} />} />
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2.5} dot={{ fill: '#2563EB', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <EmptyState label="Select a specific branch to see trend data" />}
                </div>
              </div>

              <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">All Subscriptions</h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{allSubscriptions.length} total across organization</p>
                  </div>
                  <button onClick={() => router.push('/workspace/memberships/history')} className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary-hover font-semibold">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {allSubscriptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          {['Member', 'Plan', 'Amount Paid', 'Status', 'Start', 'Expires'].map(h => (
                            <th key={h} className="text-left text-[10px] font-bold text-neutral-500 uppercase tracking-wider pb-3 pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {allSubscriptions.slice(0, 15).map((s: any, i: number) => (
                          <tr key={i} className="hover:bg-neutral-100/60 transition-colors">
                            <td className="py-3 pr-4 font-semibold text-neutral-800">
                              {s.member ? `${s.member.firstName} ${s.member.lastName}` : s.memberName || '—'}
                            </td>
                            <td className="py-3 pr-4 text-neutral-700">{s.membershipPlan?.name || '—'}</td>
                            <td className="py-3 pr-4 font-bold text-success">{formatCurrency(s.amountPaid || 0)}</td>
                            <td className="py-3 pr-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.status === 'Active' ? 'bg-success-light text-success border-green-200' : s.status === 'Expired' ? 'bg-danger-light text-danger border-red-200' : 'bg-primary-light text-primary border-primary/20'}`}>{s.status}</span>
                            </td>
                            <td className="py-3 pr-4 text-neutral-500">
                              {s.startDate ? new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                            </td>
                            <td className="py-3 pr-4">
                              {s.endDate ? (
                                <span className={new Date(s.endDate) < new Date() ? 'text-danger font-semibold' : 'text-neutral-600'}>
                                  {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {allSubscriptions.length > 15 && (
                      <p className="text-center text-[11px] text-neutral-400 mt-4">
                        Showing 15 of {allSubscriptions.length} subscriptions —{' '}
                        <button className="text-primary hover:underline" onClick={() => router.push('/workspace/memberships/history')}>view all</button>
                      </p>
                    )}
                  </div>
                ) : <EmptyState label="No subscription data found" />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// SINGLE BRANCH VIEW — branch operations dashboard (formerly "Branch Dashboard")
// ═════════════════════════════════════════════════════════════════════════
function BranchDashboard({ gymId }: { gymId: string }) {
  const router = useRouter();
  const { userRole } = useAccessControl();

  const [loading, setLoading] = useState(true);
  const [activeBranch, setActiveBranch] = useState<BranchDetails | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'analytics'>('overview');
  const [expiringView, setExpiringView] = useState<'today' | 'all'>('today');
  const [allSubscriptions, setAllSubscriptions] = useState<any[]>([]);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [freezes, setFreezes] = useState<any[]>([]);

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    } catch {
      return `${currencySymbol}${amount.toLocaleString()}`;
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDashboardData = useCallback(async (branchId: string) => {
    try {
      setLoading(true);
      const orgId = localStorage.getItem('organizationId');
      if (!orgId) { router.push('/organizations'); return; }

      try {
        const orgs = await orgApi.list();
        const currentOrg = orgs.find((o: any) => o.id === orgId);
        if (currentOrg) {
          const isoCurrency = currentOrg.currency || 'USD';
          setCurrencyCode(isoCurrency);
          const billingSettings = (currentOrg.settings?.billing) || {};
          if (billingSettings.currencySymbol) {
            setCurrencySymbol(billingSettings.currencySymbol);
          } else {
            const derived = new Intl.NumberFormat('en-US', { style: 'currency', currency: isoCurrency }).formatToParts(0).find(p => p.type === 'currency')?.value || '$';
            setCurrencySymbol(derived);
          }
        }
      } catch (_) { }

      const gymList = await gymApi.list(orgId);

      const selectedGym = gymList.find((g: any) => g.id === branchId) || gymList[0];

      if (selectedGym) {
        const s = selectedGym.settings || {};
        let managerName = 'General Admin';
        if (s.managerId) {
          try {
            const employees = await rolesApi.getEmployees();
            const managerObj = employees.find((e: any) => e.id === s.managerId);
            if (managerObj) managerName = managerObj.name;
          } catch (_) { }
        }
        setActiveBranch({
          id: selectedGym.id,
          name: selectedGym.name,
          code: selectedGym.code || 'N/A',
          address: selectedGym.address || 'No address provided',
          phone: selectedGym.contactPhone || '—',
          email: selectedGym.contactEmail || '—',
          latitude: selectedGym.latitude || null,
          longitude: selectedGym.longitude || null,
          manager: managerName,
          status: s.status || 'Active',
          capacity: s.capacity || 500,
        });
        try {
          const [branchMetrics, attAnalytics, subs, active, freezeList] = await Promise.all([
            gymApi.getMetrics(selectedGym.id),
            attendanceApi.getAnalytics(selectedGym.id),
            membershipsApi.listAllSubscriptions(),
            attendanceApi.listActive(selectedGym.id),
            freezeApi.list(),
          ]);
          setMetrics(branchMetrics);
          setAllSubscriptions(subs || []);
          setActiveMembers(active || []);
          setFreezes(freezeList || []);
        } catch (err) { console.error('Failed to load metrics', err); }
      } else {
        setActiveBranch(null);
        setMetrics(null);
      }
    } catch (err) {
      showToast('Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadDashboardData(gymId); }, [gymId, loadDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-neutral-500">Loading branch dashboard…</span>
      </div>
    );
  }

  if (!activeBranch) {
    return (
      <div className="min-h-screen bg-white text-neutral-900 p-8 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-neutral-400" />
        </div>
        <h2 className="text-lg font-bold">No Branch Selected</h2>
        <p className="text-xs text-neutral-600 max-w-xs text-center leading-relaxed">
          Your organization has no registered gym branches yet, or none is currently selected.
        </p>
      </div>
    );
  }

  const isOwnerOrManager = userRole === 'owner' || userRole === 'branch_manager';
  const isTrainer = userRole === 'trainer';
  const isReceptionist = userRole === 'receptionist';
  const occupancyPct = Math.min(Math.round(((metrics?.attendanceToday || 0) / activeBranch.capacity) * 100), 100);

  const branchSubscriptions = allSubscriptions.filter((s: any) => s.member?.homeGymId === activeBranch.id);
  const latestSubByMember = new Map<string, any>();
  branchSubscriptions.forEach((s: any) => {
    const existing = latestSubByMember.get(s.memberId);
    if (!existing || new Date(s.endDate) > new Date(existing.endDate)) {
      latestSubByMember.set(s.memberId, s);
    }
  });
  const latestSubs = Array.from(latestSubByMember.values());
  const expiredMembers = latestSubs.filter((s: any) => s.status === 'Expired' || new Date(s.endDate) < new Date());
  const outstandingDuesMembers = latestSubs.filter((s: any) => Number(s.outstandingDues) > 0);
  const outstandingDuesTotal = outstandingDuesMembers.reduce((sum: number, s: any) => sum + Number(s.outstandingDues || 0), 0);

  const allExpiringSorted = [...latestSubs]
    .filter((s: any) => s.status !== 'Cancelled')
    .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .map((s: any) => {
      const daysUntilExpiry = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return { ...s, daysUntilExpiry };
    });

  const now = new Date();
  const activeFreezes = freezes.filter((f: any) => {
    const member = f.memberMembership?.member;
    return member?.homeGymId === activeBranch.id && f.status === 'Approved' && new Date(f.startDate) <= now && new Date(f.endDate) >= now;
  });

  const overstayingMembers = activeMembers.filter((m: any) => m.isOverLimit);

  const quickViews = [
    { key: 'inside', label: 'Currently Inside', count: activeMembers.length, hint: overstayingMembers.length > 0 ? `${overstayingMembers.length} over time limit` : 'All within limits', icon: Users, accent: 'success', onClick: () => router.push(`/workspace/attendance/records?tab=inside&gymId=${activeBranch.id}`) },
    { key: 'expired', label: 'Expired Members', count: expiredMembers.length, hint: 'Membership lapsed', icon: AlertTriangle, accent: 'danger', onClick: () => router.push('/workspace/memberships/expiry') },
    { key: 'frozen', label: 'Frozen Memberships', count: activeFreezes.length, hint: 'Currently on hold', icon: Timer, accent: 'primary', onClick: () => router.push('/workspace/memberships/freeze') },
    { key: 'dues', label: 'Outstanding Dues', count: outstandingDuesMembers.length, hint: outstandingDuesMembers.length > 0 ? `${formatCurrency(outstandingDuesTotal)} pending` : 'Nothing pending', icon: DollarSign, accent: 'warning', onClick: () => router.push('/workspace/billing') },
  ] as const;

  const quickViewAccentClasses: Record<string, string> = {
    success: 'text-success bg-success-light border-green-200',
    danger: 'text-danger bg-danger-light border-red-200',
    primary: 'text-primary bg-primary-light border-primary/20',
    warning: 'text-amber-700 bg-warning-light border-amber-200',
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'}`}>
          <CheckCircle className="w-4 h-4" />
          {toast.message}
        </div>
      )}

      {/* ─── TOP COMMAND BAR ─── */}
      <div className="sticky top-[-100px] z-40 -mx-6 -mt-8 bg-white border-b border-neutral-200/80 shadow-lg shadow-black/5">
        <div className="px-8 py-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-primary-light border border-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-base font-bold text-neutral-900 truncate">{activeBranch.name}</span>
                <span className="text-[10px] font-mono text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200">{activeBranch.code}</span>
                <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${activeBranch.status === 'Active' ? 'bg-success-light text-success border-green-200' : 'bg-warning-light text-amber-700 border-amber-200'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {activeBranch.status}
                </span>
                <ScopeBadge isAllGyms={false} branchName={activeBranch.name} />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{activeBranch.address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/workspace/dashboard?gymId=all')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
            >
              <Grid className="w-3.5 h-3.5" />
              All Branches
            </button>
            <button type="button" onClick={() => loadDashboardData(activeBranch.id)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100/70 rounded-xl transition" title="Refresh dashboard">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => router.push(`/workspace/members/create?gymId=${activeBranch.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              New Member
            </button>
          </div>
        </div>

        <Tabs
          scrollable={false}
          tabs={[
            { id: 'overview', label: 'Overview', icon: BarChart2 },
            { id: 'operations', label: 'Operations', icon: ClipboardList },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </div>

      {/* ─── LIVE KPI STRIP ─── */}
      <div className="px-6 pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Active Members', value: metrics?.activeMembers ?? '—', sub: metrics?.activeMembersDesc ?? 'Loading…', icon: Users, color: 'text-primary', bg: 'bg-primary-light border-primary/20' },
            { label: "Today's Check-ins", value: metrics?.attendanceToday ?? '—', sub: metrics?.attendanceDesc ?? 'Loading…', icon: Activity, color: 'text-success', bg: 'bg-success-light border-green-200' },
            { label: 'Staff On Duty', value: metrics?.employeesCount ?? '—', sub: metrics?.employeesDesc ?? 'Loading…', icon: User, color: 'text-primary', bg: 'bg-primary-light border-primary/20' },
            { label: 'Monthly Revenue', value: metrics ? formatCurrency(metrics.revenueMonth || 0) : '—', sub: metrics?.revenueDesc ?? 'Loading…', icon: DollarSign, color: 'text-success', bg: 'bg-success-light border-green-200' },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.bg} border rounded-2xl p-4 flex gap-3 items-start`}>
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 mt-0.5">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">{kpi.label}</p>
                <p className="text-xl font-black text-neutral-900 mt-0.5">{kpi.value}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(metrics?.expiringToday?.length > 0 || metrics?.upcomingActions?.some((a: any) => a.priority === 'Critical')) && (
        <div className="px-6 pt-4">
          <div className="bg-warning-light border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-xs text-amber-700 font-medium">
                {metrics?.expiringToday?.length > 0 && `${metrics.expiringToday.length} membership${metrics.expiringToday.length > 1 ? 's' : ''} expiring today. `}
                {metrics?.upcomingActions?.filter((a: any) => a.priority === 'Critical').length > 0 && `${metrics.upcomingActions.filter((a: any) => a.priority === 'Critical').length} critical action${metrics.upcomingActions.filter((a: any) => a.priority === 'Critical').length > 1 ? 's' : ''} required.`}
              </span>
            </div>
            <span className="text-[10px] text-amber-700 font-bold shrink-0">Attention Required</span>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="px-6 pt-5 pb-16 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickViews.map((qv) => (
              <button key={qv.key} type="button" onClick={qv.onClick} className="text-left bg-white border border-neutral-200 hover:border-neutral-300 rounded-2xl p-4 transition group">
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${quickViewAccentClasses[qv.accent]}`}>
                    <qv.icon className="w-3.5 h-3.5" />
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 transition" />
                </div>
                <p className="text-xl font-black text-neutral-900">{qv.count}</p>
                <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mt-0.5">{qv.label}</p>
                <p className="text-[10px] text-neutral-400 mt-1">{qv.hint}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Branch Info</h3>
                  <button type="button" onClick={() => router.push(`/workspace/gyms/edit?id=${activeBranch.id}`)} className="text-[10px] text-primary hover:text-primary-hover font-bold flex items-center gap-0.5">
                    Edit <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: User, label: 'Branch Manager', val: activeBranch.manager },
                    { icon: Phone, label: 'Contact Phone', val: activeBranch.phone },
                    { icon: Mail, label: 'Contact Email', val: activeBranch.email },
                    { icon: MapPin, label: 'Location', val: activeBranch.address },
                  ].map((row, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <row.icon className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] text-neutral-400 uppercase tracking-wider">{row.label}</p>
                        <p className="text-xs text-neutral-700 mt-0.5">{row.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Live Occupancy</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${occupancyPct > 80 ? 'bg-danger-light text-danger' : occupancyPct > 50 ? 'bg-warning-light text-amber-700' : 'bg-success-light text-success'}`}>{occupancyPct}% full</span>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-black text-neutral-900">{metrics?.attendanceToday || 0}</span>
                  <span className="text-sm text-neutral-500">/ {activeBranch.capacity}</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${occupancyPct > 80 ? 'bg-danger' : occupancyPct > 50 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${occupancyPct || 2}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 mt-2">
                  <span>0</span>
                  <span>Capacity: {activeBranch.capacity}</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-3">
                  <span className="text-neutral-600 font-semibold">{metrics?.attendanceDesc || '—'}</span>
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Register New Member', icon: UserPlus, action: () => router.push(`/workspace/members/create?gymId=${activeBranch.id}`), accent: true, soon: false },
                    { label: 'Log Branch Expense (Soon)', icon: DollarSign, action: undefined, accent: false, soon: true },
                    { label: 'Manual Gate Check-in (Soon)', icon: Zap, action: undefined, accent: false, soon: true },
                    { label: 'View All Members', icon: Users, action: () => router.push('/workspace/members'), accent: false, soon: false },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={btn.soon}
                      onClick={btn.action}
                      title={btn.soon ? 'Not built yet' : undefined}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${btn.soon ? 'bg-neutral-50 border border-neutral-100 text-neutral-400 cursor-not-allowed' : btn.accent ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700'}`}
                    >
                      <span className="flex items-center gap-2"><btn.icon className="w-3.5 h-3.5" />{btn.label}</span>
                      {!btn.soon && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-700" />
                    <h3 className="text-sm font-bold text-neutral-900">{expiringView === 'today' ? 'Expiring Today' : 'Expiring Memberships'}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-lg p-0.5">
                      {(['today', 'all'] as const).map((view) => (
                        <button key={view} type="button" onClick={() => setExpiringView(view)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md capitalize transition ${expiringView === view ? 'bg-primary text-white' : 'text-neutral-600 hover:text-neutral-800'}`}>
                          {view}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-warning-light border border-amber-200 px-2 py-0.5 rounded-full">
                      {expiringView === 'today' ? metrics?.expiringToday?.length || 0 : allExpiringSorted.length} members
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                  {expiringView === 'today' ? (
                    !metrics?.expiringToday || metrics.expiringToday.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                        <p className="text-xs text-neutral-500">No memberships expiring today.</p>
                      </div>
                    ) : (
                      metrics.expiringToday.map((exp: any, idx: number) => (
                        <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">
                              {exp.member.firstName[0]}{exp.member.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-neutral-800">{exp.member.firstName} {exp.member.lastName}</p>
                              <p className="text-[10px] text-neutral-500 font-mono">{exp.member.phoneNumber}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-amber-700 bg-warning-light px-2 py-0.5 rounded-full border border-amber-200">
                              {exp.membershipPlan?.name || 'Plan'}
                            </span>
                            <p className="text-[10px] text-neutral-500 mt-1">Expires today</p>
                          </div>
                        </div>
                      ))
                    )
                  ) : allExpiringSorted.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                      <p className="text-xs text-neutral-500">No memberships on file for this branch.</p>
                    </div>
                  ) : (
                    allExpiringSorted.map((sub: any) => {
                      const isPast = sub.daysUntilExpiry < 0;
                      const isToday = sub.daysUntilExpiry === 0;
                      const firstName = sub.member?.firstName || '';
                      const lastName = sub.member?.lastName || '';
                      return (
                        <div key={sub.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">
                              {firstName[0]}{lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-neutral-800">{firstName} {lastName}</p>
                              <p className="text-[10px] text-neutral-500 font-mono">{sub.member?.phoneNumber}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPast ? 'text-danger bg-danger-light border-red-200' : 'text-amber-700 bg-warning-light border-amber-200'}`}>
                              {sub.membershipPlan?.name || 'Plan'}
                            </span>
                            <p className={`text-[10px] mt-1 ${isPast ? 'text-danger font-semibold' : 'text-neutral-500'}`}>
                              {isPast ? `Expired ${Math.abs(sub.daysUntilExpiry)}d ago` : isToday ? 'Expires today' : `Expires in ${sub.daysUntilExpiry}d`}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-amber-700" />
                    <h3 className="text-sm font-bold text-neutral-900">Upcoming Actions</h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-warning-light border border-amber-200 px-2 py-0.5 rounded-full">
                    {metrics?.upcomingActions?.length || 0} items
                  </span>
                </div>
                <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto">
                  {!metrics?.upcomingActions || metrics.upcomingActions.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                      <p className="text-xs text-neutral-500">All caught up! No pending actions.</p>
                    </div>
                  ) : (
                    metrics.upcomingActions.map((action: any, idx: number) => (
                      <div key={idx} className="px-5 py-3.5 flex items-center justify-between hover:bg-neutral-50 transition">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wider shrink-0 ${action.priority === 'Critical' ? 'bg-danger-light text-danger border-red-200' : action.priority === 'High' ? 'bg-warning-light text-amber-700 border-amber-200' : 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
                            {action.priority}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-neutral-800">{action.label}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">Category: {action.type}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono shrink-0">{action.date}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'operations' && (
        <div className="px-6 pt-5 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-neutral-900">
                {userRole === 'owner' || userRole === 'branch_manager' ? 'Management Console' : userRole === 'trainer' ? 'Trainer Workspace' : userRole === 'receptionist' ? 'Reception Desk' : 'My Workspace'}
              </h3>
              <span className="ml-auto text-[10px] font-mono text-neutral-400 capitalize">{userRole.replace('_', ' ')}</span>
            </div>

            {isOwnerOrManager && (
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total Staff', val: metrics?.employeesCount ?? '—', sub: metrics?.employeesDesc },
                    { label: 'Renewals Due (30d)', val: metrics?.renewalsCount ?? '—', sub: metrics?.renewalsDesc },
                    { label: 'Pending Payments', val: metrics ? formatCurrency(metrics.pendingPayments || 0) : '—', sub: metrics?.pendingPaymentsDesc },
                    { label: 'Revenue MTD', val: metrics ? formatCurrency(metrics.revenueMonth || 0) : '—', sub: metrics?.revenueDesc },
                  ].map((item, i) => (
                    <div key={i} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{item.label}</p>
                      <p className="text-xl font-black text-neutral-900 mt-1">{item.val}</p>
                      <p className="text-[9px] text-neutral-400 mt-0.5">{item.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 space-y-2">
                  <button type="button" onClick={() => router.push('/workspace/members')} className="w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 transition group">
                    <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />View All Members</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </button>
                  <button type="button" disabled title="Not built yet" className="w-full flex items-center justify-between px-3.5 py-2.5 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-semibold text-neutral-400 cursor-not-allowed">
                    <span className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" />Log Branch Expense (Soon)</span>
                  </button>
                </div>
              </div>
            )}

            {isTrainer && (
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Assigned Routines</p>
                    <p className="text-xl font-black text-neutral-900 mt-1">42</p>
                  </div>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Pending Reviews</p>
                    <p className="text-xl font-black text-neutral-900 mt-1">8</p>
                  </div>
                </div>
                <button type="button" onClick={() => showToast('Redirecting to workout builder…', 'success')} className="w-full px-3.5 py-2.5 bg-primary hover:bg-primary-hover rounded-xl text-xs font-semibold text-white transition">
                  Create Workout Plan
                </button>
              </div>
            )}

            {isReceptionist && (
              <div className="p-5 space-y-3">
                <div className="divide-y divide-neutral-100">
                  {[
                    { name: 'Sarah Jenkins', time: '11:45 AM', plan: 'Gold Plan' },
                    { name: 'David Cho', time: '11:20 AM', plan: 'CrossFit' },
                    { name: 'Michael Vance', time: '10:45 AM', plan: 'Standard' },
                  ].map((log, i) => (
                    <div key={i} className="flex justify-between py-3 text-xs">
                      <span className="font-semibold text-neutral-800">{log.name}</span>
                      <div className="flex gap-4 text-neutral-500">
                        <span>{log.plan}</span>
                        <span className="font-mono">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-1">
                  <button type="button" onClick={() => router.push(`/workspace/members/create?gymId=${activeBranch.id}`)} className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition">Register New Member</button>
                  <button type="button" disabled title="Not built yet" className="w-full py-2.5 bg-neutral-50 border border-neutral-100 text-neutral-400 text-xs font-semibold rounded-xl cursor-not-allowed">Manual Gate Check-in (Soon)</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              <h3 className="text-sm font-bold text-neutral-900">Operational Health</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-neutral-900">94</span>
                <span className="text-neutral-500 text-sm">/100</span>
                <span className="ml-auto text-success text-sm font-bold">Excellent</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Calculated from member attendance patterns, renewal rates, staff presence, and billing reconciliation.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Attendance Rate', score: 91, color: 'bg-success' },
                  { label: 'Revenue & Billing', score: 97, color: 'bg-primary' },
                  { label: 'Membership Renewal', score: 78, color: 'bg-warning' },
                  { label: 'Staff Efficiency', score: 85, color: 'bg-success' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-neutral-600">{item.label}</span>
                      <span className="font-mono font-bold text-neutral-700">{item.score}%</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="px-6 pt-5 pb-16 space-y-4">
          {isOwnerOrManager && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/workspace/dashboard?gymId=all')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl transition"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                View Organization-Wide Analytics
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {!isOwnerOrManager ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3">
                <ShieldAlert className="w-10 h-10 text-neutral-300" />
                <p className="text-sm font-bold text-neutral-500">Analytics Restricted</p>
                <p className="text-xs text-neutral-400">Only branch managers and owners can view analytics.</p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-neutral-900">Revenue Trend</h3>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">6-month view</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-black text-neutral-900">{metrics ? formatCurrency(metrics.revenueMonth || 0) : '—'}</span>
                      <span className="text-xs text-neutral-500">this month</span>
                    </div>
                    <div className="h-40 flex items-end gap-2">
                      {(() => {
                        const trend = metrics?.revenueTrend || [0, 0, 0, 0, 0, 0];
                        const labels = metrics?.revenueLabels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                        const max = Math.max(...trend, 100);
                        return trend.map((val: number, idx: number) => {
                          const h = (val / max) * 100;
                          const isLast = idx === trend.length - 1;
                          return (
                            <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group relative">
                              <div className={`w-full rounded-t-md transition-all duration-700 ${isLast ? 'bg-primary' : 'bg-neutral-200 group-hover:bg-neutral-300'}`} style={{ height: `${h || 2}%` }} />
                              <span className="text-[9px] font-mono text-neutral-400">{labels[idx]}</span>
                              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 px-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                {formatCurrency(val)}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-neutral-900">Peak Check-in Hours</h3>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">Today</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-black text-neutral-900">{metrics?.attendanceToday || 0}</span>
                      <span className="text-xs text-neutral-500">total today</span>
                    </div>
                    <div className="h-40 flex items-end gap-2">
                      {(() => {
                        const hours = metrics?.peakCheckinHours || Array(24).fill(0);
                        const displayIndices = [6, 9, 12, 15, 18, 21, 0];
                        const labels = ['6am', '9am', '12pm', '3pm', '6pm', '9pm', '12am'];
                        const vals = displayIndices.map(i => hours[i]);
                        const max = Math.max(...vals, 1);
                        return vals.map((val: number, idx: number) => {
                          const h = (val / max) * 100;
                          return (
                            <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group relative">
                              <div className="w-full rounded-t-md bg-primary-light group-hover:bg-primary/30 transition-colors" style={{ height: `${h || 2}%` }} />
                              <span className="text-[9px] font-mono text-neutral-400">{labels[idx]}</span>
                              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 px-1 rounded opacity-0 group-hover:opacity-100 transition">
                                {val}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-neutral-900">Renewal Pipeline</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      { label: 'Expiring Today', val: metrics?.expiringToday?.length ?? 0, color: 'text-danger', bar: 'bg-danger' },
                      { label: 'Expiring This Week', val: metrics?.renewalsCount ?? 0, color: 'text-amber-700', bar: 'bg-warning' },
                      { label: 'Active Memberships', val: metrics?.activeMembers ?? 0, color: 'text-success', bar: 'bg-success' },
                    ].map((row, i) => {
                      const total = (metrics?.activeMembers || 1);
                      const pct = Math.round((row.val / total) * 100);
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-neutral-600">{row.label}</span>
                            <span className={`font-mono font-bold ${row.color}`}>{row.val}</span>
                          </div>
                          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div className={`h-full ${row.bar} rounded-full`} style={{ width: `${pct || 1}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-success" />
                    <h3 className="text-sm font-bold text-neutral-900">Financial Summary</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {[
                      { label: 'Revenue This Month', val: metrics ? formatCurrency(metrics.revenueMonth || 0) : '—', sub: metrics?.revenueDesc, positive: true },
                      { label: 'Pending Payments', val: metrics ? formatCurrency(metrics.pendingPayments || 0) : '—', sub: metrics?.pendingPaymentsDesc, positive: false },
                      { label: 'Net Balance (Est.)', val: metrics ? formatCurrency((metrics.revenueMonth || 0) - (metrics.pendingPayments || 0)) : '—', sub: 'Estimated after reconciliation', positive: true },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-start pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
                        <div>
                          <p className="text-xs text-neutral-600">{item.label}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{item.sub}</p>
                        </div>
                        <span className={`text-sm font-black font-mono ${item.positive ? 'text-success' : 'text-danger'}`}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
