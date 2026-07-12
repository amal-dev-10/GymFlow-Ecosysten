'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronRight,
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  Plus,
  Dumbbell,
  Menu,
  X,
  Mail,
  Compass,
  FileText,
  Apple,
  MapPin,
  Sparkles,
  ShieldAlert,
  Sliders,
  History,
  Grid,
  CheckCircle,
  HelpCircle,
  Clock,
  Briefcase,
  Image,
  Lock,
  BookOpen
} from 'lucide-react';
import { orgApi, gymApi, authApi, attendanceApi, membershipsApi, membersApi, workoutsApi, rolesApi } from '../../lib/api';
import { AccessControlProvider, useAccessControl } from '../../context/access-control';
import { NotificationProvider } from '../../context/notifications';
import { useGlobalAttendanceNotifications } from '../../hooks/useGlobalAttendanceNotifications';
import { useBrand } from '../../hooks/useBrand';
import { PlanBadge } from '../../components/PlanBadge';
import AccessDeniedView from '../../components/AccessDeniedView';
import UpgradeRequiredView from '../../components/UpgradeRequiredView';
import RestrictedGymView from '../../components/RestrictedGymView';


interface OrgItem {
  id: string;
  name: string;
  slug: string;
  gyms: any[];
}

interface GymItem {
  id: string;
  name: string;
  isActive: boolean;
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccessControlProvider>
      <NotificationProvider>
        <React.Suspense fallback={
          <div className="min-h-screen bg-background flex items-center justify-center text-xs text-neutral-400 animate-pulse">
            Loading workspace...
          </div>
        }>
          <WorkspaceInner>{children}</WorkspaceInner>
        </React.Suspense>
      </NotificationProvider>
    </AccessControlProvider>
  );
}

function WorkspaceInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State controls
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { brand, logoUrl: brandLogoUrl, faviconUrl, initials: brandInitials } = useBrand();

  useEffect(() => {
    setMounted(true);
    getRightPanel()
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [gymDropdownOpen, setGymDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Click-outside-to-close for the header/sidebar dropdowns
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const gymDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const profileSidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (orgDropdownOpen && orgDropdownRef.current && !orgDropdownRef.current.contains(target)) {
        setOrgDropdownOpen(false);
      }
      if (gymDropdownOpen && gymDropdownRef.current && !gymDropdownRef.current.contains(target)) {
        setGymDropdownOpen(false);
      }
      if (
        profileDropdownOpen &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(target) &&
        !(profileSidebarTriggerRef.current && profileSidebarTriggerRef.current.contains(target))
      ) {
        setProfileDropdownOpen(false);
      }
      if (notificationsOpen && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [orgDropdownOpen, gymDropdownOpen, profileDropdownOpen, notificationsOpen]);

  // Active Context
  const [organizations, setOrganizations] = useState<OrgItem[]>([]);
  const [activeOrg, setActiveOrg] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [gyms, setGyms] = useState<GymItem[]>([]);
  const [activeGym, setActiveGym] = useState<string>('All Gyms');
  const { userRole, updateRoleContext, verifyRoute, triggerAuditLog, hasPermission, hasFeature, loading: accessControlLoading } = useAccessControl();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userAvatar, setUserAvatar] = useState('');

  // Workspace-wide check-in/check-out toasts + beep, across every branch in the org -
  // so a scan from the reception terminal, the device simulator, or real hardware is
  // visible no matter which page is open.
  useGlobalAttendanceNotifications(gyms.map((g) => g.id));

  // Profile Modal / Edit State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [avatarUploadOption, setAvatarUploadOption] = useState<'preset' | 'url'>('preset');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Workspace Experience Tier State
  const [workspaceTier, setWorkspaceTier] = useState<string>('Expert');

  // Org-level settings applied from Edit Organization
  const [orgSettings, setOrgSettings] = useState<{
    primaryColor?: string;
    secondaryColor?: string;
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    language?: string;
    enableWorkoutManagement?: boolean;
    enableDietManagement?: boolean;
    enableAttendanceTracking?: boolean;
    enableMultiBranchOperations?: boolean;
    enablePersonalTraining?: boolean;
  }>({});

  // Live stats & sidebar details
  const [liveStats, setLiveStats] = useState({ activeInside: 0, totalCheckInsToday: 0, totalDenied: 0 });
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);
  const [recentActivityLogs, setRecentActivityLogs] = useState<any[]>([]);
  const [loadingSidebar, setLoadingSidebar] = useState(true);

  const applyOrgSettings = (org: any) => {
    const settings = {
      primaryColor: org.primaryColor,
      secondaryColor: org.secondaryColor,
      currency: org.currency,
      timezone: org.timezone,
      dateFormat: org.dateFormat,
      language: org.language,
      enableWorkoutManagement: org.enableWorkoutManagement,
      enableDietManagement: org.enableDietManagement,
      enableAttendanceTracking: org.enableAttendanceTracking,
      enableMultiBranchOperations: org.enableMultiBranchOperations,
      enablePersonalTraining: org.enablePersonalTraining,
    };
    setOrgSettings(settings);

    // Apply brand colors as CSS custom properties across the entire workspace
    if (org.primaryColor) {
      document.documentElement.style.setProperty('--color-primary-org', org.primaryColor);
      document.documentElement.style.setProperty('--org-primary', org.primaryColor);
    }
    if (org.secondaryColor) {
      document.documentElement.style.setProperty('--color-secondary-org', org.secondaryColor);
      document.documentElement.style.setProperty('--org-secondary', org.secondaryColor);
    }

    // Store locale/formatting prefs in localStorage so any page can read them
    if (org.currency) localStorage.setItem('orgCurrency', org.currency);
    if (org.timezone) localStorage.setItem('orgTimezone', org.timezone);
    if (org.dateFormat) localStorage.setItem('orgDateFormat', org.dateFormat);
    if (org.language) localStorage.setItem('orgLanguage', org.language);

    // Store sub-settings so workspace pages can consume them without extra API calls
    const s = org.settings || {};
    if (s.billing) localStorage.setItem('orgBillingSettings', JSON.stringify(s.billing));
    if (s.attendance) localStorage.setItem('orgAttendanceSettings', JSON.stringify(s.attendance));
    if (s.membership) localStorage.setItem('orgMembershipSettings', JSON.stringify(s.membership));
    if (s.notifications) localStorage.setItem('orgNotificationSettings', JSON.stringify(s.notifications));
    if (s.security) localStorage.setItem('orgSecuritySettings', JSON.stringify(s.security));
  };

  const fetchSidebarData = async (gymId: string) => {
    try {
      const [stats, renewals, logs] = await Promise.all([
        attendanceApi.getStats(gymId),
        membershipsApi.getExpiring(gymId, 7),
        attendanceApi.listLogs(gymId)
      ]);
      setLiveStats(stats || { activeInside: 0, totalCheckInsToday: 0, totalDenied: 0 });
      setUpcomingRenewals(renewals || []);
      setRecentActivityLogs((logs || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch sidebar live data:', err);
    } finally {
      setLoadingSidebar(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    const selectedGymItem = gyms.find(g => g.name === activeGym);
    const selectedGymId = selectedGymItem ? selectedGymItem.id : 'all';
    fetchSidebarData(selectedGymId);

    // Set up a polling interval for live update (every 10 seconds)
    const interval = setInterval(() => {
      fetchSidebarData(selectedGymId);
    }, 10000);

    return () => clearInterval(interval);
  }, [mounted, activeGym, gyms]);

  const getRightPanel = async () => {
    const r = localStorage.getItem("quickStat");
    setRightPanelOpen(JSON.parse(r || 'true'))
  }

  const getPageTitle = (path: string) => {
    if (path.startsWith('/workspace/dashboard')) return 'Dashboard';
    if (path.startsWith('/workspace/analytics')) return 'Dashboard';
    if (path.startsWith('/workspace/gyms/dashboard')) return 'Dashboard';
    if (path.startsWith('/workspace/members')) return 'Members';
    if (path.startsWith('/workspace/memberships')) return 'Memberships';
    if (path.startsWith('/workspace/attendance')) return 'Attendance';
    if (path.startsWith('/workspace/workouts/programs')) return 'Workout Programs';
    if (path.startsWith('/workspace/workouts/sessions')) return 'Workout Sessions';
    if (path.startsWith('/workspace/workouts')) return 'Workouts';
    if (path.startsWith('/workspace/diets')) return 'Diet Plans';
    if (path.startsWith('/workspace/billing')) return 'Billing & Invoices';
    if (path.startsWith('/workspace/expenses')) return 'Expenses';
    if (path.startsWith('/workspace/reports')) return 'Reports';
    if (path.startsWith('/workspace/settings')) return 'Settings';
    if (path.startsWith('/workspace/roles')) return 'Roles & Permissions';
    if (path.startsWith('/workspace/employees')) return 'Employees';
    if (path.startsWith('/workspace/organization')) return 'Organization';
    if (path.startsWith('/workspace/users')) return 'Users & Invites';
    if (path.startsWith('/workspace/audit-logs')) return 'Audit Logs';
    return 'Dashboard';
  };

  // Synchronize URL search parameters with localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const orgIdParam = searchParams.get('orgId');
    const gymIdParam = searchParams.get('gymId');

    const savedOrgId = localStorage.getItem('organizationId');
    const savedGymName = localStorage.getItem('activeGymName') || 'All Gyms';

    let selectedGymId = 'all';
    if (savedGymName !== 'All Gyms' && gyms.length > 0) {
      const matched = gyms.find(g => g.name === savedGymName);
      if (matched) {
        selectedGymId = matched.id;
      }
    }

    // 1. If params exist in URL, update localStorage if they differ
    if (orgIdParam && orgIdParam !== savedOrgId) {
      localStorage.setItem('organizationId', orgIdParam);
      if (organizations.length > 0) {
        const matched = organizations.find(o => o.id === orgIdParam);
        if (matched) {
          localStorage.setItem('organizationName', matched.name);
          setActiveOrg({ id: matched.id, name: matched.name, slug: matched.slug });
        }
      }
    }

    if (gymIdParam) {
      if (gymIdParam === 'all') {
        if (savedGymName !== 'All Gyms') {
          localStorage.setItem('activeGymName', 'All Gyms');
          setActiveGym('All Gyms');
        }
      } else if (gyms.length > 0) {
        const matched = gyms.find(g => g.id === gymIdParam);
        if (matched && savedGymName !== matched.name) {
          localStorage.setItem('activeGymName', matched.name);
          setActiveGym(matched.name);
        }
      }
    }

    // 2. If params are missing or incorrect in URL, append them to browser url
    const finalOrgId = orgIdParam || savedOrgId;
    const finalGymId = gymIdParam || selectedGymId;

    if (finalOrgId && (orgIdParam !== finalOrgId || (finalGymId !== 'all' && gymIdParam !== finalGymId))) {
      const params = new URLSearchParams(window.location.search);
      params.set('orgId', finalOrgId);
      if (finalGymId !== 'all') {
        params.set('gymId', finalGymId);
      } else {
        params.delete('gymId');
      }
      const newUrl = `${pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams, pathname, organizations, gyms]);

  // Redirect checks based on Route Guard verification
  useEffect(() => {
    const selectedGymItem = gyms.find(g => g.name === activeGym);
    const selectedGymId = selectedGymItem ? selectedGymItem.id : 'all';
    const verification = verifyRoute(pathname, selectedGymId);

    if (!verification.allowed) {
      if (verification.reason === 'unauthenticated') {
        router.push('/auth?mode=login');
        triggerAuditLog('unauthorized_route_attempt', `Guest attempted to access path ${pathname}`);
      } else if (verification.reason === 'no_org') {
        router.push('/organizations');
        triggerAuditLog('unauthorized_route_attempt', `User attempted to access workspace path ${pathname} without active organization`);
      } else if (verification.reason === 'no_permission') {
        triggerAuditLog('permission_denied', `User role ${userRole} denied access to ${pathname} (missing ${verification.requiredDetails})`);
      } else if (verification.reason === 'no_feature') {
        triggerAuditLog('feature_restriction', `User role ${userRole} denied access to ${pathname} (feature ${verification.requiredDetails} locked)`);
      } else if (verification.reason === 'no_gym_access') {
        triggerAuditLog('gym_restriction', `User role ${userRole} denied branch access to selected branch ${activeGym} (id ${verification.requiredDetails})`);
      }
    }
  }, [verifyRoute, pathname, router, triggerAuditLog, userRole, activeGym, gyms]);

  // Load context on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check token
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth?mode=login');
      return;
    }

    // Load user profile
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.fullName || u.name || '');
        setUserEmail(u.email || '');
        setUserAvatar(u.avatarUrl || '');
        if (u.role) updateRoleContext(u.role);
      } catch (_) { }
    }

    // Fetch fresh user profile from backend
    authApi.getMe().then((data) => {
      if (data && data.user) {
        const userStr = localStorage.getItem('user');
        let currentLocalUser = {};
        if (userStr) {
          try { currentLocalUser = JSON.parse(userStr); } catch (_) { }
        }
        const mergedUser = {
          ...currentLocalUser,
          ...data.user,
          fullName: data.user.name,
        };
        localStorage.setItem('user', JSON.stringify(mergedUser));
        setUserName(mergedUser.fullName || '');
        setUserEmail(mergedUser.email || '');
        setUserAvatar(mergedUser.avatarUrl || '');
        if (mergedUser.role) updateRoleContext(mergedUser.role);
      }
    }).catch(err => {
      console.error('Failed to sync profile from server:', err);
    });

    // Load active organization ID
    const orgId = localStorage.getItem('organizationId');
    const orgName = localStorage.getItem('organizationName') || 'Select Organization';
    const savedGym = localStorage.getItem('activeGymName') || 'All Gyms';
    setActiveGym(savedGym);

    if (orgId) {
      setActiveOrg({ id: orgId, name: orgName, slug: orgName.toLowerCase().replace(/ /g, '-') });
      // Fetch gyms for this org
      gymApi.list(orgId).then((data) => {
        if (!data || data.length === 0) {
          router.push('/organizations');
          return;
        }
        setGyms(data.map((g: any) => ({ id: g.id, name: g.name, isActive: true })));

        // Guard against a stale branch selection carried over from a different
        // organization: if the saved gym name isn't one of this org's gyms,
        // fall back to "All Gyms" so the sidebar selector never shows a branch
        // that doesn't belong to the active workspace.
        if (savedGym !== 'All Gyms' && !data.some((g: any) => g.name === savedGym)) {
          localStorage.setItem('activeGymName', 'All Gyms');
          setActiveGym('All Gyms');
        }
      }).catch(err => {
        console.error('Error fetching gyms:', err);
        router.push('/organizations');
      });
    } else {
      router.push('/organizations');
      return;
    }

    // Load user's organization list + apply active org settings
    orgApi.list().then((data) => {
      setOrganizations(data);
      const currentOrgId = localStorage.getItem('organizationId');
      const activeOrgData = data.find((o: any) => o.id === currentOrgId);
      if (activeOrgData) {
        applyOrgSettings(activeOrgData);
      }
    }).catch(err => console.error('Error fetching orgs:', err));

    // Listen for Cmd+K or Ctrl+K shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Listen for Workspace Tier Changes
    const updateTier = () => {
      const tier = localStorage.getItem('workspaceTier') || 'Expert';
      setWorkspaceTier(tier);
    };
    updateTier();
    window.addEventListener('workspaceTierChanged', updateTier);

    // Listen for org settings changes (fired by Edit Organization page after save)
    const handleOrgSettingsChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) applyOrgSettings(detail);
    };
    window.addEventListener('orgSettingsChanged', handleOrgSettingsChanged);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('workspaceTierChanged', updateTier);
      window.removeEventListener('orgSettingsChanged', handleOrgSettingsChanged);
    };
  }, [router]);

  // Focus search input when command palette opens
  useEffect(() => {
    if (commandPaletteOpen && commandInputRef.current) {
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 50);
    }
  }, [commandPaletteOpen]);

  const handleSelectOrg = (orgId: string, name: string) => {
    localStorage.setItem('organizationId', orgId);
    localStorage.setItem('organizationName', name);
    localStorage.setItem('activeGymName', 'All Gyms');
    setActiveOrg({ id: orgId, name, slug: name.toLowerCase().replace(/ /g, '-') });
    setActiveGym('All Gyms');
    setOrgDropdownOpen(false);
    const selectedOrg = organizations.find((o) => o.id === orgId);
    if (selectedOrg) applyOrgSettings(selectedOrg);

    // Update URL search params and hard-reload page context
    const params = new URLSearchParams(window.location.search);
    params.set('orgId', orgId);
    params.delete('gymId');
    window.location.href = `${pathname}?${params.toString()}`;
  };

  const handleSelectGym = (gymName: string, gymId?: string) => {
    setActiveGym(gymName);
    localStorage.setItem('activeGymName', gymName);

    const params = new URLSearchParams(window.location.search);
    if (gymId && gymId !== 'all') {
      params.set('gymId', gymId);
    } else {
      params.delete('gymId');
    }
    window.location.href = `${pathname}?${params.toString()}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('organizationName');
    router.push('/auth?mode=login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) {
      showToast('Name and email cannot be empty', 'error');
      return;
    }

    try {
      const data = await authApi.updateProfile({ fullName: editName, email: editEmail });

      const userStr = localStorage.getItem('user');
      let currentUser = {};
      if (userStr) {
        try { currentUser = JSON.parse(userStr); } catch (_) { }
      }

      const updatedUser = {
        ...currentUser,
        ...data.user,
        fullName: data.user.name,
        avatarUrl: editAvatar,
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUserName(updatedUser.fullName);
      setUserEmail(updatedUser.email);
      setUserAvatar(updatedUser.avatarUrl);
      setProfileModalOpen(false);
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update profile on server', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const quickStatClicked = () => {
    setRightPanelOpen(!rightPanelOpen);
    localStorage.setItem("quickStat", String(!rightPanelOpen))
  }

  const openProfileView = (editMode = false) => {
    setEditName(userName);
    setEditEmail(userEmail);
    setEditAvatar(userAvatar);
    setIsEditingProfile(editMode);
    setProfileModalOpen(true);
    setProfileDropdownOpen(false);
  };

  // Live notification feed - derived from the same real data already polled
  // for the sidebar (upcoming renewals + recent attendance logs), not mock data.
  type NotificationItem = { id: string; type: 'alert' | 'success' | 'warning' | 'info'; title: string; desc: string; time: string; unread: boolean };

  const renewalNotifications: NotificationItem[] = upcomingRenewals.slice(0, 5).map((sub: any) => {
    const memberName = sub.member ? `${sub.member.firstName || ''} ${sub.member.lastName || ''}`.trim() : 'A member';
    return {
      id: `renewal-${sub.id}`,
      type: sub.daysUntilExpiry <= 1 ? 'alert' : 'warning',
      title: 'Membership Expiring',
      desc: `${memberName}'s ${sub.membershipPlan?.name || 'membership'} ${sub.daysUntilExpiry === 0 ? 'expires today' : `expires in ${sub.daysUntilExpiry} day${sub.daysUntilExpiry === 1 ? '' : 's'}`}.`,
      time: sub.daysUntilExpiry === 0 ? 'Today' : `in ${sub.daysUntilExpiry}d`,
      unread: sub.daysUntilExpiry <= 3,
    };
  });

  const activityNotifications: NotificationItem[] = recentActivityLogs.slice(0, 5).map((log: any) => {
    const isGranted = log.status === 'Granted';
    return {
      id: `activity-${log.id}`,
      type: isGranted ? 'success' : 'alert',
      title: isGranted ? 'Member Checked In' : 'Attendance Denied',
      desc: isGranted
        ? `${log.memberName} checked in at ${log.branchName} via ${log.method}.`
        : `${log.memberName} was denied entry: ${log.reason || 'No active plan / block rule'}.`,
      time: log.checkInTime,
      unread: !isGranted,
    };
  });

  const notifications: NotificationItem[] = [...renewalNotifications, ...activityNotifications]
    .map((n) => ({ ...n, unread: n.unread && !readNotificationIds.has(n.id) }));
  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllNotificationsRead = () => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  };

  // Navigation menu items mapped by role authorization + org feature flags
  const navGroups = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', icon: Grid, path: '/workspace/dashboard', roles: ['owner', 'branch_manager', 'trainer', 'receptionist'] }
      ]
    },
    {
      title: 'Front Desk & Members',
      items: [
        { name: 'Members', icon: Users, path: '/workspace/members', roles: ['owner', 'branch_manager', 'trainer', 'receptionist'] },
        { name: 'Memberships', icon: FileText, path: '/workspace/memberships', roles: ['owner', 'branch_manager', 'receptionist'] },
        ...(orgSettings.enableAttendanceTracking !== false ? [
          { name: 'Attendance', icon: Calendar, path: '/workspace/attendance', roles: ['owner', 'branch_manager', 'receptionist'] }
        ] : [])
      ]
    },
    {
      title: 'Fitness & Coaching',
      items: [
        ...(orgSettings.enableWorkoutManagement !== false ? [{
          name: 'Training Studio',
          icon: Dumbbell,
          path: '/workspace/workouts',
          roles: ['owner', 'branch_manager', 'trainer', 'receptionist', 'dietitian']
        }] : []),
        ...(orgSettings.enableDietManagement !== false ? [
          { name: 'Diet Plans', icon: Apple, path: '/workspace/diets', roles: ['owner', 'branch_manager', 'trainer'] }
        ] : [])
      ]
    },
    {
      title: 'Financials',
      items: [
        { name: 'Billing & Invoices', icon: DollarSign, path: '/workspace/billing', roles: ['owner', 'branch_manager', 'receptionist'] },
        { name: 'Expenses', icon: Sliders, path: '/workspace/expenses', roles: ['owner', 'branch_manager'] },
        { name: 'Reports', icon: TrendingUp, path: '/workspace/reports', roles: ['owner', 'branch_manager'] }
      ]
    },
    {
      title: 'Settings & Administration',
      items: [
        { name: 'Branch Settings', icon: Settings, path: '/workspace/settings', roles: ['owner', 'branch_manager'], tier: ['Essential', 'Professional', 'Expert'] },
        { name: 'Organization', icon: Building2, path: '/workspace/organization/details', roles: ['owner', 'branch_manager'], tier: ['Essential', 'Professional', 'Expert'] },
        { name: 'Users & Invites', icon: User, path: '/workspace/users', roles: ['owner', 'branch_manager'], tier: ['Professional', 'Expert'] },
        { name: 'Roles & permissions', icon: Lock, path: '/workspace/roles', roles: ['owner'], tier: ['Expert'] },
        { name: 'Audit Logs', icon: History, path: '/workspace/audit-logs/authentication', roles: ['owner'], tier: ['Expert'] }
      ]
    }
  ];

  // Helper to check if an item is allowed in the current workspace tier
  const isTierAllowed = (itemTier?: string[]) => {
    if (!itemTier) return true;
    return itemTier.includes(workspaceTier);
  };

  // Live "Search Everything" results - queries real Members/Workouts/Employees
  // APIs (+ client-side filters the already-loaded branch list), replacing what
  // used to be 6 hardcoded fake entries that never matched real data.
  const [globalSearchResults, setGlobalSearchResults] = useState<
    { category: string; name: string; subtitle?: string; path: string }[]
  >([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const query = searchQuery.trim();
    if (query.length < 2) {
      setGlobalSearchResults([]);
      setGlobalSearchLoading(false);
      return;
    }

    let cancelled = false;
    setGlobalSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const [membersRes, workoutsRes, employeesRes] = await Promise.allSettled([
          membersApi.list({ search: query }),
          workoutsApi.list({ search: query, limit: 5 }),
          rolesApi.getEmployees(),
        ]);

        const results: { category: string; name: string; subtitle?: string; path: string }[] = [];

        if (membersRes.status === 'fulfilled') {
          (membersRes.value || []).slice(0, 5).forEach((m: any) => {
            results.push({
              category: 'Members',
              name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member',
              subtitle: m.phoneNumber,
              path: `/workspace/members/${m.id}`,
            });
          });
        }

        if (workoutsRes.status === 'fulfilled') {
          const workouts = workoutsRes.value?.workouts || [];
          workouts.slice(0, 5).forEach((w: any) => {
            results.push({
              category: 'Workouts',
              name: w.name,
              subtitle: w.type,
              path: `/workspace/workouts/builder?id=${w.id}`,
            });
          });
        }

        if (employeesRes.status === 'fulfilled') {
          (employeesRes.value || [])
            .filter((e: any) => e.name?.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
            .forEach((e: any) => {
              results.push({
                category: 'Employees',
                name: e.name,
                subtitle: e.roleName,
                path: '/workspace/users',
              });
            });
        }

        gyms
          .filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5)
          .forEach((g) => {
            results.push({ category: 'Gym Branches', name: g.name, path: '/workspace/gyms' });
          });

        if (!cancelled) setGlobalSearchResults(results);
      } catch (err) {
        console.error('Global search failed:', err);
        if (!cancelled) setGlobalSearchResults([]);
      } finally {
        if (!cancelled) setGlobalSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, commandPaletteOpen, gyms]);

  const filteredSearch = globalSearchResults;

  return (
    <div className="min-h-screen bg-background text-neutral-900 font-sans flex overflow-hidden">

      {/* ========================================================================= */}
      {/* SIDEBAR - DESKTOP */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col border-r h-[100vh] border-neutral-200 bg-white transition-all duration-300 relative z-[25] shrink-0 ${sidebarExpanded ? 'w-[260px]' : 'w-[72px]'
          }`}
      >
        {/* Toggle Collapse Arrow */}
        <button
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="absolute right-[-12px] top-[74px] w-6 h-6 rounded-full border border-neutral-200 bg-white text-neutral-400 hover:text-neutral-700 flex items-center justify-center cursor-pointer shadow-[var(--shadow-card)] z-30 transition-transform duration-200"
          style={{ transform: sidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
        >
          <ChevronRight size={12} className={sidebarExpanded ? 'rotate-180' : ''} />
        </button>

        {/* TOP: Platform Brand */}
        <div className={`flex items-center gap-2.5 pt-4 pb-1 justify-center ${sidebarExpanded ? 'px-4' : 'justify-center px-0'}`}>
          {brandLogoUrl && sidebarExpanded ? (
            <img
              src={brandLogoUrl}
              alt={brand.platformName}
              className={`h-8 w-auto object-contain shrink-0 ${sidebarExpanded ? 'max-w-[160px]' : 'max-w-[36px]'}`}
            />
          ) : (
            !sidebarExpanded && faviconUrl ?
              <img
                src={faviconUrl}
                alt={brand.platformName}
                className={`h-7 w-auto object-contain shrink-0 ${sidebarExpanded ? 'max-w-[160px]' : 'max-w-[36px]'}`}
              /> :
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0"
                style={{ backgroundColor: brand.primaryColor }}
              >
                {brandInitials}
              </div>

          )}
          {sidebarExpanded && !brandLogoUrl && <span className="text-xs font-extrabold text-neutral-900 truncate">{brand.platformName}</span>}
        </div>

        {/* TOP: Organization Switcher */}
        <div className="p-4 border-b border-neutral-100">
          <div className="relative" ref={orgDropdownRef}>
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className={`w-full flex items-center gap-3 p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 rounded-xl cursor-pointer text-left transition-all overflow-hidden ${!sidebarExpanded ? 'justify-center' : ''
                }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shrink-0 select-none"
                style={{ background: orgSettings.primaryColor ? `linear-gradient(135deg, ${orgSettings.primaryColor}, ${orgSettings.secondaryColor || orgSettings.primaryColor})` : 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}
              >
                {activeOrg ? activeOrg.name.substring(0, 2).toUpperCase() : 'GF'}
              </div>

              {sidebarExpanded && (
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex flex-col gap-1">
                      <span className="text-xs font-extrabold text-neutral-900 truncate leading-none">{activeOrg ? activeOrg.name : 'Select Org'}</span>
                      {activeOrg && <PlanBadge size="sm" className="self-start" />}
                    </div>
                    <ChevronDown size={10} className="text-neutral-400 shrink-0 mt-0.5" />
                  </div>
                </div>
              )}
            </button>

            {/* Org Switcher Dropdown Menu */}
            {orgDropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-neutral-200 shadow-xl p-2 z-[70] animate-fade-in">
                <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">Your Organizations</div>
                <div className="space-y-1 my-1">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSelectOrg(org.id, org.name)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${activeOrg?.id === org.id ? 'bg-primary-light text-primary font-bold' : 'hover:bg-neutral-100 text-neutral-600'
                        }`}
                    >
                      <div className="w-6 h-6 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-[10px] text-neutral-600">
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate">{org.name}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-neutral-100 my-1 pt-1 space-y-1">
                  <button
                    onClick={() => { setOrgDropdownOpen(false); router.push('/onboarding?new=true'); }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-left"
                  >
                    <Plus size={14} className="text-primary" />
                    <span>Create Organization</span>
                  </button>
                  <button
                    onClick={() => { setOrgDropdownOpen(false); router.push('/organizations'); }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-left"
                  >
                    <Grid size={14} />
                    <span>Manage Workspaces</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GYM BRANCH SWITCHER */}
          {activeOrg && (
            <div className="mt-3 relative" ref={gymDropdownRef}>
              <button
                onClick={() => setGymDropdownOpen(!gymDropdownOpen)}
                className={`w-full flex items-center gap-2 p-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 rounded-lg cursor-pointer text-left transition-all ${!sidebarExpanded ? 'justify-center' : ''
                  }`}
              >
                <MapPin size={12} className="text-primary shrink-0" />
                {sidebarExpanded && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="text-[10px] font-bold text-neutral-600 truncate">{activeGym}</span>
                    <ChevronDown size={8} className="text-neutral-400 shrink-0" />
                  </div>
                )}
              </button>

              {/* Gym Switcher Dropdown */}
              {gymDropdownOpen && sidebarExpanded && (
                <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white border border-neutral-200 shadow-xl p-1.5 z-50">
                  <button
                    onClick={() => {
                      handleSelectGym('All Gyms', 'all');
                      setGymDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-[10px] font-bold rounded-lg ${activeGym === 'All Gyms' ? 'bg-primary-light text-primary' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                      }`}
                  >
                    All Branches
                  </button>
                  {gyms.map((gym) => (
                    <button
                      key={gym.id}
                      onClick={() => {
                        handleSelectGym(gym.name, gym.id);
                        setGymDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-between ${activeGym === gym.name ? 'bg-primary-light text-primary' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                        }`}
                    >
                      <span className="truncate">{gym.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 ml-1.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MIDDLE: Scrollable Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin select-none">
          {mounted && navGroups.map((group, gIdx) => {
            // Filter menu items by role and tier
            const visibleItems = group.items.filter(item => {
              const hasRoleAccess = item.roles.includes(userRole);
              const hasTierAccess = isTierAllowed((item as any).tier);

              let hasPerm = true;
              if (item.path === '/workspace/roles') hasPerm = hasPermission('roles.view');
              if (item.path === '/workspace/users') hasPerm = hasPermission('members.view');
              if (item.path === '/workspace/billing') hasPerm = hasFeature('billing');
              if (item.path === '/workspace/expenses') hasPerm = hasFeature('billing');
              if (item.path === '/workspace/reports') hasPerm = hasFeature('reports');
              if (item.path.includes('/workspace/audit-logs')) hasPerm = hasPermission('reports.view') || userRole === 'owner' || userRole === 'manager' || userRole === 'platform_admin';

              return hasRoleAccess && hasPerm && hasTierAccess;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                {sidebarExpanded && (
                  <span className="block px-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                    {group.title}
                  </span>
                )}

                <div className="space-y-0.5">
                  {visibleItems.map((item, iIdx) => {
                    const isActive = (() => {
                      if (item.path === '/workspace/settings') {
                        return pathname === '/workspace/settings' || pathname === '/workspace/gyms/edit';
                      }
                      if (item.path === '/workspace/gyms/media') {
                        return pathname === '/workspace/gyms/media' || pathname.startsWith('/workspace/gyms/media');
                      }
                      if (item.path === '/workspace/gyms') {
                        return pathname === '/workspace/gyms' || pathname === '/workspace/gyms/create' || pathname.startsWith('/workspace/gyms/media');
                      }
                      if (item.path === '/workspace/attendance' || item.path === '/workspace/attendance/dashboard') {
                        return pathname.startsWith('/workspace/attendance');
                      }
                      if (item.path === '/workspace/members') {
                        return pathname === '/workspace/members' || pathname.startsWith('/workspace/members/') || pathname.startsWith('/workspace/members?');
                      }
                      if (item.path === '/workspace/memberships') {
                        return pathname.startsWith('/workspace/memberships');
                      }
                      if (item.path === '/workspace/organization/details') {
                        return pathname === '/workspace/organization/details' || pathname.startsWith('/workspace/organization/edit');
                      }
                      return pathname === item.path;
                    })();
                    const IconComponent = item.icon;

                    return (
                      <div key={iIdx} className="space-y-1">
                        <button
                          onClick={() => router.push(item.path)}
                          className={`w-full flex items-center gap-3 py-2 px-2.5 rounded-xl text-left cursor-pointer transition-all ${isActive
                            ? 'bg-primary-light text-primary font-bold'
                            : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                            }`}
                          title={!sidebarExpanded ? item.name : undefined}
                        >
                          <IconComponent size={15} className={`shrink-0 ${isActive ? 'text-primary' : 'text-neutral-400'}`} />
                          {sidebarExpanded && (
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-xs">{item.name}</span>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* BOTTOM: Current Profile Quick Link */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/60">
          <div className="flex items-center justify-between">
            <button
              ref={profileSidebarTriggerRef}
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
            >
              <div className="w-7 h-7 rounded-full bg-primary-light border border-primary/10 flex items-center justify-center font-bold text-xs text-primary overflow-hidden shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName || 'Staff'} className="w-full h-full object-cover animate-fade-in" />
                ) : (
                  (userName || 'S').substring(0, 1).toUpperCase()
                )}
              </div>
              {sidebarExpanded && (
                <div>
                  <span className="block text-[11px] font-bold text-neutral-800 max-w-[120px] truncate">{userName || 'Staff User'}</span>
                  <span className="block text-[8px] text-neutral-400 capitalize">{userRole.replace('_', ' ')}</span>
                </div>
              )}
            </button>
            {sidebarExpanded && (
              <button onClick={handleLogout} className="text-neutral-400 hover:text-danger p-1 cursor-pointer transition-colors" title="Log Out">
                <LogOut size={13} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN LAYOUT WRAPPER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden">

        {/* ========================================================================= */}
        {/* STICKY TOP NAVIGATION BAR */}
        {/* ========================================================================= */}
        <header className="sticky top-0 h-16 border-b border-neutral-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-[60]">

          {/* LEFT: Sidebar Toggle (Mobile), Mobile Context & Breadcrumbs */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-900 shrink-0"
            >
              <Menu size={16} />
            </button>

            {/* Mobile Header Info */}
            <div className="md:hidden flex flex-col pl-1 min-w-0">
              <span className="text-[10px] font-extrabold text-neutral-800 truncate max-w-[140px]">{activeOrg ? activeOrg.name : brand.platformName}</span>
              <span className="text-[8px] font-bold text-primary truncate max-w-[140px]">{activeGym}</span>
            </div>

            {/* Dynamic Breadcrumb Pattern */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 select-none">
              <button
                onClick={() => router.push('/organizations')}
                className="hover:text-neutral-700 cursor-pointer flex items-center gap-1 bg-transparent border-none p-0 text-neutral-400 font-bold transition-colors"
              >
                <Building2 size={12} className="text-primary" />
                <span>Workspaces</span>
              </button>
              <ChevronRight size={10} />
              <span className="hover:text-neutral-700 cursor-pointer capitalize">{activeOrg ? activeOrg.name : 'Workspace'}</span>
              {activeGym !== 'All Gyms' && (
                <>
                  <ChevronRight size={10} />
                  <span className="text-neutral-500 font-medium capitalize">{activeGym}</span>
                </>
              )}
              <ChevronRight size={10} />
              <span className="text-neutral-800 capitalize">{getPageTitle(pathname)}</span>
            </div>
          </div>

          {/* CENTER: Global Search Trigger Button */}
          <div className="flex-1 max-w-md mx-2 md:mx-6 hidden md:block">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl text-left text-xs text-neutral-400 transition-all cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Search size={13} className="text-neutral-400" />
                <span>Search everything...</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-[9px] font-bold text-neutral-500 shadow-sm">⌘K</span>
              </div>
            </button>
          </div>

          {/* RIGHT: Notifications, Profile, Role Select, Toggle Utility */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">

            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="md:hidden p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-500 hover:text-neutral-900 transition-all cursor-pointer shrink-0"
              title="Search everything"
            >
              <Search size={14} />
            </button>

            {/* Workspace Experience Tier Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-primary-light border border-primary/10 rounded-xl select-none">
              <Sparkles size={11} className="text-primary" />
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-primary">
                {workspaceTier}
              </span>
            </div>

            {/* Notifications Alert Bell */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-500 hover:text-neutral-900 transition-all cursor-pointer relative"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
                )}
              </button>

              {/* Notification Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white border border-neutral-200 shadow-xl p-4 z-[70] animate-fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 mb-3">
                    <span className="text-xs font-black text-neutral-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllNotificationsRead} className="text-[10px] font-bold text-primary hover:underline cursor-pointer">Mark all read</button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <p className="text-[10px] text-neutral-400 text-center py-6">No notifications right now.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-2.5 rounded-xl transition-all flex gap-3 text-xs ${n.unread ? 'bg-neutral-50 border border-neutral-100' : 'bg-transparent'}`}>
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${n.type === 'alert' ? 'bg-danger' : n.type === 'success' ? 'bg-success' : 'bg-warning'}`} />
                          <div>
                            <div className="font-bold text-neutral-800">{n.title}</div>
                            <div className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">{n.desc}</div>
                            <div className="text-[9px] text-neutral-400 mt-1">{n.time}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Toggle */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="p-1 rounded-full border border-neutral-200 hover:border-neutral-300 bg-white shadow-sm cursor-pointer flex items-center justify-center"
              >
                <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center font-bold text-xs text-primary select-none overflow-hidden shrink-0">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName || 'Staff'} className="w-full h-full object-cover animate-fade-in" />
                  ) : (
                    (userName || 'S').substring(0, 1).toUpperCase()
                  )}
                </div>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-white border border-neutral-200 shadow-xl p-2.5 z-[70] animate-fade-in">
                  <div className="px-2.5 py-1.5 border-b border-neutral-100 mb-1.5">
                    <span className="block text-xs font-black text-neutral-900">{userName || 'Staff User'}</span>
                    <span className="block text-[9px] text-neutral-400 mt-0.5">Role: <b className="text-primary font-semibold">{userRole.toUpperCase()}</b></span>
                  </div>

                  <button
                    onClick={() => openProfileView(false)}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-left cursor-pointer"
                  >
                    <User size={13} />
                    <span>My Profile</span>
                  </button>



                  <button
                    onClick={() => { setProfileDropdownOpen(false); router.push('/organizations'); }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-left cursor-pointer"
                  >
                    <Grid size={13} />
                    <span>Switch Workspace Lobby</span>
                  </button>

                  <button
                    onClick={() => { setProfileDropdownOpen(false); setCommandPaletteOpen(true); }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-left cursor-pointer"
                  >
                    <Sliders size={13} />
                    <span>Preferences</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-danger hover:bg-danger-light transition-colors text-left cursor-pointer border-t border-neutral-100 mt-1.5 pt-1.5"
                  >
                    <LogOut size={13} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Toggle Right Panel */}
            <button
              onClick={() => { quickStatClicked() }}
              className={`hidden lg:block p-2.5 rounded-xl border transition-all cursor-pointer ${rightPanelOpen ? 'bg-primary-light border-primary/30 text-primary' : 'bg-neutral-50 border-neutral-200 text-neutral-400 hover:text-neutral-700'
                }`}
              title="Toggle Right activity bar"
            >
              <Sliders size={14} />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* WORKSPACE PAGE VIEW & PANELS SECTION */}
        {/* ========================================================================= */}
        <div className="flex-1 flex min-w-0 relative overflow-hidden">

          {/* CENTER: Main content area (Scrollable) */}
          <main className="flex-1 overflow-y-auto px-6 py-8 relative scrollbar-thin select-text">
            {(() => {
              // While the access-control context is still loading permissions/features
              // (true on the server too, since that effect never runs during SSR),
              // render children unconditionally so the client's first hydration pass
              // matches the server output exactly. Real gating kicks in once loaded,
              // which by then is a normal post-hydration client update, not a diff risk.
              if (accessControlLoading) {
                return children;
              }

              const selectedGymItem = gyms.find(g => g.name === activeGym);
              const selectedGymId = selectedGymItem ? selectedGymItem.id : 'all';
              const verification = verifyRoute(pathname, selectedGymId);

              // Log triggers and side-effects via useEffect
              if (!verification.allowed) {
                if (verification.reason === 'no_permission') {
                  return <AccessDeniedView requiredPermission={verification.requiredDetails} />;
                }
                if (verification.reason === 'no_feature') {
                  return <UpgradeRequiredView requiredPlan="Pro Plan" />;
                }
                if (verification.reason === 'no_gym_access') {
                  return (
                    <RestrictedGymView
                      currentGymName={activeGym}
                      gymsList={gyms}
                      onSwitchToAllowed={(gymName) => {
                        setActiveGym(gymName);
                        localStorage.setItem('activeGymName', gymName);
                      }}
                    />
                  );
                }
                return (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <span className="text-xs text-neutral-400 animate-pulse">Verifying workspace permissions...</span></div>
                );
              }

              return children;
            })()}
          </main>

          {/* ========================================================================= */}
          {/* RIGHT UTILITY PANEL */}
          {/* ========================================================================= */}
          {rightPanelOpen && (
            <aside className="hidden lg:flex flex-col w-72 border-l border-neutral-200 bg-white h-full shrink-0 p-5 overflow-y-auto space-y-6 scrollbar-thin">
              <div>
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-3 select-none">Branch Quick Stats</h3>
                <div className="space-y-2.5">
                  <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] text-neutral-400 font-bold">Currently Checked In</span>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                      </span>
                    </div>
                    <span className="text-2xl font-extrabold text-neutral-900 mt-1 block">
                      {liveStats.activeInside}{' '}
                      <span className="text-xs font-normal text-neutral-400">members</span>
                    </span>
                  </div>
                  <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-2xl">
                    <span className="block text-[10px] text-neutral-400 font-bold">Total Entrances Today</span>
                    <span className="text-xl font-extrabold text-neutral-800 mt-1 block">{liveStats.totalCheckInsToday}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-2xl">
                    <span className="block text-[10px] text-neutral-400 font-bold">Access Denied Today</span>
                    <span className={`text-xl font-extrabold mt-1 block ${liveStats.totalDenied > 0 ? 'text-danger' : 'text-neutral-400'}`}>
                      {liveStats.totalDenied}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-3 select-none">Upcoming Renewals (7 Days)</h3>
                <div className="space-y-2.5">
                  {upcomingRenewals.length === 0 ? (
                    <div className="text-[10px] text-neutral-400 text-center py-4 bg-neutral-50 border border-dashed border-neutral-200 rounded-2xl">
                      No expiring memberships.
                    </div>
                  ) : (
                    upcomingRenewals.slice(0, 4).map((sub) => {
                      const initials = sub.member?.fullName
                        ? sub.member.fullName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                        : 'M';
                      return (
                        <div key={sub.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-xl transition-all">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center font-bold text-[10px] text-primary shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-neutral-800 truncate">{sub.member?.fullName}</span>
                              <span className="block text-[8px] text-neutral-400 truncate">{sub.membershipPlan?.name || 'Membership'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block text-[8px] text-neutral-400">
                              {sub.daysUntilExpiry === 0 ? 'Today' : `in ${sub.daysUntilExpiry}d`}
                            </span>
                            <span className="inline-block mt-0.5 text-[8px] font-bold text-warning bg-warning-light px-1.5 py-0.2 rounded uppercase tracking-wider">
                              Expiring
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-3 select-none">Recent Live Logs</h3>
                <div className="relative border-l border-neutral-200 pl-4 space-y-4 text-xs select-none">
                  {recentActivityLogs.length === 0 ? (
                    <div className="text-[10px] text-neutral-400 py-2">
                      No check-ins logged today.
                    </div>
                  ) : (
                    recentActivityLogs.map((log) => {
                      const isGranted = log.status === 'Granted';
                      return (
                        <div key={log.id} className="relative">
                          <span
                            className={`absolute left-[-21px] top-1.5 w-2 h-2 rounded-full ring-2 ring-white ${isGranted
                              ? 'bg-success'
                              : 'bg-danger'
                              }`}
                          />
                          <span className={`block font-bold ${isGranted ? 'text-neutral-700' : 'text-danger'}`}>
                            {isGranted ? 'Access Granted' : 'Access Denied'}
                          </span>
                          <span className="block text-[10px] text-neutral-500 mt-0.5">
                            <span className="font-bold text-neutral-600">{log.memberName}</span>{' '}
                            {isGranted ? `checked in at ${log.branchName}` : `denied: ${log.reason || 'No plan / block rule'}`}
                          </span>
                          <span className="block text-[8px] text-neutral-400 mt-0.5">
                            {log.checkInTime} • {log.method}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE COLLAPSED DRAWER MENU */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
          <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />

          <aside className="relative w-64 bg-white border-r border-neutral-200 h-full p-5 flex flex-col justify-between z-10 animate-slide-in-left shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-black tracking-widest text-neutral-400">NAVIGATION</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-neutral-400 hover:text-neutral-900">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {mounted && navGroups.map((group, gIdx) => {
                  const visibleItems = group.items.filter(item => item.roles.includes(userRole));
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={gIdx} className="space-y-1">
                      <span className="block text-[8px] font-black uppercase text-neutral-400 mb-1">{group.title}</span>
                      {visibleItems.map((item, iIdx) => {
                        const Icon = item.icon;
                        const isAct = item.path === '/workspace/settings'
                          ? (pathname === '/workspace/settings' || pathname === '/workspace/gyms/edit')
                          : item.path === '/workspace/gyms'
                            ? (pathname === '/workspace/gyms' || pathname === '/workspace/gyms/create')
                            : (item.path === '/workspace/attendance' || item.path === '/workspace/attendance/dashboard')
                              ? pathname.startsWith('/workspace/attendance')
                              : item.path === '/workspace/members'
                                ? (pathname === '/workspace/members' || pathname.startsWith('/workspace/members/') || pathname.startsWith('/workspace/members?'))
                                : pathname === item.path;

                        return (
                          <div key={iIdx} className="space-y-1.5">
                            <button
                              onClick={() => { router.push(item.path); setMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 p-2 rounded-xl text-left cursor-pointer ${isAct ? 'bg-primary-light text-primary font-bold' : 'text-neutral-500'}`}
                            >
                              <Icon size={14} />
                              <span className="text-xs">{item.name}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 bg-danger-light text-danger text-xs font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMMAND PALETTE DIALOG (Cmd + K / Ctrl + K) */}
      {/* ========================================================================= */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-neutral-900/40 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => setCommandPaletteOpen(false)} />

          <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-[24px] shadow-2xl overflow-hidden relative z-10 animate-scale-in">
            {/* Input Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
              <Search className="text-neutral-400 shrink-0" size={16} />
              <input
                ref={commandInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything... (e.g. David, Technopark, invoice)"
                className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none border-none"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="px-2 py-0.5 rounded border border-neutral-200 text-[10px] text-neutral-400 hover:text-neutral-800"
              >
                ESC
              </button>
            </div>

            {/* Results Body */}
            <div className="p-3 max-h-80 overflow-y-auto scrollbar-thin space-y-3">
              {searchQuery.trim().length < 2 ? (
                <p className="text-xs text-neutral-400 text-center py-6">Type at least 2 characters to search members, workouts, employees, and branches.</p>
              ) : globalSearchLoading ? (
                <p className="text-xs text-neutral-400 text-center py-6">Searching…</p>
              ) : filteredSearch.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">No matching results for &quot;{searchQuery}&quot;.</p>
              ) : (
                <div>
                  <div className="px-2 pb-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400">Search Results</div>
                  <div className="space-y-0.5">
                    {filteredSearch.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCommandPaletteOpen(false);
                          router.push(item.path);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 text-left transition-colors cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-primary-light text-[8px] font-bold text-primary uppercase tracking-wider shrink-0">
                            {item.category}
                          </span>
                          <span className="text-neutral-800 font-medium truncate">{item.name}</span>
                        </div>
                        {item.subtitle && (
                          <span className="text-[10px] text-neutral-400 font-medium shrink-0 ml-2 truncate max-w-[140px]">{item.subtitle}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* command footer */}
            <div className="p-3.5 bg-neutral-50 border-t border-neutral-100 flex justify-between items-center text-[10px] text-neutral-400 select-none">
              <div className="flex gap-3">
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
              </div>
              <div>
                <span>Press Cmd+K to dismiss</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* USER PROFILE VIEW / EDIT MODAL */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => setProfileModalOpen(false)} />

          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-[24px] p-7 shadow-2xl relative z-10 animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-thin">

            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-extrabold text-neutral-900">
                  {isEditingProfile ? 'Edit User Profile' : 'User Profile Details'}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Manage your personal account credentials and visual avatar.
                </p>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Profile Avatar Card Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-center">
                <div className="w-20 h-20 rounded-full bg-primary-light border-2 border-primary/20 flex items-center justify-center font-bold text-3xl text-primary overflow-hidden select-none relative group">
                  {editAvatar ? (
                    <img src={editAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    editName ? editName.substring(0, 1).toUpperCase() : (userName || 'S').substring(0, 1).toUpperCase()
                  )}

                  {isEditingProfile && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white select-none">
                      PREVIEW
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-bold text-neutral-800 mt-3">{editName || userName || 'Staff User'}</h4>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold mt-1 bg-white border border-neutral-200 px-2 py-0.5 rounded-full inline-block">
                  {userRole.replace('_', ' ')}
                </p>
              </div>

              {/* Edit vs View Details fields */}
              {isEditingProfile ? (
                <div className="space-y-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Full Name</label>
                    <input
                      required
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:border-primary focus:ring-4 focus:ring-primary-light rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
                      placeholder="Marcus Vance"
                    />
                  </div>

                  {/* Email field */}
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Email Address</label>
                    <input
                      required
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-white border border-neutral-200 focus:border-primary focus:ring-4 focus:ring-primary-light rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
                      placeholder="marcus.vance@gymflow.app"
                    />
                  </div>

                  {/* Avatar Picker selection */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">Choose Avatar</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAvatarUploadOption('preset')}
                          className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded cursor-pointer ${avatarUploadOption === 'preset' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-500'}`}
                        >
                          Presets
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvatarUploadOption('url')}
                          className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded cursor-pointer ${avatarUploadOption === 'url' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-500'}`}
                        >
                          Custom URL
                        </button>
                      </div>
                    </div>

                    {avatarUploadOption === 'preset' ? (
                      <div className="grid grid-cols-5 gap-2.5 p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl">
                        {[
                          { name: 'Guru', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=150' },
                          { name: 'Trainer', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=150' },
                          { name: 'Cardio', url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=150' },
                          { name: 'Yoga', url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=150' },
                          { name: 'Elite', url: 'https://images.unsplash.com/photo-1605296867304-46d5465a25f1?auto=format&fit=crop&q=80&w=150' }
                        ].map((av, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditAvatar(av.url)}
                            className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer ${editAvatar === av.url ? 'border-primary' : 'border-transparent'}`}
                            title={av.name}
                          >
                            <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="url"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full bg-white border border-neutral-200 focus:border-primary focus:ring-4 focus:ring-primary-light rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
                        placeholder="https://images.unsplash.com/photo-..."
                      />
                    )}

                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar('')}
                        className="text-[9px] font-bold text-danger mt-1.5 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Reset to initials avatar
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Email Address</span>
                    <span className="text-xs text-neutral-800 font-medium">{userEmail || 'Not Set'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Account Role</span>
                    <span className="text-xs text-primary font-bold uppercase">{userRole.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Status</span>
                    <span className="text-xs text-success font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-success rounded-full animate-ping" />
                      <span>Active</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {isEditingProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 py-3.5 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-all cursor-pointer"
                    >
                      Back to details
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-primary hover:bg-primary-hover text-xs font-bold text-white rounded-xl shadow-sm hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setProfileModalOpen(false)}
                      className="flex-1 py-3.5 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-all cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="flex-1 py-3.5 bg-primary hover:bg-primary-hover text-xs font-bold text-white rounded-xl shadow-sm hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] animate-slide-up flex items-center gap-3 p-4 bg-white border border-neutral-200 rounded-2xl shadow-xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-success' : 'bg-danger'
            }`} />
          <span className="text-xs font-bold text-neutral-800">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
