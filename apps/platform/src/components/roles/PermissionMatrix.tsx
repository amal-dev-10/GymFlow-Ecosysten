'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Grid3x3 } from 'lucide-react';
import { platformRolesApi, handleApiError } from '@/lib/api';
import type { PermissionMatrixDTO, PermissionGrantInput } from '@/types/roles';
import { MatrixCellIcon, MATRIX_CELL_CONFIG } from './RoleBadges';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import PermissionSearch from './PermissionSearch';

interface Props {
  canManage: boolean;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export default function PermissionMatrix({ canManage, showToast }: Props) {
  const [matrix, setMatrix] = useState<PermissionMatrixDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    platformRolesApi.getMatrix().then(setMatrix).catch(() => setMatrix(null)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    if (!matrix) return [];
    const seen = new Map<string, { key: string; label: string }>();
    matrix.permissions.forEach((p) => seen.set(p.categoryKey, { key: p.categoryKey, label: p.category }));
    return Array.from(seen.values());
  }, [matrix]);

  const toggleCell = async (roleId: string, permKey: string) => {
    if (!matrix || !canManage) return;
    const cell = matrix.cells[roleId][permKey];
    if (cell.state === 'INHERITED' || cell.state === 'INHERITED_DENY') return; // inherited cells aren't directly editable

    const nextState: 'ALLOW' | 'DENY' | null = cell.state === 'NONE' ? 'ALLOW' : cell.state === 'ALLOW' ? 'DENY' : null;
    const cellKey = `${roleId}:${permKey}`;
    setSavingKey(cellKey);
    try {
      const currentGrants: PermissionGrantInput[] = matrix.permissions
        .filter((p) => {
          const s = matrix.cells[roleId][p.key]?.state;
          return (s === 'ALLOW' || s === 'DENY') && p.key !== permKey;
        })
        .map((p) => ({ permissionKey: p.key, effect: matrix.cells[roleId][p.key].state as 'ALLOW' | 'DENY' }));
      if (nextState) currentGrants.push({ permissionKey: permKey, effect: nextState });

      await platformRolesApi.setPermissions(roleId, currentGrants);
      load();
    } catch (err) {
      showToast(handleApiError(err), 'error');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="h-64 bg-[#0b101d] border border-slate-800/80 rounded-2xl animate-pulse" />;
  if (!matrix || matrix.roles.length === 0) return <PlatformEmptyState icon={Grid3x3} title="No roles to display" description="Create a role to see the permission matrix." />;

  return (
    <div className="space-y-4">
      <PermissionSearch />

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        {(['ALLOW', 'DENY', 'INHERITED', 'INHERITED_DENY', 'NONE'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <MatrixCellIcon state={s} size={12} /> {MATRIX_CELL_CONFIG[s].label}
          </span>
        ))}
      </div>

      {/* Desktop: full matrix grid */}
      <div className="hidden lg:block bg-[#0b101d] border border-slate-800/80 rounded-2xl overflow-auto max-h-[70vh]">
        <table className="text-left border-collapse">
          <thead>
            <tr className="sticky top-0 z-10 bg-[#0b101d]">
              <th className="px-4 py-3 sticky left-0 bg-[#0b101d] z-20 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-r border-slate-800/60 min-w-[220px]">Permission</th>
              {matrix.roles.map((r) => (
                <th key={r.id} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/60 whitespace-nowrap text-center min-w-[110px]">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <React.Fragment key={cat.key}>
                <tr className="bg-slate-900/40">
                  <td colSpan={matrix.roles.length + 1} className="px-4 py-1.5 sticky left-0 bg-slate-900/40 text-[10px] font-bold uppercase tracking-wider text-indigo-300 border-b border-slate-900/60">
                    {cat.label}
                  </td>
                </tr>
                {matrix.permissions.filter((p) => p.categoryKey === cat.key).map((p) => (
                  <tr key={p.key} className="border-b border-slate-900/60 last:border-0 hover:bg-slate-900/20">
                    <td className="px-4 py-2 sticky left-0 bg-[#0b101d] text-xs text-slate-300 border-r border-slate-900/60 whitespace-nowrap">{p.label}</td>
                    {matrix.roles.map((r) => {
                      const cell = matrix.cells[r.id]?.[p.key] || { state: 'NONE' as const };
                      const cellKey = `${r.id}:${p.key}`;
                      const editable = canManage && cell.state !== 'INHERITED' && cell.state !== 'INHERITED_DENY';
                      return (
                        <td key={r.id} className="px-3 py-2 text-center">
                          <button
                            disabled={!editable || savingKey === cellKey}
                            onClick={() => toggleCell(r.id, p.key)}
                            title={cell.sourceRoleName ? `Inherited from ${cell.sourceRoleName}` : editable ? 'Click to change' : undefined}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${editable ? 'hover:bg-slate-900 cursor-pointer' : 'cursor-default'} disabled:opacity-50`}
                          >
                            <MatrixCellIcon state={cell.state} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tablet: per-role permission cards */}
      <div className="hidden md:grid lg:hidden grid-cols-2 gap-3">
        {matrix.roles.map((r) => {
          const allowed = matrix.permissions.filter((p) => {
            const s = matrix.cells[r.id]?.[p.key]?.state;
            return s === 'ALLOW' || s === 'INHERITED';
          });
          return (
            <div key={r.id} className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-100 mb-2">{r.name}</p>
              <p className="text-[11px] text-slate-500 mb-3">{allowed.length} permission{allowed.length === 1 ? '' : 's'} granted</p>
              <div className="flex flex-wrap gap-1.5">
                {allowed.slice(0, 8).map((p) => (
                  <span key={p.key} className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-850 px-2 py-1 rounded-full">{p.label}</span>
                ))}
                {allowed.length > 8 && <span className="text-[10px] font-semibold text-slate-500 px-2 py-1">+{allowed.length - 8} more</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: read-only summary list */}
      <div className="md:hidden space-y-2">
        {matrix.roles.map((r) => {
          const allowedCount = matrix.permissions.filter((p) => ['ALLOW', 'INHERITED'].includes(matrix.cells[r.id]?.[p.key]?.state)).length;
          return (
            <div key={r.id} className="flex items-center justify-between bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
              <span className="text-xs font-bold text-slate-100">{r.name}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><Lock size={11} /> {allowedCount} permissions</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
