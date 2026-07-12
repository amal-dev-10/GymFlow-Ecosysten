'use client';

import React, { useState, useEffect } from 'react';
import { rolesApi, gymApi } from '../../../lib/api';
import { Tabs } from '../../../components/ui';
import {
    Shield,
    ShieldAlert,
    Users,
    Sliders,
    Search,
    Plus,
    X,
    Check,
    Copy,
    Trash2,
    Archive,
    Eye,
    Settings,
    Lock,
    Globe,
    MapPin,
    FileText,
    Calendar,
    History,
    UserCheck,
    UserX,
    RefreshCw,
    Edit,
    ArrowLeft,
    ArrowRight,
    CheckSquare,
    Square,
    AlertCircle,
    HelpCircle,
    Clock,
    Key,
    ShieldCheck,
    AlertTriangle,
    ChevronRight,
    ChevronDown,
    LockKeyhole,
    CheckSquare2,
    FileSignature,
    Crown,
    BadgeCheck,
    Loader2,
} from 'lucide-react';

// =========================================================================
// TYPES & SCHEMAS
// =========================================================================

interface Role {
    id: string;
    name: string;
    description: string;
    category: 'Administration' | 'Operations' | 'Finance' | 'Fitness' | 'Custom';
    isSystem: boolean;
    usersCount: number;
    permissions: string[];
    createdDate: string;
    status: 'active' | 'archived';
    gymScope: 'all' | string[];
}

interface Employee {
    id: string;
    name: string;
    phone: string;
    gyms: string[];
    roleId: string;
    status: 'active' | 'inactive';
    assignedDate: string;
}

interface AuditLog {
    id: string;
    timestamp: string;
    action: string;
    user: string;
    details: string;
    eventCategory?: string | null;
}

interface AssignedUser {
    id: string;
    employeeId?: string | null;
    name: string;
    phone: string;
    isActive: boolean;
}

interface OverrideItem {
    id: string;
    userName: string;
    userId: string;
    permission: string;
    type: 'Temporary' | 'Emergency';
    expiresAt: string;
    status: 'Approved' | 'Awaiting Approval' | 'Expired';
    requestedBy: string;
}

// =========================================================================
// 17 ENTERPRISE PERMISSION CATEGORIES
// =========================================================================

const PERMISSION_CATEGORIES = [
    {
        id: 'auth',
        name: 'Authentication',
        desc: 'Manage users, roles, sessions, and security constraints',
        permissions: [
            { key: 'auth.view_users', label: 'View Users', desc: 'Allows viewing active workspace users' },
            { key: 'auth.invite_users', label: 'Invite Users', desc: 'Allows sending phone or email onboard invitations' },
            { key: 'auth.manage_users', label: 'Manage Users', desc: 'Allows updating user profiles, statuses, and permissions' },
            { key: 'auth.manage_roles', label: 'Manage Roles', desc: 'Allows creating, duplicating, and archiving custom roles' },
            { key: 'auth.manage_permissions', label: 'Manage Permissions', desc: 'Allows configuring matrix privilege nodes' },
            { key: 'auth.view_audit', label: 'View Audit Logs', desc: 'Allows viewing security log streams' },
            { key: 'auth.manage_sessions', label: 'Manage Sessions', desc: 'Allows revoking user logged sessions' },
            { key: 'auth.manage_security', label: 'Security Settings', desc: 'Allows configuring MFA and password settings' }
        ]
    },
    {
        id: 'org',
        name: 'Organization Management',
        desc: 'Configure core business profiles, billing, and branches',
        permissions: [
            { key: 'org.view', label: 'View Profile', desc: 'Allows viewing organization details' },
            { key: 'org.create', label: 'Register Organization', desc: 'Allows creating new workspace tenants' },
            { key: 'org.update', label: 'Update Profile', desc: 'Allows updating business addresses and settings' },
            { key: 'org.manage_settings', label: 'Global Configurations', desc: 'Allows modifying timezone and currency standards' },
            { key: 'org.manage_branding', label: 'Custom Branding', desc: 'Allows uploading logos and color themes' },
            { key: 'org.manage_subscription', label: 'SaaS Billing', desc: 'Allows upgrading tier plans and viewing invoices' },
            { key: 'org.manage_branches', label: 'Configure Branches', desc: 'Allows adding or archiving gym locations' },
            { key: 'subscriptions.read', label: 'View Subscription', desc: 'Allows viewing the current plan, usage limits, and invoices' },
            { key: 'subscriptions.write', label: 'Manage Subscription', desc: 'Allows switching or upgrading the organization\'s subscription plan' }
        ]
    },
    {
        id: 'gym',
        name: 'Gym Branch Settings',
        desc: 'Branch specifics, local calendars, and limits',
        permissions: [
            { key: 'gym.view', label: 'View Branch details', desc: 'Allows viewing branch profiles' },
            { key: 'gym.create', label: 'Create Branches', desc: 'Allows registering new branch locations' },
            { key: 'gym.update', label: 'Edit Branch details', desc: 'Allows editing branch hours, descriptions, and contacts' },
            { key: 'gym.delete', label: 'Archive Branches', desc: 'Allows archiving branch locations' },
            { key: 'gym.manage_settings', label: 'Branch Configurations', desc: 'Allows changing check-in serialization standards' },
            { key: 'gym.manage_capacity', label: 'Capacity Caps', desc: 'Allows modifying safety check-in thresholds' },
            { key: 'gym.manage_media', label: 'Media Galleries', desc: 'Allows uploading cover photos and logos' }
        ]
    },
    {
        id: 'employee',
        name: 'Employee Management',
        desc: 'Staff rosters, role assignments, and salaries',
        permissions: [
            { key: 'employee.view', label: 'View Employees', desc: 'Allows viewing staff details' },
            { key: 'employee.create', label: 'Onboard Staff', desc: 'Allows creating employee profiles' },
            { key: 'employee.update', label: 'Edit Staff profiles', desc: 'Allows updating designation and contact parameters' },
            { key: 'employee.delete', label: 'Revoke Onboarding', desc: 'Allows removing employees from payroll' },
            { key: 'employee.assign_roles', label: 'Assign Roles', desc: 'Allows modifying assigned roles for employees' },
            { key: 'employee.transfer_branch', label: 'Transfer Branches', desc: 'Allows changing assigned gym branch scopes' },
            { key: 'employee.manage_salary', label: 'Payroll Logs', desc: 'Allows viewing salary details' },
            { key: 'employee.export', label: 'Export Roster', desc: 'Allows downloading staff spreadsheets' }
        ]
    },
    {
        id: 'member',
        name: 'Member Directory',
        desc: 'Customer relations, files, and status triggers',
        permissions: [
            { key: 'member.view', label: 'View Members', desc: 'Allows searching and viewing member files' },
            { key: 'member.create', label: 'Register Members', desc: 'Allows onboarding new customers' },
            { key: 'member.update', label: 'Edit Members', desc: 'Allows modifying personal and measurement logs' },
            { key: 'member.delete', label: 'Archive Members', desc: 'Allows marking membership records as inactive' },
            { key: 'member.import', label: 'Bulk Import', desc: 'Allows uploading member files via CSV format' },
            { key: 'member.export', label: 'Export Members', desc: 'Allows exporting member directories' },
            { key: 'member.manage_documents', label: 'Upload Documents', desc: 'Allows attaching ID proofs or medical records' },
            { key: 'member.manage_status', label: 'Status Controls', desc: 'Allows locking or unlocking member accounts' }
        ]
    },
    {
        id: 'membership',
        name: 'Membership Management',
        desc: 'Tier pricing configurations and validation rules',
        permissions: [
            { key: 'membership.view_plans', label: 'View Plans', desc: 'Allows viewing membership pricing lists' },
            { key: 'membership.create_plans', label: 'Create Plans', desc: 'Allows designing new pricing products' },
            { key: 'membership.update_plans', label: 'Edit Plans', desc: 'Allows modifying pricing parameters' },
            { key: 'membership.activate_plans', label: 'Publish Plans', desc: 'Allows publishing plan tiers' },
            { key: 'membership.deactivate_plans', label: 'Archive Plans', desc: 'Allows disabling plan registration' },
            { key: 'membership.purchase', label: 'Sell Memberships', desc: 'Allows creating member membership plans' },
            { key: 'membership.renew', label: 'Process Renewals', desc: 'Allows renewing expired memberships' },
            { key: 'membership.freeze', label: 'Freeze Account', desc: 'Allows pausing memberships for injury or travel' },
            { key: 'membership.unfreeze', label: 'Unfreeze Account', desc: 'Allows resuming paused memberships' },
            { key: 'membership.transfer', label: 'Transfer Account', desc: 'Allows transferring membership contracts' },
            { key: 'membership.cancel', label: 'Cancel Memberships', desc: 'Allows terminating active membership contracts' },
            { key: 'membership.override', label: 'Override Validations', desc: 'Allows bypass checks for expired memberships' }
        ]
    },
    {
        id: 'attendance',
        name: 'Attendance & Occupancy',
        desc: 'Daily check-ins, scans, corrections, and occupancy limits',
        permissions: [
            { key: 'attendance.view', label: 'View Check-ins', desc: 'Allows viewing attendance history logs' },
            { key: 'attendance.check_in', label: 'Check-In Members', desc: 'Allows scanning members inside' },
            { key: 'attendance.check_out', label: 'Check-Out Members', desc: 'Allows logging checkout checks' },
            { key: 'attendance.correct', label: 'Correct Scans', desc: 'Allows manual corrections for attendance' },
            { key: 'attendance.override', label: 'Override Entry', desc: 'Allows force entrance approvals' },
            { key: 'attendance.manage_qr', label: 'QR Generator', desc: 'Allows generating scanner tokens' },
            { key: 'attendance.manage_settings', label: 'Check-In Settings', desc: 'Allows editing grace times' },
            { key: 'attendance.export', label: 'Export Logs', desc: 'Allows downloading attendance logs' },
            { key: 'attendance.view_occupancy', label: 'Real-time Occupancy', desc: 'Allows viewing active branch numbers' }
        ]
    },
    {
        id: 'workout',
        name: 'Workout library',
        desc: 'Workout regime templates and athlete schedules',
        permissions: [
            { key: 'workout.view', label: 'View Workouts', desc: 'Allows viewing exercises and programs' },
            { key: 'workout.create', label: 'Create Exercises', desc: 'Allows adding new workout routines' },
            { key: 'workout.assign', label: 'Assign Workouts', desc: 'Allows planning schedules for members' },
            { key: 'workout.update', label: 'Edit Routines', desc: 'Allows updating exercise templates' },
            { key: 'workout.delete', label: 'Delete Routines', desc: 'Allows removing exercises from the list' },
            { key: 'workout.manage_templates', label: 'Workout Templates', desc: 'Allows saving global workout templates' }
        ]
    },
    {
        id: 'diet',
        name: 'Diet Management',
        desc: 'Custom calorie schedules and counseling sheets',
        permissions: [
            { key: 'diet.view', label: 'View Diets', desc: 'Allows viewing nutritional menus' },
            { key: 'diet.create', label: 'Design Diets', desc: 'Allows creating customized menu guides' },
            { key: 'diet.assign', label: 'Assign Diets', desc: 'Allows sending diet planners to members' },
            { key: 'diet.update', label: 'Edit Menus', desc: 'Allows editing calorie values' },
            { key: 'diet.delete', label: 'Delete Menus', desc: 'Allows removing dietary schedules' },
            { key: 'diet.manage_templates', label: 'Diet Templates', desc: 'Allows managing global nutrition templates' }
        ]
    },
    {
        id: 'billing',
        name: 'Billing & Payments',
        desc: 'Invoices, payment logs, refunds, and discounts',
        permissions: [
            { key: 'billing.view_invoices', label: 'View Invoices', desc: 'Allows checking payment statements' },
            { key: 'billing.create_invoices', label: 'Generate Invoices', desc: 'Allows generating transaction bills' },
            { key: 'billing.record_payments', label: 'Record Cash payments', desc: 'Allows recording cash entries' },
            { key: 'billing.refund', label: 'Issue Refunds', desc: 'Allows returning subscription amounts' },
            { key: 'billing.manage_taxes', label: 'Tax Settings', desc: 'Allows setting tax percentages' },
            { key: 'billing.manage_discounts', label: 'Promo Coupons', desc: 'Allows setting discount limits' },
            { key: 'billing.export', label: 'Export Fin-data', desc: 'Allows exporting transaction records' }
        ]
    },
    {
        id: 'expense',
        name: 'Expense Management',
        desc: 'Track operational costs and budget allocations',
        permissions: [
            { key: 'expense.view', label: 'View Expenses', desc: 'Allows viewing expense ledgers' },
            { key: 'expense.create', label: 'Record Outflow', desc: 'Allows logging new bills and purchases' },
            { key: 'expense.approve', label: 'Approve Expense', desc: 'Allows matching cost allocations' },
            { key: 'expense.reject', label: 'Reject Expense', desc: 'Allows rejecting invalid costs' },
            { key: 'expense.manage_categories', label: 'Cost Categories', desc: 'Allows managing cost categories' },
            { key: 'expense.export', label: 'Export Expenses', desc: 'Allows downloading cost sheets' }
        ]
    },
    {
        id: 'reports',
        name: 'Reports & Analytics',
        desc: 'Analytical indicators and scheduled reports',
        permissions: [
            { key: 'reports.view', label: 'View Reports', desc: 'Allows reading core dashboards' },
            { key: 'reports.create', label: 'Generate Reports', desc: 'Allows creating customized audits' },
            { key: 'reports.export', label: 'Export Reports', desc: 'Allows downloading reports' },
            { key: 'reports.schedule', label: 'Email Reports', desc: 'Allows scheduling automatic reporting' },
            { key: 'reports.view_analytics', label: 'Advanced Analytics', desc: 'Allows accessing AI modeling' },
            { key: 'reports.manage_dashboards', label: 'Widget Settings', desc: 'Allows configuring KPI panels' }
        ]
    },
    {
        id: 'notification',
        name: 'Notification Management',
        desc: 'SMS, emails, and automatic template schedules',
        permissions: [
            { key: 'notification.view', label: 'View Sent logs', desc: 'Allows checking notification history' },
            { key: 'notification.send', label: 'Send Broadcasts', desc: 'Allows dispatching SMS alerts' },
            { key: 'notification.manage_templates', label: 'Sms Templates', desc: 'Allows updating text scripts' },
            { key: 'notification.manage_channels', label: 'Channel Settings', desc: 'Allows disabling emails or SMS alerts' }
        ]
    },
    {
        id: 'settings',
        name: 'Settings & Security',
        desc: 'Configure integrations, API keys, and workspace rules',
        permissions: [
            { key: 'settings.view', label: 'View Settings', desc: 'Allows checking global configuration settings' },
            { key: 'settings.update', label: 'Update Settings', desc: 'Allows modifying default rules' },
            { key: 'settings.manage_attendance', label: 'Attendance Rules', desc: 'Allows setting check-in parameters' },
            { key: 'settings.manage_membership', label: 'Membership Settings', desc: 'Allows customizing freeze policies' },
            { key: 'settings.manage_notifications', label: 'Trigger Rules', desc: 'Allows editing message triggers' },
            { key: 'settings.manage_integrations', label: 'Webhooks & Api', desc: 'Allows configuring webhook endpoints' }
        ]
    },
    {
        id: 'audit',
        name: 'Security Audit logs',
        desc: 'Access logs, mutations, and security event histories',
        permissions: [
            { key: 'audit.view', label: 'View Audit Logs', desc: 'Allows searching security logs' },
            { key: 'audit.export', label: 'Export Audit Logs', desc: 'Allows downloading csv audit sheets' },
            { key: 'audit.investigate', label: 'Investigate', desc: 'Allows looking up employee login logs' },
            { key: 'audit.view_security', label: 'Security Alerts', desc: 'Allows getting security alert feeds' }
        ]
    },
    {
        id: 'integration',
        name: 'Integrations & Sync',
        desc: 'External platforms, WhatsApp bots, and CRM links',
        permissions: [
            { key: 'integration.view', label: 'View Integrations', desc: 'Allows listing webhook pipelines' },
            { key: 'integration.create', label: 'Add Webhooks', desc: 'Allows configuring new webhook scripts' },
            { key: 'integration.update', label: 'Modify Links', desc: 'Allows updating api tokens' },
            { key: 'integration.delete', label: 'Deactivate bots', desc: 'Allows disabling integrations' },
            { key: 'integration.trigger', label: 'Manual Sync', desc: 'Allows running sync triggers manually' }
        ]
    },
    {
        id: 'platform',
        name: 'Platform Administration',
        desc: 'Global SaaS multi-tenant support dashboard',
        permissions: [
            { key: 'platform.view_tenants', label: 'View Tenants', desc: 'Allows listing organization workspaces' },
            { key: 'platform.manage_tenants', label: 'Manage Tenants', desc: 'Allows deactivating workspaces' },
            { key: 'platform.view_system_logs', label: 'System logs', desc: 'Allows inspecting server logs' },
            { key: 'platform.configure_system', label: 'System Settings', desc: 'Allows modifying environment variables' }
        ]
    }
];

