'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orgUsersApi, rolesApi } from '../lib/api';
import { useSubscriptionContext } from './subscription';

interface AccessControlContextProps {
 isAuthenticated: boolean;
 userRole: string;
 userPermissions: string[];
 gymAccess: 'all' | string[];
 subscriptionFeatures: string[];
 loading: boolean;
 hasPermission: (permission: string) => boolean;
 hasFeature: (feature: string) => boolean;
 hasGymAccess: (gymId: string) => boolean;
 verifyRoute: (pathname: string, selectedGymId: string) => {
 allowed: boolean;
 reason: 'ok' | 'unauthenticated' | 'no_org' | 'no_permission' | 'no_feature' | 'no_gym_access';
 requiredDetails?: string;
 };
 triggerAuditLog: (action: string, details: string) => Promise<void>;
 updateRoleContext: (role: string) => void;
}

const AccessControlContext = createContext<AccessControlContextProps | undefined>(undefined);

function normalizeRole(roleName: string): string {
 if (!roleName) return 'owner';
 const clean = roleName.toLowerCase().trim().replace(/_/g, ' ');
 if (clean === 'organization owner' || clean === 'owner' || clean === 'org owner') {
 return 'owner';
 }
 if (clean === 'manager' || clean === 'branch manager' || clean === 'branch_manager') {
 return 'branch_manager';
 }
 if (clean === 'trainer') {
 return 'trainer';
 }
 if (clean === 'receptionist') {
 return 'receptionist';
 }
 return clean.replace(/ /g, '_');
}

