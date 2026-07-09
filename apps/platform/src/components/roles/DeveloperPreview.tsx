'use client';

import { useEffect, useState } from 'react';
import { Code2, GitBranch } from 'lucide-react';
import { platformPermissionsApi } from '@/lib/api';
import type { PermissionTreeCategoryDTO, EffectivePermissionDTO, MatrixCellState } from '@/types/roles';
import PermissionTree from './PermissionTree';
import PermissionJsonViewer from './PermissionJsonViewer';
import RoleEvaluationPanel from './RoleEvaluationPanel';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';

export default function DeveloperPreview() {
  const [tree, setTree] = useState<PermissionTreeCategoryDTO[]>([]);
  const [effective, setEffective] = useState<EffectivePermissionDTO[]>([]);
  const [subject, setSubject] = useState('');

  useEffect(() => {
    platformPermissionsApi.tree().then(setTree).catch(() => setTree([]));
  }, []);

  const effectByKey = new Map<string, MatrixCellState>(effective.map((p) => [p.key, p.effect]));

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
        <p className="text-xs text-slate-300">
          The system evaluates <b className="text-indigo-300">permissions</b>, not role names. Pick a role or user below to see exactly what they can do, computed live by the authorization engine (inheritance + groups + explicit deny all applied).
        </p>
      </div>

      <RoleEvaluationPanel onEvaluate={(perms, subj) => { setEffective(perms); setSubject(subj); }} />

      {!subject ? (
        <PlatformEmptyState icon={Code2} title="Select a role or user" description="Choose a role or user above to preview its effective permissions, permission tree, and raw JSON." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Permission Tree — {subject}</p>
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-3 max-h-[28rem] overflow-y-auto scrollbar-thin">
              <PermissionTree tree={tree} effectByKey={effectByKey} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><GitBranch size={11} /> Effective Permissions ({effective.filter((p) => p.effect === 'ALLOW').length} allowed)</p>
              <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-3 max-h-48 overflow-y-auto scrollbar-thin space-y-1">
                {effective.filter((p) => p.effect === 'ALLOW').map((p) => (
                  <div key={p.key} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-mono">{p.key}</span>
                    <span className="text-slate-600">{p.sourceRoleNames.join(', ')}</span>
                  </div>
                ))}
                {effective.filter((p) => p.effect === 'ALLOW').length === 0 && <p className="text-[11px] text-slate-600">No permissions granted.</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Role Evaluation JSON</p>
              <PermissionJsonViewer data={effective} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
