'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Users,
  DollarSign,
  TrendingUp,
  Building2,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Dumbbell,
  Apple,
  MapPin,
  Award,
  ChevronDown,
  Star,
  Lock,
  History,
  QrCode,
  CreditCard,
  Grid,
  Mail,
  Phone,
  Play,
  Smartphone,
} from 'lucide-react';
import { plansApi } from '../lib/api';
import { API_BASE_URL } from '../lib/api/client';
import { mapPublicPlansToPricingTiers, type PricingTier, resolveAssetUrl } from '../lib/api/mappers';
import { useBrand } from '../hooks/useBrand';

interface MobileAppConfig {
  enabled: boolean;
  headline: string;
  subtitle: string;
  features: string[];
  playStoreUrl: string;
  appStoreUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Scroll-reveal wrapper — fades + slides sections up as they enter the
// viewport. Cheap IntersectionObserver, disconnects after first trigger.
// ─────────────────────────────────────────────────────────────────────────
function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'span';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as any}
      className={`reveal ${visible ? 'in-view' : ''} ${className}`}
      style={{ animationDelay: visible ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Animated count-up stat — starts counting once scrolled into view.
// ─────────────────────────────────────────────────────────────────────────
function AnimatedStat({ value, decimals = 0, prefix = '', suffix = '', label }: { value: number; decimals?: number; prefix?: string; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 1400;
    let startTime: number | null = null;
    let frame: number;
    const step = (ts: number) => {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [started, value]);

  const formatted = display.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div ref={ref}>
      <div className="text-3xl sm:text-4xl font-black text-primary">
        {prefix}{formatted}{suffix}
      </div>
      <p className="text-xs text-neutral-600 font-medium uppercase tracking-wider mt-2">{label}</p>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'owner' | 'branch' | 'trainer'>('owner');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [appConfig, setAppConfig] = useState<MobileAppConfig | null>(null);

  const { brand, logoUrl: brandLogoUrl, faviconUrl, initials: brandInitials } = useBrand();

  // Platform-admin configurable "Get the app" content (public endpoint).
  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/v1/platform/settings-public/mobile-app`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (active && data) setAppConfig(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) setIsAuthenticated(true);
    }
    // Trigger the hero's entrance animation a beat after mount.
    const t = setTimeout(() => setHeroLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const faviconUrl = resolveAssetUrl(brand.faviconUrl);
    if (!faviconUrl || typeof document === 'undefined') return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [brand.faviconUrl]);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#solutions', label: 'Solutions' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '#faq', label: 'FAQ' },
  ];

  const features = [
    { icon: Users, title: 'Member Management', desc: 'Complete member profiles with contact details, home branch, membership history, and physical measurements — all searchable in one directory.' },
    { icon: Award, title: 'Membership Plans & Billing', desc: 'Sell, freeze, reactivate, and transfer memberships across branches. Automated expiry tracking keeps renewals from slipping through the cracks.' },
    { icon: QrCode, title: 'Attendance & Check-In Terminal', desc: 'A dedicated reception terminal for QR, RFID, and manual check-ins, with live occupancy tracking and instant access-denied resolution flows.' },
    { icon: Building2, title: 'Multi-Branch Operations', desc: 'Run every location from one dashboard. Switch between an organization-wide view and any single branch without losing context.' },
    { icon: DollarSign, title: 'Billing, Invoices & Expenses', desc: 'Track invoices, payment status, and branch-level expenses in one ledger, with revenue trends rolled up to the organization level.' },
    { icon: Dumbbell, title: 'Training Studio', desc: 'Build a shared exercise library, assemble workout programs, and track sessions and adherence for every member a trainer coaches.' },
    { icon: Apple, title: 'Diet & Nutrition Plans', desc: 'Give dietitians a dedicated workspace to build and assign nutrition plans alongside the training programs your coaches run.' },
    { icon: Lock, title: 'Roles & Granular Permissions', desc: 'Go beyond fixed job titles — assign fine-grained permissions per module and branch, so staff only see what their role needs.' },
    { icon: History, title: 'Audit Logs & Compliance', desc: 'Every login, permission change, and sensitive action is recorded with a searchable audit trail for security-conscious operators.' },
  ];

  const fallbackPricingTiers: PricingTier[] = [
    {
      id: 'essential',
      name: 'Essential',
      price: '$49',
      period: '/mo',
      tagline: 'Perfect for new gyms and non-technical staff.',
      cta: 'Start Free Trial',
      featured: false,
      badgeText: null,
      trialDays: 14,
      features: [
        'Dashboard & Quick Actions',
        'Member Profiles & Attendance',
        'Simple Memberships (Purchase/Renew)',
        'Payment Collection',
        'Basic Staff Management',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$129',
      period: '/mo',
      tagline: 'For growing gyms with operational managers.',
      cta: 'Start Free Trial',
      featured: true,
      badgeText: 'Most Popular',
      trialDays: 14,
      features: [
        'Everything in Essential',
        'Membership Freeze & Transfers',
        'Workouts & Diet Plans',
        'Expense Tracking',
        'Branch Capacity & Notifications',
      ],
    },
    {
      id: 'expert',
      name: 'Expert',
      price: 'Custom',
      period: '',
      tagline: 'Complete control for multi-branch chains.',
      cta: 'Contact Sales',
      featured: false,
      badgeText: null,
      trialDays: 0,
      features: [
        'Everything in Professional',
        'Membership Validation Engine',
        'Attendance Rules Automation',
        'API & Webhook Integrations',
        'Custom Roles & Audit Logs',
      ],
    },
  ];

  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(fallbackPricingTiers);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rawPlans = await plansApi.listPublic();
        if (!cancelled && Array.isArray(rawPlans) && rawPlans.length > 0) {
          setPricingTiers(mapPublicPlansToPricingTiers(rawPlans));
        }
      } catch {
        // Public plans endpoint unreachable — keep the fallback tiers.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pricingGridColsClass =
    pricingTiers.length >= 4 ? 'md:grid-cols-4' : pricingTiers.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';

  const testimonials = [
    {
      name: 'Marcus Vance',
      role: 'Owner, Legacy Fitness Chains (5 Locations)',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
      content: 'Switching to GymFlow cut our admin workload dramatically. Managing five branches, comparing performance, and keeping billing straight is finally simple from one dashboard.',
    },
    {
      name: 'Sarah Jenkins',
      role: 'Owner, Sol Yoga & Pilates Studio',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150',
      content: 'The membership and billing tools replaced a pile of spreadsheets overnight. Freezing a membership or catching an expiring renewal now takes seconds, not a phone call.',
    },
    {
      name: 'David Cho',
      role: 'Founder, Apex CrossFit Box',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
      content: 'Our coaches build every program in the Training Studio now — one exercise library, one place to assign workouts, and a clear view of who is actually showing up.',
    },
  ];

  const faqItems = [
    { q: 'How does the free trial work?', a: 'You get full, unrestricted access to GymFlow for 14 days. No credit card is required. You can set up your organization, configure branches, add members, and test the billing engine. We\'ll notify you 3 days before your trial expires.' },
    { q: 'Can I manage multiple gyms?', a: 'Yes. GymFlow is built for multi-branch operations from the ground up. Switch between an organization-wide dashboard and any individual branch, compare performance across locations, and manage every membership plan centrally.' },
    { q: 'Can trainers and staff access the system?', a: 'Yes. Invite staff with role-based permissions scoped to exactly what they need — receptionists handle check-ins and billing, trainers work in the Training Studio, and owners see everything across every branch.' },
    { q: 'Does GymFlow support attendance tracking?', a: 'Yes. The reception terminal supports QR, RFID, and manual member-search check-ins, with a live view of who is currently inside, automatic denial handling for expired or frozen memberships, and full attendance history and analytics.' },
    { q: 'Can I generate invoices and track expenses?', a: 'Yes. GymFlow tracks membership billing, invoice status, and branch-level expenses in one place, with revenue and payment trends rolled up into your dashboard.' },
    { q: 'Is GymFlow mobile-friendly?', a: 'Yes. GymFlow is a fully responsive web application, so owners, managers, and staff can run the reception terminal, review dashboards, and manage members from any device with a browser.' },
  ];

  const stats = [
    { value: 10000, suffix: '+', label: 'Members Managed' },
    { value: 500, suffix: '+', label: 'Active Gyms' },
    { value: 99.9, suffix: '%', decimals: 1, label: 'System Uptime' },
    { value: 4.9, suffix: '/5', decimals: 1, label: 'Customer Rating' },
  ];

  const steps = [
    { title: 'Create Account', desc: 'Sign up and launch your owner profile in under a minute.' },
    { title: 'Create Organization', desc: 'Add your brand details, logo, currency, and business type.' },
    { title: 'Add Gym Branches', desc: 'Register each location with its own address and contact details.' },
    { title: 'Add Members & Staff', desc: 'Invite your team with role-based access and onboard members.' },
    { title: 'Start Managing', desc: 'Track revenue, attendance, and renewals from day one.' },
  ];

  return (
    <div className="min-h-screen bg-background text-neutral-900 selection:bg-primary-light selection:text-primary font-sans overflow-x-hidden">

      {/* Ambient background blobs — slow, subtle, marketing-page-only motion */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary-light/60 blur-[120px] animate-blob-drift" />
        <div className="absolute top-[20%] right-[-10%] w-[420px] h-[420px] rounded-full bg-success-light/50 blur-[120px] animate-blob-drift" style={{ animationDelay: '4s' }} />
      </div>

      {/* HEADER */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-background/90 backdrop-blur-md border-b border-neutral-200/80 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt={brand.platformName}
                className="h-11 w-auto max-w-[64px] object-contain group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform duration-200"
                style={{ backgroundColor: brand.primaryColor }}
              >
                {brandInitials}
              </div>
            )}
            <span className="font-extrabold text-2xl tracking-tight text-neutral-900">
              {brand.platformName}
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="relative text-sm font-medium text-neutral-700 hover:text-primary transition-colors group/nav">
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full transition-all duration-300 group-hover/nav:w-full" />
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href={isAuthenticated ? '/organizations' : '/auth?mode=login'} className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition-colors">
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </a>
            <a href="#contact" className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition-colors">
              Book Demo
            </a>
            <a href={isAuthenticated ? '/organizations' : '/auth'} className="px-5 py-2.5 rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-hover hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 active:scale-[0.98] transition-all">
              {isAuthenticated ? 'Go to App' : 'Start Free Trial'}
            </a>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 transition-colors">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-neutral-200 px-6 py-8 flex flex-col gap-6 animate-fade-in">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-neutral-800 hover:text-primary">{link.label}</a>
            ))}
            <hr className="border-neutral-200" />
            <div className="flex flex-col gap-4">
              <a href={isAuthenticated ? '/organizations' : '/auth?mode=login'} onClick={() => setMobileMenuOpen(false)} className="py-3 text-center text-sm font-semibold text-neutral-700 hover:text-neutral-900 border border-neutral-200 rounded-xl">
                {isAuthenticated ? 'Dashboard' : 'Sign In'}
              </a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="py-3 text-center text-sm font-semibold text-neutral-700 hover:text-neutral-900 border border-neutral-200 rounded-xl">
                Book Demo
              </a>
              <a href={isAuthenticated ? '/organizations' : '/auth'} onClick={() => setMobileMenuOpen(false)} className="py-3 text-center text-sm font-bold text-white bg-primary rounded-xl shadow-sm">
                {isAuthenticated ? 'Go to App' : 'Start Free Trial'}
              </a>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-6 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          <div className={`lg:col-span-5 flex flex-col gap-6 text-center lg:text-left transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light border border-primary/10 text-xs font-semibold text-primary mx-auto lg:mx-0 w-fit">
              <Sparkles size={14} />
              <span>Multi-Tenant Enterprise Gym Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-900 leading-[1.1]">
              Run Your Entire Fitness Business From <span className="text-primary">One Platform</span>
            </h1>

            <p className="text-lg text-neutral-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Members, memberships, attendance, billing, training, and every branch — GymFlow replaces the spreadsheets and disconnected tools with one system built for gyms that operate more than one location.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-2">
              <a href={isAuthenticated ? '/organizations' : '/auth'} className="px-8 py-4 rounded-xl bg-primary text-base font-bold text-white shadow-sm hover:bg-primary-hover hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 active:scale-[0.98] transition-all">
                {isAuthenticated ? 'Go to App Dashboard' : 'Start Free Trial'}
              </a>
              <a href="#contact" className="px-8 py-4 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200 text-base font-bold text-neutral-800 hover:text-neutral-900 hover:border-neutral-300 active:scale-[0.98] transition-all">
                Book Live Demo
              </a>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-6 mt-6 text-xs font-medium text-neutral-600">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> No Credit Card Required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> 14-Day Free Trial</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> Setup in Minutes</span>
            </div>
          </div>

          {/* Right Dashboard Mockup Column */}
          <div className={`lg:col-span-7 relative transition-all duration-700 delay-150 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="absolute inset-0 bg-primary-light rounded-2xl blur-3xl -z-10" />
            <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-[var(--shadow-card)] p-6 overflow-hidden animate-float-y">

              <div className="flex items-center justify-between pb-6 border-b border-neutral-200/60 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-danger" />
                    <span className="w-3 h-3 rounded-full bg-warning" />
                    <span className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-500">GymFlow HQ Dashboard</span>
                </div>
                <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700">
                  <Grid size={14} />
                  <span>All Branches</span>
                  <ChevronDown size={12} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <div className="flex items-center justify-between text-neutral-500 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Revenue (MTD)</span>
                    <DollarSign size={14} className="text-primary" />
                  </div>
                  <div className="text-lg font-black text-neutral-900">$48,250</div>
                  <div className="text-[10px] font-medium text-success flex items-center gap-0.5 mt-1">
                    <TrendingUp size={10} /> +12.3%
                  </div>
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <div className="flex items-center justify-between text-neutral-500 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Active Members</span>
                    <Users size={14} className="text-primary" />
                  </div>
                  <div className="text-lg font-black text-neutral-900">1,842</div>
                  <div className="text-[10px] font-medium text-success flex items-center gap-0.5 mt-1">
                    <TrendingUp size={10} /> +4.7%
                  </div>
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <div className="flex items-center justify-between text-neutral-500 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Attendance Today</span>
                    <Activity size={14} className="text-primary" />
                  </div>
                  <div className="text-lg font-black text-neutral-900">342</div>
                  <div className="text-[10px] font-medium text-neutral-500 mt-1">Peak hours: 5 PM</div>
                </div>

                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <div className="flex items-center justify-between text-neutral-500 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Renewals Due</span>
                    <Clock size={14} className="text-primary" />
                  </div>
                  <div className="text-lg font-black text-neutral-900">28</div>
                  <div className="text-[10px] font-medium text-amber-700 mt-1">Action required</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex flex-col justify-between min-h-[200px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-700">Revenue Growth Overview</span>
                    <span className="text-[10px] text-neutral-500">Last 6 Months</span>
                  </div>
                  <div className="flex items-end gap-3 h-28 pt-4">
                    {[40, 55, 50, 70, 85, 100].map((h, i) => (
                      <div key={i} className={`w-full rounded-t-md relative transition-all duration-700 ${i === 5 ? 'bg-primary' : 'bg-neutral-200'}`} style={{ height: heroLoaded ? `${h}%` : '4%' }}>
                        {i === 5 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white border border-neutral-200 px-1.5 py-0.5 rounded text-[8px] text-primary font-bold whitespace-nowrap">$48.2K</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-neutral-400 px-1 mt-2">
                    <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                  </div>
                </div>

                <div className="md:col-span-5 bg-neutral-50 p-4 rounded-xl border border-neutral-100 flex flex-col">
                  <span className="text-xs font-bold text-neutral-700 mb-3 block">Live Check-ins</span>
                  <div className="flex flex-col gap-2.5 overflow-y-hidden max-h-[160px]">
                    {[
                      { i: 'JD', name: 'John Doe', sub: 'Premium Member', tag: 'QR Verified', tone: 'success' },
                      { i: 'JS', name: 'Jane Smith', sub: 'Branch B Transfer', tag: 'QR Verified', tone: 'success' },
                      { i: 'AM', name: 'Alex Miller', sub: 'Standard Plan', tag: 'Manual', tone: 'warning' },
                    ].map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-white border border-neutral-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-[10px] text-primary font-black">{row.i}</div>
                          <div>
                            <div className="text-[11px] font-bold text-neutral-800">{row.name}</div>
                            <div className="text-[9px] text-neutral-500">{row.sub}</div>
                          </div>
                        </div>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${row.tone === 'success' ? 'text-success bg-success-light' : 'text-amber-700 bg-warning-light'}`}>{row.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* TRUSTED BY */}
      <Reveal as="span" className="block">
        <section className="py-12 border-y border-neutral-100/80 bg-neutral-50/40 relative z-10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col gap-6 items-center">
            <p className="text-xs uppercase font-extrabold tracking-widest text-neutral-500 text-center">
              Trusted by Growing Fitness Businesses
            </p>
            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 opacity-40">
              <span className="text-xl font-black text-neutral-600 tracking-wider">POWERFIT</span>
              <span className="text-xl font-black text-neutral-600 tracking-wider">IRONHQ</span>
              <span className="text-xl font-black text-neutral-600 tracking-wider">ZENYOGA</span>
              <span className="text-xl font-black text-neutral-600 tracking-wider">CRUXFIT</span>
              <span className="text-xl font-black text-neutral-600 tracking-wider">MMAONE</span>
            </div>
          </div>
        </section>
      </Reveal>

      {/* PROBLEM SECTION */}
      <section className="py-24 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col gap-16">
          <Reveal className="text-center max-w-3xl mx-auto flex flex-col gap-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Managing a gym shouldn't require 10 different tools.
            </h2>
            <p className="text-base text-neutral-600">
              Fragmented spreadsheets and disconnected apps lead to billing errors, missed renewals, and hours of manual reconciliation. GymFlow unifies it into one system.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Reveal delay={0} className="bg-neutral-50/60 border border-neutral-100 p-8 rounded-2xl flex flex-col gap-6">
              <div className="flex items-center gap-3 text-danger">
                <XCircle size={24} />
                <span className="font-extrabold text-lg">The Fragmented Mess</span>
              </div>
              <ul className="flex flex-col gap-4 text-neutral-600 text-sm">
                <li className="flex items-start gap-3"><span className="text-danger font-bold mt-0.5">•</span> Member details scattered across spreadsheets and paper forms</li>
                <li className="flex items-start gap-3"><span className="text-danger font-bold mt-0.5">•</span> Manual reception check-ins with no record of who's actually inside</li>
                <li className="flex items-start gap-3"><span className="text-danger font-bold mt-0.5">•</span> Renewals and freezes tracked by memory instead of automation</li>
                <li className="flex items-start gap-3"><span className="text-danger font-bold mt-0.5">•</span> Separate tools for workouts, diets, and billing that don't talk to each other</li>
                <li className="flex items-start gap-3"><span className="text-danger font-bold mt-0.5">•</span> No unified view across branches when you open a second location</li>
              </ul>
            </Reveal>

            <Reveal delay={120} className="bg-primary-light border border-primary/20 p-8 rounded-2xl flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-3 text-primary">
                <CheckCircle2 size={24} />
                <span className="font-extrabold text-lg">Unified GymFlow System</span>
              </div>
              <ul className="flex flex-col gap-4 text-neutral-700 text-sm">
                <li className="flex items-start gap-3"><span className="text-primary font-bold mt-0.5">✓</span> One directory for every member profile, plan, and visit history</li>
                <li className="flex items-start gap-3"><span className="text-primary font-bold mt-0.5">✓</span> A dedicated check-in terminal with live occupancy and instant resolution</li>
                <li className="flex items-start gap-3"><span className="text-primary font-bold mt-0.5">✓</span> Automated expiry tracking, freezes, and renewal reminders</li>
                <li className="flex items-start gap-3"><span className="text-primary font-bold mt-0.5">✓</span> Training, diet plans, and billing managed from the same workspace</li>
                <li className="flex items-start gap-3"><span className="text-primary font-bold mt-0.5">✓</span> One dashboard for the whole organization, or any single branch</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 bg-neutral-50/40 border-y border-neutral-100 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col gap-16">
          <Reveal className="text-center max-w-3xl mx-auto flex flex-col gap-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Everything You Need To Run Your Fitness Business
            </h2>
            <p className="text-base text-neutral-600">
              Every module below is built into GymFlow today — from the front desk to the boardroom.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl hover:border-primary/30 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 group h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <f.icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD SHOWCASE */}
      <section id="solutions" className="py-24 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">

          <Reveal className="text-center max-w-3xl mx-auto flex flex-col gap-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Tailored Dashboards for Every Role
            </h2>
            <p className="text-base text-neutral-600">
              GymFlow gives owners, branch managers, and trainers exactly the view they need — nothing more, nothing less.
            </p>
          </Reveal>

          <Reveal className="flex justify-center">
            <div className="flex justify-center gap-2 p-1.5 bg-neutral-50 border border-neutral-100 rounded-2xl w-fit mx-auto mb-8">
              {([
                { id: 'owner', label: 'Owner Dashboard' },
                { id: 'branch', label: 'Branch Manager' },
                { id: 'trainer', label: 'Training Studio' },
              ] as const).map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-800'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative border border-neutral-200 bg-white rounded-2xl p-6 shadow-[var(--shadow-card)] overflow-hidden max-w-5xl mx-auto w-full min-h-[400px]">

              {activeTab === 'owner' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                    <div>
                      <h4 className="font-extrabold text-neutral-900">Organization-Wide Dashboard</h4>
                      <p className="text-xs text-neutral-500">Cross-branch analytics with one click into any single location</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-primary-light border border-primary/20 text-primary rounded-md">Owner</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                      <span className="text-xs text-neutral-500 block mb-1">Total Revenue</span>
                      <div className="text-2xl font-black text-neutral-900">$142,800</div>
                      <span className="text-[10px] text-success mt-2 block">✓ All branches synced live</span>
                    </div>
                    <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                      <span className="text-xs text-neutral-500 block mb-1">Total Members</span>
                      <div className="text-2xl font-black text-neutral-900">4,892</div>
                      <span className="text-[10px] text-success mt-2 block">↑ 18.2% growth month-over-month</span>
                    </div>
                    <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                      <span className="text-xs text-neutral-500 block mb-1">Active Staff</span>
                      <div className="text-2xl font-black text-neutral-900">82</div>
                      <span className="text-[10px] text-neutral-500 mt-2 block">Across 5 active gym locations</span>
                    </div>
                  </div>

                  <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100 mt-2">
                    <span className="text-xs font-bold text-neutral-700 block mb-3">Branch Performance Comparison</span>
                    <div className="flex flex-col gap-3">
                      {[
                        { name: 'Downtown Branch (HQ)', val: '$54,200' },
                        { name: 'Westside Studio', val: '$38,150' },
                        { name: 'Eastside CrossFit', val: '$31,400' },
                      ].map((b, i) => (
                        <div key={i} className={`flex items-center justify-between py-2 ${i < 2 ? 'border-b border-neutral-100' : ''}`}>
                          <span className="text-xs font-semibold text-neutral-700">{b.name}</span>
                          <span className="text-xs font-bold text-neutral-800">{b.val} MTD</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'branch' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                    <div>
                      <h4 className="font-extrabold text-neutral-900">Downtown Branch Dashboard</h4>
                      <p className="text-xs text-neutral-500">Live occupancy, quick views, and branch-level billing</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-primary-light border border-primary/20 text-primary rounded-md">Branch Manager</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                      <span className="text-xs font-bold text-neutral-700 block mb-4">Live Occupancy</span>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs text-neutral-600 mb-1">
                            <span>Morning Rush (7 AM – 9 AM)</span>
                            <span className="font-semibold text-neutral-800">82% Capacity</span>
                          </div>
                          <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full w-[82%]" />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-neutral-600 mb-1">
                            <span>Evening Peak (5 PM – 8 PM)</span>
                            <span className="font-semibold text-neutral-800">95% Capacity</span>
                          </div>
                          <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-warning h-full rounded-full w-[95%]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                      <span className="text-xs font-bold text-neutral-700 block mb-4">Recent Branch Invoices</span>
                      <div className="space-y-3">
                        {[
                          { label: '#INV-10984 (Premium Monthly)', status: 'Paid', tone: 'success' },
                          { label: '#INV-10983 (PT 10-Session Pack)', status: 'Paid', tone: 'success' },
                          { label: '#INV-10982 (Annual Membership)', status: 'Pending', tone: 'warning' },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-neutral-600">{row.label}</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${row.tone === 'success' ? 'text-success bg-success-light' : 'text-amber-700 bg-warning-light'}`}>{row.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'trainer' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                    <div>
                      <h4 className="font-extrabold text-neutral-900">Training Studio</h4>
                      <p className="text-xs text-neutral-500">One exercise library, shared workout programs, and session tracking</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-success-light border border-green-200 text-success rounded-md">Trainer</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Exercises', val: '13' },
                      { label: 'Workout Templates', val: '24' },
                      { label: 'Workout Programs', val: '8' },
                      { label: 'Assigned Members', val: '68' },
                    ].map((kpi, i) => (
                      <div key={i} className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                        <span className="text-[10px] text-neutral-500 uppercase font-semibold block">{kpi.label}</span>
                        <div className="text-xl font-black text-neutral-900 mt-1">{kpi.val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-neutral-700">Assign Routine: Hypertrophy Split v2</span>
                      <button className="text-[10px] bg-primary text-white px-2.5 py-1 rounded-lg font-bold">Save Template</button>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { name: 'Barbell Bench Press', tag: 'Chest / Strength', sets: '4 Sets × 8 Reps' },
                        { name: 'Incline Dumbbell Flyes', tag: 'Chest / Hypertrophy', sets: '3 Sets × 12 Reps' },
                        { name: 'Cable Crossover', tag: 'Chest / Definition', sets: '3 Sets × 15 Reps' },
                      ].map((ex, i) => (
                        <div key={i} className="bg-white p-3 rounded-lg border border-neutral-200/60 flex justify-between text-xs">
                          <div>
                            <div className="font-bold text-neutral-800">{ex.name}</div>
                            <div className="text-neutral-500 text-[10px]">{ex.tag}</div>
                          </div>
                          <span className="font-semibold text-primary">{ex.sets}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </Reveal>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-neutral-50/40 border-y border-neutral-100 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col gap-16">

          <Reveal className="text-center max-w-3xl mx-auto flex flex-col gap-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Get Up and Running in Minutes
            </h2>
            <p className="text-base text-neutral-600">
              No servers to configure or complex setup wizards. This is the exact flow every new GymFlow account goes through.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
            <div className="hidden md:block absolute top-[30px] left-[10%] right-[10%] h-0.5 bg-primary/20 -z-10" />
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 100} className="flex flex-col items-center text-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-lg shadow-[var(--shadow-card)] transition-transform hover:scale-110 ${i === steps.length - 1 ? 'bg-primary text-white' : 'bg-white border-2 border-primary/20 text-neutral-900'}`}>
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-extrabold text-neutral-900 mb-1">{step.title}</h4>
                  <p className={`text-xs ${i === steps.length - 1 ? 'text-neutral-700 font-semibold' : 'text-neutral-600'}`}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* MULTI BRANCH SECTION */}
      <section className="py-24 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          <Reveal className="flex flex-col gap-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight leading-[1.2]">
              Manage Multiple Gyms From One Dashboard
            </h2>
            <p className="text-base text-neutral-600">
              GymFlow is built for multi-tenant organizations from day one — add a second, third, or tenth branch without changing how you work.
            </p>

            <div className="space-y-4">
              {[
                { title: 'Centralized operations', desc: 'Manage membership plans, billing, and organization-wide roles from a single account.' },
                { title: 'One dashboard, every branch', desc: 'Switch instantly between an all-branches view and any single location without losing context.' },
                { title: 'Unified reports & comparisons', desc: 'Compare branch performance side by side with aggregate revenue and attendance dashboards.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 items-start">
                  <div className="p-1 rounded bg-primary-light text-primary mt-1">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-neutral-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150} className="relative">
            <div className="absolute inset-0 bg-primary-light rounded-2xl blur-3xl -z-10" />
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-[var(--shadow-card)]">
              <span className="text-xs font-bold text-neutral-700 block mb-4">Branch Performance Overview</span>

              <div className="space-y-4">
                {[
                  { name: 'Downtown Branch (HQ)', members: '2,410 Active Members', rev: '$34,800 MTD', primary: true },
                  { name: 'Westside Studio', members: '1,420 Active Members', rev: '$21,200 MTD', primary: false },
                  { name: 'Eastside CrossFit', members: '890 Active Members', rev: '$16,500 MTD', primary: false },
                ].map((b) => (
                  <div key={b.name} className="bg-neutral-50 p-4 rounded-lg border border-neutral-100 flex justify-between items-center hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className={b.primary ? 'text-primary' : 'text-neutral-400'} />
                      <div>
                        <div className={`text-xs font-bold ${b.primary ? 'text-neutral-900' : 'text-neutral-700'}`}>{b.name}</div>
                        <div className="text-[10px] text-neutral-500">{b.members}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${b.primary ? 'text-success' : 'text-neutral-700'}`}>{b.rev}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

        </div>
      </section>

      {/* MOBILE COMPANION APP SHOWCASE */}
      <section className="py-24 border-y border-neutral-100 bg-neutral-50/40 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left text column */}
            <Reveal className="flex flex-col gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                  GymFlow Staff App
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mt-4">
                  Run Your Entire Gym From Your Pocket
                </h2>
              </div>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Empower your front-desk operators, managers, and personal trainers with our native iOS & Android companion apps. No more running back to the reception desk to check on a member or verify a payment.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm">QR Attendance Scanner</h3>
                    <p className="text-xs text-neutral-500 mt-1">Scan member QR codes using the device camera for lightning-fast check-ins.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm">Instant Payments</h3>
                    <p className="text-xs text-neutral-500 mt-1">Collect dues, check pending bills, and record transactions right from the gym floor.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm">Member Profiles</h3>
                    <p className="text-xs text-neutral-500 mt-1">Quickly view logs, freeze memberships, log measurements, or renew packages.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm">Real-time Snapshots</h3>
                    <p className="text-xs text-neutral-500 mt-1">Monitor active occupancy, check-in stats, and collection trends in real-time.</p>
                  </div>
                </div>
              </div>

              {/* Store links */}
              <div className="flex flex-wrap gap-4 mt-4 items-center">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                  <span>Available on:</span>
                  <span className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-800">iOS (App Store)</span>
                  <span className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-800">Android (Google Play)</span>
                </div>
              </div>
            </Reveal>

            {/* Right screenshots mockup column */}
            <Reveal className="relative flex justify-center items-center h-[520px]">
              {/* Background accent glow */}
              <div className="absolute w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
              
              {/* Center principal phone screenshot */}
              <div className="absolute w-[240px] aspect-[9/19.5] rounded-[32px] overflow-hidden border-4 border-neutral-950 bg-neutral-900 shadow-2xl z-20 transform -translate-x-12 -translate-y-4 hover:scale-105 transition-transform duration-300">
                <img src="/mobile-app/dashboard.png" alt="Mobile Dashboard" className="w-full h-full object-cover" />
              </div>

              {/* Offset phone screenshot 1: Member detail */}
              <div className="absolute w-[210px] aspect-[9/19.5] rounded-[28px] overflow-hidden border-4 border-neutral-950 bg-neutral-900 shadow-xl z-30 transform translate-x-20 translate-y-12 hover:scale-105 transition-transform duration-300">
                <img src="/mobile-app/member-detail.png" alt="Member Profile" className="w-full h-full object-cover" />
              </div>

              {/* Offset phone screenshot 2: Payments */}
              <div className="absolute w-[200px] aspect-[9/19.5] rounded-[28px] overflow-hidden border-4 border-neutral-950 bg-neutral-900 shadow-lg z-10 transform -translate-x-32 translate-y-20 opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300">
                <img src="/mobile-app/payments.png" alt="Payments List" className="w-full h-full object-cover" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* GET THE APP — platform-admin configurable */}
      {appConfig?.enabled && (appConfig.playStoreUrl || appConfig.appStoreUrl) && (
        <section id="mobile-app" className="py-24 px-6 z-10 relative">
          <div className="max-w-7xl mx-auto">
            <Reveal className="grid md:grid-cols-2 gap-12 items-center">
              {/* Content */}
              <div className="flex flex-col gap-6">
                <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                  <Smartphone className="w-3.5 h-3.5" /> Mobile App
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900">
                  {appConfig.headline || 'Run your gym from your pocket'}
                </h2>
                {appConfig.subtitle && (
                  <p className="text-neutral-600 text-base leading-relaxed">{appConfig.subtitle}</p>
                )}
                {appConfig.features.length > 0 && (
                  <ul className="flex flex-col gap-3">
                    {appConfig.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-neutral-700 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {appConfig.playStoreUrl && (
                    <a
                      href={appConfig.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-lg"
                    >
                      <Play className="w-6 h-6" fill="currentColor" />
                      <span className="flex flex-col leading-tight text-left">
                        <span className="text-[10px] uppercase tracking-wide text-neutral-300">Get it on</span>
                        <span className="text-sm font-bold">Google Play</span>
                      </span>
                    </a>
                  )}
                  {appConfig.appStoreUrl && (
                    <a
                      href={appConfig.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-lg"
                    >
                      <Apple className="w-6 h-6" fill="currentColor" />
                      <span className="flex flex-col leading-tight text-left">
                        <span className="text-[10px] uppercase tracking-wide text-neutral-300">Download on the</span>
                        <span className="text-sm font-bold">App Store</span>
                      </span>
                    </a>
                  )}
                </div>
              </div>

              {/* Phone mockup */}
              <div className="hidden md:flex justify-center">
                <div className="relative w-64 h-[520px] rounded-[2.5rem] border-8 border-neutral-900 bg-neutral-900 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-neutral-900 rounded-b-2xl z-10" />
                  <div className="w-full h-full bg-gradient-to-b from-primary/10 to-white flex flex-col items-center justify-center gap-4 p-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                      <Dumbbell className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-neutral-900 font-black text-lg">{brand?.platformName || 'GymFlow'}</span>
                    <span className="text-neutral-500 text-xs">Staff App</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-neutral-50/40 border-y border-neutral-100 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col gap-16">
          <Reveal className="text-center max-w-3xl mx-auto flex flex-col gap-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Simple, Predictable Tiered Pricing
            </h2>
            <p className="text-base text-neutral-600">
              Pick the workspace tier that matches your organization today — every plan below is live on GymFlow. Upgrade anytime as you grow.
            </p>
          </Reveal>

          <div className={`grid grid-cols-1 ${pricingGridColsClass} gap-8 items-stretch`}>
            {pricingTiers.map((tier, i) => {
              const MAX_VISIBLE_FEATURES = 7;
              const visibleFeatures = tier.features.slice(0, MAX_VISIBLE_FEATURES);
              const extraFeatureCount = tier.features.length - visibleFeatures.length;

              return (
                <Reveal key={tier.id} delay={i * 100} className="h-full">
                  <div
                    className={`relative h-full flex flex-col bg-white rounded-2xl px-8 pb-8 transition-all duration-300 ${tier.featured
                      ? 'pt-10 border-2 border-primary shadow-[var(--shadow-card-hover)] md:-translate-y-2'
                      : 'pt-8 border border-neutral-200/80 hover:border-neutral-300 hover:-translate-y-1'
                      }`}
                  >
                    {tier.badgeText && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-wider shadow-sm">
                        {tier.badgeText}
                      </span>
                    )}

                    <div className="flex flex-col flex-1">
                      <h3 className={`text-lg font-extrabold tracking-tight ${tier.featured ? 'text-primary' : 'text-neutral-900'}`}>
                        {tier.name}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed min-h-[2.5em]">
                        {tier.tagline || ' '}
                      </p>

                      <div className="flex items-baseline gap-1 mt-5">
                        <span className="text-4xl font-black text-neutral-900">{tier.price}</span>
                        {tier.period && <span className="text-sm font-semibold text-neutral-500">{tier.period}</span>}
                      </div>

                      <div className="h-7 mt-2">
                        {tier.trialDays > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-success bg-success-light px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={12} className="shrink-0" /> {tier.trialDays}-day free trial
                          </span>
                        )}
                      </div>

                      <hr className="border-neutral-200/60 my-4" />

                      <ul className="space-y-3 text-xs text-neutral-700 flex-1">
                        {visibleFeatures.length > 0 ? (
                          visibleFeatures.map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-neutral-400 italic">No modules enabled on this plan yet.</li>
                        )}
                        {extraFeatureCount > 0 && (
                          <li className="pl-6 text-neutral-400 font-semibold">
                            +{extraFeatureCount} more feature{extraFeatureCount > 1 ? 's' : ''}
                          </li>
                        )}
                      </ul>
                    </div>

                    <a
                      href={tier.cta === 'Contact Sales' ? '#contact' : (isAuthenticated ? '/organizations' : '/auth')}
                      className={`mt-8 block text-center py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${tier.featured ? 'text-white bg-primary hover:bg-primary-hover shadow-sm hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)]' : 'text-neutral-800 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200'}`}
                    >
                      {isAuthenticated && tier.cta !== 'Contact Sales' ? 'Go to App Dashboard' : tier.cta}
                    </a>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 px-6 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col gap-16">
          <Reveal className="text-center max-w-3xl mx-auto flex flex-col gap-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Recommended by Industry Professionals
            </h2>
            <p className="text-base text-neutral-600">
              See how fitness business owners are scaling operations and eliminating overhead with GymFlow.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <Reveal key={t.name} delay={idx * 100}>
                <div className="bg-white border border-neutral-200/80 p-8 rounded-2xl flex flex-col justify-between gap-6 hover:border-neutral-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] transition-all duration-300 h-full">
                  <div className="flex gap-1 text-primary">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed italic">"{t.content}"</p>
                  <div className="flex items-center gap-4 mt-2">
                    <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-neutral-200" />
                    <div>
                      <div className="text-xs font-bold text-neutral-800">{t.name}</div>
                      <div className="text-[10px] text-neutral-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="py-16 bg-neutral-50/40 border-y border-neutral-100 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <Reveal key={s.label}>
              <AnimatedStat value={s.value} decimals={s.decimals || 0} suffix={s.suffix} label={s.label} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 px-6 z-10 relative">
        <div className="max-w-3xl mx-auto flex flex-col gap-12">

          <Reveal className="text-center flex flex-col gap-4">
            <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-neutral-600">
              Can't find what you're looking for? Contact our support team directly.
            </p>
          </Reveal>

          <div className="flex flex-col gap-4">
            {faqItems.map((item, idx) => (
              <Reveal key={item.q} delay={idx * 40}>
                <div className="bg-white border border-neutral-200/80 rounded-xl overflow-hidden transition-all hover:border-neutral-300">
                  <button onClick={() => setFaqOpen(faqOpen === idx ? null : idx)} className="w-full px-6 py-5 flex items-center justify-between text-left text-sm font-extrabold text-neutral-900 hover:text-primary transition-colors cursor-pointer">
                    <span>{item.q}</span>
                    <span className={`transition-transform duration-300 ${faqOpen === idx ? 'rotate-180' : ''}`}>
                      <ChevronDown size={16} />
                    </span>
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${faqOpen === idx ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="px-6 pb-5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100/60 pt-4">
                        {item.a}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* FINAL CTA */}
      <section id="trial" className="py-24 px-6 relative z-10">
        <Reveal>
          <div className="max-w-5xl mx-auto bg-primary-light border border-primary/20 rounded-3xl p-8 md:p-16 text-center flex flex-col items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-blob-drift" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-success-light rounded-full blur-3xl -z-10 animate-blob-drift" style={{ animationDelay: '5s' }} />

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-neutral-900 leading-tight">
              Ready To Grow Your Fitness Business?
            </h2>
            <p className="text-base text-neutral-600 max-w-xl">
              Start your free 14-day trial today and see how GymFlow can simplify operations across every branch you run.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full justify-center">
              <a href={isAuthenticated ? '/organizations' : '/auth'} className="px-8 py-4 rounded-xl bg-primary text-base font-bold text-white shadow-sm hover:bg-primary-hover hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 active:scale-[0.98] transition-all text-center">
                {isAuthenticated ? 'Go to App Dashboard' : 'Start Free Trial'}
              </a>
              <a href="#contact" className="px-8 py-4 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200 text-base font-bold text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 active:scale-[0.98] transition-all">
                Book Live Demo
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CONTACT / DEMO BOOKING */}
      <section id="contact" className="py-16 bg-neutral-50/40 border-t border-neutral-100 px-6 z-10 relative">
        <Reveal>
          <div className="max-w-3xl mx-auto bg-white border border-neutral-200/80 rounded-2xl p-8 shadow-[var(--shadow-card)]">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-neutral-900">Book a Live Walkthrough</h3>
              <p className="text-xs text-neutral-500 mt-2">See how {brand.platformName} scales for multi-branch organizations in real-time.</p>
              {(brand.supportEmail || brand.supportPhone) && (
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 text-xs font-semibold text-neutral-600">
                  {brand.supportEmail && (
                    <a href={`mailto:${brand.supportEmail}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Mail size={13} className="text-primary shrink-0" /> {brand.supportEmail}
                    </a>
                  )}
                  {brand.supportPhone && (
                    <a href={`tel:${brand.supportPhone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <Phone size={13} className="text-primary shrink-0" /> {brand.supportPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); alert("Thanks! We'll reach out to schedule your demo shortly."); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Full Name</label>
                  <input required type="text" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all" placeholder="Marcus Vance" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Business Name</label>
                  <input required type="text" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all" placeholder="Legacy Fitness" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Email Address</label>
                <input required type="email" className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all" placeholder="marcus@legacyfitness.com" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Total Branches</label>
                <select className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light cursor-pointer transition-all">
                  <option>1 Location</option>
                  <option>2–5 Locations</option>
                  <option>5–10 Locations</option>
                  <option>10+ Locations</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-primary text-xs font-bold text-white rounded-xl hover:bg-primary-hover hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] active:scale-[0.99] transition-all cursor-pointer">
                Submit Request
              </button>
            </form>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="bg-neutral-50 py-16 px-6 border-t border-neutral-100 z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-8">

          <div className="col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt={brand.platformName} className="h-9 w-auto max-w-[48px] object-contain" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  {brandInitials}
                </div>
              )}
              <span className="font-extrabold text-lg tracking-tight text-neutral-900">{brand.platformName}</span>
            </div>
            <p className="text-xs text-neutral-500 max-w-sm">
              The unified multi-tenant platform for scaling gym chains, studios, CrossFit boxes, and martial arts academies.
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600 block mb-4">Product</span>
            <ul className="space-y-2.5 text-xs text-neutral-500">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#solutions" className="hover:text-primary transition-colors">Solutions</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600 block mb-4">Support</span>
            <ul className="space-y-2.5 text-xs text-neutral-500">
              <li><a href="#faq" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
              {brand.supportEmail && (
                <li>
                  <a href={`mailto:${brand.supportEmail}`} className="hover:text-primary transition-colors flex items-center gap-1.5">
                    <Mail size={12} className="shrink-0" /> {brand.supportEmail}
                  </a>
                </li>
              )}
              {brand.supportPhone && (
                <li>
                  <a href={`tel:${brand.supportPhone.replace(/[^+\d]/g, '')}`} className="hover:text-primary transition-colors flex items-center gap-1.5">
                    <Phone size={12} className="shrink-0" /> {brand.supportPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600 block mb-4">Company</span>
            <ul className="space-y-2.5 text-xs text-neutral-500">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Press</a></li>
            </ul>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600 block mb-4">Legal</span>
            <ul className="space-y-2.5 text-xs text-neutral-500">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-neutral-100 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <span>&copy; {new Date().getFullYear()} {brand.platformName}. All rights reserved.</span>
          <div className="flex gap-6">
            <span className="hover:text-primary transition-colors cursor-pointer">Twitter</span>
            <span className="hover:text-primary transition-colors cursor-pointer">LinkedIn</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Instagram</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