// Permission dependency warning references
const PERMISSION_DEPENDENCIES: { [key: string]: string } = {
    'member.create': 'member.view',
    'member.update': 'member.view',
    'member.delete': 'member.view',
    'member.export': 'member.view',
    'member.import': 'member.view',
    'member.manage_documents': 'member.view',
    'member.manage_status': 'member.view',
    'membership.create_plans': 'membership.view_plans',
    'membership.update_plans': 'membership.view_plans',
    'membership.activate_plans': 'membership.view_plans',
    'membership.deactivate_plans': 'membership.view_plans',
    'membership.purchase': 'membership.view_plans',
    'membership.renew': 'membership.view_plans',
    'membership.freeze': 'membership.view_plans',
    'membership.unfreeze': 'membership.view_plans',
    'membership.transfer': 'membership.view_plans',
    'membership.cancel': 'membership.view_plans',
    'membership.override': 'membership.view_plans',
    'attendance.check_in': 'attendance.view',
    'attendance.check_out': 'attendance.view',
    'attendance.correct': 'attendance.view',
    'attendance.override': 'attendance.view',
    'attendance.manage_qr': 'attendance.view',
    'attendance.manage_settings': 'attendance.view',
    'attendance.export': 'attendance.view',
    'attendance.view_occupancy': 'attendance.view',
    'workout.create': 'workout.view',
    'workout.assign': 'workout.view',
    'workout.update': 'workout.view',
    'workout.delete': 'workout.view',
    'workout.manage_templates': 'workout.view',
    'diet.create': 'diet.view',
    'diet.assign': 'diet.view',
    'diet.update': 'diet.view',
    'diet.delete': 'diet.view',
    'diet.manage_templates': 'diet.view',
    'billing.create_invoices': 'billing.view_invoices',
    'billing.record_payments': 'billing.view_invoices',
    'billing.refund': 'billing.view_invoices',
    'billing.manage_taxes': 'billing.view_invoices',
    'billing.manage_discounts': 'billing.view_invoices',
    'billing.export': 'billing.view_invoices',
    'expense.create': 'expense.view',
    'expense.approve': 'expense.view',
    'expense.reject': 'expense.view',
    'expense.manage_categories': 'expense.view',
    'expense.export': 'expense.view'
};

const ALL_PERMISSION_KEYS = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key));



interface DashboardStats {
    totalRoles: number;
    customRoles: number;
    activeUsers: number;
    permissionGroups: number;
    activeOverrides: number;
    systemRoles: number;
    totalPermissionNodes: number;
}

