'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Eye, Pencil, Copy, Users, Trash2, Archive, RotateCcw } from 'lucide-react';
import type { RoleListItemDTO } from '@/types/roles';

export interface RoleRowActionGates {
  canManage: boolean;
}

interface Props {
  role: RoleListItemDTO;
  gates: RoleRowActionGates;
  onView: (role: RoleListItemDTO) => void;
  onDuplicate: (role: RoleListItemDTO) => void;
  onAssignUsers: (role: RoleListItemDTO) => void;
  onArchiveToggle: (role: RoleListItemDTO) => void;
  onDelete: (role: RoleListItemDTO) => void;
}

export default function RoleRowActions({ role, gates, onView, onDuplicate, onAssignUsers, onArchiveToggle, onDelete }: Props) {
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

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger = false, disabled = false, title?: string) => (
    <button
      disabled={disabled}
      title={disabled ? title : undefined}
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button ref={btnRef} onClick={toggle} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className={`absolute right-0 ${flipUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-56 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5 animate-fade-in`}>
          {item(<Eye size={14} className="text-indigo-400" />, 'View Role', () => onView(role))}
          {gates.canManage && item(<Pencil size={14} className="text-indigo-400" />, 'Edit Permissions', () => onView(role))}
          {gates.canManage && item(<Copy size={14} />, 'Duplicate as New Role', () => onDuplicate(role))}
          {gates.canManage && item(<Users size={14} />, 'Assign Users', () => onAssignUsers(role))}
          {gates.canManage && (
            <>
              <div className="my-1 border-t border-slate-850" />
              {role.isSystem
                ? item(<Archive size={14} />, 'Archive', () => onArchiveToggle(role), false, true, 'System roles cannot be archived.')
                : item(role.status === 'Active' ? <Archive size={14} /> : <RotateCcw size={14} className="text-emerald-400" />, role.status === 'Active' ? 'Archive' : 'Restore', () => onArchiveToggle(role))}
              {item(<Trash2 size={14} />, 'Delete', () => onDelete(role), true, role.isSystem, 'System roles cannot be deleted.')}
            </>
          )}
        </div>
      )}
    </div>
  );
}
