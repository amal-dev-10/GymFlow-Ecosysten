'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Repeat,
  Layers,
  Ticket,
  Receipt,
  SlidersHorizontal,
  LifeBuoy,
  Users,
  History,
  Activity,
  Webhook,
  Flag,
  Settings,
  Terminal,
  Shield,
  Search,
  Command,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Plus,
  Ban,
  Menu,
  X,
  GripVertical,
  RefreshCw,
  Workflow,
} from 'lucide-react';

export const PLATFORM_VERSION = 'v0.1.0';
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 360;
const SIDEBAR_DEFAULT_WIDTH = 264;

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavGroup {
  title: string | null;
  items: NavItem[];
}

// Paths here are written WITHOUT the /platform prefix - next.config.ts sets
// basePath: '/platform', so Next.js adds it automatically everywhere.
const NAV_GROUPS: NavGroup[] = [
  { title: null, items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }] },
  { title: null, items: [{ name: 'Organizations', path: '/organizations', icon: Building2 }] },
  {
    title: 'Commercial',
    items: [
      { name: 'Subscriptions', path: '/commercial/subscriptions', icon: Repeat },
      { name: 'Plans', path: '/commercial/plans', icon: Layers },
      { name: 'Feature & Limit Engine', path: '/commercial/feature-engine', icon: SlidersHorizontal },
      { name: 'Coupons', path: '/commercial/coupons', icon: Ticket },
      { name: 'Revenue & Billing', path: '/commercial/billing', icon: Receipt },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Support Center', path: '/operations/support', icon: LifeBuoy },
      { name: 'Platform Users', path: '/operations/platform-users', icon: Users },
      { name: 'Notifications Center', path: '/operations/notifications', icon: Bell },
      { name: 'Audit Center', path: '/operations/audit-logs', icon: History },
    ],
  },
  {
    title: 'Security',
    items: [
      { name: 'Roles & Permissions', path: '/security/roles-permissions', icon: Shield },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { name: 'Monitoring', path: '/infrastructure/monitoring', icon: Activity },
      { name: 'API Management', path: '/infrastructure/api-management', icon: Webhook },
      { name: 'Feature Flags', path: '/infrastructure/feature-flags', icon: Flag },
      { name: 'Automation & Jobs', path: '/infrastructure/automation', icon: Workflow },
      { name: 'Global Settings', path: '/infrastructure/global-settings', icon: Settings },
      { name: 'Developer Tools', path: '/infrastructure/developer-tools', icon: Terminal },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const SEARCH_CATEGORIES = ['Organizations', 'Subscriptions', 'Invoices', 'Platform Users', 'Support Tickets', 'Audit Center', 'Feature Flags', 'Feature & Limit Engine', 'Roles & Permissions'];

const NOTIFICATION_CATEGORIES = [
  'Platform Alerts',
  'Organization Events',
  'Failed Payments',
  'Critical Errors',
  'Support Tickets',
  'Security Alerts',
  'Deployments',
];

export default function PlatformAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resizing, setResizing] = useState(false);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  // --- Auth guard: this app has its own login, separate from apps/web ---
  useEffect(() => {
    const token = localStorage.getItem('platform_token');
    if (!token) {
      router.push('/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  // --- Mount + persisted sidebar width ---
  useEffect(() => {
    setMounted(true);
    const savedWidth = localStorage.getItem('platform_sidebar_width');
    if (savedWidth) setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parseInt(savedWidth, 10))));
    const savedCollapsed = localStorage.getItem('platform_sidebar_collapsed');
    if (savedCollapsed) setSidebarCollapsed(savedCollapsed === 'true');

    const userStr = localStorage.getItem('platform_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.fullName || u.name || 'Platform Admin');
        setUserEmail(u.email || u.phoneNumber || '');
      } catch {
        setUserName('Platform Admin');
      }
    }
  }, []);

  // --- Sidebar resize handling ---
  const handleResizeStart = useCallback(() => {
    setResizing(true);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, e.clientX));
      setSidebarWidth(next);
    };
    const handleMouseUp = () => {
      setResizing(false);
      setSidebarWidth((w) => {
        localStorage.setItem('platform_sidebar_width', String(w));
        return w;
      });
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('platform_sidebar_collapsed', String(!prev));
      return !prev;
    });
  };

  // --- Keyboard shortcuts: Cmd/Ctrl+K command palette, Cmd/Ctrl+/ search ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((p) => !p);
        setSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setSearchOpen((p) => !p);
        setCommandPaletteOpen(false);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (commandPaletteOpen) setTimeout(() => commandInputRef.current?.focus(), 50);
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  // --- Click-outside-to-close for dropdowns ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchOpen && searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (notificationsOpen && notificationsRef.current && !notificationsRef.current.contains(target)) setNotificationsOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
      if (quickActionsOpen && quickActionsRef.current && !quickActionsRef.current.contains(target)) setQuickActionsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen, notificationsOpen, profileOpen, quickActionsOpen]);

  // Close mobile menu / overlays on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setCommandPaletteOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    localStorage.removeItem('platform_token');
    localStorage.removeItem('platform_refreshToken');
    localStorage.removeItem('platform_user');
    router.push('/login');
  };

  const commandActions = [
    { label: 'Create Organization', icon: Plus, action: () => router.push('/organizations?action=create') },
    { label: 'Suspend Organization', icon: Ban, action: () => router.push('/organizations?action=suspend') },
    { label: 'Search Organizations', icon: Search, action: () => router.push('/organizations') },
    { label: 'Open Monitoring', icon: Activity, action: () => router.push('/infrastructure/monitoring') },
    { label: 'Open Billing', icon: Receipt, action: () => router.push('/commercial/billing') },
    { label: 'Open Support', icon: LifeBuoy, action: () => router.push('/operations/support') },
  ];
  const filteredCommands = commandActions.filter((c) => c.label.toLowerCase().includes(commandQuery.toLowerCase()));

  const quickActions = [
    { label: 'Create Organization', icon: Plus, path: '/organizations?action=create' },
    { label: 'Create Plan', icon: Layers, path: '/commercial/plans?action=create' },
    { label: 'View Monitoring', icon: Activity, path: '/infrastructure/monitoring' },
    { label: 'Support Center', icon: LifeBuoy, path: '/operations/support' },
    { label: 'Platform Settings', icon: Settings, path: '/infrastructure/global-settings' },
  ];

  // --- Breadcrumbs derived from the nav config + current path ---
  const activeItem = ALL_NAV_ITEMS.find((i) => i.path === pathname) ||
    [...ALL_NAV_ITEMS].filter((i) => i.path !== '/').sort((a, b) => b.path.length - a.path.length).find((i) => pathname.startsWith(i.path));
  const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.name === activeItem?.name));
  const breadcrumbs = [
    { label: 'Platform', path: '/' },
    ...(activeGroup?.title ? [{ label: activeGroup.title, path: undefined }] : []),
    ...(activeItem && activeItem.path !== '/' ? [{ label: activeItem.name, path: activeItem.path }] : []),
  ];

  const environment = process.env.NODE_ENV === 'production' ? 'Production' : 'Development';

  if (!mounted || !authChecked) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-500" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] h-[100vh] w-[100vw] text-slate-100 font-sans flex overflow-hidden">
      {/* ============================== SIDEBAR (desktop) ============================== */}
      <aside
        style={{ width: sidebarCollapsed ? 72 : sidebarWidth }}
        className="hidden md:flex flex-col border-r border-slate-900 bg-[#080d19]/95 backdrop-blur-md relative shrink-0 transition-[width] duration-150"
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-slate-900/80 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0">
            GF
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <span className="block text-xs font-black text-white leading-tight truncate">GymFlow</span>
              <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Platform Admin</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.title && !sidebarCollapsed && (
                <p className="px-2.5 mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                  return (
                    <button
                      key={item.path}
                      onClick={() => router.push(item.path)}
                      title={sidebarCollapsed ? item.name : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${sidebarCollapsed ? 'justify-center' : ''
                        } ${isActive ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 border border-transparent hover:bg-slate-900/60 hover:text-slate-200'}`}
                    >
                      <item.icon size={15} className="shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-slate-900/80 shrink-0">
          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-300 hover:bg-slate-900/60 transition-colors cursor-pointer"
          >
            <ChevronRight size={13} className={`transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Resize handle */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={handleResizeStart}
            className="hidden md:flex items-center justify-center absolute top-0 right-0 h-full w-1.5 cursor-col-resize group z-10"
          >
            <div className={`h-full w-px bg-slate-900 group-hover:bg-indigo-500/50 transition-colors ${resizing ? 'bg-indigo-500' : ''}`} />
            <GripVertical size={10} className="absolute text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </aside>

      {/* ============================== MOBILE SIDEBAR DRAWER ============================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] flex md:hidden">
          <div className="fixed inset-0 bg-[#07090e]/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-[#080d19] border-r border-slate-900 flex flex-col animate-slide-in-left">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">GF</div>
                <span className="text-xs font-black text-white">Platform Admin</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
              {NAV_GROUPS.map((group, gi) => (
                <div key={gi}>
                  {group.title && <p className="px-2.5 mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">{group.title}</p>}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                      return (
                        <button
                          key={item.path}
                          onClick={() => router.push(item.path)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-900/60'
                            }`}
                        >
                          <item.icon size={15} />
                          <span>{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ============================== MAIN COLUMN ============================== */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* ---------- TOP NAVIGATION ---------- */}
        <header className="h-16 shrink-0 sticky top-0 z-[60] border-b border-slate-900 bg-[#07090e]/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white">
              <Menu size={18} />
            </button>

            {/* Global Search trigger */}
            <div className="relative" ref={searchRef}>
              <button
                onClick={() => setSearchOpen((p) => !p)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl text-xs text-slate-500 hover:text-slate-300 transition-colors w-56"
              >
                <Search size={13} />
                <span className="flex-1 text-left">Search platform...</span>
                <kbd className="text-[9px] font-bold border border-slate-800 rounded px-1.5 py-0.5 text-slate-600">⌘/</kbd>
              </button>
              <button onClick={() => setSearchOpen((p) => !p)} className="sm:hidden p-2 text-slate-400 hover:text-white">
                <Search size={16} />
              </button>

              {searchOpen && (
                <div className="absolute left-0 mt-2 w-[26rem] max-w-[90vw] rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-[70] animate-fade-in overflow-hidden">
                  <div className="p-3 border-b border-slate-850 flex items-center gap-2.5">
                    <Search size={14} className="text-slate-500 shrink-0" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search organizations, subscriptions, invoices..."
                      className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-600 outline-none"
                    />
                  </div>
                  <div className="p-3 max-h-72 overflow-y-auto scrollbar-thin">
                    <p className="px-1 pb-2 text-[9px] font-bold uppercase tracking-wider text-slate-600">Search Scope</p>
                    <div className="flex flex-wrap gap-1.5 px-1 pb-3">
                      {SEARCH_CATEGORIES.map((cat) => (
                        <span key={cat} className="text-[9px] font-semibold text-slate-400 bg-slate-900 border border-slate-850 px-2 py-1 rounded-full">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="px-1 py-6 text-center border-t border-slate-900/60">
                      <p className="text-[11px] text-slate-500">
                        {searchQuery ? `No results for "${searchQuery}" yet.` : 'Start typing to search across the platform.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Command Palette trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-2 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
              title="Command Palette"
            >
              <Command size={13} />
              <kbd className="text-[9px] border border-slate-800 rounded px-1.5 py-0.5">⌘K</kbd>
            </button>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium min-w-0 ml-1">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={11} className="text-slate-700 shrink-0" />}
                  {crumb.path ? (
                    <button onClick={() => router.push(crumb.path!)} className="hover:text-slate-300 transition-colors truncate">
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-slate-600 truncate">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Environment indicator */}
            <span
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${environment === 'Production'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${environment === 'Production' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              {environment}
            </span>

            {/* Platform version */}
            <span className="hidden lg:inline-flex items-center px-2 py-1.5 rounded-lg text-[9px] font-bold text-slate-500 bg-slate-950 border border-slate-900">
              {PLATFORM_VERSION}
            </span>

            {/* Quick Actions */}
            <div className="relative" ref={quickActionsRef}>
              <button
                onClick={() => setQuickActionsOpen((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 rounded-xl text-[10px] font-bold text-indigo-300 transition-colors"
              >
                <Plus size={13} />
                <span className="hidden sm:inline">Quick Actions</span>
                <ChevronDown size={11} />
              </button>
              {quickActionsOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-[70] p-1.5 animate-fade-in">
                  {quickActions.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => {
                        setQuickActionsOpen(false);
                        router.push(qa.path);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                    >
                      <qa.icon size={14} className="text-indigo-400" />
                      {qa.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen((p) => !p)}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-white transition-colors relative"
              >
                <Bell size={14} />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-[70] animate-fade-in overflow-hidden">
                  <div className="p-4 border-b border-slate-850">
                    <span className="text-xs font-black text-white">Notification Center</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
                    {NOTIFICATION_CATEGORIES.map((cat) => (
                      <div key={cat} className="px-2 py-2.5 border-b border-slate-900/60 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-300">{cat}</span>
                          <span className="text-[9px] text-slate-600">0</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-950/60 border-t border-slate-850 text-center">
                    <span className="text-[10px] text-slate-500">No alerts right now. All systems normal.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 transition-colors"
              >
                {(userName || 'P').substring(0, 1).toUpperCase()}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-[70] p-2 animate-fade-in">
                  <div className="px-3 py-2 border-b border-slate-850 mb-1">
                    <span className="block text-xs font-bold text-slate-100 truncate">{userName || 'Platform Admin'}</span>
                    {userEmail && <span className="block text-[10px] text-slate-500 truncate mt-0.5">{userEmail}</span>}
                  </div>
                  <button
                    onClick={() => router.push('/infrastructure/global-settings')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                  >
                    <User size={14} />
                    Profile & Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ---------- PAGE CONTENT CONTAINER ---------- */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <Suspense
              fallback={
                <div className="space-y-6 animate-pulse">
                  <div className="h-6 w-48 bg-slate-900 rounded-lg" />
                  <div className="h-32 bg-slate-900/60 border border-slate-900 rounded-2xl" />
                </div>
              }
            >
              {children}
            </Suspense>
          </div>
        </main>
      </div>

      {/* ============================== COMMAND PALETTE ============================== */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-[#07090e]/80 backdrop-blur-sm animate-fade-in">
          <div className="fixed inset-0" onClick={() => setCommandPaletteOpen(false)} />
          <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
            <div className="p-4 border-b border-slate-850 flex items-center gap-3">
              <Command className="text-slate-500 shrink-0" size={16} />
              <input
                ref={commandInputRef}
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Type a command..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-600 outline-none"
              />
              <button onClick={() => setCommandPaletteOpen(false)} className="px-2 py-0.5 rounded border border-slate-800 text-[10px] text-slate-500 hover:text-white">
                ESC
              </button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto scrollbar-thin">
              {filteredCommands.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No matching commands.</p>
              ) : (
                <div className="space-y-0.5">
                  {filteredCommands.map((cmd) => (
                    <button
                      key={cmd.label}
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        setCommandQuery('');
                        cmd.action();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-900 text-left transition-colors text-xs"
                    >
                      <cmd.icon size={14} className="text-indigo-400 shrink-0" />
                      <span className="text-slate-200 font-medium">{cmd.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3.5 bg-slate-950/70 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-500">
              <div className="flex gap-3">
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
              </div>
              <span>Press ⌘K to dismiss</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