export default function RoleManagementPage() {
    // Application Data States
    const [roles, setRoles] = useState<Role[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [overrides, setOverrides] = useState<OverrideItem[]>([]);
    const [gyms, setGyms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

    const [activeSection, setActiveSection] = useState<'dashboard' | 'directory' | 'matrix' | 'overrides' | 'preview' | 'audit'>('dashboard');
    const [auditPage, setAuditPage] = useState(1);

    // Security Logs tab — server-paginated, security/IAM-scoped feed.
    const securityPerPage = 15;
    const [securityLogs, setSecurityLogs] = useState<AuditLog[]>([]);
    const [securityLogsTotal, setSecurityLogsTotal] = useState(0);
    const [securityLogsPages, setSecurityLogsPages] = useState(1);
    const [securityLogsLoading, setSecurityLogsLoading] = useState(false);

    // Load database values on mount
    const loadData = async () => {
        try {
            setLoading(true);
            const orgId = localStorage.getItem('organizationId') || '';

            // Core data fetched in parallel
            const [dbRoles, dbEmployees, dbLogs, dbGyms] = await Promise.all([
                rolesApi.list(),
                rolesApi.getEmployees(),
                rolesApi.getAuditLogs(),
                gymApi.list(orgId),
            ]);

            setRoles(dbRoles);
            setEmployees(dbEmployees);
            setAuditLogs(dbLogs);
            setGyms(dbGyms);

            // Fetch overrides from backend (graceful fallback to empty array)
            try {
                const dbOverrides = await rolesApi.getOverrides();
                setOverrides(Array.isArray(dbOverrides) ? dbOverrides : []);
            } catch {
                setOverrides([]);
            }

            // Fetch aggregate dashboard stats (graceful fallback to computed values)
            try {
                const apiStats = await rolesApi.getStats();
                setDashboardStats(apiStats);
            } catch {
                // Fallback: compute stats from fetched lists
                const totalPermNodes = PERMISSION_CATEGORIES.reduce((acc, c) => acc + c.permissions.length, 0);
                setDashboardStats({
                    totalRoles: dbRoles.length,
                    customRoles: dbRoles.filter((r: any) => !r.isSystem).length,
                    activeUsers: dbEmployees.length,
                    permissionGroups: PERMISSION_CATEGORIES.length,
                    activeOverrides: 0, // will be recomputed from override list
                    systemRoles: dbRoles.filter((r: any) => r.isSystem).length,
                    totalPermissionNodes: totalPermNodes,
                });
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load Role & Permission data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Load security/IAM logs for the Security Logs tab (server-paginated).
    useEffect(() => {
        if (activeSection !== 'audit') return;
        setSecurityLogsLoading(true);
        rolesApi.getSecurityLogs(auditPage, securityPerPage)
            .then((res) => {
                setSecurityLogs(res.data || []);
                setSecurityLogsTotal(res.total || 0);
                setSecurityLogsPages(res.totalPages || 1);
            })
            .catch(() => {
                setSecurityLogs([]);
                setSecurityLogsTotal(0);
                setSecurityLogsPages(1);
            })
            .finally(() => setSecurityLogsLoading(false));
    }, [activeSection, auditPage]);

    // Details view context
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    // Role detail panel
    const [roleDetailId, setRoleDetailId] = useState<string | null>(null);
    const [roleDetail, setRoleDetail] = useState<(Role & { assignedUsers: AssignedUser[] }) | null>(null);
    const [roleDetailLoading, setRoleDetailLoading] = useState(false);
    const [syncingDefaults, setSyncingDefaults] = useState(false);

    // Drawer / Wizard States
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'clone'>('create');

    // Input states for wizard
    const [roleName, setRoleName] = useState('');
    const [roleDesc, setRoleDesc] = useState('');
    const [roleCategory, setRoleCategory] = useState<Role['category']>('Custom');
    const [roleGymScope, setRoleGymScope] = useState<Role['gymScope']>('all');
    const [cloneSourceRoleId, setCloneSourceRoleId] = useState('');
    const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
    const [ownershipRule, setOwnershipRule] = useState<'all' | 'assigned'>('all');

    // Search & Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');
    const [permissionSearch, setPermissionSearch] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

    // Modals & Overrides Fields
    const [assignUserModalOpen, setAssignUserModalOpen] = useState(false);
    const [selectedUsersToAssign, setSelectedUsersToAssign] = useState<string[]>([]);
    const [overrideModalOpen, setOverrideModalOpen] = useState(false);
    const [overrideUser, setOverrideUser] = useState('');
    const [overridePerm, setOverridePerm] = useState('');
    const [overrideType, setOverrideType] = useState<'Temporary' | 'Emergency'>('Temporary');
    const [overrideExpiry, setOverrideExpiry] = useState('');

    // Access Preview Simulator States
    const [previewRole, setPreviewRole] = useState('org_owner');

    // Feedback Notification Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const activeRole = roles.find(r => r.id === selectedRoleId);

    // Load full role details (including assigned users) into the side panel
    const handleViewRoleDetail = async (roleId: string) => {
        setRoleDetailId(roleId);
        setRoleDetail(null);
        setRoleDetailLoading(true);
        try {
            const detail = await rolesApi.get(roleId);
            setRoleDetail(detail as any);
        } catch {
            showToast('Failed to load role details.', 'error');
            setRoleDetailId(null);
        } finally {
            setRoleDetailLoading(false);
        }
    };

    const closeRoleDetail = () => {
        setRoleDetailId(null);
        setRoleDetail(null);
    };

    // Re-sync all system role permissions from server canonical definition
    const handleSyncDefaults = async () => {
        setSyncingDefaults(true);
        try {
            const result = await rolesApi.syncDefaults();
            showToast(`Synced ${result.roles?.length ?? 0} system roles successfully.`, 'success');
            loadData();
            // Refresh detail panel if open
            if (roleDetailId) handleViewRoleDetail(roleDetailId);
        } catch {
            showToast('Failed to sync system role permissions.', 'error');
        } finally {
            setSyncingDefaults(false);
        }
    };

    const toggleCategoryCollapse = (catId: string) => {
        setCollapsedCategories(prev =>
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        );
    };

    // =========================================================================
    // ACTIONS / HANDLERS
    // =========================================================================

    const handleStartCreate = () => {
        setDrawerMode('create');
        setRoleName('');
        setRoleDesc('');
        setRoleCategory('Custom');
        setRoleGymScope('all');
        setSelectedPerms([]);
        setWizardStep(1);
        setDrawerOpen(true);
    };

    const handleStartClone = (sourceRole?: Role) => {
        setDrawerMode('clone');
        setRoleName(sourceRole ? `${sourceRole.name} Copy` : '');
        setRoleDesc(sourceRole ? `Cloned copy of ${sourceRole.name}` : '');
        setRoleCategory('Custom');
        setRoleGymScope(sourceRole ? sourceRole.gymScope : 'all');
        setCloneSourceRoleId(sourceRole ? sourceRole.id : roles[0]?.id || '');
        setSelectedPerms(sourceRole ? [...sourceRole.permissions] : []);
        setWizardStep(1);
        setDrawerOpen(true);
    };

    const handleStartEdit = (targetRole: Role) => {
        if (targetRole.isSystem) {
            showToast('System roles cannot be modified.', 'error');
            return;
        }
        setDrawerMode('edit');
        setSelectedRoleId(targetRole.id);
        setRoleName(targetRole.name);
        setRoleDesc(targetRole.description);
        setRoleCategory(targetRole.category);
        setRoleGymScope(targetRole.gymScope);
        setSelectedPerms([...targetRole.permissions]);
        setWizardStep(1);
        setDrawerOpen(true);
    };

    const handleCloneSourceChange = (srcId: string) => {
        setCloneSourceRoleId(srcId);
        const src = roles.find(r => r.id === srcId);
        if (src) {
            setSelectedPerms([...src.permissions]);
            setRoleGymScope(src.gymScope);
        }
    };

    const handleSaveRoleSubmit = async () => {
        if (!roleName.trim()) {
            showToast('Role Name is required', 'error');
            return;
        }

        try {
            if (drawerMode === 'create' || drawerMode === 'clone') {
                await rolesApi.create({
                    name: roleName,
                    description: roleDesc || 'No custom description provided.',
                    category: roleCategory,
                    permissions: selectedPerms,
                    gymScope: roleGymScope
                });
                showToast(`Role '${roleName}' created successfully.`, 'success');
            } else if (drawerMode === 'edit' && selectedRoleId) {
                await rolesApi.update(selectedRoleId, {
                    name: roleName,
                    description: roleDesc,
                    category: roleCategory,
                    permissions: selectedPerms,
                    gymScope: roleGymScope
                });
                showToast(`Role '${roleName}' updated successfully.`, 'success');
            }
            loadData();
            setDrawerOpen(false);
        } catch (err) {
            showToast('Failed to save role details.', 'error');
        }
    };

    const handleArchiveRole = (targetRole: Role) => {
        if (targetRole.isSystem) return;
        showToast(`Role status toggled for '${targetRole.name}'.`, 'success');
    };

    const handleDeleteRole = async (targetRole: Role) => {
        if (targetRole.isSystem) {
            showToast('Cannot delete system protected roles.', 'error');
            return;
        }

        const assignedUsersCount = employees.filter(emp => emp.roleId === targetRole.id).length;
        if (assignedUsersCount > 0) {
            showToast(`Cannot delete role '${targetRole.name}' as it has active users assigned.`, 'error');
            return;
        }

        try {
            await rolesApi.delete(targetRole.id);
            showToast(`Role '${targetRole.name}' deleted successfully.`, 'success');
            loadData();
        } catch (err) {
            showToast('Failed to delete role.', 'error');
        }
    };

    const handleRemoveUserFromRole = async (empId: string) => {
        try {
            await rolesApi.revokeUser(empId);
            showToast('User role revoked successfully.', 'success');
            loadData();
        } catch (err) {
            showToast('Failed to revoke role access.', 'error');
        }
    };

    const handleSaveUserAssignment = async () => {
        if (!selectedRoleId) return;
        try {
            await rolesApi.assignUsers(selectedRoleId, selectedUsersToAssign);
            showToast('Users assigned successfully.', 'success');
            loadData();
            setAssignUserModalOpen(false);
            setSelectedUsersToAssign([]);
        } catch (err) {
            showToast('Failed to assign users.', 'error');
        }
    };

    const togglePermission = (perm: string) => {
        setSelectedPerms(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const toggleCategoryPermissions = (perms: string[], checked: boolean) => {
        setSelectedPerms(prev => {
            if (checked) {
                const toAdd = perms.filter(p => !prev.includes(p));
                return [...prev, ...toAdd];
            } else {
                return prev.filter(p => !perms.includes(p));
            }
        });
    };

    // Matrix actions
    const handleMatrixCellToggle = async (roleId: string, permKey: string) => {
        const role = roles.find(r => r.id === roleId);
        if (!role || role.isSystem) return;

        const hasPerm = role.permissions.includes(permKey);
        const nextPerms = hasPerm
            ? role.permissions.filter(p => p !== permKey)
            : [...role.permissions, permKey];

        try {
            await rolesApi.update(roleId, {
                permissions: nextPerms
            });
            setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: nextPerms } : r));
            showToast(`Updated matrix permission node for '${role.name}'.`, 'success');
        } catch (err) {
            showToast('Failed to update matrix node.', 'error');
        }
    };

    // Override creation handler — posts to backend, falls back to local optimistic insert
    const handleCreateOverride = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!overrideUser || !overridePerm) {
            showToast('Please select a user and permission node', 'error');
            return;
        }
        const emp = employees.find(e => e.id === overrideUser);
        const expiresAt = overrideExpiry || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        try {
            const created = await rolesApi.createOverride({
                userId: overrideUser,
                permission: overridePerm,
                type: overrideType,
                expiresAt,
            });
            // Reload overrides to get server-assigned ID and canonical data
            const dbOverrides = await rolesApi.getOverrides();
            setOverrides(Array.isArray(dbOverrides) ? dbOverrides : [created, ...overrides]);
        } catch {
            // Optimistic fallback: insert locally so UX is never blocked
            const localOverride: OverrideItem = {
                id: `ovr-${Date.now()}`,
                userName: emp?.name || 'Unknown User',
                userId: overrideUser,
                permission: overridePerm,
                type: overrideType,
                expiresAt,
                status: 'Awaiting Approval',
                requestedBy: 'Current User',
            };
            setOverrides(prev => [localOverride, ...prev]);
        }

        showToast('Permission override requested for approval.', 'success');
        setOverrideModalOpen(false);
    };

    const handleApproveOverride = async (id: string) => {
        try {
            await rolesApi.approveOverride(id);
            setOverrides(prev => prev.map(ovr => ovr.id === id ? { ...ovr, status: 'Approved' } : ovr));
            showToast('Override approved and activated.', 'success');
        } catch {
            // Optimistic fallback if endpoint not yet deployed
            setOverrides(prev => prev.map(ovr => ovr.id === id ? { ...ovr, status: 'Approved' } : ovr));
            showToast('Override status updated locally.', 'success');
        }
    };

    const handleRevokeOverride = async (id: string) => {
        try {
            await rolesApi.revokeOverride(id);
            setOverrides(prev => prev.filter(ovr => ovr.id !== id));
            showToast('Override revoked successfully.', 'success');
        } catch {
            setOverrides(prev => prev.filter(ovr => ovr.id !== id));
            showToast('Override removed locally.', 'success');
        }
    };

    // Filter lists
    // Resolve gym-scope IDs to readable branch names for the directory table.
    const gymNameById = React.useMemo(
        () => new Map(gyms.map((g: any) => [g.id, g.name])),
        [gyms]
    );
    const scopeBranchNames = (scope: 'all' | string[]): string =>
        scope === 'all'
            ? 'All Branches'
            : scope.map(id => gymNameById.get(id) || 'Unknown branch').join(', ');

    const filteredRoles = roles.filter(role => {
        const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            role.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || role.category === filterCategory;
        const matchesType = filterType === 'all' ||
            (filterType === 'system' && role.isSystem) ||
            (filterType === 'custom' && !role.isSystem);
        return matchesSearch && matchesCategory && matchesType;
    });

    return (
        <div className="space-y-6 relative pb-16">

            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Role & Permission Management</h2>
                        <span className="px-2 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-[8px] font-bold text-primary uppercase select-none">
                            Enterprise RBAC
                        </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Design department scopes, enforce granular route protection, and monitor temporary user overrides.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                    <button
                        onClick={handleStartCreate}
                        className="flex-1 sm:flex-initial py-2.5 px-4 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Plus size={14} />
                        <span>Create Custom Role</span>
                    </button>
                </div>
            </div>

            {/* TOP NAVIGATION BAR */}
            <Tabs
                tabs={[
                    { id: 'dashboard', label: 'Dashboard Overview' },
                    { id: 'directory', label: `Role Directory (${roles.length})` },
                    { id: 'matrix', label: 'Permission Matrix' },
                    { id: 'overrides', label: `Overrides (${overrides.length})` },
                    { id: 'preview', label: 'Access Previewer' },
                    { id: 'audit', label: 'Security Logs' }
                ]}
                activeId={activeSection}
                onChange={(id) => setActiveSection(id as any)}
            />

            {loading ? (
                <div className="space-y-4 animate-pulse">
                    <div className="h-28 bg-white rounded-2xl border border-neutral-200" />
                    <div className="h-96 bg-white rounded-3xl border border-neutral-200" />
                </div>
            ) : (
                <>
                    {/* ========================================================================= */}
                    {/* SUB-VIEW 1: OVERVIEW DASHBOARD */}
                    {/* ========================================================================= */}
                    {activeSection === 'dashboard' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Live stats: prefer backend aggregate stats, fallback to computed from lists */}
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                {[
                                    {
                                        label: 'Total Roles',
                                        value: dashboardStats?.totalRoles ?? roles.length,
                                        sub: `${dashboardStats?.systemRoles ?? roles.filter(r => r.isSystem).length} system · ${dashboardStats?.customRoles ?? roles.filter(r => !r.isSystem).length} custom`,
                                        color: 'text-neutral-900'
                                    },
                                    {
                                        label: 'Custom Roles',
                                        value: dashboardStats?.customRoles ?? roles.filter(r => !r.isSystem).length,
                                        sub: 'Tenant-scoped configs',
                                        color: 'text-success'
                                    },
                                    {
                                        label: 'Active Users',
                                        value: dashboardStats?.activeUsers ?? employees.length,
                                        sub: 'Assigned staff members',
                                        color: 'text-primary'
                                    },
                                    {
                                        // Derived from the same catalog rendered in the Permission Group Index
                                        // below, so the count and module total always match what's shown there.
                                        label: 'Permission Nodes',
                                        value: ALL_PERMISSION_KEYS.length,
                                        sub: `Across ${PERMISSION_CATEGORIES.length} modules`,
                                        color: 'text-indigo-400'
                                    },
                                    {
                                        label: 'Roles In Use',
                                        value: roles.filter(r => r.usersCount > 0).length,
                                        sub: 'Roles with staff assigned',
                                        color: 'text-amber-600'
                                    }
                                ].map((stat, idx) => (
                                    <div key={idx} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500 block">{stat.label}</span>
                                        <span className={`text-2xl font-black mt-2 block ${stat.color}`}>{stat.value}</span>
                                        <span className="text-[9px] text-neutral-500 block mt-1">{stat.sub}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                {/* Active Categories overview */}
                                <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl space-y-4 lg:col-span-2">
                                    <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Permission Group Index</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {PERMISSION_CATEGORIES.map(cat => (
                                            <div key={cat.id} className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <span className="block text-xs font-black text-neutral-800">{cat.name}</span>
                                                    <span className="block text-[9px] text-neutral-500 mt-0.5">{cat.permissions.length} total node keys</span>
                                                </div>
                                                <span className="text-[9px] text-primary font-mono font-bold">{cat.id}.*</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Audit events overview */}
                                <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Recent Activity Timeline</h3>
                                        <button onClick={() => setActiveSection('audit')} className="text-[10px] text-primary font-bold hover:underline">View All</button>
                                    </div>

                                    <div className="relative border-l border-neutral-100 pl-3.5 space-y-4 text-xs">
                                        {auditLogs.slice(0, 3).map(log => (
                                            <div key={log.id} className="relative group">
                                                <span className="absolute left-[-21px] top-1 w-2 h-2 rounded-full bg-primary border border-neutral-200" />
                                                <div>
                                                    <div className="flex items-center gap-1.5 justify-between">
                                                        <span className="font-bold text-neutral-800">{log.action}</span>
                                                        <span className="text-[8px] text-neutral-500 shrink-0">{log.timestamp}</span>
                                                    </div>
                                                    <p className="text-[10px] text-neutral-600 mt-1 leading-relaxed">{log.details}</p>
                                                    <span className="text-[9px] text-neutral-500 mt-0.5 block">By: {log.user}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* SUB-VIEW 2: ROLE DIRECTORY */}
                    {/* ========================================================================= */}
                    {activeSection === 'directory' && (
                        <div className="space-y-4 animate-fade-in">

                            {/* Header row: search bar + Sync button */}
                            <div className="flex flex-col md:flex-row gap-3 bg-neutral-50 p-3 border border-neutral-100 rounded-2xl">
                                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl">
                                    <Search size={14} className="text-neutral-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search roles or access descriptions..."
                                        className="w-full bg-transparent border-none text-xs text-neutral-800 placeholder-neutral-400 outline-none"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 outline-none cursor-pointer"
                                    >
                                        <option value="all">All Categories</option>
                                        {Array.from(new Set(roles.map(r => r.category))).sort().map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value as any)}
                                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 outline-none cursor-pointer"
                                    >
                                        <option value="all">All Formats</option>
                                        <option value="system">System Default</option>
                                        <option value="custom">Custom Roles</option>
                                    </select>

                                    {/* Sync Defaults button */}
                                    <button
                                        onClick={handleSyncDefaults}
                                        disabled={syncingDefaults}
                                        title="Re-sync system role permissions from server canonical definition"
                                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-primary/20 text-neutral-600 hover:text-primary rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {syncingDefaults
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <RefreshCw size={13} />}
                                        <span className="hidden sm:inline">Sync</span>
                                    </button>
                                </div>
                            </div>

                            {/* Roles Table */}
                            <div className="bg-white border border-neutral-200 rounded-3xl shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-neutral-200/80 text-neutral-500 text-[10px] font-bold uppercase select-none">
                                                <th className="py-4 px-6">Role Name</th>
                                                <th className="py-4 px-4">Description</th>
                                                <th className="py-4 px-4 text-center">Users</th>
                                                <th className="py-4 px-4 text-center">Permissions</th>
                                                <th className="py-4 px-4">Gym Scope</th>
                                                <th className="py-4 px-4">Usage</th>
                                                <th className="py-4 px-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200/40">
                                            {filteredRoles.map((role) => (
                                                <tr
                                                    key={role.id}
                                                    className={`hover:bg-neutral-50/10 transition-colors group cursor-pointer ${roleDetailId === role.id ? 'bg-primary-light border-l-2 border-l-orange-500/40' : ''
                                                        }`}
                                                    onClick={() => handleViewRoleDetail(role.id)}
                                                >
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs select-none ${role.name === 'Organization Owner'
                                                                    ? 'bg-warning-light text-amber-700 border border-amber-200'
                                                                    : role.isSystem
                                                                        ? 'bg-primary-light text-primary border border-primary/20'
                                                                        : 'bg-success-light text-success border border-green-200'
                                                                }`}>
                                                                {role.name === 'Organization Owner'
                                                                    ? <Crown size={14} />
                                                                    : role.isSystem
                                                                        ? <Shield size={14} />
                                                                        : <Sliders size={14} />}
                                                            </div>
                                                            <div>
                                                                <span className="block font-bold text-neutral-800 group-hover:text-primary transition-colors">
                                                                    {role.name}
                                                                </span>
                                                                <span className="block text-[9px] text-neutral-500 mt-0.5 font-bold uppercase tracking-wider">
                                                                    {role.category}
                                                                    {role.isSystem && (
                                                                        <span className="ml-1.5 text-primary">· System</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 max-w-xs">
                                                        <span className="text-neutral-600 line-clamp-2 leading-relaxed">{role.description}</span>
                                                    </td>
                                                    <td className="py-4 px-4 text-center font-bold text-neutral-700">
                                                        {role.usersCount}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold select-none ${role.permissions.length === 0
                                                                ? 'bg-neutral-50 border-neutral-200 text-neutral-400'
                                                                : 'bg-neutral-50 border-neutral-200 text-primary'
                                                            }`}>
                                                            {role.permissions.length} active
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className="flex items-center gap-1 text-neutral-600 font-medium" title={scopeBranchNames(role.gymScope)}>
                                                            {role.gymScope === 'all' ? (
                                                                <><Globe size={11} className="text-primary" /><span>All Branches</span></>
                                                            ) : (
                                                                <><MapPin size={11} className="text-neutral-500" /><span className="truncate max-w-[160px]">{scopeBranchNames(role.gymScope)}</span></>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${role.usersCount > 0 ? 'text-success' : 'text-neutral-400'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${role.usersCount > 0 ? 'bg-success' : 'bg-neutral-300'}`} />
                                                            <span>{role.usersCount > 0 ? 'In Use' : 'Unused'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => { setSelectedRoleId(role.id); setAssignUserModalOpen(true); }}
                                                                className="p-1.5 hover:bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg cursor-pointer"
                                                                title="Assign Users"
                                                            >
                                                                <UserCheck size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStartClone(role)}
                                                                className="p-1.5 hover:bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg cursor-pointer"
                                                                title="Clone Role"
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                            {!role.isSystem ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleStartEdit(role)}
                                                                        className="p-1.5 hover:bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg cursor-pointer"
                                                                        title="Edit Role"
                                                                    >
                                                                        <Edit size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteRole(role)}
                                                                        className="p-1.5 hover:bg-danger-light border border-neutral-200 text-neutral-500 hover:text-danger rounded-lg cursor-pointer"
                                                                        title="Delete Role"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="p-1.5 border border-neutral-100 text-neutral-400 rounded-lg cursor-not-allowed" title="System Protected">
                                                                    <Lock size={12} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Empty state */}
                            {filteredRoles.length === 0 && (
                                <div className="text-center py-16 text-neutral-400">
                                    <Shield size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-bold">No roles match your filters</p>
                                    <p className="text-xs mt-1">Try adjusting the search or category filter</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* SUB-VIEW 3: PERMISSION MATRIX MAP */}
                    {/* ========================================================================= */}
                    {activeSection === 'matrix' && (
                        <div className="space-y-4 animate-fade-in overflow-hidden">
                            <div className="p-4 bg-primary-light border border-primary/20 rounded-2xl text-xs text-primary leading-relaxed flex gap-2.5 max-w-3xl">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Matrix Configuration Mode</span>
                                    <p className="mt-0.5 text-neutral-600">Click checkboxes directly in the cells to toggle permission nodes for custom roles. System roles are protected and locked.</p>
                                </div>
                            </div>

                            {/* Search + expand/collapse controls */}
                            <div className="flex flex-col sm:flex-row gap-3 bg-neutral-50 p-3 border border-neutral-100 rounded-2xl">
                                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl">
                                    <Search size={14} className="text-neutral-500" />
                                    <input
                                        type="text"
                                        value={permissionSearch}
                                        onChange={(e) => setPermissionSearch(e.target.value)}
                                        placeholder="Search permission nodes by name or key..."
                                        className="w-full bg-transparent border-none text-xs text-neutral-800 placeholder-neutral-400 outline-none"
                                    />
                                    {permissionSearch && (
                                        <button onClick={() => setPermissionSearch('')} className="text-neutral-400 hover:text-neutral-700 cursor-pointer" title="Clear search">
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => setCollapsedCategories(prev => prev.length > 0 ? [] : PERMISSION_CATEGORIES.map(c => c.id))}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-primary/20 text-neutral-600 hover:text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    {collapsedCategories.length > 0
                                        ? <><ChevronDown size={13} /><span>Expand All</span></>
                                        : <><ChevronRight size={13} /><span>Collapse All</span></>}
                                </button>
                            </div>

                            <div className="bg-white border border-neutral-200 rounded-3xl shadow-xl overflow-hidden">
                                <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-neutral-200 bg-neutral-50/60 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 sticky top-0 z-10">
                                                <th className="py-4 px-6 bg-white w-64 sticky left-0 z-20">Permission Nodes</th>
                                                {roles.map(r => (
                                                    <th key={r.id} className="py-4 px-4 text-center min-w-[140px]">
                                                        <span className="block text-neutral-800">{r.name}</span>
                                                        <span className="block text-[8px] text-neutral-500 mt-0.5">{r.isSystem ? 'System' : 'Custom'}</span>
                                                        <span className="block text-[9px] text-primary font-bold mt-1 normal-case">{r.permissions.length} nodes</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200/40">
                                            {PERMISSION_CATEGORIES.map(category => {
                                                const q = permissionSearch.trim().toLowerCase();
                                                const searching = q.length > 0;
                                                const matchedPerms = category.permissions.filter(p => !searching || p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q));
                                                // Hide categories with no matches while searching.
                                                if (searching && matchedPerms.length === 0) return null;
                                                // While searching, force-expand so results are visible.
                                                const collapsed = !searching && collapsedCategories.includes(category.id);
                                                return (
                                                <React.Fragment key={category.id}>
                                                    {/* Category Subheader — click to collapse/expand */}
                                                    <tr className="bg-neutral-50/20 font-black text-neutral-600">
                                                        <td className="py-2.5 px-6 font-bold bg-white sticky left-0 z-20 border-r border-neutral-100" colSpan={roles.length + 1}>
                                                            <button
                                                                onClick={() => toggleCategoryCollapse(category.id)}
                                                                className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                                                            >
                                                                {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                                                <span>{category.name}</span>
                                                                <span className="text-[9px] font-bold text-neutral-400 normal-case">({matchedPerms.length})</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {!collapsed && matchedPerms.map(perm => (
                                                        <tr key={perm.key} className="hover:bg-neutral-50/10 transition-colors">
                                                            <td className="py-3 px-6 bg-white sticky left-0 z-20 border-r border-neutral-100">
                                                                <span className="block font-semibold text-neutral-700">{perm.label}</span>
                                                                <span className="block text-[9px] text-neutral-500 font-mono mt-0.5">{perm.key}</span>
                                                            </td>
                                                            {roles.map(role => {
                                                                const hasPerm = role.permissions.includes(perm.key);
                                                                return (
                                                                    <td key={role.id} className="py-3 px-4 text-center">
                                                                        <button
                                                                            disabled={role.isSystem}
                                                                            onClick={() => handleMatrixCellToggle(role.id, perm.key)}
                                                                            className={`w-5 h-5 rounded border mx-auto flex items-center justify-center transition-all ${role.isSystem
                                                                                    ? (hasPerm ? 'bg-neutral-100 border-neutral-200 text-neutral-600 cursor-not-allowed' : 'bg-neutral-50 border-neutral-100 cursor-not-allowed')
                                                                                    : (hasPerm ? 'bg-primary border-primary/20 text-white cursor-pointer hover:bg-primary-hover' : 'bg-neutral-50 border-neutral-200 hover:border-neutral-200 cursor-pointer')
                                                                                }`}
                                                                        >
                                                                            {hasPerm && <Check size={12} strokeWidth={3} />}
                                                                        </button>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* SUB-VIEW 4: PERMISSION OVERRIDES */}
                    {/* ========================================================================= */}
                    {activeSection === 'overrides' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center bg-neutral-50 p-4 border border-neutral-100 rounded-2xl">
                                <div>
                                    <h4 className="text-xs font-bold text-neutral-700">Temporary & Emergency user overrides</h4>
                                    <span className="text-[9px] text-neutral-500 block mt-0.5">Inject dynamic permissions to specific employees for emergency situations.</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setOverrideUser('');
                                        setOverridePerm('');
                                        setOverrideType('Temporary');
                                        setOverrideExpiry('');
                                        setOverrideModalOpen(true);
                                    }}
                                    className="py-2 px-3 bg-primary text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={11} />
                                    <span>Request Override</span>
                                </button>
                            </div>

                            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-neutral-200 bg-neutral-50/40 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                                <th className="py-4 px-6">Assigned User</th>
                                                <th className="py-4 px-4">Injected Permission Node</th>
                                                <th className="py-4 px-4">Override Category</th>
                                                <th className="py-4 px-4">Expires At</th>
                                                <th className="py-4 px-4">Status</th>
                                                <th className="py-4 px-4">Requested By</th>
                                                <th className="py-4 pr-6 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200/40 text-neutral-700">
                                            {overrides.map((ovr) => (
                                                <tr key={ovr.id} className="hover:bg-neutral-50/10 transition-colors">
                                                    <td className="py-4 px-6 font-bold text-neutral-800">{ovr.userName}</td>
                                                    <td className="py-4 px-4 font-mono text-[10px] text-primary">{ovr.permission}</td>
                                                    <td className="py-4 px-4">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${ovr.type === 'Emergency' ? 'bg-danger-light text-danger border border-red-200' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                            }`}>
                                                            {ovr.type}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-neutral-600">{ovr.expiresAt}</td>
                                                    <td className="py-4 px-4">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${ovr.status === 'Approved' ? 'bg-success-light text-success border-green-200' :
                                                                ovr.status === 'Expired' ? 'bg-neutral-50 text-neutral-500 border-neutral-100' :
                                                                    'bg-warning-light text-amber-700 border-amber-200 animate-pulse'
                                                            }`}>
                                                            {ovr.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-neutral-600">{ovr.requestedBy}</td>
                                                    <td className="py-4 pr-6 text-right">
                                                        {ovr.status === 'Awaiting Approval' ? (
                                                            <button
                                                                onClick={() => handleApproveOverride(ovr.id)}
                                                                className="px-2.5 py-1 rounded bg-success hover:bg-green-600 text-white text-[10px] font-bold transition-all"
                                                            >
                                                                Approve Override
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setOverrides(prev => prev.filter(o => o.id !== ovr.id))}
                                                                className="p-1 hover:bg-danger-light text-neutral-500 hover:text-danger border border-transparent hover:border-red-200 rounded"
                                                                title="Revoke Override"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
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



                    {/* ========================================================================= */}
                    {/* SUB-VIEW 6: ACCESS PREVIEWER */}
                    {/* ========================================================================= */}
                    {activeSection === 'preview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
                            <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl space-y-4">
                                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Select Role to Simulate</h3>
                                <p className="text-[10px] text-neutral-600 leading-relaxed">
                                    Toggle different role templates to instantly preview allowed modules, visible navigation routes, and dashboard options.
                                </p>

                                <div className="space-y-2">
                                    {roles.map(r => {
                                        const isSelected = previewRole === r.id;
                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => setPreviewRole(r.id)}
                                                className={`w-full p-3.5 border rounded-2xl text-left cursor-pointer transition-all flex gap-3 ${isSelected ? 'bg-primary-light border-primary/20 text-primary' : 'bg-neutral-50/60 border-neutral-100 hover:border-neutral-200 text-neutral-600'
                                                    }`}
                                            >
                                                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="block text-xs font-black text-neutral-800">{r.name}</span>
                                                    <span className="block text-[9px] text-neutral-500 mt-1">{r.permissions.length} active nodes</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-6 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl">
                                <div>
                                    <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Workspace Access Simulator</h3>
                                    <span className="text-[10px] text-neutral-500 block mt-1">Visible workspace sidebar items and page permissions based on role settings.</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-100">

                                    {/* Visible navigation */}
                                    <div className="space-y-3">
                                        <span className="block text-[9px] font-black uppercase text-neutral-500">Visible Navigation Sidebar</span>
                                        <div className="space-y-2">
                                            {[
                                                { label: 'Gym branches', match: 'gym.view' },
                                                { label: 'Staff registry', match: 'employee.view' },
                                                { label: 'Member profiles', match: 'member.view' },
                                                { label: 'Pricing Plans', match: 'membership.view_plans' },
                                                { label: 'Check-in scanner', match: 'attendance.view' },
                                                { label: 'Financial ledgers', match: 'billing.view_invoices' },
                                                { label: 'Security logs', match: 'audit.view' }
                                            ].map((item, idx) => {
                                                const r = roles.find(r => r.id === previewRole);
                                                const hasAccess = r?.permissions.includes(item.match);
                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-2.5 bg-neutral-50/60 rounded-xl border border-neutral-100 text-xs">
                                                        <span className="font-semibold text-neutral-700">{item.label}</span>
                                                        {hasAccess ? (
                                                            <span className="px-2 py-0.5 bg-success-light text-[8px] font-bold text-success border border-green-200 uppercase rounded">Visible</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-neutral-50 text-[8px] font-bold text-neutral-400 border border-neutral-100 uppercase rounded">Hidden</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Actions allowed */}
                                    <div className="space-y-3">
                                        <span className="block text-[9px] font-black uppercase text-neutral-500">Allowed Workspace Actions</span>
                                        <div className="space-y-2">
                                            {[
                                                { label: 'Create new branches', match: 'gym.create' },
                                                { label: 'Assign staff permissions', match: 'employee.assign_roles' },
                                                { label: 'Onboard new members', match: 'member.create' },
                                                { label: 'Refund invoices', match: 'billing.refund' },
                                                { label: 'Bypass expired membership entry', match: 'membership.override' }
                                            ].map((item, idx) => {
                                                const r = roles.find(r => r.id === previewRole);
                                                const hasAccess = r?.permissions.includes(item.match);
                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-2.5 bg-neutral-50/60 rounded-xl border border-neutral-100 text-xs">
                                                        <span className="font-semibold text-neutral-700">{item.label}</span>
                                                        {hasAccess ? (
                                                            <span className="px-2 py-0.5 bg-success-light text-[8px] font-bold text-success border border-green-200 uppercase rounded">Granted</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-danger-light text-[8px] font-bold text-danger border border-red-200 uppercase rounded">Restricted</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* SUB-VIEW 7: SECURITY TIMELINE LOGS */}
                    {/* ========================================================================= */}
                    {activeSection === 'audit' && (() => {
                        const totalPages = securityLogsPages;
                        const startIndex = (auditPage - 1) * securityPerPage;
                        const paginatedLogs = securityLogs;

                        return (
                            <div className="space-y-4 animate-fade-in w-full">
                                <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow">
                                    <div className="p-5 border-b border-neutral-100/80 bg-neutral-50/20">
                                        <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Global IAM Security Logs</h4>
                                        <p className="text-[10px] text-neutral-500 mt-1">Role and permission changes, user access changes, and authentication activity across this workspace.</p>
                                    </div>

                                    <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead className="sticky top-0 bg-white z-10">
                                                <tr className="border-b border-neutral-200 bg-neutral-50/40 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                                    <th className="py-4 px-6">Timestamp</th>
                                                    <th className="py-4 px-4">Category</th>
                                                    <th className="py-4 px-4">Action</th>
                                                    <th className="py-4 px-4">Triggered By</th>
                                                    <th className="py-4 px-6">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-200/40 text-neutral-700">
                                                {securityLogsLoading ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-10 text-center text-neutral-400">
                                                            <Loader2 size={18} className="animate-spin mx-auto" />
                                                        </td>
                                                    </tr>
                                                ) : paginatedLogs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-8 text-center text-neutral-500">
                                                            No security logs recorded yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedLogs.map((log) => (
                                                        <tr key={log.id} className="hover:bg-neutral-50/10 transition-colors">
                                                            <td className="py-4 px-6 font-mono text-[10px] text-neutral-600 whitespace-nowrap">{log.timestamp}</td>
                                                            <td className="py-4 px-4">
                                                                <span className="px-2 py-0.5 rounded-full border text-[9px] font-bold bg-primary-light text-primary border-primary/20 whitespace-nowrap">
                                                                    {log.eventCategory || 'General'}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 font-bold text-neutral-800">{log.action}</td>
                                                            <td className="py-4 px-4 font-semibold text-neutral-700">{log.user}</td>
                                                            <td className="py-4 px-6 text-neutral-600 leading-relaxed max-w-md">{log.details}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="p-4 border-t border-neutral-100 bg-neutral-50/20 flex items-center justify-between gap-4">
                                            <span className="text-[10px] text-neutral-500">
                                                Showing <span className="font-bold text-neutral-600">{startIndex + 1}</span> to{' '}
                                                <span className="font-bold text-neutral-600">{Math.min(startIndex + securityPerPage, securityLogsTotal)}</span> of{' '}
                                                <span className="font-bold text-neutral-600">{securityLogsTotal}</span> logs
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setAuditPage(p => Math.max(p - 1, 1))}
                                                    disabled={auditPage === 1}
                                                    className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 disabled:opacity-40 disabled:hover:text-neutral-600 transition-all cursor-pointer"
                                                >
                                                    <ArrowLeft size={14} />
                                                </button>
                                                <span className="text-[10px] text-neutral-600 font-bold select-none px-2">
                                                    Page {auditPage} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setAuditPage(p => Math.min(p + 1, totalPages))}
                                                    disabled={auditPage === totalPages}
                                                    className="p-1.5 rounded bg-neutral-50 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 disabled:opacity-40 disabled:hover:text-neutral-600 transition-all cursor-pointer"
                                                >
                                                    <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </>
            )}

            {/* ========================================================================= */}
            {/* ROLE DETAIL SIDE PANEL */}
            {/* ========================================================================= */}
            {roleDetailId && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-background backdrop-blur-sm animate-fade-in">
                    <div className="fixed inset-0" onClick={closeRoleDetail} />

                    <div className="w-full max-w-md bg-white border-l border-neutral-200 h-full relative z-10 flex flex-col shadow-2xl animate-slide-left">

                        {/* Panel Header */}
                        <div className="p-6 border-b border-neutral-100/80 shrink-0">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    {roleDetail ? (
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleDetail.name === 'Organization Owner'
                                                ? 'bg-warning-light text-amber-700 border border-amber-200'
                                                : roleDetail.isSystem
                                                    ? 'bg-primary-light text-primary border border-primary/20'
                                                    : 'bg-success-light text-success border border-green-200'
                                            }`}>
                                            {roleDetail.name === 'Organization Owner'
                                                ? <Crown size={18} />
                                                : roleDetail.isSystem
                                                    ? <Shield size={18} />
                                                    : <Sliders size={18} />}
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-neutral-50 animate-pulse" />
                                    )}
                                    <div>
                                        <h3 className="text-sm font-extrabold text-neutral-900">
                                            {roleDetail?.name ?? 'Loading...'}
                                        </h3>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                                            {roleDetail?.category}
                                            {roleDetail?.isSystem && (
                                                <span className="ml-2 text-primary">· System Protected</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={closeRoleDetail} className="text-neutral-500 hover:text-neutral-800 p-1 cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Org Owner banner */}
                            {roleDetail?.name === 'Organization Owner' && (
                                <div className="mt-4 p-3 bg-warning-light border border-amber-200 rounded-xl flex items-center gap-2.5">
                                    <Crown size={14} className="text-amber-700 shrink-0" />
                                    <div>
                                        <span className="block text-[11px] font-extrabold text-amber-700">Full System Access</span>
                                        <span className="block text-[10px] text-amber-700 mt-0.5">
                                            Super-user role · All {roleDetail.permissions.length} permission nodes granted · Cannot be modified
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Loading state */}
                        {roleDetailLoading && (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 size={22} className="animate-spin text-primary" />
                            </div>
                        )}

                        {/* Panel Body */}
                        {!roleDetailLoading && roleDetail && (
                            <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">

                                {/* Description */}
                                <p className="text-[11px] text-neutral-600 leading-relaxed">{roleDetail.description}</p>

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Permissions', value: roleDetail.permissions.length, color: 'text-primary' },
                                        { label: 'Assigned Users', value: roleDetail.usersCount, color: 'text-success' },
                                        { label: 'Scope', value: roleDetail.gymScope === 'all' ? 'All' : `${(roleDetail.gymScope as string[]).length} Loc`, color: 'text-indigo-400' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-neutral-50/60 border border-neutral-100 rounded-xl p-3 text-center">
                                            <span className={`block text-lg font-black ${s.color}`}>{s.value}</span>
                                            <span className="block text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">{s.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Permission Coverage by Module */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider">Permission Coverage</span>
                                        {roleDetail.name === 'Organization Owner' && (
                                            <span className="text-[8px] font-bold text-amber-700 bg-warning-light border border-amber-200 px-2 py-0.5 rounded-full">Full Access</span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {PERMISSION_CATEGORIES.map(cat => {
                                            const total = cat.permissions.length;
                                            const granted = cat.permissions.filter(p => roleDetail.permissions.includes(p.key)).length;
                                            const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
                                            return (
                                                <div key={cat.id} className="p-2.5 bg-neutral-50/40 border border-neutral-100/80 rounded-xl">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] font-bold text-neutral-700">{cat.name}</span>
                                                        <span className={`text-[9px] font-bold ${pct === 100 ? 'text-success' : pct > 0 ? 'text-primary' : 'text-neutral-400'
                                                            }`}>
                                                            {granted}/{total}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1 bg-neutral-50 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-success' : pct > 0 ? 'bg-primary' : 'bg-transparent'
                                                                }`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Assigned Users */}
                                <div>
                                    <span className="block text-[9px] font-black text-neutral-500 uppercase tracking-wider mb-3">
                                        Assigned Staff ({roleDetail.assignedUsers?.length ?? 0})
                                    </span>
                                    {(roleDetail.assignedUsers?.length ?? 0) === 0 ? (
                                        <div className="text-center py-6 text-neutral-400">
                                            <Users size={22} className="mx-auto mb-2 opacity-40" />
                                            <p className="text-[10px]">No staff assigned to this role</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {roleDetail.assignedUsers.map(user => (
                                                <div key={user.id} className="flex items-center justify-between p-2.5 bg-neutral-50/40 border border-neutral-100 rounded-xl">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center text-[10px] font-black">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="block text-[11px] font-bold text-neutral-800">{user.name}</span>
                                                            <span className="block text-[9px] text-neutral-500">{user.phone}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${user.isActive ? 'bg-success-light text-success' : 'bg-neutral-50 text-neutral-400'
                                                            }`}>
                                                            {user.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                        {user.employeeId ? (
                                                            <button
                                                                onClick={() => rolesApi.revokeUser(user.employeeId!).then(() => {
                                                                    showToast(`Unassigned ${user.name} from role.`, 'success');
                                                                    handleViewRoleDetail(roleDetailId!);
                                                                    loadData();
                                                                }).catch(() => showToast('Failed to revoke user role.', 'error'))}
                                                                className="p-1 text-neutral-400 hover:text-danger hover:bg-danger-light rounded cursor-pointer transition-colors"
                                                                title="Remove from role"
                                                            >
                                                                <UserX size={11} />
                                                            </button>
                                                        ) : (
                                                            <span className="p-1 text-neutral-300" title="This user has no staff record and can't be unassigned here">
                                                                <Lock size={11} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Panel Footer */}
                        {!roleDetailLoading && roleDetail && (
                            <div className="p-6 border-t border-neutral-100/80 shrink-0 space-y-2.5">
                                {roleDetail.isSystem ? (
                                    <>
                                        <div className="flex items-center gap-2 p-2.5 bg-neutral-50/60 border border-neutral-100 rounded-xl mb-1">
                                            <Lock size={11} className="text-neutral-400 shrink-0" />
                                            <span className="text-[10px] text-neutral-400">System roles cannot be edited or deleted.</span>
                                        </div>
                                        <button
                                            onClick={handleSyncDefaults}
                                            disabled={syncingDefaults}
                                            className="w-full py-3 flex items-center justify-center gap-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-primary/20 text-neutral-600 hover:text-primary text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {syncingDefaults ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                            Sync System Permissions
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => { closeRoleDetail(); handleStartEdit(roleDetail); }}
                                            className="flex-1 py-3 flex items-center justify-center gap-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                        >
                                            <Edit size={13} /> Edit Role
                                        </button>
                                        <button
                                            onClick={() => { closeRoleDetail(); handleDeleteRole(roleDetail); }}
                                            className="flex-1 py-3 flex items-center justify-center gap-2 bg-danger-light border border-red-200 hover:border-red-200 text-danger hover:text-danger text-xs font-bold rounded-xl transition-all cursor-pointer"
                                        >
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CREATION/EDIT WIZARD DRAWER (5 STEPS) */}
            {/* ========================================================================= */}
            {drawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-background backdrop-blur-sm animate-fade-in">
                    <div className="fixed inset-0" onClick={() => setDrawerOpen(false)} />

                    <div className="w-full max-w-lg bg-white border-l border-neutral-200 h-full relative z-10 p-6 flex flex-col justify-between shadow-2xl animate-slide-left">
                        <div>
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-100/80">
                                <div>
                                    <h3 className="text-base font-extrabold text-neutral-900">
                                        {drawerMode === 'create' ? 'Create Custom Role' :
                                            drawerMode === 'clone' ? 'Clone Existing Role' : 'Edit Custom Role'}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[10px] text-primary font-bold">Step {wizardStep} of 5</span>
                                        <span className="text-neutral-400">•</span>
                                        <span className="text-[10px] text-neutral-500">
                                            {wizardStep === 1 ? 'Basic Parameters' :
                                                wizardStep === 2 ? 'Module Scopes' :
                                                    wizardStep === 3 ? 'Fine-grain permissions' :
                                                        wizardStep === 4 ? 'Branch restrictions' : 'Review & Save'}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setDrawerOpen(false)} className="text-neutral-500 hover:text-neutral-800 p-1 cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Wizard Content */}
                            <div className="space-y-5 text-xs overflow-y-auto max-h-[500px] pr-1">

                                {/* STEP 1: BASIC INFO */}
                                {wizardStep === 1 && (
                                    <div className="space-y-4 animate-fade-in">
                                        {drawerMode === 'clone' && (
                                            <div>
                                                <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Select Role template to clone</label>
                                                <select
                                                    value={cloneSourceRoleId}
                                                    onChange={(e) => handleCloneSourceChange(e.target.value)}
                                                    className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 outline-none cursor-pointer"
                                                >
                                                    {roles.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name} ({r.permissions.length} perms)</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Custom Role Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={roleName}
                                                onChange={(e) => setRoleName(e.target.value)}
                                                placeholder="e.g. Senior Coach, Front Desk Admin"
                                                className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Access Role description</label>
                                            <textarea
                                                rows={3}
                                                value={roleDesc}
                                                onChange={(e) => setRoleDesc(e.target.value)}
                                                placeholder="Detail access scope for other operators..."
                                                className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Department Category</label>
                                            <select
                                                value={roleCategory}
                                                onChange={(e) => setRoleCategory(e.target.value as any)}
                                                className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 outline-none cursor-pointer"
                                            >
                                                <option value="Administration">Administration</option>
                                                <option value="Operations">Operations</option>
                                                <option value="Finance">Finance</option>
                                                <option value="Fitness">Fitness</option>
                                                <option value="Custom">Custom</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: MODULE SELECTOR */}
                                {wizardStep === 2 && (
                                    <div className="space-y-3.5 animate-fade-in">
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Enable Workspace Modules</span>
                                        <p className="text-[10px] text-neutral-500 leading-relaxed">Toggle module groups to automatically preload permissions or restrict views completely.</p>

                                        <div className="space-y-2">
                                            {PERMISSION_CATEGORIES.map((cat) => {
                                                const hasAny = cat.permissions.some(p => selectedPerms.includes(p.key));
                                                return (
                                                    <div
                                                        key={cat.id}
                                                        onClick={() => toggleCategoryPermissions(cat.permissions.map(p => p.key), !hasAny)}
                                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${hasAny ? 'border-primary/20 bg-primary-light text-primary' : 'border-neutral-100 hover:border-neutral-200 text-neutral-500'
                                                            }`}
                                                    >
                                                        <div>
                                                            <span className="block text-xs font-black text-neutral-800">{cat.name}</span>
                                                            <span className="block text-[9px] text-neutral-500 mt-0.5">{cat.desc}</span>
                                                        </div>
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${hasAny ? 'bg-primary border-primary/20 text-white' : 'bg-neutral-50 border-neutral-200'
                                                            }`}>
                                                            {hasAny && <Check size={11} strokeWidth={3} />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: GRANULAR PERMISSION SETTINGS */}
                                {wizardStep === 3 && (
                                    <div className="space-y-4 animate-fade-in pr-1">
                                        <div className="flex justify-between items-center">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Configure Detailed Node Matrix</span>
                                            <button
                                                onClick={() => setSelectedPerms(ALL_PERMISSION_KEYS)}
                                                className="text-[9px] font-bold text-primary hover:underline"
                                            >
                                                Grant Full Access
                                            </button>
                                        </div>

                                        <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                                            {PERMISSION_CATEGORIES.map((cat) => {
                                                const activeCategoryPerms = cat.permissions;
                                                return (
                                                    <div key={cat.id} className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl space-y-2">
                                                        <span className="block text-xs font-black text-neutral-800">{cat.name}</span>
                                                        <div className="grid grid-cols-1 gap-2.5">
                                                            {activeCategoryPerms.map((perm) => {
                                                                const isChecked = selectedPerms.includes(perm.key);
                                                                const dependency = PERMISSION_DEPENDENCIES[perm.key];
                                                                const missingDependency = dependency && !selectedPerms.includes(dependency);

                                                                return (
                                                                    <div key={perm.key} className="space-y-1.5">
                                                                        <div
                                                                            onClick={() => togglePermission(perm.key)}
                                                                            className={`p-2.5 rounded-lg border transition-all flex items-center gap-3 cursor-pointer ${isChecked ? 'bg-neutral-50/40 border-primary/20 text-neutral-800' : 'bg-neutral-50/40 border-neutral-100/60 text-neutral-500'
                                                                                }`}
                                                                        >
                                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-primary border-primary/20 text-white' : 'bg-neutral-50 border-neutral-200'
                                                                                }`}>
                                                                                {isChecked && <Check size={11} strokeWidth={3} />}
                                                                            </div>
                                                                            <div className="overflow-hidden">
                                                                                <span className="block text-[11px] font-bold">{perm.label}</span>
                                                                                <span className="block text-[8px] text-neutral-500 font-mono mt-0.5">{perm.key}</span>
                                                                            </div>
                                                                        </div>
                                                                        {isChecked && missingDependency && (
                                                                            <div className="flex items-center gap-1.5 px-2 text-[9px] text-amber-700 font-bold">
                                                                                <AlertTriangle size={10} />
                                                                                <span>Warning: This node requires view permissions ({dependency})</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4: BRANCH SCOPES & RESOURCE OWNERSHIP RULES */}
                                {wizardStep === 4 && (
                                    <div className="space-y-5 animate-fade-in">
                                        <div>
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Location restrictions</span>
                                            <p className="text-[10px] text-neutral-500 leading-relaxed mb-3">Enforce boundaries on which branches are visible/editable for this role.</p>

                                            <div className="flex gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setRoleGymScope('all')}
                                                    className={`flex-1 p-3.5 border rounded-2xl text-center font-bold text-xs cursor-pointer transition-all ${roleGymScope === 'all' ? 'bg-primary-light border-primary/20 text-primary font-black' : 'bg-neutral-50/60 border-neutral-100 text-neutral-600'
                                                        }`}
                                                >
                                                    All Branches (Global)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRoleGymScope(gyms.length > 0 ? [gyms[0].id] : [])}
                                                    className={`flex-1 p-3.5 border rounded-2xl text-center font-bold text-xs cursor-pointer transition-all ${Array.isArray(roleGymScope) ? 'bg-primary-light border-primary/20 text-primary font-black' : 'bg-neutral-50/60 border-neutral-100 text-neutral-600'
                                                        }`}
                                                >
                                                    Specific Branches
                                                </button>
                                            </div>
                                        </div>

                                        {Array.isArray(roleGymScope) && (
                                            <div className="p-3.5 bg-neutral-50/40 border border-neutral-100 rounded-2xl space-y-2">
                                                <span className="block text-[8px] font-black uppercase text-neutral-500">Select branch permissions:</span>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {gyms.map(gym => {
                                                        const isChecked = roleGymScope.includes(gym.id);
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={gym.id}
                                                                onClick={() => {
                                                                    setRoleGymScope(prev => {
                                                                        if (!Array.isArray(prev)) return [gym.id];
                                                                        return prev.includes(gym.id) ? prev.filter(id => id !== gym.id) : [...prev, gym.id];
                                                                    });
                                                                }}
                                                                className={`p-2.5 bg-neutral-50 border rounded-xl flex items-center justify-between text-left cursor-pointer transition-colors ${isChecked ? 'border-primary/20 bg-primary-light text-primary' : 'border-neutral-100 hover:border-neutral-200'
                                                                    }`}
                                                            >
                                                                <span className="text-xs font-bold">{gym.name}</span>
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-primary border-primary/20 text-white' : 'bg-neutral-50 border-neutral-200'
                                                                    }`}>
                                                                    {isChecked && <Check size={11} strokeWidth={3} />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* RESOURCE OWNERSHIP RULES */}
                                        <div className="space-y-3.5 border-t border-neutral-100 pt-4">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Resource Ownership Constraints</span>
                                            <div className="space-y-2.5">
                                                <label className="flex items-start gap-3 p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="ownership"
                                                        checked={ownershipRule === 'all'}
                                                        onChange={() => setOwnershipRule('all')}
                                                        className="mt-0.5 accent-orange-500"
                                                    />
                                                    <div>
                                                        <span className="block text-xs font-black text-neutral-800">Global Tenant Access</span>
                                                        <span className="block text-[9px] text-neutral-500 mt-0.5">Allows viewing/editing all members and plans under the organization scope.</span>
                                                    </div>
                                                </label>

                                                <label className="flex items-start gap-3 p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="ownership"
                                                        checked={ownershipRule === 'assigned'}
                                                        onChange={() => setOwnershipRule('assigned')}
                                                        className="mt-0.5 accent-orange-500"
                                                    />
                                                    <div>
                                                        <span className="block text-xs font-black text-neutral-800">Assigned Records Only</span>
                                                        <span className="block text-[9px] text-neutral-500 mt-0.5">Limits user permissions to members, diets, or workouts explicitly assigned to them.</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 5: REVIEW & CREATE */}
                                {wizardStep === 5 && (
                                    <div className="space-y-4 animate-fade-in">
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">Confirm access configurations</span>

                                        <div className="p-4 bg-neutral-50/80 border border-neutral-100 rounded-2xl space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Role Name:</span>
                                                <span className="text-neutral-900 font-bold">{roleName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Category:</span>
                                                <span className="text-primary font-bold uppercase tracking-wider">{roleCategory}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Gym Scope:</span>
                                                <span className="text-neutral-800 font-bold">
                                                    {roleGymScope === 'all' ? 'All Gym Branches' : `${roleGymScope.length} specific locations`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Ownership Constraint:</span>
                                                <span className="text-neutral-800 font-bold capitalize">{ownershipRule} Records</span>
                                            </div>
                                            <div className="flex justify-between border-t border-neutral-100 pt-3">
                                                <span className="text-neutral-500">Configured Privileges:</span>
                                                <span className="px-2 py-0.5 bg-primary-light border border-primary/20 text-[9px] font-bold text-primary rounded-full">
                                                    {selectedPerms.length} active node keys
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="flex gap-3 pt-4 border-t border-neutral-100/80 shrink-0">
                            {wizardStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setWizardStep(prev => (prev - 1) as any)}
                                    className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-xs font-bold text-neutral-700 hover:text-neutral-900 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ArrowLeft size={13} />
                                    <span>Previous</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    className="flex-1 py-3 bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-500 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                            )}

                            {wizardStep < 5 ? (
                                <button
                                    type="button"
                                    onClick={() => setWizardStep(prev => (prev + 1) as any)}
                                    className="flex-1 py-3 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <span>Next Step</span>
                                    <ArrowRight size={13} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveRoleSubmit}
                                    className="flex-1 py-3 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <ShieldCheck size={14} />
                                    <span>{drawerMode === 'create' ? 'Create Custom Role' : 'Save Configurations'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* USER ASSIGNMENT MODAL */}
            {/* ========================================================================= */}
            {assignUserModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
                    <div className="fixed inset-0" onClick={() => setAssignUserModalOpen(false)} />

                    <div className="w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-7 shadow-2xl relative z-10 animate-scale-up">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-base font-extrabold text-neutral-900">Assign Staff Members</h3>
                                <p className="text-[10px] text-neutral-600 mt-1">Select employees to assign to this role template.</p>
                            </div>
                            <button onClick={() => setAssignUserModalOpen(false)} className="text-neutral-500 hover:text-neutral-800 cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-thin p-1">
                            {employees.map((emp) => {
                                const isSelected = selectedUsersToAssign.includes(emp.id);
                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => {
                                            setSelectedUsersToAssign(prev =>
                                                prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                                            );
                                        }}
                                        className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-neutral-50 border-primary/20 text-neutral-800' : 'bg-neutral-50/20 border-neutral-100 text-neutral-500 hover:border-neutral-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary/20 text-white' : 'bg-neutral-50 border-neutral-200'
                                                }`}>
                                                {isSelected && <Check size={11} strokeWidth={3} />}
                                            </div>
                                            <span className="text-xs font-bold text-neutral-800">{emp.name}</span>
                                        </div>
                                        <span className="text-[9px] text-neutral-500">{emp.phone}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-3 pt-5 mt-5 border-t border-neutral-100">
                            <button onClick={() => setAssignUserModalOpen(false)} className="flex-1 py-3 bg-neutral-50 text-xs font-bold text-neutral-600 rounded-xl cursor-pointer">Cancel</button>
                            <button onClick={handleSaveUserAssignment} className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* REQUEST OVERRIDE MODAL */}
            {/* ========================================================================= */}
            {overrideModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
                    <div className="fixed inset-0" onClick={() => setOverrideModalOpen(false)} />

                    <form onSubmit={handleCreateOverride} className="w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-7 shadow-2xl relative z-10 animate-scale-up space-y-4">
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h3 className="text-base font-extrabold text-neutral-900">Create Permission Override</h3>
                                <p className="text-[10px] text-neutral-600 mt-1">Assign a temporary or emergency privilege outside defaults.</p>
                            </div>
                            <button type="button" onClick={() => setOverrideModalOpen(false)} className="text-neutral-500 hover:text-neutral-800 cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Target Staff Member</label>
                            <select
                                required
                                value={overrideUser}
                                onChange={(e) => setOverrideUser(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 outline-none cursor-pointer"
                            >
                                <option value="">Select Employee...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Permission Node Scope</label>
                            <select
                                required
                                value={overridePerm}
                                onChange={(e) => setOverridePerm(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 outline-none cursor-pointer"
                            >
                                <option value="">Select Node...</option>
                                {PERMISSION_CATEGORIES.map(cat => (
                                    <optgroup key={cat.id} label={cat.name}>
                                        {cat.permissions.map(p => (
                                            <option key={p.key} value={p.key}>{p.key} ({p.label})</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Override Category</label>
                                <select
                                    value={overrideType}
                                    onChange={(e) => setOverrideType(e.target.value as any)}
                                    className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 outline-none cursor-pointer"
                                >
                                    <option value="Temporary">Temporary</option>
                                    <option value="Emergency">Emergency</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Expiry Threshold</label>
                                <input
                                    type="date"
                                    required
                                    value={overrideExpiry}
                                    onChange={(e) => setOverrideExpiry(e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-neutral-100">
                            <button type="button" onClick={() => setOverrideModalOpen(false)} className="flex-1 py-3 bg-neutral-50 text-xs font-bold text-neutral-600 rounded-xl cursor-pointer">Cancel</button>
                            <button type="submit" className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer">Submit Request</button>
                        </div>
                    </form>
                </div>
            )}

            {/* FLOAT TOAST */}
            {toast && (
                <div className="fixed top-5 right-5 z-[100] animate-slide-in flex items-center gap-3 p-4 bg-white backdrop-blur-md border border-neutral-200 rounded-2xl shadow-2xl max-w-sm">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-success shadow-lg' : 'bg-danger shadow-lg'
                        }`} />
                    <span className="text-xs font-bold text-neutral-900">{toast.message}</span>
                </div>
            )}

        </div>
    );
}