export function AccessControlProvider({ children }: { children: React.ReactNode }) {
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [userRole, setUserRole] = useState('owner');
 const [userPermissions, setUserPermissions] = useState<string[]>([]);
 const [gymAccess, setGymAccess] = useState<'all' | string[]>('all');
 const [loading, setLoading] = useState(true);

 // Feature availability comes from the organization's real subscription
 // plan (see context/subscription.tsx), not a role-based simulation - a
 // feature disabled on the current plan is unavailable even to the owner.
 const { subscription } = useSubscriptionContext();
 const subscriptionFeatures = subscription ? subscription.features.filter((f) => f.enabled).map((f) => f.key) : [];

 const loadPermissionsForRole = useCallback(async (roleName: string) => {
 try {
 const allRoles = await rolesApi.list();
 const targetName = roleName.toLowerCase().trim().replace(/_/g, ' ');
 // roleName may be either a full seeded role display name ("Gym Manager",
 // as returned by org-users lookups) or a short normalized code ("branch_manager",
 // as stored on the logged-in user object) - both must resolve to the same role.
 const SHORT_CODE_TO_ROLE_NAME: Record<string, string> = {
 owner: 'organization owner',
 branch_manager: 'gym manager',
 receptionist: 'receptionist',
 trainer: 'trainer',
 dietitian: 'dietitian',
 };
 const aliasedName = SHORT_CODE_TO_ROLE_NAME[targetName.replace(/ /g, '_')];
 const currentRoleDetails = allRoles.find((r: any) => {
 const rName = r.name.toLowerCase().trim();
 return rName === targetName || (!!aliasedName && rName === aliasedName);
 });

 if (currentRoleDetails) {
 setUserPermissions(currentRoleDetails.permissions || []);
 }
 } catch (err) {
 console.error('Failed to load role permissions', err);
 }
 }, []);

 const refreshContext = useCallback(async () => {
 setLoading(true);
 const token = localStorage.getItem('token');
 const orgId = localStorage.getItem('organizationId');
 const userStr = localStorage.getItem('user');

 if (!token) {
 setIsAuthenticated(false);
 setLoading(false);
 return;
 }

 setIsAuthenticated(true);

 let currentUserObj: any = null;
 if (userStr) {
 try {
 currentUserObj = JSON.parse(userStr);
 } catch {}
 }

 if (orgId) {
 try {
 const usersList = await orgUsersApi.list();
 const me = usersList.find((usr: any) => 
 currentUserObj && (usr.id === currentUserObj.id || usr.phone === currentUserObj.phoneNumber)
 );
 if (me) {
 const roleNormalized = normalizeRole(me.role.name);
 setUserRole(roleNormalized);
 setGymAccess(me.gyms.length === 0 ? 'all' : me.gyms.map((g: any) => g.id));
 await loadPermissionsForRole(me.role.name);
 } else {
 const roleNormalized = normalizeRole(currentUserObj?.role || 'owner');
 setUserRole(roleNormalized);
 setGymAccess('all');
 await loadPermissionsForRole(currentUserObj?.role || 'owner');
 }
 } catch {
 const roleNormalized = normalizeRole(currentUserObj?.role || 'owner');
 setUserRole(roleNormalized);
 setGymAccess('all');
 await loadPermissionsForRole(currentUserObj?.role || 'owner');
 }
 } else {
 const roleNormalized = normalizeRole(currentUserObj?.role || 'owner');
 setUserRole(roleNormalized);
 await loadPermissionsForRole(currentUserObj?.role || 'owner');
 }
 setLoading(false);
 }, [loadPermissionsForRole]);

 useEffect(() => {
 refreshContext();
 }, [refreshContext]);

 // Update role dynamically (for sidebar demo selectors)
 const updateRoleContext = async (roleName: string) => {
 setLoading(true);
 const roleNormalized = normalizeRole(roleName);
 setUserRole(roleNormalized);
 
 // Simulate updating in localStorage for consistency
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 u.role = roleNormalized;
 localStorage.setItem('user', JSON.stringify(u));
 } catch {}
 }

 await loadPermissionsForRole(roleName);
 setLoading(false);
 };

 const hasPermission = useCallback((permission: string) => {
 if (userRole === 'owner') return true; // Owners bypass permission guards
 return userPermissions.includes(permission);
 }, [userRole, userPermissions]);

 const hasFeature = useCallback((feature: string) => {
 if (!subscription) return false;
 return subscription.features.some((f) => f.key === feature && f.enabled);
 }, [subscription]);

 const hasGymAccess = useCallback((gymId: string) => {
 if (gymAccess === 'all') return true;
 return gymAccess.includes(gymId);
 }, [gymAccess]);

 // Combined Route Guard logic
 const verifyRoute = useCallback((pathname: string, selectedGymId: string) => {
 if (typeof window === 'undefined') {
 return { allowed: true, reason: 'ok' as const };
 }

 // Step 1: Authentication Guard
 const token = localStorage.getItem('token');
 if (!token) {
 return { allowed: false, reason: 'unauthenticated' as const };
 }

 // Step 2: Organization Guard
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) {
 return { allowed: false, reason: 'no_org' as const };
 }

 // Step 3: Permission Guard - maps each module to the canonical permission
 // key(s) defined in apps/api roles.service.ts SYSTEM_ROLE_DEFINITIONS.
 // Ordered most-specific path first so sub-routes can require a stricter
 // permission than their parent module.
 const permissionRules: { prefix: string; check: () => boolean; requiredDetails: string }[] = [
 { prefix: '/workspace/roles', check: () => hasPermission('auth.manage_roles'), requiredDetails: 'auth.manage_roles' },

 // Unified Dashboard (merged Analytics HQ + Branch Dashboard) — baseline
 // requirement is just gym.view; the organization-wide analytics content
 // within the page is further gated in-page by the reports permission/feature
 // so a receptionist/trainer can still reach their branch's dashboard.
 { prefix: '/workspace/dashboard', check: () => hasPermission('gym.view'), requiredDetails: 'gym.view' },

 { prefix: '/workspace/gyms/create', check: () => hasPermission('gym.create'), requiredDetails: 'gym.create' },
 { prefix: '/workspace/gyms/edit', check: () => hasPermission('gym.update'), requiredDetails: 'gym.update' },
 { prefix: '/workspace/gyms/media', check: () => hasPermission('gym.manage_media'), requiredDetails: 'gym.manage_media' },
 { prefix: '/workspace/gyms/dashboard', check: () => hasPermission('gym.view'), requiredDetails: 'gym.view' },
 { prefix: '/workspace/gyms', check: () => hasPermission('gym.view'), requiredDetails: 'gym.view' },

 { prefix: '/workspace/users', check: () => hasPermission('auth.view_users'), requiredDetails: 'auth.view_users' },
 { prefix: '/workspace/invitations', check: () => hasPermission('auth.invite_users'), requiredDetails: 'auth.invite_users' },

 { prefix: '/workspace/organization/edit', check: () => hasPermission('org.update'), requiredDetails: 'org.update' },
 { prefix: '/workspace/organization/settings', check: () => hasPermission('org.manage_settings'), requiredDetails: 'org.manage_settings' },
 { prefix: '/workspace/organization', check: () => hasPermission('org.view'), requiredDetails: 'org.view' },

 { prefix: '/workspace/audit-logs', check: () => hasPermission('audit.view') || hasPermission('reports.view'), requiredDetails: 'audit.view' },

 { prefix: '/workspace/members', check: () => hasPermission('member.view'), requiredDetails: 'member.view' },
 { prefix: '/workspace/memberships', check: () => hasPermission('membership.view_plans'), requiredDetails: 'membership.view_plans' },

 { prefix: '/workspace/attendance/settings', check: () => hasPermission('attendance.manage_settings'), requiredDetails: 'attendance.manage_settings' },
 { prefix: '/workspace/attendance/devices', check: () => hasPermission('devices.view'), requiredDetails: 'devices.view' },
 { prefix: '/workspace/attendance', check: () => hasPermission('attendance.view'), requiredDetails: 'attendance.view' },

 { prefix: '/workspace/workouts', check: () => hasPermission('workout.view'), requiredDetails: 'workout.view' },
 { prefix: '/workspace/diets', check: () => hasPermission('diet.view'), requiredDetails: 'diet.view' },

 { prefix: '/workspace/billing', check: () => hasPermission('billing.view_invoices'), requiredDetails: 'billing.view_invoices' },
 { prefix: '/workspace/expenses', check: () => hasPermission('expense.view'), requiredDetails: 'expense.view' },

 { prefix: '/workspace/settings', check: () => hasPermission('settings.view'), requiredDetails: 'settings.view' },
 ];

 const matchedRule = permissionRules.find((rule) => pathname.includes(rule.prefix));
 if (matchedRule && !matchedRule.check()) {
 return { allowed: false, reason: 'no_permission' as const, requiredDetails: matchedRule.requiredDetails };
 }

 // Step 4: Subscription/Feature Guard simulations
 if (pathname.includes('/workspace/billing') || pathname.includes('/workspace/expenses')) {
 if (!hasFeature('billing')) {
 return { allowed: false, reason: 'no_feature' as const, requiredDetails: 'Billing & Ledgers package' };
 }
 }

 // Step 5: Gym Access Guard
 if (selectedGymId && selectedGymId !== 'All Gyms' && selectedGymId !== 'all') {
 if (!hasGymAccess(selectedGymId)) {
 return { allowed: false, reason: 'no_gym_access' as const, requiredDetails: selectedGymId };
 }
 }

 return { allowed: true, reason: 'ok' as const };
 }, [hasPermission, hasFeature, hasGymAccess]);

 // Send route guard violations to audit logs
 const triggerAuditLog = async (action: string, details: string) => {
 try {
 const userStr = localStorage.getItem('user');
 let userName = 'System Guard';
 let userId = undefined;
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 if (u.fullName) userName = u.fullName;
 else if (u.name) userName = u.name;
 if (u.id) userId = u.id;
 } catch {}
 }
 await rolesApi.createAuditLog({
 action,
 details,
 user: userName,
 eventType: 'PERMISSION_DENIED',
 eventCategory: 'Security',
 metadata: { userId, path: typeof window !== 'undefined' ? window.location.pathname : '' },
 });
 console.warn(`[Route Guard Violation Logged]: ${action} - ${details}`);
 } catch (err) {
 console.error('Failed to log audit event', err);
 }
 };

 return (
 <AccessControlContext.Provider
 value={{
 isAuthenticated,
 userRole,
 userPermissions,
 gymAccess,
 subscriptionFeatures,
 loading,
 hasPermission,
 hasFeature,
 hasGymAccess,
 verifyRoute,
 triggerAuditLog,
 updateRoleContext,
 }}
 >
 {children}
 </AccessControlContext.Provider>
 );
}

export function useAccessControl() {
 const context = useContext(AccessControlContext);
 if (!context) {
 throw new Error('useAccessControl must be used within an AccessControlProvider');
 }
 return context;
}
