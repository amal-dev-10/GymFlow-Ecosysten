'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Eye, UserCog, Ban, PlayCircle, CreditCard, ScrollText, Archive } from 'lucide-react';
import type { OrganizationRowDTO } from '@/types/organizations';

export interface OrgActionGates {
  canSuspend: boolean;
  canImpersonate: boolean;
  canViewSubscription: boolean;
}

interface Props {
  org: OrganizationRowDTO;
  gates: OrgActionGates;
  onViewDetails: (org: OrganizationRowDTO) => void;
  onImpersonate: (org: OrganizationRowDTO) => void;
  onSuspend: (org: OrganizationRowDTO) => void;
  onActivate: (org: OrganizationRowDTO) => void;
  onArchive: (org: OrganizationRowDTO) => void;
  onViewSubscription: (org: OrganizationRowDTO) => void;
  onViewAudit: (org: OrganizationRowDTO) => void;
}

export default function OrgRowActions({
  org,
  gates,
  onViewDetails,
  onImpersonate,
  onSuspend,
  onActivate,
  onArchive,
  onViewSubscription,
  onViewAudit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setFlipUp(window.innerHeight - rect.bottom < 280);
    }
    setOpen((v) => !v);
  };

  const isSuspended = org.derivedStatus === 'SUSPENDED';
  const isArchived = org.derivedStatus === 'ARCHIVED';

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
        danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={toggle}
        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className={`absolute right-0 ${flipUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-52 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in`}>
          {item(<Eye size={14} className="text-indigo-400" />, 'View Details', () => onViewDetails(org))}
          {gates.canImpersonate && !isArchived && item(<UserCog size={14} className="text-indigo-400" />, 'Impersonate', () => onImpersonate(org))}
          {gates.canViewSubscription && item(<CreditCard size={14} className="text-indigo-400" />, 'View Subscription', () => onViewSubscription(org))}
          {item(<ScrollText size={14} className="text-indigo-400" />, 'View Audit Logs', () => onViewAudit(org))}
          {gates.canSuspend && (
            <div className="my-1 border-t border-slate-850" />
          )}
          {gates.canSuspend && !isSuspended && !isArchived && item(<Ban size={14} />, 'Suspend', () => onSuspend(org), true)}
          {gates.canSuspend && (isSuspended || isArchived) && item(<PlayCircle size={14} className="text-emerald-400" />, 'Activate', () => onActivate(org))}
          {gates.canSuspend && !isArchived && item(<Archive size={14} />, 'Archive', () => onArchive(org), true)}
        </div>
      )}
    </div>
  );
}
