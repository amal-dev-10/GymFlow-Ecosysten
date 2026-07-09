'use client';

import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { platformUsersApi, handleApiError } from '@/lib/api';
import type { PlatformDepartmentDTO } from '@/types/platformUsers';
import { ROLE_OPTIONS, PlatformRoleBadge } from './PlatformUserBadges';

const STEPS = ['Basic Information', 'Assign Role', 'Permissions', 'Review'];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['Full platform access', 'Manage platform users', 'Manage billing & subscriptions', 'Manage every module'],
  OPERATIONS: ['Manage organizations', 'Manage platform users', 'View billing'],
  FINANCE: ['Manage billing & subscriptions', 'Manage coupons', 'View organizations'],
  SALES: ['View organizations', 'Manage subscriptions', 'View plans'],
  SUPPORT: ['View organizations', 'Impersonate organizations', 'Manage support tickets'],
  DEVELOPER: ['View Feature & Limit Engine', 'View audit logs', 'View API management'],
  MARKETING: ['View organizations', 'Manage coupons'],
  CUSTOMER_SUCCESS: ['View organizations', 'Manage support tickets', 'View subscriptions'],
};

const inputClass = 'w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none';
const selectClass = inputClass + ' cursor-pointer';

export default function InviteUserWizard({ departments, onClose, onInvited }: { departments: PlatformDepartmentDTO[]; onClose: () => void; onInvited: () => void }) {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState(departments[0]?.name || '');
  const [role, setRole] = useState('SUPPORT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canProceedStep0 = fullName.trim() && phoneNumber.trim();

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await platformUsersApi.invite({ fullName, email: email || undefined, phoneNumber, department: department || undefined, role });
      onInvited();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/85 backdrop-blur-md">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-lg bg-[#0b101d] border border-slate-800/80 rounded-3xl shadow-2xl relative z-10 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-850 shrink-0">
          <h3 className="text-base font-extrabold text-white">Invite Platform User</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-1 px-5 py-3 border-b border-slate-900/60 shrink-0 overflow-x-auto scrollbar-hide">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold ${i === step ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : i < step ? 'text-emerald-400' : 'text-slate-600'}`}>
                {i < step ? <Check size={11} /> : <span className="w-3.5 text-center">{i + 1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-700" />}
            </div>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jordan Lee" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan.lee@gymflow.test" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Phone</label>
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 555 000 0000" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Department</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectClass}>
                  <option value="">No department</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${role === r.value ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/40 border-slate-850 hover:border-slate-700'}`}
                >
                  <PlatformRoleBadge role={r.value} />
                  {role === r.value && <Check size={14} className="text-indigo-300" />}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-xs text-slate-400 mb-3">
                <b className="text-slate-200">{ROLE_OPTIONS.find((r) => r.value === role)?.label}</b> grants the following platform permissions:
              </p>
              <div className="space-y-1.5">
                {(ROLE_PERMISSIONS[role] || []).map((p) => (
                  <div key={p} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-850">
                    <Check size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">{p}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 mt-3">Fine-grained per-module permissions can be adjusted later from this user&apos;s profile.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 space-y-2">
                <div className="flex justify-between text-xs"><span className="text-slate-500">Name</span><span className="font-bold text-slate-200">{fullName}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Email</span><span className="font-bold text-slate-200">{email || '—'}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Phone</span><span className="font-bold text-slate-200">{phoneNumber}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Department</span><span className="font-bold text-slate-200">{department || '—'}</span></div>
                <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Role</span><PlatformRoleBadge role={role as any} /></div>
              </div>
              <p className="text-[11px] text-slate-500">The invitation is recorded immediately with a 7-day expiry. The account activates the moment they complete their first sign-in.</p>
            </div>
          )}

          {error && <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">{error}</div>}
        </div>

        <div className="flex items-center justify-between p-5 border-t border-slate-850 shrink-0">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">
            <ChevronLeft size={13} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={step === 0 && !canProceedStep0}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              Next <ChevronRight size={13} />
            </button>
          ) : (
            <button onClick={submit} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {busy ? 'Sending...' : 'Send Invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
