'use client';

import { Info, Users, KeySquare, History, GitBranch, ShieldAlert } from 'lucide-react';

export const ROLE_DETAIL_TABS = [
  { id: 'info', name: 'Role Information', icon: Info },
  { id: 'users', name: 'Users', icon: Users },
  { id: 'permissions', name: 'Permission Summary', icon: KeySquare },
  { id: 'audit', name: 'Audit History', icon: History },
  { id: 'inherited', name: 'Inherited Roles', icon: GitBranch },
  { id: 'restrictions', name: 'Restrictions', icon: ShieldAlert },
] as const;

export type RoleDetailTabId = (typeof ROLE_DETAIL_TABS)[number]['id'];

export default function RoleDetailTabs({ active, onChange, restrictionCount }: { active: RoleDetailTabId; onChange: (id: RoleDetailTabId) => void; restrictionCount: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      {ROLE_DETAIL_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors shrink-0 ${
              isActive ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'text-slate-500 border border-transparent hover:bg-slate-900/60 hover:text-slate-300'
            }`}
          >
            <tab.icon size={13} />
            {tab.name}
            {tab.id === 'restrictions' && restrictionCount > 0 && (
              <span className="text-[9px] font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-full">{restrictionCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
