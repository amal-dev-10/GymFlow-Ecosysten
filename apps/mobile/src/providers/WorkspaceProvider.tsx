import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useWorkspaceStore } from '../store/workspace.store';
import { orgApi } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { Feature, hasFeature } from '../lib/permissions';

interface WorkspaceContextValue {
  /** True while the persisted workspace is being revalidated against the server on launch. */
  isRestoring: boolean;
  organizationId: string | null;
  organizationName: string | null;
  gymId: string | null;
  gymName: string | null;
  branchId: string | null;
  branchName: string | null;
  role: string | null;
  permissions: Feature[];
  isWorkspaceSelected: boolean;
  can: (feature: Feature) => boolean;
  /** Clears all cached query data — call whenever the active gym/org changes. */
  invalidateWorkspaceCache: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const workspace = useWorkspaceStore();
  const [isRestoring, setIsRestoring] = useState(true);
  const hasValidated = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsRestoring(false);
      hasValidated.current = false;
      return;
    }
    if (hasValidated.current) return;
    hasValidated.current = true;

    // Revalidate any workspace restored from disk: the user may have lost
    // access to the org, or the gym may have been deleted/deactivated since
    // their last session. Silently fixes up role/permission drift too.
    (async () => {
      const { activeOrganizationId, activeGymId, clearWorkspace, refreshRole } = useWorkspaceStore.getState();
      if (!activeOrganizationId) {
        setIsRestoring(false);
        return;
      }
      try {
        const orgs = await orgApi.list();
        const org = orgs.find((o) => o.id === activeOrganizationId);
        if (!org) {
          // Access to this organization was revoked — fall back to the selector
          clearWorkspace();
        } else if (activeGymId && !org.gyms.some((g) => g.id === activeGymId)) {
          // The previously selected gym was deleted or is no longer assigned
          clearWorkspace();
        } else {
          refreshRole(org.myRole);
        }
      } catch {
        // Network failure on launch — keep the last-known-good workspace so
        // the user isn't locked out while offline; screens should handle
        // their own fetch errors independently.
      } finally {
        setIsRestoring(false);
      }
    })();
  }, [isAuthenticated]);

  const invalidateWorkspaceCache = () => {
    queryClient.clear();
  };

  const value: WorkspaceContextValue = {
    isRestoring,
    organizationId: workspace.activeOrganizationId,
    organizationName: workspace.activeOrganizationName,
    gymId: workspace.activeGymId,
    gymName: workspace.activeGymName,
    branchId: workspace.activeBranchId,
    branchName: workspace.activeBranchName,
    role: workspace.role,
    permissions: workspace.permissions,
    isWorkspaceSelected: workspace.isWorkspaceSelected,
    can: (feature) => hasFeature(workspace.role, feature),
    invalidateWorkspaceCache,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}
