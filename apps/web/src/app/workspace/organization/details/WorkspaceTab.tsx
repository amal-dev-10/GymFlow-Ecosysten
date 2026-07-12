'use client';

import React, { useState, useEffect } from 'react';
import { orgApi } from '../../../../lib/api';
import { useAccessControl } from '../../../../context/access-control';
import { Tabs } from '../../../../components/ui';
import {
  Sparkles,
  Zap,
  Briefcase,
  Globe,
  Lock,
  CheckCircle,
  Activity,
  Layers,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  AlertCircle,
  Info,
  ShieldCheck,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';

const TIER_ACCENT: Record<string, { text: string; bg: string; border: string; icon: React.ElementType }> = {
  Essential: { text: 'text-success', bg: 'bg-success-light', border: 'border-green-200', icon: Zap },
  Professional: { text: 'text-primary', bg: 'bg-primary-light', border: 'border-primary/20', icon: Briefcase },
  Expert: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: Globe },
};

export default function WorkspaceTab() {
  const { userRole } = useAccessControl();
  const isOwner = userRole === 'owner';

  const [activeTab, setActiveTab] = useState<'selection' | 'roles' | 'discovery' | 'analytics'>('selection');
  const [orgId, setOrgId] = useState('');

  const [currentLevel, setCurrentLevel] = useState('Expert');
  const [previewLevel, setPreviewLevel] = useState<string | null>(null);

  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({
    advanced_analytics: false,
    membership_freeze: true,
    attendance_automation: false,
    custom_roles: false,
  });

  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({
    Manager: 'Professional',
    Receptionist: 'Essential',
    Trainer: 'Essential',
    Accountant: 'Professional',
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeOrgId = localStorage.getItem('organizationId') || '';
      setOrgId(activeOrgId);
      const stored = localStorage.getItem('workspaceTier') || 'Expert';
      setCurrentLevel(stored);
    }
  }, []);

  useEffect(() => {
    if (!orgId) return;
    orgApi.list().then(list => {
      const currentOrg = list.find(o => o.id === orgId);
      if (currentOrg && currentOrg.settings) {
        const settings = currentOrg.settings || {};
        if (settings.workspaceTier) {
          setCurrentLevel(settings.workspaceTier);
          localStorage.setItem('workspaceTier', settings.workspaceTier);
          window.dispatchEvent(new Event('workspaceTierChanged'));
        }
        if (settings.enabledFeatures) setEnabledFeatures(settings.enabledFeatures);
        if (settings.roleOverrides) setRoleOverrides(settings.roleOverrides);
      }
    }).catch(err => console.error('Failed to load org experience settings:', err));
  }, [orgId]);

  const handleConfirmChange = async () => {
    if (previewLevel && orgId) {
      try {
        const list = await orgApi.list();
        const currentOrg = list.find(o => o.id === orgId) || {};
        const oldSettings = currentOrg.settings || {};
        const newSettings = { ...oldSettings, workspaceTier: previewLevel };
        await orgApi.update(orgId, { settings: newSettings });

        setCurrentLevel(previewLevel);
        if (typeof window !== 'undefined') {
          localStorage.setItem('workspaceTier', previewLevel);
          window.dispatchEvent(new Event('workspaceTierChanged'));
        }
        setPreviewLevel(null);
        showToast(`Workspace upgraded to ${previewLevel} successfully!`);
      } catch (err) {
        showToast('Failed to update workspace tier', 'error');
      }
    }
  };

  const handleToggleFeature = async (featureId: string) => {
    const updatedFeatures = { ...enabledFeatures, [featureId]: !enabledFeatures[featureId] };
    setEnabledFeatures(updatedFeatures);

    if (orgId) {
      try {
        const list = await orgApi.list();
        const currentOrg = list.find(o => o.id === orgId) || {};
        const oldSettings = currentOrg.settings || {};
        const newSettings = { ...oldSettings, enabledFeatures: updatedFeatures };
        await orgApi.update(orgId, { settings: newSettings });
        showToast('Feature visibility updated');
      } catch (err) {
        showToast('Failed to update feature visibility', 'error');
      }
    }
  };

  const handleUpdateRoleOverride = async (roleName: string, level: string) => {
    const updatedOverrides = { ...roleOverrides, [roleName]: level };
    setRoleOverrides(updatedOverrides);

    if (orgId) {
      try {
        const list = await orgApi.list();
        const currentOrg = list.find(o => o.id === orgId) || {};
        const oldSettings = currentOrg.settings || {};
        const newSettings = { ...oldSettings, roleOverrides: updatedOverrides };
        await orgApi.update(orgId, { settings: newSettings });
        showToast(`Role override for ${roleName} updated`);
      } catch (err) {
        showToast('Failed to update role override', 'error');
      }
    }
  };

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <ShieldAlert className="w-10 h-10 text-neutral-300" />
        <p className="text-sm font-bold text-neutral-600">Workspace Experience is owner-only</p>
        <p className="text-xs text-neutral-400 max-w-xs text-center">Only the organization owner can change workspace tiers, feature visibility, and role overrides.</p>
      </div>
    );
  }

  const accent = TIER_ACCENT[currentLevel] || TIER_ACCENT.Expert;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl ${toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'}`}>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Intro row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50 p-4 border border-neutral-100 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl ${accent.bg} border ${accent.border} flex items-center justify-center shrink-0`}>
            <Sparkles className={`w-4.5 h-4.5 ${accent.text}`} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-700">Workspace Experience</h4>
            <span className="text-[10px] text-neutral-500 block mt-0.5 max-w-xl">
              Control the complexity of your GymFlow environment — tailor navigation, features, and dashboards to match your team's maturity.
            </span>
          </div>
        </div>
        <div className={`px-3.5 py-2 ${accent.bg} border ${accent.border} rounded-xl text-xs font-mono shrink-0`}>
          Current Tier: <span className={`font-bold ${accent.text}`}>{currentLevel}</span>
        </div>
      </div>

      {/* Inner sub-tabs */}
      <Tabs
        scrollable={false}
        tabs={[
          { id: 'selection', label: 'Tier Selection' },
          { id: 'roles', label: 'Role Overrides' },
          { id: 'discovery', label: 'Feature Discovery' },
          { id: 'analytics', label: 'Workspace Analytics' },
        ]}
        activeId={activeTab}
        onChange={(id) => { setActiveTab(id as any); setPreviewLevel(null); }}
      />

      {/* ═══════════════════ TAB 1: TIER SELECTION ═══════════════════ */}
      {activeTab === 'selection' && (
        <div className="space-y-6">
          {currentLevel === 'Essential' && (
            <div className="bg-primary-light border border-primary/20 p-4 rounded-2xl flex items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Activity className="text-primary w-5 h-5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">Smart Recommendation: Time to Upgrade</h4>
                  <p className="text-xs text-neutral-700 mt-0.5">Your organization just crossed 500 active members. We recommend upgrading to the <b>Professional Workspace</b> to unlock Bulk Automation and Branch Controls.</p>
                </div>
              </div>
              <button onClick={() => setPreviewLevel('Professional')} className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl whitespace-nowrap transition-colors">
                Preview Upgrade
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['Essential', 'Professional', 'Expert'] as const).map((tier) => {
              const t = TIER_ACCENT[tier];
              const Icon = t.icon;
              const isActive = currentLevel === tier;
              const desc: Record<string, string> = {
                Essential: 'Perfect for new gyms and non-technical staff. Hides complex operations.',
                Professional: 'For growing gyms with operational managers. Unlocks advanced workflows.',
                Expert: 'Complete business control. Built for enterprise and multi-branch chains.',
              };
              const features: Record<string, string[]> = {
                Essential: ['Dashboard & Quick Actions', 'Member Profiles & Attendance', 'Simple Memberships (Purchase/Renew)', 'Payment Collection', 'Basic Staff Management'],
                Professional: ['Everything in Essential', 'Membership Freeze & Transfers', 'Workouts & Diet Plans', 'Expense Tracking', 'Branch Capacity & Notifications'],
                Expert: ['Everything in Professional', 'Membership Validation Engine', 'Attendance Rules Automation', 'API & Webhook Integrations', 'Custom Roles & Audit Logs'],
              };
              return (
                <div key={tier} className={`bg-white border ${isActive ? `${t.border} shadow-[var(--shadow-card)]` : 'border-neutral-200 hover:border-neutral-300'} rounded-3xl p-6 flex flex-col relative transition-all`}>
                  {isActive && (
                    <div className={`absolute -top-3 left-6 px-3 py-1 ${t.bg} ${t.text} text-[10px] font-bold uppercase rounded-full tracking-widest border ${t.border}`}>Active Tier</div>
                  )}
                  <div className="mb-4">
                    <Icon className={`w-8 h-8 ${t.text} mb-3`} />
                    <h3 className="text-lg font-bold text-neutral-900">{tier} Workspace</h3>
                    <p className="text-xs text-neutral-600 mt-1 h-8">{desc[tier]}</p>
                  </div>
                  <div className="space-y-2.5 flex-1 mb-6">
                    {features[tier].map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-neutral-700">
                        <CheckCircle className={`w-4 h-4 ${t.text} shrink-0`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => !isActive && setPreviewLevel(tier)}
                    disabled={isActive}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${isActive ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed border border-neutral-200' : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'}`}
                  >
                    {isActive ? 'Current Workspace' : `Preview ${tier}`}
                  </button>
                </div>
              );
            })}
          </div>

          {previewLevel && (
            <div className="bg-white border border-primary/20 rounded-3xl p-8 animate-fade-in">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Impact Analysis: Transitioning to {previewLevel}</h3>
              <p className="text-xs text-neutral-600 mb-6">Review the changes to your workspace navigation and features before confirming.</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5">
                  <h4 className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-4 border-b border-neutral-200 pb-2">Navigation & Feature Changes</h4>
                  <div className="space-y-3">
                    {previewLevel === 'Expert' && (
                      <>
                        <div className="flex items-start gap-2 text-xs"><CheckSquare className="w-4 h-4 text-success shrink-0" /><span className="text-neutral-700"><b>Added:</b> Automation Rules, API Access, Advanced Reporting, Audit Logs.</span></div>
                        <div className="flex items-start gap-2 text-xs"><Layers className="w-4 h-4 text-primary shrink-0" /><span className="text-neutral-700"><b>Navigation:</b> Expanded "Settings & Administration" sidebar group.</span></div>
                      </>
                    )}
                    {previewLevel === 'Professional' && (
                      <>
                        <div className="flex items-start gap-2 text-xs"><CheckSquare className="w-4 h-4 text-success shrink-0" /><span className="text-neutral-700"><b>Added:</b> Membership Freeze, Diet Plans, Expense Tracking.</span></div>
                        <div className="flex items-start gap-2 text-xs"><CheckSquare className="w-4 h-4 text-danger shrink-0" /><span className="text-neutral-700"><b>Hidden:</b> API Keys, Audit Logs, Automation Rules.</span></div>
                      </>
                    )}
                    {previewLevel === 'Essential' && (
                      <>
                        <div className="flex items-start gap-2 text-xs"><CheckSquare className="w-4 h-4 text-danger shrink-0" /><span className="text-neutral-700"><b>Hidden:</b> Freeze, Workouts, Diets, Audit Logs, Automation, Branch Config.</span></div>
                        <div className="flex items-start gap-2 text-xs"><Layers className="w-4 h-4 text-primary shrink-0" /><span className="text-neutral-700"><b>Navigation:</b> Sidebar heavily simplified. "Progressive Feature Reveal" enabled.</span></div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 flex flex-col justify-center items-center">
                  <div className="w-full max-w-[200px] h-32 bg-white border border-neutral-200 rounded-lg flex overflow-hidden shadow-sm">
                    <div className="w-16 bg-neutral-50 border-r border-neutral-200 p-2 space-y-1">
                      <div className="h-2 w-full bg-neutral-200 rounded" />
                      <div className="h-2 w-full bg-neutral-200 rounded" />
                      {previewLevel !== 'Essential' && <div className="h-2 w-full bg-primary/60 rounded" />}
                      {previewLevel === 'Expert' && <div className="h-2 w-full bg-purple-400 rounded" />}
                    </div>
                    <div className="flex-1 p-3">
                      <div className="h-3 w-1/2 bg-neutral-200 rounded mb-2" />
                      <div className="h-12 w-full bg-neutral-100 rounded" />
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-4 font-mono text-center">Visual representation of sidebar complexity changes. Preferences will be backed up automatically.</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setPreviewLevel(null)} className="px-5 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors">Cancel</button>
                <button onClick={handleConfirmChange} className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] transition-all flex items-center gap-2">
                  Confirm Workspace Transition <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TAB 2: ROLE-BASED OVERRIDES ═══════════════════ */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-neutral-900 mb-1">Role-Based Experience Matrix</h3>
            <p className="text-xs text-neutral-600 mb-6">Override the organization's global experience level for specific staff roles to reduce training time and UI clutter.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="pb-3 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Staff Role</th>
                    <th className="pb-3 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Global Inheritance</th>
                    <th className="pb-3 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Experience Override</th>
                    <th className="pb-3 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {[
                    { role: 'Owner', inheritance: 'Expert', override: 'Expert', status: 'Locked' },
                    { role: 'Manager', inheritance: 'Expert', override: 'Professional', status: 'Active' },
                    { role: 'Receptionist', inheritance: 'Expert', override: 'Essential', status: 'Active' },
                    { role: 'Trainer', inheritance: 'Expert', override: 'Essential', status: 'Active' },
                    { role: 'Accountant', inheritance: 'Expert', override: 'Professional', status: 'Active' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-4 font-bold text-neutral-800">{row.role}</td>
                      <td className="py-4 text-neutral-600 font-mono">{currentLevel}</td>
                      <td className="py-4">
                        <select
                          className="bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
                          value={roleOverrides[row.role] || row.override}
                          onChange={(e) => handleUpdateRoleOverride(row.role, e.target.value)}
                          disabled={row.status === 'Locked'}
                        >
                          <option value="Essential">Essential</option>
                          <option value="Professional">Professional</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </td>
                      <td className="py-4">
                        {row.status === 'Locked' ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase"><Lock size={12} /> System Locked</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase"><CheckCircle size={12} /> Custom Set</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB 3: FEATURE DISCOVERY CENTER ═══════════════════ */}
      {activeTab === 'discovery' && (
        <div className="space-y-6">
          <div className="mb-2">
            <h3 className="text-base font-bold text-neutral-900 mb-1">Feature Discovery Center</h3>
            <p className="text-xs text-neutral-600">Gradually adopt advanced capabilities without jumping to a higher workspace tier. Enabled features will appear in your sidebar navigation immediately.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'membership_freeze', title: 'Membership Freeze', desc: 'Allow staff to put active memberships on hold and shift expiry dates dynamically.', icon: Activity },
              { id: 'advanced_analytics', title: 'Advanced Analytics', desc: 'Unlock custom SQL reporting, retention predictions, and revenue forecasting matrices.', icon: TrendingUp },
              { id: 'attendance_automation', title: 'Attendance Automation Rules', desc: 'Trigger webhooks, emails, and SMS automatically when specific attendance patterns occur.', icon: Zap },
              { id: 'custom_roles', title: 'Custom Role Builder', desc: 'Move beyond default roles and create highly granular permission profiles for your staff.', icon: ShieldCheck },
            ].map(feat => {
              const isEnabled = enabledFeatures[feat.id];
              const Icon = feat.icon;
              return (
                <div key={feat.id} className={`bg-white border ${isEnabled ? 'border-primary/40 shadow-sm' : 'border-neutral-200'} rounded-2xl p-5 flex items-start gap-4 transition-all`}>
                  <div className={`p-3 rounded-xl ${isEnabled ? 'bg-primary-light text-primary' : 'bg-neutral-50 text-neutral-500'}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-sm font-bold ${isEnabled ? 'text-neutral-900' : 'text-neutral-700'}`}>{feat.title}</h4>
                      <button onClick={() => handleToggleFeature(feat.id)} className="focus:outline-none cursor-pointer">
                        {isEnabled ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} className="text-neutral-300" />}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-neutral-50 border border-neutral-200 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-neutral-900 mb-1">Guided Onboarding Wizards</h4>
              <p className="text-xs text-neutral-600">Need help setting up a new branch or configuring complex membership templates? Launch a wizard.</p>
            </div>
            <button onClick={() => showToast('Guided Onboarding Wizard launched (Demo)')} className="px-4 py-2 bg-neutral-100 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 rounded-xl text-xs font-bold transition-colors">
              View Launchpad
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB 4: WORKSPACE ANALYTICS ═══════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 rounded-3xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">User Adoption Score</span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-success">86%</span>
                <span className="text-xs text-neutral-600 mb-1">Highly Adopted</span>
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-3xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">Most Used Module</span>
              <div className="text-lg font-bold text-neutral-900">Attendance Tracking</div>
              <div className="text-xs text-neutral-600 mt-1">420 interactions today</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-3xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">Stale Feature Alert</span>
              <div className="text-lg font-bold text-danger">Diet Plans</div>
              <div className="text-xs text-neutral-600 mt-1">0 interactions in 30 days</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-neutral-200 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-neutral-900 mb-4">Training Recommendations</h3>
              <div className="space-y-4">
                <div className="bg-neutral-50 rounded-xl p-3 flex gap-3">
                  <AlertCircle className="text-amber-700 w-5 h-5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-neutral-800">Staff Struggling with Payment Reconciliations</h5>
                    <p className="text-[10px] text-neutral-600 mt-1 leading-relaxed">System metrics indicate Receptionist role is taking 4x longer than average to log cash payments. Consider activating the Guided Payment Wizard or conducting targeted training.</p>
                    <button className="mt-2 text-[10px] font-bold text-primary hover:underline">Launch Training Module</button>
                  </div>
                </div>
                <div className="bg-neutral-50 rounded-xl p-3 flex gap-3">
                  <Info className="text-primary w-5 h-5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-neutral-800">Unused 'Expert' Capabilities</h5>
                    <p className="text-[10px] text-neutral-600 mt-1 leading-relaxed">You are on the Expert tier but have not utilized Automation Rules. We recommend exploring the Feature Discovery Center or downgrading to Professional to simplify your UI.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-neutral-900 mb-4">Staff Feedback Signals</h3>
              <div className="space-y-3">
                {[
                  { staff: 'Sarah J.', role: 'Receptionist', note: 'Can we hide the complex API settings? It clutters the menu.', sentiment: 'negative' },
                  { staff: 'Marcus V.', role: 'Manager', note: 'The new Membership Freeze flow is incredibly fast.', sentiment: 'positive' },
                ].map((fb, i) => (
                  <div key={i} className="border-l-2 border-neutral-200 pl-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-neutral-700">{fb.staff}</span>
                      <span className="text-[9px] text-neutral-500 uppercase">{fb.role}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${fb.sentiment === 'positive' ? 'bg-success' : 'bg-danger'}`} />
                    </div>
                    <p className="text-xs text-neutral-600 italic">"{fb.note}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
